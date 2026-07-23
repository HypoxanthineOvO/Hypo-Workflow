import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rmdir,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  WORKSPACE_MANIFEST_PATH,
  isSafeWorkspaceComponent,
  validateWorkspaceManifest,
} from "../manifest/index.js";
import { parseYaml, stringifyYaml } from "../serialization/index.js";
import { detectWorkspaceFormat } from "../workspace-format/index.js";
import {
  assertBootstrapAcceptanceWriteAllowed,
  isBootstrapAcceptancePath,
  validateBootstrapAcceptanceCommit,
} from "./bootstrap-acceptance.js";
import { assertWorkspacePathAllowed, normalizeWorkspacePath } from "./path-guard.js";

const TRANSACTION_ROOT = ".pipeline/runtime/transactions";
const TRANSACTION_SCHEMA_VERSION = "1";
const HOST_STATUS_PATH = ".pipeline/runtime/host-status-v1.json";
const WRITER_COORDINATION_ROOT = ".pipeline/runtime/coordination";
const WRITER_LEASE_PATH = `${WRITER_COORDINATION_ROOT}/writer.lock`;
const WRITER_LEASE_DURATION_MS = 4_000;
const WRITER_LEASE_POLL_MS = 50;
const WRITER_LEASE_CLOCK_SKEW_MS = 500;

export async function commitWorkspaceTransaction(root, input = {}) {
  return commitWorkspaceTransactionInternal(root, input, { bootstrapAcceptance: false });
}

// This is intentionally not re-exported from workspace-store/index.js or the Core root.
// It validates and creates exactly one immutable Bootstrap acceptance companion.
export async function commitBootstrapAcceptanceTransaction(root, input = {}) {
  assertBootstrapAcceptanceTransactionInput(input);
  const manifest = normalizeManifest(input.manifest);
  const compiled = await validateBootstrapAcceptanceCommit(root, input.acceptance, manifest);
  return commitWorkspaceTransactionInternal(root, {
    id: input.id,
    faultInjector: input.faultInjector,
    manifest,
    writes: [{ path: compiled.path, content: compiled.content }],
  }, { bootstrapAcceptance: true });
}

async function commitWorkspaceTransactionInternal(root, input, internal) {
  const workspaceRoot = resolve(root || ".");
  const id = validateTransactionId(input.id);
  const requestedWrites = normalizeWrites(input.writes);
  if (!internal.bootstrapAcceptance && requestedWrites.some((entry) => isBootstrapAcceptancePath(entry.path))) {
    throw transactionError(
      "ERR_WORKSPACE_PATH_FORBIDDEN",
      "Bootstrap acceptance companions can only be written by the internal acceptance transition",
    );
  }
  const manifest = normalizeManifest(input.manifest);
  const faultInjector = input.faultInjector;
  if (faultInjector !== undefined && typeof faultInjector !== "function") {
    throw new TypeError("faultInjector must be a function");
  }

  for (const write of requestedWrites) await assertWorkspacePathAllowed(workspaceRoot, write.path);

  const detected = await detectWorkspaceFormat(workspaceRoot);
  if (detected.kind === "damaged_current") throw damagedManifestError();
  if (!internal.bootstrapAcceptance) {
    await assertBootstrapAcceptanceWriteAllowed(workspaceRoot);
  }

  const pendingBeforeLease = await pendingTransactionIds(workspaceRoot);
  if (pendingBeforeLease.includes(id)) {
    throw transactionError(
      "ERR_WORKSPACE_TRANSACTION_PENDING",
      `Workspace transaction ${id} is already pending; transaction ids cannot be reused`,
    );
  }
  const lease = await acquireWriterLease(workspaceRoot, id);
  try {
    const pendingAfterLease = await pendingTransactionIds(workspaceRoot);
    if (pendingAfterLease.length) await recoverPendingTransactions(workspaceRoot, lease);
    await assertWriterLeaseOwner(lease);
    return await commitWithWriterLease(
      workspaceRoot,
      id,
      requestedWrites,
      manifest,
      faultInjector,
      lease,
    );
  } finally {
    await releaseWriterLease(lease);
  }
}

