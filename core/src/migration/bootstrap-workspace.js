import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { compileHostStatusProjection, HOST_STATUS_PATH, parseHostStatusProjection } from "../host-contract/index.js";
import { createWorkspaceManifest, validateWorkspaceManifest, WORKSPACE_MANIFEST_PATH } from "../manifest/index.js";
import { compileRecordStore, createRecordPatch, readRecord } from "../records/index.js";
import { buildPersistedRecord } from "../records/schema.js";
import {
  compileInitialContextCapsule,
  normalizePersistedCapsule,
  readContextCapsuleInternal,
} from "../recovery/capsule.js";
import {
  compileRecoveryPackProjection,
  inspectRecoveryPackInventoryInternal,
  planRecoveryRestoreWithPolicy,
  validateRecoveryPackInternal,
} from "../recovery/pack.js";
import {
  readRecoveryBlobInternal,
  replayRecoveryJournalInternal,
} from "../recovery/journal.js";
import {
  DEFAULT_RECOVERY_POLICY,
  hashBytes,
  normalizeRecoveryPolicy,
  normalizeSafeRepoPath,
  readContainedFile,
  stableEqual,
} from "../recovery/shared.js";
import {
  compileActivePointerDocument,
  compileRuntimeObjectDocuments,
  readActivePointer,
  readRuntimeObject,
} from "../runtime/index.js";
import {
  AUTHORITY_SCHEMA_VERSION,
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeAuthorityObjectRef,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
  normalizeSha256,
  normalizeTimestamp,
  readCurrentManifest,
  storedObjectRef,
} from "../runtime/internal.js";
import { buildSnapshotProjection, readSnapshot, snapshotProjectionPath } from "../snapshots/index.js";
import { canonicalHash, parseYaml, stringifyYaml } from "../serialization/index.js";
import { detectWorkspaceFormat } from "../workspace-format/index.js";
import {
  assertWorkspacePathAllowed,
  commitWorkspaceTransaction,
  recoverWorkspaceTransaction,
} from "../workspace-store/index.js";
import {
  LEGACY_FREEZE_PATHS,
  acceptancePathFor,
  buildBootstrapAcceptanceFact,
  normalizeBootstrapAcceptanceEvidenceRefs,
  normalizeLegacyFreezeCompatibilityBinding,
  normalizeLegacyFreezeInventory,
  readBootstrapAcceptanceCompanion,
} from "../workspace-store/bootstrap-acceptance.js";
import { commitBootstrapAcceptanceTransaction } from "../workspace-store/transaction.js";
import {
  normalizeAuditProposal,
  normalizeBootstrapJobRef,
  normalizeCurationProposal,
  verifyCurationSources,
} from "./bootstrap-proposals.js";

const BOOTSTRAP_SCHEMA_VERSION = "1";
const MIGRATIONS_ROOT = ".pipeline/runtime/migrations";
const STAGE_KEYS = Object.freeze([
  "status",
  "stage_id",
  "bootstrap_job_ref",
  "manifest",
  "curation",
  "audit",
  "delivery_object_ref",
  "write_set",
  "compiled_records",
  "active_record_ids",
  "pack_ref",
  "checkpoint",
  "legacy_freeze_inventory",
  "rollback_checkpoint_ref",
  "staging",
  "semantic_hash",
]);

export async function stageBootstrapWorkspace(root, input, options) {
  const normalizedOptions = normalizeStageOptions(options);
  const normalized = normalizeStageInput(input);
  const workspaceRoot = await assertSafeLegacyRoot(root);
  await assertNoPendingTransaction(workspaceRoot);
  const detected = await detectWorkspaceFormat(workspaceRoot);
  if (detected.kind !== "legacy") {
    throw bootstrapError("ERR_BOOTSTRAP_WORKSPACE_NOT_LEGACY", "Bootstrap staging is restricted to a legacy reference workspace");
  }
  await verifyCurationSources(workspaceRoot, normalized.curation);

  const legacyFreezeInventory = await captureLegacyFreezeInventory(workspaceRoot);
  const compiled = compileBootstrapWorkspace(normalized, normalizedOptions.id, legacyFreezeInventory);
  const artifacts = buildStagingArtifacts(compiled);
  const stage = normalizeBootstrapStage({
    ...compiled,
    staging: Object.fromEntries(artifacts.map((artifact) => [artifact.name, {
      path: artifact.path,
      sha256: artifact.sha256,
    }])),
  });
  await writeStagingArtifacts(workspaceRoot, artifacts);
  const after = await detectWorkspaceFormat(workspaceRoot);
  if (after.kind !== "legacy") {
    throw bootstrapError("ERR_BOOTSTRAP_STAGING_AUTHORITY", "Bootstrap staging must not activate the workspace format");
  }
  return stage;
}

export async function activateBootstrapWorkspace(root, stageInput, options) {
  const operation = normalizeActivationOptions(options);
  const stage = normalizeBootstrapStage(stageInput);
  const workspaceRoot = await assertSafeLegacyRoot(root);
  await assertNoPendingTransaction(workspaceRoot);
  if ((await detectWorkspaceFormat(workspaceRoot)).kind !== "legacy") {
    throw bootstrapError("ERR_BOOTSTRAP_WORKSPACE_NOT_LEGACY", "Bootstrap activation requires the staged legacy workspace");
  }
  await verifyStageArtifacts(workspaceRoot, stage);
  await verifyCurationSources(workspaceRoot, stage.curation);
  if (stage.legacy_freeze_inventory !== undefined) {
    const currentLegacyInventory = await captureLegacyFreezeInventory(
      workspaceRoot,
      "ERR_BOOTSTRAP_ACTIVATION_INVALID",
    );
    if (!stableEqual(currentLegacyInventory, stage.legacy_freeze_inventory)) {
      throw bootstrapError("ERR_BOOTSTRAP_ACTIVATION_INVALID", "Bootstrap legacy freeze inventory drifted before activation");
    }
  }

  await commitWorkspaceTransaction(workspaceRoot, {
    id: operation.id,
    faultInjector: wrapBootstrapFaultInjector(operation.faultInjector),
    manifest: stage.manifest,
    writes: stage.write_set.map((entry) => ({ path: entry.path, content: entry.content })),
  });
  await verifyActivatedStage(workspaceRoot, stage);
  return activationResult(stage, operation.id);
}

export async function recoverBootstrapActivation(root, input) {
  const normalized = canonicalMapping(input, "Bootstrap recovery input");
  assertExactKeys(normalized, ["bootstrap_job_ref", "transaction_id"], "Bootstrap recovery input");
  const bootstrapJobRef = normalizeBootstrapJobRef(normalized.bootstrap_job_ref);
  const transactionId = normalizeBootstrapIdentifier(normalized.transaction_id, "Bootstrap recovery transaction_id");
  const workspaceRoot = await assertSafeWorkspaceRoot(root);
  const stage = await readStagedBootstrapStage(workspaceRoot, bootstrapJobRef);
  const checkpoint = await readRollbackCheckpoint(workspaceRoot, bootstrapJobRef, stage.rollback_checkpoint_ref);
  const pendingIds = await pendingTransactionIds(workspaceRoot);
  if (pendingIds.length && (pendingIds.length !== 1 || pendingIds[0] !== transactionId)) {
    throw bootstrapError("ERR_WORKSPACE_TRANSACTION_PENDING", "Bootstrap recovery transaction_id does not match the pending transaction");
  }
  if (pendingIds.length && await allCheckpointDataInstalled(workspaceRoot, checkpoint) && !await optionalLstat(resolve(workspaceRoot, WORKSPACE_MANIFEST_PATH))) {
    await verifyCurationSources(workspaceRoot, stage.curation);
  }
  const recovery = await recoverWorkspaceTransaction(workspaceRoot, { id: transactionId });
  const detected = await detectWorkspaceFormat(workspaceRoot);
  if (new Set(["rolled_forward", "finalized"]).has(recovery.action)) {
    await verifyCheckpointActivated(workspaceRoot, checkpoint);
  } else if (recovery.action === "rolled_back" && detected.kind !== "legacy") {
    throw bootstrapError("ERR_BOOTSTRAP_RECOVERY_INVALID", "Rolled-back Bootstrap activation did not restore legacy classification");
  } else if (recovery.action === "none") {
    if (new Set(["current", "mixed_current_with_legacy_residue"]).has(detected.kind)) {
      await verifyCheckpointActivated(workspaceRoot, checkpoint);
    } else if (detected.kind !== "legacy") {
      throw bootstrapError("ERR_BOOTSTRAP_RECOVERY_INVALID", "Bootstrap recovery found an indeterminate workspace state");
    }
  }
  const activated = new Set(["current", "mixed_current_with_legacy_residue"]).has((await detectWorkspaceFormat(workspaceRoot)).kind);
  return deepFreeze({
    action: recovery.action,
    status: activated ? "activated" : "rolled_back",
    bootstrap_job_ref: bootstrapJobRef,
    transaction_id: transactionId,
  });
}

export async function rollbackBootstrapActivation(root, input, options) {
  const normalized = canonicalMapping(input, "Bootstrap rollback input");
  assertExactKeys(normalized, ["bootstrap_job_ref", "checkpoint_ref"], "Bootstrap rollback input");
  const bootstrapJobRef = normalizeBootstrapJobRef(normalized.bootstrap_job_ref);
  const checkpointRef = normalizeCheckpointRef(normalized.checkpoint_ref, bootstrapJobRef);
  const operation = normalizeRollbackOptions(options);
  const workspaceRoot = await assertSafeWorkspaceRoot(root);
  await assertNoPendingTransaction(workspaceRoot);
  const accepted = await readBootstrapAcceptanceCompanion(
    workspaceRoot,
    bootstrapJobRef,
    checkpointRef,
    { optional: true },
  );
  if (accepted) {
    throw bootstrapError("ERR_BOOTSTRAP_ROLLBACK_ACCEPTED", "Bootstrap rollback is unavailable after acceptance");
  }
  const detected = await detectWorkspaceFormat(workspaceRoot);
  if (!new Set(["current", "mixed_current_with_legacy_residue"]).has(detected.kind)) {
    throw bootstrapError("ERR_BOOTSTRAP_ROLLBACK_INVALID", "Bootstrap rollback requires an activated current workspace");
  }
  const stage = await readStagedBootstrapStage(workspaceRoot, bootstrapJobRef);
  if (!stableEqual(stage.rollback_checkpoint_ref, checkpointRef)) {
    throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", "Bootstrap rollback checkpoint is not bound to the staged activation plan");
  }
  const checkpoint = await readRollbackCheckpoint(workspaceRoot, bootstrapJobRef, checkpointRef);
  await verifyCheckpointActivated(workspaceRoot, checkpoint);
  await assertNoUnexpectedBootstrapFiles(workspaceRoot, checkpoint);
  if (checkpoint.acceptance_state !== "pending") {
    throw bootstrapError("ERR_BOOTSTRAP_ROLLBACK_ACCEPTED", "Bootstrap rollback is unavailable after acceptance");
  }

  for (const entry of [...checkpoint.new_files].sort((left, right) => right.path.localeCompare(left.path))) {
    const guarded = await assertWorkspacePathAllowed(workspaceRoot, entry.path);
    await rm(guarded.path, { force: false });
  }
  const manifestPath = resolve(workspaceRoot, WORKSPACE_MANIFEST_PATH);
  await rm(manifestPath, { force: false });
  const finalKind = (await detectWorkspaceFormat(workspaceRoot)).kind;
  if (finalKind !== "legacy") {
    throw bootstrapError("ERR_BOOTSTRAP_ROLLBACK_INVALID", "Bootstrap rollback did not restore legacy classification");
  }
  return deepFreeze({
    status: "rolled_back",
    action: "rolled_back",
    bootstrap_job_ref: bootstrapJobRef,
    checkpoint_ref: checkpointRef,
    operation_id: operation.id,
  });
}

