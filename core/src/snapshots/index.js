import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  WORKSPACE_FORMAT,
  WORKSPACE_MANIFEST_SCHEMA_VERSION,
} from "../manifest/index.js";
import { normalizePersistedRecord, recordScopeDirectory } from "../records/schema.js";
import { canonicalHash, parseYaml, stringifyYaml } from "../serialization/index.js";
import {
  assertWorkspacePathAllowed,
  commitWorkspaceTransaction,
  normalizeWorkspacePath,
} from "../workspace-store/index.js";
import {
  AUTHORITY_SCHEMA_VERSION,
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  containsForbiddenReasoning,
  normalizeSafeIdentifier,
  normalizeSha256,
  normalizeTimestamp,
  normalizeTransactionOptions,
  readCurrentManifest,
} from "../runtime/internal.js";

const SNAPSHOT_KINDS = new Set(["accepted", "checkpoint"]);
const DELIVERY_OBJECT_TYPES = new Set(["goal", "cycle"]);
const OBJECT_CONTRACT_KEYS = Object.freeze([
  "object_ref",
  "object_type",
  "state",
  "plan_hash",
  "accepted_at",
  "checkpoint_at",
  "checkpoint_ref",
]);
const SNAPSHOT_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "snapshot_kind",
  "project",
  "object",
  "records",
  "semantic_hash",
]);
export function buildSnapshotProjection(input) {
  assertPlainObject(input, "Snapshot input");
  const { local_context: _localContext, ...durableInput } = input;
  assertNoRawSecrets(durableInput, "Snapshot input", { allowSecretRefs: true });
  if (containsForbiddenReasoning(durableInput)) {
    throw authorityError("ERR_HIDDEN_REASONING_FORBIDDEN", "Snapshot input must not contain hidden reasoning fields");
  }
  const snapshotKind = normalizeSnapshotKind(durableInput.snapshot_kind);
  const project = normalizeProjectProjection(durableInput.manifest ?? durableInput.project);
  const object = normalizeObjectContract(durableInput.object ?? durableInput.object_contract, snapshotKind);
  const records = normalizeSnapshotRecords(durableInput.records);
  const durable = {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    authority_role: "projection",
    snapshot_kind: snapshotKind,
    project,
    object,
    records,
  };
  return { ...durable, semantic_hash: canonicalHash(durable) };
}

export async function writeSnapshot(root, input, options = {}) {
  assertPlainObject(input, "Snapshot input");
  const manifest = await readCurrentManifest(root);
  const projection = buildSnapshotProjection({ ...input, manifest });
  const path = snapshotProjectionPath(projection);
  const transaction = normalizeTransactionOptions(options, "snapshot-write", {
    semantic_hash: projection.semantic_hash,
    path,
  });
  await commitWorkspaceTransaction(root, {
    id: transaction.id,
    faultInjector: transaction.faultInjector,
    manifest,
    writes: [{ path, content: `${stringifyYaml(projection).trimEnd()}\n` }],
  });
  return {
    path,
    snapshot_kind: projection.snapshot_kind,
    semantic_hash: projection.semantic_hash,
  };
}

export async function readSnapshot(root, pathInput) {
  const path = normalizeSnapshotPath(pathInput);
  const workspaceRoot = resolve(root || ".");
  const guarded = await assertWorkspacePathAllowed(workspaceRoot, path, {
    allowedRoots: [".pipeline/snapshots"],
  });
  let stats;
  try {
    stats = await lstat(guarded.path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw authorityError("ERR_SNAPSHOT_NOT_FOUND", "Snapshot was not found");
    }
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw authorityError("ERR_WORKSPACE_PATH_FORBIDDEN", "Snapshot path is not a regular file");
  }
  let parsed;
  try {
    parsed = parseYaml(await readFile(guarded.path, "utf8"));
  } catch {
    throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", "Snapshot file is unreadable or malformed");
  }
  const projection = normalizePersistedSnapshot(parsed);
  if (snapshotProjectionPath(projection) !== path) {
    throw authorityError("ERR_SNAPSHOT_PATH_MISMATCH", "Snapshot file path does not match its canonical content-addressed path");
  }
  return projection;
}

