import { createHash, randomUUID } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRepositoryTargetStore } from "../repository-targets/index.js";
import { readRuntimeObject } from "../runtime/index.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeAuthorityObjectRef,
  normalizeSafeIdentifier,
  normalizeTimestamp,
  readCurrentManifest,
  storedObjectRef,
} from "../runtime/internal.js";
import { parseYaml, stringifyYaml } from "../serialization/index.js";
import { assertWorkspacePathAllowed, commitWorkspaceTransaction } from "../workspace-store/index.js";

const REGISTRY_PATH = ".pipeline/runtime/work-placements.yaml";
const DECISIONS = new Set(["shared", "isolated_worktree", "isolated_resources", "blocked"]);
const REPOSITORY_ACCESS = new Set(["read", "execute", "build", "write", "checkout"]);
const SOURCE_CHANGING_ACCESS = new Set(["build", "write", "checkout"]);
const RESOURCE_KINDS = new Set(["gpu", "port", "cache", "filesystem"]);
const RESOURCE_MODES = new Set(["shared", "exclusive", "mutable"]);
const INTEGRATION_METHODS = new Set(["merge", "rebase", "fast_forward"]);
const SHA = /^[a-f0-9]{40,64}$/;

export function normalizeWorkItemRef(value) {
  const reference = storedObjectRef(normalizeAuthorityObjectRef(value, "Work Item reference"));
  if (!new Set(["delivery", "experiment"]).has(reference.kind)) {
    throw placementError("ERR_WORK_ITEM_KIND_INVALID", "Work Item kind must be delivery or experiment");
  }
  return reference;
}

export function createWorkPlacementStore(input = {}) {
  assertPlainObject(input, "Work Placement store options");
  assertExactKeys(input, ["clock", "lease_ttl_ms"], "Work Placement store options");
  if (typeof input.clock !== "function") {
    throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", "Work Placement store clock must be a zero-argument function");
  }
  if (!Number.isSafeInteger(input.lease_ttl_ms) || input.lease_ttl_ms <= 0) {
    throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", "Work Placement lease_ttl_ms must be a positive integer");
  }
  const settings = { clock: input.clock, leaseTtlMs: input.lease_ttl_ms };
  return Object.freeze({
    assess(root, request) {
      return assess(root, request, settings);
    },
    assessAndAcquire(root, request, options = {}) {
      return assessAndAcquire(root, request, options, settings);
    },
    read(root, placementId) {
      return read(root, placementId, settings.clock);
    },
    list(root) {
      return list(root, settings.clock);
    },
    renew(root, request, options = {}) {
      return renew(root, request, options, settings);
    },
    release(root, request, options = {}) {
      return release(root, request, options, settings);
    },
    bindSession(root, request, options = {}) {
      return bindSession(root, request, options, settings);
    },
    resolveSession(root, request) {
      return resolveWorkItemSession(root, request, { clock: settings.clock });
    },
    recordIntegration(root, request, options = {}) {
      return recordIntegration(root, request, options, settings);
    },
    assertCompletionAllowed: inspectWorkItemCompletion,
  });
}

export async function inspectWorkItemCompletion(root, workItemRefInput) {
  const workItemRef = normalizeWorkItemRef(workItemRefInput);
  const registry = (await readRegistry(root)).value;
  const outstanding = [];
  for (const placement of registry.placements) {
    if (!sameRef(placement.work_item_ref, workItemRef)) continue;
    for (const claim of placement.repository_claims.filter(isSourceChangingClaim)) {
      const record = placement.integration_records.find((candidate) => (
        candidate.repository_id === claim.repository_id
        && candidate.integration_target_id === claim.integration_target_id
      ));
      let integrated = false;
      if (record?.evidence.target_contains_source) {
        try {
          const repository = await createRepositoryTargetStore({ clock: () => new Date().toISOString() }).read(root, claim.repository_id);
          await validateIntegrationProof(root, {
            repository_id: claim.repository_id,
            integration_target_id: claim.integration_target_id,
            repository,
            evidence: record.evidence,
          });
          integrated = true;
        } catch {
          integrated = false;
        }
      }
      if (!integrated) {
        outstanding.push({
          placement_id: placement.id,
          repository_id: claim.repository_id,
          integration_target_id: claim.integration_target_id,
        });
      }
    }
  }
  return {
    allowed: outstanding.length === 0,
    work_item_ref: workItemRef,
    outstanding,
  };
}

async function assess(root, request, settings) {
  const input = await normalizeAndValidateInput(root, request, settings.clock);
  const registry = (await readRegistry(root)).value;
  assertPlacementIdAvailable(input.id, registry.placements);
  assertSessionAvailable(input.session_binding, input.work_item_ref, registry.sessions);
  return buildAssessment(input, activePlacements(registry.placements, now(settings.clock)));
}

