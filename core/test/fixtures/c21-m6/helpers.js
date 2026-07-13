import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { temporaryCurrentWorkspace } from "../c21-m2/helpers.js";

export { temporaryCurrentWorkspace };

export const FIXED_NOW = "2026-07-12T12:00:00+08:00";
export const LATER_NOW = "2026-07-12T12:10:00+08:00";
export const REVISION_NOW = "2026-07-12T12:20:00+08:00";
export const ACCEPT_NOW = "2026-07-12T12:30:00+08:00";
export const EXPIRED_NOW = "2026-07-12T13:30:00+08:00";
export const FAR_EXPIRY = "2099-01-01T00:00:00Z";
export const USER_ACTOR = Object.freeze({ type: "user", id: "operator" });
export const OTHER_ACTOR = Object.freeze({ type: "user", id: "other-operator" });
export const GOAL_REF = Object.freeze({ kind: "delivery", id: "goal-alpha" });
export const CYCLE_REF = Object.freeze({ kind: "delivery", id: "cycle-alpha" });

export const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
export const ROOT_API_URL = new URL("../../../src/index.js", import.meta.url).href;
export const DELIVERY_API_URL = new URL("../../../src/delivery/index.js", import.meta.url).href;
export const PLANNING_API_URL = new URL("../../../src/planning/index.js", import.meta.url).href;
export const TOPOLOGY_API_URL = new URL("../../../src/execution-topology/index.js", import.meta.url).href;

export const DELIVERY_STORE_METHODS = Object.freeze([
  "proposeGoal",
  "proposeCycle",
  "read",
  "approve",
  "start",
  "recordRevision",
  "verifyMilestone",
  "verify",
  "requestAcceptance",
  "accept",
  "reject",
  "resume",
]);

export function goalDesignInput(overrides = {}) {
  return {
    id: "goal-alpha",
    title: "Deliver a restart-safe queue API",
    outcome: "A queue API passes its acceptance command after an explicit start.",
    acceptance_criteria: [{
      id: "AC1",
      statement: "The queue API returns one enqueued item.",
      verification: "node --test test/queue.test.js",
    }],
    constraints: ["Do not write product files before explicit start."],
    evidence: [{
      type: "repository",
      ref: "README.md",
      summary: "The repository is initialized and contains no queue implementation.",
    }],
    revision: 0,
    ...overrides,
  };
}

export function cyclePlanInput(overrides = {}) {
  return {
    id: "cycle-alpha",
    title: "Deliver a two-stage queue service",
    outcome: "The storage and API stages are verified in order and accepted once.",
    acceptance_criteria: [{
      id: "AC-CYCLE",
      statement: "The complete service passes its repository test command.",
      verification: "node --test test/service.test.js",
    }],
    constraints: ["Milestones are verified in order."],
    evidence: [{
      type: "repository",
      ref: "README.md",
      summary: "The repository needs storage before the API layer.",
    }],
    revision: 0,
    milestones: [
      {
        id: "M1",
        title: "Storage contract",
        outcome: "Persist and read one queue item.",
        verification_criteria: ["Storage tests pass."],
        depends_on: [],
      },
      {
        id: "M2",
        title: "API contract",
        outcome: "Expose the verified storage through the queue API.",
        verification_criteria: ["API tests pass."],
        depends_on: ["M1"],
      },
    ],
    ...overrides,
  };
}

export function structuredFeedback(overrides = {}) {
  return {
    problem: "The first result does not preserve FIFO order.",
    reproduce_steps: ["Enqueue item A.", "Enqueue item B.", "Dequeue twice."],
    expected: "A is returned before B.",
    actual: "B is returned before A.",
    context: "Manual acceptance of the complete delivery.",
    ...overrides,
  };
}

export function strictTopologyInput(overrides = {}) {
  return {
    task_kind: "engineering",
    change_size: "material",
    reversible: true,
    policy: { profile: "auto", allow_solo_verified: false },
    ...overrides,
  };
}

export function soloTopologyInput(overrides = {}) {
  return {
    task_kind: "engineering",
    change_size: "trivial",
    reversible: true,
    policy: { profile: "solo-verified", allow_solo_verified: true },
    ...overrides,
  };
}

export function migrationTopologyInput(overrides = {}) {
  return {
    task_kind: "migration",
    change_size: "material",
    reversible: false,
    policy: { profile: "auto", allow_solo_verified: false },
    ...overrides,
  };
}

export function createMutableClock(initial = FIXED_NOW) {
  let current = initial;
  return {
    clock(...args) {
      assert.equal(args.length, 0, "the M6 Clock must be a zero-argument source");
      return current;
    },
    set(value) {
      current = value;
    },
  };
}

export function createDeliveryTestStore(api, initial = FIXED_NOW) {
  const time = createMutableClock(initial);
  const store = api.createDeliveryStore({ clock: time.clock });
  for (const method of DELIVERY_STORE_METHODS) {
    assert.equal(typeof store[method], "function", `Delivery store must expose ${method}`);
  }
  return { store, setNow: time.set, clock: time.clock };
}