function normalizePersistedSnapshot(value) {
  assertPlainObject(value, "Snapshot");
  assertExactKeys(value, SNAPSHOT_KEYS, "Snapshot");
  if (value.schema_version !== AUTHORITY_SCHEMA_VERSION || value.authority_role !== "projection") {
    throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", "Snapshot schema or authority role is invalid");
  }
  const expectedHash = normalizeSha256(value.semantic_hash, "Snapshot semantic_hash");
  const projection = buildSnapshotProjection({
    snapshot_kind: value.snapshot_kind,
    project: value.project,
    object: value.object,
    records: value.records,
  });
  if (projection.semantic_hash !== expectedHash) {
    throw authorityError("ERR_SNAPSHOT_INTEGRITY", "Snapshot semantic hash does not match its durable projection");
  }
  return projection;
}

function normalizeSnapshotKind(value) {
  if (!SNAPSHOT_KINDS.has(value)) {
    throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", "snapshot_kind must be accepted or checkpoint");
  }
  return value;
}

function normalizeProjectProjection(value) {
  assertPlainObject(value, "Snapshot project");
  const format = value.format;
  const schemaVersion = value.schema_version;
  const projectId = normalizeSafeIdentifier(value.project_id, "Snapshot project.project_id");
  if (format !== WORKSPACE_FORMAT || schemaVersion !== WORKSPACE_MANIFEST_SCHEMA_VERSION) {
    throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", "Snapshot project format or schema_version is invalid");
  }
  return {
    format: WORKSPACE_FORMAT,
    schema_version: WORKSPACE_MANIFEST_SCHEMA_VERSION,
    project_id: projectId,
  };
}

function normalizeObjectContract(value, snapshotKind) {
  assertPlainObject(value, "Snapshot object contract");
  assertExactKeys(value, OBJECT_CONTRACT_KEYS, "Snapshot object contract");
  assertPlainObject(value.object_ref, "Snapshot object.object_ref");
  assertExactKeys(value.object_ref, ["kind", "id"], "Snapshot object.object_ref");
  if (value.object_ref.kind !== "delivery") {
    throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", "Snapshot object.object_ref.kind must be delivery");
  }
  const objectRef = {
    kind: "delivery",
    id: normalizeSafeIdentifier(value.object_ref.id, "Snapshot object.object_ref.id"),
  };
  if (!DELIVERY_OBJECT_TYPES.has(value.object_type)) {
    throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", "Snapshot object.object_type must be goal or cycle");
  }
  if (!SNAPSHOT_KINDS.has(value.state) || value.state !== snapshotKind) {
    throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", "Snapshot object.state must match snapshot_kind");
  }
  const normalized = {
    object_ref: objectRef,
    object_type: value.object_type,
    state: value.state,
    plan_hash: normalizeSha256(value.plan_hash, "Snapshot object.plan_hash"),
  };
  if (value.state === "accepted") {
    if (!Object.hasOwn(value, "accepted_at") || Object.hasOwn(value, "checkpoint_at") || Object.hasOwn(value, "checkpoint_ref")) {
      throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", "Accepted Snapshot object requires only accepted_at");
    }
    normalized.accepted_at = normalizeTimestamp(value.accepted_at, "Snapshot object.accepted_at");
  } else {
    if (!Object.hasOwn(value, "checkpoint_at") || Object.hasOwn(value, "accepted_at")) {
      throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", "Checkpoint Snapshot object requires checkpoint_at and no accepted_at");
    }
    normalized.checkpoint_at = normalizeTimestamp(value.checkpoint_at, "Snapshot object.checkpoint_at");
    if (Object.hasOwn(value, "checkpoint_ref")) {
      normalized.checkpoint_ref = normalizeSnapshotReference(value.checkpoint_ref, "Snapshot object.checkpoint_ref");
    }
  }
  return normalized;
}

