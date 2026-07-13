import { createHash } from "node:crypto";
import { lstat, readFile, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { readReceipt } from "../receipts/index.js";
import { readRecord } from "../records/index.js";
import { readRuntimeObject } from "../runtime/index.js";
import { canonicalHash, parseYaml, stringifyYaml } from "../serialization/index.js";
import { assertBootstrapAcceptanceWriteAllowed } from "../workspace-store/bootstrap-acceptance.js";
import { assertWorkspacePathAllowed, commitWorkspaceTransaction } from "../workspace-store/index.js";
import {
  assertExactKeys,
  assertPlainObject,
  authorityError,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
  normalizeSha256,
  normalizeTimestamp,
  normalizeTransactionOptions,
  readCurrentManifest,
} from "../runtime/internal.js";
import { normalizePersistedCapsule, readContextCapsuleInternal } from "./capsule.js";
import { replayRecoveryJournalInternal } from "./journal.js";
import {
  RECOVERY_SCHEMA_VERSION,
  assertSecretSafe,
  normalizeCursor,
  normalizeDigest,
  normalizeRecoveryObjectRef,
  normalizeSafeRepoPath,
  readClock,
  readContainedFile,
  sanitizeErrorCode,
  stableEqual,
} from "./shared.js";

const PACK_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "object_ref",
  "sealed_at",
  "trigger",
  "capsule",
  "continuation",
  "record_refs",
  "receipt_refs",
  "evidence_refs",
  "worktree_summary",
  "cursor",
  "previous_pack_ref",
]);
const PACK_INPUT_KEYS = Object.freeze([
  "object_ref",
  "trigger",
  "capsule",
  "continuation",
  "record_refs",
  "receipt_refs",
  "evidence_refs",
  "worktree_summary",
  "cursor",
]);
const PACK_COMPILE_KEYS = Object.freeze([
  "object_ref",
  "sealed_at",
  "trigger",
  "capsule",
  "continuation",
  "record_refs",
  "receipt_refs",
  "evidence_refs",
  "worktree_summary",
  "cursor",
  "previous_pack_ref",
]);
const PACKS_ROOT = ".pipeline/runtime/recovery/packs";

export function compileRecoveryPackProjection(input) {
  assertPlainObject(input, "Recovery Pack compilation input");
  assertExactKeys(input, PACK_COMPILE_KEYS, "Recovery Pack compilation input");
  assertSecretSafe(input, "Recovery Pack compilation input", { allowSecretRefs: true });
  const objectRef = normalizeRecoveryObjectRef(input.object_ref);
  if (input.trigger !== "pre_compact") {
    throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack trigger must be pre_compact");
  }
  const capsule = normalizePersistedCapsule(input.capsule, objectRef);
  const continuation = normalizeContinuationDocument(input.continuation, objectRef);
  const cursor = normalizeCursor(input.cursor, objectRef, "Recovery Pack compilation input.cursor");
  if (!stableEqual(cursor, capsule.cursor)) {
    throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Recovery Pack cursor differs from its Capsule cursor");
  }
  const durable = {
    schema_version: RECOVERY_SCHEMA_VERSION,
    authority_role: "recovery_projection",
    object_ref: objectRef,
    sealed_at: normalizeTimestamp(input.sealed_at, "Recovery Pack compilation input.sealed_at"),
    trigger: "pre_compact",
    capsule,
    continuation,
    record_refs: normalizeRecordRefs(input.record_refs),
    receipt_refs: normalizeReceiptRefs(input.receipt_refs),
    evidence_refs: normalizeEvidenceRefs(input.evidence_refs),
    worktree_summary: normalizeWorktreeSummary(input.worktree_summary),
    cursor,
    ...(input.previous_pack_ref === undefined ? {} : { previous_pack_ref: normalizePackRef(input.previous_pack_ref) }),
  };
  if (durable.previous_pack_ref && !stableEqual(durable.previous_pack_ref.object_ref, objectRef)) {
    throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack previous reference belongs to another object");
  }
  const packId = canonicalHash(durable);
  const packRef = { object_ref: objectRef, id: packId };
  const pack = normalizePersistedPack(durable, packRef);
  const seal = {
    schema_version: RECOVERY_SCHEMA_VERSION,
    pack_id: packId,
    pack_digest: `sha256:${packId}`,
    status: "sealed",
    sealed_at: pack.sealed_at,
  };
  normalizePersistedSeal(seal, packRef, pack.sealed_at);
  return {
    pack_ref: packRef,
    path: packFilePath(packRef),
    seal_path: sealFilePath(packRef),
    pack,
    seal,
    writes: [
      { path: packFilePath(packRef), content: renderYaml(pack) },
      { path: sealFilePath(packRef), content: renderYaml(seal) },
    ],
  };
}