async function assessAndAcquire(root, request, options, settings) {
  const operation = normalizeOperation(options, `work-placement-acquire-${request?.id ?? "unknown"}`);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const timestamp = now(settings.clock);
    const input = await normalizeAndValidateInput(root, request, settings.clock);
    const registry = await readRegistry(root);
    assertPlacementIdAvailable(input.id, registry.value.placements);
    assertSessionAvailable(input.session_binding, input.work_item_ref, registry.value.sessions);
    const assessment = buildAssessment(input, activePlacements(registry.value.placements, timestamp));
    if (assessment.decision === "blocked") return assessment;
    const placement = normalizeStoredPlacement({
      ...assessment,
      schema_version: "1",
      status: "active",
      generation: 1,
      lease: {
        status: "active",
        fencing_token: randomUUID(),
        acquired_at: timestamp,
        expires_at: new Date(Date.parse(timestamp) + settings.leaseTtlMs).toISOString(),
      },
      integration_records: [],
      created_at: timestamp,
      updated_at: timestamp,
    });
    const next = addPlacementAndSession(registry.value, placement, input.session_binding);
    try {
      await persist(root, next, registry.hash, {
        ...operation,
        id: `${operation.id}-${attempt + 1}`,
      });
      return clone(placement);
    } catch (error) {
      if (error?.code !== "ERR_WORKSPACE_TRANSACTION_CONFLICT" || attempt === 5) throw error;
    }
  }
  throw placementError("ERR_WORK_PLACEMENT_ACQUIRE_CONFLICT", "Work Placement acquire retry budget was exhausted");
}

async function read(root, placementIdInput, clock = null) {
  const placementId = normalizeSafeIdentifier(placementIdInput, "Work Placement id");
  const placement = (await readRegistry(root)).value.placements.find(({ id }) => id === placementId);
  if (!placement) throw placementError("ERR_WORK_PLACEMENT_NOT_FOUND", `Work Placement ${placementId} was not found`);
  return clone(clock ? materializePlacement(placement, now(clock)) : placement);
}

async function list(root, clock = null) {
  const placements = (await readRegistry(root)).value.placements;
  return placements.map((placement) => clone(clock ? materializePlacement(placement, now(clock)) : placement));
}

async function release(root, request, options, settings) {
  assertPlainObject(request, "Work Placement release request");
  assertExactKeys(request, ["placement_id", "fencing_token"], "Work Placement release request");
  const placementId = normalizeSafeIdentifier(request.placement_id, "Work Placement release placement_id");
  const fencingToken = normalizeSafeIdentifier(request.fencing_token, "Work Placement release fencing_token");
  return updatePlacement(root, placementId, options, settings, (current, registry, timestamp) => {
    if (current.lease.status !== "active" || current.lease.fencing_token !== fencingToken) {
      throw placementError("ERR_WORK_PLACEMENT_FENCING_CONFLICT", "Work Placement lease fencing token is stale");
    }
    return {
      placement: normalizeStoredPlacement({
        ...current,
        status: "released",
        generation: current.generation + 1,
        lease: { ...current.lease, status: "released", released_at: timestamp },
        updated_at: timestamp,
      }),
      sessions: registry.sessions,
    };
  }, `work-placement-release-${placementId}`);
}

async function renew(root, request, options, settings) {
  assertPlainObject(request, "Work Placement renew request");
  assertExactKeys(request, ["placement_id", "fencing_token"], "Work Placement renew request");
  const placementId = normalizeSafeIdentifier(request.placement_id, "Work Placement renew placement_id");
  const fencingToken = normalizeSafeIdentifier(request.fencing_token, "Work Placement renew fencing_token");
  return updatePlacement(root, placementId, options, settings, (current, registry, timestamp) => {
    if (current.status !== "active" || current.lease.status !== "active" || current.lease.fencing_token !== fencingToken) {
      throw placementError("ERR_WORK_PLACEMENT_FENCING_CONFLICT", "Work Placement lease fencing token is stale");
    }
    const competing = activePlacements(registry.placements.filter(({ id }) => id !== current.id), timestamp);
    if (buildAssessment(current, competing).decision === "blocked") {
      throw placementError("ERR_WORK_PLACEMENT_RENEW_CONFLICT", "Work Placement lease cannot renew after a conflicting owner acquired the resource");
    }
    return {
      placement: normalizeStoredPlacement({
        ...current,
        generation: current.generation + 1,
        lease: {
          ...current.lease,
          expires_at: new Date(Date.parse(timestamp) + settings.leaseTtlMs).toISOString(),
        },
        updated_at: timestamp,
      }),
      sessions: registry.sessions,
    };
  }, `work-placement-renew-${placementId}`);
}

async function bindSession(root, request, options, settings) {
  assertPlainObject(request, "Work Placement Session binding request");
  assertExactKeys(request, ["host", "session_id", "work_item_ref"], "Work Placement Session binding request");
  const binding = normalizeSessionBinding({ host: request.host, session_id: request.session_id });
  const workItemRef = normalizeWorkItemRef(request.work_item_ref);
  await assertWorkItemExists(root, workItemRef);
  const operation = normalizeOperation(options, `work-placement-bind-${binding.host}-${binding.session_id}`);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const registry = await readRegistry(root);
    const active = activePlacements(registry.value.placements, now(settings.clock));
    const current = registry.value.sessions.find((session) => sameSession(session, binding));
    if (current) {
      if (!sameRef(current.work_item_ref, workItemRef)) {
        throw placementError("ERR_WORK_PLACEMENT_SESSION_CONFLICT", "Session is already selected for another Work Item");
      }
      if (!active.some((placement) => sameRef(placement.work_item_ref, workItemRef))) {
        throw placementError("ERR_WORK_PLACEMENT_LEASE_EXPIRED", "Session Work Item has no active Placement lease");
      }
      return { status: "selected", ...clone(current) };
    }
    if (!active.some((placement) => sameRef(placement.work_item_ref, workItemRef))) {
      throw placementError("ERR_WORK_PLACEMENT_NOT_FOUND", "Session selection requires an active Work Placement");
    }
    const session = { ...binding, work_item_ref: workItemRef, selected_at: now(settings.clock) };
    const next = { ...registry.value, sessions: [...registry.value.sessions, session].sort(compareSessions) };
    try {
      await persist(root, next, registry.hash, { ...operation, id: `${operation.id}-${attempt + 1}` });
      return { status: "selected", ...clone(session) };
    } catch (error) {
      if (error?.code !== "ERR_WORKSPACE_TRANSACTION_CONFLICT" || attempt === 5) throw error;
    }
  }
  throw placementError("ERR_WORK_PLACEMENT_SESSION_CONFLICT", "Session selection retry budget was exhausted");
}

