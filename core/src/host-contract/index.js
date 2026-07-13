import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { readActivePointer, readRuntimeObject } from "../runtime/index.js";
import {
  assertExactKeys,
  assertPlainObject,
  normalizeSafeIdentifier,
  normalizeTimestamp,
  readCurrentManifest,
} from "../runtime/internal.js";
import { commitWorkspaceTransaction } from "../workspace-store/index.js";

export const HOST_CONTRACT_VERSION = "1";
export const HOST_STATUS_PATH = ".pipeline/runtime/host-status-v1.json";
export const HOST_STATUS_RELATIVE_PATH = HOST_STATUS_PATH;

const STATUS_KEYS = new Set([
  "schema_version",
  "contract_version",
  "projection_status",
  "generated_at",
  "generation",
  "workspace",
  "delivery",
  "continuation",
  "invalidation",
]);
const WORKSPACE_KEYS = new Set(["format_version", "status"]);
const DELIVERY_KEYS = new Set(["kind", "id", "status", "revision"]);
const CONTINUATION_KEYS = new Set(["available", "safe_resume_command"]);
const INVALIDATION_KEYS = new Set(["invalidated_at", "reason"]);
const SECRET_KEY = /(?:api[_-]?key|authorization|credential|password|passwd|private[_-]?key|secret|session[_-]?token|token)/i;
const SHA256 = /^[a-f0-9]{64}$/;

export function parseHostStatusProjection(input) {
  assertObject(input, "Host status projection");
  rejectUnknownKeys(input, STATUS_KEYS, "Host status projection");
  rejectSensitiveKeys(input, "Host status projection");
  requireVersion(input);
  requireTimestamp(input.generated_at, "generated_at");
  if (!Number.isSafeInteger(input.generation) || input.generation < 0) {
    throw contractError("ERR_HOST_STATUS_INVALID", "Host status generation must be a non-negative integer");
  }

  if (input.projection_status === "current") {
    const workspace = parseWorkspace(input.workspace);
    const delivery = input.delivery === null ? null : parseDelivery(input.delivery);
    const continuation = input.continuation === null ? null : parseContinuation(input.continuation);
    if (input.invalidation !== null) {
      throw contractError("ERR_HOST_STATUS_INVALID", "Current Host status cannot contain invalidation data");
    }
    return clone({ ...input, workspace, delivery, continuation, invalidation: null });
  }

  if (input.projection_status === "invalidated") {
    if (input.workspace !== null || input.delivery !== null || input.continuation !== null) {
      throw contractError("ERR_HOST_STATUS_INVALID", "Invalidated Host status must clear host-visible state");
    }
    const invalidation = parseInvalidation(input.invalidation);
    return clone({ ...input, workspace: null, delivery: null, continuation: null, invalidation });
  }
  throw contractError("ERR_HOST_STATUS_INVALID", "Host status projection_status is unsupported");
}

export function invalidateHostStatusProjection(currentInput, input) {
  const current = parseHostStatusProjection(currentInput);
  assertObject(input, "Host status invalidation");
  rejectUnknownKeys(input, INVALIDATION_KEYS, "Host status invalidation");
  const invalidation = parseInvalidation(input);
  return parseHostStatusProjection({
    schema_version: HOST_CONTRACT_VERSION,
    contract_version: HOST_CONTRACT_VERSION,
    projection_status: "invalidated",
    generated_at: invalidation.invalidated_at,
    generation: current.generation + 1,
    workspace: null,
    delivery: null,
    continuation: null,
    invalidation,
  });
}