async function commitWithWriterLease(workspaceRoot, id, requestedWrites, manifest, faultInjector, lease) {
  const writes = await includeFailClosedHostProjection(workspaceRoot, requestedWrites, manifest, id);

  const pendingIds = await pendingTransactionIds(workspaceRoot);
  if (pendingIds.length) {
    throw transactionError(
      "ERR_WORKSPACE_TRANSACTION_PENDING",
      `Workspace transaction pending (${pendingIds.join(", ")}); recover it before starting ${id}`,
    );
  }

  const txRelative = `${TRANSACTION_ROOT}/${id}`;
  const txGuard = await assertWorkspacePathAllowed(workspaceRoot, txRelative, {
    allowedRoots: [".pipeline/runtime"],
    allowTransactionPaths: true,
  });
  const txDir = txGuard.path;
  if (await optionalLstat(txDir)) {
    throw transactionError(
      "ERR_WORKSPACE_TRANSACTION_PENDING",
      `Workspace transaction ${id} is already pending`,
    );
  }

  const preparedWrites = [];
  for (const [index, write] of writes.entries()) {
    const guarded = await assertWorkspacePathAllowed(workspaceRoot, write.path);
    preparedWrites.push({ ...write, index, absolutePath: guarded.path });
  }
  const manifestGuard = await assertWorkspacePathAllowed(workspaceRoot, WORKSPACE_MANIFEST_PATH, {
    allowedRoots: [".pipeline"],
    allowTransactionPaths: true,
  });

  let prepared = false;
  try {
    const marker = await prepareTransaction({
      id,
      txDir,
      writes: preparedWrites,
      manifest,
      manifestPath: manifestGuard.path,
    });
    prepared = true;
    await injectFault(faultInjector, { phase: "after_prepare" });
    await assertWriterLeaseOwner(lease);
    await verifyPrivateTransactionFiles(txDir, marker);

    for (const entry of marker.writes) {
      await assertWriterLeaseOwner(lease);
      const target = await assertWorkspacePathAllowed(workspaceRoot, entry.path);
      await inspectTargetState(target.path, entry, id);
      await installTransactionFile(
        txDir,
        entry.staged,
        target.path,
        `data-${entry.index}`,
        entry.staged_hash,
        id,
        "staged",
        lease,
        faultInjector,
      );
      await injectFault(faultInjector, {
        phase: "after_install_file",
        index: entry.index,
        path: entry.path,
      });
    }

    await assertAllDataStaged(workspaceRoot, marker);
    await injectFault(faultInjector, { phase: "before_manifest_activation" });
    await assertWriterLeaseOwner(lease);
    await verifyPrivateTransactionFiles(txDir, marker);
    await assertAllDataStaged(workspaceRoot, marker);
    const manifestTarget = await assertWorkspacePathAllowed(workspaceRoot, WORKSPACE_MANIFEST_PATH, {
      allowedRoots: [".pipeline"],
      allowTransactionPaths: true,
    });
    await inspectTargetState(manifestTarget.path, marker.manifest, id);
    await installTransactionFile(
      txDir,
      marker.manifest.staged,
      manifestTarget.path,
      "manifest",
      marker.manifest.staged_hash,
      id,
      "staged",
      lease,
      faultInjector,
    );
    await assertAuthoritativeWorkspace(workspaceRoot, marker);
    marker.status = "manifest_activated";
    marker.manifest_activated_at = new Date().toISOString();
    await writeFile(join(txDir, "transaction.yaml"), `${stringifyYaml(marker).trimEnd()}\n`, "utf8");
    await injectFault(faultInjector, { phase: "after_manifest_activation" });
    await assertWriterLeaseOwner(lease);
    await verifyPrivateTransactionFiles(txDir, marker);
    await assertAuthoritativeWorkspace(workspaceRoot, marker);

    await assertWriterLeaseOwner(lease);
    await rm(txDir, { recursive: true, force: true });
    return {
      ok: true,
      id,
      action: "committed",
      writes: marker.writes.map((entry) => entry.path),
      manifest: WORKSPACE_MANIFEST_PATH,
    };
  } catch (error) {
    if (!prepared) await rm(txDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

async function includeFailClosedHostProjection(root, writes, manifest, transactionId) {
  if (
    writes.some((entry) => entry.path === HOST_STATUS_PATH)
    || writes.some((entry) => entry.path.startsWith(".pipeline/runtime/migrations/"))
    || !writes.some((entry) => isHostVisibleAuthorityPath(entry.path))
  ) {
    return writes;
  }

  let generation = -1;
  const guarded = await assertWorkspacePathAllowed(root, HOST_STATUS_PATH);
  const existing = await readExistingFile(guarded.path);
  if (existing) {
    try {
      const parsed = JSON.parse(existing.toString("utf8"));
      if (Number.isSafeInteger(parsed.generation) && parsed.generation >= 0) generation = parsed.generation;
    } catch {
      // A damaged derived view has no authority. The new invalidation supersedes it.
    }
  }
  const invalidatedAt = new Date().toISOString();
  const projection = {
    schema_version: "1",
    contract_version: "1",
    projection_status: "invalidated",
    generated_at: invalidatedAt,
    generation: generation + 1,
    workspace: null,
    delivery: null,
    continuation: null,
    invalidation: {
      invalidated_at: invalidatedAt,
      reason: `authority_changed:${transactionId}`,
    },
  };
  return normalizeWrites([
    ...writes.map((entry) => ({
      path: entry.path,
      content: entry.content,
      ...(entry.expectedHash === undefined ? {} : { expected_hash: entry.expectedHash }),
    })),
    { path: HOST_STATUS_PATH, content: `${JSON.stringify(projection, null, 2)}\n` },
  ]);
}

function isHostVisibleAuthorityPath(path) {
  return path === ".pipeline/runtime/active.yaml"
    || /^\.pipeline\/runtime\/objects\/(?:delivery|activity|bootstrap_job)\/[^/]+\/(?:runtime|continuation)\.yaml$/.test(path);
}

function assertBootstrapAcceptanceTransactionInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Bootstrap acceptance transaction input must be an object");
  }
  const allowed = new Set(["id", "faultInjector", "manifest", "acceptance"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new TypeError("Bootstrap acceptance transaction input contains unsupported fields");
  }
  if (!Object.hasOwn(input, "acceptance")) {
    throw new TypeError("Bootstrap acceptance transaction requires an acceptance fact");
  }
}

export async function recoverWorkspaceTransaction(root, options = {}) {
  const workspaceRoot = resolve(root || ".");
  const pendingId = options.id === undefined
    ? await firstPendingTransactionId(workspaceRoot)
    : validateTransactionId(options.id);
  if (!pendingId || !await optionalLstat(resolve(workspaceRoot, `${TRANSACTION_ROOT}/${pendingId}`))) {
    return options.id === undefined ? { action: "none" } : { id: pendingId, action: "none" };
  }
  const recoveryId = options.id === undefined ? `recovery-${randomUUID().slice(0, 12)}` : validateTransactionId(options.id);
  const lease = await acquireWriterLease(workspaceRoot, recoveryId);
  try {
    return await recoverWorkspaceTransactionInternal(workspaceRoot, options, lease);
  } finally {
    await releaseWriterLease(lease);
  }
}

async function recoverWorkspaceTransactionInternal(workspaceRoot, options = {}, lease) {
  const id = options.id === undefined
    ? await firstPendingTransactionId(workspaceRoot)
    : validateTransactionId(options.id);
  if (!id) return { action: "none" };
  if (lease) await assertWriterLeaseOwner(lease);

  const txRelative = `${TRANSACTION_ROOT}/${id}`;
  const txGuard = await assertWorkspacePathAllowed(workspaceRoot, txRelative, {
    allowedRoots: [".pipeline/runtime"],
    allowTransactionPaths: true,
  });
  const txDir = txGuard.path;
  if (!await optionalLstat(txDir)) return { id, action: "none" };

  const markerPath = join(txDir, "transaction.yaml");
  const markerStats = await optionalLstat(markerPath);
  if (!markerStats) {
    if (lease) await assertWriterLeaseOwner(lease);
    await rm(txDir, { recursive: true, force: true });
    return { id, action: "rolled_back" };
  }
  if (!markerStats.isFile() || markerStats.isSymbolicLink()) {
    throw transactionConflict(id, "transaction marker is not a regular file");
  }

  let marker;
  try {
    marker = parseYaml(await readFile(markerPath, "utf8"));
  } catch (error) {
    throw transactionConflict(id, `transaction marker is unreadable: ${error.message || error}`);
  }
  validateTransactionMarker(marker, id);
  await verifyPrivateTransactionFiles(txDir, marker);

  const dataStates = [];
  for (const entry of marker.writes) {
    const guarded = await assertWorkspacePathAllowed(workspaceRoot, entry.path);
    dataStates.push(await inspectTargetState(guarded.path, entry, id));
  }
  const manifestGuard = await assertWorkspacePathAllowed(workspaceRoot, WORKSPACE_MANIFEST_PATH, {
    allowedRoots: [".pipeline"],
    allowTransactionPaths: true,
  });
  const manifestState = await inspectManifestRecoveryState(manifestGuard.path, marker.manifest, id);
  const allDataInstalled = dataStates.every((state) => state.staged);

  if (allDataInstalled && manifestState.staged) {
    await assertAuthoritativeWorkspace(workspaceRoot, marker);
    if (lease) await assertWriterLeaseOwner(lease);
    await rm(txDir, { recursive: true, force: true });
    return { id, action: "finalized" };
  }

  if (allDataInstalled) {
    await verifyPrivateTransactionFiles(txDir, marker);
    await assertAllDataStaged(workspaceRoot, marker);
    const currentManifest = await inspectManifestRecoveryState(manifestGuard.path, marker.manifest, id);
    if (currentManifest.staged) {
      await assertAuthoritativeWorkspace(workspaceRoot, marker);
      if (lease) await assertWriterLeaseOwner(lease);
      await rm(txDir, { recursive: true, force: true });
      return { id, action: "finalized" };
    }
    if (lease) await assertWriterLeaseOwner(lease);
    await installTransactionFile(
      txDir,
      marker.manifest.staged,
      manifestGuard.path,
      "recover-manifest",
      marker.manifest.staged_hash,
      id,
      "staged",
      lease,
    );
    await assertAuthoritativeWorkspace(workspaceRoot, marker);
    if (lease) await assertWriterLeaseOwner(lease);
    await rm(txDir, { recursive: true, force: true });
    return { id, action: "rolled_forward" };
  }

  if (manifestState.staged && !manifestState.old) {
    throw transactionConflict(id, "active manifest does not match the installed data set");
  }
  if (manifestState.missing && marker.manifest.old_exists) {
    throw transactionConflict(id, "manifest is missing while the data set is only partially installed");
  }

  for (const entry of marker.writes) {
    const guarded = await assertWorkspacePathAllowed(workspaceRoot, entry.path);
    const state = await inspectTargetState(guarded.path, entry, id);
    if (state.old) continue;
    if (entry.old_exists) {
      if (lease) await assertWriterLeaseOwner(lease);
      await installTransactionFile(
        txDir,
        entry.backup,
        guarded.path,
        `rollback-${entry.index}`,
        entry.old_hash,
        id,
        "backup",
        lease,
      );
    } else {
      if (lease) await assertWriterLeaseOwner(lease);
      await rm(guarded.path, { force: true });
    }
  }
  await assertAllDataOld(workspaceRoot, marker);
  const restoredManifest = await inspectTargetState(manifestGuard.path, marker.manifest, id);
  if (!restoredManifest.old) {
    throw transactionConflict(id, "rollback did not restore the original manifest state");
  }
  if (lease) await assertWriterLeaseOwner(lease);
  await rm(txDir, { recursive: true, force: true });
  return { id, action: "rolled_back" };
}

async function recoverPendingTransactions(workspaceRoot, lease) {
  for (;;) {
    const id = await firstPendingTransactionId(workspaceRoot);
    if (!id) return;
    await recoverWorkspaceTransactionInternal(workspaceRoot, { id }, lease);
  }
}

async function acquireWriterLease(workspaceRoot, operationId) {
  const guard = await assertWorkspacePathAllowed(workspaceRoot, WRITER_LEASE_PATH, {
    allowedRoots: [".pipeline/runtime"],
    allowTransactionPaths: true,
  });
  const lockDir = guard.path;
  const coordinationDir = dirname(lockDir);
  const runtimeDir = dirname(coordinationDir);
  const coordinationStats = await optionalLstat(coordinationDir);
  const runtimeStats = await optionalLstat(runtimeDir);
  await mkdir(dirname(lockDir), { recursive: true });
  const token = randomUUID();
  let tookOverStaleOwner = false;
  let invalidOwnerIdentity = null;
  let invalidOwnerDeadline = 0;

  for (;;) {
    try {
      await mkdir(lockDir);
      const ownerPath = join(lockDir, "owner.json");
      const ownerHandle = await open(ownerPath, "wx");
      const lease = {
        lockDir,
        ownerPath,
        ownerHandle,
        token,
        operationId,
        coordinationDir,
        coordinationStats,
        runtimeDir,
        runtimeStats,
        tookOverStaleOwner,
        timer: null,
        heartbeat: null,
        poisonedError: null,
        released: false,
      };
      await writeLeaseOwner(lease);
      lease.timer = setInterval(() => {
        if (lease.released || lease.heartbeat) return;
        lease.heartbeat = writeLeaseOwner(lease)
          .catch((error) => { lease.poisonedError = error; })
          .finally(() => { lease.heartbeat = null; });
      }, Math.floor(WRITER_LEASE_DURATION_MS / 4));
      return lease;
    } catch (error) {
      if (error.code === "ENOENT") {
        await mkdir(dirname(lockDir), { recursive: true });
        continue;
      }
      if (error.code !== "EEXIST") {
        await rm(lockDir, { recursive: true, force: true }).catch(() => {});
        throw error;
      }
    }

    const owner = await readWriterLeaseOwner(lockDir);
    if (owner?.valid && Date.parse(owner.expires_at) > Date.now()) {
      await delay(WRITER_LEASE_POLL_MS);
      continue;
    }
    if (owner && !owner.valid) {
      if (owner.identity !== invalidOwnerIdentity) {
        invalidOwnerIdentity = owner.identity;
        invalidOwnerDeadline = Math.min(
          Date.now() + WRITER_LEASE_DURATION_MS,
          owner.stale_at,
        );
      }
      if (Date.now() < invalidOwnerDeadline) {
        await delay(WRITER_LEASE_POLL_MS);
        continue;
      }
    }

    const stalePath = `${lockDir}.stale-${randomUUID()}`;
    try {
      await rename(lockDir, stalePath);
      tookOverStaleOwner = true;
      await rm(stalePath, { recursive: true, force: true });
    } catch (error) {
      if (!["ENOENT", "EEXIST", "ENOTEMPTY"].includes(error.code)) throw error;
    }
  }
}

async function writeLeaseOwner(lease) {
  if (lease.released) return;
  const now = new Date();
  const owner = {
    schema_version: "1",
    token: lease.token,
    operation_id: lease.operationId,
    pid: process.pid,
    renewed_at: now.toISOString(),
    expires_at: new Date(now.getTime() + WRITER_LEASE_DURATION_MS).toISOString(),
  };
  const content = Buffer.from(`${JSON.stringify(owner)}\n`, "utf8");
  const result = await lease.ownerHandle.write(content, 0, content.length, 0);
  if (result.bytesWritten !== content.length) throw new Error("Writer lease heartbeat was only partially persisted");
  await lease.ownerHandle.truncate(content.length);
  await lease.ownerHandle.sync();
}

async function readWriterLeaseOwner(lockDir) {
  const ownerPath = join(lockDir, "owner.json");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const stats = await optionalLstat(ownerPath) || await optionalLstat(lockDir);
    if (!stats) return null;
    try {
      const parsed = JSON.parse(await readFile(ownerPath, "utf8"));
      const normalized = normalizeLeaseOwner(parsed, stats);
      if (normalized) return normalized;
    } catch (error) {
      if (!["ENOENT", "ENOTDIR", "EISDIR"].includes(error.code) && !(error instanceof SyntaxError)) throw error;
    }
    if (attempt === 0) await delay(WRITER_LEASE_POLL_MS);
  }
  const stats = await optionalLstat(ownerPath) || await optionalLstat(lockDir);
  return stats ? {
    valid: false,
    identity: leaseFileIdentity(stats),
    stale_at: stats.mtimeMs + WRITER_LEASE_DURATION_MS,
  } : null;
}

function normalizeLeaseOwner(value, stats) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value).sort();
  const expectedKeys = ["expires_at", "operation_id", "pid", "renewed_at", "schema_version", "token"];
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) return null;
  const renewed = Date.parse(value.renewed_at);
  const expires = Date.parse(value.expires_at);
  const now = Date.now();
  if (
    value.schema_version !== "1"
    || typeof value.token !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.token)
    || !isSafeWorkspaceComponent(value.operation_id)
    || !Number.isSafeInteger(value.pid)
    || value.pid <= 0
    || !Number.isFinite(renewed)
    || !Number.isFinite(expires)
    || expires <= renewed
    || expires - renewed > WRITER_LEASE_DURATION_MS + WRITER_LEASE_CLOCK_SKEW_MS
    || renewed > now + WRITER_LEASE_CLOCK_SKEW_MS
    || Math.abs(renewed - stats.mtimeMs) > WRITER_LEASE_DURATION_MS + WRITER_LEASE_CLOCK_SKEW_MS
  ) return null;
  const boundedExpiry = Math.min(
    expires,
    stats.mtimeMs + WRITER_LEASE_DURATION_MS + WRITER_LEASE_CLOCK_SKEW_MS,
  );
  return {
    ...value,
    valid: true,
    identity: leaseFileIdentity(stats),
    expires_at: new Date(boundedExpiry).toISOString(),
  };
}

