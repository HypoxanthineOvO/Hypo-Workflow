const WORKFLOW_KIND_ALIASES = Object.freeze({
  build: "build",
  implementation: "build",
  feature: "build",
  bugfix: "build",
  hotfix: "build",
  docs: "build",
  documentation: "build",
  analysis: "analysis",
  analyze: "analysis",
  audit: "analysis",
  debug: "analysis",
  root_cause: "analysis",
  metric: "analysis",
  repo_system: "analysis",
  research_analysis: "analysis",
  showcase: "showcase",
  demo: "showcase",
  presentation: "showcase",
});

export {
  commitWorkflowUpdate,
  validateWorkflowAuthority,
} from "./commit.js";

const ANALYSIS_KIND_ALIASES = Object.freeze({
  root_cause: "root_cause",
  rootcause: "root_cause",
  debug: "root_cause",
  bug: "root_cause",
  incident: "root_cause",
  metric: "metric",
  metrics: "metric",
  trend: "metric",
  research: "metric",
  measurement: "metric",
  repo_system: "repo_system",
  repo: "repo_system",
  system: "repo_system",
  architecture: "repo_system",
  codebase: "repo_system",
});

const DEFAULT_LIFECYCLE_POLICY = Object.freeze({
  reject: Object.freeze({ default_action: "needs_revision" }),
  accept: Object.freeze({ next: "complete" }),
  resume: Object.freeze({ default_action: "continue_current" }),
  gates: Object.freeze({ acceptance: "auto" }),
  auto_continue: true,
  continuations: Object.freeze([]),
});

const CANONICAL_PHASES = new Set([
  "planning",
  "ready_to_start",
  "executing",
  "pending_acceptance",
  "needs_revision",
  "accepted",
  "follow_up_planning",
  "blocked",
  "completed",
]);

export function normalizeWorkflowKind(value, context = {}) {
  const direct = normalizeToken(value);
  if (direct && WORKFLOW_KIND_ALIASES[direct]) return WORKFLOW_KIND_ALIASES[direct];

  const category = normalizeToken(context.category || context.type || context.profile);
  if (category && WORKFLOW_KIND_ALIASES[category]) return WORKFLOW_KIND_ALIASES[category];
  if (category === "showcase") return "showcase";
  return "build";
}

export function normalizeAnalysisKind(value, workflowKind = "build") {
  if (workflowKind !== "analysis") return null;
  const normalized = normalizeToken(value);
  if (normalized && ANALYSIS_KIND_ALIASES[normalized]) return ANALYSIS_KIND_ALIASES[normalized];
  return "root_cause";
}

export function deriveWorkflowPreset(workflowKind = "build", options = {}) {
  const normalizedKind = normalizeWorkflowKind(workflowKind);
  const defaultPreset = normalizedKind === "analysis"
    ? "analysis"
    : normalizedKind === "showcase"
      ? "implement-only"
      : "tdd";
  const override = normalizePresetName(options.preset);
  const allowed = presetAllowedForWorkflow(override, normalizedKind);
  return {
    workflow_kind: normalizedKind,
    preset: allowed ? override : defaultPreset,
  };
}

export function resolveCycleWorkflow(input = {}) {
  const cycle = unwrapCycle(input.cycle || input);
  const config = input.config || {};
  const feature = input.feature || {};
  const workflowSource = workflowKindSource({ cycle, config, feature, input });
  const workflowKind = normalizeWorkflowKind(workflowSource.value, {
    category: workflowSource.source === "cycle.type" ? workflowSource.value : feature.category,
    type: workflowSource.source === "cycle.type" ? workflowSource.value : feature.type,
  });
  const analysisKind = normalizeAnalysisKind(
    cycle.analysis_kind || cycle.analysisKind || feature.analysis_kind || feature.analysisKind || input.analysis_kind,
    workflowKind,
  );
  const preset = deriveWorkflowPreset(workflowKind, {
    preset:
      cycle.preset ||
      cycle.execution?.steps?.preset ||
      input.preset ||
      config.execution?.steps?.preset,
  }).preset;

  return {
    workflow_kind: workflowKind,
    analysis_kind: analysisKind,
    preset,
    legacy_type: legacyTypeForWorkflow(workflowKind),
    source: workflowSource.source,
  };
}