function normalizeSnapshotRecords(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", "Snapshot records must be a non-empty array of readRecord results");
  }
  const seen = new Set();
  const records = value.map((record, index) => {
    assertPlainObject(record, `Snapshot records[${index}]`);
    assertExactKeys(record, ["path", "attributes", "body"], `Snapshot records[${index}]`);
    const path = normalizeWorkspacePath(record.path);
    if (!path.startsWith(".pipeline/memory/records/") || !path.endsWith(".md")) {
      throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", "Snapshot Record path must remain inside the Record Store");
    }
    const normalized = normalizePersistedRecord(record.attributes, record.body);
    const expectedPath = `.pipeline/memory/records/${recordScopeDirectory(normalized.attributes.scope)}/${normalized.attributes.kind}/${normalized.attributes.id}.md`;
    if (path !== expectedPath) {
      throw authorityError("ERR_SNAPSHOT_RECORD_PATH_MISMATCH", "Snapshot Record path does not match its persisted attributes");
    }
    assertPortableLocator(normalized.attributes.scope.ref, `Snapshot records[${index}].attributes.scope.ref`);
    for (const [sourceIndex, sourceRef] of normalized.attributes.source_refs.entries()) {
      assertPortableLocator(sourceRef.ref, `Snapshot records[${index}].attributes.source_refs[${sourceIndex}].ref`);
      assertPortableLocator(sourceRef.locator, `Snapshot records[${index}].attributes.source_refs[${sourceIndex}].locator`);
    }
    if (seen.has(normalized.attributes.id)) {
      throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", "Snapshot contains a duplicate Record id");
    }
    seen.add(normalized.attributes.id);
    return { path, attributes: normalized.attributes, body: normalized.body };
  });
  return records.sort((left, right) => left.attributes.id.localeCompare(right.attributes.id));
}

export function snapshotProjectionPath(projection) {
  const suffix = `${projection.snapshot_kind}-${projection.semantic_hash.slice(0, 24)}.yaml`;
  const directory = projection.object.object_type === "goal" ? "goals" : "cycles";
  return `.pipeline/snapshots/${directory}/${projection.object.object_ref.id}/${suffix}`;
}

function normalizeSnapshotReference(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 512 || /[\0\r\n]/.test(value)) {
    throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", `${field} must be a safe non-empty reference`);
  }
  if (
    value.startsWith("/")
    || /^[A-Za-z]:[\\/]/.test(value)
    || value.includes("\\")
    || value.split("/").some((part) => part === "." || part === "..")
  ) {
    throw authorityError("ERR_SNAPSHOT_SCHEMA_INVALID", `${field} must not be absolute or contain traversal`);
  }
  assertPortableLocator(value, field);
  return value;
}

function assertPortableLocator(value, field) {
  const candidates = [value];
  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) candidates.push(decoded);
  } catch {
    // A literal percent may be semantic text; raw-form checks still apply.
  }
  const nonPortable = candidates.some((candidate) => {
    const lower = candidate.toLowerCase();
    return candidate.startsWith("/")
      || candidate.startsWith("\\")
      || candidate.includes("\\")
      || /^[a-z]:/i.test(candidate)
      || /^~[^\\/]*(?:[\\/]|$)/.test(candidate)
      || /^file(?:\+[^:]+)?:/i.test(lower)
      || candidate.split("/").some((part) => part === "." || part === "..")
      || /^(?:\$home|\$\{home\}|\$userprofile|\$\{userprofile\}|%userprofile%|%homepath%)(?:[\\/]|$)/i.test(candidate);
  });
  if (nonPortable) {
    throw authorityError("ERR_SNAPSHOT_LOCATOR_NONPORTABLE", `${field} must be a portable semantic or repository locator`);
  }
}

function normalizeSnapshotPath(value) {
  const path = normalizeWorkspacePath(value);
  if (!path.endsWith(".yaml") || ![
    ".pipeline/snapshots/project/",
    ".pipeline/snapshots/goals/",
    ".pipeline/snapshots/cycles/",
  ].some((prefix) => path.startsWith(prefix))) {
    throw authorityError("ERR_WORKSPACE_PATH_FORBIDDEN", "Snapshot path is outside a supported snapshot zone");
  }
  return path;
}
