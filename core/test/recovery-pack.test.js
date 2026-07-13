import test from "node:test";
import assert from "node:assert/strict";
import { cp, lstat, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseYaml } from "../src/serialization/index.js";
import { readRuntimeObject, writeRuntimeObject } from "../src/runtime/index.js";
import {
  EXPECTED_NEXT_ACTION,
  FIXED_NOW,
  LATER_NOW,
  LATEST_NOW,
  OBJECT_REF,
  appendScenarioEvents,
  capsuleSources,
  createRecoveryTestStore,
  generatedSecret,
  journalEvent,
  readText,
  recoveryPackInput,
  seedM2Authorities,
  snapshotTree,
  temporaryCurrentWorkspace,
  writeText,
} from "./fixtures/c21-m3/helpers.js";

const REQUIRED_PACK_API = Object.freeze([
  "createRecoveryStore",
  "appendRecoveryEvent",
  "replayRecoveryJournal",
  "updateContextCapsule",
  "readContextCapsule",
  "sealRecoveryPack",
  "validateRecoveryPack",
  "selectLatestValidRecoveryPack",
  "planRecoveryRestore",
  "planRecoveryRetention",
  "applyRecoveryRetention",
]);

const RECOVERY_PROBE = await import("../src/recovery/index.js")
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const PACK_READY = !RECOVERY_PROBE.error
  && REQUIRED_PACK_API.every((name) => typeof RECOVERY_PROBE.api?.[name] === "function");
const packTest = PACK_READY ? test : test.skip;

test("recovery module publishes Pack, selection, restore, and retention APIs", async () => {
  const api = await loadRecoveryApi();
  for (const name of REQUIRED_PACK_API) {
    assert.equal(typeof api[name], "function", `${name} must be exported`);
  }
});

packTest("Pack seal binds Capsule, continuation, refs, worktree summary, and vector cursor", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 8 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-pack-seal-");
  const base = await prepareRecoveryBase(store, root, "pack-seal");

  const sealed = await store.sealRecoveryPack(
    root,
    recoveryPackInput(base.authorities, base.capsule, base.cursor),
    { id: "pack-seal-transaction" },
  );
  assert.deepEqual(sealed.pack_ref.object_ref, OBJECT_REF);
  assert.match(sealed.pack_ref.id, /^[a-f0-9]{64}$/);
  const prefix = `.pipeline/runtime/recovery/packs/delivery/goal-alpha/${sealed.pack_ref.id}`;
  assert.equal(sealed.path, `${prefix}/pack.yaml`);
  assert.equal(sealed.seal_path, `${prefix}/seal.yaml`);

  const pack = parseYaml(await readText(join(root, sealed.path)));
  const seal = parseYaml(await readText(join(root, sealed.seal_path)));
  assert.equal(pack.schema_version, "1");
  assert.equal(pack.authority_role, "recovery_projection");
  assert.deepEqual(pack.object_ref, OBJECT_REF);
  assert.equal(pack.trigger, "pre_compact");
  assert.equal(pack.sealed_at, FIXED_NOW);
  assert.deepEqual(pack.capsule, base.capsule);
  assert.deepEqual(pack.continuation, base.authorities.runtimeObject.continuation);
  assert.deepEqual(pack.record_refs, [base.authorities.recordRef]);
  assert.deepEqual(pack.receipt_refs, [base.authorities.receiptRef]);
  assert.deepEqual(pack.evidence_refs, [base.authorities.evidenceRef]);
  assert.deepEqual(pack.worktree_summary, base.authorities.worktreeSummary);
  assert.deepEqual(pack.cursor, base.cursor);
  assert.equal("journal" in pack, false);
  assert.equal("events" in pack, false);
  assert.equal("transcript" in pack, false);
  assert.equal("transcript_path" in pack, false);

  assert.equal(seal.schema_version, "1");
  assert.equal(seal.pack_id, sealed.pack_ref.id);
  assert.equal(seal.pack_digest, `sha256:${sealed.pack_ref.id}`);
  assert.equal(seal.status, "sealed");
  assert.equal(seal.sealed_at, FIXED_NOW);
  assert.deepEqual(await store.validateRecoveryPack(root, sealed.pack_ref), {
    valid: true,
    pack_ref: sealed.pack_ref,
    errors: [],
  });

  const allPackBytes = `${await readText(join(root, sealed.path))}\n${await readText(join(root, sealed.seal_path))}`;
  assert.doesNotMatch(allPackBytes, /raw_journal|full_transcript|transcript_path|\/home\/|file:\/\//i);
});