export async function resolveWorkItemSession(root, request, options = {}) {
  assertPlainObject(options, "Work Item Session resolution options");
  assertExactKeys(options, ["clock"], "Work Item Session resolution options");
  if (options.clock !== undefined && typeof options.clock !== "function") {
    throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", "Work Item Session resolution clock must be a zero-argument function");
  }
  const binding = normalizeSessionBinding(request);
  const registryState = await readRegistry(root);
  const registry = registryState.value;
  const active = activePlacements(registry.placements, options.clock ? now(options.clock) : new Date().toISOString());
  const selected = registry.sessions.find((session) => sameSession(session, binding));
  if (selected && active.some((placement) => sameRef(placement.work_item_ref, selected.work_item_ref))) {
    return { status: "selected", placement_registry_present: true, ...clone(selected) };
  }
  const unique = new Map();
  for (const placement of active) {
    unique.set(`${placement.work_item_ref.kind}:${placement.work_item_ref.id}`, {
      work_item_ref: placement.work_item_ref,
      placement_ids: active
        .filter((candidate) => sameRef(candidate.work_item_ref, placement.work_item_ref))
        .map(({ id }) => id)
        .sort(),
    });
  }
  return {
    status: unique.size > 0 ? "selection_required" : "none",
    placement_registry_present: registryState.hash !== null,
    host: binding.host,
    session_id: binding.session_id,
    candidates: [...unique.values()].sort((left, right) => compareRefs(left.work_item_ref, right.work_item_ref)),
  };
}

async function recordIntegration(root, request, options, settings) {
  assertPlainObject(request, "Work Placement integration request");
  assertExactKeys(request, ["placement_id", "fencing_token", "repository_id", "integration_target_id", "evidence"], "Work Placement integration request");
  const placementId = normalizeSafeIdentifier(request.placement_id, "Work Placement integration placement_id");
  const fencingToken = normalizeSafeIdentifier(request.fencing_token, "Work Placement integration fencing_token");
  const repositoryId = normalizeSafeIdentifier(request.repository_id, "Work Placement integration repository_id");
  const integrationTargetId = normalizeSafeIdentifier(request.integration_target_id, "Work Placement integration integration_target_id");
  const evidence = normalizeIntegrationEvidence(request.evidence);
  const repository = await createRepositoryTargetStore({ clock: settings.clock }).read(root, repositoryId);
  await validateIntegrationProof(root, {
    repository_id: repositoryId,
    integration_target_id: integrationTargetId,
    repository,
    evidence,
  });
  return updatePlacement(root, placementId, options, settings, (current, registry, timestamp) => {
    if (current.lease.fencing_token !== fencingToken) {
      throw placementError("ERR_WORK_PLACEMENT_FENCING_CONFLICT", "Work Placement lease fencing token is stale");
    }
    if (current.lease.status !== "active" || Date.parse(current.lease.expires_at) <= Date.parse(timestamp)) {
      throw placementError("ERR_WORK_PLACEMENT_LEASE_EXPIRED", "Work Placement lease must be renewed before integration can be recorded");
    }
    const claim = current.repository_claims.find((candidate) => candidate.repository_id === repositoryId && isSourceChangingClaim(candidate));
    if (!claim || claim.integration_target_id !== integrationTargetId) {
      throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_TARGET_MISMATCH", "Integration target does not match the source-changing Repository claim");
    }
    if (evidence.base_commit !== claim.snapshot.commit) {
      throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", "Integration evidence base commit does not match the Repository claim snapshot");
    }
    const record = { repository_id: repositoryId, integration_target_id: integrationTargetId, evidence };
    const records = current.integration_records.filter((candidate) => candidate.repository_id !== repositoryId);
    records.push(record);
    return {
      placement: normalizeStoredPlacement({
        ...current,
        generation: current.generation + 1,
        integration_records: records,
        updated_at: timestamp,
      }),
      sessions: registry.sessions,
    };
  }, `work-placement-integrate-${placementId}`);
}

async function updatePlacement(root, placementId, options, settings, transform, fallbackId) {
  const operation = normalizeOperation(options, fallbackId);
  const registry = await readRegistry(root);
  const current = registry.value.placements.find(({ id }) => id === placementId);
  if (!current) throw placementError("ERR_WORK_PLACEMENT_NOT_FOUND", `Work Placement ${placementId} was not found`);
  const result = transform(current, registry.value, now(settings.clock));
  const placements = registry.value.placements.filter(({ id }) => id !== placementId);
  placements.push(result.placement);
  placements.sort((left, right) => left.id.localeCompare(right.id));
  await persist(root, { schema_version: "1", placements, sessions: result.sessions }, registry.hash, operation);
  return clone(result.placement);
}