function leaseFileIdentity(stats) {
  return `${stats.dev}:${stats.ino}:${stats.mtimeMs}:${stats.size}`;
}

async function assertWriterLeaseOwner(lease) {
  if (lease.poisonedError) {
    throw transactionError(
      "ERR_WORKSPACE_WRITER_FENCED",
      `Workspace writer ${lease.operationId} lease renewal failed before activation`,
    );
  }
  const owner = await readWriterLeaseOwner(lease.lockDir);
  if (!owner?.valid || owner.token !== lease.token || Date.parse(owner.expires_at) <= Date.now()) {
    throw transactionError(
      "ERR_WORKSPACE_WRITER_FENCED",
      `Workspace writer ${lease.operationId} lost lease ownership before activation`,
    );
  }
}

async function releaseWriterLease(lease) {
  if (!lease || lease.released) return;
  lease.released = true;
  if (lease.timer) clearInterval(lease.timer);
  await lease.heartbeat?.catch(() => {});
  await lease.ownerHandle?.close().catch(() => {});
  try {
    const owner = await readWriterLeaseOwner(lease.lockDir);
    if (!owner || owner.token !== lease.token) return;
    const releasedPath = `${lease.lockDir}.released-${lease.token}`;
    await rename(lease.lockDir, releasedPath);
    await rm(releasedPath, { recursive: true, force: true });
  } catch (error) {
    if (!["ENOENT", "ENOTDIR"].includes(error.code)) throw error;
  }
  if (lease.coordinationStats) {
    await utimes(lease.coordinationDir, lease.coordinationStats.atime, lease.coordinationStats.mtime).catch(() => {});
  } else {
    await rmdir(lease.coordinationDir).catch((error) => {
      if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) throw error;
    });
  }
  if (lease.runtimeStats) {
    await utimes(lease.runtimeDir, lease.runtimeStats.atime, lease.runtimeStats.mtime).catch(() => {});
  }
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function prepareTransaction({ id, txDir, writes, manifest, manifestPath }) {
  await mkdir(join(txDir, "staged"), { recursive: true });
  await mkdir(join(txDir, "backups"), { recursive: true });
  await mkdir(join(txDir, "install"), { recursive: true });

  const entries = [];
  for (const write of writes) {
    const suffix = String(write.index).padStart(4, "0");
    const staged = `staged/${suffix}`;
    const backup = `backups/${suffix}`;
    const old = await readExistingFile(write.absolutePath);
    const oldHash = old === null ? null : fileHash(old);
    if (write.expectedHash !== undefined && write.expectedHash !== oldHash) {
      throw transactionConflict(id, `target precondition drift at ${write.path}`);
    }
    await writeFile(join(txDir, staged), write.content);
    if (old) await writeFile(join(txDir, backup), old);
    entries.push({
      index: write.index,
      path: write.path,
      staged,
      staged_hash: fileHash(write.content),
      old_exists: old !== null,
      old_hash: oldHash,
      backup: old === null ? null : backup,
    });
  }

  const manifestContent = Buffer.from(`${stringifyYaml(manifest).trimEnd()}\n`, "utf8");
  const oldManifest = await readExistingFile(manifestPath);
  const manifestStaged = "staged/manifest.yaml";
  const manifestBackup = "backups/manifest.yaml";
  await writeFile(join(txDir, manifestStaged), manifestContent);
  if (oldManifest) await writeFile(join(txDir, manifestBackup), oldManifest);

  const marker = {
    schema_version: TRANSACTION_SCHEMA_VERSION,
    id,
    status: "prepared",
    created_at: new Date().toISOString(),
    writes: entries,
    manifest: {
      path: WORKSPACE_MANIFEST_PATH,
      staged: manifestStaged,
      staged_hash: fileHash(manifestContent),
      old_exists: oldManifest !== null,
      old_hash: oldManifest === null ? null : fileHash(oldManifest),
      backup: oldManifest === null ? null : manifestBackup,
    },
  };
  await writeFile(join(txDir, "transaction.yaml"), `${stringifyYaml(marker).trimEnd()}\n`, "utf8");
  return marker;
}

