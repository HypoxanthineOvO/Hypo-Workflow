import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { canonicalHash, stringifyYaml } from "../src/serialization/index.js";
import {
  EXPECTED_NEXT_ACTION,
  OBJECT_REF,
  allFileText,
  assertAuthorityBytesEqual,
  authorityByteMap,
  capsuleSources,
  createRecoveryTestStore,
  findJournalSegments,
  generatedSecret,
  journalEvent,
  readText,
  seedM2Authorities,
  snapshotTree,
  temporaryCurrentWorkspace,
  writeText,
} from "./fixtures/c21-m3/helpers.js";

const REQUIRED_CAPSULE_API = Object.freeze([
  "createRecoveryStore",
  "appendRecoveryEvent",
  "replayRecoveryJournal",
  "updateContextCapsule",
  "rebuildContextCapsule",
  "readContextCapsule",
]);

const RECOVERY_PROBE = await import("../src/recovery/index.js")
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const CAPSULE_READY = !RECOVERY_PROBE.error
  && REQUIRED_CAPSULE_API.every((name) => typeof RECOVERY_PROBE.api?.[name] === "function");
const capsuleTest = CAPSULE_READY ? test : test.skip;

test("recovery module publishes incremental and full-rebuild Capsule APIs", async () => {
  const api = await loadRecoveryApi();
  for (const name of REQUIRED_CAPSULE_API) {
    assert.equal(typeof api[name], "function", `${name} must be exported`);
  }
});

capsuleTest("incremental Capsule updates are byte-identical to a deterministic full rebuild", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 8 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-capsule-equivalence-");
  const authorities = await seedM2Authorities(root, "capsule-equivalence");
  const sources = capsuleSources(authorities);

  await store.appendRecoveryEvent(root, journalEvent({
    type: "turn.user",
    summary: "Recovery must not require a full transcript.",
  }));
  await store.appendRecoveryEvent(root, journalEvent({
    type: "plan.updated",
    summary: "Establish the first bounded recovery plan.",
    rationale_summary: "The Capsule is a rebuildable index over explicit facts.",
    payload: {
      current_goal: "Deliver the M3 recovery engine.",
      scope: ["journal", "capsule", "pack"],
      non_goals: ["platform hooks"],
      next_action: EXPECTED_NEXT_ACTION,
    },
  }));
  const first = await store.updateContextCapsule(root, {
    object_ref: OBJECT_REF,
    sources,
  }, { id: "capsule-equivalence-first" });
  assert.equal(first.path, ".pipeline/memory/capsules/delivery/goal-alpha.yaml");
  assert.equal(first.capsule.cursor.streams[0].sequence, 2);

  await store.appendRecoveryEvent(root, journalEvent({
    turn_id: "turn-002",
    type: "verification.completed",
    summary: "Focused recovery tests passed.",
    payload: { status: "passed", evidence_refs: ["evidence:m3-focused"] },
  }));
  const second = await store.updateContextCapsule(root, {
    object_ref: OBJECT_REF,
    sources,
  }, { id: "capsule-equivalence-second" });
  const incremental = await store.readContextCapsule(root, OBJECT_REF);
  const incrementalBytes = await readText(join(root, second.path));

  const rebuiltWrite = await store.rebuildContextCapsule(root, {
    object_ref: OBJECT_REF,
    sources,
  }, { id: "capsule-equivalence-rebuild" });
  const rebuilt = await store.readContextCapsule(root, OBJECT_REF);
  const rebuiltBytes = await readText(join(root, rebuiltWrite.path));

  assert.deepEqual(rebuilt, incremental);
  assert.deepEqual(rebuiltWrite.capsule, second.capsule);
  assert.equal(rebuiltBytes, incrementalBytes, "incremental and full rebuild must serialize identically");
  assert.equal(rebuilt.context.next_action, EXPECTED_NEXT_ACTION);
  assert.equal(rebuilt.cursor.streams[0].sequence, 3);
  assert.match(rebuilt.semantic_hash, /^[a-f0-9]{64}$/);
});

