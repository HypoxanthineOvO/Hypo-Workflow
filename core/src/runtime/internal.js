import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  WORKSPACE_MANIFEST_PATH,
  isSafeWorkspaceComponent,
  validateWorkspaceManifest,
} from "../manifest/index.js";
import { canonicalHash, parseYaml } from "../serialization/index.js";
import { assertWorkspacePathAllowed } from "../workspace-store/index.js";

export const AUTHORITY_SCHEMA_VERSION = "1";
export const AUTHORITY_OBJECT_KINDS = Object.freeze([
  "delivery",
  "activity",
  "bootstrap_job",
  "experiment",
]);

const ISO_WITH_TIMEZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const SECRET_KEY = /^(?:api[_-]?key|access[_-]?key|client[_-]?secret|credential|credentials|password|passwd|private[_-]?key|raw[_-]?secret|secret|token)$/i;
const SECRET_VALUE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+\/-]{8,}=*\b/i,
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /\bgh[pousr]_[A-Za-z0-9_-]{8,}/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|credential|credentials|password|passwd|private[_-]?key|raw[_-]?secret|refresh[_-]?token|secret|token)\s*[:=]\s*(?!\[REDACTED\])(?:"[^"\r\n]+"|'[^'\r\n]+'|[^\s,;]+)/i,
];

export function normalizeAuthorityObjectRef(value, field = "object_ref") {
  assertPlainObject(value, field);
  assertExactKeys(value, ["kind", "id", "key", "directory"], field);
  if (!AUTHORITY_OBJECT_KINDS.includes(value.kind)) {
    throw authorityError("ERR_RUNTIME_OBJECT_REF_INVALID", `${field}.kind is not supported`);
  }
  const id = normalizeSafeIdentifier(value.id, `${field}.id`);
  const key = `${value.kind}:${id}`;
  const directory = `.pipeline/runtime/objects/${value.kind}/${id}`;
  if (Object.hasOwn(value, "key") && value.key !== key) {
    throw authorityError("ERR_RUNTIME_OBJECT_REF_INVALID", `${field}.key is inconsistent with kind and id`);
  }
  if (Object.hasOwn(value, "directory") && value.directory !== directory) {
    throw authorityError("ERR_RUNTIME_OBJECT_REF_INVALID", `${field}.directory is inconsistent with kind and id`);
  }
  return {
    kind: value.kind,
    id,
    key,
    directory,
  };
}

export function storedObjectRef(value, field = "object_ref") {
  const normalized = normalizeAuthorityObjectRef(value, field);
  return { kind: normalized.kind, id: normalized.id };
}

export function sameObjectRef(left, right) {
  const a = normalizeAuthorityObjectRef(left);
  const b = normalizeAuthorityObjectRef(right);
  return a.kind === b.kind && a.id === b.id;
}

export function normalizeSafeIdentifier(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !isSafeWorkspaceComponent(value)) {
    throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field} must be a safe single-component identifier`);
  }
  return value;
}

export function normalizeTimestamp(value, field) {
  const rendered = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (!ISO_WITH_TIMEZONE.test(rendered) || !Number.isFinite(Date.parse(rendered))) {
    throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field} must be a timezone-bearing ISO-8601 timestamp`);
  }
  return rendered;
}