async function normalizeAndValidateInput(root, value) {
  assertPlainObject(value, "Work Placement input");
  assertExactKeys(value, ["id", "work_item_ref", "session_binding", "repository_claims", "resource_claims", "worktree_root"], "Work Placement input");
  const workItemRef = normalizeWorkItemRef(value.work_item_ref);
  await assertWorkItemExists(root, workItemRef);
  const repositoryStore = createRepositoryTargetStore({ clock: () => new Date().toISOString() });
  const repositories = new Map((await repositoryStore.list(root)).map((repository) => [repository.id, repository]));
  const repositoryClaims = normalizeRepositoryClaims(value.repository_claims, repositories);
  const normalized = {
    id: normalizeSafeIdentifier(value.id, "Work Placement id"),
    work_item_ref: workItemRef,
    session_binding: normalizeSessionBinding(value.session_binding),
    repository_claims: repositoryClaims,
    resource_claims: normalizeResourceClaims(value.resource_claims),
    worktree_root: normalizeRelativePath(value.worktree_root, "Work Placement worktree_root"),
  };
  assertNoRawSecrets(normalized, "Work Placement input");
  return normalized;
}

async function assertWorkItemExists(root, workItemRef) {
  let authority;
  try {
    authority = await readRuntimeObject(root, workItemRef);
  } catch (error) {
    if (error?.code === "ERR_AUTHORITY_OBJECT_NOT_FOUND") {
      throw placementError("ERR_WORK_ITEM_NOT_FOUND", `Work Item ${workItemRef.kind}:${workItemRef.id} was not found`);
    }
    throw error;
  }
  if (workItemRef.kind === "delivery" && !authority.runtime.delivery_kind) {
    throw placementError("ERR_WORK_ITEM_KIND_INVALID", "Work Item does not contain Delivery authority");
  }
  if (workItemRef.kind === "experiment" && authority.runtime.lifecycle === undefined) {
    throw placementError("ERR_WORK_ITEM_KIND_INVALID", "Work Item does not contain Experiment authority");
  }
}

function normalizeRepositoryClaims(value, repositories = null) {
  if (!Array.isArray(value)) throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", "repository_claims must be an array");
  const claims = value.map((claim) => {
    assertPlainObject(claim, "Repository claim");
    const sourceChanging = SOURCE_CHANGING_ACCESS.has(claim.access);
    const hasWorkspaceState = Object.hasOwn(claim, "workspace_state");
    assertExactKeys(claim, sourceChanging
      ? ["repository_id", "access", "snapshot", "integration_target_id", ...(hasWorkspaceState ? ["workspace_state"] : [])]
      : ["repository_id", "access", "snapshot", ...(hasWorkspaceState ? ["workspace_state"] : [])], "Repository claim");
    const repositoryId = normalizeSafeIdentifier(claim.repository_id, "Repository claim repository_id");
    const repository = repositories?.get(repositoryId);
    if (repositories && !repository) throw placementError("ERR_REPOSITORY_TARGET_NOT_FOUND", `Repository Target ${repositoryId} was not found`);
    if (repository?.locator.availability !== undefined && repository.locator.availability !== "available") throw placementError("ERR_REPOSITORY_TARGET_UNAVAILABLE", `Repository Target ${repositoryId} is unavailable`);
    if (!REPOSITORY_ACCESS.has(claim.access)) throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", "Repository claim access is invalid");
    assertPlainObject(claim.snapshot, "Repository claim snapshot");
    assertExactKeys(claim.snapshot, ["commit"], "Repository claim snapshot");
    if (typeof claim.snapshot.commit !== "string" || !SHA.test(claim.snapshot.commit)) {
      throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", "Repository claim snapshot.commit is invalid");
    }
    let integrationTargetId;
    if (sourceChanging) {
      integrationTargetId = normalizeSafeIdentifier(claim.integration_target_id, "Repository claim integration_target_id");
      if (repository && !repository.integration_targets.some(({ id }) => id === integrationTargetId)) {
        throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_TARGET_MISMATCH", "Repository claim integration target is not registered");
      }
    }
    return {
      repository_id: repositoryId,
      access: claim.access,
      snapshot: { commit: claim.snapshot.commit },
      ...(hasWorkspaceState ? { workspace_state: normalizeWorkspaceState(claim.workspace_state) } : {}),
      ...(sourceChanging ? { integration_target_id: integrationTargetId } : {}),
    };
  });
  if (new Set(claims.map(({ repository_id }) => repository_id)).size !== claims.length) {
    throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", "Repository claims must be unique per repository");
  }
  return claims.sort((left, right) => left.repository_id.localeCompare(right.repository_id));
}

function normalizeResourceClaims(value) {
  if (!Array.isArray(value)) throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", "resource_claims must be an array");
  const claims = value.map((claim) => {
    assertPlainObject(claim, "Resource claim");
    const needsLocator = new Set(["cache", "filesystem"]).has(claim.kind);
    const hasIsolation = Object.hasOwn(claim, "isolation");
    assertExactKeys(claim, ["kind", "id", "mode", ...(needsLocator ? ["locator"] : []), ...(hasIsolation ? ["isolation"] : [])], "Resource claim");
    if (!RESOURCE_KINDS.has(claim.kind) || !RESOURCE_MODES.has(claim.mode)) {
      throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", "Resource claim kind or mode is invalid");
    }
    const normalized = {
      kind: claim.kind,
      id: normalizeSafeIdentifier(claim.id, "Resource claim id"),
      mode: claim.mode,
      ...(needsLocator ? { locator: normalizeLocator(claim.locator, "Resource claim locator") } : {}),
      ...(hasIsolation ? { isolation: normalizeIsolation(claim.isolation) } : {}),
    };
    return normalized;
  });
  const identities = claims.map(resourceIdentity);
  if (new Set(identities).size !== identities.length) throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", "Resource claims must be unique");
  return claims.sort((left, right) => resourceIdentity(left).localeCompare(resourceIdentity(right)));
}