packTest("Pack sealing and validation fail closed on missing, drifted, local, or path-mismatched refs", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 8 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-pack-refs-");
  const base = await prepareRecoveryBase(store, root, "pack-refs");
  const validInput = recoveryPackInput(base.authorities, base.capsule, base.cursor);
  const secret = generatedSecret();
  const invalidInputs = [
    {
      ...validInput,
      record_refs: [{ ...base.authorities.recordRef, id: "missing-record" }],
    },
    {
      ...validInput,
      receipt_refs: [{ ...base.authorities.receiptRef, scope_hash: "0".repeat(64) }],
    },
    {
      ...validInput,
      evidence_refs: [{ ...base.authorities.evidenceRef, digest: `sha256:${"0".repeat(64)}` }],
    },
    {
      ...validInput,
      evidence_refs: [{ ...base.authorities.evidenceRef, path: "/tmp/local-evidence.txt" }],
    },
    {
      ...validInput,
      transcript_path: "/tmp/session.jsonl",
    },
    {
      ...validInput,
      journal: [{ raw: "journal bytes" }],
    },
    {
      ...validInput,
      worktree_summary: {
        ...validInput.worktree_summary,
        diff_excerpt: `password=${secret}`,
      },
    },
  ];
  for (const [index, input] of invalidInputs.entries()) {
    const before = await snapshotTree(root);
    await assert.rejects(
      store.sealRecoveryPack(root, input, { id: `pack-ref-invalid-${index}` }),
      (error) => {
        const rendered = String(error?.message || error);
        assert.match(
          rendered,
          /pack|record|receipt|evidence|reference|digest|hash|path|transcript|journal|secret|schema|field/i,
        );
        assert.equal(rendered.includes(secret), false);
        return true;
      },
    );
    assert.deepEqual(await snapshotTree(root), before, "invalid Pack input must fail before writes");
  }

  const sealed = await store.sealRecoveryPack(root, validInput, { id: "pack-ref-valid" });
  const copiedId = "b".repeat(64);
  const copiedBase = join(root, ".pipeline/runtime/recovery/packs/delivery/goal-alpha", copiedId);
  await mkdir(dirname(copiedBase), { recursive: true });
  await cp(dirname(join(root, sealed.path)), copiedBase, { recursive: true });
  const copiedValidation = await store.validateRecoveryPack(root, {
    object_ref: OBJECT_REF,
    id: copiedId,
  });
  assert.equal(copiedValidation.valid, false);
  assert.match(copiedValidation.errors.map((entry) => entry.code).join(" "), /path|identity|digest|seal/i);

  await writeText(join(root, base.authorities.evidenceRef.path), "evidence drifted after seal\n");
  const driftValidation = await store.validateRecoveryPack(root, sealed.pack_ref);
  assert.equal(driftValidation.valid, false);
  assert.match(driftValidation.errors.map((entry) => entry.code).join(" "), /reference|evidence|digest|hash|drift/i);
});