export async function acceptBootstrapActivation(root, input, options) {
  const normalized = normalizeAcceptanceInput(input);
  const operation = normalizeAcceptanceOptions(options);
  const workspaceRoot = await assertSafeWorkspaceRoot(root);
  const pendingIds = await pendingTransactionIds(workspaceRoot);
  if (pendingIds.length) {
    if (pendingIds.length !== 1 || pendingIds[0] !== operation.id) {
      throw bootstrapError("ERR_WORKSPACE_TRANSACTION_PENDING", "Recover the pending workspace transaction before Bootstrap acceptance");
    }
    await recoverWorkspaceTransaction(workspaceRoot, { id: operation.id });
  }

  const stage = await readStagedBootstrapStage(workspaceRoot, normalized.bootstrap_job_ref);
  if (!stableEqual(stage.rollback_checkpoint_ref, normalized.checkpoint_ref)) {
    throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", "Bootstrap acceptance checkpoint is not bound to the staged activation plan");
  }
  const checkpoint = await readRollbackCheckpoint(
    workspaceRoot,
    normalized.bootstrap_job_ref,
    normalized.checkpoint_ref,
  );
  const existing = await readBootstrapAcceptanceCompanion(
    workspaceRoot,
    normalized.bootstrap_job_ref,
    normalized.checkpoint_ref,
    { optional: true },
  );
  if (existing) {
    if (
      existing.stage_hash !== stage.semantic_hash
      || !stableEqual(existing.manifest, checkpoint.manifest)
      || existing.mode !== normalized.mode
      || !stableEqual(existing.evidence_refs, normalized.evidence_refs)
    ) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance already exists with different bindings");
    }
    return acceptanceResult(existing, true);
  }

  const detected = await detectWorkspaceFormat(workspaceRoot);
  if (!new Set(["current", "mixed_current_with_legacy_residue"]).has(detected.kind)) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance requires an activated current workspace");
  }
  const manifest = await readCurrentManifest(workspaceRoot);
  if (!stableEqual(manifest, stage.manifest)) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance manifest differs from the staged activation plan");
  }

  let validationHead;
  if (normalized.mode === "strict") {
    await verifyStageArtifacts(workspaceRoot, stage);
    await verifyActivatedStage(workspaceRoot, stage);
    await verifyCheckpointActivated(workspaceRoot, checkpoint);
    await assertNoUnexpectedBootstrapFiles(workspaceRoot, checkpoint);
    validationHead = await buildStrictAcceptanceHead(workspaceRoot, stage, checkpoint, normalized);
  } else {
    validationHead = await buildReconciliationAcceptanceHead(workspaceRoot, stage, checkpoint, normalized);
    const confirmedHead = await buildReconciliationAcceptanceHead(workspaceRoot, stage, checkpoint, normalized);
    if (!stableEqual(validationHead, confirmedHead)) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation head changed during validation");
    }
  }

  const acceptance = buildBootstrapAcceptanceFact({
    bootstrap_job_ref: normalized.bootstrap_job_ref,
    checkpoint_ref: normalized.checkpoint_ref,
    stage_hash: stage.semantic_hash,
    manifest: checkpoint.manifest,
    mode: normalized.mode,
    accepted_at: new Date().toISOString(),
    evidence_refs: normalized.evidence_refs,
    validation_head: validationHead,
  });
  await commitBootstrapAcceptanceTransaction(workspaceRoot, {
    id: operation.id,
    faultInjector: operation.faultInjector,
    manifest,
    acceptance,
  });
  const persisted = await readBootstrapAcceptanceCompanion(
    workspaceRoot,
    normalized.bootstrap_job_ref,
    normalized.checkpoint_ref,
  );
  if (!stableEqual(persisted, acceptance)) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Persisted Bootstrap acceptance differs from its validated fact");
  }
  return acceptanceResult(persisted, false);
}

export async function restoreBootstrapWorkspace(root, input) {
  const normalized = canonicalMapping(input, "Bootstrap restore input");
  assertExactKeys(normalized, ["object_ref", "budget_bytes"], "Bootstrap restore input");
  assertNoRawSecrets(normalized.object_ref, "Bootstrap restore object_ref");
  const objectRef = storedObjectRef(normalizeAuthorityObjectRef(normalized.object_ref, "Bootstrap restore object_ref"));
  if (objectRef.kind !== "delivery") {
    throw bootstrapError("ERR_BOOTSTRAP_RESTORE_INVALID", "Bootstrap restore object_ref must identify a delivery");
  }
  const policy = normalizeRecoveryPolicy({
    default_restore_budget_bytes: normalized.budget_bytes ?? DEFAULT_RECOVERY_POLICY.default_restore_budget_bytes,
  });
  const [authority, restore, currentJournal] = await Promise.all([
    readRuntimeObject(root, objectRef),
    planRecoveryRestoreWithPolicy(root, {
      object_ref: objectRef,
      ...(normalized.budget_bytes === undefined ? {} : { budget_bytes: normalized.budget_bytes }),
    }, policy),
    replayRecoveryJournalInternal(root, { object_ref: objectRef }),
  ]);
  return deepFreeze({
    status: "ready",
    object_ref: objectRef,
    runtime: authority.runtime,
    continuation: authority.continuation,
    selected_pack_ref: restore.selected_pack_ref,
    rejected_packs: restore.rejected_packs,
    next_action: restore.next_action,
    current_cursor: currentJournal.cursor,
    validation_head: {
      selected_pack_ref: restore.selected_pack_ref,
      base_cursor: restore.base_cursor,
      current_cursor: currentJournal.cursor,
      journal_delta_count: restore.journal_delta.length,
      journal_warning_count: currentJournal.warnings.length,
    },
  });
}

export function normalizeBootstrapStage(value) {
  const input = canonicalMapping(value, "Bootstrap stage");
  assertExactKeys(input, STAGE_KEYS, "Bootstrap stage");
  if (input.status !== "staged") throw bootstrapError("ERR_BOOTSTRAP_STAGE_INVALID", "Bootstrap stage status must be staged");
  const stageId = normalizeBootstrapIdentifier(input.stage_id, "Bootstrap stage.stage_id");
  const bootstrapJobRef = normalizeBootstrapJobRef(input.bootstrap_job_ref);
  const curation = normalizeCurationProposal(input.curation);
  const audit = normalizeAuditProposal(input.audit);
  assertApprovedBinding(bootstrapJobRef, curation, audit);
  assertNoRawSecrets(input.manifest, "Bootstrap stage manifest");
  const manifest = validateWorkspaceManifest(input.manifest);
  assertNoRawSecrets(input.delivery_object_ref, "Bootstrap stage delivery_object_ref");
  const deliveryObjectRef = storedObjectRef(normalizeAuthorityObjectRef(input.delivery_object_ref, "Bootstrap stage.delivery_object_ref"));
  if (deliveryObjectRef.kind !== "delivery") throw bootstrapError("ERR_BOOTSTRAP_STAGE_INVALID", "Bootstrap stage delivery reference is invalid");
  const writeSet = normalizeWriteSet(input.write_set);
  const compiledRecords = normalizeCompiledRecords(input.compiled_records);
  const activeRecordIds = normalizeActiveRecordIds(input.active_record_ids);
  validateCompiledRecordBinding(curation, compiledRecords, activeRecordIds, writeSet);
  const packRef = normalizePackRef(input.pack_ref, deliveryObjectRef);
  const checkpoint = normalizeSnapshotRef(input.checkpoint);
  const legacyFreezeInventory = input.legacy_freeze_inventory === undefined
    ? undefined
    : normalizeLegacyFreezeInventory(input.legacy_freeze_inventory);
  validateCompleteWriteSet({
    manifest,
    curation,
    deliveryObjectRef,
    writeSet,
    compiledRecords,
    packRef,
    checkpoint,
  });
  const rollbackCheckpointRef = normalizeCheckpointRef(input.rollback_checkpoint_ref, bootstrapJobRef);
  const semanticDurable = stageSemanticDurable({
    stage_id: stageId,
    bootstrap_job_ref: bootstrapJobRef,
    manifest,
    curation,
    audit,
    delivery_object_ref: deliveryObjectRef,
    write_set: writeSet,
    compiled_records: compiledRecords,
    active_record_ids: activeRecordIds,
    pack_ref: packRef,
    checkpoint,
    ...(legacyFreezeInventory === undefined ? {} : { legacy_freeze_inventory: legacyFreezeInventory }),
  });
  const semanticHash = normalizeSha256(input.semantic_hash, "Bootstrap stage.semantic_hash");
  if (canonicalHash(semanticDurable) !== semanticHash) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap stage semantic hash does not match its activation plan");
  }
  const expectedCheckpoint = buildRollbackCheckpoint({
    bootstrapJobRef,
    manifest,
    writeSet,
    stageHash: semanticHash,
    legacyFreezeInventory,
  });
  if (!stableEqual(rollbackCheckpointRef, expectedCheckpoint.ref)) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap rollback checkpoint ref does not match the stage");
  }
  const expectedArtifacts = buildStagingArtifacts({
    status: "staged",
    stage_id: stageId,
    bootstrap_job_ref: bootstrapJobRef,
    manifest,
    curation,
    audit,
    delivery_object_ref: deliveryObjectRef,
    write_set: writeSet,
    compiled_records: compiledRecords,
    active_record_ids: activeRecordIds,
    pack_ref: packRef,
    checkpoint,
    ...(legacyFreezeInventory === undefined ? {} : { legacy_freeze_inventory: legacyFreezeInventory }),
    rollback_checkpoint_ref: rollbackCheckpointRef,
    semantic_hash: semanticHash,
  });
  const staging = normalizeStagingRefs(input.staging);
  const expectedStaging = Object.fromEntries(expectedArtifacts.map((artifact) => [artifact.name, {
    path: artifact.path,
    sha256: artifact.sha256,
  }]));
  if (!stableEqual(staging, expectedStaging)) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap staging artifact refs do not match the stage");
  }
  return deepFreeze({
    status: "staged",
    stage_id: stageId,
    bootstrap_job_ref: bootstrapJobRef,
    manifest,
    curation,
    audit,
    delivery_object_ref: deliveryObjectRef,
    write_set: writeSet,
    compiled_records: compiledRecords,
    active_record_ids: activeRecordIds,
    pack_ref: packRef,
    checkpoint,
    ...(legacyFreezeInventory === undefined ? {} : { legacy_freeze_inventory: legacyFreezeInventory }),
    rollback_checkpoint_ref: rollbackCheckpointRef,
    staging,
    semantic_hash: semanticHash,
  });
}