function buildAssessment(input, active) {
  const isolatedRepositoryIds = new Set(input.repository_claims.filter(isSourceChangingClaim).map(({ repository_id }) => repository_id));
  let decision = input.repository_claims.some(isSourceChangingClaim) ? "isolated_worktree" : "shared";
  const reasons = [];
  if (decision === "isolated_worktree") reasons.push("source-changing repository access requires a dedicated worktree");
  if (input.repository_claims.some((claim) => claim.workspace_state?.dirty && claim.workspace_state.ownership === "unowned")) {
    decision = "blocked";
    reasons.push("an unowned dirty checkout cannot be placed automatically");
  }
  if (input.resource_claims.some((claim) => claim.mode === "mutable" && claim.isolation === "relocatable") && decision === "shared") {
    decision = "isolated_resources";
    reasons.push("mutable relocatable resources require a private allocation");
  }
  for (const placement of active) {
    for (const claim of input.repository_claims) {
      const other = placement.repository_claims.find(({ repository_id }) => repository_id === claim.repository_id);
      if (!other) continue;
      if (claim.snapshot.commit !== other.snapshot.commit || isSourceChangingClaim(claim) || isSourceChangingClaim(other)) {
        isolatedRepositoryIds.add(claim.repository_id);
        if (decision !== "blocked") decision = "isolated_worktree";
        reasons.push(`repository ${claim.repository_id} requires source isolation from ${placement.id}`);
      }
    }
    for (const claim of input.resource_claims) {
      for (const other of placement.resource_claims) {
        const conflict = resourceConflict(claim, other);
        if (conflict === "blocked") {
          decision = "blocked";
          reasons.push(`resource ${resourceIdentity(claim)} conflicts with ${placement.id}`);
        } else if (conflict === "isolated_resources" && decision === "shared") {
          decision = "isolated_resources";
          reasons.push(`resource ${resourceIdentity(claim)} must be relocated from ${placement.id}`);
        }
      }
    }
  }
  const resourceAllocations = buildResourceAllocations(input);
  const hostActions = decision === "isolated_worktree" ? buildHostActions(input, isolatedRepositoryIds) : [];
  return {
    id: input.id,
    decision,
    reasons: [...new Set(reasons)],
    work_item_ref: input.work_item_ref,
    session_binding: input.session_binding,
    repository_claims: input.repository_claims,
    resource_claims: input.resource_claims,
    worktree_root: input.worktree_root,
    host_actions: hostActions,
    resource_allocations: resourceAllocations,
  };
}

function buildHostActions(input, repositoryIds) {
  return input.repository_claims.filter((claim) => repositoryIds.has(claim.repository_id)).map((claim) => ({
    kind: "git_worktree_add",
    repository_id: claim.repository_id,
    ...(claim.integration_target_id ? { integration_target_id: claim.integration_target_id } : {}),
    argv: [
      "git",
      "worktree",
      "add",
      `${input.worktree_root}/${claim.repository_id}-${input.id}`,
      claim.snapshot.commit,
    ],
  }));
}

function buildResourceAllocations(input) {
  return input.resource_claims
    .filter((claim) => claim.isolation === "relocatable")
    .map((claim) => ({
      resource_kind: claim.kind,
      resource_id: claim.id,
      source_locator: claim.locator,
      allocated_locator: `${input.worktree_root}/resources/${input.id}/${claim.kind}-${claim.id}`,
    }));
}

function resourceConflict(left, right) {
  if (left.kind !== right.kind) return null;
  const same = left.kind === "filesystem"
    ? pathsOverlap(left.locator, right.locator)
    : left.kind === "cache"
      ? left.id === right.id || pathsOverlap(left.locator, right.locator)
      : left.id === right.id;
  if (!same || (left.mode === "shared" && right.mode === "shared")) return null;
  if (left.isolation === "relocatable") return "isolated_resources";
  return "blocked";
}