packTest("newest corrupt Pack falls back to the previous valid Pack and replays Journal delta", async (t) => {
  const api = await loadRecoveryApi();
  const { store, setNow } = createRecoveryTestStore(api, { maxEventsPerSegment: 8 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-pack-fallback-");
  const base = await prepareRecoveryBase(store, root, "pack-fallback");
  const first = await store.sealRecoveryPack(
    root,
    recoveryPackInput(base.authorities, base.capsule, base.cursor),
    { id: "pack-fallback-first" },
  );

  await store.appendRecoveryEvent(root, journalEvent({
    turn_id: "turn-003",
    type: "files.changed",
    summary: "implementation changed after the first Pack",
    payload: { paths: ["core/src/recovery/index.js"] },
  }));
  const updatedCapsuleWrite = await store.updateContextCapsule(root, {
    object_ref: OBJECT_REF,
    sources: capsuleSources(base.authorities),
  }, { id: "pack-fallback-capsule-second" });
  const secondCursor = (await store.replayRecoveryJournal(root, { object_ref: OBJECT_REF })).cursor;
  setNow(LATER_NOW);
  const second = await store.sealRecoveryPack(
    root,
    recoveryPackInput(base.authorities, updatedCapsuleWrite.capsule, secondCursor),
    { id: "pack-fallback-second" },
  );
  assert.deepEqual(second.pack.previous_pack_ref, first.pack_ref);

  await writeFile(join(root, second.path), "CORRUPTED_RECOVERY_PACK_BYTES\n", "utf8");
  setNow(LATEST_NOW);
  await store.appendRecoveryEvent(root, journalEvent({
    turn_id: "turn-004",
    type: "verification.completed",
    summary: "verification after corrupt latest Pack",
    payload: { status: "passed", evidence_refs: ["evidence:post-pack"] },
  }));

  const selected = await store.selectLatestValidRecoveryPack(root, { object_ref: OBJECT_REF });
  assert.deepEqual(selected.pack_ref, first.pack_ref);
  assert.equal(selected.pack.sealed_at, FIXED_NOW);
  assert.equal(selected.rejected_packs.some((entry) => entry.pack_ref.id === second.pack_ref.id), true);
  assert.match(
    selected.rejected_packs.flatMap((entry) => entry.errors.map((error) => error.code)).join(" "),
    /parse|hash|digest|seal|corrupt/i,
  );

  const restore = await store.planRecoveryRestore(root, {
    object_ref: OBJECT_REF,
    budget_bytes: 16_384,
  });
  assert.deepEqual(restore.selected_pack_ref, first.pack_ref);
  assert.equal(restore.next_action, EXPECTED_NEXT_ACTION);
  assert.deepEqual(
    restore.journal_delta.map((event) => event.summary),
    [
      "implementation changed after the first Pack",
      "verification after corrupt latest Pack",
    ],
  );
  assert.equal(restore.rejected_packs.some((entry) => entry.pack_ref.id === second.pack_ref.id), true);
  assert.deepEqual(restore.base_cursor, first.pack.cursor);
  assert.equal(JSON.stringify(restore).includes("CORRUPTED_RECOVERY_PACK_BYTES"), false);
});

packTest("Pack selection compares sealed_at as an absolute instant across timezone offsets", async (t) => {
  const api = await loadRecoveryApi();
  const ancestorNow = "2026-07-12T08:51:58+08:00";
  const descendantNow = "2026-07-12T00:57:17.359Z";
  const { store, root, ancestor, descendant, descendantNextAction } = await buildOffsetClockPair(
    t,
    api,
    "later-instant",
    ancestorNow,
    descendantNow,
  );

  assert.ok(descendantNow < ancestorNow, "fixture must oppose lexical timestamp ordering");
  assert.ok(Date.parse(descendantNow) > Date.parse(ancestorNow), "descendant must be later in absolute time");
  assert.deepEqual(descendant.pack.previous_pack_ref, ancestor.pack_ref);

  const selected = await store.selectLatestValidRecoveryPack(root, { object_ref: OBJECT_REF });
  assert.deepEqual(
    selected.pack_ref,
    descendant.pack_ref,
    "the later absolute instant must win even when its timestamp string sorts lower",
  );

  const restore = await store.planRecoveryRestore(root, {
    object_ref: OBJECT_REF,
    budget_bytes: 16_384,
  });
  assert.deepEqual(restore.selected_pack_ref, descendant.pack_ref);
  assert.equal(restore.next_action, descendantNextAction);
});

packTest("equal absolute Pack instants with different offsets fall through to ancestry", async (t) => {
  const api = await loadRecoveryApi();
  const ancestorNow = "2026-07-12T08:51:58+08:00";
  const descendantNow = "2026-07-12T00:51:58Z";
  const { store, root, ancestor, descendant } = await buildOffsetClockPair(
    t,
    api,
    "equal-instant",
    ancestorNow,
    descendantNow,
  );

  assert.notEqual(descendantNow, ancestorNow);
  assert.equal(Date.parse(descendantNow), Date.parse(ancestorNow));
  assert.ok(descendantNow < ancestorNow, "fixture must oppose lexical timestamp ordering");
  assert.deepEqual(descendant.pack.previous_pack_ref, ancestor.pack_ref);

  const selected = await store.selectLatestValidRecoveryPack(root, { object_ref: OBJECT_REF });
  assert.deepEqual(
    selected.pack_ref,
    descendant.pack_ref,
    "equal absolute instants must use previous_pack_ref ancestry rather than timestamp text",
  );
});

packTest("equal-Clock Pack selection follows the chain descendant, never lexical digest order", async (t) => {
  const api = await loadRecoveryApi();
  const cases = [
    { name: "descendant-digest-lower", relation: (descendant, ancestor) => descendant < ancestor },
    { name: "descendant-digest-higher", relation: (descendant, ancestor) => descendant > ancestor },
  ];

  for (const fixture of cases) {
    await t.test(fixture.name, async (subtest) => {
      const candidate = await buildEqualClockPair(subtest, api, fixture.name, fixture.relation);
      assert.ok(candidate, `must construct ${fixture.name} deterministically within the fixture bound`);
      const { store, root, ancestor, descendant } = candidate;
      assert.equal(ancestor.pack.sealed_at, FIXED_NOW);
      assert.equal(descendant.pack.sealed_at, FIXED_NOW);
      assert.deepEqual(descendant.pack.previous_pack_ref, ancestor.pack_ref);
      assert.notEqual(descendant.pack.continuation.next_action, ancestor.pack.continuation.next_action);

      const selected = await store.selectLatestValidRecoveryPack(root, { object_ref: OBJECT_REF });
      assert.deepEqual(
        selected.pack_ref,
        descendant.pack_ref,
        "equal timestamps must resolve through previous_pack_ref ancestry",
      );

      await writeFile(join(root, descendant.path), "CORRUPTED_EQUAL_CLOCK_DESCENDANT\n", "utf8");
      const fallback = await store.selectLatestValidRecoveryPack(root, { object_ref: OBJECT_REF });
      assert.deepEqual(fallback.pack_ref, ancestor.pack_ref);
      assert.equal(
        fallback.rejected_packs.some((entry) => entry.pack_ref.id === descendant.pack_ref.id),
        true,
      );
    });
  }
});

packTest("restore planning stays within budget while retaining the authoritative next action", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, {
    maxEventsPerSegment: 6,
    inlineOutputBytes: 128,
    defaultRestoreBudgetBytes: 8_192,
  });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-pack-budget-");
  const base = await prepareRecoveryBase(store, root, "pack-budget");
  const sealed = await store.sealRecoveryPack(
    root,
    recoveryPackInput(base.authorities, base.capsule, base.cursor),
    { id: "pack-budget-base" },
  );

  for (let index = 0; index < 30; index += 1) {
    await store.appendRecoveryEvent(root, journalEvent({
      turn_id: `turn-budget-${index}`,
      type: "tool.completed",
      summary: `low-priority-output-${index}-${"summary".repeat(60)}`,
      payload: { tool: "bulk-check", status: "ok" },
    }));
  }
  await store.appendRecoveryEvent(root, journalEvent({
    turn_id: "turn-budget-final",
    type: "plan.updated",
    summary: "Retain the expected next action even under pressure.",
    payload: { next_action: EXPECTED_NEXT_ACTION },
  }));

  const budget = 8_192;
  const restore = await store.planRecoveryRestore(root, {
    object_ref: OBJECT_REF,
    budget_bytes: budget,
  });
  assert.deepEqual(restore.selected_pack_ref, sealed.pack_ref);
  assert.equal(restore.next_action, EXPECTED_NEXT_ACTION);
  assert.equal(restore.context.next_action, EXPECTED_NEXT_ACTION);
  assert.equal(restore.budget.limit_bytes, budget);
  assert.equal(restore.budget.truncated, true);
  assert.ok(restore.journal_delta.length < 31, "low-priority delta events must be pruned");
  assert.ok(Buffer.byteLength(JSON.stringify(restore)) <= budget, "serialized restore input must fit its budget");
  assert.doesNotMatch(
    JSON.stringify(restore),
    /full_transcript|raw_transcript|transcript_path|journal_segment_bytes/i,
  );
});

