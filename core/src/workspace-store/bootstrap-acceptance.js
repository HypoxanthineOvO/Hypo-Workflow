import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { WORKSPACE_MANIFEST_PATH, validateWorkspaceManifest } from "../manifest/index.js";
import { canonicalHash, parseYaml, stringifyYaml } from "../serialization/index.js";
import { assertWorkspacePathAllowed } from "./path-guard.js";

const BOOTSTRAP_SCHEMA_VERSION = "1";
const MIGRATIONS_ROOT = ".pipeline/runtime/migrations";
const SAFE_COMPONENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SHA256 = /^[a-f0-9]{64}$/;
export const LEGACY_FREEZE_PATHS = Object.freeze([
  ".pipeline/cycle.yaml",
  ".pipeline/log.yaml",
  ".pipeline/PROGRESS.md",
  ".pipeline/state.yaml",
]);

export async function assertBootstrapAcceptanceWriteAllowed(root) {
  const inspection = await inspectBootstrapAcceptanceGate(root);
  if (inspection.state !== "pending") return inspection;
  throw acceptanceError(
    "ERR_BOOTSTRAP_ACCEPTANCE_PENDING",
    "Bootstrap activation must be accepted before the current workspace can be modified",
  );
}

export async function inspectBootstrapAcceptanceGate(root) {
  const workspaceRoot = resolve(root || ".");
  const manifest = await readOptionalRegularFile(workspaceRoot, WORKSPACE_MANIFEST_PATH);
  if (manifest === null) return { state: "none", jobs: [] };
  try {
    validateWorkspaceManifest(parseYaml(manifest.toString("utf8")));
  } catch {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance manifest binding is invalid");
  }
  const manifestSha256 = byteHash(manifest);
  const entries = await readOptionalDirectory(workspaceRoot, MIGRATIONS_ROOT);
  const jobs = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink() || !entry.isDirectory() || !isSafeComponent(entry.name)) {
      throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance storage is invalid");
    }
    const jobRef = { kind: "bootstrap_job", id: entry.name };
    const checkpoint = await readOptionalCheckpoint(workspaceRoot, jobRef);
    if (!checkpoint) continue;
    if (checkpoint.manifest.sha256 !== manifestSha256) {
      throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance manifest binding has drifted");
    }
    const checkpointRef = checkpointReference(jobRef, checkpoint);
    const acceptance = await readBootstrapAcceptanceCompanion(
      workspaceRoot,
      jobRef,
      checkpointRef,
      { optional: true },
    );
    if (acceptance && (
      acceptance.stage_hash !== checkpoint.stage_hash
      || !stableEqual(acceptance.manifest, checkpoint.manifest)
      || (checkpoint.legacy_freeze_inventory !== undefined
        && acceptance.validation_head.legacy_freeze_inventory_hash
          !== canonicalHash(checkpoint.legacy_freeze_inventory))
    )) {
      throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance checkpoint binding is invalid");
    }
    jobs.push({ bootstrap_job_ref: jobRef, checkpoint_ref: checkpointRef, acceptance });
  }
  if (!jobs.length) return { state: "none", jobs: [] };
  return {
    state: jobs.some((entry) => entry.acceptance === null) ? "pending" : "accepted",
    jobs,
  };
}

export async function readBootstrapAcceptanceCompanion(
  root,
  bootstrapJobRefInput,
  checkpointRefInput,
  options = {},
) {
  const workspaceRoot = resolve(root || ".");
  const bootstrapJobRef = normalizeBootstrapJobRef(bootstrapJobRefInput);
  const checkpointRef = normalizeCheckpointRef(checkpointRefInput, bootstrapJobRef);
  const path = acceptancePathFor(bootstrapJobRef);
  const source = await readOptionalRegularFile(workspaceRoot, path);
  if (source === null) {
    if (options.optional === true) return null;
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance companion is missing");
  }
  let parsed;
  try {
    parsed = parseYaml(source.toString("utf8"));
  } catch {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance companion is unreadable");
  }
  let acceptance;
  try {
    acceptance = normalizeBootstrapAcceptanceFact(parsed);
  } catch {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance companion is invalid");
  }
  if (
    !sameJobRef(acceptance.bootstrap_job_ref, bootstrapJobRef)
    || !stableEqual(acceptance.checkpoint_ref, checkpointRef)
  ) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance companion binding is invalid");
  }
  return acceptance;
}