function normalizeStageInput(value) {
  const input = canonicalMapping(value, "Bootstrap stage input");
  assertExactKeys(input, [
    "bootstrap_job_ref",
    "manifest",
    "curation",
    "audit",
    "delivery",
    "checkpoint",
    "recovery",
  ], "Bootstrap stage input");
  const bootstrapJobRef = normalizeBootstrapJobRef(input.bootstrap_job_ref);
  const curation = normalizeCurationProposal(input.curation);
  const audit = normalizeAuditProposal(input.audit);
  assertApprovedBinding(bootstrapJobRef, curation, audit);
  const manifestInput = canonicalMapping(input.manifest, "Bootstrap manifest input");
  assertExactKeys(manifestInput, ["project_id", "workspace_id"], "Bootstrap manifest input");
  const deliveryInput = canonicalMapping(input.delivery, "Bootstrap delivery input");
  assertExactKeys(deliveryInput, ["object_ref", "object_type", "runtime", "continuation"], "Bootstrap delivery input");
  assertNoRawSecrets(deliveryInput.object_ref, "Bootstrap delivery object_ref");
  if (deliveryInput.object_type !== "cycle") {
    throw bootstrapError("ERR_BOOTSTRAP_DELIVERY_INVALID", "Bootstrap delivery object_type must be cycle");
  }
  const delivery = compileRuntimeObjectDocuments({
    object_ref: deliveryInput.object_ref,
    runtime: deliveryInput.runtime,
    continuation: deliveryInput.continuation,
  });
  if (delivery.object_ref.kind !== "delivery") {
    throw bootstrapError("ERR_BOOTSTRAP_DELIVERY_INVALID", "Bootstrap delivery object_ref must be delivery");
  }
  const checkpointInput = canonicalMapping(input.checkpoint, "Bootstrap checkpoint input");
  assertExactKeys(checkpointInput, ["snapshot_kind", "object"], "Bootstrap checkpoint input");
  if (checkpointInput.snapshot_kind !== "checkpoint") {
    throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", "Bootstrap Snapshot must be a checkpoint");
  }
  const checkpointObject = canonicalMapping(checkpointInput.object, "Bootstrap checkpoint object");
  if (!sameRef(checkpointObject.object_ref, delivery.object_ref) || checkpointObject.object_type !== "cycle") {
    throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", "Bootstrap checkpoint must belong to the C21 delivery");
  }
  const recovery = canonicalMapping(input.recovery, "Bootstrap recovery input");
  assertExactKeys(recovery, ["sealed_at", "worktree_summary"], "Bootstrap recovery input");
  const manifest = createWorkspaceManifest({
    project_id: normalizeBootstrapIdentifier(manifestInput.project_id, "Bootstrap manifest project_id"),
    workspace_id: normalizeBootstrapIdentifier(manifestInput.workspace_id, "Bootstrap manifest workspace_id"),
    created_at: normalizeTimestamp(checkpointObject.checkpoint_at, "Bootstrap checkpoint checkpoint_at"),
  });
  return {
    bootstrapJobRef,
    manifest,
    curation,
    audit,
    delivery,
    checkpoint: { snapshot_kind: "checkpoint", object: checkpointObject },
    recovery: {
      sealed_at: normalizeTimestamp(recovery.sealed_at, "Bootstrap recovery sealed_at"),
      worktree_summary: recovery.worktree_summary,
    },
  };
}

function compileBootstrapWorkspace(input, stageId, legacyFreezeInventory) {
  const compiledPatches = compileCurationPatches(input.curation);
  const recordStore = compileRecordStore(compiledPatches.patches);
  const activePointer = compileActivePointerDocument({
    schema_version: AUTHORITY_SCHEMA_VERSION,
    active: { delivery: input.delivery.object_ref },
  });
  const capsule = compileInitialContextCapsule({
    object_ref: input.delivery.object_ref,
    records: recordStore.records,
    continuation: input.delivery.continuation,
  });
  const recordRefs = recordStore.records.map((record) => ({
    type: "record",
    id: record.attributes.id,
    semantic_hash: record.attributes.semantic_hash,
  }));
  const evidenceRefs = uniqueSources(input.curation.records).map((source) => ({
    type: "file",
    path: source.locator,
    digest: source.digest,
  }));
  const pack = compileRecoveryPackProjection({
    object_ref: input.delivery.object_ref,
    sealed_at: input.recovery.sealed_at,
    trigger: "pre_compact",
    capsule: capsule.capsule,
    continuation: input.delivery.continuation,
    record_refs: recordRefs,
    receipt_refs: [],
    evidence_refs: evidenceRefs,
    worktree_summary: input.recovery.worktree_summary,
    cursor: capsule.capsule.cursor,
  });
  const snapshot = buildSnapshotProjection({
    snapshot_kind: input.checkpoint.snapshot_kind,
    manifest: input.manifest,
    object: input.checkpoint.object,
    records: recordStore.records,
  });
  const hostStatus = compileHostStatusProjection({
    generated_at: input.checkpoint.object.checkpoint_at,
    generation: 0,
    manifest: input.manifest,
    delivery: bootstrapProjectionDelivery(input.delivery, input.checkpoint.object),
    continuation: input.delivery.continuation,
  });
  const snapshotPath = snapshotProjectionPath(snapshot);
  const writes = canonicalWriteSet([
    { path: input.delivery.runtime_path, content: renderYaml(input.delivery.runtime) },
    { path: input.delivery.continuation_path, content: renderYaml(input.delivery.continuation) },
    { path: ".pipeline/runtime/active.yaml", content: renderYaml(activePointer) },
    { path: HOST_STATUS_PATH, content: `${JSON.stringify(hostStatus, null, 2)}\n` },
    ...recordStore.writes,
    { path: capsule.path, content: renderYaml(capsule.capsule) },
    ...pack.writes,
    { path: snapshotPath, content: renderYaml(snapshot) },
  ]);
  const activeRecordIds = Object.fromEntries(Object.entries(input.curation.active_by_dedupe_key).map(([dedupeKey, candidateKey]) => [
    dedupeKey,
    compiledPatches.byCandidate.get(candidateKey).id,
  ]).sort(([left], [right]) => left.localeCompare(right)));
  const checkpointRef = { path: snapshotPath, semantic_hash: snapshot.semantic_hash };
  const semanticDurable = stageSemanticDurable({
    stage_id: stageId,
    bootstrap_job_ref: input.bootstrapJobRef,
    manifest: input.manifest,
    curation: input.curation,
    audit: input.audit,
    delivery_object_ref: input.delivery.object_ref,
    write_set: writes,
    compiled_records: recordStore.records,
    active_record_ids: activeRecordIds,
    pack_ref: pack.pack_ref,
    checkpoint: checkpointRef,
    legacy_freeze_inventory: legacyFreezeInventory,
  });
  const semanticHash = canonicalHash(semanticDurable);
  const rollbackCheckpoint = buildRollbackCheckpoint({
    bootstrapJobRef: input.bootstrapJobRef,
    manifest: input.manifest,
    writeSet: writes,
    stageHash: semanticHash,
    legacyFreezeInventory,
  });
  return deepFreeze({
    status: "staged",
    stage_id: stageId,
    bootstrap_job_ref: input.bootstrapJobRef,
    manifest: input.manifest,
    curation: input.curation,
    audit: input.audit,
    delivery_object_ref: input.delivery.object_ref,
    write_set: writes,
    compiled_records: recordStore.records,
    active_record_ids: activeRecordIds,
    pack_ref: pack.pack_ref,
    checkpoint: checkpointRef,
    legacy_freeze_inventory: legacyFreezeInventory,
    rollback_checkpoint_ref: rollbackCheckpoint.ref,
    semantic_hash: semanticHash,
  });
}

function compileCurationPatches(curation) {
  const byKey = new Map(curation.records.map((candidate) => [candidate.key, candidate]));
  const compiled = new Map();
  const visiting = new Set();
  const compile = (key) => {
    if (compiled.has(key)) return compiled.get(key);
    if (visiting.has(key)) throw bootstrapError("ERR_BOOTSTRAP_CURATION_CYCLE", "Bootstrap curation contains a supersedes cycle");
    const candidate = byKey.get(key);
    if (!candidate) throw bootstrapError("ERR_BOOTSTRAP_CURATION_BROKEN_EDGE", "Bootstrap curation supersedes edge is missing");
    visiting.add(key);
    const supersedes = candidate.supersedes.map((target) => compile(target).id).sort();
    const patch = createRecordPatch({ ...candidate.record_patch, supersedes });
    const persisted = buildPersistedRecord(patch);
    const result = { id: persisted.id, patch };
    compiled.set(key, result);
    visiting.delete(key);
    return result;
  };
  for (const key of [...byKey.keys()].sort()) compile(key);
  return {
    patches: [...compiled.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => value.patch),
    byCandidate: compiled,
  };
}

function validateCompiledRecordBinding(curation, compiledRecords, activeRecordIds, writeSet) {
  const compiledPatches = compileCurationPatches(curation);
  const expectedStore = compileRecordStore(compiledPatches.patches);
  if (!stableEqual(compiledRecords, expectedStore.records)) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap compiled Records do not match the curated proposals");
  }
  const expectedActive = Object.fromEntries(Object.entries(curation.active_by_dedupe_key).map(([dedupeKey, candidateKey]) => [
    dedupeKey,
    compiledPatches.byCandidate.get(candidateKey).id,
  ]).sort(([left], [right]) => left.localeCompare(right)));
  if (!stableEqual(activeRecordIds, expectedActive)) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap active Record IDs do not match the curated graph");
  }
  const actualWrites = new Map(writeSet.map((entry) => [entry.path, entry]));
  for (const expected of expectedStore.writes) {
    const actual = actualWrites.get(expected.path);
    if (!actual || actual.content !== expected.content) {
      throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap Record Store write set does not match the curated graph");
    }
  }
}

