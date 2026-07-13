import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { recoverWorkspaceTransaction } from "../src/workspace-store/index.js";
import {
  OBJECT_REF,
  allFileText,
  appendScenarioEvents,
  assertAuthorityBytesEqual,
  assertLegacySentinelsUnchanged,
  authorityByteMap,
  capsuleSources,
  createRecoveryTestStore,
  exists,
  findJournalSegments,
  journalEvent,
  largeOutput,
  listFiles,
  loadFaultFixture,
  recoveryPackInput,
  seedM2Authorities,
  snapshotTree,
  temporaryCurrentWorkspace,
  writeJsonl,
} from "./fixtures/c21-m3/helpers.js";

const REQUIRED_ROOT_FUNCTIONS = Object.freeze([
  "createRecoveryStore",
  "appendRecoveryEvent",
  "replayRecoveryJournal",
  "readRecoveryBlob",
  "updateContextCapsule",
  "rebuildContextCapsule",
  "readContextCapsule",
  "sealRecoveryPack",
  "validateRecoveryPack",
  "selectLatestValidRecoveryPack",
  "planRecoveryRestore",
  "planRecoveryRetention",
  "applyRecoveryRetention",
]);
const REQUIRED_FAULT_API = Object.freeze([
  "createRecoveryStore",
  "appendRecoveryEvent",
  "replayRecoveryJournal",
  "readRecoveryBlob",
  "updateContextCapsule",
  "sealRecoveryPack",
  "validateRecoveryPack",
]);

const [RECOVERY_PROBE, ROOT_PROBE] = await Promise.all([
  import("../src/recovery/index.js")
    .then((api) => ({ api, error: null }))
    .catch((error) => ({ api: null, error })),
  import("../src/index.js")
    .then((api) => ({ api, error: null }))
    .catch((error) => ({ api: null, error })),
]);
const FAULT_READY = !RECOVERY_PROBE.error
  && REQUIRED_FAULT_API.every((name) => typeof RECOVERY_PROBE.api?.[name] === "function");
const faultTest = FAULT_READY ? test : test.skip;

test("all M3 Recovery contracts are explicit core root exports", async () => {
  if (ROOT_PROBE.error) assert.fail(`core root module failed to load: ${ROOT_PROBE.error.code || "load failure"}`);
  for (const name of REQUIRED_ROOT_FUNCTIONS) {
    assert.equal(typeof ROOT_PROBE.api[name], "function", `${name} must be exported from core/src/index.js`);
  }
  assert.ok(Array.isArray(ROOT_PROBE.api.RECOVERY_EVENT_TYPES));
});

faultTest("replay tolerates only a truncated final line and fails closed on earlier corruption", async (t) => {
  const api = await loadRecoveryApi();
  const fixture = await loadFaultFixture();

  await t.test("truncated-final-line", async (subtest) => {
    const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 8 });
    const root = await temporaryCurrentWorkspace(subtest, "hw-m3-fault-truncated-");
    await appendScenarioEvents(store, root);
    const segments = await findJournalSegments(root);
    assert.equal(segments.length, 1);
    const lines = (await readFile(segments[0], "utf8")).trimEnd().split("\n");
    assert.equal(lines.length, 3);
    await writeJsonl(segments[0], [lines[0], lines[1], fixture.truncated_tail], {
      trailingNewline: false,
    });

    const replay = await store.replayRecoveryJournal(root, { object_ref: OBJECT_REF });
    assert.equal(replay.events.length, 2);
    assert.deepEqual(replay.events.map((event) => event.sequence), [1, 2]);
    assert.equal(replay.cursor.streams[0].sequence, 2);
    assert.equal(replay.warnings.some((warning) => warning.code === "truncated_final_line"), true);
  });

  await t.test("earlier-corruption", async (subtest) => {
    const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 8 });
    const root = await temporaryCurrentWorkspace(subtest, "hw-m3-fault-early-");
    await appendScenarioEvents(store, root);
    const segments = await findJournalSegments(root);
    const lines = (await readFile(segments[0], "utf8")).trimEnd().split("\n");
    await writeJsonl(segments[0], [lines[0], fixture.earlier_corruption, lines[2]]);
    const before = await snapshotTree(root);

    await assert.rejects(
      store.replayRecoveryJournal(root, { object_ref: OBJECT_REF }),
      /journal|jsonl|corrupt|parse|line|integrity/i,
    );
    assert.deepEqual(await snapshotTree(root), before, "failed replay must not repair or rewrite authority");
  });
});