packTest("retention planning is deterministic and never removes the last valid Pack", async (t) => {
  const api = await loadRecoveryApi();
  const { store, setNow } = createRecoveryTestStore(api, { maxEventsPerSegment: 8 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-pack-retention-");
  const base = await prepareRecoveryBase(store, root, "pack-retention");
  const valid = await store.sealRecoveryPack(
    root,
    recoveryPackInput(base.authorities, base.capsule, base.cursor),
    { id: "pack-retention-valid" },
  );

  setNow(LATER_NOW);
  const corruptId = "c".repeat(64);
  const corruptPath = `.pipeline/runtime/recovery/packs/delivery/goal-alpha/${corruptId}/pack.yaml`;
  await writeText(join(root, corruptPath), "not: [valid\n");
  await writeText(
    join(root, dirname(corruptPath), "seal.yaml"),
    `schema_version: "1"\npack_id: ${corruptId}\npack_digest: sha256:${corruptId}\nstatus: sealed\nsealed_at: ${LATER_NOW}\n`,
  );

  const request = {
    object_ref: OBJECT_REF,
    keep_valid_packs: 0,
    keep_recent_segments: 0,
    keep_referenced_blobs: true,
  };
  const firstPlan = await store.planRecoveryRetention(root, request);
  const secondPlan = await store.planRecoveryRetention(root, request);
  assert.deepEqual(secondPlan, firstPlan, "unchanged disk state must produce the same retention plan");
  assert.equal(firstPlan.retained_pack_refs.some((ref) => ref.id === valid.pack_ref.id), true);
  assert.equal(
    firstPlan.delete_paths.some((path) => path.includes(valid.pack_ref.id)),
    false,
    "the sole valid Pack cannot be selected for deletion even when keep_valid_packs is zero",
  );
  assert.equal(firstPlan.delete_paths.some((path) => path.includes(corruptId)), true);

  const applied = await store.applyRecoveryRetention(root, firstPlan, {
    id: "pack-retention-apply",
  });
  assert.deepEqual(applied.deleted_paths, firstPlan.delete_paths);
  assert.equal((await store.validateRecoveryPack(root, valid.pack_ref)).valid, true);
  const after = await store.planRecoveryRetention(root, request);
  assert.equal(after.delete_paths.some((path) => path.includes(valid.pack_ref.id)), false);
});

packTest("retention apply rejects plan tampering and post-plan disk drift before first removal", async (t) => {
  const api = await loadRecoveryApi();
  const cases = ["delete-set-tamper", "retained-set-tamper", "post-plan-disk-drift"];

  for (const fixture of cases) {
    await t.test(fixture, async (subtest) => {
      const prepared = await prepareRetentionIntegrityFixture(subtest, api, fixture);
      const { store, root, valid, plan } = prepared;
      let candidatePlan = structuredClone(plan);

      if (fixture === "delete-set-tamper") {
        candidatePlan.delete_paths = [
          ...candidatePlan.delete_paths,
          dirname(valid.path),
        ].sort();
      }
      if (fixture === "retained-set-tamper") {
        candidatePlan.retained_pack_refs = [];
      }
      if (fixture === "post-plan-disk-drift") {
        const target = join(root, plan.delete_paths[0]);
        const stats = await lstat(target);
        if (stats.isDirectory()) {
          await writeText(join(target, "post-plan-drift.txt"), "disk changed after retention planning\n");
        } else {
          await writeFile(target, "disk changed after retention planning\n", "utf8");
        }
      }

      const protectedPaths = [...new Set([
        ...candidatePlan.delete_paths,
        dirname(valid.path),
      ])];
      const beforeApply = await snapshotRetentionTargets(root, protectedPaths);
      let caught;
      try {
        await store.applyRecoveryRetention(root, candidatePlan, {
          id: `retention-integrity-${fixture}`,
        });
      } catch (error) {
        caught = error;
      }
      assert.deepEqual(
        await snapshotRetentionTargets(root, protectedPaths),
        beforeApply,
        "retention integrity failure must occur before the first planned removal",
      );
      assert.ok(caught, `${fixture} must reject rather than apply a stale or altered plan`);
      assert.match(
        String(caught?.message || caught),
        /retention|plan|binding|changed|drift|stale|integrity|delete|retain/i,
      );
      assert.equal((await store.validateRecoveryPack(root, valid.pack_ref)).valid, true);
    });
  }
});

async function prepareRecoveryBase(store, root, prefix) {
  const authorities = await seedM2Authorities(root, prefix);
  await appendScenarioEvents(store, root);
  const capsuleWrite = await store.updateContextCapsule(root, {
    object_ref: OBJECT_REF,
    sources: capsuleSources(authorities),
  }, { id: `${prefix}-capsule` });
  const replay = await store.replayRecoveryJournal(root, { object_ref: OBJECT_REF });
  return {
    authorities,
    capsule: capsuleWrite.capsule,
    cursor: replay.cursor,
  };
}

async function buildEqualClockPair(t, api, label, relation) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const { store } = createRecoveryTestStore(api, {
      now: FIXED_NOW,
      maxEventsPerSegment: 8,
    });
    const root = await temporaryCurrentWorkspace(t, `hw-m3-pack-equal-clock-${label}-${attempt}-`);
    const base = await prepareRecoveryBase(store, root, `pack-equal-clock-${label}-${attempt}`);
    const ancestor = await store.sealRecoveryPack(
      root,
      recoveryPackInput(base.authorities, base.capsule, base.cursor),
      { id: `pack-equal-clock-${label}-${attempt}-ancestor` },
    );

    const nextAction = `equal_clock_descendant_action_${label}_${attempt}`;
    await writeRuntimeObject(root, {
      object_ref: OBJECT_REF,
      runtime: {
        ...base.authorities.runtimeObject.runtime,
        updated_at: LATER_NOW,
      },
      continuation: {
        ...base.authorities.runtimeObject.continuation,
        next_action: nextAction,
        updated_at: LATER_NOW,
      },
    }, { id: `pack-equal-clock-${label}-${attempt}-continuation` });
    const changedAuthorities = {
      ...base.authorities,
      runtimeObject: await readRuntimeObject(root, OBJECT_REF),
    };
    await store.appendRecoveryEvent(root, journalEvent({
      turn_id: `turn-equal-clock-${label}-${attempt}`,
      type: "plan.updated",
      summary: `real Continuation changed for ${label}`,
      payload: { next_action: nextAction },
    }));
    const changedCapsule = await store.updateContextCapsule(root, {
      object_ref: OBJECT_REF,
      sources: capsuleSources(changedAuthorities),
    }, { id: `pack-equal-clock-${label}-${attempt}-capsule` });
    const changedCursor = (await store.replayRecoveryJournal(root, {
      object_ref: OBJECT_REF,
    })).cursor;
    const descendant = await store.sealRecoveryPack(
      root,
      recoveryPackInput(changedAuthorities, changedCapsule.capsule, changedCursor),
      { id: `pack-equal-clock-${label}-${attempt}-descendant` },
    );
    if (relation(descendant.pack_ref.id, ancestor.pack_ref.id)) {
      return { store, root, ancestor, descendant };
    }
  }
  return null;
}