function validateCompleteWriteSet({ manifest, curation, deliveryObjectRef, writeSet, compiledRecords, packRef, checkpoint }) {
  const byPath = new Map(writeSet.map((entry) => [entry.path, entry]));
  const objectDirectory = `.pipeline/runtime/objects/${deliveryObjectRef.kind}/${deliveryObjectRef.id}`;
  const runtimePath = `${objectDirectory}/runtime.yaml`;
  const continuationPath = `${objectDirectory}/continuation.yaml`;
  const runtime = parseWriteYaml(byPath, runtimePath, "Bootstrap Runtime");
  const continuation = parseWriteYaml(byPath, continuationPath, "Bootstrap Continuation");
  const compiledRuntime = compileRuntimeObjectDocuments({ object_ref: deliveryObjectRef, runtime, continuation });
  if (
    byPath.get(runtimePath)?.content !== renderYaml(compiledRuntime.runtime)
    || byPath.get(continuationPath)?.content !== renderYaml(compiledRuntime.continuation)
  ) throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap Runtime write set is not canonical");

  const active = compileActivePointerDocument(parseWriteYaml(byPath, ".pipeline/runtime/active.yaml", "Bootstrap active pointer"));
  if (Object.keys(active.active).length !== 1 || !sameRef(active.active.delivery, deliveryObjectRef)) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap active pointer must contain only the delivery");
  }
  if (byPath.get(".pipeline/runtime/active.yaml")?.content !== renderYaml(active)) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap active pointer write is not canonical");
  }

  let hostStatus;
  try {
    hostStatus = parseHostStatusProjection(JSON.parse(byPath.get(HOST_STATUS_PATH)?.content ?? ""));
  } catch {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap Host status projection is missing or malformed");
  }
  const expectedHostStatus = compileHostStatusProjection({
    generated_at: hostStatus.generated_at,
    generation: 0,
    manifest,
    delivery: bootstrapProjectionDelivery(compiledRuntime, snapshotParsedForProjection(byPath, checkpoint.path)),
    continuation: compiledRuntime.continuation,
  });
  if (!stableEqual(hostStatus, expectedHostStatus)) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap Host status projection does not match the staged delivery");
  }

  const capsuleExpected = compileInitialContextCapsule({
    object_ref: deliveryObjectRef,
    records: compiledRecords,
    continuation: compiledRuntime.continuation,
  });
  const capsuleParsed = normalizePersistedCapsule(
    parseWriteYaml(byPath, capsuleExpected.path, "Bootstrap Capsule"),
    deliveryObjectRef,
  );
  if (!stableEqual(capsuleParsed, capsuleExpected.capsule) || byPath.get(capsuleExpected.path)?.content !== renderYaml(capsuleExpected.capsule)) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap Capsule does not match the empty-Journal projection");
  }

  const packPath = `.pipeline/runtime/recovery/packs/${packRef.object_ref.kind}/${packRef.object_ref.id}/${packRef.id}/pack.yaml`;
  const packParsed = parseWriteYaml(byPath, packPath, "Bootstrap Recovery Pack");
  const packExpected = compileRecoveryPackProjection({
    object_ref: packParsed.object_ref,
    sealed_at: packParsed.sealed_at,
    trigger: packParsed.trigger,
    capsule: packParsed.capsule,
    continuation: packParsed.continuation,
    record_refs: packParsed.record_refs,
    receipt_refs: packParsed.receipt_refs,
    evidence_refs: packParsed.evidence_refs,
    worktree_summary: packParsed.worktree_summary,
    cursor: packParsed.cursor,
    ...(packParsed.previous_pack_ref === undefined ? {} : { previous_pack_ref: packParsed.previous_pack_ref }),
  });
  if (!stableEqual(packExpected.pack_ref, packRef)) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap Recovery Pack ref does not match its content");
  }
  const expectedRecordRefs = compiledRecords.map((record) => ({
    type: "record",
    id: record.attributes.id,
    semantic_hash: record.attributes.semantic_hash,
  })).sort((left, right) => left.id.localeCompare(right.id));
  if (
    !stableEqual(packExpected.pack.capsule, capsuleExpected.capsule)
    || !stableEqual(packExpected.pack.continuation, compiledRuntime.continuation)
    || !stableEqual(packExpected.pack.record_refs, expectedRecordRefs)
    || packExpected.pack.receipt_refs.length !== 0
    || packExpected.pack.previous_pack_ref !== undefined
  ) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap Recovery Pack does not bind the initial delivery authorities");
  }
  for (const expected of packExpected.writes) {
    if (byPath.get(expected.path)?.content !== expected.content) {
      throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap Recovery Pack write set is not canonical");
    }
  }
  const expectedEvidence = uniqueSources(curation.records).map((source) => ({
    type: "file",
    path: source.locator,
    digest: source.digest,
  }));
  if (!stableEqual(packExpected.pack.evidence_refs, expectedEvidence)) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap Recovery Pack evidence does not match curated sources");
  }

  const snapshotParsed = parseWriteYaml(byPath, checkpoint.path, "Bootstrap checkpoint Snapshot");
  const snapshotExpected = buildSnapshotProjection({
    snapshot_kind: snapshotParsed.snapshot_kind,
    project: snapshotParsed.project,
    object: snapshotParsed.object,
    records: snapshotParsed.records,
  });
  if (
    snapshotProjectionPath(snapshotExpected) !== checkpoint.path
    || snapshotExpected.semantic_hash !== checkpoint.semantic_hash
    || byPath.get(checkpoint.path)?.content !== renderYaml(snapshotExpected)
    || !stableEqual(snapshotExpected.records, compiledRecords)
    || snapshotExpected.project.project_id !== manifest.project_id
  ) throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap checkpoint Snapshot is not canonical");

  const expectedPaths = new Set([
    runtimePath,
    continuationPath,
    ".pipeline/runtime/active.yaml",
    HOST_STATUS_PATH,
    ...compileRecordStore(compileCurationPatches(curation).patches).writes.map((entry) => entry.path),
    capsuleExpected.path,
    ...packExpected.writes.map((entry) => entry.path),
    checkpoint.path,
  ]);
  if (expectedPaths.size !== writeSet.length || writeSet.some((entry) => !expectedPaths.has(entry.path))) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap write set contains a missing or unexpected authority file");
  }
}

function bootstrapProjectionDelivery(delivery, checkpointObject) {
  return {
    delivery_kind: checkpointObject.object_type,
    object_ref: delivery.object_ref,
    status: delivery.runtime.status,
    revision: Number.isSafeInteger(delivery.runtime.revision) ? delivery.runtime.revision : 0,
  };
}

function snapshotParsedForProjection(byPath, path) {
  return parseWriteYaml(byPath, path, "Bootstrap checkpoint Snapshot").object;
}

function parseWriteYaml(byPath, path, label) {
  const entry = byPath.get(path);
  if (!entry) throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", `${label} is missing from the write set`);
  try {
    return parseYaml(entry.content);
  } catch {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", `${label} is malformed`);
  }
}

function buildStagingArtifacts(stage) {
  const checkpoint = buildRollbackCheckpoint({
    bootstrapJobRef: stage.bootstrap_job_ref,
    manifest: stage.manifest,
    writeSet: stage.write_set,
    stageHash: stage.semantic_hash,
    legacyFreezeInventory: stage.legacy_freeze_inventory,
  });
  const directory = migrationDirectory(stage.bootstrap_job_ref);
  const proposal = sealDocument({
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "proposal",
    proposal_kind: "bootstrap_activation",
    bootstrap_job_ref: stage.bootstrap_job_ref,
    curation_hash: stage.curation.semantic_hash,
    audit_hash: stage.audit.semantic_hash,
    record_count: stage.compiled_records.length,
    stage_hash: stage.semantic_hash,
  });
  const planStage = {
    status: stage.status,
    stage_id: stage.stage_id,
    bootstrap_job_ref: stage.bootstrap_job_ref,
    manifest: stage.manifest,
    curation: stage.curation,
    audit: stage.audit,
    delivery_object_ref: stage.delivery_object_ref,
    write_set: stage.write_set,
    compiled_records: stage.compiled_records,
    active_record_ids: stage.active_record_ids,
    pack_ref: stage.pack_ref,
    checkpoint: stage.checkpoint,
    ...(stage.legacy_freeze_inventory === undefined
      ? {}
      : { legacy_freeze_inventory: stage.legacy_freeze_inventory }),
    rollback_checkpoint_ref: checkpoint.ref,
    semantic_hash: stage.semantic_hash,
  };
  const plan = sealDocument({
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "proposal",
    proposal_kind: "bootstrap_activation_plan",
    stage: planStage,
  });
  return [
    stagingArtifact("proposal", `${directory}/proposal.yaml`, proposal),
    stagingArtifact("plan", `${directory}/plan.yaml`, plan),
    stagingArtifact("checkpoint", checkpoint.ref.path, checkpoint.document),
  ];
}

function buildRollbackCheckpoint({
  bootstrapJobRef,
  manifest,
  writeSet,
  stageHash,
  legacyFreezeInventory,
}) {
  const directory = migrationDirectory(bootstrapJobRef);
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "rollback_checkpoint",
    checkpoint_kind: "bootstrap_pre_acceptance",
    bootstrap_job_ref: bootstrapJobRef,
    stage_hash: stageHash,
    manifest: {
      path: WORKSPACE_MANIFEST_PATH,
      sha256: hashBytes(Buffer.from(renderYaml(manifest), "utf8")),
    },
    new_files: writeSet.map((entry) => ({ path: entry.path, sha256: entry.sha256 })),
    ...(legacyFreezeInventory === undefined
      ? {}
      : { legacy_freeze_inventory: normalizeLegacyFreezeInventory(legacyFreezeInventory) }),
    acceptance_state: "pending",
  };
  const document = sealDocument(durable);
  return {
    document,
    ref: {
      path: `${directory}/rollback-checkpoint.yaml`,
      semantic_hash: document.semantic_hash,
    },
  };
}

async function writeStagingArtifacts(root, artifacts) {
  const prepared = [];
  for (const artifact of artifacts) {
    const guarded = await assertWorkspacePathAllowed(root, artifact.path);
    const stats = await optionalLstat(guarded.path);
    if (stats) {
      if (!stats.isFile() || stats.isSymbolicLink()) {
        throw bootstrapError("ERR_BOOTSTRAP_STAGING_CONFLICT", "Bootstrap staging path is not a regular file");
      }
      const existing = await readFile(guarded.path);
      if (hashBytes(existing) !== artifact.sha256) {
        throw bootstrapError("ERR_BOOTSTRAP_STAGING_CONFLICT", "Bootstrap staging artifact conflicts with an existing delivery");
      }
    }
    prepared.push({ ...artifact, absolutePath: guarded.path, exists: Boolean(stats) });
  }
  for (const artifact of prepared.filter((entry) => !entry.exists)) {
    await mkdir(dirname(artifact.absolutePath), { recursive: true });
    const tempPath = `${artifact.absolutePath}.tmp-${process.pid}`;
    await writeFile(tempPath, artifact.content, { flag: "wx" });
    await rename(tempPath, artifact.absolutePath);
  }
}

async function verifyStageArtifacts(root, stage) {
  const artifacts = buildStagingArtifacts(stage);
  for (const artifact of artifacts) {
    const file = await readContainedFile(root, artifact.path, "Bootstrap staging artifact");
    if (hashBytes(file.content) !== artifact.sha256) {
      throw bootstrapError("ERR_BOOTSTRAP_STAGING_DRIFT", "Bootstrap staging artifact has drifted");
    }
  }
}

async function verifyActivatedStage(root, stage) {
  const manifest = await readCurrentManifest(root);
  if (!stableEqual(manifest, stage.manifest)) {
    throw bootstrapError("ERR_BOOTSTRAP_ACTIVATION_INVALID", "Activated Bootstrap manifest differs from the staged manifest");
  }
  for (const entry of stage.write_set) {
    const file = await readContainedFile(root, entry.path, "Bootstrap activated file");
    if (hashBytes(file.content) !== entry.sha256) {
      throw bootstrapError("ERR_BOOTSTRAP_ACTIVATION_INVALID", "Activated Bootstrap file differs from the staged write set");
    }
  }
  const pointer = await readActivePointer(root);
  if (!sameRef(pointer.active.delivery, stage.delivery_object_ref) || Object.keys(pointer.active).length !== 1) {
    throw bootstrapError("ERR_BOOTSTRAP_ACTIVATION_INVALID", "Bootstrap active pointer must reference only the delivery");
  }
  await readRuntimeObject(root, stage.delivery_object_ref);
  await readContextCapsuleInternal(root, stage.delivery_object_ref);
  for (const record of stage.compiled_records) await readRecord(root, record.attributes.id);
  const packValidation = await validateRecoveryPackInternal(root, stage.pack_ref);
  if (!packValidation.valid) throw bootstrapError("ERR_BOOTSTRAP_ACTIVATION_INVALID", "Bootstrap Recovery Pack did not validate");
  const snapshot = await readSnapshot(root, stage.checkpoint.path);
  if (snapshot.semantic_hash !== stage.checkpoint.semantic_hash) {
    throw bootstrapError("ERR_BOOTSTRAP_ACTIVATION_INVALID", "Bootstrap checkpoint Snapshot did not validate");
  }
}