export async function sealRecoveryPackWithPolicy(root, input, options, policy) {
  const normalized = await normalizeSealInput(root, input);
  const selected = await selectLatestValidRecoveryPackInternal(root, { object_ref: normalized.object_ref });
  const compiled = compileRecoveryPackProjection({
    object_ref: normalized.object_ref,
    sealed_at: readClock(policy.clock),
    trigger: "pre_compact",
    capsule: normalized.capsule,
    continuation: normalized.continuation,
    record_refs: normalized.record_refs,
    receipt_refs: normalized.receipt_refs,
    evidence_refs: normalized.evidence_refs,
    worktree_summary: normalized.worktree_summary,
    cursor: normalized.cursor,
    ...(selected.pack_ref === null ? {} : { previous_pack_ref: selected.pack_ref }),
  });
  const transaction = normalizeTransactionOptions(options, "recovery-pack-seal", {
    object_ref: normalized.object_ref,
    pack_id: compiled.pack_ref.id,
  });
  const manifest = await readCurrentManifest(root);
  await commitWorkspaceTransaction(root, {
    id: transaction.id,
    faultInjector: transaction.faultInjector,
    manifest,
    writes: compiled.writes,
  });
  return {
    pack_ref: compiled.pack_ref,
    path: compiled.path,
    seal_path: compiled.seal_path,
    pack: compiled.pack,
  };
}

export async function validateRecoveryPackInternal(root, packRefInput) {
  const inspected = await inspectRecoveryPack(root, packRefInput);
  return {
    valid: inspected.errors.length === 0,
    pack_ref: inspected.pack_ref,
    errors: inspected.errors,
  };
}

export async function selectLatestValidRecoveryPackInternal(root, query) {
  assertPlainObject(query, "Recovery Pack selection query");
  assertExactKeys(query, ["object_ref"], "Recovery Pack selection query");
  const objectRef = normalizeRecoveryObjectRef(query.object_ref);
  const candidates = await discoverPackRefs(root, objectRef);
  const valid = [];
  const rejected = [];
  for (const packRef of candidates) {
    const inspected = await inspectRecoveryPack(root, packRef);
    if (inspected.errors.length) {
      rejected.push({ pack_ref: inspected.pack_ref, errors: inspected.errors });
    } else {
      valid.push({ pack_ref: inspected.pack_ref, pack: inspected.pack });
    }
  }
  valid.splice(0, valid.length, ...orderValidPacks(valid));
  rejected.sort((left, right) => left.pack_ref.id.localeCompare(right.pack_ref.id));
  const selected = valid[0];
  return selected
    ? { pack_ref: selected.pack_ref, pack: selected.pack, rejected_packs: rejected }
    : { pack_ref: null, pack: null, rejected_packs: rejected };
}

export async function inspectRecoveryPackInventoryInternal(root, query) {
  assertPlainObject(query, "Recovery Pack inventory query");
  assertExactKeys(query, ["object_ref"], "Recovery Pack inventory query");
  const objectRef = normalizeRecoveryObjectRef(query.object_ref);
  const refs = await discoverPackRefs(root, objectRef);
  const entries = [];
  for (const packRef of refs) {
    const inspected = await inspectRecoveryPack(root, packRef);
    entries.push({
      pack_ref: inspected.pack_ref,
      pack: inspected.pack,
      errors: inspected.errors,
    });
  }
  const valid = entries
    .filter((entry) => entry.errors.length === 0)
    .map((entry) => ({ pack_ref: entry.pack_ref, pack: entry.pack }));
  const ordered = orderValidPacks(valid);
  return {
    object_ref: objectRef,
    entries,
    selected_pack_ref: ordered[0]?.pack_ref ?? null,
  };
}

export async function planRecoveryRestoreWithPolicy(root, input, policy) {
  assertPlainObject(input, "Recovery restore input");
  assertExactKeys(input, ["object_ref", "budget_bytes"], "Recovery restore input");
  const objectRef = normalizeRecoveryObjectRef(input.object_ref);
  const budget = input.budget_bytes === undefined
    ? policy.default_restore_budget_bytes
    : normalizeBudget(input.budget_bytes);
  const selected = await selectLatestValidRecoveryPackInternal(root, { object_ref: objectRef });
  if (!selected.pack_ref) {
    throw authorityError("ERR_RECOVERY_PACK_NOT_FOUND", "No valid sealed Recovery Pack is available");
  }
  const replay = await replayRecoveryJournalInternal(root, {
    object_ref: objectRef,
    after_cursor: selected.pack.cursor,
  });
  const nextAction = selected.pack.continuation.next_action;
  const journalDelta = replay.events.map(projectRestoreEvent);
  const context = {
    ...normalizeCanonicalValue(selected.pack.capsule.context, "Recovery Pack Capsule context"),
    next_action: nextAction,
  };
  const plan = {
    selected_pack_ref: selected.pack_ref,
    base_cursor: selected.pack.cursor,
    journal_delta: journalDelta,
    rejected_packs: selected.rejected_packs,
    next_action: nextAction,
    context,
    budget: { limit_bytes: budget, used_bytes: 0, truncated: false },
  };
  fitRestorePlanToBudget(plan, budget);
  return plan;
}