capsuleTest("incremental/full equivalence holds across generated sequences and update chunk boundaries", async (t) => {
  const api = await loadRecoveryApi();
  const cases = [
    { seed: 3, chunks: [1, 2, 4, 8] },
    { seed: 7, chunks: [3, 6, 8] },
    { seed: 11, chunks: [2, 5, 7, 8] },
  ];

  for (const fixture of cases) {
    await t.test(`seed-${fixture.seed}`, async (subtest) => {
      const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 3 });
      const root = await temporaryCurrentWorkspace(subtest, `hw-m3-capsule-property-${fixture.seed}-`);
      const authorities = await seedM2Authorities(root, `capsule-property-${fixture.seed}`);
      const sources = capsuleSources(authorities);
      const events = generatedEventSequence(fixture.seed);
      let appended = 0;
      let incremental;

      for (const boundary of fixture.chunks) {
        while (appended < boundary) {
          await store.appendRecoveryEvent(root, events[appended]);
          appended += 1;
        }
        incremental = (await store.updateContextCapsule(root, {
          object_ref: OBJECT_REF,
          sources,
        }, { id: `capsule-property-${fixture.seed}-${boundary}` })).capsule;
      }
      assert.equal(appended, events.length);
      const incrementalBytes = await readText(join(
        root,
        ".pipeline/memory/capsules/delivery/goal-alpha.yaml",
      ));

      const rebuilt = (await store.rebuildContextCapsule(root, {
        object_ref: OBJECT_REF,
        sources,
      }, { id: `capsule-property-${fixture.seed}-rebuild` })).capsule;
      const rebuiltBytes = await readText(join(
        root,
        ".pipeline/memory/capsules/delivery/goal-alpha.yaml",
      ));
      assert.deepEqual(rebuilt, incremental);
      assert.equal(rebuiltBytes, incrementalBytes);
      assert.equal(rebuilt.context.next_action, EXPECTED_NEXT_ACTION);
    });
  }
});

capsuleTest("incremental Capsule consumes only the validated cursor delta when prior segments are unreadable", async (t) => {
  const api = await loadRecoveryApi();
  const primaryStore = createRecoveryTestStore(api, { maxEventsPerSegment: 1 }).store;
  const cleanStore = createRecoveryTestStore(api, { maxEventsPerSegment: 1 }).store;
  const primaryRoot = await temporaryCurrentWorkspace(t, "hw-m3-capsule-true-incremental-primary-");
  const cleanRoot = await temporaryCurrentWorkspace(t, "hw-m3-capsule-true-incremental-clean-");
  const primaryAuthorities = await seedM2Authorities(primaryRoot, "capsule-true-incremental");
  const cleanAuthorities = await seedM2Authorities(cleanRoot, "capsule-true-incremental");
  const primarySources = capsuleSources(primaryAuthorities);
  const cleanSources = capsuleSources(cleanAuthorities);
  const [firstEvent, secondEvent, deltaEvent] = cursorDeltaEvents();

  const firstWrite = await primaryStore.appendRecoveryEvent(primaryRoot, structuredClone(firstEvent));
  const secondWrite = await primaryStore.appendRecoveryEvent(primaryRoot, structuredClone(secondEvent));
  const initial = await primaryStore.updateContextCapsule(primaryRoot, {
    object_ref: OBJECT_REF,
    sources: primarySources,
  }, { id: "capsule-true-incremental-initial" });
  assert.equal(initial.capsule.cursor.streams[0].sequence, 2);
  await primaryStore.appendRecoveryEvent(primaryRoot, structuredClone(deltaEvent));

  await primaryStore.appendRecoveryEvent(primaryRoot, journalEvent({
    writer: { kind: "subagent", id: "delta-worker" },
    turn_id: "turn-delta-worker",
    type: "worker.started",
    summary: "new writer exists only after the Capsule cursor",
    payload: { role: "audit" },
  }));
  await writeText(join(primaryRoot, firstWrite.path), "{corrupt pre-cursor segment one\n");
  await writeText(join(primaryRoot, secondWrite.path), "{corrupt pre-cursor segment two\n");
  await assert.rejects(
    primaryStore.replayRecoveryJournal(primaryRoot, { object_ref: OBJECT_REF }),
    /journal|jsonl|corrupt|parse|line|integrity/i,
    "the fixture must make a full-history replay observably impossible",
  );
  const authorityBefore = await authorityByteMap(primaryRoot, primaryAuthorities);

  for (const event of [firstEvent, secondEvent, deltaEvent]) {
    await cleanStore.appendRecoveryEvent(cleanRoot, structuredClone(event));
  }
  await cleanStore.appendRecoveryEvent(cleanRoot, journalEvent({
    writer: { kind: "subagent", id: "delta-worker" },
    turn_id: "turn-delta-worker",
    type: "worker.started",
    summary: "new writer exists only after the Capsule cursor",
    payload: { role: "audit" },
  }));

  const incremental = await primaryStore.updateContextCapsule(primaryRoot, {
    object_ref: OBJECT_REF,
    sources: primarySources,
  }, { id: "capsule-true-incremental-delta" });
  const rebuilt = await cleanStore.rebuildContextCapsule(cleanRoot, {
    object_ref: OBJECT_REF,
    sources: cleanSources,
  }, { id: "capsule-true-incremental-rebuild" });

  assert.deepEqual(incremental.capsule, rebuilt.capsule);
  assert.equal(
    await readText(join(primaryRoot, incremental.path)),
    await readText(join(cleanRoot, rebuilt.path)),
  );
  assert.equal(incremental.capsule.context.next_action, EXPECTED_NEXT_ACTION);
  assert.equal(incremental.capsule.cursor.streams.length, 2);
  await assertAuthorityBytesEqual(primaryRoot, authorityBefore);
  assert.equal((await findJournalSegments(primaryRoot)).length, 4);
});

