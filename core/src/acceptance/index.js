import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_GLOBAL_CONFIG, loadConfig, mergeConfig, parseYaml, writeConfig } from "../config/index.js";
import { assessWorkerSeparationStatus, resolveWorkerSeparationPolicy } from "../config/index.js";
import { appendProgressEvent } from "../progress/index.js";
import {
  commitWorkflowUpdate,
  resolveCycleLifecyclePolicy,
  selectLifecycleContinuation,
} from "../lifecycle/index.js";

export function resolveAcceptancePolicy(projectConfig = {}, globalConfig = DEFAULT_GLOBAL_CONFIG) {
  const merged = mergeConfig(
    mergeConfig(DEFAULT_GLOBAL_CONFIG.acceptance, globalConfig?.acceptance || {}),
    projectConfig?.acceptance || {},
  );
  const mode = normalizeAcceptanceMode(merged.mode);
  return {
    mode,
    require_user_confirm: mode === "manual" || mode === "confirm" ? true : Boolean(merged.require_user_confirm),
    default_state: normalizeAcceptanceState(merged.default_state),
    timeout_hours: positiveNumber(merged.timeout_hours, DEFAULT_GLOBAL_CONFIG.acceptance.timeout_hours),
    reject_escalation_threshold: positiveInteger(
      merged.reject_escalation_threshold,
      DEFAULT_GLOBAL_CONFIG.acceptance.reject_escalation_threshold,
    ),
  };
}

export function evaluateAcceptanceStatus(acceptance = {}, policy = {}, options = {}) {
  const state = acceptance.state || policy.default_state || DEFAULT_GLOBAL_CONFIG.acceptance.default_state;
  const resolved = {
    ...acceptance,
    state,
    mode: acceptance.mode || policy.mode || DEFAULT_GLOBAL_CONFIG.acceptance.mode,
    timed_out: false,
    automatic: Boolean(acceptance.automatic),
  };
  if (state !== "pending" || policy.mode !== "timeout") return resolved;

  const requestedAt = Date.parse(acceptance.requested_at || acceptance.updated_at || "");
  const now = Date.parse(options.now || new Date().toISOString());
  const timeoutHours = positiveNumber(policy.timeout_hours, DEFAULT_GLOBAL_CONFIG.acceptance.timeout_hours);
  if (!Number.isFinite(requestedAt) || !Number.isFinite(now)) return resolved;
  if (now - requestedAt < timeoutHours * 60 * 60 * 1000) return resolved;

  return {
    ...resolved,
    state: "accepted",
    timed_out: true,
    automatic: true,
    reason: "timeout",
  };
}

export function evaluateAcceptanceReadiness(context = {}, options = {}) {
  const workerPolicy = resolveWorkerSeparationPolicy(
    options.projectConfig || {},
    options.globalConfig || DEFAULT_GLOBAL_CONFIG,
  );
  const workerStatus = assessWorkerSeparationStatus(workerPolicy, {
    workers: filterAcceptanceWorkerEvidence(options.workers || []),
    role_availability: options.role_availability || options.roleAvailability || {},
    audit_verdict: options.audit_verdict || acceptanceAuditVerdict(context.acceptance || {}),
  });
  const reasons = [];

  if (workerStatus.acceptance_blocked) {
    if (
      workerStatus.missing_roles.length
      || workerStatus.collisions.length
      || workerStatus.lifecycle_blocked.length
      || workerStatus.authorization_blocked.length
      || workerStatus.scope_blocked.length
    ) {
      reasons.push(workerStatus.summary);
    }
    if ((options.audit_verdict || acceptanceAuditVerdict(context.acceptance || {})) === "insufficient") {
      reasons.push("Audit verdict marked test coverage as insufficient.");
    }
  }

  return {
    worker_separation: workerStatus,
    blocked: reasons.length > 0,
    reasons,
  };
}

