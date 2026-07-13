import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { canonicalHash } from "../serialization/index.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  containsForbiddenReasoning,
  normalizeAuthorityObjectRef,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
  normalizeSha256,
  normalizeTimestamp,
  storedObjectRef,
} from "../runtime/internal.js";

export const RECOVERY_SCHEMA_VERSION = "1";
export const HOST_CLOCK = () => new Date().toISOString();
export const DEFAULT_RECOVERY_POLICY = Object.freeze({
  max_events_per_segment: 256,
  inline_output_bytes: 4096,
  default_restore_budget_bytes: 64 * 1024,
});

const FORBIDDEN_RAW_KEYS = new Set([
  "chain_of_thought",
  "hidden_reasoning",
  "rationale_dump",
  "raw_journal",
  "raw_events",
  "raw_transcript",
  "scratchpad",
  "transcript",
  "transcript_path",
]);
const SENSITIVE_KEY = /^(?:api[_-]?key|access[_-]?key|authorization|client[_-]?secret|cookie|credential|credentials|password|passwd|private[_-]?key|raw[_-]?secret|secret|session[_-]?token|token)$/i;
const SENSITIVE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+\/-]{8,}=*\b/gi,
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_-]{8,}\b/g,
  /\bAKIA[A-Z0-9]{16}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

export function normalizeRecoveryPolicy(input = {}) {
  assertPlainObject(input, "Recovery store options");
  assertExactKeys(input, [
    "clock",
    "max_events_per_segment",
    "inline_output_bytes",
    "default_restore_budget_bytes",
  ], "Recovery store options");
  return {
    clock: normalizeClock(input.clock ?? HOST_CLOCK),
    max_events_per_segment: normalizePositiveInteger(
      input.max_events_per_segment ?? DEFAULT_RECOVERY_POLICY.max_events_per_segment,
      "max_events_per_segment",
    ),
    inline_output_bytes: normalizeNonNegativeInteger(
      input.inline_output_bytes ?? DEFAULT_RECOVERY_POLICY.inline_output_bytes,
      "inline_output_bytes",
    ),
    default_restore_budget_bytes: normalizePositiveInteger(
      input.default_restore_budget_bytes ?? DEFAULT_RECOVERY_POLICY.default_restore_budget_bytes,
      "default_restore_budget_bytes",
    ),
  };
}

export function normalizeClock(value) {
  if (typeof value === "function") return value;
  if (value && typeof value === "object" && !Array.isArray(value) && typeof value.now === "function") {
    return value.now.bind(value);
  }
  throw authorityError("ERR_RECOVERY_CLOCK_INVALID", "Recovery store clock must be a zero-argument function or expose now()");
}

export function readClock(clock) {
  return normalizeTimestamp(clock(), "Recovery clock value");
}

export function assertNoTimeOverride(value, field) {
  assertPlainObject(value ?? {}, field);
  if (Object.hasOwn(value ?? {}, "now") || Object.hasOwn(value ?? {}, "clock")) {
    throw authorityError("ERR_RECOVERY_CLOCK_OVERRIDE", `${field} does not accept a per-operation clock or timestamp`);
  }
}

export function normalizeRecoveryObjectRef(value, field = "object_ref") {
  return storedObjectRef(normalizeAuthorityObjectRef(value, field), field);
}

export function objectDirectory(value) {
  return normalizeAuthorityObjectRef(value).directory;
}

export function normalizeWriter(value, field = "writer") {
  assertPlainObject(value, field);
  assertExactKeys(value, ["kind", "id"], field);
  if (!new Set(["main", "subagent"]).has(value.kind)) {
    throw authorityError("ERR_RECOVERY_EVENT_INVALID", `${field}.kind must be main or subagent`);
  }
  return {
    kind: value.kind,
    id: normalizeSafeIdentifier(value.id, `${field}.id`),
  };
}

export function normalizeConciseText(value, field, max = 4096) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > max || /[\0\r]/.test(value)) {
    throw authorityError("ERR_RECOVERY_SCHEMA_INVALID", `${field} must be concise non-empty text`);
  }
  return value.replace(/\r\n?/g, "\n");
}

export function normalizeDigest(value, field = "digest") {
  if (typeof value !== "string" || !value.startsWith("sha256:")) {
    throw authorityError("ERR_RECOVERY_DIGEST_INVALID", `${field} must use sha256:<digest>`);
  }
  return `sha256:${normalizeSha256(value.slice(7), field)}`;
}