faultTest("content-addressed blobs reject byte drift instead of returning corrupt output", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { inlineOutputBytes: 64 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-fault-blob-");
  const output = largeOutput();
  const appended = await store.appendRecoveryEvent(root, journalEvent({
    type: "tool.completed",
    summary: "Persist a verified large output.",
    payload: { output },
  }));
  const descriptor = appended.event.payload.output;
  const blobPath = join(
    root,
    ".pipeline/runtime/recovery/blobs",
    descriptor.digest.slice("sha256:".length),
  );
  await writeFile(blobPath, "tampered blob bytes\n", "utf8");

  await assert.rejects(
    store.readRecoveryBlob(root, descriptor),
    /blob|digest|hash|integrity|mismatch|corrupt/i,
  );
  assert.equal((await allFileText(root)).includes(output), false);
});

faultTest("Pack sealing uses the M1 recoverable transaction and rolls back an after-prepare fault", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 8 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-fault-pack-transaction-", {
    withLegacySentinels: true,
  });
  const authorities = await seedM2Authorities(root, "pack-transaction");
  const authorityBefore = await authorityByteMap(root, authorities);
  await appendScenarioEvents(store, root);
  const capsule = (await store.updateContextCapsule(root, {
    object_ref: OBJECT_REF,
    sources: capsuleSources(authorities),
  }, { id: "pack-transaction-capsule" })).capsule;
  const cursor = (await store.replayRecoveryJournal(root, { object_ref: OBJECT_REF })).cursor;
  const transactionId = "pack-transaction-fault";

  await assert.rejects(
    store.sealRecoveryPack(
      root,
      recoveryPackInput(authorities, capsule, cursor),
      {
        id: transactionId,
        faultInjector(event) {
          if (event.phase === "after_prepare") throw new Error("injected M3 Pack interruption");
        },
      },
    ),
    /injected M3 Pack interruption/,
  );
  assert.equal(
    await exists(join(root, ".pipeline/runtime/transactions", transactionId, "transaction.yaml")),
    true,
  );
  assert.equal(
    (await listFiles(root)).some((path) => path.startsWith(".pipeline/runtime/recovery/packs/") && path.endsWith(".yaml")),
    false,
  );
  assert.equal((await recoverWorkspaceTransaction(root, { id: transactionId })).action, "rolled_back");
  await assertAuthorityBytesEqual(root, authorityBefore);
  await assertLegacySentinelsUnchanged(root);
});

faultTest("Journal, Capsule, and Pack writes preserve every M2 and legacy authority byte", async (t) => {
  const api = await loadRecoveryApi();
  const { store } = createRecoveryTestStore(api, { maxEventsPerSegment: 8 });
  const root = await temporaryCurrentWorkspace(t, "hw-m3-compatibility-", {
    withLegacySentinels: true,
  });
  const authorities = await seedM2Authorities(root, "m3-compatibility");
  const authorityBefore = await authorityByteMap(root, authorities);

  await appendScenarioEvents(store, root);
  const capsule = (await store.updateContextCapsule(root, {
    object_ref: OBJECT_REF,
    sources: capsuleSources(authorities),
  }, { id: "m3-compatibility-capsule" })).capsule;
  const cursor = (await store.replayRecoveryJournal(root, { object_ref: OBJECT_REF })).cursor;
  const pack = await store.sealRecoveryPack(
    root,
    recoveryPackInput(authorities, capsule, cursor),
    { id: "m3-compatibility-pack" },
  );

  await assertAuthorityBytesEqual(root, authorityBefore);
  await assertLegacySentinelsUnchanged(root);
  assert.equal((await store.validateRecoveryPack(root, pack.pack_ref)).valid, true);
  const files = await listFiles(root);
  const unexpectedLegacyWrites = files.filter((path) => (
    path === ".pipeline/state.yaml"
    || path === ".pipeline/cycle.yaml"
    || path === ".pipeline/log.yaml"
    || path.startsWith(".pipeline/knowledge/") && path !== ".pipeline/knowledge/legacy.md"
  ));
  assert.deepEqual(unexpectedLegacyWrites, [
    ".pipeline/cycle.yaml",
    ".pipeline/log.yaml",
    ".pipeline/state.yaml",
  ]);
});

async function loadRecoveryApi() {
  if (RECOVERY_PROBE.error) {
    assert.fail(`recovery module is unavailable: ${RECOVERY_PROBE.error.code || "load failure"}`);
  }
  return RECOVERY_PROBE.api;
}