export async function validateBootstrapAcceptanceCommit(root, acceptanceInput, manifestInput) {
  const workspaceRoot = resolve(root || ".");
  const acceptance = normalizeBootstrapAcceptanceFact(acceptanceInput);
  const path = acceptancePathFor(acceptance.bootstrap_job_ref);
  const expectedPath = acceptancePathFor(acceptance.bootstrap_job_ref);
  if (path !== expectedPath) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance path is invalid");
  }
  const checkpoint = await readRequiredCheckpoint(workspaceRoot, acceptance.bootstrap_job_ref);
  const checkpointRef = checkpointReference(acceptance.bootstrap_job_ref, checkpoint);
  if (
    !stableEqual(acceptance.checkpoint_ref, checkpointRef)
    || acceptance.stage_hash !== checkpoint.stage_hash
    || !stableEqual(acceptance.manifest, checkpoint.manifest)
  ) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance checkpoint binding is invalid");
  }
  let manifest;
  try {
    manifest = validateWorkspaceManifest(manifestInput);
  } catch {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance manifest is invalid");
  }
  const currentManifest = await readOptionalRegularFile(workspaceRoot, WORKSPACE_MANIFEST_PATH);
  if (currentManifest === null || byteHash(currentManifest) !== checkpoint.manifest.sha256) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance manifest binding has drifted");
  }
  let parsedCurrent;
  try {
    parsedCurrent = validateWorkspaceManifest(parseYaml(currentManifest.toString("utf8")));
  } catch {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance manifest is unreadable");
  }
  if (!stableEqual(parsedCurrent, manifest)) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance transaction cannot change the manifest");
  }
  const existing = await readOptionalRegularFile(workspaceRoot, path);
  if (existing !== null) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance companion is immutable");
  }
  return {
    acceptance,
    path,
    content: `${stringifyYaml(acceptance).trimEnd()}\n`,
  };
}

export function normalizeBootstrapAcceptanceFact(value) {
  const input = normalizeCanonicalMapping(value, "Bootstrap acceptance fact");
  assertExactKeys(input, [
    "schema_version",
    "authority_role",
    "acceptance_kind",
    "acceptance_state",
    "bootstrap_job_ref",
    "checkpoint_ref",
    "stage_hash",
    "manifest",
    "mode",
    "accepted_at",
    "evidence_refs",
    "validation_head",
    "semantic_hash",
  ]);
  if (
    input.schema_version !== BOOTSTRAP_SCHEMA_VERSION
    || input.authority_role !== "bootstrap_acceptance"
    || input.acceptance_kind !== "bootstrap_activation"
    || input.acceptance_state !== "accepted"
    || !new Set(["strict", "reconciliation"]).has(input.mode)
  ) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance header is invalid");
  }
  const bootstrapJobRef = normalizeBootstrapJobRef(input.bootstrap_job_ref);
  const checkpointRef = normalizeCheckpointRef(input.checkpoint_ref, bootstrapJobRef);
  const manifest = normalizeManifestBinding(input.manifest);
  const acceptedAt = normalizeTimestamp(input.accepted_at);
  const evidenceRefs = normalizeBootstrapAcceptanceEvidenceRefs(input.evidence_refs);
  const validationHead = normalizeCanonicalMapping(input.validation_head, "Bootstrap acceptance validation_head");
  if (!Object.keys(validationHead).length) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance validation head is empty");
  }
  const verifiedEvidenceHash = normalizeSha256(validationHead.verified_evidence_hash);
  if (verifiedEvidenceHash !== canonicalHash(evidenceRefs)) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance evidence hash binding is invalid");
  }
  normalizeSha256(validationHead.legacy_freeze_inventory_hash);
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "bootstrap_acceptance",
    acceptance_kind: "bootstrap_activation",
    acceptance_state: "accepted",
    bootstrap_job_ref: bootstrapJobRef,
    checkpoint_ref: checkpointRef,
    stage_hash: normalizeSha256(input.stage_hash),
    manifest,
    mode: input.mode,
    accepted_at: acceptedAt,
    evidence_refs: evidenceRefs,
    validation_head: validationHead,
  };
  const semanticHash = normalizeSha256(input.semantic_hash);
  if (semanticHash !== canonicalHash(durable)) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance semantic hash is invalid");
  }
  return { ...durable, semantic_hash: semanticHash };
}