export function hashBytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeSafeRepoPath(value, field = "path") {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !value
    || value.includes("\0")
    || value.includes("\\")
    || isAbsolute(value)
    || /^[A-Za-z]:[\\/]/.test(value)
    || value.split("/").some((part) => !part || part === "." || part === "..")
    || /^~(?:[\\/]|$)/.test(value)
    || /^file(?:\+[^:]+)?:/i.test(value)
  ) {
    throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", `${field} must be a contained repository-relative path`);
  }
  return value;
}

export async function readContainedFile(root, relativePath, field = "path") {
  const normalized = normalizeSafeRepoPath(relativePath, field);
  const workspaceRoot = resolve(root || ".");
  const target = resolve(workspaceRoot, normalized);
  const rel = relative(workspaceRoot, target);
  if (!rel || rel === ".." || rel.startsWith("../") || isAbsolute(rel)) {
    throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", `${field} escapes the workspace`);
  }
  let stats;
  try {
    stats = await lstat(target);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw authorityError("ERR_RECOVERY_REFERENCE_MISSING", `${field} does not identify an existing file`);
    }
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", `${field} must identify a regular non-symbolic file`);
  }
  const [rootReal, targetReal] = await Promise.all([realpath(workspaceRoot), realpath(target)]);
  const realRel = relative(rootReal, targetReal);
  if (!realRel || realRel === ".." || realRel.startsWith("../") || isAbsolute(realRel)) {
    throw authorityError("ERR_RECOVERY_PATH_FORBIDDEN", `${field} resolves outside the workspace`);
  }
  return { path: normalized, content: await readFile(target) };
}

export function assertNoForbiddenRecoveryData(value, field = "Recovery input") {
  if (containsForbiddenReasoning(value)) {
    throw authorityError("ERR_HIDDEN_REASONING_FORBIDDEN", `${field} must not contain hidden reasoning`);
  }
  scanForbiddenKeys(value, field, new Set());
}

export function assertSecretSafe(value, field = "Recovery input", options = {}) {
  assertNoForbiddenRecoveryData(value, field);
  assertNoRawSecrets(value, field, options);
}

export function redactSensitivePayload(value, field = "payload", seen = new Set()) {
  if (typeof value === "string") return redactSensitiveString(value);
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw authorityError("ERR_RECOVERY_EVENT_INVALID", `${field} must contain finite numbers`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object" || value === undefined) {
    throw authorityError("ERR_RECOVERY_EVENT_INVALID", `${field} must contain canonical JSON data`);
  }
  if (seen.has(value)) throw authorityError("ERR_RECOVERY_EVENT_INVALID", `${field} must not contain cycles`);
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    result = value.map((entry, index) => redactSensitivePayload(entry, `${field}[${index}]`, seen));
  } else {
    assertPlainObject(value, field);
    result = {};
    for (const key of Object.keys(value).sort()) {
      const normalizedKey = normalizeForbiddenKey(key);
      if (FORBIDDEN_RAW_KEYS.has(normalizedKey)) {
        throw authorityError("ERR_HIDDEN_REASONING_FORBIDDEN", `${field} contains a forbidden reasoning or transcript field`);
      }
      result[key] = SENSITIVE_KEY.test(key)
        ? "[REDACTED]"
        : redactSensitivePayload(value[key], `${field}.${key}`, seen);
    }
  }
  seen.delete(value);
  return result;
}

export function stableEqual(left, right) {
  return canonicalHash(left) === canonicalHash(right);
}

export function normalizeCursor(value, expectedObjectRef, field = "cursor") {
  assertPlainObject(value, field);
  assertExactKeys(value, ["schema_version", "object_ref", "streams"], field);
  if (value.schema_version !== RECOVERY_SCHEMA_VERSION) {
    throw authorityError("ERR_RECOVERY_CURSOR_INVALID", `${field}.schema_version is unsupported`);
  }
  const objectRef = normalizeRecoveryObjectRef(value.object_ref, `${field}.object_ref`);
  if (expectedObjectRef && !stableEqual(objectRef, normalizeRecoveryObjectRef(expectedObjectRef))) {
    throw authorityError("ERR_RECOVERY_CURSOR_INVALID", `${field}.object_ref does not match`);
  }
  if (!Array.isArray(value.streams)) {
    throw authorityError("ERR_RECOVERY_CURSOR_INVALID", `${field}.streams must be an array`);
  }
  const keys = new Set();
  const streams = value.streams.map((entry, index) => {
    const entryField = `${field}.streams[${index}]`;
    assertPlainObject(entry, entryField);
    assertExactKeys(entry, ["session_id", "writer", "sequence", "segment_id", "event_id"], entryField);
    const sessionId = normalizeSafeIdentifier(entry.session_id, `${entryField}.session_id`);
    const writer = normalizeWriter(entry.writer, `${entryField}.writer`);
    const sequence = normalizePositiveInteger(entry.sequence, `${entryField}.sequence`);
    const segmentId = normalizeSegmentId(entry.segment_id, `${entryField}.segment_id`);
    const eventId = normalizeSha256(entry.event_id, `${entryField}.event_id`);
    const key = streamKey(sessionId, writer);
    if (keys.has(key)) throw authorityError("ERR_RECOVERY_CURSOR_INVALID", `${field} contains duplicate streams`);
    keys.add(key);
    return { session_id: sessionId, writer, sequence, segment_id: segmentId, event_id: eventId };
  }).sort(compareCursorStreams);
  return { schema_version: RECOVERY_SCHEMA_VERSION, object_ref: objectRef, streams };
}