export async function issueDeliveryReceipt(api, root, delivery, intent, options = {}) {
  const actor = options.actor ?? USER_ACTOR;
  const now = options.now ?? FIXED_NOW;
  const expiresAt = options.expires_at ?? FAR_EXPIRY;
  const context = api.buildDeliveryReceiptContext(delivery, { actor, intent });
  const receiptStore = api.createReceiptStore({ clock: () => now });
  const issued = await receiptStore.issueReceipt(root, {
    ...context,
    issued_at: options.issued_at ?? now,
    expires_at: expiresAt,
  }, { id: options.transaction_id ?? `m6-${intent.replaceAll(".", "-")}-${delivery.revision}` });
  return {
    receipt_id: issued.id,
    ...context,
    tool_use_id: options.tool_use_id ?? `tool-${intent.replaceAll(".", "-")}-${delivery.revision}`,
  };
}

export async function writeWorkerEvidence(root, roles, options = {}) {
  const objectId = options.object_id ?? "goal-alpha";
  const prefix = options.prefix ?? "verification";
  const status = options.status ?? "completed";
  const evidence = [];
  for (const [index, role] of roles.entries()) {
    const workerId = options.worker_ids?.[index] ?? `worker-${role}-${index + 1}`;
    const path = `.pipeline/runtime/objects/delivery/${objectId}/evidence/${prefix}-${role}-${index + 1}.txt`;
    const content = `${role} worker ${workerId}: ${status}\n`;
    await writeText(join(root, path), content);
    evidence.push({
      role,
      worker_id: workerId,
      status,
      evidence_refs: [{ type: "file", path, digest: `sha256:${sha256(content)}` }],
    });
  }
  return evidence;
}

export async function temporaryGitRepository(t, prefix = "hw-m6-git-") {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  runGit(root, ["init", "-q"]);
  runGit(root, ["config", "user.name", "M6 Test"]);
  runGit(root, ["config", "user.email", "m6-test@example.invalid"]);
  await writeText(join(root, "README.md"), "# M6 delivery fixture\n");
  await writeText(join(root, ".gitignore"), ".pipeline/runtime/\n.pipeline/memory/\n");
  runGit(root, ["add", "README.md", ".gitignore"]);
  runGit(root, ["commit", "-qm", "fixture baseline"]);
  return root;
}

export async function initializeGitWorkspace(api, root, options = {}) {
  return api.initializeWorkspace(root, {
    intent: options.intent ?? "Deliver the M6 lifecycle fixture with explicit acceptance.",
    project_id: options.project_id ?? "m6-delivery-fixture",
    workspace_id: options.workspace_id ?? "m6-delivery-fixture-local",
  }, { id: options.transaction_id ?? "m6-git-init" });
}

export async function productSnapshot(root) {
  const snapshot = {};
  await walkProduct(root, root, snapshot);
  return snapshot;
}

export async function writeProductFile(root, path, content) {
  await writeText(join(root, path), content);
}

export function runGit(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

export function freshProcessCall(root, request) {
  const script = [
    `const core = await import(${JSON.stringify(ROOT_API_URL)});`,
    "const request = JSON.parse(Buffer.from(process.env.HW_M6_REQUEST, 'base64').toString('utf8'));",
    "const clock = () => request.now;",
    "let result;",
    "if (request.kind === 'root') {",
    "  result = await core[request.method](...(request.args || []));",
    "} else if (request.kind === 'delivery') {",
    "  const store = core.createDeliveryStore({ clock });",
    "  result = await store[request.method](process.env.HW_M6_ROOT, ...(request.args || []));",
    "} else if (request.kind === 'issue_receipt') {",
    "  const store = core.createDeliveryStore({ clock });",
    "  const delivery = await store.read(process.env.HW_M6_ROOT, request.object_ref);",
    "  const context = core.buildDeliveryReceiptContext(delivery, { actor: request.actor, intent: request.intent });",
    "  const receipts = core.createReceiptStore({ clock });",
    "  const issued = await receipts.issueReceipt(process.env.HW_M6_ROOT, {",
    "    ...context, issued_at: request.issued_at || request.now, expires_at: request.expires_at,",
    "  }, { id: request.transaction_id });",
    "  result = { receipt_id: issued.id, ...context, tool_use_id: request.tool_use_id };",
    "} else {",
    "  throw new Error(`unknown M6 fresh-process request kind: ${request.kind}`);",
    "}",
    "process.stdout.write(JSON.stringify(result));",
  ].join("\n");
  const payload = Buffer.from(JSON.stringify(request)).toString("base64");
  const child = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, HW_M6_ROOT: root, HW_M6_REQUEST: payload },
  });
  if (child.status !== 0) {
    const error = new Error(child.stderr.trim() || child.stdout.trim() || "fresh M6 process failed");
    error.status = child.status;
    throw error;
  }
  return JSON.parse(child.stdout);
}

