import { canonicalHash } from "../serialization/index.js";
import {
  AUTHORITY_SCHEMA_VERSION,
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  containsForbiddenReasoning,
  normalizeSafeIdentifier,
  normalizeTimestamp,
} from "../runtime/internal.js";

export const RECORD_KINDS = Object.freeze([
  "requirement",
  "preference",
  "decision",
  "feedback",
]);
export const RECORD_SCOPE_TYPES = Object.freeze([
  "project",
  "delivery",
  "goal",
  "cycle",
  "milestone",
  "activity",
  "bootstrap_job",
  "maintain",
]);

const CONFIDENCE_LEVELS = new Set(["low", "medium", "high", "confirmed"]);
const LOGICAL_REF = /^[A-Za-z0-9][A-Za-z0-9._:/#@+-]*$/;
const PATCH_KEYS = Object.freeze([
  "scope",
  "kind",
  "source_refs",
  "confidence",
  "dedupe_key",
  "created_at",
  "updated_at",
  "supersedes",
  "secret_refs",
  "body",
]);
const PERSISTED_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "id",
  "scope",
  "kind",
  "source_refs",
  "confidence",
  "dedupe_key",
  "created_at",
  "updated_at",
  "supersedes",
  "secret_refs",
  "semantic_hash",
]);

export function normalizeRecordPatch(input) {
  assertPlainObject(input, "record patch");
  if (Object.hasOwn(input, "id") || Object.hasOwn(input, "record_id")) {
    throw authorityError("ERR_RECORD_CALLER_ID_FORBIDDEN", "Record Patch must not contain a caller-supplied id or record_id");
  }
  assertExactKeys(input, PATCH_KEYS, "record patch");
  if (containsForbiddenReasoning(input)) {
    throw authorityError("ERR_HIDDEN_REASONING_FORBIDDEN", "Record Patch must not contain hidden reasoning fields");
  }
  assertNoRawSecrets(input, "record patch", { allowSecretRefs: true });

  const scope = normalizeRecordScope(input.scope);
  if (!RECORD_KINDS.includes(input.kind)) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "record patch.kind is not supported");
  }
  const sourceRefs = normalizeSourceRefs(input.source_refs);
  const confidence = normalizeConfidence(input.confidence);
  const dedupeKey = normalizeLogicalRef(input.dedupe_key, "record patch.dedupe_key");
  const createdAt = normalizeTimestamp(input.created_at, "record patch.created_at");
  const updatedAt = normalizeTimestamp(input.updated_at, "record patch.updated_at");
  if (Date.parse(updatedAt) < Date.parse(createdAt)) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "record patch.updated_at must not be earlier than created_at");
  }
  const body = normalizeRecordBody(input.body);
  const normalized = {
    scope,
    kind: input.kind,
    source_refs: sourceRefs,
    confidence,
    dedupe_key: dedupeKey,
    created_at: createdAt,
    updated_at: updatedAt,
    supersedes: normalizeSupersedes(input.supersedes),
    body,
  };
  if (input.secret_refs !== undefined) {
    normalized.secret_refs = normalizeSecretRefs(input.secret_refs);
  }
  return normalized;
}

export function buildPersistedRecord(stagedPatch) {
  const patch = normalizeRecordPatch(stagedPatch);
  const semanticHash = recordSemanticHash(patch);
  const id = `${patch.kind}-${semanticHash.slice(0, 32)}`;
  const attributes = {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    authority_role: "record",
    id,
    scope: patch.scope,
    kind: patch.kind,
    source_refs: patch.source_refs,
    confidence: patch.confidence,
    dedupe_key: patch.dedupe_key,
    created_at: patch.created_at,
    updated_at: patch.updated_at,
    supersedes: patch.supersedes,
    semantic_hash: semanticHash,
  };
  if (patch.secret_refs !== undefined) attributes.secret_refs = patch.secret_refs;
  return { id, attributes, body: patch.body, semantic_hash: semanticHash };
}

export function normalizePersistedRecord(attributesInput, bodyInput) {
  assertPlainObject(attributesInput, "Record frontmatter");
  assertExactKeys(attributesInput, PERSISTED_KEYS, "Record frontmatter");
  if (attributesInput.schema_version !== AUTHORITY_SCHEMA_VERSION || attributesInput.authority_role !== "record") {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "Record frontmatter schema or authority role is invalid");
  }
  if (!Object.hasOwn(attributesInput, "supersedes")) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "Record frontmatter.supersedes must be an array");
  }
  const patch = normalizeRecordPatch({
    scope: attributesInput.scope,
    kind: attributesInput.kind,
    source_refs: attributesInput.source_refs,
    confidence: attributesInput.confidence,
    dedupe_key: attributesInput.dedupe_key,
    created_at: attributesInput.created_at,
    updated_at: attributesInput.updated_at,
    supersedes: attributesInput.supersedes,
    ...(attributesInput.secret_refs === undefined ? {} : { secret_refs: attributesInput.secret_refs }),
    body: bodyInput,
  });
  const expectedHash = recordSemanticHash(patch);
  const expectedId = `${patch.kind}-${expectedHash.slice(0, 32)}`;
  if (attributesInput.id !== expectedId || attributesInput.semantic_hash !== expectedHash) {
    throw authorityError("ERR_RECORD_INTEGRITY", "Record id or semantic hash does not match its durable content");
  }
  const persisted = buildPersistedRecord(patch);
  return { attributes: persisted.attributes, body: persisted.body };
}