export function emptyCursor(objectRef) {
  return { schema_version: RECOVERY_SCHEMA_VERSION, object_ref: normalizeRecoveryObjectRef(objectRef), streams: [] };
}

export function cursorStreamMap(cursor) {
  return new Map(cursor.streams.map((entry) => [streamKey(entry.session_id, entry.writer), entry]));
}

export function streamKey(sessionId, writer) {
  return `${sessionId}\0${writer.kind}\0${writer.id}`;
}

export function compareCursorStreams(left, right) {
  return streamKey(left.session_id, left.writer).localeCompare(streamKey(right.session_id, right.writer));
}

export function normalizeSegmentId(value, field = "segment_id") {
  if (typeof value !== "string" || !/^\d{8}$/.test(value) || value === "00000000") {
    throw authorityError("ERR_RECOVERY_CURSOR_INVALID", `${field} must be an eight-digit positive segment id`);
  }
  return value;
}

export function sanitizeErrorCode(error, fallback = "ERR_RECOVERY_PACK_INVALID") {
  return typeof error?.code === "string" && /^ERR_[A-Z0-9_]+$/.test(error.code) ? error.code : fallback;
}

export function normalizeCanonicalRecoveryValue(value, field) {
  assertNoForbiddenRecoveryData(value, field);
  return normalizeCanonicalValue(value, field);
}

function scanForbiddenKeys(value, field, seen) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) throw authorityError("ERR_RECOVERY_SCHEMA_INVALID", `${field} must not contain cycles`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForbiddenKeys(entry, `${field}[${index}]`, seen));
  } else {
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_RAW_KEYS.has(normalizeForbiddenKey(key))) {
        throw authorityError("ERR_RECOVERY_RAW_CONTEXT_FORBIDDEN", `${field} contains raw transcript, Journal, event, scratchpad, or hidden reasoning data`);
      }
      scanForbiddenKeys(nested, `${field}.${key}`, seen);
    }
  }
  seen.delete(value);
}

function normalizeForbiddenKey(value) {
  return String(value).toLowerCase().replace(/[-\s]+/g, "_");
}

function redactSensitiveString(value) {
  let redacted = value;
  for (const pattern of SENSITIVE_PATTERNS) redacted = redacted.replace(pattern, "[REDACTED]");
  const key = "(?:authorization|api[_-]?key|access[_-]?key|client[_-]?secret|credential|credentials|password|passwd|private[_-]?key|raw[_-]?secret|secret|session[_-]?token|token)";
  redacted = redacted
    .replace(new RegExp(`((?:["']?${key}["']?)\\s*[:=]\\s*)"[^"\\r\\n]*"`, "gi"), "$1\"[REDACTED]\"")
    .replace(new RegExp(`((?:["']?${key}["']?)\\s*[:=]\\s*)'[^'\\r\\n]*'`, "gi"), "$1'[REDACTED]'")
    .replace(new RegExp(`((?:["']?${key}["']?)\\s*[:=]\\s*)(?:Basic|Bearer)\\s+[^\\s,;&\\r\\n]+`, "gi"), "$1[REDACTED]")
    .replace(new RegExp(`((?:["']?${key}["']?)\\s*[:=]\\s*)[^\\s,;&\\r\\n]+`, "gi"), "$1[REDACTED]")
    .replace(new RegExp(`(--${key}\\s+)[^\\s,;&\\r\\n]+`, "gi"), "$1[REDACTED]");
  return redacted;
}

function normalizePositiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw authorityError("ERR_RECOVERY_POLICY_INVALID", `${field} must be a positive safe integer`);
  }
  return value;
}

function normalizeNonNegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw authorityError("ERR_RECOVERY_POLICY_INVALID", `${field} must be a non-negative safe integer`);
  }
  return value;
}