export async function planRecoveryRetentionInternal(root, input) {
  assertPlainObject(input, "Recovery retention input");
  assertExactKeys(input, [
    "object_ref",
    "keep_valid_packs",
    "keep_recent_segments",
    "keep_referenced_blobs",
  ], "Recovery retention input");
  const objectRef = normalizeRecoveryObjectRef(input.object_ref);
  const request = normalizeRetentionRequest(input);
  const keep = Math.max(1, request.keep_valid_packs);
  const candidates = await discoverPackRefs(root, objectRef);
  const valid = [];
  const invalid = [];
  const inventory = [];
  for (const packRef of candidates) {
    const inspected = await inspectRecoveryPack(root, packRef);
    inventory.push({
      pack_ref: packRef,
      content_digest: await digestPackDirectory(root, packRef),
      valid: inspected.errors.length === 0,
      errors: inspected.errors,
    });
    if (inspected.errors.length) invalid.push(packRef);
    else valid.push({ pack_ref: packRef, pack: inspected.pack });
  }
  valid.splice(0, valid.length, ...orderValidPacks(valid));
  const retained = valid.slice(0, keep).map((entry) => entry.pack_ref);
  const deleteRefs = [
    ...valid.slice(keep).map((entry) => entry.pack_ref),
    ...invalid,
  ].sort((left, right) => left.id.localeCompare(right.id));
  const durable = {
    schema_version: RECOVERY_SCHEMA_VERSION,
    object_ref: objectRef,
    request,
    inventory: inventory.sort((left, right) => left.pack_ref.id.localeCompare(right.pack_ref.id)),
    delete_paths: deleteRefs.map(packDirectoryPath),
    retained_pack_refs: retained,
  };
  return { ...durable, plan_hash: canonicalHash(durable) };
}

export async function applyRecoveryRetentionInternal(root, plan, operation) {
  normalizeSafeIdentifier(operation?.id, "Recovery retention operation id");
  const normalizedPlan = normalizeRetentionPlan(plan);
  const objectRef = normalizedPlan.object_ref;
  const expectedPrefix = `${PACKS_ROOT}/${objectRef.kind}/${objectRef.id}/`;
  const paths = normalizedPlan.delete_paths;
  const deleteIds = new Set(paths.map((path) => path.slice(expectedPrefix.length)));
  const retainedIds = new Set(normalizedPlan.retained_pack_refs.map((packRef) => packRef.id));
  const inventoryIds = new Set(normalizedPlan.inventory.map((entry) => entry.pack_ref.id));
  if ([...deleteIds].some((id) => retainedIds.has(id))) {
    throw authorityError("ERR_RECOVERY_RETENTION_INVALID", "Recovery retention delete and retained sets must be disjoint");
  }
  if (
    deleteIds.size + retainedIds.size !== inventoryIds.size
    || [...inventoryIds].some((id) => !deleteIds.has(id) && !retainedIds.has(id))
  ) {
    throw authorityError("ERR_RECOVERY_RETENTION_INVALID", "Recovery retention sets must cover the complete Pack inventory");
  }
  const expectedPlan = await planRecoveryRetentionInternal(root, {
    object_ref: objectRef,
    ...normalizedPlan.request,
  });
  if (!stableEqual(normalizedPlan, expectedPlan)) {
    throw authorityError("ERR_RECOVERY_RETENTION_DRIFT", "Recovery retention plan no longer matches the exact current Pack inventory");
  }
  const currentlyValid = normalizedPlan.inventory.filter((entry) => entry.valid).map((entry) => entry.pack_ref);
  if (currentlyValid.length && currentlyValid.every((packRef) => deleteIds.has(packRef.id))) {
    throw authorityError("ERR_RECOVERY_LAST_VALID_PACK", "Recovery retention cannot delete the last valid Recovery Pack");
  }
  await assertBootstrapAcceptanceWriteAllowed(resolve(root || "."));
  const deletedPaths = [];
  for (const path of paths.sort()) {
    const guarded = await assertWorkspacePathAllowed(resolve(root || "."), path);
    await rm(guarded.path, { recursive: true, force: false });
    deletedPaths.push(path);
  }
  return { deleted_paths: deletedPaths };
}

async function normalizeSealInput(root, input) {
  assertPlainObject(input, "Recovery Pack input");
  assertExactKeys(input, PACK_INPUT_KEYS, "Recovery Pack input");
  assertSecretSafe(input, "Recovery Pack input", { allowSecretRefs: true });
  const objectRef = normalizeRecoveryObjectRef(input.object_ref);
  if (input.trigger !== "pre_compact") {
    throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack trigger must be pre_compact");
  }
  const capsule = normalizePersistedCapsule(input.capsule, objectRef);
  const currentCapsule = await readContextCapsuleInternal(root, objectRef);
  if (!stableEqual(capsule, currentCapsule)) {
    throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Recovery Pack Capsule differs from the current Capsule projection");
  }
  const continuationDocument = Object.hasOwn(input.continuation ?? {}, "continuation")
    ? input.continuation.continuation
    : input.continuation;
  const runtimeAuthority = await readRuntimeObject(root, objectRef);
  if (!stableEqual(continuationDocument, runtimeAuthority.continuation)) {
    throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Recovery Pack continuation differs from Runtime authority");
  }
  const continuation = normalizeContinuationDocument(runtimeAuthority.continuation, objectRef);
  const recordRefs = await resolveRecordRefs(root, input.record_refs);
  const receiptRefs = await resolveReceiptRefs(root, input.receipt_refs);
  const evidenceRefs = await resolveEvidenceRefs(root, input.evidence_refs);
  const worktreeSummary = normalizeWorktreeSummary(input.worktree_summary);
  const cursor = normalizeCursor(input.cursor, objectRef, "Recovery Pack input.cursor");
  if (!stableEqual(cursor, capsule.cursor)) {
    throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Recovery Pack cursor differs from its Capsule cursor");
  }
  return {
    object_ref: objectRef,
    capsule,
    continuation,
    record_refs: recordRefs,
    receipt_refs: receiptRefs,
    evidence_refs: evidenceRefs,
    worktree_summary: worktreeSummary,
    cursor,
  };
}