export function resolveCycleLifecyclePolicy(input = {}) {
  const cycle = unwrapCycle(input.cycle || input);
  const workflow = resolveCycleWorkflow({
    cycle,
    config: input.config,
    feature: input.feature,
    workflow_kind: input.workflow_kind,
    analysis_kind: input.analysis_kind,
  });
  const explicit = input.lifecycle_policy || cycle.lifecycle_policy || {};
  const continuations = normalizeContinuations(input.continuations || cycle.continuations || explicit.continuations || []);
  const hasFollowUpPlan = continuations.some((item) => item.kind === "follow_up_plan");
  const defaultAcceptNext = hasFollowUpPlan ? "follow_up_plan" : DEFAULT_LIFECYCLE_POLICY.accept.next;

  return {
    workflow_kind: workflow.workflow_kind,
    reject: {
      default_action: normalizeRejectAction(
        explicit.reject?.default_action ||
        explicit.reject_default_action ||
        DEFAULT_LIFECYCLE_POLICY.reject.default_action,
      ),
    },
    accept: {
      next: normalizeAcceptNext(explicit.accept?.next || explicit.accept_next || defaultAcceptNext),
    },
    resume: {
      default_action: normalizeResumeAction(
        explicit.resume?.default_action ||
        explicit.resume_default_action ||
        (normalizeRejectAction(explicit.reject?.default_action || explicit.reject_default_action) === "needs_revision"
          ? "continue_revision"
          : DEFAULT_LIFECYCLE_POLICY.resume.default_action),
      ),
    },
    gates: {
      ...DEFAULT_LIFECYCLE_POLICY.gates,
      ...(explicit.gates || {}),
    },
    auto_continue: explicit.auto_continue ?? input.auto_continue ?? DEFAULT_LIFECYCLE_POLICY.auto_continue,
    continuations,
  };
}

export function resolveCycleStatusPhase(input = {}) {
  const cycle = unwrapCycle(input.cycle || {});
  const state = input.state || {};
  const policy = input.policy || resolveCycleLifecyclePolicy({ cycle });
  const acceptance = input.acceptance || state.acceptance || cycle.acceptance || {};
  const acceptanceState = acceptance.state || state.acceptance?.state || cycle.acceptance?.state || "none";
  const feedbackRef = acceptance.feedback_ref || state.acceptance?.feedback_ref || cycle.acceptance?.feedback_ref || null;
  const continuation = normalizeContinuation(
    state.continuation ||
    selectLifecycleContinuation(cycle, "follow_up_plan") ||
    selectLifecycleContinuation(policy, "follow_up_plan"),
  );

  if (
    state.current?.phase === "needs_revision" ||
    (acceptanceState === "rejected" && policy.reject.default_action === "needs_revision")
  ) {
    return {
      phase: "needs_revision",
      next_action: "resume_revision",
      reason: "cycle_rejected",
      feedback_ref: feedbackRef,
      continuation: null,
    };
  }

  if (
    state.current?.phase === "follow_up_planning" ||
    cycle.status === "follow_up_planning" ||
    isRunnableContinuation(state.continuation) ||
    (acceptanceState === "accepted" && policy.accept.next === "follow_up_plan" && continuation)
  ) {
    return {
      phase: "follow_up_planning",
      next_action: "start_follow_up_plan",
      reason: "accepted_with_continuation",
      feedback_ref: feedbackRef,
      continuation,
    };
  }

  if (
    state.pipeline?.status === "pending_acceptance" ||
    cycle.status === "pending_acceptance" ||
    acceptanceState === "pending"
  ) {
    return {
      phase: "pending_acceptance",
      next_action: "accept_or_reject",
      reason: "awaiting_acceptance",
      feedback_ref: feedbackRef,
      continuation,
    };
  }

  if (state.pipeline?.status === "blocked" || cycle.status === "blocked" || state.prompt_state?.result === "blocked") {
    return {
      phase: "blocked",
      next_action: "inspect_blocker",
      reason: "pipeline_blocked",
      feedback_ref: feedbackRef,
      continuation,
    };
  }

  if (state.pipeline?.status === "completed" || cycle.status === "completed" || state.current?.phase === "completed") {
    return {
      phase: "completed",
      next_action: "none",
      reason: "pipeline_completed",
      feedback_ref: feedbackRef,
      continuation: null,
    };
  }

  if (CANONICAL_PHASES.has(state.current?.phase)) {
    return {
      phase: state.current.phase,
      next_action: nextActionForPhase(state.current.phase),
      reason: "current_phase",
      feedback_ref: feedbackRef,
      continuation,
    };
  }

  if (acceptanceState === "accepted") {
    return {
      phase: "accepted",
      next_action: policy.accept.next === "auto_continue" ? "auto_continue" : "none",
      reason: "cycle_accepted",
      feedback_ref: feedbackRef,
      continuation,
    };
  }

  return {
    phase: state.current?.step ? "executing" : "ready_to_start",
    next_action: state.current?.step ? "continue_execution" : "start",
    reason: state.current?.step ? "active_step" : "no_active_step",
    feedback_ref: feedbackRef,
    continuation,
  };
}

