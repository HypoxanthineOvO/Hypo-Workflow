import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readReceipt } from "../receipts/index.js";
import { readRecord } from "../records/index.js";
import { normalizePersistedRecord, recordScopeDirectory } from "../records/schema.js";
import { readRuntimeObject } from "../runtime/index.js";
import { canonicalHash, parseYaml, stringifyYaml } from "../serialization/index.js";
import { assertWorkspacePathAllowed, commitWorkspaceTransaction } from "../workspace-store/index.js";
import {
  assertExactKeys,
  assertPlainObject,
  authorityError,
  normalizeCanonicalValue,
  normalizeSha256,
  normalizeTransactionOptions,
  readCurrentManifest,
} from "../runtime/internal.js";
import {
  replayRecoveryJournalDeltaInternal,
  replayRecoveryJournalInternal,
} from "./journal.js";
import {
  RECOVERY_SCHEMA_VERSION,
  assertSecretSafe,
  emptyCursor,
  normalizeCursor,
  normalizeRecoveryObjectRef,
  normalizeWriter,
  stableEqual,
} from "./shared.js";

const CAPSULE_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "object_ref",
  "cursor",
  "sources",
  "context",
  "semantic_hash",
]);

export function compileInitialContextCapsule(input) {
  assertPlainObject(input, "Initial Context Capsule input");
  assertExactKeys(input, ["object_ref", "records", "continuation"], "Initial Context Capsule input");
  assertSecretSafe(input, "Initial Context Capsule input", { allowSecretRefs: true });
  const objectRef = normalizeRecoveryObjectRef(input.object_ref);
  if (!Array.isArray(input.records) || input.records.length === 0) {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Initial Context Capsule records must be non-empty");
  }
  const recordRefs = input.records.map((record, index) => {
    const field = `Initial Context Capsule records[${index}]`;
    assertPlainObject(record, field);
    assertExactKeys(record, ["path", "attributes", "body"], field);
    const normalized = normalizePersistedRecord(record.attributes, record.body);
    const expectedPath = `.pipeline/memory/records/${recordScopeDirectory(normalized.attributes.scope)}/${normalized.attributes.kind}/${normalized.attributes.id}.md`;
    if (record.path !== expectedPath) {
      throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Initial Context Capsule Record path does not match its authority shape");
    }
    return {
      type: "record",
      id: normalized.attributes.id,
      semantic_hash: normalized.attributes.semantic_hash,
    };
  }).sort((left, right) => left.id.localeCompare(right.id));
  assertUnique(recordRefs.map((entry) => entry.id), "Initial Context Capsule Record source");

  assertPlainObject(input.continuation, "Initial Context Capsule continuation");
  const continuation = normalizeCanonicalValue(input.continuation, "Initial Context Capsule continuation");
  if (continuation.schema_version !== RECOVERY_SCHEMA_VERSION) {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Initial Context Capsule continuation schema is invalid");
  }
  const continuationRef = normalizeRecoveryObjectRef(
    continuation.object_ref,
    "Initial Context Capsule continuation.object_ref",
  );
  if (!stableEqual(continuationRef, objectRef) || typeof continuation.next_action !== "string" || !continuation.next_action.trim()) {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Initial Context Capsule continuation does not match its object");
  }
  continuation.next_action = continuation.next_action.trim();

  const durable = {
    schema_version: RECOVERY_SCHEMA_VERSION,
    authority_role: "derived",
    object_ref: objectRef,
    cursor: emptyCursor(objectRef),
    sources: {
      records: recordRefs,
      continuation: {
        type: "continuation",
        object_ref: objectRef,
        semantic_hash: canonicalHash(continuation),
      },
      receipts: [],
    },
    context: reduceContext([], continuation, null),
  };
  const capsule = normalizePersistedCapsule(
    { ...durable, semantic_hash: canonicalHash(durable) },
    objectRef,
  );
  return { path: capsulePath(objectRef), capsule };
}

export async function updateContextCapsuleInternal(root, input, options = {}) {
  const normalizedInput = await normalizeCapsuleInput(root, input);
  let previous = null;
  try {
    previous = await readContextCapsuleInternal(root, normalizedInput.object_ref);
  } catch (error) {
    if (error.code !== "ERR_RECOVERY_CAPSULE_NOT_FOUND") throw error;
  }
  const replay = previous
    ? await replayRecoveryJournalDeltaInternal(root, {
      object_ref: normalizedInput.object_ref,
      after_cursor: previous.cursor,
    })
    : await replayRecoveryJournalInternal(root, { object_ref: normalizedInput.object_ref });
  return persistContextCapsule(root, normalizedInput, replay, previous?.context ?? null, options);
}