export function normalizeSha256(value, field) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field} must be a lowercase 64-character SHA-256 digest`);
  }
  return value;
}

export function normalizeCanonicalValue(value, field = "value", seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field} must contain only finite numbers`);
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (value instanceof Date) return normalizeTimestamp(value, field);
  if (typeof value !== "object" || value === undefined) {
    throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field} must be canonicalizable data`);
  }
  if (seen.has(value)) {
    throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field} must not contain cycles`);
  }
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    result = value.map((entry, index) => normalizeCanonicalValue(entry, `${field}[${index}]`, seen));
  } else {
    assertPlainObject(value, field);
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field} must not contain symbol keys`);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    result = Object.create(Object.getPrototypeOf(value));
    for (const key of ownKeys.sort()) {
      if (!key || /[\0\r\n]/.test(key)) {
        throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field} contains an unsafe key`);
      }
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field}.${key} must be an enumerable data property`);
      }
      if (descriptor.value === undefined) {
        throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field}.${key} must not be undefined`);
      }
      Object.defineProperty(result, key, {
        value: normalizeCanonicalValue(descriptor.value, `${field}.${key}`, seen),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  seen.delete(value);
  return result;
}

export function assertNoRawSecrets(value, field = "input", options = {}) {
  scanSecrets(value, field, options, new Set());
}

export function containsForbiddenReasoning(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsForbiddenReasoning);
  return Object.entries(value).some(([key, nested]) => {
    const normalized = key.toLowerCase().replace(/[-\s]+/g, "_");
    return ["chain_of_thought", "hidden_reasoning", "rationale_dump"].includes(normalized)
      || containsForbiddenReasoning(nested);
  });
}

export async function readCurrentManifest(root) {
  const workspaceRoot = resolve(root || ".");
  const guarded = await assertWorkspacePathAllowed(workspaceRoot, WORKSPACE_MANIFEST_PATH, {
    allowedRoots: [".pipeline"],
    allowTransactionPaths: true,
  });
  const stats = await optionalLstat(guarded.path);
  if (!stats || !stats.isFile() || stats.isSymbolicLink()) {
    throw authorityError("ERR_WORKSPACE_MANIFEST_INVALID", "Current workspace manifest is missing or not a regular file");
  }
  try {
    return validateWorkspaceManifest(parseYaml(await readFile(guarded.path, "utf8")));
  } catch (error) {
    if (error?.code === "ERR_WORKSPACE_MANIFEST_INVALID") throw error;
    throw authorityError("ERR_WORKSPACE_MANIFEST_INVALID", "Current workspace manifest is unreadable or invalid");
  }
}

export function normalizeTransactionOptions(options, operation, derivedSeed) {
  const value = options ?? {};
  assertPlainObject(value, `${operation} options`);
  assertExactKeys(value, ["id", "faultInjector", "now", "tool_use_id"], `${operation} options`);
  const id = value.id === undefined
    ? derivedTransactionId(operation, derivedSeed)
    : normalizeSafeIdentifier(value.id, `${operation} options.id`);
  if (value.faultInjector !== undefined && typeof value.faultInjector !== "function") {
    throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${operation} options.faultInjector must be a function`);
  }
  return { id, faultInjector: value.faultInjector };
}

export function assertPlainObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field} must be a mapping`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field} must be a plain mapping`);
  }
}

export function assertExactKeys(value, allowedKeys, field) {
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) {
    throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field} contains unsupported fields: ${unknown.sort().join(", ")}`);
  }
}

export function authorityError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function scanSecrets(value, field, options, seen) {
  if (typeof value === "string") {
    if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
      throw authorityError("ERR_RAW_SECRET_FORBIDDEN", `${field} contains a raw secret-like value`);
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) {
    throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${field} must not contain cycles`);
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanSecrets(entry, `${field}[${index}]`, options, seen));
  } else {
    for (const [key, nested] of Object.entries(value)) {
      const insideSecretRefs = options.allowSecretRefs === true && (field === "secret_refs" || field.endsWith(".secret_refs"));
      if (SECRET_KEY.test(key) && nested !== undefined && nested !== null && !insideSecretRefs) {
        throw authorityError("ERR_RAW_SECRET_FORBIDDEN", `${field} contains a raw secret field`);
      }
      scanSecrets(nested, `${field}.${key}`, options, seen);
    }
  }
  seen.delete(value);
}

function derivedTransactionId(operation, seed) {
  const prefix = String(operation || "authority")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "authority";
  return `${prefix}-${canonicalHash(seed ?? prefix).slice(0, 24)}`;
}

async function optionalLstat(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }
}