async function inspectRecoveryPack(root, packRefInput) {
  let packRef;
  try {
    packRef = normalizePackRef(packRefInput);
  } catch (error) {
    return {
      pack_ref: fallbackPackRef(packRefInput),
      pack: null,
      errors: [sanitizePackError(error)],
    };
  }
  const errors = [];
  let pack = null;
  try {
    const [packSource, sealSource] = await Promise.all([
      readPackYaml(root, packFilePath(packRef), "Pack"),
      readPackYaml(root, sealFilePath(packRef), "seal"),
    ]);
    pack = normalizePersistedPack(packSource, packRef);
    normalizePersistedSeal(sealSource, packRef, pack.sealed_at);
    await validatePackReferences(root, pack);
  } catch (error) {
    errors.push(sanitizePackError(error));
  }
  return {
    pack_ref: packRef,
    pack,
    errors: [...new Map(errors.map((error) => [error.code, error])).values()]
      .sort((left, right) => left.code.localeCompare(right.code)),
  };
}

function normalizePersistedPack(value, expectedRef) {
  assertPlainObject(value, "Recovery Pack");
  assertExactKeys(value, PACK_KEYS, "Recovery Pack");
  assertSecretSafe(value, "Recovery Pack", { allowSecretRefs: true });
  if (value.schema_version !== RECOVERY_SCHEMA_VERSION || value.authority_role !== "recovery_projection") {
    throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack schema or authority role is invalid");
  }
  const objectRef = normalizeRecoveryObjectRef(value.object_ref, "Recovery Pack.object_ref");
  if (!stableEqual(objectRef, expectedRef.object_ref)) {
    throw authorityError("ERR_RECOVERY_PACK_PATH_MISMATCH", "Recovery Pack object reference does not match its path");
  }
  const normalized = {
    schema_version: RECOVERY_SCHEMA_VERSION,
    authority_role: "recovery_projection",
    object_ref: objectRef,
    sealed_at: normalizeTimestamp(value.sealed_at, "Recovery Pack.sealed_at"),
    trigger: value.trigger,
    capsule: normalizePersistedCapsule(value.capsule, objectRef),
    continuation: normalizeContinuationDocument(value.continuation, objectRef),
    record_refs: normalizeRecordRefs(value.record_refs),
    receipt_refs: normalizeReceiptRefs(value.receipt_refs),
    evidence_refs: normalizeEvidenceRefs(value.evidence_refs),
    worktree_summary: normalizeWorktreeSummary(value.worktree_summary),
    cursor: normalizeCursor(value.cursor, objectRef, "Recovery Pack.cursor"),
  };
  if (value.trigger !== "pre_compact") {
    throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack trigger is invalid");
  }
  if (!stableEqual(normalized.cursor, normalized.capsule.cursor)) {
    throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack cursor differs from its Capsule cursor");
  }
  if (value.previous_pack_ref !== undefined) {
    normalized.previous_pack_ref = normalizePackRef(value.previous_pack_ref);
    if (!stableEqual(normalized.previous_pack_ref.object_ref, objectRef)) {
      throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack previous reference belongs to another object");
    }
    if (normalized.previous_pack_ref.id === expectedRef.id) {
      throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack cannot reference itself as previous");
    }
  }
  if (canonicalHash(normalized) !== expectedRef.id) {
    throw authorityError("ERR_RECOVERY_PACK_PATH_MISMATCH", "Recovery Pack content digest does not match its path");
  }
  return normalized;
}

function normalizePersistedSeal(value, packRef, sealedAt) {
  assertPlainObject(value, "Recovery Pack seal");
  assertExactKeys(value, ["schema_version", "pack_id", "pack_digest", "status", "sealed_at"], "Recovery Pack seal");
  if (
    value.schema_version !== RECOVERY_SCHEMA_VERSION
    || value.pack_id !== packRef.id
    || normalizeDigest(value.pack_digest, "Recovery Pack seal.pack_digest") !== `sha256:${packRef.id}`
    || value.status !== "sealed"
    || normalizeTimestamp(value.sealed_at, "Recovery Pack seal.sealed_at") !== sealedAt
  ) {
    throw authorityError("ERR_RECOVERY_PACK_SEAL_INVALID", "Recovery Pack seal does not match its Pack");
  }
}

async function validatePackReferences(root, pack) {
  await resolveRecordRefs(root, mergeRefsById(pack.record_refs, pack.capsule.sources.records));
  await resolveReceiptRefs(root, mergeRefsById(pack.receipt_refs, pack.capsule.sources.receipts));
  await resolveEvidenceRefs(root, pack.evidence_refs);
}