async function verifyCheckpointActivated(root, checkpoint) {
  const manifestFile = await readContainedManifest(root);
  if (hashBytes(manifestFile.content) !== checkpoint.manifest.sha256) {
    throw bootstrapError("ERR_BOOTSTRAP_RECOVERY_INVALID", "Bootstrap manifest differs from the rollback checkpoint");
  }
  for (const entry of checkpoint.new_files) {
    const file = await readContainedFile(root, entry.path, "Bootstrap checkpoint file");
    if (hashBytes(file.content) !== entry.sha256) {
      throw bootstrapError("ERR_BOOTSTRAP_RECOVERY_INVALID", "Bootstrap activated file differs from the rollback checkpoint");
    }
  }
}

async function allCheckpointDataInstalled(root, checkpoint) {
  for (const entry of checkpoint.new_files) {
    try {
      const file = await readContainedFile(root, entry.path, "Bootstrap checkpoint file");
      if (hashBytes(file.content) !== entry.sha256) return false;
    } catch (error) {
      if (error?.code === "ERR_RECOVERY_REFERENCE_MISSING") return false;
      throw error;
    }
  }
  return true;
}

async function assertNoUnexpectedBootstrapFiles(root, checkpoint) {
  const expected = new Set(checkpoint.new_files.map((entry) => entry.path));
  const migrationRoot = migrationDirectory(checkpoint.bootstrap_job_ref);
  expected.add(`${migrationRoot}/proposal.yaml`);
  expected.add(`${migrationRoot}/plan.yaml`);
  expected.add(`${migrationRoot}/rollback-checkpoint.yaml`);
  const discovered = [];
  for (const zone of [".pipeline/runtime", ".pipeline/memory", ".pipeline/snapshots"]) {
    await collectRegularFiles(root, zone, discovered);
  }
  const unexpected = discovered.filter((path) => !expected.has(path));
  if (unexpected.length) {
    throw bootstrapError("ERR_BOOTSTRAP_ROLLBACK_DRIFT", "Bootstrap workspace contains post-checkpoint new-format files");
  }
}

async function collectRegularFiles(root, relativePath, output) {
  const guarded = await assertWorkspacePathAllowed(root, relativePath, {
    allowRoot: true,
    allowTransactionPaths: true,
  });
  let entries;
  try {
    entries = await readdir(guarded.path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return;
    throw error;
  }
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = `${relativePath}/${entry.name}`;
    if (entry.isSymbolicLink()) throw bootstrapError("ERR_BOOTSTRAP_PATH_FORBIDDEN", "Bootstrap workspace zones must not contain symbolic links");
    if (entry.isDirectory()) await collectRegularFiles(root, child, output);
    else if (entry.isFile()) output.push(child);
    else throw bootstrapError("ERR_BOOTSTRAP_PATH_FORBIDDEN", "Bootstrap workspace zones contain a non-regular entry");
  }
}

async function readRollbackCheckpoint(root, bootstrapJobRef, expectedRef) {
  const path = `${migrationDirectory(bootstrapJobRef)}/rollback-checkpoint.yaml`;
  if (expectedRef && expectedRef.path !== path) {
    throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", "Bootstrap rollback checkpoint path does not match the job");
  }
  const file = await readContainedFile(root, path, "Bootstrap rollback checkpoint");
  let parsed;
  try {
    parsed = parseYaml(file.content.toString("utf8"));
  } catch {
    throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", "Bootstrap rollback checkpoint is unreadable");
  }
  const checkpoint = normalizeRollbackCheckpoint(parsed, bootstrapJobRef);
  if (expectedRef && checkpoint.semantic_hash !== expectedRef.semantic_hash) {
    throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", "Bootstrap rollback checkpoint semantic hash has drifted");
  }
  return checkpoint;
}

async function readStagedBootstrapStage(root, bootstrapJobRef) {
  const directory = migrationDirectory(bootstrapJobRef);
  const paths = {
    proposal: `${directory}/proposal.yaml`,
    plan: `${directory}/plan.yaml`,
    checkpoint: `${directory}/rollback-checkpoint.yaml`,
  };
  const files = {};
  for (const [name, path] of Object.entries(paths)) {
    files[name] = await readContainedFile(root, path, `Bootstrap staging ${name}`);
  }
  let plan;
  try {
    plan = canonicalMapping(parseYaml(files.plan.content.toString("utf8")), "Bootstrap activation plan");
  } catch (error) {
    if (error?.code) throw error;
    throw bootstrapError("ERR_BOOTSTRAP_STAGING_DRIFT", "Bootstrap activation plan is unreadable");
  }
  assertExactKeys(plan, [
    "schema_version",
    "authority_role",
    "proposal_kind",
    "stage",
    "semantic_hash",
  ], "Bootstrap activation plan");
  if (
    plan.schema_version !== BOOTSTRAP_SCHEMA_VERSION
    || plan.authority_role !== "proposal"
    || plan.proposal_kind !== "bootstrap_activation_plan"
  ) throw bootstrapError("ERR_BOOTSTRAP_STAGING_DRIFT", "Bootstrap activation plan header is invalid");
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "proposal",
    proposal_kind: "bootstrap_activation_plan",
    stage: plan.stage,
  };
  if (normalizeSha256(plan.semantic_hash, "Bootstrap activation plan.semantic_hash") !== canonicalHash(durable)) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGING_DRIFT", "Bootstrap activation plan semantic hash is invalid");
  }
  const stage = normalizeBootstrapStage({
    ...plan.stage,
    staging: Object.fromEntries(Object.entries(paths).map(([name, path]) => [name, {
      path,
      sha256: hashBytes(files[name].content),
    }])),
  });
  if (!sameRef(stage.bootstrap_job_ref, bootstrapJobRef)) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGING_DRIFT", "Bootstrap activation plan belongs to another job");
  }
  return stage;
}

function normalizeRollbackCheckpoint(value, bootstrapJobRef) {
  const input = canonicalMapping(value, "Bootstrap rollback checkpoint");
  assertExactKeys(input, [
    "schema_version",
    "authority_role",
    "checkpoint_kind",
    "bootstrap_job_ref",
    "stage_hash",
    "manifest",
    "new_files",
    "legacy_freeze_inventory",
    "acceptance_state",
    "semantic_hash",
  ], "Bootstrap rollback checkpoint");
  if (
    input.schema_version !== BOOTSTRAP_SCHEMA_VERSION
    || input.authority_role !== "rollback_checkpoint"
    || input.checkpoint_kind !== "bootstrap_pre_acceptance"
  ) throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", "Bootstrap rollback checkpoint header is invalid");
  const jobRef = normalizeBootstrapJobRef(input.bootstrap_job_ref);
  if (!sameRef(jobRef, bootstrapJobRef)) throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", "Bootstrap rollback checkpoint belongs to another job");
  const manifest = canonicalMapping(input.manifest, "Bootstrap rollback checkpoint manifest");
  assertExactKeys(manifest, ["path", "sha256"], "Bootstrap rollback checkpoint manifest");
  if (manifest.path !== WORKSPACE_MANIFEST_PATH) throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", "Bootstrap rollback manifest path is invalid");
  const newFiles = normalizeWriteMetadata(input.new_files, "Bootstrap rollback checkpoint new_files");
  if (input.acceptance_state !== "pending") throw bootstrapError("ERR_BOOTSTRAP_ROLLBACK_ACCEPTED", "Bootstrap rollback checkpoint is no longer pending acceptance");
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "rollback_checkpoint",
    checkpoint_kind: "bootstrap_pre_acceptance",
    bootstrap_job_ref: jobRef,
    stage_hash: normalizeSha256(input.stage_hash, "Bootstrap rollback checkpoint stage_hash"),
    manifest: { path: WORKSPACE_MANIFEST_PATH, sha256: normalizeSha256(manifest.sha256, "Bootstrap rollback manifest sha256") },
    new_files: newFiles,
    ...(input.legacy_freeze_inventory === undefined
      ? {}
      : { legacy_freeze_inventory: normalizeLegacyFreezeInventory(input.legacy_freeze_inventory) }),
    acceptance_state: "pending",
  };
  const semanticHash = normalizeSha256(input.semantic_hash, "Bootstrap rollback checkpoint semantic_hash");
  if (semanticHash !== canonicalHash(durable)) throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", "Bootstrap rollback checkpoint semantic hash is invalid");
  return { ...durable, semantic_hash: semanticHash };
}

function normalizeStageOptions(options) {
  const input = canonicalMapping(options, "Bootstrap stage options");
  assertExactKeys(input, ["id"], "Bootstrap stage options");
  return { id: normalizeBootstrapIdentifier(input.id, "Bootstrap stage options.id") };
}

function normalizeActivationOptions(options) {
  assertPlainObject(options, "Bootstrap activation options");
  assertExactKeys(options, ["id", "faultInjector"], "Bootstrap activation options");
  if (options.faultInjector !== undefined && typeof options.faultInjector !== "function") {
    throw bootstrapError("ERR_BOOTSTRAP_ACTIVATION_INVALID", "Bootstrap activation faultInjector must be a function");
  }
  return {
    id: normalizeBootstrapIdentifier(options.id, "Bootstrap activation options.id"),
    faultInjector: options.faultInjector,
  };
}

function normalizeRollbackOptions(options) {
  const input = canonicalMapping(options, "Bootstrap rollback options");
  assertExactKeys(input, ["id"], "Bootstrap rollback options");
  return { id: normalizeBootstrapIdentifier(input.id, "Bootstrap rollback options.id") };
}

function normalizeAcceptanceInput(value) {
  const input = canonicalMapping(value, "Bootstrap acceptance input");
  assertExactKeys(input, [
    "bootstrap_job_ref",
    "checkpoint_ref",
    "mode",
    "evidence_refs",
    "legacy_freeze_binding",
  ], "Bootstrap acceptance input");
  const bootstrapJobRef = normalizeBootstrapJobRef(input.bootstrap_job_ref);
  const checkpointRef = normalizeCheckpointRef(input.checkpoint_ref, bootstrapJobRef);
  if (!new Set(["strict", "reconciliation"]).has(input.mode)) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance mode must be strict or reconciliation");
  }
  assertNoRawSecrets(input.evidence_refs, "Bootstrap acceptance evidence_refs");
  const evidenceRefs = normalizeBootstrapAcceptanceEvidenceRefs(input.evidence_refs);
  return {
    bootstrap_job_ref: bootstrapJobRef,
    checkpoint_ref: checkpointRef,
    mode: input.mode,
    evidence_refs: evidenceRefs,
    ...(input.legacy_freeze_binding === undefined
      ? {}
      : { legacy_freeze_binding: normalizeLegacyFreezeBindingRef(input.legacy_freeze_binding) }),
  };
}

