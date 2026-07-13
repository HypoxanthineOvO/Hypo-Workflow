import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { canonicalHash, parseYaml } from "../src/serialization/index.js";
import {
  FIXED_NOW,
  LEGACY_SENTINELS,
  allFileText,
  assertLegacySentinelsUnchanged,
  listFiles,
  readText,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m2/helpers.js";

const ROOT_EXPORTS = [
  "normalizeRuntimeObjectRef",
  "writeRuntimeObject",
  "readRuntimeObject",
  "writeActivePointer",
  "readActivePointer",
  "createRecordPatch",
  "commitRecordPatch",
  "readRecord",
  "rebuildRecordIndexes",
  "createReceiptStore",
  "issueReceipt",
  "readReceipt",
  "validateReceipt",
  "reserveReceipt",
  "consumeReceipt",
  "invalidateReceipt",
  "revokeReceipt",
  "buildSnapshotProjection",
  "writeSnapshot",
  "readSnapshot",
];

const AUTHORITY_PROBE = await Promise.all([
  import("../src/index.js"),
  import("../src/runtime/index.js"),
  import("../src/records/index.js"),
  import("../src/receipts/index.js"),
  import("../src/snapshots/index.js"),
])
  .then(([root, runtime, records, receipts, snapshots]) => ({
    modules: { root, runtime, records, receipts, snapshots },
    error: null,
  }))
  .catch((error) => ({ modules: null, error }));
const authorityTest = AUTHORITY_PROBE.error
  || typeof AUTHORITY_PROBE.modules?.receipts.createReceiptStore !== "function"
  ? test.skip
  : test;

test("all M2 object APIs are explicit root exports rather than hidden aggregate-state helpers", async () => {
  const modules = await loadAuthorityModules();
  for (const name of ROOT_EXPORTS) assert.equal(typeof modules.root[name], "function", `${name} must be a root export`);
  assert.equal(typeof modules.runtime.writeRuntimeObject, "function");
  assert.equal(typeof modules.records.commitRecordPatch, "function");
  assert.equal(typeof modules.receipts.reserveReceipt, "function");
  assert.equal(typeof modules.snapshots.writeSnapshot, "function");
});

authorityTest("real emitted files keep pointer, runtime, Record, Receipt, indexes, and Snapshot authority distinct", async (t) => {
  const modules = await loadAuthorityModules();
  const { runtime, records, receipts, snapshots } = modules;
  const receiptStore = receipts.createReceiptStore({ clock: () => FIXED_NOW });
  const root = await temporaryCurrentWorkspace(t, "hw-m2-authority-distinct-", {
    withLegacySentinels: true,
  });
  const objectRef = { kind: "delivery", id: "goal-authority" };
  const runtimeInput = {
    object_ref: objectRef,
    runtime: {
      schema_version: "1",
      object_ref: objectRef,
      object_type: "goal",
      status: "pending_acceptance",
      phase: "manual_acceptance_gate",
      updated_at: FIXED_NOW,
    },
    continuation: {
      schema_version: "1",
      object_ref: objectRef,
      next_action: "request_manual_acceptance",
      safe_resume_command: "/hw:resume",
      updated_at: FIXED_NOW,
    },
  };
  const runtimeWrite = await runtime.writeRuntimeObject(root, runtimeInput, { id: "authority-runtime" });
  await runtime.writeActivePointer(root, {
    schema_version: "1",
    active: { delivery: objectRef },
  }, { id: "authority-pointer" });

  const recordPatch = records.createRecordPatch({
    scope: { type: "project", ref: "m2-fixture-project" },
    kind: "decision",
    source_refs: [{
      type: "workflow_artifact",
      ref: ".pipeline/architecture.md",
      locator: "authority-table",
    }],
    confidence: "high",
    dedupe_key: "decision.authority-nonduplication",
    created_at: FIXED_NOW,
    updated_at: FIXED_NOW,
    supersedes: [],
    body: "# Authority non-duplication\n\nM2_RECORD_AUTHORITY_SENTINEL belongs to this durable Record.\n",
  });
  const recordWrite = await records.commitRecordPatch(root, recordPatch, { id: "authority-record" });
  await records.rebuildRecordIndexes(root, { id: "authority-index" });
  const durableRecord = await records.readRecord(root, recordWrite.id);

  const receiptInput = {
    actor: { type: "user", id: "operator" },
    intent: "workflow.authority-nonduplication",
    object_ref: objectRef,
    scope: {
      actions: ["accept"],
      paths: [{ path: runtimeWrite.runtime_path, content_hash: canonicalHash(runtimeInput.runtime) }],
    },
    plan_hash: canonicalHash({ plan: "authority-distinct" }),
    issued_at: FIXED_NOW,
    expires_at: "2026-07-12T10:00:00+08:00",
  };
  const receiptWrite = await receiptStore.issueReceipt(root, receiptInput, { id: "authority-receipt-issue" });
  await receiptStore.reserveReceipt(root, receiptWrite.id, receiptContext(receiptInput), {
    tool_use_id: "tool-authority-owner",
    id: "authority-receipt-reserve",
  });

  const snapshotWrite = await snapshots.writeSnapshot(root, {
    snapshot_kind: "accepted",
    manifest: parseYaml(await readText(join(root, ".pipeline", "manifest.yaml"))),
    object: {
      object_ref: objectRef,
      object_type: "goal",
      state: "accepted",
      plan_hash: receiptInput.plan_hash,
      accepted_at: FIXED_NOW,
    },
    records: [durableRecord],
    local_context: {
      active_pointer: { delivery: objectRef },
      runtime: runtimeInput.runtime,
      continuation: runtimeInput.continuation,
      receipt: await receiptStore.readReceipt(root, receiptWrite.id),
    },
  }, { id: "authority-snapshot" });

  const paths = await listFiles(root);
  const pointerText = await readText(join(root, ".pipeline", "runtime", "active.yaml"));
  const runtimeText = await readText(join(root, runtimeWrite.runtime_path));
  const continuationText = await readText(join(root, runtimeWrite.continuation_path));
  const recordText = await readText(join(root, recordWrite.path));
  const indexText = await readText(join(root, ".pipeline", "memory", "index.yaml"));
  const humanIndexText = await readText(join(root, ".pipeline", "memory", "INDEX.md"));
  const receiptText = await readText(join(root, receiptWrite.path));
  const snapshotText = await readText(join(root, snapshotWrite.path));

  assert.match(pointerText, /goal-authority/);
  assert.doesNotMatch(pointerText, /pending_acceptance|manual_acceptance_gate|request_manual_acceptance/);
  assert.match(runtimeText, /pending_acceptance/);
  assert.match(runtimeText, /manual_acceptance_gate/);
  assert.doesNotMatch(runtimeText, /M2_RECORD_AUTHORITY_SENTINEL|workflow\.authority-nonduplication|tool-authority-owner/);
  assert.match(continuationText, /request_manual_acceptance/);
  assert.doesNotMatch(continuationText, /M2_RECORD_AUTHORITY_SENTINEL|workflow\.authority-nonduplication/);
  assert.match(recordText, /M2_RECORD_AUTHORITY_SENTINEL/);
  assert.doesNotMatch(recordText, /pending_acceptance|request_manual_acceptance|tool-authority-owner/);
  assert.match(indexText, /authority_role:\s*derived/);
  assert.match(indexText, new RegExp(recordWrite.id));
  assert.doesNotMatch(indexText, /M2_RECORD_AUTHORITY_SENTINEL|pending_acceptance|tool-authority-owner/);
  assert.match(humanIndexText, new RegExp(recordWrite.id));
  assert.doesNotMatch(humanIndexText, /M2_RECORD_AUTHORITY_SENTINEL|pending_acceptance|tool-authority-owner/);
  assert.match(receiptText, /workflow\.authority-nonduplication/);
  assert.match(receiptText, /tool-authority-owner/);
  assert.doesNotMatch(receiptText, /M2_RECORD_AUTHORITY_SENTINEL|pending_acceptance|request_manual_acceptance/);
  assert.match(snapshotText, /authority_role:\s*projection/);
  assert.match(snapshotText, /state:\s*accepted/);
  assert.match(snapshotText, /M2_RECORD_AUTHORITY_SENTINEL/);
  assert.doesNotMatch(
    snapshotText,
    /pending_acceptance|manual_acceptance_gate|request_manual_acceptance|workflow\.authority-nonduplication|tool-authority-owner/,
  );

  const machineIndex = parseYaml(indexText);
  assert.equal(machineIndex.authority_role, "derived");
  assert.equal(machineIndex.active_by_dedupe_key[recordPatch.dedupe_key], recordWrite.id);
  assert.equal((await snapshots.readSnapshot(root, snapshotWrite.path)).authority_role, "projection");
  assert.equal(paths.filter((path) => path.endsWith("/runtime.yaml")).length, 1);
  assert.equal(paths.filter((path) => path.includes("/memory/records/") && path.endsWith(".md")).length, 1);
  assert.equal(paths.filter((path) => path.includes("/runtime/receipts/") && path.endsWith(".yaml")).length, 1);
  assert.equal(paths.filter((path) => path.startsWith(".pipeline/snapshots/") && path.endsWith(".yaml")).length, 1);
  await assertLegacySentinelsUnchanged(root);

  const forbiddenNewWrites = paths.filter((path) => isForbiddenLegacyAuthority(path));
  assert.deepEqual(forbiddenNewWrites.sort(), Object.keys(LEGACY_SENTINELS).sort());
  const allText = await allFileText(root);
  assert.equal(countOccurrences(allText, "pending_acceptance"), 1, "current lifecycle state has one authority");
  assert.equal(countOccurrences(allText, "request_manual_acceptance"), 1, "continuation has one authority");
  assert.equal(
    countOccurrences(allText, "M2_RECORD_AUTHORITY_SENTINEL"),
    2,
    "durable fact appears once in Record authority and once in an explicit Snapshot projection",
  );
  assert.equal(countOccurrences(allText, "workflow.authority-nonduplication"), 1, "authorization intent stays in Receipt");
  assert.equal(countOccurrences(allText, "tool-authority-owner"), 1, "reservation ownership stays in Receipt");
});

function receiptContext(input) {
  return {
    actor: input.actor,
    intent: input.intent,
    object_ref: input.object_ref,
    scope: input.scope,
    plan_hash: input.plan_hash,
  };
}

function isForbiddenLegacyAuthority(path) {
  return path === ".pipeline/state.yaml"
    || path === ".pipeline/cycle.yaml"
    || path === ".pipeline/log.yaml"
    || path.startsWith(".pipeline/knowledge/")
    || path.startsWith(".pipeline/chat/")
    || path.startsWith(".pipeline/patches/");
}

function countOccurrences(text, needle) {
  return text.split(needle).length - 1;
}

async function loadAuthorityModules() {
  if (AUTHORITY_PROBE.error) throw AUTHORITY_PROBE.error;
  return AUTHORITY_PROBE.modules;
}