async function buildOffsetClockPair(t, api, label, ancestorNow, descendantNow) {
  const { store, setNow } = createRecoveryTestStore(api, {
    now: ancestorNow,
    maxEventsPerSegment: 8,
  });
  const root = await temporaryCurrentWorkspace(t, `hw-m3-pack-offset-clock-${label}-`);
  const base = await prepareRecoveryBase(store, root, `pack-offset-clock-${label}`);
  const ancestor = await store.sealRecoveryPack(
    root,
    recoveryPackInput(base.authorities, base.capsule, base.cursor),
    { id: `pack-offset-clock-${label}-ancestor` },
  );

  setNow(descendantNow);
  const descendantNextAction = `offset_clock_descendant_action_${label}`;
  await writeRuntimeObject(root, {
    object_ref: OBJECT_REF,
    runtime: {
      ...base.authorities.runtimeObject.runtime,
      updated_at: LATER_NOW,
    },
    continuation: {
      ...base.authorities.runtimeObject.continuation,
      next_action: descendantNextAction,
      updated_at: LATER_NOW,
    },
  }, { id: `pack-offset-clock-${label}-continuation` });
  const changedAuthorities = {
    ...base.authorities,
    runtimeObject: await readRuntimeObject(root, OBJECT_REF),
  };
  await store.appendRecoveryEvent(root, journalEvent({
    turn_id: `turn-offset-clock-${label}`,
    type: "plan.updated",
    summary: `real Continuation changed for mixed-offset case ${label}`,
    payload: { next_action: descendantNextAction },
  }));
  const changedCapsule = await store.updateContextCapsule(root, {
    object_ref: OBJECT_REF,
    sources: capsuleSources(changedAuthorities),
  }, { id: `pack-offset-clock-${label}-capsule` });
  const changedCursor = (await store.replayRecoveryJournal(root, {
    object_ref: OBJECT_REF,
  })).cursor;
  const descendant = await store.sealRecoveryPack(
    root,
    recoveryPackInput(changedAuthorities, changedCapsule.capsule, changedCursor),
    { id: `pack-offset-clock-${label}-descendant` },
  );
  return { store, root, ancestor, descendant, descendantNextAction };
}