export function buildBootstrapAcceptanceFact(input) {
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "bootstrap_acceptance",
    acceptance_kind: "bootstrap_activation",
    acceptance_state: "accepted",
    bootstrap_job_ref: normalizeBootstrapJobRef(input.bootstrap_job_ref),
    checkpoint_ref: normalizeCheckpointRef(input.checkpoint_ref, input.bootstrap_job_ref),
    stage_hash: normalizeSha256(input.stage_hash),
    manifest: normalizeManifestBinding(input.manifest),
    mode: input.mode,
    accepted_at: normalizeTimestamp(input.accepted_at),
    evidence_refs: normalizeBootstrapAcceptanceEvidenceRefs(input.evidence_refs),
    validation_head: normalizeCanonicalMapping(input.validation_head, "Bootstrap acceptance validation_head"),
  };
  return normalizeBootstrapAcceptanceFact({ ...durable, semantic_hash: canonicalHash(durable) });
}

export function acceptancePathFor(bootstrapJobRefInput) {
  const bootstrapJobRef = normalizeBootstrapJobRef(bootstrapJobRefInput);
  return `${MIGRATIONS_ROOT}/${bootstrapJobRef.id}/acceptance.yaml`;
}

export function isBootstrapAcceptancePath(value) {
  return typeof value === "string"
    && /^\.pipeline\/runtime\/migrations\/[A-Za-z0-9][A-Za-z0-9._-]*\/acceptance\.yaml$/.test(value);
}

export function normalizeBootstrapAcceptanceEvidenceRefs(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance evidence_refs must be a non-empty array");
  }
  const refs = value.map((entry) => {
    const input = normalizeCanonicalMapping(entry, "Bootstrap acceptance evidence ref");
    if (input.type === "snapshot") {
      assertExactKeys(input, ["type", "path", "semantic_hash"]);
      return {
        type: "snapshot",
        path: normalizeRepoPath(input.path),
        semantic_hash: normalizeSha256(input.semantic_hash),
      };
    }
    if (input.type === "file") {
      assertExactKeys(input, ["type", "path", "sha256"]);
      return {
        type: "file",
        path: normalizeRepoPath(input.path),
        sha256: normalizeSha256(input.sha256),
      };
    }
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance evidence type is invalid");
  }).sort((left, right) => evidenceIdentity(left).localeCompare(evidenceIdentity(right)));
  if (new Set(refs.map(evidenceIdentity)).size !== refs.length) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance evidence contains duplicate references");
  }
  return refs;
}

export function normalizeLegacyFreezeInventory(value) {
  if (!Array.isArray(value) || value.length !== LEGACY_FREEZE_PATHS.length) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap legacy freeze inventory must cover exactly four files");
  }
  const entries = value.map((entry) => {
    const input = normalizeCanonicalMapping(entry, "Bootstrap legacy freeze inventory entry");
    assertExactKeys(input, ["path", "sha256", "size_bytes", "mtime_ns"]);
    const path = normalizeRepoPath(input.path);
    if (!LEGACY_FREEZE_PATHS.includes(path)) {
      throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap legacy freeze inventory path is invalid");
    }
    if (!Number.isSafeInteger(input.size_bytes) || input.size_bytes < 0) {
      throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap legacy freeze inventory size is invalid");
    }
    if (typeof input.mtime_ns !== "string" || !/^\d+$/.test(input.mtime_ns)) {
      throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap legacy freeze inventory mtime is invalid");
    }
    return {
      path,
      sha256: normalizeSha256(input.sha256),
      size_bytes: input.size_bytes,
      mtime_ns: input.mtime_ns,
    };
  }).sort((left, right) => left.path.localeCompare(right.path));
  if (!stableEqual(entries.map((entry) => entry.path), LEGACY_FREEZE_PATHS)) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap legacy freeze inventory coverage is invalid");
  }
  return entries;
}