export async function rebuildContextCapsuleInternal(root, input, options = {}) {
  const normalizedInput = await normalizeCapsuleInput(root, input);
  const replay = await replayRecoveryJournalInternal(root, { object_ref: normalizedInput.object_ref });
  return persistContextCapsule(root, normalizedInput, replay, null, options);
}

async function persistContextCapsule(root, normalizedInput, replay, previousContext, options) {
  const context = reduceContext(replay.events, normalizedInput.continuation, previousContext);
  const durable = {
    schema_version: RECOVERY_SCHEMA_VERSION,
    authority_role: "derived",
    object_ref: normalizedInput.object_ref,
    cursor: replay.cursor,
    sources: normalizedInput.sources,
    context,
  };
  const capsule = normalizePersistedCapsule(
    { ...durable, semantic_hash: canonicalHash(durable) },
    normalizedInput.object_ref,
  );
  const path = capsulePath(normalizedInput.object_ref);
  const transaction = normalizeTransactionOptions(options, "recovery-capsule-write", {
    object_ref: normalizedInput.object_ref,
    semantic_hash: capsule.semantic_hash,
  });
  const manifest = await readCurrentManifest(root);
  await commitWorkspaceTransaction(root, {
    id: transaction.id,
    faultInjector: transaction.faultInjector,
    manifest,
    writes: [{ path, content: renderYaml(capsule) }],
  });
  return { path, capsule };
}

export async function readContextCapsuleInternal(root, objectRefInput) {
  const objectRef = normalizeRecoveryObjectRef(objectRefInput);
  const path = capsulePath(objectRef);
  const workspaceRoot = resolve(root || ".");
  const guarded = await assertWorkspacePathAllowed(workspaceRoot, path);
  let stats;
  try {
    stats = await lstat(guarded.path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw authorityError("ERR_RECOVERY_CAPSULE_NOT_FOUND", "Context Capsule was not found");
    }
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", "Context Capsule path is not a regular file");
  }
  let parsed;
  try {
    parsed = parseYaml(await readFile(guarded.path, "utf8"));
  } catch {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Context Capsule is unreadable or malformed");
  }
  return normalizePersistedCapsule(parsed, objectRef);
}

export function normalizePersistedCapsule(value, expectedObjectRef) {
  assertPlainObject(value, "Context Capsule");
  assertExactKeys(value, CAPSULE_KEYS, "Context Capsule");
  assertSecretSafe(value, "Context Capsule", { allowSecretRefs: true });
  if (value.schema_version !== RECOVERY_SCHEMA_VERSION || value.authority_role !== "derived") {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Context Capsule schema or authority role is invalid");
  }
  const objectRef = normalizeRecoveryObjectRef(value.object_ref, "Context Capsule.object_ref");
  if (expectedObjectRef && !stableEqual(objectRef, normalizeRecoveryObjectRef(expectedObjectRef))) {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Context Capsule object reference does not match its path");
  }
  const cursor = normalizeCursor(value.cursor, objectRef, "Context Capsule.cursor");
  const sources = normalizePersistedSourceRefs(value.sources, objectRef);
  const context = normalizeCapsuleContext(value.context);
  const durable = {
    schema_version: RECOVERY_SCHEMA_VERSION,
    authority_role: "derived",
    object_ref: objectRef,
    cursor,
    sources,
    context,
  };
  const semanticHash = normalizeSha256(value.semantic_hash, "Context Capsule.semantic_hash");
  if (semanticHash !== canonicalHash(durable)) {
    throw authorityError("ERR_RECOVERY_CAPSULE_INTEGRITY", "Context Capsule semantic hash does not match its projection");
  }
  return { ...durable, semantic_hash: semanticHash };
}

function capsulePath(objectRef) {
  return `.pipeline/memory/capsules/${objectRef.kind}/${objectRef.id}.yaml`;
}