async function prepareRetentionIntegrityFixture(t, api, label) {
  const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 8 });
  const root = await temporaryCurrentWorkspace(t, `hw-m3-retention-integrity-${label}-`);
  const base = await prepareRecoveryBase(store, root, `retention-integrity-${label}`);
  const valid = await store.sealRecoveryPack(
    root,
    recoveryPackInput(base.authorities, base.capsule, base.cursor),
    { id: `retention-integrity-${label}-valid` },
  );
  for (const marker of ["d", "e"]) {
    const corruptId = marker.repeat(64);
    const corruptBase = `.pipeline/runtime/recovery/packs/delivery/goal-alpha/${corruptId}`;
    await writeText(join(root, corruptBase, "pack.yaml"), "not: [valid\n");
    await writeText(
      join(root, corruptBase, "seal.yaml"),
      `schema_version: "1"\npack_id: ${corruptId}\npack_digest: sha256:${corruptId}\nstatus: sealed\nsealed_at: ${LATER_NOW}\n`,
    );
  }
  const plan = await store.planRecoveryRetention(root, {
    object_ref: OBJECT_REF,
    keep_valid_packs: 1,
    keep_recent_segments: 0,
    keep_referenced_blobs: true,
  });
  assert.ok(plan.delete_paths.length >= 2, "integrity fixture requires multiple planned removals");
  assert.equal(plan.retained_pack_refs.some((ref) => ref.id === valid.pack_ref.id), true);
  return { store, root, valid, plan };
}

async function snapshotRetentionTargets(root, paths) {
  const result = new Map();
  for (const path of paths.sort()) {
    try {
      result.set(path, await snapshotTree(join(root, path)));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      result.set(path, null);
    }
  }
  return result;
}

async function loadRecoveryApi() {
  if (RECOVERY_PROBE.error) {
    assert.fail(`recovery module is unavailable: ${RECOVERY_PROBE.error.code || "load failure"}`);
  }
  return RECOVERY_PROBE.api;
}