export function freshDeliveryCall(root, method, args, now = FIXED_NOW) {
  return freshProcessCall(root, { kind: "delivery", method, args, now });
}

export function freshRootCall(root, method, args, now = FIXED_NOW) {
  return freshProcessCall(root, { kind: "root", method, args, now });
}

export function freshReceipt(root, objectRef, intent, options = {}) {
  const now = options.now ?? FIXED_NOW;
  return freshProcessCall(root, {
    kind: "issue_receipt",
    object_ref: objectRef,
    actor: options.actor ?? USER_ACTOR,
    intent,
    now,
    issued_at: options.issued_at ?? now,
    expires_at: options.expires_at ?? FAR_EXPIRY,
    transaction_id: options.transaction_id ?? `fresh-${intent.replaceAll(".", "-")}-${now.replaceAll(/[^0-9]/g, "")}`,
    tool_use_id: options.tool_use_id ?? `fresh-tool-${intent.replaceAll(".", "-")}`,
  });
}

export async function sealDeliveryRecoveryPack(api, root, delivery, options = {}) {
  const now = options.now ?? ACCEPT_NOW;
  const runtimeObject = await api.readRuntimeObject(root, delivery.object_ref);
  const recordIds = options.record_ids ?? [delivery.plan_record_ref.id];
  const records = [];
  const recordRefs = [];
  for (const id of recordIds) {
    const record = await api.readRecord(root, id);
    records.push(record);
    recordRefs.push({
      type: "record",
      id: record.attributes.id,
      semantic_hash: record.attributes.semantic_hash,
    });
  }
  const receipts = [];
  const receiptRefs = [];
  for (const id of options.receipt_ids ?? []) {
    const receipt = await api.readReceipt(root, id);
    receipts.push(receipt);
    receiptRefs.push({
      type: "receipt",
      id: receipt.receipt_id,
      state: receipt.state,
      scope_hash: receipt.scope_hash,
      plan_hash: receipt.plan_hash,
    });
  }
  const recovery = api.createRecoveryStore({
    clock: () => now,
    max_events_per_segment: 8,
    inline_output_bytes: 256,
    default_restore_budget_bytes: 32_768,
  });
  await recovery.appendRecoveryEvent(root, {
    object_ref: delivery.object_ref,
    session_id: options.session_id ?? "m6-delivery-session",
    writer: { kind: "main", id: "m6-test" },
    turn_id: options.turn_id ?? "m6-recovery-checkpoint",
    type: "verification.completed",
    summary: `Delivery ${delivery.object_ref.id} reached ${delivery.status}.`,
    payload: { status: delivery.status, plan_hash: delivery.plan_hash },
  });
  const capsuleWrite = await recovery.updateContextCapsule(root, {
    object_ref: delivery.object_ref,
    sources: {
      records,
      continuation: runtimeObject.continuation,
      receipts,
    },
  }, { id: options.capsule_transaction_id ?? `m6-capsule-${delivery.object_ref.id}-${delivery.revision}` });

  const evidencePath = `.pipeline/runtime/objects/delivery/${delivery.object_ref.id}/evidence/recovery-pack.txt`;
  const evidenceContent = `M6 recovery checkpoint for ${delivery.status}.\n`;
  await writeText(join(root, evidencePath), evidenceContent);
  const head = runGit(root, ["rev-parse", "HEAD"]);
  return recovery.sealRecoveryPack(root, {
    object_ref: delivery.object_ref,
    trigger: "pre_compact",
    capsule: capsuleWrite.capsule,
    continuation: runtimeObject.continuation,
    record_refs: recordRefs,
    receipt_refs: receiptRefs,
    evidence_refs: [{
      type: "file",
      path: evidencePath,
      digest: `sha256:${sha256(evidenceContent)}`,
    }],
    worktree_summary: {
      head,
      dirty_paths: [],
      diff_summary: { files_changed: 0, insertions: 0, deletions: 0 },
      diff_digest: `sha256:${sha256("m6-clean-worktree")}`,
    },
    cursor: capsuleWrite.capsule.cursor,
  }, { id: options.pack_transaction_id ?? `m6-pack-${delivery.object_ref.id}-${delivery.revision}` });
}

export async function importProbe(url) {
  try {
    return { api: await import(url), error: null };
  } catch (error) {
    return { api: null, error };
  }
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
    throw error;
  }
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function writeText(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function walkProduct(root, directory, snapshot) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (directory === root && [".git", ".pipeline"].includes(entry.name)) continue;
    const absolute = join(directory, entry.name);
    const path = relative(root, absolute).split(sep).join("/");
    const stats = await lstat(absolute);
    if (stats.isSymbolicLink()) {
      snapshot[path] = { type: "symlink" };
    } else if (stats.isDirectory()) {
      await walkProduct(root, absolute, snapshot);
    } else if (stats.isFile()) {
      snapshot[path] = { type: "file", sha256: sha256(await readFile(absolute)) };
    }
  }
}