async function normalizeCapsuleInput(root, input) {
  assertPlainObject(input, "Context Capsule input");
  assertExactKeys(input, ["object_ref", "sources"], "Context Capsule input");
  assertSecretSafe(input, "Context Capsule input", { allowSecretRefs: true });
  const objectRef = normalizeRecoveryObjectRef(input.object_ref);
  assertPlainObject(input.sources, "Context Capsule sources");
  assertExactKeys(input.sources, ["records", "continuation", "receipts"], "Context Capsule sources");
  if (!Array.isArray(input.sources.records) || !Array.isArray(input.sources.receipts)) {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Context Capsule Record and Receipt sources must be arrays");
  }
  const records = [];
  for (const [index, record] of input.sources.records.entries()) {
    records.push(await normalizeRecordSource(root, record, index));
  }
  const continuation = await normalizeContinuationSource(root, objectRef, input.sources.continuation);
  const receipts = [];
  for (const [index, receipt] of input.sources.receipts.entries()) {
    receipts.push(await normalizeReceiptSource(root, receipt, index));
  }
  return {
    object_ref: objectRef,
    continuation: continuation.document,
    sources: {
      records: records.sort((left, right) => left.id.localeCompare(right.id)),
      continuation: continuation.ref,
      receipts: receipts.sort((left, right) => left.id.localeCompare(right.id)),
    },
  };
}

async function normalizeRecordSource(root, record, index) {
  const field = `Context Capsule sources.records[${index}]`;
  assertPlainObject(record, field);
  assertExactKeys(record, ["path", "attributes", "body"], field);
  const normalized = normalizePersistedRecord(record.attributes, record.body);
  const expectedPath = `.pipeline/memory/records/${recordScopeDirectory(normalized.attributes.scope)}/${normalized.attributes.kind}/${normalized.attributes.id}.md`;
  if (record.path !== expectedPath) {
    throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Context Capsule Record source path does not match its authority shape");
  }
  const authority = await readRecord(root, normalized.attributes.id);
  if (!stableEqual(authority, { path: record.path, attributes: normalized.attributes, body: normalized.body })) {
    throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Context Capsule Record source differs from Record authority");
  }
  return { type: "record", id: normalized.attributes.id, semantic_hash: normalized.attributes.semantic_hash };
}

async function normalizeContinuationSource(root, objectRef, value) {
  assertPlainObject(value, "Context Capsule sources.continuation");
  const supplied = Object.hasOwn(value, "continuation") ? value.continuation : value;
  const authority = await readRuntimeObject(root, objectRef);
  if (!stableEqual(supplied, authority.continuation)) {
    throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Context Capsule continuation source differs from Runtime authority");
  }
  return {
    document: authority.continuation,
    ref: {
      type: "continuation",
      object_ref: objectRef,
      semantic_hash: canonicalHash(authority.continuation),
    },
  };
}

async function normalizeReceiptSource(root, value, index) {
  const field = `Context Capsule sources.receipts[${index}]`;
  assertPlainObject(value, field);
  const id = value.receipt_id;
  const authority = await readReceipt(root, id);
  if (!stableEqual(value, authority)) {
    throw authorityError("ERR_RECOVERY_REFERENCE_DRIFT", "Context Capsule Receipt source differs from Receipt authority");
  }
  return {
    type: "receipt",
    id: authority.receipt_id,
    state: authority.state,
    scope_hash: authority.scope_hash,
    plan_hash: authority.plan_hash,
  };
}

function normalizePersistedSourceRefs(value, objectRef) {
  assertPlainObject(value, "Context Capsule.sources");
  assertExactKeys(value, ["records", "continuation", "receipts"], "Context Capsule.sources");
  if (!Array.isArray(value.records) || !Array.isArray(value.receipts)) {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Context Capsule source references must use arrays");
  }
  const records = value.records.map((entry, index) => {
    const field = `Context Capsule.sources.records[${index}]`;
    assertPlainObject(entry, field);
    assertExactKeys(entry, ["type", "id", "semantic_hash"], field);
    if (entry.type !== "record") throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Capsule Record source type is invalid");
    return {
      type: "record",
      id: normalizeSourceId(entry.id, `${field}.id`),
      semantic_hash: normalizeSha256(entry.semantic_hash, `${field}.semantic_hash`),
    };
  }).sort((left, right) => left.id.localeCompare(right.id));
  assertUnique(records.map((entry) => entry.id), "Context Capsule Record source");
  const continuation = value.continuation;
  assertPlainObject(continuation, "Context Capsule.sources.continuation");
  assertExactKeys(continuation, ["type", "object_ref", "semantic_hash"], "Context Capsule.sources.continuation");
  if (continuation.type !== "continuation") throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Capsule continuation source type is invalid");
  const continuationRef = {
    type: "continuation",
    object_ref: normalizeRecoveryObjectRef(continuation.object_ref),
    semantic_hash: normalizeSha256(continuation.semantic_hash, "Context Capsule.sources.continuation.semantic_hash"),
  };
  if (!stableEqual(continuationRef.object_ref, objectRef)) {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Capsule continuation source belongs to a different object");
  }
  const receipts = value.receipts.map((entry, index) => {
    const field = `Context Capsule.sources.receipts[${index}]`;
    assertPlainObject(entry, field);
    assertExactKeys(entry, ["type", "id", "state", "scope_hash", "plan_hash"], field);
    if (entry.type !== "receipt") throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Capsule Receipt source type is invalid");
    return {
      type: "receipt",
      id: normalizeSourceId(entry.id, `${field}.id`),
      state: normalizeSourceId(entry.state, `${field}.state`),
      scope_hash: normalizeSha256(entry.scope_hash, `${field}.scope_hash`),
      plan_hash: normalizeSha256(entry.plan_hash, `${field}.plan_hash`),
    };
  }).sort((left, right) => left.id.localeCompare(right.id));
  assertUnique(receipts.map((entry) => entry.id), "Context Capsule Receipt source");
  return { records, continuation: continuationRef, receipts };
}