export function compileHostStatusProjection(input) {
  assertObject(input, "Host status source");
  rejectUnknownKeys(input, new Set(["generated_at", "generation", "manifest", "delivery", "continuation"]), "Host status source");
  assertObject(input.manifest, "Host status manifest");
  const runtime = input.delivery ?? null;
  const continuation = input.continuation ?? null;
  return parseHostStatusProjection({
    schema_version: HOST_CONTRACT_VERSION,
    contract_version: HOST_CONTRACT_VERSION,
    projection_status: "current",
    generated_at: input.generated_at,
    generation: input.generation,
    workspace: {
      format_version: input.manifest.schema_version,
      status: "ready",
    },
    delivery: runtime === null ? null : {
      kind: runtime.delivery_kind,
      id: runtime.object_ref?.id,
      status: runtime.status,
      revision: runtime.revision,
    },
    continuation: continuation === null ? null : {
      available: true,
      safe_resume_command: "/hw:resume",
    },
    invalidation: null,
  });
}

export async function readHostStatusProjection(root) {
  const path = resolve(root, HOST_STATUS_PATH);
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return { status: "missing", projection: null };
    throw error;
  }
  try {
    const projection = parseHostStatusProjection(JSON.parse(raw));
    return { status: projection.projection_status, projection };
  } catch (error) {
    return { status: "invalid", projection: null, error: error.message };
  }
}

export async function refreshHostStatusProjection(root, options = {}) {
  assertPlainObject(options, "Host status refresh options");
  assertExactKeys(options, ["clock", "id"], "Host status refresh options");
  if (typeof options.clock !== "function") throw contractError("ERR_HOST_CONTRACT_INVALID", "Host status refresh requires a zero-argument clock");
  const id = normalizeSafeIdentifier(options.id, "Host status refresh options.id");
  const generatedAt = normalizeTimestamp(options.clock(), "Host status refresh clock value");
  const manifest = await readCurrentManifest(root);
  const existing = await readHostStatusProjection(root);
  const generation = existing.projection?.generation === undefined ? 0 : existing.projection.generation + 1;
  let delivery = null;
  let continuation = null;
  try {
    const pointer = await readActivePointer(root);
    if (pointer.active.delivery) {
      const authority = await readRuntimeObject(root, pointer.active.delivery);
      delivery = authority.runtime;
      continuation = authority.continuation;
    }
  } catch (error) {
    if (!new Set(["ERR_AUTHORITY_OBJECT_NOT_FOUND", "ERR_DELIVERY_NOT_FOUND"]).has(error?.code)) throw error;
  }
  const projection = compileHostStatusProjection({
    generated_at: generatedAt,
    generation,
    manifest,
    delivery,
    continuation,
  });
  await commitWorkspaceTransaction(root, {
    id,
    manifest,
    writes: [{ path: HOST_STATUS_PATH, content: `${JSON.stringify(projection, null, 2)}\n` }],
  });
  return projection;
}

export async function verifyPortableBundle({ root, manifest }) {
  assertObject(manifest, "Portable bundle manifest");
  rejectUnknownKeys(manifest, new Set(["schema_version", "contract_version", "files"]), "Portable bundle manifest");
  requireVersion(manifest);
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw contractError("ERR_BUNDLE_INTEGRITY", "Portable bundle manifest requires files");
  }
  const bundleRoot = await realpath(resolve(root));
  const seen = new Set();
  const verified = [];
  for (const entry of manifest.files) {
    assertObject(entry, "Portable bundle file");
    rejectUnknownKeys(entry, new Set(["path", "sha256", "bytes"]), "Portable bundle file");
    const path = normalizeBundlePath(entry.path);
    if (seen.has(path)) throw contractError("ERR_BUNDLE_INTEGRITY", `Duplicate portable bundle path: ${path}`);
    seen.add(path);
    if (typeof entry.sha256 !== "string" || !SHA256.test(entry.sha256)) {
      throw contractError("ERR_BUNDLE_INTEGRITY", `Invalid SHA-256 for ${path}`);
    }
    const absolute = resolve(bundleRoot, path);
    const stats = await lstat(absolute).catch(() => null);
    if (!stats?.isFile() || stats.isSymbolicLink()) {
      throw contractError("ERR_BUNDLE_INTEGRITY", `Portable bundle file is missing or unsafe: ${path}`);
    }
    const canonical = await realpath(absolute);
    if (!isWithin(bundleRoot, canonical)) throw contractError("ERR_BUNDLE_INTEGRITY", `Portable bundle path escapes root: ${path}`);
    const bytes = await readFile(canonical);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== entry.sha256) throw contractError("ERR_BUNDLE_INTEGRITY", `Portable bundle checksum mismatch: ${path}`);
    if (entry.bytes !== undefined && entry.bytes !== bytes.length) {
      throw contractError("ERR_BUNDLE_INTEGRITY", `Portable bundle size mismatch: ${path}`);
    }
    verified.push(path);
  }
  return { contract_version: HOST_CONTRACT_VERSION, files: verified.sort() };
}