function normalizeStoredPlacement(value) {
  assertPlainObject(value, "Stored Work Placement");
  assertExactKeys(value, [
    "schema_version", "id", "decision", "reasons", "work_item_ref", "session_binding",
    "repository_claims", "resource_claims", "worktree_root", "host_actions", "status",
    "resource_allocations", "generation", "lease", "integration_records", "created_at", "updated_at",
  ], "Stored Work Placement");
  if (value.schema_version !== "1") throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Stored Work Placement schema version is invalid");
  if (!DECISIONS.has(value.decision)) throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Stored Work Placement decision is invalid");
  if (!Array.isArray(value.reasons) || value.reasons.some((reason) => typeof reason !== "string" || !reason.trim())) {
    throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Stored Work Placement reasons are invalid");
  }
  const normalized = {
    schema_version: "1",
    id: normalizeSafeIdentifier(value.id, "Stored Work Placement id"),
    decision: value.decision,
    reasons: [...new Set(value.reasons.map((reason) => reason.trim()))],
    work_item_ref: normalizeWorkItemRef(value.work_item_ref),
    session_binding: normalizeSessionBinding(value.session_binding),
    repository_claims: normalizeRepositoryClaims(value.repository_claims),
    resource_claims: normalizeResourceClaims(value.resource_claims),
    worktree_root: normalizeRelativePath(value.worktree_root, "Stored Work Placement worktree_root"),
    host_actions: normalizeHostActions(value.host_actions),
    resource_allocations: normalizeResourceAllocations(value.resource_allocations),
    status: value.status,
    generation: value.generation,
    lease: normalizeLease(value.lease),
    integration_records: normalizeIntegrationRecords(value.integration_records),
    created_at: normalizeTimestamp(value.created_at, "Stored Work Placement created_at"),
    updated_at: normalizeTimestamp(value.updated_at, "Stored Work Placement updated_at"),
  };
  if (!Number.isSafeInteger(normalized.generation) || normalized.generation < 1) throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Stored Work Placement generation is invalid");
  if (!new Set(["active", "released"]).has(normalized.status)) throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Stored Work Placement status is invalid");
  if (normalized.status === "released" && normalized.lease.status !== "released") throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Released Work Placement requires a released lease");
  assertNoRawSecrets(normalized, "Stored Work Placement");
  return normalized;
}

function normalizeHostActions(value) {
  if (!Array.isArray(value)) throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Stored Work Placement host_actions must be an array");
  return value.map((action) => {
    assertPlainObject(action, "Work Placement Host action");
    const hasTarget = Object.hasOwn(action, "integration_target_id");
    assertExactKeys(action, ["kind", "repository_id", ...(hasTarget ? ["integration_target_id"] : []), "argv"], "Work Placement Host action");
    if (action.kind !== "git_worktree_add") throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Work Placement Host action kind is invalid");
    if (!Array.isArray(action.argv) || action.argv.length < 4 || action.argv.length > 12
      || action.argv[0] !== "git"
      || action.argv.some((argument) => typeof argument !== "string" || !argument || argument.length > 4096 || argument.includes("\0"))) {
      throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Work Placement Host action argv is invalid");
    }
    return {
      kind: action.kind,
      repository_id: normalizeSafeIdentifier(action.repository_id, "Work Placement Host action repository_id"),
      ...(hasTarget ? { integration_target_id: normalizeSafeIdentifier(action.integration_target_id, "Work Placement Host action integration_target_id") } : {}),
      argv: [...action.argv],
    };
  });
}

function normalizeResourceAllocations(value) {
  if (!Array.isArray(value)) throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Stored Work Placement resource_allocations must be an array");
  return value.map((allocation) => {
    assertPlainObject(allocation, "Work Placement resource allocation");
    assertExactKeys(allocation, ["resource_kind", "resource_id", "source_locator", "allocated_locator"], "Work Placement resource allocation");
    if (!RESOURCE_KINDS.has(allocation.resource_kind)) throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Work Placement resource allocation kind is invalid");
    return {
      resource_kind: allocation.resource_kind,
      resource_id: normalizeSafeIdentifier(allocation.resource_id, "Work Placement resource allocation id"),
      source_locator: normalizeLocator(allocation.source_locator, "Work Placement resource allocation source_locator"),
      allocated_locator: normalizeRelativePath(allocation.allocated_locator, "Work Placement resource allocation allocated_locator"),
    };
  });
}

function normalizeLease(value) {
  assertPlainObject(value, "Work Placement lease");
  const released = value.status === "released";
  assertExactKeys(value, ["status", "fencing_token", "acquired_at", "expires_at", ...(released ? ["released_at"] : [])], "Work Placement lease");
  if (!new Set(["active", "released"]).has(value.status)) throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Work Placement lease status is invalid");
  return {
    status: value.status,
    fencing_token: normalizeSafeIdentifier(value.fencing_token, "Work Placement lease fencing_token"),
    acquired_at: normalizeTimestamp(value.acquired_at, "Work Placement lease acquired_at"),
    expires_at: normalizeTimestamp(value.expires_at, "Work Placement lease expires_at"),
    ...(released ? { released_at: normalizeTimestamp(value.released_at, "Work Placement lease released_at") } : {}),
  };
}

function normalizeIntegrationRecords(value) {
  if (!Array.isArray(value)) throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Work Placement integration_records must be an array");
  return value.map((record) => {
    assertPlainObject(record, "Work Placement integration record");
    assertExactKeys(record, ["repository_id", "integration_target_id", "evidence"], "Work Placement integration record");
    return {
      repository_id: normalizeSafeIdentifier(record.repository_id, "Work Placement integration record repository_id"),
      integration_target_id: normalizeSafeIdentifier(record.integration_target_id, "Work Placement integration record integration_target_id"),
      evidence: normalizeIntegrationEvidence(record.evidence),
    };
  });
}

function normalizeIntegrationEvidence(value) {
  assertPlainObject(value, "Integration evidence");
  assertExactKeys(value, ["method", "base_commit", "source_commit", "result_commit", "target_contains_source", "verified_at", "proof"], "Integration evidence");
  if (!INTEGRATION_METHODS.has(value.method)) throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", "Integration evidence method is invalid");
  for (const field of ["base_commit", "source_commit", "result_commit"]) {
    if (typeof value[field] !== "string" || !SHA.test(value[field])) throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", `Integration evidence ${field} is invalid`);
  }
  if (typeof value.target_contains_source !== "boolean") throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", "Integration evidence target_contains_source must be boolean");
  if (!value.target_contains_source) throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", "Integration evidence must confirm the target contains the source");
  return {
    ...value,
    verified_at: normalizeTimestamp(value.verified_at, "Integration evidence verified_at"),
    proof: normalizeProofRef(value.proof),
  };
}