export function createRejectionFeedbackTemplate(options = {}) {
  return {
    scope: options.scope || "cycle",
    ref: options.ref || null,
    iteration: positiveInteger(options.iteration, 1),
    problem: "",
    reproduce_steps: "",
    expected: "",
    actual: "",
    context: options.context || "",
    created_at: options.created_at || new Date().toISOString(),
  };
}

export function createStructuredRejectionArtifact(input = {}) {
  return {
    schema_version: 1,
    cycle_id: input.cycle_id || input.cycleId || null,
    feature_id: input.feature_id || input.featureId || null,
    milestone_id: input.milestone_id || input.milestoneId || null,
    scope: input.scope || "cycle",
    verdict: input.verdict || "rejected",
    reasons: Array.isArray(input.reasons) ? input.reasons : [],
    required_rework: Array.isArray(input.required_rework) ? input.required_rework : [],
    blocked_request: normalizeRejectionBlockedRequest(input.blocked_request),
    audit: normalizeRejectionAudit(input.audit),
    original_prompt_ref: input.original_prompt_ref || input.originalPromptRef || input.prompt_ref || null,
    created_at: input.created_at || input.createdAt || new Date().toISOString(),
  };
}

export function buildReworkPromptLinkage({ rejection_artifact: rejectionArtifact = {}, source_prompt_ref: sourcePromptRef = null } = {}) {
  const promptRef = sourcePromptRef || rejectionArtifact.prompt_ref || rejectionArtifact.original_prompt_ref || null;
  const requiredRework = Array.isArray(rejectionArtifact.required_rework) ? rejectionArtifact.required_rework : [];
  const findings = Array.isArray(rejectionArtifact.audit?.findings) ? rejectionArtifact.audit.findings : [];

  return {
    original_prompt_ref: rejectionArtifact.original_prompt_ref || promptRef,
    prompt_ref: promptRef,
    scope_mode: "incremental",
    required_roles: collectReworkRoles(requiredRework),
    incremental_scope: {
      scope: rejectionArtifact.scope || "cycle",
      required_rework: requiredRework,
      findings,
      reasons: Array.isArray(rejectionArtifact.reasons) ? rejectionArtifact.reasons : [],
      allow_unrelated_scope: false,
    },
  };
}

export async function markCyclePendingAcceptance(projectRoot = ".", options = {}) {
  const context = await loadAcceptanceContext(projectRoot);
  const now = options.now || new Date().toISOString();
  const cycleId = cycleIdentifier(context.cycle);
  const mode = options.mode || context.cycle.cycle?.acceptance?.mode || "manual";
  const cycle = {
    ...context.cycle,
    cycle: {
      ...context.cycle.cycle,
      status: "pending_acceptance",
      acceptance: {
        ...(context.cycle.cycle?.acceptance || {}),
        mode,
        state: "pending",
        requested_at: now,
      },
    },
  };
  const state = {
    ...context.state,
    pipeline: {
      ...(context.state.pipeline || {}),
      status: "pending_acceptance",
    },
    acceptance: compactAcceptanceState({
      scope: "cycle",
      state: "pending",
      mode,
      cycle_id: cycleId,
      updated_at: now,
    }),
  };

  const logEntry = {
    id: `CYCLE-PENDING-${cycleId}-${compactTimestamp(now)}`,
    type: "cycle_pending_acceptance",
    ref: cycleId,
    status: "pending_acceptance",
    timestamp: now,
    summary: `Cycle ${cycleId} is pending user acceptance.`,
    trigger: "auto",
  };
  const commit = await commitAcceptanceUpdate(context, {
    id: `cycle-pending-${cycleId}-${compactTimestamp(now)}`,
    now,
    cycle,
    state,
    logEntry,
    progress: {
      timestamp: now,
      type: "Cycle",
      event: `${cycleId} pending_acceptance`,
      result: "等待用户 acceptance",
    },
    derivedRefreshers: options.derivedRefreshers,
  });
  return { cycle, state, archived: false, commit };
}