function normalizeLegacyFreezeBindingRef(value) {
  const input = canonicalMapping(value, "Bootstrap legacy freeze binding ref");
  assertExactKeys(input, ["path", "sha256"], "Bootstrap legacy freeze binding ref");
  return {
    path: normalizeSafeRepoPath(input.path, "Bootstrap legacy freeze binding ref.path"),
    sha256: normalizeSha256(input.sha256, "Bootstrap legacy freeze binding ref.sha256"),
  };
}

function normalizeAcceptanceOptions(options) {
  assertPlainObject(options, "Bootstrap acceptance options");
  assertExactKeys(options, ["id", "faultInjector"], "Bootstrap acceptance options");
  if (options.faultInjector !== undefined && typeof options.faultInjector !== "function") {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance faultInjector must be a function");
  }
  return {
    id: normalizeBootstrapIdentifier(options.id, "Bootstrap acceptance options.id"),
    faultInjector: options.faultInjector,
  };
}

async function observeAcceptanceProofs(root, stage, checkpoint, acceptanceInput) {
  const verifiedEvidence = await verifyAcceptanceEvidence(root, stage, acceptanceInput.evidence_refs);
  const freeze = await resolveLegacyFreezeExpectation(root, checkpoint, acceptanceInput.legacy_freeze_binding);
  const actualInventory = await captureLegacyFreezeInventory(root, "ERR_BOOTSTRAP_ACCEPTANCE_INVALID");
  if (!stableEqual(actualInventory, freeze.inventory)) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap legacy freeze inventory has drifted");
  }
  return {
    verified_evidence_hash: canonicalHash(verifiedEvidence),
    legacy_freeze_inventory_hash: canonicalHash(freeze.inventory),
    legacy_freeze_source: freeze.source,
  };
}

async function verifyAcceptanceEvidence(root, stage, evidenceRefs) {
  const refs = normalizeBootstrapAcceptanceEvidenceRefs(evidenceRefs);
  const snapshots = refs.filter((entry) => entry.type === "snapshot");
  if (snapshots.length !== 1) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance requires exactly one checkpoint Snapshot evidence ref");
  }
  for (const ref of refs) {
    if (ref.type === "snapshot") {
      let snapshot;
      try {
        snapshot = await readSnapshot(root, ref.path);
      } catch (error) {
        if (new Set(["ERR_WORKSPACE_PATH_FORBIDDEN", "ERR_RECOVERY_PATH_FORBIDDEN"]).has(error?.code)) throw error;
        throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance Snapshot evidence is invalid");
      }
      if (
        ref.path !== stage.checkpoint.path
        || ref.semantic_hash !== stage.checkpoint.semantic_hash
        || snapshot.semantic_hash !== ref.semantic_hash
      ) {
        throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance Snapshot evidence does not match the staged checkpoint");
      }
      continue;
    }
    let file;
    try {
      file = await readContainedFile(root, ref.path, "Bootstrap acceptance file evidence");
    } catch (error) {
      if (new Set(["ERR_WORKSPACE_PATH_FORBIDDEN", "ERR_RECOVERY_PATH_FORBIDDEN"]).has(error?.code)) throw error;
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance file evidence is invalid");
    }
    if (hashBytes(file.content) !== ref.sha256) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap acceptance file evidence digest is invalid");
    }
  }
  return refs;
}

async function resolveLegacyFreezeExpectation(root, checkpoint, bindingRef) {
  const checkpointInventory = checkpoint.legacy_freeze_inventory;
  if (checkpointInventory !== undefined && bindingRef === undefined) {
    return {
      inventory: normalizeLegacyFreezeInventory(checkpointInventory),
      source: {
        kind: "rollback_checkpoint",
        checkpoint_ref: {
          path: `${migrationDirectory(checkpoint.bootstrap_job_ref)}/rollback-checkpoint.yaml`,
          semantic_hash: checkpoint.semantic_hash,
        },
      },
    };
  }
  if (bindingRef === undefined) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Legacy Bootstrap checkpoint requires an explicit freeze compatibility binding");
  }
  let source;
  try {
    source = await readContainedFile(root, bindingRef.path, "Bootstrap legacy freeze compatibility binding");
  } catch (error) {
    if (new Set(["ERR_WORKSPACE_PATH_FORBIDDEN", "ERR_RECOVERY_PATH_FORBIDDEN"]).has(error?.code)) throw error;
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap legacy freeze compatibility binding is missing or invalid");
  }
  if (hashBytes(source.content) !== bindingRef.sha256) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap legacy freeze compatibility file digest is invalid");
  }
  let binding;
  try {
    binding = normalizeLegacyFreezeCompatibilityBinding(parseYaml(source.content.toString("utf8")));
  } catch {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap legacy freeze compatibility binding is invalid");
  }
  const checkpointRef = {
    path: `${migrationDirectory(checkpoint.bootstrap_job_ref)}/rollback-checkpoint.yaml`,
    semantic_hash: checkpoint.semantic_hash,
  };
  if (
    !sameRef(binding.bootstrap_job_ref, checkpoint.bootstrap_job_ref)
    || !stableEqual(binding.checkpoint_ref, checkpointRef)
    || (checkpointInventory !== undefined
      && !stableEqual(binding.legacy_freeze_inventory, checkpointInventory))
  ) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap legacy freeze compatibility binding targets another checkpoint");
  }
  return {
    inventory: binding.legacy_freeze_inventory,
    source: {
      kind: "compatibility_binding",
      path: bindingRef.path,
      sha256: bindingRef.sha256,
      semantic_hash: binding.semantic_hash,
    },
  };
}

async function buildStrictAcceptanceHead(root, stage, checkpoint, acceptanceInput) {
  const proofs = await observeAcceptanceProofs(root, stage, checkpoint, acceptanceInput);
  const authority = await readRuntimeObject(root, stage.delivery_object_ref);
  const capsule = await readContextCapsuleInternal(root, stage.delivery_object_ref);
  if (capsule.cursor.streams.length !== 0) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Strict Bootstrap acceptance requires an empty Journal cursor");
  }
  const packValidation = await validateRecoveryPackInternal(root, stage.pack_ref);
  if (!packValidation.valid) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Strict Bootstrap acceptance requires the initial Recovery Pack to validate");
  }
  return {
    object_ref: stage.delivery_object_ref,
    runtime_hash: canonicalHash(authority.runtime),
    continuation_hash: canonicalHash(authority.continuation),
    capsule_semantic_hash: capsule.semantic_hash,
    current_cursor: capsule.cursor,
    initial_pack_ref: stage.pack_ref,
    head_pack_ref: stage.pack_ref,
    pack_chain: [stage.pack_ref],
    journal_event_count: 0,
    journal_warning_count: 0,
    restore_delta_count: 0,
    verified_evidence_hash: proofs.verified_evidence_hash,
    legacy_freeze_inventory_hash: proofs.legacy_freeze_inventory_hash,
    legacy_freeze_source: proofs.legacy_freeze_source,
  };
}

async function buildReconciliationAcceptanceHead(root, stage, checkpoint, acceptanceInput) {
  try {
    const proofs = await observeAcceptanceProofs(root, stage, checkpoint, acceptanceInput);
    await verifyStageArtifacts(root, stage);
    await verifyReconciliationBaseline(root, stage, checkpoint);
    const inventory = await inspectReconciliationInventory(root, stage, checkpoint);
    const authority = await readRuntimeObject(root, stage.delivery_object_ref);
    const pointer = await readActivePointer(root);
    if (Object.keys(pointer.active).length !== 1 || !sameRef(pointer.active.delivery, stage.delivery_object_ref)) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation active pointer has drifted");
    }

    const replay = await replayRecoveryJournalInternal(root, { object_ref: stage.delivery_object_ref });
    if (replay.warnings.length) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation Journal contains warnings");
    }
    await verifyReconciliationBlobs(root, replay.events, inventory.blob_paths);
    const capsule = await readContextCapsuleInternal(root, stage.delivery_object_ref);
    if (!stableEqual(capsule.cursor, replay.cursor)) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation Journal and Capsule cursors differ");
    }
    if (capsule.sources.receipts.length !== 0) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation cannot introduce Receipt authority");
    }
    if (capsule.sources.continuation.semantic_hash !== canonicalHash(authority.continuation)) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation Capsule continuation has drifted");
    }

    const expectedRecordRefs = stage.compiled_records.map((record) => ({
      type: "record",
      id: record.attributes.id,
      semantic_hash: record.attributes.semantic_hash,
    })).sort((left, right) => left.id.localeCompare(right.id));
    if (!stableEqual(capsule.sources.records, expectedRecordRefs)) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation Capsule Record authority has drifted");
    }

    const packs = await inspectRecoveryPackInventoryInternal(root, {
      object_ref: stage.delivery_object_ref,
    });
    const chain = validateReconciliationPackChain(packs, stage.pack_ref, expectedRecordRefs);
    const head = chain.at(-1);
    if (
      !stableEqual(packs.selected_pack_ref, head.pack_ref)
      || !stableEqual(head.pack.cursor, replay.cursor)
      || !stableEqual(head.pack.capsule, capsule)
      || !stableEqual(head.pack.continuation, authority.continuation)
    ) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation head is not coherent");
    }

    const restore = await planRecoveryRestoreWithPolicy(root, {
      object_ref: stage.delivery_object_ref,
    }, DEFAULT_RECOVERY_POLICY);
    if (
      restore.journal_delta.length !== 0
      || restore.rejected_packs.length !== 0
      || !stableEqual(restore.selected_pack_ref, head.pack_ref)
    ) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation restore head is not current");
    }

    return {
      object_ref: stage.delivery_object_ref,
      runtime_hash: canonicalHash(authority.runtime),
      continuation_hash: canonicalHash(authority.continuation),
      capsule_semantic_hash: capsule.semantic_hash,
      current_cursor: replay.cursor,
      initial_pack_ref: stage.pack_ref,
      head_pack_ref: head.pack_ref,
      pack_chain: chain.map((entry) => entry.pack_ref),
      journal_event_count: replay.events.length,
      journal_warning_count: 0,
      restore_delta_count: 0,
      record_inventory_hash: inventory.record_inventory_hash,
      receipt_inventory_hash: inventory.receipt_inventory_hash,
      snapshot_inventory_hash: inventory.snapshot_inventory_hash,
      verified_evidence_hash: proofs.verified_evidence_hash,
      legacy_freeze_inventory_hash: proofs.legacy_freeze_inventory_hash,
      legacy_freeze_source: proofs.legacy_freeze_source,
    };
  } catch (error) {
    if (error?.code === "ERR_BOOTSTRAP_ACCEPTANCE_INVALID") throw error;
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation authority is invalid");
  }
}