export function recordSemanticHash(patchInput) {
  const patch = normalizeRecordPatch(patchInput);
  const semantic = {
    scope: patch.scope,
    kind: patch.kind,
    source_refs: patch.source_refs,
    confidence: patch.confidence,
    dedupe_key: patch.dedupe_key,
    supersedes: patch.supersedes,
    body: patch.body,
  };
  if (patch.secret_refs !== undefined) semantic.secret_refs = patch.secret_refs;
  return canonicalHash(semantic);
}

export function recordScopeDirectory(scopeInput) {
  const scope = normalizeRecordScope(scopeInput);
  return `${scope.type}-${canonicalHash(scope.ref).slice(0, 12)}`;
}

export function recordMetadata(record) {
  const attributes = record.attributes;
  return {
    id: attributes.id,
    path: record.path,
    scope: attributes.scope,
    kind: attributes.kind,
    source_refs: attributes.source_refs,
    confidence: attributes.confidence,
    dedupe_key: attributes.dedupe_key,
    created_at: attributes.created_at,
    updated_at: attributes.updated_at,
    supersedes: attributes.supersedes,
    semantic_hash: attributes.semantic_hash,
    ...(attributes.secret_refs === undefined ? {} : { secret_refs: attributes.secret_refs }),
  };
}

function normalizeRecordScope(value) {
  assertPlainObject(value, "record patch.scope");
  assertExactKeys(value, ["type", "ref"], "record patch.scope");
  const type = normalizeSafeIdentifier(value.type, "record patch.scope.type");
  if (!RECORD_SCOPE_TYPES.includes(type)) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "record patch.scope.type is not supported");
  }
  return {
    type,
    ref: normalizeRecordRef(value.ref, "record patch.scope.ref"),
  };
}

function normalizeSourceRefs(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "record patch.source_refs must be a non-empty array");
  }
  return value.map((entry, index) => normalizeSourceRef(entry, `record patch.source_refs[${index}]`));
}

function normalizeSourceRef(value, field) {
  assertPlainObject(value, field);
  assertExactKeys(value, ["type", "ref", "locator"], field);
  return {
    type: normalizeSafeIdentifier(value.type, `${field}.type`),
    ref: normalizeRecordRef(value.ref, `${field}.ref`),
    locator: normalizeLocator(value.locator, `${field}.locator`),
  };
}

function normalizeSupersedes(value) {
  const entries = value === undefined ? [] : value;
  if (!Array.isArray(entries)) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "record patch.supersedes must be an array of Record IDs");
  }
  const normalized = entries.map((entry, index) => normalizeSafeIdentifier(entry, `record patch.supersedes[${index}]`));
  if (new Set(normalized).size !== normalized.length) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "record patch.supersedes must not contain duplicate Record IDs");
  }
  return normalized;
}

function normalizeRecordRef(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 1024 || /[\0\r\n]/.test(value)) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", `${field} must be a safe non-empty reference`);
  }
  if (
    value.startsWith("/")
    || /^[A-Za-z]:[\\/]/.test(value)
    || value.includes("\\")
    || value.split("/").some((part) => part === "." || part === "..")
  ) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", `${field} must not be absolute or contain traversal`);
  }
  return value;
}

function normalizeLocator(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 1024 || /[\0\r\n]/.test(value)) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", `${field} must be a safe non-empty locator`);
  }
  return value;
}

function normalizeConfidence(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1) return value;
  if (typeof value === "string" && CONFIDENCE_LEVELS.has(value)) return value;
  throw authorityError("ERR_RECORD_SCHEMA_INVALID", "record patch.confidence must be low, medium, high, confirmed, or a number from 0 to 1");
}

function normalizeLogicalRef(value, field) {
  if (typeof value !== "string" || value !== value.trim() || value.length > 256 || !LOGICAL_REF.test(value)) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", `${field} must be a safe logical reference`);
  }
  if (value.startsWith("/") || value.includes("\\") || value.split("/").some((part) => part === "..")) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", `${field} must not contain traversal`);
  }
  return value;
}

function normalizeSecretRefs(value) {
  if (!Array.isArray(value)) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "record patch.secret_refs must be an array");
  }
  const normalized = value.map((entry, index) => {
    assertPlainObject(entry, `record patch.secret_refs[${index}]`);
    assertExactKeys(entry, ["provider", "ref"], `record patch.secret_refs[${index}]`);
    return {
      provider: normalizeSafeIdentifier(entry.provider, `record patch.secret_refs[${index}].provider`),
      ref: normalizeSafeIdentifier(entry.ref, `record patch.secret_refs[${index}].ref`),
    };
  });
  const unique = new Map(normalized.map((entry) => [`${entry.provider}:${entry.ref}`, entry]));
  return [...unique.values()].sort((a, b) => `${a.provider}:${a.ref}`.localeCompare(`${b.provider}:${b.ref}`));
}

function normalizeRecordBody(value) {
  if (typeof value !== "string") {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "record patch.body must be Markdown text");
  }
  const body = value.replace(/\r\n?/g, "\n").trim();
  if (!body) throw authorityError("ERR_RECORD_SCHEMA_INVALID", "record patch.body must not be empty");
  assertNoRawSecrets(body, "record patch.body");
  return body;
}
