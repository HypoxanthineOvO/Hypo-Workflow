import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  readdir,
  realpath,
  rm,
} from "node:fs/promises";
import { promisify } from "node:util";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { buildDeletionReceiptContext } from "../permissions/index.js";
import { createReceiptStore } from "../receipts/index.js";
import { canonicalHash, stringifyYaml } from "../serialization/index.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
  normalizeSha256,
  normalizeTransactionOptions,
  readCurrentManifest,
} from "../runtime/internal.js";
import { commitWorkspaceTransaction } from "../workspace-store/index.js";
import { normalizeDeletionPath } from "./policy.js";

const execFileAsync = promisify(execFile);
const DELETION_SCHEMA_VERSION = "1";
const MANIFEST_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "reason",
  "replacement",
  "git",
  "entries",
  "manifest_hash",
]);
const deletionLocks = new Map();
const receiptStore = createReceiptStore({ clock: () => new Date().toISOString() });

export async function buildDeletionManifest(root, input) {
  const request = normalizeBuildInput(input);
  const workspace = await normalizeWorkspaceRoot(root);
  const paths = normalizeDeletionPaths(request.paths);
  const entries = [];
  for (const path of paths) entries.push(await inspectDeletionTarget(workspace, path));
  const git = await readGitBinding(workspace, paths);
  const body = {
    schema_version: DELETION_SCHEMA_VERSION,
    authority_role: "deletion_manifest",
    reason: request.reason,
    replacement: request.replacement,
    git,
    entries,
  };
  return { ...body, manifest_hash: canonicalHash(body) };
}

export async function validateDeletionManifest(root, manifestInput) {
  const manifest = normalizeDeletionManifest(manifestInput);
  const workspace = await normalizeWorkspaceRoot(root);
  const currentEntries = [];
  for (const entry of manifest.entries) {
    currentEntries.push(await inspectDeletionTarget(workspace, entry.path));
  }
  const currentGit = await readGitBinding(workspace, manifest.entries.map((entry) => entry.path));
  if (canonicalHash(currentEntries) !== canonicalHash(manifest.entries)) {
    throw authorityError("ERR_DELETION_TARGET_DRIFT", "Deletion target content or tree hash drift was detected");
  }
  if (canonicalHash(currentGit) !== canonicalHash(manifest.git)) {
    throw authorityError("ERR_DELETION_GIT_DRIFT", "Deletion Manifest Git binding drift was detected");
  }
  return clone(manifest);
}

export async function executeDeletionManifest(root, input, options = {}) {
  return executeDeletionWithAuthority(root, root, input, options);
}

export async function executeRepositoryDeletionManifest(authorityRoot, targetRoot, input, options = {}) {
  return executeDeletionWithAuthority(authorityRoot, targetRoot, input, options);
}

async function executeDeletionWithAuthority(authorityRoot, targetRoot, input, options) {
  assertPlainObject(input, "Deletion execution input");
  assertExactKeys(input, ["manifest", "receipt_id", "actor", "tool_use_id"], "Deletion execution input");
  if (typeof input.receipt_id !== "string" || !input.receipt_id) {
    throw authorityError("ERR_DELETION_RECEIPT_REQUIRED", "A deletion Receipt is required");
  }
  const manifest = normalizeDeletionManifest(input.manifest);
  const toolUseId = normalizeSafeIdentifier(input.tool_use_id, "Deletion execution tool_use_id");
  const context = buildDeletionReceiptContext(manifest, { actor: input.actor });
  const operation = normalizeTransactionOptions(options, "deletion-execute", {
    manifest_hash: manifest.manifest_hash,
    receipt_id: input.receipt_id,
    tool_use_id: toolUseId,
  });
  return withDeletionLock(`${resolve(authorityRoot)}\0${resolve(targetRoot)}`, async () => {
    const reserved = await receiptStore.reserveReceipt(authorityRoot, input.receipt_id, context, {
      id: `${operation.id}-reserve`,
      faultInjector: operation.faultInjector,
      tool_use_id: toolUseId,
    });
    try {
      await validateDeletionManifest(targetRoot, manifest);
    } catch (error) {
      await invalidateReservedReceipt(authorityRoot, input.receipt_id, operation, "deletion_manifest_drift", error);
      throw error;
    }

    const reportPath = `.pipeline/runtime/evidence/deletion/reports/${operation.id}.yaml`;
    try {
      await writeExecutionReport(authorityRoot, reportPath, buildExecutionReport(
        manifest,
        context.actor,
        input.receipt_id,
        toolUseId,
        [],
        "prepared",
        reserved.receipt.reserved_at,
      ), operation, "report-prepared");
    } catch (error) {
      await invalidateReservedReceipt(authorityRoot, input.receipt_id, operation, "deletion_evidence_prepare_failed", error);
      throw error;
    }

    const workspace = await normalizeWorkspaceRoot(targetRoot);
    const deletedPaths = [];
    try {
      for (const entry of manifest.entries) {
        await rm(resolve(workspace.real, entry.path), {
          force: false,
          recursive: entry.kind === "directory",
        });
        deletedPaths.push(entry.path);
      }
    } catch (error) {
      await invalidateReservedReceipt(authorityRoot, input.receipt_id, operation, "deletion_execution_failed", error);
      throw authorityError(
        "ERR_DELETION_EXECUTION_FAILED",
        `Controlled deletion failed after ${deletedPaths.length} target(s): ${error.message}`,
      );
    }

    const consumed = await receiptStore.consumeReceipt(authorityRoot, input.receipt_id, context, {
      id: `${operation.id}-consume`,
      faultInjector: operation.faultInjector,
      tool_use_id: toolUseId,
    });
    const report = buildExecutionReport(
      manifest,
      context.actor,
      input.receipt_id,
      toolUseId,
      deletedPaths,
      "applied",
      consumed.receipt.consumed_at,
    );
    const reportContent = await writeExecutionReport(authorityRoot, reportPath, report, operation, "report-applied");
    return {
      manifest_hash: manifest.manifest_hash,
      receipt_id: input.receipt_id,
      deleted_paths: deletedPaths,
      report_ref: {
        type: "file",
        path: reportPath,
        digest: `sha256:${hashBytes(Buffer.from(reportContent, "utf8"))}`,
      },
    };
  });
}

