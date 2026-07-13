import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalHash } from "../../../src/serialization/index.js";
import {
  readRuntimeObject,
  writeRuntimeObject,
} from "../../../src/runtime/index.js";
import {
  commitRecordPatch,
  createRecordPatch,
  readRecord,
} from "../../../src/records/index.js";
import {
  createReceiptStore,
} from "../../../src/receipts/index.js";
import {
  allFileText,
  assertLegacySentinelsUnchanged,
  exists,
  listFiles,
  readText,
  snapshotTree,
  temporaryCurrentWorkspace,
  writeText,
} from "../c21-m2/helpers.js";

export {
  allFileText,
  assertLegacySentinelsUnchanged,
  exists,
  listFiles,
  readText,
  snapshotTree,
  temporaryCurrentWorkspace,
  writeText,
};

export const OBJECT_REF = Object.freeze({ kind: "delivery", id: "goal-alpha" });
export const OTHER_OBJECT_REF = Object.freeze({ kind: "delivery", id: "cycle-beta" });
export const FIXED_NOW = "2026-07-12T09:00:00+08:00";
export const LATER_NOW = "2026-07-12T09:10:00+08:00";
export const LATEST_NOW = "2026-07-12T09:20:00+08:00";
export const EXPECTED_NEXT_ACTION = "seal_recovery_pack_from_verified_capsule";
export const DEFAULT_STORE_METHODS = Object.freeze([
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

const FIXTURE_DIR = dirname(fileURLToPath(import.meta.url));

export function createMutableClock(initial = FIXED_NOW) {
  let current = initial;
  return {
    clock(...args) {
      assert.equal(args.length, 0, "the injected Recovery Clock is a zero-argument source");
      return current;
    },
    set(value) {
      current = value;
    },
  };
}

export function createRecoveryTestStore(api, options = {}) {
  const time = createMutableClock(options.now ?? FIXED_NOW);
  const store = api.createRecoveryStore({
    clock: time.clock,
    max_events_per_segment: options.maxEventsPerSegment ?? 2,
    inline_output_bytes: options.inlineOutputBytes ?? 128,
    default_restore_budget_bytes: options.defaultRestoreBudgetBytes ?? 16_384,
  });
  for (const name of DEFAULT_STORE_METHODS) {
    assert.equal(typeof store[name], "function", `Recovery store must expose ${name}`);
  }
  return { store, setNow: time.set };
}

export function journalEvent(overrides = {}) {
  const input = {
    object_ref: OBJECT_REF,
    session_id: "session-main",
    writer: { kind: "main", id: "main" },
    turn_id: "turn-001",
    type: "turn.user",
    summary: "The user requested a recoverable delivery flow.",
    payload: { message_ref: "user-message-001" },
  };
  return { ...input, ...overrides };
}

export function generatedSecret() {
  return ["M3", "password", "seed", "9zQ4vN2xL7kP"].join("-");
}

export function largeOutput(size = 4_096) {
  return `M3_LARGE_OUTPUT_BEGIN\n${"output-line-".repeat(Math.ceil(size / 12))}\nM3_LARGE_OUTPUT_END`;
}

export async function loadFaultFixture() {
  return JSON.parse(await readFile(join(FIXTURE_DIR, "faults.json"), "utf8"));
}

export async function seedM2Authorities(root, prefix = "m3-seed") {
  const runtimeInput = {
    object_ref: OBJECT_REF,
    runtime: {
      schema_version: "1",
      object_ref: OBJECT_REF,
      object_type: "goal",
      status: "executing",
      phase: "implementation",
      updated_at: FIXED_NOW,
    },
    continuation: {
      schema_version: "1",
      object_ref: OBJECT_REF,
      next_action: EXPECTED_NEXT_ACTION,
      safe_resume_command: "/hw:resume",
      updated_at: FIXED_NOW,
    },
  };
  const runtimeWrite = await writeRuntimeObject(root, runtimeInput, { id: `${prefix}-runtime` });
  const runtimeObject = await readRuntimeObject(root, OBJECT_REF);

  const recordPatch = createRecordPatch({
    scope: { type: "delivery", ref: "goal-alpha" },
    kind: "requirement",
    source_refs: [{
      type: "workflow_artifact",
      ref: ".pipeline/architecture.md",
      locator: "C21-M3-recovery",
    }],
    confidence: "high",
    dedupe_key: "requirement.recovery-next-action",
    created_at: FIXED_NOW,
    updated_at: FIXED_NOW,
    supersedes: [],
    body: "# Recovery requirement\n\nResume from a verified Pack and bounded Journal delta.\n",
  });
  const recordWrite = await commitRecordPatch(root, recordPatch, { id: `${prefix}-record` });
  const record = await readRecord(root, recordWrite.id);

  const receiptStore = createReceiptStore({ clock: () => FIXED_NOW });
  const receiptInput = {
    actor: { type: "user", id: "operator" },
    intent: "workflow.commit",
    object_ref: OBJECT_REF,
    scope: {
      actions: ["seal-recovery-pack"],
      paths: [{
        path: ".pipeline/runtime/recovery/packs",
        content_hash: canonicalHash("approved-recovery-pack-scope"),
      }],
    },
    plan_hash: canonicalHash({ plan: "C21-M3" }),
    issued_at: FIXED_NOW,
    expires_at: "2099-01-01T00:00:00Z",
  };
  const receiptWrite = await receiptStore.issueReceipt(root, receiptInput, { id: `${prefix}-receipt` });
  const receipt = await receiptStore.readReceipt(root, receiptWrite.id);

  const evidencePath = `.pipeline/runtime/objects/delivery/goal-alpha/evidence/${prefix}.txt`;
  const evidenceContent = "M3 focused verification passed.\n";
  await writeText(join(root, evidencePath), evidenceContent);
  const evidenceRef = {
    type: "file",
    path: evidencePath,
    digest: `sha256:${sha256(evidenceContent)}`,
  };

  return {
    runtimeInput,
    runtimeWrite,
    runtimeObject,
    record,
    recordRef: {
      type: "record",
      id: record.attributes.id,
      semantic_hash: record.attributes.semantic_hash,
    },
    receipt,
    receiptRef: {
      type: "receipt",
      id: receipt.receipt_id,
      state: receipt.state,
      scope_hash: receipt.scope_hash,
      plan_hash: receipt.plan_hash,
    },
    evidenceRef,
    worktreeSummary: {
      head: "a".repeat(40),
      dirty_paths: ["core/src/recovery/index.js"],
      diff_summary: { files_changed: 1, insertions: 42, deletions: 0 },
      diff_digest: `sha256:${sha256("core/src/recovery/index.js:+42/-0")}`,
    },
  };
}

export function capsuleSources(authorities) {
  return {
    records: [authorities.record],
    continuation: authorities.runtimeObject.continuation,
    receipts: [authorities.receipt],
  };
}

export function recoveryPackInput(authorities, capsule, cursor, overrides = {}) {
  const input = {
    object_ref: OBJECT_REF,
    trigger: "pre_compact",
    capsule,
    continuation: authorities.runtimeObject.continuation,
    record_refs: [authorities.recordRef],
    receipt_refs: [authorities.receiptRef],
    evidence_refs: [authorities.evidenceRef],
    worktree_summary: authorities.worktreeSummary,
    cursor,
  };
  return { ...input, ...overrides };
}

export async function appendScenarioEvents(store, root, options = {}) {
  const sessionId = options.sessionId ?? "session-main";
  const writer = options.writer ?? { kind: "main", id: "main" };
  const events = [
    journalEvent({
      session_id: sessionId,
      writer,
      turn_id: "turn-001",
      type: "turn.user",
      summary: "Recovery must continue without a full transcript.",
    }),
    journalEvent({
      session_id: sessionId,
      writer,
      turn_id: "turn-001",
      type: "plan.updated",
      summary: "Plan the next verified recovery step.",
      rationale_summary: "A bounded Pack plus Journal delta is sufficient and auditable.",
      payload: {
        current_goal: "Deliver the M3 recovery engine.",
        scope: ["journal", "capsule", "pack"],
        non_goals: ["platform hooks", "full transcript replay"],
        next_action: EXPECTED_NEXT_ACTION,
      },
    }),
    journalEvent({
      session_id: sessionId,
      writer,
      turn_id: "turn-002",
      type: "verification.completed",
      summary: "The recovery contract passed its focused checks.",
      payload: {
        status: "passed",
        evidence_refs: ["evidence:m3-focused"],
      },
    }),
  ];
  const appended = [];
  for (const event of events) appended.push(await store.appendRecoveryEvent(root, event));
  return appended;
}

export async function findJournalSegments(root, objectRef = OBJECT_REF) {
  const base = join(
    root,
    ".pipeline",
    "runtime",
    "objects",
    objectRef.kind,
    objectRef.id,
    "events",
  );
  if (!(await pathExists(base))) return [];
  const files = [];
  await visitFiles(base, base, files);
  return files.filter((path) => path.endsWith(".jsonl")).sort();
}

export async function readJsonl(path) {
  const text = await readFile(path, "utf8");
  return text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

export async function writeJsonl(path, lines, options = {}) {
  await mkdir(dirname(path), { recursive: true });
  const trailingNewline = options.trailingNewline ?? true;
  await writeFile(path, `${lines.join("\n")}${trailingNewline ? "\n" : ""}`, "utf8");
}

export async function authorityByteMap(root, authorities) {
  const paths = [
    authorities.runtimeWrite.runtime_path,
    authorities.runtimeWrite.continuation_path,
    authorities.record.path,
    `.pipeline/runtime/receipts/${authorities.receipt.receipt_id}.yaml`,
  ];
  const values = new Map();
  for (const path of paths) values.set(path, await readText(join(root, path)));
  return values;
}

export async function assertAuthorityBytesEqual(root, expected) {
  for (const [path, content] of expected) {
    assert.equal(await readText(join(root, path)), content, `${path} authority bytes must not change`);
  }
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function pathExists(path) {
  try {
    await readFile(path);
    return true;
  } catch (error) {
    if (error?.code !== "EISDIR") return false;
    return true;
  }
}

async function visitFiles(base, current, files) {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) await visitFiles(base, path, files);
    if (entry.isFile()) files.push(path);
  }
}

export function relativeToRoot(root, path) {
  return relative(root, path).split("\\").join("/");
}