function reduceContext(events, continuation, previousContext = null) {
  const previous = previousContext === null ? null : normalizeCapsuleContext(previousContext);
  let currentGoal = previous?.current_goal ?? null;
  let scope = previous?.scope ?? [];
  let nonGoals = previous?.non_goals ?? [];
  let recentVerification = previous?.recent_verification ?? null;
  const workers = new Map((previous?.workers ?? []).map((worker) => [`${worker.writer.kind}:${worker.writer.id}`, worker]));
  const eventSummaries = [...(previous?.recent_events ?? [])];
  for (const event of events) {
    const payload = event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
      ? event.payload
      : {};
    if (typeof payload.current_goal === "string" && payload.current_goal.trim()) currentGoal = payload.current_goal;
    else if (typeof payload.goal === "string" && payload.goal.trim()) currentGoal = payload.goal;
    if (Object.hasOwn(payload, "scope")) scope = normalizeContextList(payload.scope, "Recovery event payload.scope");
    if (Object.hasOwn(payload, "non_goals")) nonGoals = normalizeContextList(payload.non_goals, "Recovery event payload.non_goals");
    const summary = eventMetadata(event);
    eventSummaries.push(summary);
    if (event.type === "verification.completed") {
      recentVerification = {
        ...summary,
        status: normalizeProjectionText(payload.status ?? payload.result ?? "unknown", "verification status"),
        evidence_refs: normalizeProjectionRefs(payload.evidence_refs),
      };
    }
    if (event.type === "worker.started" || event.type === "worker.stopped") {
      const writer = normalizeWorkerProjection(payload.writer ?? payload.worker ?? event.writer);
      workers.set(`${writer.kind}:${writer.id}`, {
        writer,
        role: normalizeProjectionText(payload.role ?? "worker", "worker role"),
        status: event.type === "worker.started" ? "started" : "stopped",
        evidence_refs: normalizeProjectionRefs(payload.evidence_refs),
      });
    }
  }
  return {
    current_goal: currentGoal,
    scope,
    non_goals: nonGoals,
    next_action: continuation.next_action,
    recent_verification: recentVerification,
    workers: [...workers.values()].sort((left, right) => `${left.writer.kind}:${left.writer.id}`.localeCompare(`${right.writer.kind}:${right.writer.id}`)),
    recent_events: eventSummaries.slice(-80),
  };
}

function normalizeCapsuleContext(value) {
  assertPlainObject(value, "Context Capsule.context");
  assertExactKeys(value, [
    "current_goal",
    "scope",
    "non_goals",
    "next_action",
    "recent_verification",
    "workers",
    "recent_events",
  ], "Context Capsule.context");
  const nextAction = typeof value.next_action === "string" ? value.next_action.trim() : "";
  if (!nextAction) throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Context Capsule next_action must be non-empty");
  const currentGoal = value.current_goal === null
    ? null
    : normalizeContextText(value.current_goal, "Context Capsule.context.current_goal");
  return {
    current_goal: currentGoal,
    scope: normalizeContextList(value.scope, "Context Capsule.context.scope"),
    non_goals: normalizeContextList(value.non_goals, "Context Capsule.context.non_goals"),
    next_action: nextAction,
    recent_verification: normalizeVerificationProjection(value.recent_verification),
    workers: normalizeWorkerProjections(value.workers),
    recent_events: normalizeEventSummaries(value.recent_events, "Context Capsule.context.recent_events"),
  };
}