function normalizeBuildInput(value) {
  assertPlainObject(value, "Deletion Manifest input");
  assertExactKeys(value, ["paths", "reason", "replacement"], "Deletion Manifest input");
  assertNoRawSecrets(value, "Deletion Manifest input");
  if (!Array.isArray(value.paths) || value.paths.length === 0) {
    throw authorityError("ERR_DELETION_MANIFEST_INVALID", "Deletion Manifest paths must be a non-empty array");
  }
  return {
    paths: value.paths,
    reason: normalizeText(value.reason, "Deletion Manifest reason", 4096),
    replacement: normalizeText(value.replacement, "Deletion Manifest replacement", 1024),
  };
}

function normalizeDeletionManifest(value) {
  assertPlainObject(value, "Deletion Manifest");
  assertExactKeys(value, MANIFEST_KEYS, "Deletion Manifest");
  assertNoRawSecrets(value, "Deletion Manifest");
  if (value.schema_version !== DELETION_SCHEMA_VERSION || value.authority_role !== "deletion_manifest") {
    throw authorityError("ERR_DELETION_MANIFEST_INVALID", "Deletion Manifest schema or authority role is invalid");
  }
  const normalized = normalizeCanonicalValue(value, "Deletion Manifest");
  const manifestHash = normalizeSha256(normalized.manifest_hash, "Deletion Manifest manifest_hash");
  const { manifest_hash: _hash, ...body } = normalized;
  if (canonicalHash(body) !== manifestHash) {
    throw authorityError("ERR_DELETION_MANIFEST_INTEGRITY", "Deletion Manifest hash does not match its exact bindings");
  }
  normalizeText(normalized.reason, "Deletion Manifest reason", 4096);
  normalizeText(normalized.replacement, "Deletion Manifest replacement", 1024);
  const git = normalizeGitBinding(normalized.git);
  if (!Array.isArray(normalized.entries) || normalized.entries.length === 0) {
    throw authorityError("ERR_DELETION_MANIFEST_INVALID", "Deletion Manifest entries must be a non-empty array");
  }
  const paths = normalizeDeletionPaths(normalized.entries.map((entry) => entry?.path));
  const entriesByPath = new Map(normalized.entries.map((entry) => [entry.path, normalizeManifestEntry(entry)]));
  const entries = paths.map((path) => entriesByPath.get(path));
  return { ...body, git, entries, manifest_hash: manifestHash };
}