capsuleTest("tampered or impossible Capsule cursors fail closed without rewriting authority or Capsule bytes", async (t) => {
  const api = await loadRecoveryApi();
  const cases = [
    { name: "tampered-hash", rehash: false },
    { name: "stale-valid-shape", rehash: true },
  ];

  for (const fixture of cases) {
    await t.test(fixture.name, async (subtest) => {
      const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 2 });
      const root = await temporaryCurrentWorkspace(subtest, `hw-m3-capsule-cursor-${fixture.name}-`);
      const authorities = await seedM2Authorities(root, `capsule-cursor-${fixture.name}`);
      await store.appendRecoveryEvent(root, journalEvent({
        type: "plan.updated",
        summary: "establish a cursor validation point",
        payload: { next_action: EXPECTED_NEXT_ACTION },
      }));
      const written = await store.updateContextCapsule(root, {
        object_ref: OBJECT_REF,
        sources: capsuleSources(authorities),
      }, { id: `capsule-cursor-${fixture.name}-initial` });
      await store.appendRecoveryEvent(root, journalEvent({
        turn_id: "turn-after-cursor",
        type: "files.changed",
        summary: "delta after the cursor validation point",
      }));

      const invalid = structuredClone(written.capsule);
      invalid.cursor.streams[0].sequence += 100;
      invalid.cursor.streams[0].event_id = "f".repeat(64);
      if ("segment_id" in invalid.cursor.streams[0]) {
        invalid.cursor.streams[0].segment_id = "99999999";
      }
      if (fixture.rehash) {
        const unsigned = { ...invalid };
        delete unsigned.semantic_hash;
        invalid.semantic_hash = canonicalHash(unsigned);
      }
      const capsulePath = join(root, written.path);
      await writeText(capsulePath, stringifyYaml(invalid));
      const capsuleBefore = await readText(capsulePath);
      const authorityBefore = await authorityByteMap(root, authorities);
      const treeBefore = await snapshotTree(root);

      await assert.rejects(
        store.updateContextCapsule(root, {
          object_ref: OBJECT_REF,
          sources: capsuleSources(authorities),
        }, { id: `capsule-cursor-${fixture.name}-reject` }),
        /capsule|cursor|stale|sequence|event|hash|integrity|journal/i,
      );
      assert.equal(await readText(capsulePath), capsuleBefore);
      assert.deepEqual(await snapshotTree(root), treeBefore);
      await assertAuthorityBytesEqual(root, authorityBefore);
    });
  }
});