async function resolveRecordRefs(root, value) {
  const refs = normalizeRecordRefs(value);
  for (const ref of refs) {
    const authority = await readRecord(root, ref.id);
    if (authority.attributes.semantic_hash !== ref.semantic_hash) {
      throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Recovery Pack Record reference has drifted");
    }
  }
  return refs;
}

function normalizeRecordRefs(value) {
  if (!Array.isArray(value)) throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack record_refs must be an array");
  const refs = value.map((entry, index) => {
    const field = `Recovery Pack record_refs[${index}]`;
    assertPlainObject(entry, field);
    assertExactKeys(entry, ["type", "id", "semantic_hash"], field);
    if (entry.type !== "record") throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack Record ref type is invalid");
    return {
      type: "record",
      id: normalizeSafeIdentifier(entry.id, `${field}.id`),
      semantic_hash: normalizeSha256(entry.semantic_hash, `${field}.semantic_hash`),
    };
  }).sort((left, right) => left.id.localeCompare(right.id));
  assertUnique(refs.map((entry) => entry.id), "Recovery Pack Record refs");
  return refs;
}

async function resolveReceiptRefs(root, value) {
  const refs = normalizeReceiptRefs(value);
  for (const ref of refs) {
    const authority = await readReceipt(root, ref.id);
    if (
      authority.state !== ref.state
      || authority.scope_hash !== ref.scope_hash
      || authority.plan_hash !== ref.plan_hash
    ) {
      throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Recovery Pack Receipt reference has drifted");
    }
  }
  return refs;
}

function normalizeReceiptRefs(value) {
  if (!Array.isArray(value)) throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack receipt_refs must be an array");
  const refs = value.map((entry, index) => {
    const field = `Recovery Pack receipt_refs[${index}]`;
    assertPlainObject(entry, field);
    assertExactKeys(entry, ["type", "id", "state", "scope_hash", "plan_hash"], field);
    if (entry.type !== "receipt") throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack Receipt ref type is invalid");
    return {
      type: "receipt",
      id: normalizeSafeIdentifier(entry.id, `${field}.id`),
      state: normalizeSafeIdentifier(entry.state, `${field}.state`),
      scope_hash: normalizeSha256(entry.scope_hash, `${field}.scope_hash`),
      plan_hash: normalizeSha256(entry.plan_hash, `${field}.plan_hash`),
    };
  }).sort((left, right) => left.id.localeCompare(right.id));
  assertUnique(refs.map((entry) => entry.id), "Recovery Pack Receipt refs");
  return refs;
}

async function resolveEvidenceRefs(root, value) {
  const refs = normalizeEvidenceRefs(value);
  for (const ref of refs) {
    const file = await readContainedFile(root, ref.path, "Recovery Pack evidence path");
    if (`sha256:${canonicalByteHash(file.content)}` !== ref.digest) {
      throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Recovery Pack evidence reference has drifted");
    }
  }
  return refs;
}

function normalizeEvidenceRefs(value) {
  if (!Array.isArray(value)) throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack evidence_refs must be an array");
  const refs = value.map((entry, index) => {
    const field = `Recovery Pack evidence_refs[${index}]`;
    assertPlainObject(entry, field);
    assertExactKeys(entry, ["type", "path", "digest"], field);
    if (entry.type !== "file") throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack evidence ref type is invalid");
    const path = normalizeSafeRepoPath(entry.path, `${field}.path`);
    if (path.startsWith(`${PACKS_ROOT}/`)) {
      throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", "Recovery Pack cannot cite Pack storage as evidence");
    }
    return { type: "file", path, digest: normalizeDigest(entry.digest, `${field}.digest`) };
  }).sort((left, right) => left.path.localeCompare(right.path));
  assertUnique(refs.map((entry) => entry.path), "Recovery Pack evidence refs");
  return refs;
}

function normalizeContinuationDocument(value, objectRef) {
  assertPlainObject(value, "Recovery Pack.continuation");
  assertSecretSafe(value, "Recovery Pack.continuation", { allowSecretRefs: true });
  if (value.schema_version !== RECOVERY_SCHEMA_VERSION) {
    throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack continuation schema is invalid");
  }
  const normalizedRef = normalizeRecoveryObjectRef(value.object_ref, "Recovery Pack.continuation.object_ref");
  if (!stableEqual(normalizedRef, objectRef)) {
    throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack continuation belongs to another object");
  }
  if (typeof value.next_action !== "string" || !value.next_action.trim()) {
    throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack continuation next_action must be non-empty");
  }
  const lifecycleFields = findOwnedFields(value, new Set([
    "acceptance",
    "acceptance_state",
    "lifecycle",
    "lifecycle_state",
    "phase",
    "progress",
    "state",
    "status",
  ]));
  const receiptFields = findOwnedFields(value, new Set([
    "consumed_at",
    "invalidated_at",
    "receipt",
    "receipt_state",
    "receipts",
    "reserved_at",
    "reserved_by",
    "revoked_at",
  ]));
  if (lifecycleFields.length || receiptFields.length) {
    throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack continuation contains fields owned by another authority");
  }
  const normalized = normalizeCanonicalValue(value, "Recovery Pack.continuation");
  return {
    ...normalized,
    schema_version: RECOVERY_SCHEMA_VERSION,
    object_ref: normalizedRef,
    next_action: value.next_action.trim(),
  };
}