function normalizeProofRef(value) {
  assertPlainObject(value, "Integration proof reference");
  assertExactKeys(value, ["type", "path", "digest"], "Integration proof reference");
  if (value.type !== "file") throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", "Integration proof must be a file reference");
  if (typeof value.digest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value.digest)) {
    throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", "Integration proof digest is invalid");
  }
  return {
    type: "file",
    path: normalizeRelativePath(value.path, "Integration proof path"),
    digest: value.digest,
  };
}

async function validateIntegrationProof(root, request) {
  const guard = await assertWorkspacePathAllowed(resolve(root || "."), request.evidence.proof.path);
  let bytes;
  try {
    const stats = await lstat(guard.path);
    if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("unsafe proof");
    bytes = await readFile(guard.path);
  } catch (error) {
    if (error?.code === "ERR_WORKSPACE_PATH_FORBIDDEN") throw error;
    throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", "Integration proof file is missing or unsafe");
  }
  const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (digest !== request.evidence.proof.digest) throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", "Integration proof file digest does not match");
  let proof;
  try {
    proof = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", "Integration proof file is not valid JSON");
  }
  assertPlainObject(proof, "Integration proof");
  assertExactKeys(proof, [
    "schema_version", "repository_id", "repository_identity", "repository_generation",
    "integration_target_id", "base_commit", "source_commit", "result_commit", "target_head",
    "verification", "verified_at",
  ], "Integration proof");
  if (proof.schema_version !== "1") throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", "Integration proof schema version is invalid");
  const target = request.repository.integration_targets.find(({ id }) => id === request.integration_target_id);
  if (!target) throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", "Integration proof target is no longer registered");
  const targetRef = target.branch.startsWith("refs/") ? target.branch : `refs/heads/${target.branch}`;
  assertPlainObject(proof.verification, "Integration proof verification");
  assertExactKeys(proof.verification, ["target_head", "ancestry"], "Integration proof verification");
  assertPlainObject(proof.verification.target_head, "Integration proof target_head verification");
  assertExactKeys(proof.verification.target_head, ["argv", "exit_code", "stdout_commit", "stdout_sha256"], "Integration proof target_head verification");
  assertPlainObject(proof.verification.ancestry, "Integration proof ancestry verification");
  assertExactKeys(proof.verification.ancestry, ["argv", "exit_code", "stdout_sha256"], "Integration proof ancestry verification");
  const expectedHeadArgv = ["git", "-C", target.checkout_path, "rev-parse", targetRef];
  const expectedAncestryArgv = ["git", "-C", target.checkout_path, "merge-base", "--is-ancestor", request.evidence.source_commit, targetRef];
  if (proof.repository_id !== request.repository_id
    || JSON.stringify(proof.repository_identity) !== JSON.stringify(request.repository.repository_identity)
    || proof.repository_generation !== request.repository.generation
    || proof.integration_target_id !== request.integration_target_id
    || proof.base_commit !== request.evidence.base_commit
    || proof.source_commit !== request.evidence.source_commit
    || proof.result_commit !== request.evidence.result_commit
    || proof.target_head !== request.evidence.result_commit
    || proof.verified_at !== request.evidence.verified_at
    || proof.verification.target_head.exit_code !== 0
    || proof.verification.target_head.stdout_commit !== request.evidence.result_commit
    || proof.verification.target_head.stdout_sha256 !== createHash("sha256").update(`${request.evidence.result_commit}\n`).digest("hex")
    || JSON.stringify(proof.verification.target_head.argv) !== JSON.stringify(expectedHeadArgv)
    || proof.verification.ancestry.exit_code !== 0
    || proof.verification.ancestry.stdout_sha256 !== createHash("sha256").update("").digest("hex")
    || JSON.stringify(proof.verification.ancestry.argv) !== JSON.stringify(expectedAncestryArgv)) {
    throw placementError("ERR_WORK_PLACEMENT_INTEGRATION_EVIDENCE_INVALID", "Integration proof does not attest the requested target ancestry");
  }
  assertNoRawSecrets(proof, "Integration proof");
}

function normalizeSessionBinding(value) {
  assertPlainObject(value, "Work Placement Session binding");
  assertExactKeys(value, ["host", "session_id"], "Work Placement Session binding");
  return {
    host: normalizeSafeIdentifier(value.host, "Session host"),
    session_id: normalizeSafeIdentifier(value.session_id, "Session id"),
  };
}

function normalizeStoredSession(value) {
  assertPlainObject(value, "Stored Work Placement Session");
  assertExactKeys(value, ["host", "session_id", "work_item_ref", "selected_at"], "Stored Work Placement Session");
  return {
    ...normalizeSessionBinding({ host: value.host, session_id: value.session_id }),
    work_item_ref: normalizeWorkItemRef(value.work_item_ref),
    selected_at: normalizeTimestamp(value.selected_at, "Stored Work Placement Session selected_at"),
  };
}