capsuleTest("Capsule is explicitly derived and cannot overwrite Runtime, Continuation, Record, or Receipt authority", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m3-capsule-authority-");
  const authorities = await seedM2Authorities(root, "capsule-authority");
  const authorityBefore = await authorityByteMap(root, authorities);
  await store.appendRecoveryEvent(root, journalEvent({
    type: "plan.updated",
    summary: "Preserve one authority per fact.",
    payload: { next_action: EXPECTED_NEXT_ACTION },
  }));

  const written = await store.updateContextCapsule(root, {
    object_ref: OBJECT_REF,
    sources: capsuleSources(authorities),
  }, { id: "capsule-authority-valid" });
  const capsule = written.capsule;
  assert.equal(capsule.schema_version, "1");
  assert.equal(capsule.authority_role, "derived");
  assert.deepEqual(capsule.object_ref, OBJECT_REF);
  assert.equal("runtime" in capsule, false);
  assert.equal("continuation" in capsule, false);
  assert.equal("records" in capsule, false);
  assert.equal("receipts" in capsule, false);
  assert.deepEqual(capsule.sources.records, [authorities.recordRef]);
  assert.deepEqual(capsule.sources.receipts, [authorities.receiptRef]);
  assert.deepEqual(capsule.sources.continuation.object_ref, OBJECT_REF);
  assert.match(capsule.sources.continuation.semantic_hash, /^[a-f0-9]{64}$/);
  await assertAuthorityBytesEqual(root, authorityBefore);

  const invalidInputs = [
    {
      object_ref: OBJECT_REF,
      sources: capsuleSources(authorities),
      runtime: { status: "accepted" },
    },
    {
      object_ref: OBJECT_REF,
      sources: { ...capsuleSources(authorities), record_overrides: [{ status: "superseded" }] },
    },
    {
      object_ref: OBJECT_REF,
      sources: { ...capsuleSources(authorities), continuation_override: { next_action: "skip" } },
    },
  ];
  for (const [index, input] of invalidInputs.entries()) {
    const before = await snapshotTree(root);
    await assert.rejects(
      store.updateContextCapsule(root, input, { id: `capsule-authority-invalid-${index}` }),
      /capsule|authority|runtime|continuation|record|override|schema|field/i,
    );
    assert.deepEqual(await snapshotTree(root), before, "authority override attempts must be zero-write");
  }
  await assertAuthorityBytesEqual(root, authorityBefore);
});

capsuleTest("Capsule reduction tracks explicit plan, verification, and worker checkpoints without transcript input", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 8 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-capsule-reducer-");
  const authorities = await seedM2Authorities(root, "capsule-reducer");
  const events = [
    journalEvent({
      type: "plan.updated",
      summary: "Plan the verified recovery checkpoint.",
      payload: {
        current_goal: "Make recovery deterministic.",
        scope: ["journal", "pack"],
        non_goals: ["transcript reinjection"],
        next_action: EXPECTED_NEXT_ACTION,
      },
    }),
    journalEvent({
      writer: { kind: "subagent", id: "implement-worker" },
      type: "worker.started",
      summary: "Implementation worker started.",
      payload: { role: "implement", task: "recovery engine" },
    }),
    journalEvent({
      writer: { kind: "subagent", id: "implement-worker" },
      type: "worker.stopped",
      summary: "Implementation worker produced evidence.",
      payload: { role: "implement", evidence_refs: ["evidence:implementation"] },
    }),
    journalEvent({
      type: "verification.completed",
      summary: "All focused tests passed.",
      payload: { status: "passed", evidence_refs: ["evidence:focused-tests"] },
    }),
  ];
  for (const event of events) await store.appendRecoveryEvent(root, event);

  const { capsule } = await store.rebuildContextCapsule(root, {
    object_ref: OBJECT_REF,
    sources: capsuleSources(authorities),
  }, { id: "capsule-reducer-full" });

  assert.equal(capsule.context.current_goal, "Make recovery deterministic.");
  assert.deepEqual(capsule.context.scope, ["journal", "pack"]);
  assert.deepEqual(capsule.context.non_goals, ["transcript reinjection"]);
  assert.equal(capsule.context.next_action, EXPECTED_NEXT_ACTION);
  assert.equal(capsule.context.recent_verification.status, "passed");
  assert.deepEqual(capsule.context.recent_verification.evidence_refs, ["evidence:focused-tests"]);
  assert.deepEqual(capsule.context.workers, [{
    writer: { kind: "subagent", id: "implement-worker" },
    role: "implement",
    status: "stopped",
    evidence_refs: ["evidence:implementation"],
  }]);
  assert.equal(JSON.stringify(capsule).includes("transcript_path"), false);
  assert.equal(JSON.stringify(capsule).includes("raw_transcript"), false);
});