export async function acceptCycle(projectRoot = ".", options = {}) {
  const context = await loadAcceptanceContext(projectRoot);
  const now = options.now || new Date().toISOString();
  const cycleId = cycleIdentifier(context.cycle);
  const mergedAcceptance = {
    ...(context.cycle.cycle?.acceptance || {}),
    ...(context.state.acceptance || {}),
  };
  const runtimeEvidence = deriveWorkerRuntimeEvidence(context.state, options);
  const readiness = evaluateAcceptanceReadiness(
    { acceptance: mergedAcceptance },
    {
      projectConfig: context.config || {},
      workers: options.workers || mergedAcceptance.workers || runtimeEvidence.workers,
      role_availability: options.role_availability || mergedAcceptance.role_availability || runtimeEvidence.role_availability,
      audit_verdict: options.audit_verdict || acceptanceAuditVerdict(mergedAcceptance),
    },
  );
  if (readiness.blocked) {
    const details = readiness.reasons.length ? ` ${readiness.reasons.join(" ")}` : "";
    throw new Error(`Cycle ${cycleId} acceptance blocked by worker separation policy.${details}`.trim());
  }
  const policy = resolveCycleLifecyclePolicy(context.cycle);
  const followUp = policy.accept.next === "follow_up_plan"
    ? selectLifecycleContinuation(context.cycle, "follow_up_plan")
    : null;
  const enteringFollowUp = Boolean(followUp);
  const continuations = enteringFollowUp
    ? activateContinuation(context.cycle.cycle?.continuations, followUp.id)
    : context.cycle.cycle?.continuations;
  const cycle = {
    ...context.cycle,
    cycle: {
      ...context.cycle.cycle,
      status: enteringFollowUp ? "follow_up_planning" : "completed",
      finished: enteringFollowUp ? context.cycle.cycle?.finished || null : now,
      ...(continuations ? { continuations } : {}),
      acceptance: {
        ...(context.cycle.cycle?.acceptance || {}),
        state: "accepted",
        accepted_at: now,
      },
    },
  };
  const state = {
    ...context.state,
    pipeline: {
      ...(context.state.pipeline || {}),
      status: enteringFollowUp ? "stopped" : "completed",
      finished: enteringFollowUp ? context.state.pipeline?.finished || null : now,
    },
    current: {
      ...(context.state.current || {}),
      phase: enteringFollowUp ? "follow_up_planning" : "completed",
      ...(enteringFollowUp ? { step: null } : {}),
    },
    acceptance: compactAcceptanceState({
      ...(context.state.acceptance || {}),
      scope: "cycle",
      state: "accepted",
      cycle_id: cycleId,
      updated_at: now,
    }),
    ...(enteringFollowUp
      ? { continuation: compactContinuationState(followUp, now) }
      : { continuation: undefined }),
  };
  if (!enteringFollowUp) {
    delete state.continuation;
  }

  const logEntry = {
    id: `CYCLE-ACCEPTED-${cycleId}-${compactTimestamp(now)}`,
    type: "cycle_accept",
    ref: cycleId,
    status: enteringFollowUp ? "follow_up_planning" : "completed",
    timestamp: now,
    summary: enteringFollowUp
      ? `Cycle ${cycleId} accepted; entering follow-up planning.`
      : `Cycle ${cycleId} accepted.`,
    trigger: "manual",
  };
  const commit = await commitAcceptanceUpdate(context, {
    id: `cycle-accept-${cycleId}-${compactTimestamp(now)}`,
    now,
    cycle,
    state,
    logEntry,
    progress: {
      timestamp: now,
      type: "Cycle",
      event: `${cycleId} accepted`,
      result: enteringFollowUp ? "进入 follow_up_planning" : "Cycle accepted",
    },
    derivedRefreshers: options.derivedRefreshers,
  });
  return { cycle, state, archived: options.archive === true, commit };
}