function parseWorkspace(value) {
  assertObject(value, "Host status workspace");
  rejectUnknownKeys(value, WORKSPACE_KEYS, "Host status workspace");
  requireText(value.format_version, "workspace.format_version");
  requireText(value.status, "workspace.status");
  return clone(value);
}

function parseDelivery(value) {
  assertObject(value, "Host status delivery");
  rejectUnknownKeys(value, DELIVERY_KEYS, "Host status delivery");
  if (!new Set(["goal", "cycle"]).has(value.kind)) throw contractError("ERR_HOST_STATUS_INVALID", `Host status delivery.kind is invalid: ${JSON.stringify(value.kind)}`);
  requireText(value.id, "delivery.id");
  requireText(value.status, "delivery.status");
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw contractError("ERR_HOST_STATUS_INVALID", "Host status delivery.revision is invalid");
  return clone(value);
}

function parseContinuation(value) {
  assertObject(value, "Host status continuation");
  rejectUnknownKeys(value, CONTINUATION_KEYS, "Host status continuation");
  if (typeof value.available !== "boolean") throw contractError("ERR_HOST_STATUS_INVALID", "Host status continuation.available must be boolean");
  if (value.safe_resume_command !== "/hw:resume") throw contractError("ERR_HOST_STATUS_INVALID", "Host status safe resume command is invalid");
  return clone(value);
}

function parseInvalidation(value) {
  assertObject(value, "Host status invalidation");
  rejectUnknownKeys(value, INVALIDATION_KEYS, "Host status invalidation");
  requireTimestamp(value.invalidated_at, "invalidation.invalidated_at");
  requireText(value.reason, "invalidation.reason");
  return clone(value);
}

function requireVersion(value) {
  if (value.schema_version !== HOST_CONTRACT_VERSION || value.contract_version !== HOST_CONTRACT_VERSION) {
    throw contractError("ERR_HOST_CONTRACT_UNSUPPORTED", "Host Contract version is unsupported");
  }
}

function normalizeBundlePath(value) {
  if (typeof value !== "string" || !value || isAbsolute(value) || value.includes("\\")) {
    throw contractError("ERR_BUNDLE_INTEGRITY", "Portable bundle path is unsafe");
  }
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw contractError("ERR_BUNDLE_INTEGRITY", "Portable bundle path is unsafe");
  }
  return parts.join("/");
}

function rejectSensitiveKeys(value, label) {
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) throw contractError("ERR_HOST_STATUS_SENSITIVE", `${label} contains sensitive field ${key}`);
    if (child && typeof child === "object") rejectSensitiveKeys(child, label);
  }
}

function rejectUnknownKeys(value, allowed, label) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw contractError("ERR_HOST_CONTRACT_ADDITIONAL", `${label} contains unknown fields: ${unknown.join(", ")}`);
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw contractError("ERR_HOST_CONTRACT_INVALID", `${label} must be an object`);
}

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw contractError("ERR_HOST_CONTRACT_INVALID", `${field} must be non-empty text`);
}

function requireTimestamp(value, field) {
  requireText(value, field);
  if (!Number.isFinite(Date.parse(value))) throw contractError("ERR_HOST_CONTRACT_INVALID", `${field} must be an ISO timestamp`);
}

function isWithin(root, candidate) {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function contractError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