export function normalizeLegacyFreezeCompatibilityBinding(value) {
  const input = normalizeCanonicalMapping(value, "Bootstrap legacy freeze compatibility binding");
  assertExactKeys(input, [
    "schema_version",
    "authority_role",
    "binding_kind",
    "bootstrap_job_ref",
    "checkpoint_ref",
    "legacy_freeze_inventory",
    "semantic_hash",
  ]);
  if (
    input.schema_version !== BOOTSTRAP_SCHEMA_VERSION
    || input.authority_role !== "bootstrap_legacy_freeze_binding"
    || input.binding_kind !== "sealed_checkpoint_compatibility"
  ) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap legacy freeze compatibility header is invalid");
  }
  const bootstrapJobRef = normalizeBootstrapJobRef(input.bootstrap_job_ref);
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "bootstrap_legacy_freeze_binding",
    binding_kind: "sealed_checkpoint_compatibility",
    bootstrap_job_ref: bootstrapJobRef,
    checkpoint_ref: normalizeCheckpointRef(input.checkpoint_ref, bootstrapJobRef),
    legacy_freeze_inventory: normalizeLegacyFreezeInventory(input.legacy_freeze_inventory),
  };
  const semanticHash = normalizeSha256(input.semantic_hash);
  if (semanticHash !== canonicalHash(durable)) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap legacy freeze compatibility semantic hash is invalid");
  }
  return { ...durable, semantic_hash: semanticHash };
}

async function readOptionalCheckpoint(root, bootstrapJobRef) {
  const path = checkpointPathFor(bootstrapJobRef);
  const source = await readOptionalRegularFile(root, path);
  if (source === null) return null;
  return parseCheckpoint(source, bootstrapJobRef);
}

async function readRequiredCheckpoint(root, bootstrapJobRef) {
  const checkpoint = await readOptionalCheckpoint(root, bootstrapJobRef);
  if (!checkpoint) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance checkpoint is missing");
  }
  return checkpoint;
}

function parseCheckpoint(source, bootstrapJobRef) {
  let parsed;
  try {
    parsed = normalizeCanonicalMapping(parseYaml(source.toString("utf8")), "Bootstrap rollback checkpoint");
    assertExactKeys(parsed, [
      "schema_version",
      "authority_role",
      "checkpoint_kind",
      "bootstrap_job_ref",
      "stage_hash",
      "manifest",
      "new_files",
      "acceptance_state",
      "legacy_freeze_inventory",
      "semantic_hash",
    ], [
      "schema_version",
      "authority_role",
      "checkpoint_kind",
      "bootstrap_job_ref",
      "stage_hash",
      "manifest",
      "new_files",
      "acceptance_state",
      "semantic_hash",
    ]);
    if (
      parsed.schema_version !== BOOTSTRAP_SCHEMA_VERSION
      || parsed.authority_role !== "rollback_checkpoint"
      || parsed.checkpoint_kind !== "bootstrap_pre_acceptance"
      || parsed.acceptance_state !== "pending"
    ) throw new Error("invalid header");
    const jobRef = normalizeBootstrapJobRef(parsed.bootstrap_job_ref);
    if (!sameJobRef(jobRef, bootstrapJobRef)) throw new Error("invalid job binding");
    const files = normalizeFileInventory(parsed.new_files);
    const durable = {
      schema_version: BOOTSTRAP_SCHEMA_VERSION,
      authority_role: "rollback_checkpoint",
      checkpoint_kind: "bootstrap_pre_acceptance",
      bootstrap_job_ref: jobRef,
      stage_hash: normalizeSha256(parsed.stage_hash),
      manifest: normalizeManifestBinding(parsed.manifest),
      new_files: files,
      acceptance_state: "pending",
      ...(parsed.legacy_freeze_inventory === undefined
        ? {}
        : { legacy_freeze_inventory: normalizeLegacyFreezeInventory(parsed.legacy_freeze_inventory) }),
    };
    const semanticHash = normalizeSha256(parsed.semantic_hash);
    if (semanticHash !== canonicalHash(durable)) throw new Error("invalid semantic hash");
    return { ...durable, semantic_hash: semanticHash };
  } catch {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance checkpoint is invalid");
  }
}

function normalizeFileInventory(value) {
  if (!Array.isArray(value) || !value.length) throw new Error("empty inventory");
  const paths = new Set();
  const files = value.map((entry) => {
    const normalized = normalizeCanonicalMapping(entry, "Bootstrap checkpoint file");
    assertExactKeys(normalized, ["path", "sha256"]);
    const path = normalizeRepoPath(normalized.path);
    if (paths.has(path)) throw new Error("duplicate path");
    paths.add(path);
    return { path, sha256: normalizeSha256(normalized.sha256) };
  }).sort((left, right) => left.path.localeCompare(right.path));
  return files;
}

function normalizeManifestBinding(value) {
  const input = normalizeCanonicalMapping(value, "Bootstrap acceptance manifest");
  assertExactKeys(input, ["path", "sha256"]);
  if (input.path !== WORKSPACE_MANIFEST_PATH) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance manifest path is invalid");
  }
  return { path: WORKSPACE_MANIFEST_PATH, sha256: normalizeSha256(input.sha256) };
}