async function verifyPrivateTransactionFiles(txDir, marker) {
  for (const entry of [...marker.writes, marker.manifest]) {
    await verifyPrivateFile(txDir, entry.staged, entry.staged_hash, marker.id, "staged");
    if (entry.old_exists) {
      await verifyPrivateFile(txDir, entry.backup, entry.old_hash, marker.id, "backup");
    }
  }
}

async function verifyPrivateFile(txDir, relativePath, expectedHash, id, kind) {
  await readVerifiedPrivateFile(txDir, relativePath, expectedHash, id, kind);
}

async function readVerifiedPrivateFile(txDir, relativePath, expectedHash, id, kind) {
  if (!isPrivateRelativePath(relativePath)) {
    throw transactionConflict(id, `${kind} path escapes transaction storage`);
  }
  const path = join(txDir, relativePath);
  const stats = await optionalLstat(path);
  if (!stats || !stats.isFile() || stats.isSymbolicLink()) {
    throw transactionConflict(id, `${kind} file is missing or not regular: ${relativePath}`);
  }
  const content = await readFile(path);
  const actualHash = fileHash(content);
  if (actualHash !== expectedHash) {
    throw transactionConflict(id, `${kind} hash mismatch: ${relativePath}`);
  }
  return content;
}

async function inspectTargetState(path, entry, id) {
  const content = await readExistingFile(path);
  const hash = content === null ? null : fileHash(content);
  const staged = content !== null && hash === entry.staged_hash;
  const old = entry.old_exists ? content !== null && hash === entry.old_hash : content === null;
  if (!staged && !old) {
    throw transactionConflict(id, `target hash drift at ${entry.path}`);
  }
  return { staged, old, hash };
}

