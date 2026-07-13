import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseYaml, stringifyYaml } from "../serialization/index.js";
import {
  assertWorkspacePathAllowed,
  commitWorkspaceTransaction,
} from "../workspace-store/index.js";
import {
  AUTHORITY_SCHEMA_VERSION,
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  containsForbiddenReasoning,
  normalizeAuthorityObjectRef,
  normalizeCanonicalValue,
  normalizeTransactionOptions,
  readCurrentManifest,
  storedObjectRef,
} from "./internal.js";

const ACTIVE_KINDS = Object.freeze(["delivery", "activity", "bootstrap_job"]);
const CONTINUATION_OWNERSHIP_FIELDS = new Set([
  "acceptance",
  "acceptance_state",
  "lifecycle",
  "lifecycle_state",
  "phase",
  "progress",
  "state",
  "status",
]);
const RUNTIME_OWNERSHIP_FIELDS = new Set([
  "continuation",
  "next_action",
  "next_actions",
  "resume_command",
]);
const RECEIPT_OWNERSHIP_FIELDS = new Set([
  "consumed_at",
  "invalidated_at",
  "receipt",
  "receipt_state",
  "receipts",
  "reserved_at",
  "reserved_by",
  "revoked_at",
]);

export function normalizeRuntimeObjectRef(value) {
  return normalizeAuthorityObjectRef(value);
}

export function compileRuntimeObjectDocuments(input) {
  assertPlainObject(input, "runtime object input");
  assertExactKeys(input, ["object_ref", "runtime", "continuation"], "runtime object input");
  const objectRef = normalizeAuthorityObjectRef(input.object_ref);
  const runtime = normalizeObjectDocument(input.runtime, "runtime", objectRef, { continuation: false });
  const continuation = normalizeObjectDocument(input.continuation, "continuation", objectRef, { continuation: true });
  return {
    object_ref: storedObjectRef(objectRef),
    runtime,
    continuation,
    runtime_path: `${objectRef.directory}/runtime.yaml`,
    continuation_path: `${objectRef.directory}/continuation.yaml`,
  };
}

export function compileActivePointerDocument(pointerInput) {
  return normalizeActivePointer(pointerInput);
}

export async function writeRuntimeObject(root, input, options = {}) {
  const compiled = compileRuntimeObjectDocuments(input);
  const transaction = normalizeTransactionOptions(options, "runtime-write", {
    object_ref: compiled.object_ref,
    runtime: compiled.runtime,
    continuation: compiled.continuation,
  });
  const manifest = await readCurrentManifest(root);

  await commitWorkspaceTransaction(root, {
    id: transaction.id,
    faultInjector: transaction.faultInjector,
    manifest,
    writes: [
      { path: compiled.runtime_path, content: renderYaml(compiled.runtime) },
      { path: compiled.continuation_path, content: renderYaml(compiled.continuation) },
    ],
  });
  return { runtime_path: compiled.runtime_path, continuation_path: compiled.continuation_path };
}

export async function readRuntimeObject(root, objectRefInput) {
  const objectRef = normalizeAuthorityObjectRef(objectRefInput);
  const runtimePath = `${objectRef.directory}/runtime.yaml`;
  const continuationPath = `${objectRef.directory}/continuation.yaml`;
  const [runtime, continuation] = await Promise.all([
    readYamlFile(root, runtimePath, "runtime"),
    readYamlFile(root, continuationPath, "continuation"),
  ]);
  return {
    object_ref: storedObjectRef(objectRef),
    runtime: normalizeObjectDocument(runtime, "runtime", objectRef, { continuation: false }),
    continuation: normalizeObjectDocument(continuation, "continuation", objectRef, { continuation: true }),
  };
}

export async function writeActivePointer(root, pointerInput, options = {}) {
  const pointer = compileActivePointerDocument(pointerInput);
  const transaction = normalizeTransactionOptions(options, "active-pointer-write", pointer);
  const manifest = await readCurrentManifest(root);
  const path = ".pipeline/runtime/active.yaml";
  await commitWorkspaceTransaction(root, {
    id: transaction.id,
    faultInjector: transaction.faultInjector,
    manifest,
    writes: [{ path, content: renderYaml(pointer) }],
  });
  return { path };
}

export async function readActivePointer(root) {
  return normalizeActivePointer(await readYamlFile(root, ".pipeline/runtime/active.yaml", "active pointer"));
}