export async function rejectCycle(projectRoot = ".", options = {}) {
  const context = await loadAcceptanceContext(projectRoot);
  const now = options.now || new Date().toISOString();
  const cycleId = cycleIdentifier(context.cycle);
  const policy = resolveCycleLifecyclePolicy(context.cycle);
  const needsRevision = policy.reject.default_action === "needs_revision";
  const feedbackRef = options.feedback_ref || `.pipeline/acceptance/cycle-${cycleId}-rejection-${compactTimestamp(now)}.yaml`;
  const cycle = {
    ...context.cycle,
    cycle: {
      ...context.cycle.cycle,
      status: "active",
      acceptance: {
        ...(context.cycle.cycle?.acceptance || {}),
        state: "rejected",
        rejected_at: now,
        feedback_ref: feedbackRef,
      },
    },
  };
  const state = {
    ...context.state,
    pipeline: {
      ...(context.state.pipeline || {}),
      status: "running",
    },
    current: {
      ...(context.state.current || {}),
      phase: needsRevision ? "needs_revision" : "executing",
      ...(needsRevision ? { step: "revise", step_index: 0 } : {}),
    },
    prompt_state: {
      ...(context.state.prompt_state || {}),
      ...(needsRevision ? { result: "running", updated_at: now } : {}),
    },
    acceptance: compactAcceptanceState({
      scope: "cycle",
      state: "rejected",
      cycle_id: cycleId,
      feedback_ref: feedbackRef,
      updated_at: now,
    }),
  };

  const feedback = {
    ...createRejectionFeedbackTemplate({
      scope: "cycle",
      ref: cycleId,
      iteration: Number(context.cycle.cycle?.acceptance?.iteration || 1),
      created_at: now,
      context: options.context || `Cycle ${cycleId} acceptance`,
    }),
    rejected_at: now,
    problem: String(options.feedback || "").trim(),
    feedback: String(options.feedback || "").trim(),
  };
  const logEntry = {
    id: `CYCLE-REJECTED-${cycleId}-${compactTimestamp(now)}`,
    type: "cycle_reject",
    ref: cycleId,
    status: needsRevision ? "needs_revision" : "rejected",
    timestamp: now,
    summary: needsRevision
      ? `Cycle ${cycleId} rejected; revision needed with feedback at ${feedbackRef}.`
      : `Cycle ${cycleId} rejected; feedback stored at ${feedbackRef}.`,
    report: feedbackRef,
    trigger: "manual",
  };
  const commit = await commitAcceptanceUpdate(context, {
    id: `cycle-reject-${cycleId}-${compactTimestamp(now)}`,
    now,
    cycle,
    state,
    extraAuthority: {
      [feedbackRef]: feedback,
    },
    logEntry,
    progress: {
      timestamp: now,
      type: "Cycle",
      event: `${cycleId} needs_revision`,
      result: `反馈已保存到 ${feedbackRef}`,
    },
    derivedRefreshers: options.derivedRefreshers,
  });
  return { cycle, state, feedback_ref: feedbackRef, commit };
}

async function loadAcceptanceContext(projectRoot) {
  const pipelineDir = join(projectRoot, ".pipeline");
  return {
    projectRoot,
    configFile: join(pipelineDir, "config.yaml"),
    cycleFile: join(pipelineDir, "cycle.yaml"),
    stateFile: join(pipelineDir, "state.yaml"),
    logFile: join(pipelineDir, "log.yaml"),
    progressFile: join(pipelineDir, "PROGRESS.md"),
    config: await readConfig(join(pipelineDir, "config.yaml")),
    cycle: await readYaml(join(pipelineDir, "cycle.yaml")),
    state: await readYaml(join(pipelineDir, "state.yaml")),
  };
}