function normalizeManifestEntry(value) {
  assertPlainObject(value, "Deletion Manifest entry");
  assertExactKeys(value, ["path", "kind", "sha256", "size_bytes", "entry_count"], "Deletion Manifest entry");
  const path = normalizeDeletionPath(value.path);
  if (value.kind !== "file" && value.kind !== "directory") {
    throw authorityError("ERR_DELETION_MANIFEST_INVALID", "Deletion Manifest entry kind must be file or directory");
  }
  const sha256 = normalizeSha256(value.sha256, "Deletion Manifest entry sha256");
  if (value.kind === "file") {
    if (!Number.isSafeInteger(value.size_bytes) || value.size_bytes < 0 || Object.hasOwn(value, "entry_count")) {
      throw authorityError("ERR_DELETION_MANIFEST_INVALID", "Deletion file entry requires a non-negative size_bytes only");
    }
    return { path, kind: "file", sha256, size_bytes: value.size_bytes };
  }
  if (!Number.isSafeInteger(value.entry_count) || value.entry_count < 0 || Object.hasOwn(value, "size_bytes")) {
    throw authorityError("ERR_DELETION_MANIFEST_INVALID", "Deletion directory entry requires a non-negative entry_count only");
  }
  return { path, kind: "directory", sha256, entry_count: value.entry_count };
}

function normalizeGitBinding(value) {
  assertPlainObject(value, "Deletion Manifest git binding");
  assertExactKeys(value, ["head", "tree", "target_state_hash"], "Deletion Manifest git binding");
  return {
    head: normalizeGitObjectId(value.head, "HEAD"),
    tree: normalizeGitObjectId(value.tree, "HEAD tree"),
    target_state_hash: normalizeSha256(value.target_state_hash, "Deletion Manifest git.target_state_hash"),
  };
}

function normalizeDeletionPaths(values) {
  const paths = values.map(normalizeDeletionPath).sort((left, right) => left.localeCompare(right));
  const seen = new Set();
  for (const path of paths) {
    if (seen.has(path)) throw authorityError("ERR_DELETION_PATH_OVERLAP", `Duplicate deletion path is forbidden: ${path}`);
    for (const ancestor of seen) {
      if (path.startsWith(`${ancestor}/`)) {
        throw authorityError("ERR_DELETION_PATH_OVERLAP", `Deletion ancestor overlap is forbidden: ${ancestor} and ${path}`);
      }
    }
    seen.add(path);
  }
  return paths;
}

async function inspectDeletionTarget(workspace, path) {
  const target = await resolveSafeExistingPath(workspace, path);
  const stats = await lstat(target);
  if (stats.isSymbolicLink()) {
    throw authorityError("ERR_DELETION_PATH_FORBIDDEN", `Deletion target symlink is forbidden: ${path}`);
  }
  if (stats.isFile()) {
    return { path, kind: "file", sha256: hashBytes(await readFile(target)), size_bytes: stats.size };
  }
  if (!stats.isDirectory()) {
    throw authorityError("ERR_DELETION_PATH_FORBIDDEN", `Deletion target must be a regular file or directory: ${path}`);
  }
  const tree = [];
  await collectTreeEntries(workspace, target, path, "", tree);
  return { path, kind: "directory", sha256: canonicalHash(tree), entry_count: tree.length };
}

async function collectTreeEntries(workspace, absoluteDirectory, rootPath, relativeDirectory, output) {
  const names = (await readdir(absoluteDirectory)).sort((left, right) => left.localeCompare(right));
  for (const name of names) {
    const relativePath = relativeDirectory ? `${relativeDirectory}/${name}` : name;
    const repoPath = `${rootPath}/${relativePath}`;
    normalizeDeletionPath(repoPath, "Deletion tree path");
    const absolutePath = resolve(absoluteDirectory, name);
    const stats = await lstat(absolutePath);
    if (stats.isSymbolicLink()) {
      throw authorityError("ERR_DELETION_PATH_FORBIDDEN", `Deletion tree contains a symlink: ${repoPath}`);
    }
    const resolved = await realpath(absolutePath);
    if (!isInside(workspace.real, resolved)) {
      throw authorityError("ERR_DELETION_PATH_FORBIDDEN", `Deletion tree escapes the repository: ${repoPath}`);
    }
    if (stats.isFile()) {
      output.push({ path: relativePath, kind: "file", sha256: hashBytes(await readFile(absolutePath)), size_bytes: stats.size });
    } else if (stats.isDirectory()) {
      output.push({ path: relativePath, kind: "directory" });
      await collectTreeEntries(workspace, absolutePath, rootPath, relativePath, output);
    } else {
      throw authorityError("ERR_DELETION_PATH_FORBIDDEN", `Deletion tree contains a non-regular entry: ${repoPath}`);
    }
  }
}