async function verifyReconciliationBaseline(root, stage, checkpoint) {
  const objectDirectory = `.pipeline/runtime/objects/${stage.delivery_object_ref.kind}/${stage.delivery_object_ref.id}`;
  const mutable = new Set([
    `${objectDirectory}/runtime.yaml`,
    `${objectDirectory}/continuation.yaml`,
    `.pipeline/memory/capsules/${stage.delivery_object_ref.kind}/${stage.delivery_object_ref.id}.yaml`,
  ]);
  for (const entry of checkpoint.new_files) {
    const file = await readContainedFile(root, entry.path, "Bootstrap reconciliation baseline");
    if (!mutable.has(entry.path) && hashBytes(file.content) !== entry.sha256) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation immutable authority has drifted");
    }
  }
  const initialPack = await validateRecoveryPackInternal(root, stage.pack_ref);
  if (!initialPack.valid) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation initial Pack is invalid");
  }
  const snapshot = await readSnapshot(root, stage.checkpoint.path);
  if (snapshot.semantic_hash !== stage.checkpoint.semantic_hash) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation Snapshot has drifted");
  }
  for (const record of stage.compiled_records) {
    const current = await readRecord(root, record.attributes.id);
    if (!stableEqual(current, record)) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation Record authority has drifted");
    }
  }
}

async function inspectReconciliationInventory(root, stage, checkpoint) {
  const discovered = [];
  for (const zone of [".pipeline/runtime", ".pipeline/memory", ".pipeline/snapshots"]) {
    await collectRegularFiles(root, zone, discovered);
  }
  const migrationRoot = migrationDirectory(stage.bootstrap_job_ref);
  const baseline = new Set([
    ...checkpoint.new_files.map((entry) => entry.path),
    `${migrationRoot}/proposal.yaml`,
    `${migrationRoot}/plan.yaml`,
    `${migrationRoot}/rollback-checkpoint.yaml`,
  ]);
  for (const path of baseline) {
    if (!discovered.includes(path)) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation baseline inventory is incomplete");
    }
  }
  const objectPrefix = `.pipeline/runtime/objects/${stage.delivery_object_ref.kind}/${stage.delivery_object_ref.id}`;
  const packPrefix = `.pipeline/runtime/recovery/packs/${stage.delivery_object_ref.kind}/${stage.delivery_object_ref.id}`;
  const journalPattern = new RegExp(`^${escapeRegExp(objectPrefix)}/events/[A-Za-z0-9][A-Za-z0-9._-]*/(?:main|subagent)/[A-Za-z0-9][A-Za-z0-9._-]*/\\d{8}\\.jsonl$`);
  const packPattern = new RegExp(`^${escapeRegExp(packPrefix)}/[a-f0-9]{64}/(?:pack|seal)\\.yaml$`);
  const blobPattern = /^\.pipeline\/runtime\/recovery\/blobs\/[a-f0-9]{64}$/;
  const extras = discovered.filter((path) => (
    !baseline.has(path)
    && !journalPattern.test(path)
    && !packPattern.test(path)
    && !blobPattern.test(path)
  ));
  if (extras.length) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation contains unexpected authority files");
  }
  const recordFiles = discovered.filter((path) => (
    path.startsWith(".pipeline/memory/records/")
    || path === ".pipeline/memory/index.yaml"
    || path === ".pipeline/memory/INDEX.md"
  )).sort();
  const receiptFiles = discovered.filter((path) => path.startsWith(".pipeline/runtime/receipts/")).sort();
  const snapshotFiles = discovered.filter((path) => path.startsWith(".pipeline/snapshots/")).sort();
  if (receiptFiles.length !== 0) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation cannot introduce Receipt authority");
  }
  if (snapshotFiles.length !== 1 || snapshotFiles[0] !== stage.checkpoint.path) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation Snapshot inventory has drifted");
  }
  const expectedRecords = checkpoint.new_files
    .map((entry) => entry.path)
    .filter((path) => (
      path.startsWith(".pipeline/memory/records/")
      || path === ".pipeline/memory/index.yaml"
      || path === ".pipeline/memory/INDEX.md"
    ))
    .sort();
  if (!stableEqual(recordFiles, expectedRecords)) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation Record inventory has drifted");
  }
  return {
    blob_paths: discovered.filter((path) => blobPattern.test(path)).sort(),
    record_inventory_hash: canonicalHash(recordFiles),
    receipt_inventory_hash: canonicalHash(receiptFiles),
    snapshot_inventory_hash: canonicalHash(snapshotFiles),
  };
}

async function verifyReconciliationBlobs(root, events, discoveredBlobPaths) {
  const descriptors = [];
  for (const event of events) collectRecoveryBlobDescriptors(event.payload, descriptors);
  const referenced = new Set();
  for (const descriptor of descriptors) {
    await readRecoveryBlobInternal(root, descriptor);
    referenced.add(`.pipeline/runtime/recovery/blobs/${descriptor.digest.slice(7)}`);
  }
  if (!stableEqual([...referenced].sort(), discoveredBlobPaths)) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation blob inventory has drifted");
  }
}

function collectRecoveryBlobDescriptors(value, output) {
  if (!value || typeof value !== "object") return;
  if (!Array.isArray(value) && value.storage === "content_addressed_blob") {
    output.push(value);
    return;
  }
  for (const nested of Array.isArray(value) ? value : Object.values(value)) {
    collectRecoveryBlobDescriptors(nested, output);
  }
}

function validateReconciliationPackChain(inventory, initialPackRef, expectedRecordRefs) {
  if (!inventory.entries.length || inventory.entries.some((entry) => entry.errors.length || !entry.pack)) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation contains an invalid Recovery Pack");
  }
  const byId = new Map(inventory.entries.map((entry) => [entry.pack_ref.id, entry]));
  const initial = byId.get(initialPackRef.id);
  if (!initial || initial.pack.previous_pack_ref !== undefined) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation initial Recovery Pack is missing");
  }
  const children = new Map();
  for (const entry of inventory.entries) {
    if (
      !stableEqual(entry.pack.record_refs, expectedRecordRefs)
      || entry.pack.receipt_refs.length !== 0
      || !stableEqual(entry.pack.capsule.sources.records, expectedRecordRefs)
      || entry.pack.capsule.sources.receipts.length !== 0
    ) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation Pack authority references have drifted");
    }
    const previous = entry.pack.previous_pack_ref;
    if (!previous) continue;
    if (!byId.has(previous.id)) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation contains an orphan Recovery Pack");
    }
    if (children.has(previous.id)) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation contains a Recovery Pack fork");
    }
    children.set(previous.id, entry);
  }
  const chain = [];
  const visited = new Set();
  let current = initial;
  while (current) {
    if (visited.has(current.pack_ref.id)) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation contains a Recovery Pack cycle");
    }
    visited.add(current.pack_ref.id);
    chain.push(current);
    const next = children.get(current.pack_ref.id);
    if (next && !cursorDominates(next.pack.cursor, current.pack.cursor)) {
      throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation Pack cursor moved backwards");
    }
    current = next;
  }
  if (visited.size !== inventory.entries.length) {
    throw bootstrapError("ERR_BOOTSTRAP_ACCEPTANCE_INVALID", "Bootstrap reconciliation Recovery Pack chain is disconnected");
  }
  return chain;
}

function cursorDominates(candidate, previous) {
  if (!stableEqual(candidate.object_ref, previous.object_ref)) return false;
  const current = new Map(candidate.streams.map((entry) => [cursorStreamIdentity(entry), entry]));
  for (const prior of previous.streams) {
    const next = current.get(cursorStreamIdentity(prior));
    if (!next || next.sequence < prior.sequence) return false;
    if (next.sequence === prior.sequence && (next.event_id !== prior.event_id || next.segment_id !== prior.segment_id)) {
      return false;
    }
  }
  return true;
}