export function resolveRejectionNextStep({ artifact = {}, lifecycle_policy: lifecyclePolicy = {} } = {}) {
  const rejectAction = normalizeRejectAction(
    lifecyclePolicy.reject?.default_action ||
    lifecyclePolicy.reject_default_action ||
    lifecyclePolicy.default_action,
  );
  const verdict = normalizeToken(artifact.verdict);

  if (verdict === "rejected" && rejectAction === "needs_revision") {
    return {
      action: "rework",
      silent_continue: false,
      requires_acceptance: false,
      required_roles: collectRequiredReworkRoles(artifact.required_rework),
      prompt_kind: "rework",
      reason: "cycle_rejected",
    };
  }

  return {
    action: rejectAction,
    silent_continue: false,
    requires_acceptance: false,
    required_roles: [],
    prompt_kind: rejectAction === "needs_revision" ? "rework" : rejectAction,
    reason: verdict === "rejected" ? "cycle_rejected" : "not_rejected",
  };
}

export function evaluateBlockedRuntimeDecision(input = {}) {
  const actorRole = normalizeToken(input.actor_role || input.actorRole);
  const action = normalizeToken(input.action);

  if (action === "propose_blocked") {
    if (actorRole !== "implement") {
      return deniedBlockedDecision("only implement may propose blocked", input);
    }
    const now = input.created_at || input.createdAt || new Date().toISOString();
    const blockedRequest = {
      schema_version: 1,
      status: "blocked_proposed",
      proposed_by_role: "implement",
      proposed_by_worker_id: input.actor_worker_id || input.actorWorkerId || null,
      approved_by_role: null,
      approved_by_worker_id: null,
      evidence: input.evidence || {},
      reason: input.evidence?.reason || input.reason || null,
      created_at: now,
      approved_at: null,
    };
    return {
      allowed: true,
      status: "blocked_proposed",
      approved: false,
      reason: "implement_blocked_proposal",
      blocked_request: blockedRequest,
    };
  }

  if (action === "approve_blocked") {
    if (actorRole !== "audit") {
      return deniedBlockedDecision("only audit may approve blocked; blocked cannot be self-approved", input);
    }
    const proposal = input.proposal || input.blocked_request || {};
    if (normalizeToken(proposal.proposed_by_role) === "audit") {
      return deniedBlockedDecision("audit cannot approve its own blocked proposal", input, proposal);
    }
    const now = input.approved_at || input.approvedAt || new Date().toISOString();
    const blockedRequest = {
      ...proposal,
      schema_version: proposal.schema_version || 1,
      status: "blocked_approved",
      approved_by_role: "audit",
      approved_by_worker_id: input.actor_worker_id || input.actorWorkerId || null,
      approved_at: now,
    };
    return {
      allowed: true,
      status: "blocked_approved",
      approved: true,
      reason: "audit_blocked_approval",
      blocked_request: blockedRequest,
    };
  }

  return deniedBlockedDecision("unsupported blocked runtime action", input);
}

export function selectLifecycleContinuation(value = {}, kind = "follow_up_plan") {
  const node = unwrapCycle(value);
  const continuations = normalizeContinuations(
    Array.isArray(value)
      ? value
      : node.continuations || node.lifecycle_policy?.continuations || [],
  );
  return (
    continuations.find((item) => item.kind === kind && item.status === "active") ||
    continuations.find((item) => item.kind === kind && ["planned", "queued", "pending"].includes(item.status)) ||
    null
  );
}

function isRunnableContinuation(value) {
  const continuation = normalizeContinuation(value);
  return continuation?.kind === "follow_up_plan" && ["active", "planned", "queued", "pending"].includes(continuation.status);
}

export function normalizeLifecycleContinuation(value = {}) {
  return normalizeContinuation(value);
}