function normalizeCheckpointRef(value, bootstrapJobRefInput) {
  const bootstrapJobRef = normalizeBootstrapJobRef(bootstrapJobRefInput);
  const input = normalizeCanonicalMapping(value, "Bootstrap acceptance checkpoint ref");
  assertExactKeys(input, ["path", "semantic_hash"]);
  const path = normalizeRepoPath(input.path);
  if (path !== checkpointPathFor(bootstrapJobRef)) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance checkpoint path is invalid");
  }
  return { path, semantic_hash: normalizeSha256(input.semantic_hash) };
}

function checkpointReference(bootstrapJobRef, checkpoint) {
  return {
    path: checkpointPathFor(bootstrapJobRef),
    semantic_hash: checkpoint.semantic_hash,
  };
}

function checkpointPathFor(bootstrapJobRef) {
  return `${MIGRATIONS_ROOT}/${normalizeBootstrapJobRef(bootstrapJobRef).id}/rollback-checkpoint.yaml`;
}

function normalizeBootstrapJobRef(value) {
  const input = normalizeCanonicalMapping(value, "Bootstrap job ref");
  assertExactKeys(input, ["kind", "id"]);
  if (input.kind !== "bootstrap_job" || !isSafeComponent(input.id)) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance job ref is invalid");
  }
  return { kind: "bootstrap_job", id: input.id };
}

function normalizeTimestamp(value) {
  const rendered = String(value ?? "");
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(rendered)
    || !Number.isFinite(Date.parse(rendered))
  ) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance timestamp is invalid");
  }
  return rendered;
}

function normalizeSha256(value) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance digest is invalid");
  }
  return value;
}

function normalizeRepoPath(value) {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !value
    || value.includes("\0")
    || value.includes("\\")
    || value.startsWith("/")
    || value.split("/").some((part) => !part || part === "." || part === "..")
  ) throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance path is invalid");
  return value;
}

function normalizeCanonicalMapping(value, field) {
  const normalized = normalizeCanonicalValue(value);
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", `${field} must be a mapping`);
  }
  return normalized;
}

function normalizeCanonicalValue(value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance data is invalid");
    return Object.is(value, -0) ? 0 : value;
  }
  if (!value || typeof value !== "object" || seen.has(value)) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance data is invalid");
  }
  seen.add(value);
  let normalized;
  if (Array.isArray(value)) {
    normalized = value.map((entry) => normalizeCanonicalValue(entry, seen));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance data is invalid");
    }
    normalized = {};
    for (const key of Object.keys(value).sort()) {
      if (!key || /[\0\r\n]/.test(key) || value[key] === undefined) {
        throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance data is invalid");
      }
      normalized[key] = normalizeCanonicalValue(value[key], seen);
    }
  }
  seen.delete(value);
  return normalized;
}

function assertExactKeys(value, allowedKeys, requiredKeys = allowedKeys) {
  const allowed = new Set(allowedKeys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance contains unsupported fields");
  }
  if (requiredKeys.some((key) => !Object.hasOwn(value, key))) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance is incomplete");
  }
}

function evidenceIdentity(value) {
  return `${value.type}\0${value.path}`;
}

async function readOptionalDirectory(root, relativePath) {
  const guarded = await assertWorkspacePathAllowed(root, relativePath, {
    allowedRoots: [".pipeline/runtime"],
    allowRoot: true,
    allowTransactionPaths: true,
  });
  try {
    return (await readdir(guarded.path, { withFileTypes: true }))
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return [];
    throw error;
  }
}

async function readOptionalRegularFile(root, relativePath) {
  const guarded = await assertWorkspacePathAllowed(root, relativePath, {
    ...(relativePath === WORKSPACE_MANIFEST_PATH ? { allowedRoots: [".pipeline"] } : {}),
    allowTransactionPaths: true,
  });
  let stats;
  try {
    stats = await lstat(guarded.path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw acceptanceError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance authority path is invalid");
  }
  return readFile(guarded.path);
}

function byteHash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function isSafeComponent(value) {
  return typeof value === "string" && SAFE_COMPONENT.test(value) && value !== "." && value !== "..";
}

function sameJobRef(left, right) {
  return left?.kind === right?.kind && left?.id === right?.id;
}

function stableEqual(left, right) {
  return canonicalHash(left) === canonicalHash(right);
}

function acceptanceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