function cursorStreamIdentity(entry) {
  return `${entry.session_id}\0${entry.writer.kind}\0${entry.writer.id}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function acceptanceResult(acceptance, idempotent) {
  return deepFreeze({
    status: "accepted",
    idempotent,
    acceptance_ref: {
      path: acceptancePathFor(acceptance.bootstrap_job_ref),
      semantic_hash: acceptance.semantic_hash,
    },
    acceptance,
  });
}

function normalizeWriteSet(value) {
  if (!Array.isArray(value) || value.length === 0) throw bootstrapError("ERR_BOOTSTRAP_STAGE_INVALID", "Bootstrap write_set must be non-empty");
  const entries = value.map((entry, index) => {
    const normalized = canonicalMapping(entry, `Bootstrap write_set[${index}]`);
    assertExactKeys(normalized, ["path", "content", "sha256"], `Bootstrap write_set[${index}]`);
    const path = normalizeSafeRepoPath(normalized.path, `Bootstrap write_set[${index}].path`);
    if (![".pipeline/runtime/", ".pipeline/memory/", ".pipeline/snapshots/"].some((prefix) => path.startsWith(prefix))) {
      throw bootstrapError("ERR_BOOTSTRAP_STAGE_INVALID", "Bootstrap write_set path is outside new-format zones");
    }
    if (typeof normalized.content !== "string") throw bootstrapError("ERR_BOOTSTRAP_STAGE_INVALID", "Bootstrap write_set content must be text");
    const sha256 = normalizeSha256(normalized.sha256, `Bootstrap write_set[${index}].sha256`);
    if (hashBytes(Buffer.from(normalized.content, "utf8")) !== sha256) {
      throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap write_set content hash does not match");
    }
    return { path, content: normalized.content, sha256 };
  }).sort((left, right) => left.path.localeCompare(right.path));
  assertUnique(entries.map((entry) => entry.path), "Bootstrap write_set paths");
  return entries;
}

function canonicalWriteSet(writes) {
  return normalizeWriteSet(writes.map((entry) => ({
    path: entry.path,
    content: String(entry.content),
    sha256: hashBytes(Buffer.from(String(entry.content), "utf8")),
  })));
}

function normalizeCompiledRecords(value) {
  if (!Array.isArray(value) || value.length === 0) throw bootstrapError("ERR_BOOTSTRAP_STAGE_INVALID", "Bootstrap compiled_records must be non-empty");
  return value.map((record) => normalizeCanonicalValue(record, "Bootstrap compiled Record")).sort((left, right) => left.attributes.id.localeCompare(right.attributes.id));
}

function normalizeActiveRecordIds(value) {
  const input = canonicalMapping(value, "Bootstrap active_record_ids");
  return Object.fromEntries(Object.entries(input).map(([dedupeKey, id]) => [
    dedupeKey,
    normalizeSafeIdentifier(id, "Bootstrap active Record id"),
  ]).sort(([left], [right]) => left.localeCompare(right)));
}

function normalizePackRef(value, expectedObjectRef) {
  const input = canonicalMapping(value, "Bootstrap Pack ref");
  assertExactKeys(input, ["object_ref", "id"], "Bootstrap Pack ref");
  const objectRef = storedObjectRef(normalizeAuthorityObjectRef(input.object_ref, "Bootstrap Pack ref.object_ref"));
  if (!sameRef(objectRef, expectedObjectRef)) throw bootstrapError("ERR_BOOTSTRAP_STAGE_INVALID", "Bootstrap Pack belongs to another object");
  return { object_ref: objectRef, id: normalizeSha256(input.id, "Bootstrap Pack ref.id") };
}

function normalizeSnapshotRef(value) {
  const input = canonicalMapping(value, "Bootstrap Snapshot ref");
  assertExactKeys(input, ["path", "semantic_hash"], "Bootstrap Snapshot ref");
  return {
    path: normalizeSafeRepoPath(input.path, "Bootstrap Snapshot ref.path"),
    semantic_hash: normalizeSha256(input.semantic_hash, "Bootstrap Snapshot ref.semantic_hash"),
  };
}

function normalizeCheckpointRef(value, bootstrapJobRef) {
  const input = canonicalMapping(value, "Bootstrap rollback checkpoint ref");
  assertExactKeys(input, ["path", "semantic_hash"], "Bootstrap rollback checkpoint ref");
  const path = normalizeSafeRepoPath(input.path, "Bootstrap rollback checkpoint ref.path");
  if (path !== `${migrationDirectory(bootstrapJobRef)}/rollback-checkpoint.yaml`) {
    throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", "Bootstrap rollback checkpoint path is not canonical");
  }
  return { path, semantic_hash: normalizeSha256(input.semantic_hash, "Bootstrap rollback checkpoint ref.semantic_hash") };
}

function normalizeStagingRefs(value) {
  const input = canonicalMapping(value, "Bootstrap staging refs");
  assertExactKeys(input, ["proposal", "plan", "checkpoint"], "Bootstrap staging refs");
  return Object.fromEntries(["proposal", "plan", "checkpoint"].map((name) => {
    const ref = canonicalMapping(input[name], `Bootstrap staging refs.${name}`);
    assertExactKeys(ref, ["path", "sha256"], `Bootstrap staging refs.${name}`);
    return [name, {
      path: normalizeSafeRepoPath(ref.path, `Bootstrap staging refs.${name}.path`),
      sha256: normalizeSha256(ref.sha256, `Bootstrap staging refs.${name}.sha256`),
    }];
  }));
}

function normalizeWriteMetadata(value, field) {
  if (!Array.isArray(value) || value.length === 0) throw bootstrapError("ERR_BOOTSTRAP_CHECKPOINT_INVALID", `${field} must be non-empty`);
  const entries = value.map((entry, index) => {
    const normalized = canonicalMapping(entry, `${field}[${index}]`);
    assertExactKeys(normalized, ["path", "sha256"], `${field}[${index}]`);
    return {
      path: normalizeSafeRepoPath(normalized.path, `${field}[${index}].path`),
      sha256: normalizeSha256(normalized.sha256, `${field}[${index}].sha256`),
    };
  }).sort((left, right) => left.path.localeCompare(right.path));
  assertUnique(entries.map((entry) => entry.path), `${field} paths`);
  return entries;
}

function stageSemanticDurable(value) {
  return {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "proposal",
    proposal_kind: "bootstrap_stage",
    stage_id: value.stage_id,
    bootstrap_job_ref: value.bootstrap_job_ref,
    manifest: value.manifest,
    curation_hash: value.curation.semantic_hash,
    audit_hash: value.audit.semantic_hash,
    delivery_object_ref: value.delivery_object_ref,
    write_set: value.write_set.map((entry) => ({ path: entry.path, sha256: entry.sha256 })),
    compiled_record_ids: value.compiled_records.map((record) => record.attributes.id).sort(),
    active_record_ids: value.active_record_ids,
    pack_ref: value.pack_ref,
    checkpoint: value.checkpoint,
    ...(value.legacy_freeze_inventory === undefined
      ? {}
      : { legacy_freeze_inventory: normalizeLegacyFreezeInventory(value.legacy_freeze_inventory) }),
  };
}

function assertApprovedBinding(bootstrapJobRef, curation, audit) {
  if (!sameRef(curation.bootstrap_job_ref, bootstrapJobRef) || !sameRef(audit.bootstrap_job_ref, bootstrapJobRef)) {
    throw bootstrapError("ERR_BOOTSTRAP_AUDIT_BINDING", "Bootstrap curation and audit belong to another job");
  }
  if (audit.status !== "approved" || audit.curation_hash !== curation.semantic_hash) {
    throw bootstrapError("ERR_BOOTSTRAP_AUDIT_REJECTED", "Bootstrap staging requires a matching approved audit");
  }
}

function uniqueSources(candidates) {
  const sources = new Map();
  for (const candidate of candidates) {
    for (const source of candidate.sources) {
      const existing = sources.get(source.locator);
      if (existing && existing.digest !== source.digest) {
        throw bootstrapError("ERR_BOOTSTRAP_SOURCE_CONFLICT", "Bootstrap source locator has conflicting digests");
      }
      sources.set(source.locator, source);
    }
  }
  return [...sources.values()].sort((left, right) => left.locator.localeCompare(right.locator));
}

function activationResult(stage, transactionId) {
  const records = deriveCandidateRecordRefs(stage);
  return deepFreeze({
    status: "activated",
    bootstrap_job_ref: stage.bootstrap_job_ref,
    transaction_id: transactionId,
    manifest: stage.manifest,
    object_ref: stage.delivery_object_ref,
    records,
    compiled_records: stage.compiled_records,
    pack_ref: stage.pack_ref,
    checkpoint: stage.checkpoint,
    rollback_checkpoint_ref: stage.rollback_checkpoint_ref,
  });
}

function deriveCandidateRecordRefs(stage) {
  const compiled = compileCurationPatches(stage.curation);
  const compiledRecordIds = new Set(stage.compiled_records.map((record) => record.attributes.id));
  const records = stage.curation.records.map((candidate) => {
    const assigned = compiled.byCandidate.get(candidate.key);
    if (!assigned || !compiledRecordIds.has(assigned.id)) {
      throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap candidate Record mapping is missing from compiled Records");
    }
    const activeId = stage.active_record_ids[candidate.record_patch.dedupe_key];
    if (candidate.active !== (assigned.id === activeId)) {
      throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap candidate Record mapping conflicts with the active Record index");
    }
    return { key: candidate.key, id: assigned.id, active: candidate.active };
  }).sort((left, right) => left.key.localeCompare(right.key));
  if (new Set(records.map((record) => record.id)).size !== compiledRecordIds.size) {
    throw bootstrapError("ERR_BOOTSTRAP_STAGE_INTEGRITY", "Bootstrap candidate Record mapping does not cover the compiled Record set");
  }
  return records;
}

function wrapBootstrapFaultInjector(faultInjector) {
  if (!faultInjector) return undefined;
  return async (event) => {
    const aliases = {
      before_manifest_activation: "before_manifest",
      after_manifest_activation: "after_manifest",
    };
    const bootstrapPhase = aliases[event.phase] ?? event.phase;
    await faultInjector({ ...event, transaction_phase: event.phase, bootstrap_phase: bootstrapPhase });
    if (bootstrapPhase !== event.phase) {
      await faultInjector({ ...event, transaction_phase: event.phase, phase: bootstrapPhase });
    }
  };
}

async function captureLegacyFreezeInventory(root, errorCode = "ERR_BOOTSTRAP_CHECKPOINT_INVALID") {
  try {
    const inventory = [];
    for (const path of LEGACY_FREEZE_PATHS) {
      const absolutePath = resolve(root, path);
      const before = await lstat(absolutePath, { bigint: true });
      if (!before.isFile() || before.isSymbolicLink()) throw new Error("legacy freeze path is not regular");
      const file = await readContainedFile(root, path, "Bootstrap legacy freeze file");
      const after = await lstat(absolutePath, { bigint: true });
      if (
        !after.isFile()
        || after.isSymbolicLink()
        || before.dev !== after.dev
        || before.ino !== after.ino
        || before.size !== after.size
        || before.mtimeNs !== after.mtimeNs
      ) throw new Error("legacy freeze file changed while observed");
      const sizeBytes = Number(after.size);
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes !== file.content.length) {
        throw new Error("legacy freeze file size is invalid");
      }
      inventory.push({
        path,
        sha256: hashBytes(file.content),
        size_bytes: sizeBytes,
        mtime_ns: String(after.mtimeNs),
      });
    }
    return normalizeLegacyFreezeInventory(inventory);
  } catch {
    throw bootstrapError(errorCode, "Bootstrap legacy freeze inventory is missing, unsafe, or unstable");
  }
}

async function assertSafeLegacyRoot(root) {
  return assertSafeWorkspaceRoot(root);
}

async function assertSafeWorkspaceRoot(root) {
  const workspaceRoot = resolve(root || ".");
  const stats = await lstat(workspaceRoot);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw bootstrapError("ERR_BOOTSTRAP_PATH_FORBIDDEN", "Bootstrap workspace root must be a regular non-symbolic directory");
  }
  await realpath(workspaceRoot);
  return workspaceRoot;
}

async function assertNoPendingTransaction(root) {
  const pendingIds = await pendingTransactionIds(root);
  if (pendingIds.length) throw bootstrapError("ERR_WORKSPACE_TRANSACTION_PENDING", "Recover the pending workspace transaction before Bootstrap staging or activation");
}

async function pendingTransactionIds(root) {
  const guarded = await assertWorkspacePathAllowed(root, ".pipeline/runtime/transactions", {
    allowedRoots: [".pipeline/runtime"],
    allowRoot: true,
    allowTransactionPaths: true,
  });
  let entries;
  try {
    entries = await readdir(guarded.path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return [];
    throw error;
  }
  if (entries.some((entry) => entry.isSymbolicLink() || !entry.isDirectory())) {
    throw bootstrapError("ERR_WORKSPACE_TRANSACTION_PENDING", "Workspace transaction storage contains an invalid pending entry");
  }
  return entries.map((entry) => entry.name).sort();
}

async function readContainedManifest(root) {
  const path = resolve(root, WORKSPACE_MANIFEST_PATH);
  const rel = relative(root, path);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw bootstrapError("ERR_BOOTSTRAP_PATH_FORBIDDEN", "Bootstrap manifest path escapes the workspace");
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw bootstrapError("ERR_BOOTSTRAP_PATH_FORBIDDEN", "Bootstrap manifest is not a regular file");
  return { path: WORKSPACE_MANIFEST_PATH, content: await readFile(path) };
}

function migrationDirectory(bootstrapJobRef) {
  return `${MIGRATIONS_ROOT}/${bootstrapJobRef.id}`;
}

function stagingArtifact(name, path, document) {
  const content = renderYaml(document);
  return { name, path, content, sha256: hashBytes(Buffer.from(content, "utf8")) };
}

function sealDocument(durable) {
  return { ...durable, semantic_hash: canonicalHash(durable) };
}

function renderYaml(value) {
  return `${stringifyYaml(value).trimEnd()}\n`;
}

function canonicalMapping(value, field) {
  assertPlainObject(value, field);
  return normalizeCanonicalValue(value, field);
}

function normalizeBootstrapIdentifier(value, field) {
  const normalized = normalizeSafeIdentifier(value, field);
  assertNoRawSecrets(normalized, field);
  return normalized;
}

function sameRef(left, right) {
  return Boolean(left && right) && left.kind === right.kind && left.id === right.id;
}

function assertUnique(values, field) {
  if (new Set(values).size !== values.length) throw bootstrapError("ERR_BOOTSTRAP_STAGE_INVALID", `${field} must be unique`);
}

async function optionalLstat(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function bootstrapError(code, message) {
  return authorityError(code, message);
}