capsuleTest("secret-bearing or hidden-reasoning source projections fail closed before Capsule persistence", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api);
  const root = await temporaryCurrentWorkspace(t, "hw-m3-capsule-sensitive-");
  const authorities = await seedM2Authorities(root, "capsule-sensitive");
  await store.appendRecoveryEvent(root, journalEvent({
    type: "plan.updated",
    summary: "Prepare a safe Capsule.",
    payload: { next_action: EXPECTED_NEXT_ACTION },
  }));
  const secret = generatedSecret();
  const invalidSources = [
    {
      ...capsuleSources(authorities),
      records: [{ ...authorities.record, body: `password=${secret}` }],
    },
    {
      ...capsuleSources(authorities),
      receipts: [{ ...authorities.receipt, hidden_reasoning: "M3-CAPSULE-HIDDEN" }],
    },
    {
      ...capsuleSources(authorities),
      continuation: {
        ...authorities.runtimeObject.continuation,
        transcript_path: "/tmp/session.jsonl",
      },
    },
  ];

  for (const [index, sources] of invalidSources.entries()) {
    const before = await snapshotTree(root);
    await assert.rejects(
      store.rebuildContextCapsule(root, {
        object_ref: OBJECT_REF,
        sources,
      }, { id: `capsule-sensitive-${index}` }),
      (error) => {
        const rendered = String(error?.message || error);
        assert.match(rendered, /capsule|source|secret|reason|transcript|record|receipt|hash|integrity/i);
        assert.equal(rendered.includes(secret), false);
        assert.equal(rendered.includes("M3-CAPSULE-HIDDEN"), false);
        return true;
      },
    );
    assert.deepEqual(await snapshotTree(root), before);
  }
  assert.equal((await allFileText(root)).includes(secret), false);
});

async function loadRecoveryApi() {
  if (RECOVERY_PROBE.error) {
    assert.fail(`recovery module is unavailable: ${RECOVERY_PROBE.error.code || "load failure"}`);
  }
  return RECOVERY_PROBE.api;
}

function generatedEventSequence(seed) {
  const types = [
    "turn.user",
    "files.changed",
    "verification.completed",
    "turn.agent",
  ];
  const events = Array.from({ length: 7 }, (_, index) => {
    const type = types[(seed + index * 3) % types.length];
    const payloadByType = {
      "turn.user": { message_ref: `user-${seed}-${index}` },
      "turn.agent": { message_ref: `agent-${seed}-${index}` },
      "files.changed": { paths: [`core/src/recovery/generated-${seed}-${index}.js`] },
      "verification.completed": {
        status: index % 2 === 0 ? "passed" : "pending",
        evidence_refs: [`evidence:${seed}-${index}`],
      },
    };
    return journalEvent({
      turn_id: `turn-generated-${seed}-${index}`,
      type,
      summary: `generated-${seed}-${index}`,
      payload: payloadByType[type],
    });
  });
  events.push(journalEvent({
    turn_id: `turn-generated-${seed}-plan`,
    type: "plan.updated",
    summary: `generated-plan-${seed}`,
    rationale_summary: `Generated rationale summary ${seed}.`,
    payload: {
      current_goal: `Generated recovery goal ${seed}`,
      scope: ["journal", "capsule", "pack"],
      non_goals: ["transcript"],
      next_action: EXPECTED_NEXT_ACTION,
    },
  }));
  return events;
}

function cursorDeltaEvents() {
  return [
    journalEvent({
      turn_id: "turn-cursor-001",
      type: "turn.user",
      summary: "base event before the Capsule cursor",
    }),
    journalEvent({
      turn_id: "turn-cursor-002",
      type: "plan.updated",
      summary: "second base event before the Capsule cursor",
      payload: {
        current_goal: "Prove true incremental Capsule reduction.",
        scope: ["capsule", "cursor"],
        non_goals: ["full history replay"],
        next_action: EXPECTED_NEXT_ACTION,
      },
    }),
    journalEvent({
      turn_id: "turn-cursor-003",
      type: "verification.completed",
      summary: "delta event after the validated Capsule cursor",
      payload: { status: "passed", evidence_refs: ["evidence:incremental-delta"] },
    }),
  ];
}