async function inspectManifestRecoveryState(path, entry, id) {
  const content = await readExistingFile(path);
  if (content === null) {
    return { staged: false, old: !entry.old_exists, missing: true, hash: null };
  }
  const hash = fileHash(content);
  const staged = hash === entry.staged_hash;
  const old = entry.old_exists && hash === entry.old_hash;
  if (!staged && !old) {
    throw transactionConflict(id, `target hash drift at ${entry.path}`);
  }
  return { staged, old, missing: false, hash };
}

async function assertAllDataStaged(root, marker) {
  for (const entry of marker.writes) {
    const guarded = await assertWorkspacePathAllowed(root, entry.path);
    const state = await inspectTargetState(guarded.path, entry, marker.id);
    if (!state.staged) throw transactionConflict(marker.id, `data target is not staged: ${entry.path}`);
  }
}

async function assertAllDataOld(root, marker) {
  for (const entry of marker.writes) {
    const guarded = await assertWorkspacePathAllowed(root, entry.path);
    const state = await inspectTargetState(guarded.path, entry, marker.id);
    if (!state.old) throw transactionConflict(marker.id, `data target was not rolled back: ${entry.path}`);
  }
}

async function assertAuthoritativeWorkspace(root, marker) {
  await assertAllDataStaged(root, marker);
  const manifest = await assertWorkspacePathAllowed(root, WORKSPACE_MANIFEST_PATH, {
    allowedRoots: [".pipeline"],
    allowTransactionPaths: true,
  });
  const state = await inspectTargetState(manifest.path, marker.manifest, marker.id);
  if (!state.staged) throw transactionConflict(marker.id, "workspace manifest is not staged");
}