async function readConfig(file) {
  try {
    return await loadConfig(file);
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function readYaml(file) {
  try {
    return parseYaml(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function commitAcceptanceUpdate(context, update) {
  const logPath = ".pipeline/log.yaml";
  const progressPath = ".pipeline/PROGRESS.md";
  const progressRefresh = update.derivedRefreshers?.progress || ((source) => appendProgressRowSource(
    source,
    update.progress.timestamp,
    update.progress.type,
    update.progress.event,
    update.progress.result,
  ));
  const logRefresh = update.derivedRefreshers?.log || ((source) => appendLifecycleLogSource(source, update.logEntry));

  return commitWorkflowUpdate(context.projectRoot, {
    id: update.id,
    now: update.now,
    authority: {
      [toProjectPath(context.cycleFile, context.projectRoot)]: update.cycle,
      [toProjectPath(context.stateFile, context.projectRoot)]: update.state,
      ...(update.extraAuthority || {}),
    },
    derived: [
      {
        path: logPath,
        refresh: logRefresh,
      },
      {
        path: progressPath,
        refresh: progressRefresh,
      },
    ],
  });
}

function appendLifecycleLogSource(source, entry) {
  const log = source ? parseYaml(source) : {};
  const entries = Array.isArray(log.entries) ? log.entries : [];
  return {
    ...log,
    entries: [entry, ...entries],
  };
}

function appendProgressRowSource(source, timestamp, type, event, result) {
  return appendProgressEvent(source, { timestamp, type, name: event, result });
}

function compactAcceptanceState(value) {
  const allowed = ["scope", "state", "mode", "cycle_id", "feedback_ref", "updated_at"];
  return Object.fromEntries(allowed.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]));
}

function compactContinuationState(value, timestamp) {
  return {
    id: value.id,
    kind: value.kind,
    status: "active",
    title: value.title || null,
    prompt_ref: value.prompt_ref || value.ref || null,
    updated_at: timestamp,
  };
}

function activateContinuation(continuations = [], id) {
  return (Array.isArray(continuations) ? continuations : []).map((continuation) => {
    const key = continuation.id || continuation.name;
    return key === id ? { ...continuation, status: "active" } : continuation;
  });
}

function normalizeAcceptanceMode(value) {
  return ["manual", "auto", "timeout", "confirm"].includes(value) ? value : DEFAULT_GLOBAL_CONFIG.acceptance.mode;
}

function acceptanceAuditVerdict(acceptance = {}) {
  return acceptance.audit_verdict || acceptance.audit?.verdict || "unknown";
}

function deriveWorkerRuntimeEvidence(state = {}, options = {}) {
  if (options.workers || options.role_availability || options.roleAvailability) {
    return {
      workers: filterAcceptanceWorkerEvidence(options.workers || []),
      role_availability: options.role_availability || options.roleAvailability || {},
    };
  }

  if (Array.isArray(state.runtime_workers?.workers) || state.runtime_workers?.role_availability) {
    return {
      workers: filterAcceptanceWorkerEvidence(state.runtime_workers?.workers),
      role_availability: state.runtime_workers?.role_availability || {},
    };
  }

  const steps = Array.isArray(state.prompt_state?.steps) ? state.prompt_state.steps : [];
  const workers = [];
  const roleAvailability = {};

  for (const mapping of [
    { role: "implement", step: "implement" },
    { role: "test", step: "review_tests" },
    { role: "audit", step: "review_code" },
  ]) {
    const step = steps.find((item) => item?.name === mapping.step);
    if (!step) continue;
    const worker = deriveWorkerFromStep(mapping.role, step);
    if (worker) workers.push(worker);
    const availability = deriveRoleAvailabilityFromStep(step);
    if (availability) roleAvailability[mapping.role] = availability;
  }

  return {
    workers,
    role_availability: roleAvailability,
  };
}

export function buildRuntimeWorkerMirrorFromState(state = {}, options = {}) {
  const evidence = deriveWorkerRuntimeEvidence(state, options);
  return {
    workers: filterAcceptanceWorkerEvidence(evidence.workers),
    role_availability: evidence.role_availability,
    updated_at: options.updated_at || options.updatedAt || new Date().toISOString(),
  };
}

function deriveWorkerFromStep(role, step = {}) {
  if (!step.executor) return null;
  if (step.executor === "self") {
    return { role, worker_id: "self", ...deriveWorkerLifecycleFromStep(step) };
  }
  if (step.executor === "subagent") {
    return {
      role,
      worker_id: step.subagent_result?.worker_id || step.subagent_result?.session_id || step.subagent_tool || "subagent",
      ...deriveWorkerScopeFromStep(step),
      ...deriveWorkerLifecycleFromStep(step),
    };
  }
  return null;
}

function deriveWorkerLifecycleFromStep(step = {}) {
  const lifecycle = step.worker_lifecycle || step.lifecycle || step.subagent_result?.lifecycle;
  return lifecycle ? { lifecycle } : {};
}

function deriveWorkerScopeFromStep(step = {}) {
  const promptScope = step.prompt_scope || step.promptScope || step.subagent_result?.prompt_scope || step.subagent_result?.promptScope;
  const changedFiles = step.changed_files || step.changedFiles || step.subagent_result?.changed_files || step.subagent_result?.changedFiles;
  return {
    ...(Array.isArray(promptScope) ? { prompt_scope: promptScope } : {}),
    ...(Array.isArray(changedFiles) ? { changed_files: changedFiles } : {}),
  };
}

function deriveRoleAvailabilityFromStep(step = {}) {
  const reason = String(step.reason || extractStepReason(step.notes || "")).trim().toLowerCase();
  if (!reason) return null;
  return {
    status: "unavailable",
    reason,
  };
}

function extractStepReason(notes = "") {
  const match = String(notes).match(/\breason=([a-z_]+)/i);
  return match ? match[1] : "";
}

function filterAcceptanceWorkerEvidence(workers = []) {
  return (Array.isArray(workers) ? workers : []).filter((worker) => !isRuntimeObservationWorker(worker));
}

function isRuntimeObservationWorker(worker = {}) {
  const scope = String(worker.evidence_scope || worker.evidenceScope || "").trim().toLowerCase();
  const source = String(worker.source || worker.source_type || worker.sourceType || "").trim().toLowerCase();
  return scope === "runtime_observation"
    || source === "opencode_active_subtask"
    || source === "codex_internal_subtask"
    || source === "codex_subcodex"
    || source === "subtask_part";
}

function normalizeAcceptanceState(value) {
  return ["pending", "accepted", "rejected"].includes(value) ? value : DEFAULT_GLOBAL_CONFIG.acceptance.default_state;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function positiveInteger(value, fallback) {
  return Math.max(1, Math.trunc(positiveNumber(value, fallback)));
}

function cycleIdentifier(cycle = {}) {
  const number = cycle.cycle?.number || cycle.number || null;
  return number ? `C${number}` : "C?";
}

function compactTimestamp(value) {
  return String(value)
    .replace(/[-:]/g, "")
    .replace(/\.\d+/, "")
    .replace(/\+/, "+")
    .replace(/Z$/, "Z");
}

function toProjectPath(file, projectRoot) {
  return file.replace(`${projectRoot.replace(/\/+$/, "")}/`, "");
}

function normalizeRejectionBlockedRequest(value = {}) {
  const result = {
    status: value?.status || "none",
    proposed_by_role: value?.proposed_by_role || value?.proposedByRole || null,
    approved_by_role: value?.approved_by_role || value?.approvedByRole || null,
  };
  if (value?.reason) result.reason = value.reason;
  if (value?.evidence) result.evidence = value.evidence;
  return result;
}

function normalizeRejectionAudit(value = {}) {
  return {
    reviewer_role: value?.reviewer_role || value?.reviewerRole || "audit",
    verdict: value?.verdict || "needs_changes",
    findings: Array.isArray(value?.findings) ? value.findings : [],
  };
}

function collectReworkRoles(requiredRework = []) {
  const roles = new Set(["test", "implement"]);
  for (const item of Array.isArray(requiredRework) ? requiredRework : []) {
    for (const role of Array.isArray(item?.owner_roles) ? item.owner_roles : []) {
      const normalized = String(role || "").trim();
      if (normalized) roles.add(normalized);
    }
  }
  return [...roles];
}