async function resolveSafeExistingPath(workspace, path) {
  let cursor = workspace.real;
  for (const component of path.split("/")) {
    cursor = resolve(cursor, component);
    let stats;
    try {
      stats = await lstat(cursor);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") {
        throw authorityError("ERR_DELETION_TARGET_DRIFT", `Deletion target is missing or drifted: ${path}`);
      }
      throw error;
    }
    if (stats.isSymbolicLink()) {
      throw authorityError("ERR_DELETION_PATH_FORBIDDEN", `Deletion path contains a symlink: ${path}`);
    }
    const resolved = await realpath(cursor);
    if (!isInside(workspace.real, resolved)) {
      throw authorityError("ERR_DELETION_PATH_FORBIDDEN", `Deletion path escapes the repository: ${path}`);
    }
  }
  return cursor;
}

async function normalizeWorkspaceRoot(root) {
  const requested = resolve(root || ".");
  const real = await realpath(requested);
  const stats = await lstat(real);
  if (!stats.isDirectory()) throw authorityError("ERR_DELETION_ROOT_INVALID", "Deletion workspace root must be a directory");
  const gitRoot = await git(real, ["rev-parse", "--show-toplevel"]);
  const gitReal = await realpath(gitRoot);
  if (gitReal !== real) {
    throw authorityError("ERR_DELETION_ROOT_INVALID", "Deletion workspace root must be the Git repository root");
  }
  return { requested, real };
}

async function readGitBinding(workspace, paths) {
  const [head, tree, indexState, worktreeState] = await Promise.all([
    git(workspace.real, ["rev-parse", "--verify", "HEAD"]),
    git(workspace.real, ["rev-parse", "--verify", "HEAD^{tree}"]),
    git(workspace.real, ["ls-files", "--stage", "--", ...paths], { trim: false }),
    git(workspace.real, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", ...paths], { trim: false }),
  ]);
  return {
    head: normalizeGitObjectId(head, "HEAD"),
    tree: normalizeGitObjectId(tree, "HEAD tree"),
    target_state_hash: canonicalHash({ index: indexState, worktree: worktreeState }),
  };
}

async function git(root, args, options = {}) {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
    return options.trim === false ? stdout : stdout.trim();
  } catch (error) {
    throw authorityError("ERR_DELETION_GIT_INVALID", `Deletion Git binding failed: ${String(error.stderr || error.message).trim()}`);
  }
}

function normalizeGitObjectId(value, field) {
  if (!/^[a-f0-9]{40,64}$/.test(value)) {
    throw authorityError("ERR_DELETION_GIT_INVALID", `Deletion Git ${field} binding is invalid`);
  }
  if (value.length !== 40 && value.length !== 64) {
    throw authorityError("ERR_DELETION_GIT_INVALID", `Deletion Git ${field} binding has an unsupported length`);
  }
  return value;
}

async function invalidateReservedReceipt(root, receiptId, operation, reason, originalError) {
  try {
    await receiptStore.invalidateReceipt(root, receiptId, { reason }, {
      id: `${operation.id}-invalidate`,
      faultInjector: operation.faultInjector,
    });
  } catch (error) {
    originalError.invalidation_error_code = error.code || "ERR_RECEIPT_INVALIDATION_FAILED";
  }
}

function buildExecutionReport(manifest, actor, receiptId, toolUseId, deletedPaths, outcome, recordedAt) {
  return {
    schema_version: DELETION_SCHEMA_VERSION,
    authority_role: "deletion_execution_report",
    outcome,
    manifest_hash: manifest.manifest_hash,
    receipt_id: receiptId,
    actor,
    tool_use_id: toolUseId,
    git: manifest.git,
    deleted_paths: [...deletedPaths],
    recorded_at: recordedAt,
  };
}

async function writeExecutionReport(root, path, report, operation, transactionSuffix) {
  const content = `${stringifyYaml(report).trimEnd()}\n`;
  const workspaceManifest = await readCurrentManifest(root);
  await commitWorkspaceTransaction(root, {
    id: `${operation.id}-${transactionSuffix}`,
    faultInjector: operation.faultInjector,
    manifest: workspaceManifest,
    writes: [{ path, content }],
  });
  return content;
}

async function withDeletionLock(root, operation) {
  const key = resolve(root || ".");
  const previous = deletionLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolveLock) => { release = resolveLock; });
  deletionLocks.set(key, current);
  await previous.catch(() => {});
  try {
    return await operation();
  } finally {
    release();
    if (deletionLocks.get(key) === current) deletionLocks.delete(key);
  }
}

function normalizeText(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > maxLength || /[\0\r]/.test(value)) {
    throw authorityError("ERR_DELETION_MANIFEST_INVALID", `${field} must be non-empty bounded text`);
  }
  return value;
}

function hashBytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isInside(root, candidate) {
  const nested = relative(root, candidate);
  return nested === "" || (!nested.startsWith(`..${sep}`) && nested !== ".." && !isAbsolute(nested));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