async function readRegistry(root) {
  const guard = await assertWorkspacePathAllowed(resolve(root || "."), REGISTRY_PATH);
  try {
    const stats = await lstat(guard.path);
    if (!stats.isFile() || stats.isSymbolicLink()) throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Work Placement registry is unsafe");
    const bytes = await readFile(guard.path);
    const parsed = parseYaml(bytes.toString("utf8"));
    if (parsed?.schema_version !== "1" || !Array.isArray(parsed.placements) || !Array.isArray(parsed.sessions)) throw new Error("invalid registry");
    const placements = parsed.placements.map(normalizeStoredPlacement).sort((left, right) => left.id.localeCompare(right.id));
    const sessions = parsed.sessions.map(normalizeStoredSession).sort(compareSessions);
    return { value: { schema_version: "1", placements, sessions }, hash: createHash("sha256").update(bytes).digest("hex") };
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      return { value: { schema_version: "1", placements: [], sessions: [] }, hash: null };
    }
    if (error?.code) throw error;
    throw placementError("ERR_WORK_PLACEMENT_REGISTRY_INVALID", "Work Placement registry is malformed");
  }
}

function addPlacementAndSession(registry, placement, binding) {
  const session = { ...binding, work_item_ref: placement.work_item_ref, selected_at: placement.created_at };
  const sessions = registry.sessions.some((current) => sameSession(current, binding))
    ? registry.sessions
    : [...registry.sessions, session];
  return {
    schema_version: "1",
    placements: [...registry.placements, placement].sort((left, right) => left.id.localeCompare(right.id)),
    sessions: sessions.sort(compareSessions),
  };
}

async function persist(root, registry, expectedHash, operation) {
  const manifest = await readCurrentManifest(root);
  await commitWorkspaceTransaction(root, {
    id: operation.id,
    ...(operation.faultInjector ? { faultInjector: operation.faultInjector } : {}),
    manifest,
    writes: [{ path: REGISTRY_PATH, content: `${stringifyYaml(registry).trimEnd()}\n`, expected_hash: expectedHash }],
  });
}

function normalizeOperation(value, fallbackId) {
  assertPlainObject(value, "Work Placement transaction options");
  assertExactKeys(value, ["id", "faultInjector"], "Work Placement transaction options");
  return {
    id: value.id === undefined ? fallbackId : normalizeSafeIdentifier(value.id, "Work Placement transaction id"),
    ...(value.faultInjector === undefined ? {} : { faultInjector: value.faultInjector }),
  };
}

function normalizeLocator(value, label) {
  if (typeof value !== "string" || !value.trim() || value.includes("\0")) throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", `${label} is invalid`);
  return value.trim();
}

function normalizeRelativePath(value, label) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.startsWith("/") || value.includes("\\")) {
    throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", `${label} is unsafe`);
  }
  if (value.split("/").some((part) => !part || part === "." || part === "..")) throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", `${label} contains traversal`);
  return value;
}

function normalizeIsolation(value) {
  if (!new Set(["fixed", "relocatable"]).has(value)) throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", "Resource claim isolation is invalid");
  return value;
}

function normalizeWorkspaceState(value) {
  assertPlainObject(value, "Repository claim workspace_state");
  assertExactKeys(value, ["dirty", "ownership"], "Repository claim workspace_state");
  if (typeof value.dirty !== "boolean" || !new Set(["owned", "unowned"]).has(value.ownership)) {
    throw placementError("ERR_WORK_PLACEMENT_SCHEMA_INVALID", "Repository claim workspace_state is invalid");
  }
  return { dirty: value.dirty, ownership: value.ownership };
}

function activePlacements(placements, timestamp) {
  const time = Date.parse(timestamp);
  return placements.filter((placement) => placement.status === "active" && placement.lease.status === "active" && Date.parse(placement.lease.expires_at) > time);
}

function materializePlacement(placement, timestamp) {
  if (placement.status !== "active" || placement.lease.status !== "active" || Date.parse(placement.lease.expires_at) > Date.parse(timestamp)) {
    return placement;
  }
  return {
    ...placement,
    status: "expired",
    lease: { ...placement.lease, status: "expired" },
  };
}

function assertPlacementIdAvailable(id, placements) {
  if (placements.some((placement) => placement.id === id)) throw placementError("ERR_WORK_PLACEMENT_EXISTS", `Work Placement ${id} already exists`);
}

function assertSessionAvailable(binding, workItemRef, sessions) {
  const current = sessions.find((session) => sameSession(session, binding));
  if (current && !sameRef(current.work_item_ref, workItemRef)) {
    throw placementError("ERR_WORK_PLACEMENT_SESSION_CONFLICT", "Session is already selected for another Work Item");
  }
}

function isSourceChangingClaim(claim) {
  return SOURCE_CHANGING_ACCESS.has(claim.access);
}

function resourceIdentity(claim) {
  return `${claim.kind}:${claim.id}`;
}

function pathsOverlap(left, right) {
  const a = left.replace(/\/+$/, "");
  const b = right.replace(/\/+$/, "");
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function sameRef(left, right) {
  return left.kind === right.kind && left.id === right.id;
}

function compareRefs(left, right) {
  return `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`);
}

function sameSession(left, right) {
  return left.host === right.host && left.session_id === right.session_id;
}

function compareSessions(left, right) {
  return `${left.host}:${left.session_id}`.localeCompare(`${right.host}:${right.session_id}`);
}

function now(clock) {
  return normalizeTimestamp(clock(), "Work Placement clock value");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function placementError(code, message) {
  return authorityError(code, message);
}