function eventMetadata(event) {
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

function normalizeVerificationProjection(value) {
  if (value === null) return null;
  assertPlainObject(value, "Context Capsule.context.recent_verification");
  assertExactKeys(value, [
    "event_id",
    "type",
    "summary",
    "rationale_summary",
    "occurred_at",
    "writer",
    "sequence",
    "status",
    "evidence_refs",
  ], "Context Capsule.context.recent_verification");
  const metadata = normalizeEventSummary(value, "Context Capsule.context.recent_verification");
  if (metadata.type !== "verification.completed") {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Recent verification must reference verification.completed");
  }
  return {
    ...metadata,
    status: normalizeProjectionText(value.status, "Context Capsule.context.recent_verification.status"),
    evidence_refs: normalizeProjectionRefs(value.evidence_refs),
  };
}

function normalizeWorkerProjections(value) {
  if (!Array.isArray(value)) throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Context Capsule.context.workers must be an array");
  const seen = new Set();
  const workers = value.map((entry, index) => {
    const field = `Context Capsule.context.workers[${index}]`;
    assertPlainObject(entry, field);
    assertExactKeys(entry, ["writer", "role", "status", "evidence_refs"], field);
    const writer = normalizeWorkerProjection(entry.writer);
    const key = `${writer.kind}:${writer.id}`;
    if (seen.has(key)) throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Context Capsule workers must be consolidated by writer");
    seen.add(key);
    if (!new Set(["started", "stopped"]).has(entry.status)) {
      throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Context Capsule worker status must be started or stopped");
    }
    return {
      writer,
      role: normalizeProjectionText(entry.role, `${field}.role`),
      status: entry.status,
      evidence_refs: normalizeProjectionRefs(entry.evidence_refs),
    };
  });
  return workers.sort((left, right) => `${left.writer.kind}:${left.writer.id}`.localeCompare(`${right.writer.kind}:${right.writer.id}`));
}

function normalizeEventSummary(value, field) {
  assertPlainObject(value, field);
  const normalized = normalizeCanonicalValue(value, field);
  if (
    typeof normalized.event_id !== "string"
    || typeof normalized.type !== "string"
    || typeof normalized.summary !== "string"
    || typeof normalized.occurred_at !== "string"
    || !Number.isSafeInteger(normalized.sequence)
  ) {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", `${field} contains invalid event metadata`);
  }
  normalizeWorkerProjection(normalized.writer);
  return normalized;
}

function normalizeWorkerProjection(value) {
  return normalizeWriter(value, "Context Capsule worker writer");
}

function normalizeProjectionRefs(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", "Recovery evidence_refs must be an array");
  return value.map((entry, index) => sanitizeContextValue(entry, `Recovery evidence_refs[${index}]`));
}

function normalizeProjectionText(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 256 || /[\0\r\n]/.test(value)) {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", `${field} must be concise text`);
  }
  return value;
}

function normalizeEventSummaries(value, field) {
  if (!Array.isArray(value)) throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", `${field} must be an array`);
  return value.map((entry, index) => normalizeEventSummary(entry, `${field}[${index}]`));
}

function normalizeContextList(value, field) {
  if (Array.isArray(value)) return value.map((entry, index) => sanitizeContextValue(entry, `${field}[${index}]`));
  if (value === null || value === undefined) return [];
  return [sanitizeContextValue(value, field)];
}

function sanitizeContextValue(value, field) {
  const normalized = normalizeCanonicalValue(value, field);
  if (Array.isArray(normalized)) {
    return normalized.map((entry, index) => sanitizeContextValue(entry, `${field}[${index}]`));
  }
  if (!normalized || typeof normalized !== "object") return normalized;
  const result = {};
  for (const [key, nested] of Object.entries(normalized)) {
    if (/^(?:api[_-]?key|access[_-]?key|authorization|client[_-]?secret|cookie|credential|credentials|password|passwd|private[_-]?key|raw[_-]?secret|secret|session[_-]?token|token)$/i.test(key)) continue;
    result[key] = sanitizeContextValue(nested, `${field}.${key}`);
  }
  return result;
}

function normalizeContextText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", `${field} must be text or null`);
  return value.trim();
}

function normalizeSourceId(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) {
    throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", `${field} must be a safe identifier`);
  }
  return value;
}

function assertUnique(values, field) {
  if (new Set(values).size !== values.length) throw authorityError("ERR_RECOVERY_CAPSULE_INVALID", `${field} references must be unique`);
}

function renderYaml(value) {
  return `${stringifyYaml(value).trimEnd()}\n`;
}
