import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeSafeIdentifier,
  normalizeTimestamp,
  readCurrentManifest,
} from "../runtime/internal.js";
import { parseYaml, stringifyYaml } from "../serialization/index.js";
import { assertWorkspacePathAllowed, commitWorkspaceTransaction } from "../workspace-store/index.js";

const REGISTRY_PATH = ".pipeline/runtime/repository-targets.yaml";
const AVAILABILITY = new Set(["available", "unavailable"]);
const SHA = /^[a-f0-9]{40,64}$/;

export function createRepositoryTargetStore(input = {}) {
  assertPlainObject(input, "Repository Target store options");
  assertExactKeys(input, ["clock"], "Repository Target store options");
  if (typeof input.clock !== "function") {
    throw repositoryError("ERR_REPOSITORY_TARGET_SCHEMA_INVALID", "Repository Target store clock must be a zero-argument function");
  }
  const clock = input.clock;
  return Object.freeze({
    register(root, request, options = {}) {
      return register(root, request, options, clock);
    },
    read,
    list,
    updateLocator(root, request, options = {}) {
      return updateLocator(root, request, options, clock);
    },
  });
}

async function register(root, request, options, clock) {
  const repository = normalizeRepositoryTargetInternal({
    ...request,
    generation: 1,
    created_at: now(clock),
    updated_at: now(clock),
  }, { stored: false });
  const registry = await readRegistry(root);
  if (registry.value.repositories.some(({ id }) => id === repository.id)) {
    throw repositoryError("ERR_REPOSITORY_TARGET_EXISTS", `Repository Target ${repository.id} already exists`);
  }
  await persist(root, withRepository(registry.value, repository), registry.hash, options, `repository-target-register-${repository.id}`);
  return clone(repository);
}

async function read(root, repositoryIdInput) {
  const repositoryId = normalizeSafeIdentifier(repositoryIdInput, "Repository Target id");
  const repository = (await readRegistry(root)).value.repositories.find(({ id }) => id === repositoryId);
  if (!repository) throw repositoryError("ERR_REPOSITORY_TARGET_NOT_FOUND", `Repository Target ${repositoryId} was not found`);
  return clone(repository);
}

async function list(root) {
  return (await readRegistry(root)).value.repositories.map(clone);
}

async function updateLocator(root, request, options, clock) {
  assertPlainObject(request, "Repository Target locator update");
  assertExactKeys(request, ["repository_id", "expected_generation", "locator"], "Repository Target locator update");
  const repositoryId = normalizeSafeIdentifier(request.repository_id, "Repository Target repository_id");
  if (!Number.isSafeInteger(request.expected_generation) || request.expected_generation < 1) {
    throw repositoryError("ERR_REPOSITORY_TARGET_SCHEMA_INVALID", "Repository Target expected_generation must be a positive integer");
  }
  const locator = normalizeLocator(request.locator);
  const registry = await readRegistry(root);
  const current = registry.value.repositories.find(({ id }) => id === repositoryId);
  if (!current) throw repositoryError("ERR_REPOSITORY_TARGET_NOT_FOUND", `Repository Target ${repositoryId} was not found`);
  if (current.generation !== request.expected_generation) {
    throw repositoryError("ERR_REPOSITORY_TARGET_GENERATION_CONFLICT", "Repository Target generation is stale");
  }
  const next = normalizeRepositoryTarget({
    ...current,
    locator,
    generation: current.generation + 1,
    updated_at: now(clock),
  }, { stored: true });
  await persist(root, withRepository(registry.value, next), registry.hash, options, `repository-target-move-${repositoryId}`);
  return clone(next);
}

export function normalizeRepositoryTarget(value) {
  return normalizeRepositoryTargetInternal(value, { stored: true });
}

function normalizeRepositoryTargetInternal(value, options = { stored: true }) {
  assertPlainObject(value, "Repository Target");
  const inputKeys = ["id", "repository_identity", "locator", "git", "integration_targets"];
  const storedKeys = [...inputKeys, "schema_version", "generation", "created_at", "updated_at"];
  assertExactKeys(value, options.stored === false ? [...inputKeys, "generation", "created_at", "updated_at"] : storedKeys, "Repository Target");
  assertPlainObject(value.repository_identity, "Repository Target repository_identity");
  assertExactKeys(value.repository_identity, ["vcs", "canonical_id"], "Repository Target repository_identity");
  if (value.repository_identity.vcs !== "git") {
    throw repositoryError("ERR_REPOSITORY_TARGET_SCHEMA_INVALID", "Repository Target repository_identity.vcs must be git");
  }
  const canonicalId = normalizeText(value.repository_identity.canonical_id, "repository_identity.canonical_id");
  assertPlainObject(value.git, "Repository Target git");
  assertExactKeys(value.git, ["base_ref", "base_commit"], "Repository Target git");
  const baseRef = normalizeText(value.git.base_ref, "git.base_ref");
  const baseCommit = normalizeCommit(value.git.base_commit, "git.base_commit");
  if (!Array.isArray(value.integration_targets) || value.integration_targets.length === 0) {
    throw repositoryError("ERR_REPOSITORY_TARGET_SCHEMA_INVALID", "Repository Target requires at least one integration target");
  }
  const targets = value.integration_targets.map(normalizeIntegrationTarget);
  if (new Set(targets.map(({ id }) => id)).size !== targets.length) {
    throw repositoryError("ERR_REPOSITORY_TARGET_SCHEMA_INVALID", "Repository Target integration target ids must be unique");
  }
  if (targets.filter(({ role }) => role === "primary").length !== 1) {
    throw repositoryError("ERR_REPOSITORY_TARGET_SCHEMA_INVALID", "Repository Target requires exactly one primary integration target");
  }
  if (!Number.isSafeInteger(value.generation) || value.generation < 1) {
    throw repositoryError("ERR_REPOSITORY_TARGET_SCHEMA_INVALID", "Repository Target generation must be a positive integer");
  }
  const normalized = {
    schema_version: "1",
    id: normalizeSafeIdentifier(value.id, "Repository Target id"),
    generation: value.generation,
    repository_identity: { vcs: "git", canonical_id: canonicalId },
    locator: normalizeLocator(value.locator),
    git: { base_ref: baseRef, base_commit: baseCommit },
    integration_targets: targets.sort((left, right) => left.id.localeCompare(right.id)),
    created_at: normalizeTimestamp(value.created_at, "Repository Target created_at"),
    updated_at: normalizeTimestamp(value.updated_at, "Repository Target updated_at"),
  };
  assertNoRawSecrets(normalized, "Repository Target");
  return normalized;
}