function normalizeObjectDocument(value, field, expectedRef, options) {
  assertPlainObject(value, field);
  if (!Object.hasOwn(value, "object_ref")) {
    throw authorityError("ERR_RUNTIME_OBJECT_INVALID", `${field}.object_ref is required`);
  }
  const documentRef = normalizeAuthorityObjectRef(value.object_ref, `${field}.object_ref`);
  if (documentRef.kind !== expectedRef.kind || documentRef.id !== expectedRef.id) {
    throw authorityError("ERR_RUNTIME_OBJECT_REF_MISMATCH", `${field}.object_ref does not match the outer object_ref`);
  }
  if (value.schema_version !== AUTHORITY_SCHEMA_VERSION) {
    throw authorityError("ERR_RUNTIME_OBJECT_INVALID", `${field}.schema_version must be ${AUTHORITY_SCHEMA_VERSION}`);
  }
  if (containsForbiddenReasoning(value)) {
    throw authorityError("ERR_HIDDEN_REASONING_FORBIDDEN", `${field} must not contain hidden reasoning fields`);
  }
  assertNoRawSecrets(value, field);
  if (options.continuation) {
    if (typeof value.next_action !== "string" || !value.next_action.trim()) {
      throw authorityError("ERR_RUNTIME_OBJECT_INVALID", "continuation.next_action must be non-empty text");
    }
    const conflicting = findOwnedFields(value, CONTINUATION_OWNERSHIP_FIELDS);
    if (conflicting.length) {
      throw authorityError(
        "ERR_AUTHORITY_OWNERSHIP_VIOLATION",
        `continuation contains lifecycle-owned fields: ${conflicting.sort().join(", ")}`,
      );
    }
  } else {
    if (typeof value.status !== "string" || !value.status.trim()) {
      throw authorityError("ERR_RUNTIME_OBJECT_INVALID", "runtime.status must be non-empty text");
    }
    const conflicting = findOwnedFields(value, RUNTIME_OWNERSHIP_FIELDS);
    if (conflicting.length) {
      throw authorityError(
        "ERR_AUTHORITY_OWNERSHIP_VIOLATION",
        `runtime contains continuation-owned fields: ${conflicting.sort().join(", ")}`,
      );
    }
  }
  const receiptFields = findOwnedFields(value, RECEIPT_OWNERSHIP_FIELDS);
  if (receiptFields.length) {
    throw authorityError(
      "ERR_AUTHORITY_OWNERSHIP_VIOLATION",
      `${field} contains Receipt-owned fields: ${receiptFields.join(", ")}`,
    );
  }
  const normalized = normalizeCanonicalValue(value, field);
  if (options.continuation) normalized.next_action = value.next_action.trim();
  else normalized.status = value.status.trim();
  return {
    ...normalized,
    schema_version: AUTHORITY_SCHEMA_VERSION,
    object_ref: storedObjectRef(documentRef),
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
  return matches.sort();
}

function normalizeActivePointer(value) {
  assertPlainObject(value, "active pointer");
  assertExactKeys(value, ["schema_version", "active"], "active pointer");
  if (value.schema_version !== AUTHORITY_SCHEMA_VERSION) {
    throw authorityError("ERR_ACTIVE_POINTER_INVALID", `active pointer.schema_version must be ${AUTHORITY_SCHEMA_VERSION}`);
  }
  assertPlainObject(value.active, "active pointer.active");
  assertExactKeys(value.active, ACTIVE_KINDS, "active pointer.active");
  const active = {};
  for (const kind of ACTIVE_KINDS) {
    if (!Object.hasOwn(value.active, kind)) continue;
    const objectRef = normalizeAuthorityObjectRef(value.active[kind], `active pointer.active.${kind}`);
    if (objectRef.kind !== kind) {
      throw authorityError("ERR_ACTIVE_POINTER_INVALID", `active pointer.active.${kind} must reference kind ${kind}`);
    }
    active[kind] = storedObjectRef(objectRef);
  }
  return { schema_version: AUTHORITY_SCHEMA_VERSION, active };
}

async function readYamlFile(root, relativePath, label) {
  const workspaceRoot = resolve(root || ".");
  const guarded = await assertWorkspacePathAllowed(workspaceRoot, relativePath);
  let stats;
  try {
    stats = await lstat(guarded.path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw authorityError("ERR_AUTHORITY_OBJECT_NOT_FOUND", `${label} file was not found`);
    }
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw authorityError("ERR_WORKSPACE_PATH_FORBIDDEN", `${label} path is not a regular file`);
  }
  try {
    return parseYaml(await readFile(guarded.path, "utf8"));
  } catch (error) {
    if (error?.code) throw error;
    throw authorityError("ERR_AUTHORITY_SCHEMA_INVALID", `${label} file is unreadable or malformed`);
  }
}

function renderYaml(value) {
  return `${stringifyYaml(value).trimEnd()}\n`;
}