function findOwnedFields(value, forbidden, prefix = "") {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => findOwnedFields(entry, forbidden, `${prefix}[${index}]`));
  }
  const matches = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (forbidden.has(key)) matches.push(path);
    matches.push(...findOwnedFields(nested, forbidden, path));
  }
  return matches;
}

function normalizeWorktreeSummary(value) {
  assertPlainObject(value, "Recovery Pack worktree_summary");
  assertExactKeys(value, ["head", "dirty_paths", "diff_summary", "diff_digest"], "Recovery Pack worktree_summary");
  if (
    typeof value.head !== "string"
    || value.head !== value.head.trim()
    || !value.head
    || value.head.length > 256
    || /[\0\r\n\\]/.test(value.head)
    || value.head.startsWith("/")
    || /^[A-Za-z]:[\\/]/.test(value.head)
    || /^~(?:[\\/]|$)/.test(value.head)
    || /^file(?:\+[^:]+)?:/i.test(value.head)
  ) {
    throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack worktree head must be a concise reference");
  }
  if (!Array.isArray(value.dirty_paths)) throw authorityError("ERR_RECOVERY_PACK_INVALID", "Recovery Pack dirty_paths must be an array");
  const dirtyPaths = value.dirty_paths.map((entry, index) => normalizeSafeRepoPath(entry, `Recovery Pack dirty_paths[${index}]`)).sort();
  assertUnique(dirtyPaths, "Recovery Pack dirty paths");
  assertPlainObject(value.diff_summary, "Recovery Pack diff_summary");
  assertExactKeys(value.diff_summary, ["files_changed", "insertions", "deletions"], "Recovery Pack diff_summary");
  const diffSummary = {
    files_changed: normalizeNonNegativeInteger(value.diff_summary.files_changed, "Recovery Pack diff_summary.files_changed"),
    insertions: normalizeNonNegativeInteger(value.diff_summary.insertions, "Recovery Pack diff_summary.insertions"),
    deletions: normalizeNonNegativeInteger(value.diff_summary.deletions, "Recovery Pack diff_summary.deletions"),
  };
  return {
    head: value.head,
    dirty_paths: dirtyPaths,
    diff_summary: diffSummary,
    diff_digest: normalizeDigest(value.diff_digest, "Recovery Pack diff_digest"),
  };
}

function normalizePackRef(value) {
  assertPlainObject(value, "Recovery Pack ref");
  assertExactKeys(value, ["object_ref", "id"], "Recovery Pack ref");
  return {
    object_ref: normalizeRecoveryObjectRef(value.object_ref, "Recovery Pack ref.object_ref"),
    id: normalizeSha256(value.id, "Recovery Pack ref.id"),
  };
}

function fallbackPackRef(value) {
  const objectRef = value?.object_ref && typeof value.object_ref === "object"
    ? { kind: String(value.object_ref.kind ?? "invalid"), id: String(value.object_ref.id ?? "invalid") }
    : { kind: "invalid", id: "invalid" };
  return { object_ref: objectRef, id: typeof value?.id === "string" ? value.id : "invalid" };
}

async function discoverPackRefs(root, objectRef) {
  const directory = `${PACKS_ROOT}/${objectRef.kind}/${objectRef.id}`;
  const guarded = await assertWorkspacePathAllowed(resolve(root || "."), directory, { allowRoot: true });
  let entries;
  try {
    entries = await readdir(guarded.path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return [];
    throw error;
  }
  const refs = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", "Recovery Pack storage must not contain symbolic links");
    if (!entry.isDirectory() || !/^[a-f0-9]{64}$/.test(entry.name)) continue;
    refs.push({ object_ref: objectRef, id: entry.name });
  }
  return refs.sort((left, right) => left.id.localeCompare(right.id));
}