async function installTransactionFile(txDir, sourceRelative, target, label, expectedHash, id, kind, lease, faultInjector) {
  const content = await readVerifiedPrivateFile(txDir, sourceRelative, expectedHash, id, kind);
  const installPath = join(txDir, "install", `${label}.tmp`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(installPath, content);
  await injectFault(faultInjector, { phase: "before_target_rename", target: label });
  if (lease) await assertWriterLeaseOwner(lease);
  await rename(installPath, target);
}

async function firstPendingTransactionId(root) {
  return (await pendingTransactionIds(root))[0] || null;
}

async function pendingTransactionIds(root) {
  const guarded = await assertWorkspacePathAllowed(root, TRANSACTION_ROOT, {
    allowedRoots: [".pipeline/runtime"],
    allowTransactionPaths: true,
  });
  let entries;
  try {
    entries = await readdir(guarded.path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isDirectory() && isSafeWorkspaceComponent(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function normalizeWrites(writes) {
  if (!Array.isArray(writes)) throw new TypeError("writes must be an array");
  const seen = new Set();
  const normalized = writes.map((entry) => {
    if (!entry || typeof entry !== "object") throw new TypeError("each write must be an object");
    const path = normalizeWorkspacePath(entry.path);
    if (path === WORKSPACE_MANIFEST_PATH) {
      const error = new Error("Workspace manifest must be supplied through manifest and activated last");
      error.code = "ERR_WORKSPACE_PATH_FORBIDDEN";
      throw error;
    }
    if (seen.has(path)) throw new TypeError(`duplicate workspace transaction path: ${path}`);
    seen.add(path);
    if (typeof entry.content !== "string" && !Buffer.isBuffer(entry.content)) {
      throw new TypeError(`workspace transaction content must be a string or Buffer: ${path}`);
    }
    return {
      path,
      content: Buffer.isBuffer(entry.content) ? Buffer.from(entry.content) : Buffer.from(entry.content, "utf8"),
      ...(entry.expected_hash === undefined ? {} : {
        expectedHash: normalizeExpectedHash(entry.expected_hash, path),
      }),
    };
  });
  assertPrefixFreeWriteSet(normalized.map((entry) => entry.path));
  return normalized;
}

function normalizeExpectedHash(value, path) {
  if (value === null || (typeof value === "string" && /^[a-f0-9]{64}$/.test(value))) return value;
  throw new TypeError(`workspace transaction expected_hash must be null or a lowercase SHA-256 digest: ${path}`);
}

function assertPrefixFreeWriteSet(paths) {
  const pathSet = new Set(paths);
  for (const descendant of [...pathSet].sort()) {
    const segments = descendant.split("/");
    for (let length = 1; length < segments.length; length += 1) {
      const ancestor = segments.slice(0, length).join("/");
      if (!pathSet.has(ancestor)) continue;
      throw transactionError(
        "ERR_WORKSPACE_PATH_FORBIDDEN",
        `Workspace write-set path conflict: ${ancestor} is an ancestor of ${descendant}`,
      );
    }
  }
}

function normalizeManifest(value) {
  const parsed = typeof value === "string" ? parseYaml(value) : value;
  return validateWorkspaceManifest(parsed);
}

function validateTransactionMarker(marker, expectedId) {
  if (!marker || typeof marker !== "object" || Array.isArray(marker)) {
    throw transactionConflict(expectedId, "transaction marker must be a mapping");
  }
  if (String(marker.schema_version || "") !== TRANSACTION_SCHEMA_VERSION) {
    throw transactionConflict(expectedId, "unsupported transaction marker schema");
  }
  if (marker.id !== expectedId || !["prepared", "manifest_activated"].includes(marker.status)) {
    throw transactionConflict(expectedId, "transaction marker identity or status mismatch");
  }
  if (!Array.isArray(marker.writes) || !marker.manifest) {
    throw transactionConflict(expectedId, "transaction marker is incomplete");
  }
  const paths = new Set();
  for (const [index, entry] of marker.writes.entries()) {
    let normalized;
    try {
      normalized = normalizeWorkspacePath(entry.path);
    } catch {
      throw transactionConflict(expectedId, "transaction marker contains a forbidden target path");
    }
    if (normalized !== entry.path || entry.index !== index || paths.has(entry.path)) {
      throw transactionConflict(expectedId, "transaction marker write set is inconsistent");
    }
    paths.add(entry.path);
    validateMarkerEntry(entry, expectedId);
  }
  if (marker.manifest.path !== WORKSPACE_MANIFEST_PATH) {
    throw transactionConflict(expectedId, "transaction marker manifest path mismatch");
  }
  validateMarkerEntry(marker.manifest, expectedId);
}

function validateMarkerEntry(entry, id) {
  if (!isSha256(entry.staged_hash) || typeof entry.old_exists !== "boolean") {
    throw transactionConflict(id, "transaction marker hashes are invalid");
  }
  if (entry.old_exists) {
    if (!isSha256(entry.old_hash) || !entry.backup) {
      throw transactionConflict(id, "transaction marker backup metadata is invalid");
    }
  } else if (entry.old_hash !== null || entry.backup !== null) {
    throw transactionConflict(id, "transaction marker old-file metadata is invalid");
  }
}

function validateTransactionId(id) {
  if (!isSafeWorkspaceComponent(id)) {
    const error = new Error("Workspace transaction id escape is forbidden; use a safe single-component identifier");
    error.code = "ERR_WORKSPACE_PATH_FORBIDDEN";
    throw error;
  }
  return id;
}

async function readExistingFile(path) {
  const stats = await optionalLstat(path);
  if (!stats) return null;
  if (!stats.isFile() || stats.isSymbolicLink()) {
    const error = new Error(`Workspace path symlink/non-file is forbidden: ${path}`);
    error.code = "ERR_WORKSPACE_PATH_FORBIDDEN";
    throw error;
  }
  return readFile(path);
}

async function optionalLstat(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }
}

async function injectFault(faultInjector, event) {
  if (faultInjector) await faultInjector(event);
}

function isPrivateRelativePath(value) {
  return typeof value === "string"
    && value.length > 0
    && !value.startsWith("/")
    && !value.includes("\\")
    && value.split("/").every((part) => part && part !== "." && part !== "..");
}

function fileHash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function damagedManifestError() {
  const error = new Error("Workspace manifest is damaged; transaction refused");
  error.code = "ERR_WORKSPACE_MANIFEST_DAMAGED";
  return error;
}

function transactionConflict(id, detail) {
  return transactionError(
    "ERR_WORKSPACE_TRANSACTION_CONFLICT",
    `Workspace transaction ${id} conflict: ${detail}`,
  );
}

function transactionError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