function normalizeLocator(value) {
  assertPlainObject(value, "Repository Target locator");
  assertExactKeys(value, ["path", "availability"], "Repository Target locator");
  if (!AVAILABILITY.has(value.availability)) {
    throw repositoryError("ERR_REPOSITORY_TARGET_SCHEMA_INVALID", "Repository Target locator availability is invalid");
  }
  return { path: normalizeRelativePath(value.path, "locator.path"), availability: value.availability };
}

function normalizeIntegrationTarget(value) {
  assertPlainObject(value, "Repository Target integration target");
  assertExactKeys(value, ["id", "role", "checkout_path", "branch"], "Repository Target integration target");
  if (!new Set(["primary", "alternate"]).has(value.role)) {
    throw repositoryError("ERR_REPOSITORY_TARGET_SCHEMA_INVALID", "Repository Target integration target role is invalid");
  }
  return {
    id: normalizeSafeIdentifier(value.id, "integration target id"),
    role: value.role,
    checkout_path: normalizeRelativePath(value.checkout_path, "integration target checkout_path"),
    branch: normalizeText(value.branch, "integration target branch"),
  };
}

function normalizeRelativePath(value, label) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.startsWith("/") || value.includes("\\")) {
    throw repositoryError("ERR_REPOSITORY_TARGET_PATH_INVALID", `Repository Target ${label} is unsafe`);
  }
  if (value.split("/").some((part) => !part || part === "." || part === "..")) {
    throw repositoryError("ERR_REPOSITORY_TARGET_PATH_INVALID", `Repository Target ${label} contains traversal`);
  }
  return value;
}

function normalizeCommit(value, label) {
  if (typeof value !== "string" || !SHA.test(value)) {
    throw repositoryError("ERR_REPOSITORY_TARGET_SCHEMA_INVALID", `Repository Target ${label} must be a Git commit`);
  }
  return value;
}

function normalizeText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw repositoryError("ERR_REPOSITORY_TARGET_SCHEMA_INVALID", `Repository Target ${label} must be non-empty text`);
  }
  return value.trim();
}

async function readRegistry(root) {
  const guard = await assertWorkspacePathAllowed(resolve(root || "."), REGISTRY_PATH);
  try {
    const stats = await lstat(guard.path);
    if (!stats.isFile() || stats.isSymbolicLink()) throw repositoryError("ERR_REPOSITORY_TARGET_REGISTRY_INVALID", "Repository Target registry is unsafe");
    const bytes = await readFile(guard.path);
    const parsed = parseYaml(bytes.toString("utf8"));
    if (parsed?.schema_version !== "1" || !Array.isArray(parsed.repositories)) throw new Error("invalid registry");
    const repositories = parsed.repositories.map((repository) => normalizeRepositoryTargetInternal(repository, { stored: true }));
    repositories.sort((left, right) => left.id.localeCompare(right.id));
    return { value: { schema_version: "1", repositories }, hash: createHash("sha256").update(bytes).digest("hex") };
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      return { value: { schema_version: "1", repositories: [] }, hash: null };
    }
    if (error?.code) throw error;
    throw repositoryError("ERR_REPOSITORY_TARGET_REGISTRY_INVALID", "Repository Target registry is malformed");
  }
}

function withRepository(registry, repository) {
  const repositories = registry.repositories.filter(({ id }) => id !== repository.id);
  repositories.push(repository);
  repositories.sort((left, right) => left.id.localeCompare(right.id));
  return { schema_version: "1", repositories };
}

async function persist(root, registry, expectedHash, options, fallbackId) {
  const operation = normalizeOperation(options, fallbackId);
  const manifest = await readCurrentManifest(root);
  await commitWorkspaceTransaction(root, {
    id: operation.id,
    ...(operation.faultInjector ? { faultInjector: operation.faultInjector } : {}),
    manifest,
    writes: [{ path: REGISTRY_PATH, content: renderYaml(registry), expected_hash: expectedHash }],
  });
}

function normalizeOperation(value, fallbackId) {
  assertPlainObject(value, "Repository Target transaction options");
  assertExactKeys(value, ["id", "faultInjector"], "Repository Target transaction options");
  return {
    id: value.id === undefined ? fallbackId : normalizeSafeIdentifier(value.id, "Repository Target transaction id"),
    ...(value.faultInjector === undefined ? {} : { faultInjector: value.faultInjector }),
  };
}

function now(clock) {
  return normalizeTimestamp(clock(), "Repository Target clock value");
}

function renderYaml(value) {
  return `${stringifyYaml(value).trimEnd()}\n`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function repositoryError(code, message) {
  return authorityError(code, message);
}