async function readPackYaml(root, path, label) {
  const guarded = await assertWorkspacePathAllowed(resolve(root || "."), path);
  let stats;
  try {
    stats = await lstat(guarded.path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw authorityError("ERR_RECOVERY_PACK_NOT_FOUND", `Recovery ${label} file is missing`);
    }
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", `Recovery ${label} path is invalid`);
  let parsed;
  try {
    parsed = parseYaml(await readFile(guarded.path, "utf8"));
  } catch {
    throw authorityError("ERR_RECOVERY_PACK_CORRUPT", `Recovery ${label} is unreadable or malformed`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw authorityError("ERR_RECOVERY_PACK_CORRUPT", `Recovery ${label} must decode to a mapping`);
  }
  const prototype = Object.getPrototypeOf(parsed);
  if (prototype !== Object.prototype && prototype !== null) {
    throw authorityError("ERR_RECOVERY_PACK_CORRUPT", `Recovery ${label} decoded to an unsupported mapping`);
  }
  return parsed;
}

function packDirectoryPath(packRef) {
  return `${PACKS_ROOT}/${packRef.object_ref.kind}/${packRef.object_ref.id}/${packRef.id}`;
}

function packFilePath(packRef) {
  return `${packDirectoryPath(packRef)}/pack.yaml`;
}

function sealFilePath(packRef) {
  return `${packDirectoryPath(packRef)}/seal.yaml`;
}

function projectRestoreEvent(event) {
  return {
    event_id: event.event_id,
    type: event.type,
    summary: event.summary,
    ...(event.rationale_summary === undefined ? {} : { rationale_summary: event.rationale_summary }),
    occurred_at: event.occurred_at,
    writer: event.writer,
    sequence: event.sequence,
  };
}

function fitRestorePlanToBudget(plan, budget) {
  const removableContextArrays = ["recent_events", "workers", "non_goals", "scope"];
  let truncated = false;
  while (serializedBytes(plan) > budget && plan.journal_delta.length) {
    plan.journal_delta.shift();
    truncated = true;
  }
  for (const key of removableContextArrays) {
    while (serializedBytes(plan) > budget && Array.isArray(plan.context[key]) && plan.context[key].length) {
      plan.context[key].shift();
      truncated = true;
    }
  }
  if (serializedBytes(plan) > budget && plan.context.recent_verification !== null) {
    plan.context.recent_verification = null;
    truncated = true;
  }
  if (serializedBytes(plan) > budget && plan.context.current_goal !== null) {
    plan.context.current_goal = null;
    truncated = true;
  }
  while (serializedBytes(plan) > budget && plan.rejected_packs.length) {
    plan.rejected_packs.pop();
    truncated = true;
  }
  plan.budget.truncated = truncated;
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const bytes = serializedBytes(plan);
    if (plan.budget.used_bytes === bytes) break;
    plan.budget.used_bytes = bytes;
  }
  if (serializedBytes(plan) > budget) {
    throw authorityError("ERR_RECOVERY_BUDGET_TOO_SMALL", "Recovery budget cannot contain the authoritative next action and Pack references");
  }
}

function serializedBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function orderValidPacks(entries) {
  const byId = new Map(entries.map((entry) => [entry.pack_ref.id, entry]));
  return [...entries].sort((left, right) => {
    const leftInstant = Date.parse(left.pack.sealed_at);
    const rightInstant = Date.parse(right.pack.sealed_at);
    if (leftInstant !== rightInstant) return rightInstant > leftInstant ? 1 : -1;
    if (isPackDescendant(left, right, byId)) return -1;
    if (isPackDescendant(right, left, byId)) return 1;
    return 0;
  });
}

function isPackDescendant(candidate, ancestor, byId) {
  const visited = new Set();
  let current = candidate;
  while (current?.pack.previous_pack_ref) {
    const previousId = current.pack.previous_pack_ref.id;
    if (previousId === ancestor.pack_ref.id) return true;
    if (visited.has(previousId)) return false;
    visited.add(previousId);
    current = byId.get(previousId);
  }
  return false;
}

function canonicalByteHash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function normalizeBudget(value) {
  if (!Number.isSafeInteger(value) || value <= 0) throw authorityError("ERR_RECOVERY_BUDGET_INVALID", "budget_bytes must be a positive safe integer");
  return value;
}

function normalizeRetentionRequest(value) {
  assertPlainObject(value, "Recovery retention request");
  assertExactKeys(value, [
    "object_ref",
    "keep_valid_packs",
    "keep_recent_segments",
    "keep_referenced_blobs",
  ], "Recovery retention request");
  if (value.keep_referenced_blobs !== undefined && typeof value.keep_referenced_blobs !== "boolean") {
    throw authorityError("ERR_RECOVERY_RETENTION_INVALID", "keep_referenced_blobs must be boolean");
  }
  return {
    keep_valid_packs: value.keep_valid_packs === undefined
      ? 3
      : normalizeNonNegativeInteger(value.keep_valid_packs, "keep_valid_packs"),
    keep_recent_segments: value.keep_recent_segments === undefined
      ? 0
      : normalizeNonNegativeInteger(value.keep_recent_segments, "keep_recent_segments"),
    keep_referenced_blobs: value.keep_referenced_blobs ?? true,
  };
}

function normalizeRetentionPlan(value) {
  assertPlainObject(value, "Recovery retention plan");
  assertExactKeys(value, [
    "schema_version",
    "object_ref",
    "request",
    "inventory",
    "delete_paths",
    "retained_pack_refs",
    "plan_hash",
  ], "Recovery retention plan");
  if (value.schema_version !== RECOVERY_SCHEMA_VERSION) {
    throw authorityError("ERR_RECOVERY_RETENTION_INVALID", "Recovery retention plan schema is invalid");
  }
  const objectRef = normalizeRecoveryObjectRef(value.object_ref, "Recovery retention plan.object_ref");
  const request = normalizeRetentionRequest(value.request);
  if (!Array.isArray(value.inventory) || !Array.isArray(value.delete_paths) || !Array.isArray(value.retained_pack_refs)) {
    throw authorityError("ERR_RECOVERY_RETENTION_INVALID", "Recovery retention plan collections must be arrays");
  }
  const inventory = value.inventory.map((entry, index) => normalizeRetentionInventoryEntry(entry, objectRef, index));
  assertUnique(inventory.map((entry) => entry.pack_ref.id), "Recovery retention inventory");
  const expectedPrefix = `${PACKS_ROOT}/${objectRef.kind}/${objectRef.id}/`;
  const deletePaths = value.delete_paths.map((path, index) => {
    const normalized = normalizeSafeRepoPath(path, `Recovery retention delete_paths[${index}]`);
    if (!normalized.startsWith(expectedPrefix) || !/^[a-f0-9]{64}$/.test(normalized.slice(expectedPrefix.length))) {
      throw authorityError("ERR_RECOVERY_RETENTION_INVALID", "Recovery retention may delete only exact contained Pack directories");
    }
    return normalized;
  });
  assertUnique(deletePaths, "Recovery retention delete paths");
  const retained = value.retained_pack_refs.map((entry) => {
    const packRef = normalizePackRef(entry);
    if (!stableEqual(packRef.object_ref, objectRef)) {
      throw authorityError("ERR_RECOVERY_RETENTION_INVALID", "Recovery retention retained Pack belongs to another object");
    }
    return packRef;
  });
  assertUnique(retained.map((entry) => entry.id), "Recovery retention retained refs");
  const durable = {
    schema_version: RECOVERY_SCHEMA_VERSION,
    object_ref: objectRef,
    request,
    inventory,
    delete_paths: deletePaths,
    retained_pack_refs: retained,
  };
  const planHash = normalizeSha256(value.plan_hash, "Recovery retention plan.plan_hash");
  if (planHash !== canonicalHash(durable)) {
    throw authorityError("ERR_RECOVERY_RETENTION_BINDING", "Recovery retention plan hash does not match its bound contents");
  }
  return { ...durable, plan_hash: planHash };
}

function normalizeRetentionInventoryEntry(value, objectRef, index) {
  const field = `Recovery retention inventory[${index}]`;
  assertPlainObject(value, field);
  assertExactKeys(value, ["pack_ref", "content_digest", "valid", "errors"], field);
  const packRef = normalizePackRef(value.pack_ref);
  if (!stableEqual(packRef.object_ref, objectRef)) {
    throw authorityError("ERR_RECOVERY_RETENTION_INVALID", "Recovery retention inventory Pack belongs to another object");
  }
  if (typeof value.valid !== "boolean" || !Array.isArray(value.errors)) {
    throw authorityError("ERR_RECOVERY_RETENTION_INVALID", "Recovery retention inventory validity is malformed");
  }
  const errors = value.errors.map((entry, errorIndex) => {
    const errorField = `${field}.errors[${errorIndex}]`;
    assertPlainObject(entry, errorField);
    assertExactKeys(entry, ["code"], errorField);
    if (typeof entry.code !== "string" || !/^ERR_[A-Z0-9_]+$/.test(entry.code)) {
      throw authorityError("ERR_RECOVERY_RETENTION_INVALID", "Recovery retention inventory error code is invalid");
    }
    return { code: entry.code };
  });
  if (value.valid !== (errors.length === 0)) {
    throw authorityError("ERR_RECOVERY_RETENTION_INVALID", "Recovery retention inventory validity conflicts with its errors");
  }
  return {
    pack_ref: packRef,
    content_digest: normalizeDigest(value.content_digest, `${field}.content_digest`),
    valid: value.valid,
    errors,
  };
}

async function digestPackDirectory(root, packRef) {
  const guarded = await assertWorkspacePathAllowed(resolve(root || "."), packDirectoryPath(packRef));
  const entries = [];
  await collectDirectoryDigestEntries(guarded.path, "", entries);
  return `sha256:${canonicalHash(entries)}`;
}

async function collectDirectoryDigestEntries(directory, prefix, output) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const path = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) {
      throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", "Recovery Pack inventory must not contain symbolic links");
    }
    if (entry.isDirectory()) {
      output.push({ path: relativePath, type: "directory" });
      await collectDirectoryDigestEntries(path, relativePath, output);
      continue;
    }
    if (!entry.isFile()) {
      throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", "Recovery Pack inventory contains a non-regular entry");
    }
    const content = await readFile(path);
    output.push({
      path: relativePath,
      type: "file",
      bytes: content.length,
      digest: `sha256:${canonicalByteHash(content)}`,
    });
  }
}

function normalizeNonNegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) throw authorityError("ERR_RECOVERY_PACK_INVALID", `${field} must be a non-negative safe integer`);
  return value;
}

function assertUnique(values, field) {
  if (new Set(values).size !== values.length) throw authorityError("ERR_RECOVERY_PACK_INVALID", `${field} must be unique`);
}

function sanitizePackError(error) {
  return { code: sanitizeErrorCode(error) };
}

function mergeRefsById(left, right) {
  const merged = new Map();
  for (const ref of [...left, ...right]) {
    const existing = merged.get(ref.id);
    if (existing && !stableEqual(existing, ref)) {
      throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Recovery Pack contains conflicting references to one authority object");
    }
    merged.set(ref.id, ref);
  }
  return [...merged.values()];
}

function renderYaml(value) {
  return `${stringifyYaml(value).trimEnd()}\n`;
}