function workflowKindSource({ cycle, config, feature, input }) {
  if (input.workflow_kind || input.workflowKind) {
    return { source: "input.workflow_kind", value: input.workflow_kind || input.workflowKind };
  }
  if (cycle.workflow_kind || cycle.workflowKind) {
    return { source: "cycle.workflow_kind", value: cycle.workflow_kind || cycle.workflowKind };
  }
  if (feature.workflow_kind || feature.workflowKind || feature.workflow) {
    return { source: "feature.workflow_kind", value: feature.workflow_kind || feature.workflowKind || feature.workflow };
  }
  if (config.workflow_kind || config.default_workflow_kind) {
    return { source: config.workflow_kind ? "config.workflow_kind" : "config.default_workflow_kind", value: config.workflow_kind || config.default_workflow_kind };
  }
  if (cycle.type && normalizeWorkflowKind(cycle.type) !== "build") {
    return { source: "cycle.type", value: cycle.type };
  }
  return { source: "default", value: "build" };
}

function normalizeContinuations(value) {
  const list = Array.isArray(value) ? value : [];
  return list.map(normalizeContinuation).filter(Boolean);
}

function normalizeContinuation(value) {
  if (!value || typeof value !== "object") return null;
  return {
    ...value,
    id: value.id || value.name || "follow-up",
    kind: normalizeContinuationKind(value.kind || value.type || value.next),
    status: normalizeContinuationStatus(value.status),
  };
}

function normalizeContinuationKind(value) {
  const normalized = normalizeToken(value);
  if (["follow_up_plan", "follow_up_planning", "followup_plan", "plan_follow_up"].includes(normalized)) {
    return "follow_up_plan";
  }
  if (["build", "implementation"].includes(normalized)) return "build";
  return normalized || "follow_up_plan";
}

function normalizeContinuationStatus(value) {
  const normalized = normalizeToken(value);
  if (["active", "planned", "queued", "pending", "done", "completed", "blocked", "skipped"].includes(normalized)) {
    return normalized === "completed" ? "done" : normalized;
  }
  return "planned";
}

function normalizeRejectAction(value) {
  const normalized = normalizeToken(value);
  if (["needs_revision", "revision", "revise"].includes(normalized)) return "needs_revision";
  if (["replan", "abandon", "abort"].includes(normalized)) return normalized;
  return DEFAULT_LIFECYCLE_POLICY.reject.default_action;
}

function normalizeAcceptNext(value) {
  const normalized = normalizeToken(value);
  if (["follow_up_plan", "follow_up_planning", "followup_plan", "plan_follow_up"].includes(normalized)) {
    return "follow_up_plan";
  }
  if (["auto_continue", "continue"].includes(normalized)) return "auto_continue";
  return "complete";
}

function normalizeResumeAction(value) {
  const normalized = normalizeToken(value);
  if (["continue_revision", "resume_revision", "revision"].includes(normalized)) return "continue_revision";
  if (["continue_current", "resume_current", "current"].includes(normalized)) return "continue_current";
  if (["replan", "abort", "abandon"].includes(normalized)) return normalized;
  return DEFAULT_LIFECYCLE_POLICY.resume.default_action;
}

function normalizePresetName(value) {
  const normalized = String(value || "").trim();
  if (["tdd", "implement-only", "custom", "analysis"].includes(normalized)) return normalized;
  return null;
}

function presetAllowedForWorkflow(preset, workflowKind) {
  if (!preset) return false;
  if (workflowKind === "analysis") return preset === "analysis";
  if (workflowKind === "showcase") return ["implement-only", "custom"].includes(preset);
  return ["tdd", "implement-only", "custom"].includes(preset);
}

function legacyTypeForWorkflow(workflowKind) {
  if (workflowKind === "build") return "feature";
  return workflowKind;
}

function nextActionForPhase(phase) {
  if (phase === "planning") return "continue_planning";
  if (phase === "ready_to_start") return "start";
  if (phase === "executing") return "continue_execution";
  if (phase === "pending_acceptance") return "accept_or_reject";
  if (phase === "needs_revision") return "resume_revision";
  if (phase === "follow_up_planning") return "start_follow_up_plan";
  if (phase === "blocked") return "inspect_blocker";
  return "none";
}

function collectRequiredReworkRoles(requiredRework = []) {
  const roles = new Set(["test", "implement"]);
  for (const item of Array.isArray(requiredRework) ? requiredRework : []) {
    for (const role of Array.isArray(item?.owner_roles) ? item.owner_roles : []) {
      const normalized = String(role || "").trim();
      if (normalized) roles.add(normalized);
    }
  }
  return [...roles];
}

function deniedBlockedDecision(reason, input = {}, blockedRequest = input.proposal || input.blocked_request || null) {
  return {
    allowed: false,
    status: "denied",
    approved: false,
    reason,
    blocked_request: blockedRequest,
  };
}

function unwrapCycle(value = {}) {
  return value?.cycle && typeof value.cycle === "object" ? value.cycle : value;
}

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
}
