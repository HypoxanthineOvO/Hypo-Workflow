import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildRecentEvents } from "../log/index.js";

const NA = "n/a";
const OPENCODE_METADATA_PATH = ".opencode/hypo-workflow.json";
const DEFAULT_ACCEPTANCE_POLICY = Object.freeze({
  mode: "auto",
  require_user_confirm: false,
  default_state: "pending",
  timeout_hours: 72,
  reject_escalation_threshold: 3,
});
const OPENCODE_MODEL_AGENTS = Object.freeze([
  { name: "hw-plan", role: "plan", mode: "primary" },
  { name: "hw-build", role: "code-a", mode: "primary" },
  { name: "hw-compact", role: "compact", mode: "primary" },
  { name: "hw-test", role: "test", mode: "subagent" },
  { name: "hw-code-a", role: "code-a", mode: "subagent" },
  { name: "hw-code-b", role: "code-b", mode: "subagent" },
  { name: "hw-report", role: "report", mode: "primary" },
  { name: "hw-review", role: "debug", mode: "subagent" },
  { name: "hw-debug", role: "debug", mode: "subagent" },
]);

export async function buildOpenCodeStatusModel(projectRoot = ".", options = {}) {
  const pipelineDir = options.pipelineDir || ".pipeline";
  const root = join(projectRoot, pipelineDir);
  const sources = [];
  const warnings = [];

  const state = await readYaml(join(root, "state.yaml"), { required: true, sources, warnings });
  const config = await readYaml(join(root, "config.yaml"), { sources, warnings });
  const globalConfig = options.globalConfig
    ? { value: options.globalConfig }
    : options.homeDir
      ? await readYaml(join(options.homeDir, ".hypo-workflow", "config.yaml"), { sources, warnings })
      : { value: { acceptance: DEFAULT_ACCEPTANCE_POLICY } };
  const cycle = await readYaml(join(root, "cycle.yaml"), { sources, warnings });
  const queue = await readYaml(join(root, "feature-queue.yaml"), { sources, warnings });
  const metrics = await readYaml(join(root, "metrics.yaml"), { sources, warnings });
  const log = await readYaml(join(root, "log.yaml"), { sources, warnings });
  const lock = await readYaml(join(root, ".lock"), { sources, warnings });
  const derivedHealth = await readYaml(join(root, "derived-health.yaml"), { sources, warnings });
  const reportsCompact = await readText(join(root, "reports.compact.md"), { sources, warnings });
  const metadata = await readJson(join(projectRoot, OPENCODE_METADATA_PATH), { sources, warnings });
  const models = modelsFromOpenCode(metadata.value, options.opencode || {});

  if (!state.value) {
    return emptyModel({ sources, warnings, models });
  }

  const progress = progressFromState(state.value);
  const current = currentFromState(state.value);
  const latestScore = latestScoreFromState(state.value) || latestScoreFromReport(reportsCompact.value);
  const feature = currentFeature({ state: state.value, queue: queue.value, current });
  const gate = gateFromQueue(queue.value, feature, state.value);
  const metricSummary = metricsSummary(metrics.value, feature, state.value);
  const recentEvents = recentEventsFromLog(log.value);
  const cycleModel = cycleFromSources(cycle.value, queue.value, state.value);
  const dag = resolveFeatureDagBoard(queue.value || {});
  const acceptancePolicy = resolveAcceptancePolicy(config.value || {}, globalConfig.value || {});
  const acceptance = acceptanceFromSources(cycle.value, state.value, acceptancePolicy, options);
  const lifecycle = lifecycleFromSources(cycle.value, state.value, acceptance);
  const lease = assessStatusLease(lock.value, options);
  const derived = derivedHealthFromSources(derivedHealth.value, sources);
  const pipeline = {
    name: state.value.pipeline?.name || "",
    status: state.value.pipeline?.status || "unknown",
    heartbeat: state.value.last_heartbeat || null,
  };

  const model = {
    ok: true,
    sources,
    warnings,
    cycle: cycleModel,
    acceptance,
    lifecycle,
    lease,
    derived,
    pipeline,
    progress,
    current,
    feature,
    queue: {
      current_feature: queue.value?.current_feature ?? null,
      auto_chain: queue.value?.defaults?.auto_chain ?? null,
      failure_policy: queue.value?.defaults?.failure_policy ?? null,
      features: summarizeFeatures(queue.value?.features || []),
      dag: summarizeDagBoard(dag),
    },
    gate,
    metrics: metricSummary,
    models,
    latest_score: latestScore || fallbackScore(state.value),
    recent_events: recentEvents,
  };

  return {
    ...model,
    sidebar: renderSidebarModel(model),
    footer: renderFooterModel(model),
  };
}

function emptyModel({ sources, warnings, models }) {
  const model = {
    ok: false,
    sources,
    warnings,
    cycle: { id: null, name: null, status: "missing" },
    acceptance: { scope: null, state: "none", mode: null, feedback_ref: null, cycle_id: null, policy: resolveAcceptancePolicy() },
    lifecycle: { phase: "missing", next_action: "none", reason: "missing_pipeline", feedback_ref: null, continuation: null },
    pipeline: { name: "", status: "missing_pipeline", heartbeat: null },
    progress: { completed: 0, total: 0, percent: 0 },
    current: { milestone_id: null, prompt_name: null, step: null, feature_id: null },
    feature: { id: null, title: null, status: "missing", gate: null, milestones: [] },
    queue: { current_feature: null, auto_chain: null, failure_policy: null, features: [], dag: summarizeDagBoard(resolveFeatureDagBoard({ features: [] })) },
    gate: { status: "none", feature_id: null },
    lease: { action: "none", reason: "missing_pipeline", repair_hint: null },
    derived: { ok: true, stale_count: 0, error_count: 0, artifacts: [] },
    metrics: { duration_ms: NA, token_count: NA, cost: NA },
    models,
    latest_score: { diff_score: null, overall: null, code_quality: null },
    recent_events: [],
  };
  return {
    ...model,
    sidebar: renderSidebarModel(model),
    footer: renderFooterModel(model),
  };
}

async function readJson(path, context) {
  const text = await readText(path, context);
  if (!text.value) return { value: null };
  try {
    return { value: JSON.parse(text.value) };
  } catch (error) {
    recordSource(context.sources, path, "error", error.message);
    context.warnings.push(`${path} parse error: ${error.message}`);
    return { value: null };
  }
}

async function readYaml(path, context) {
  const text = await readText(path, context);
  if (!text.value) return { value: null };
  try {
    return { value: parseStatusYaml(text.value) };
  } catch (error) {
    recordSource(context.sources, path, "error", error.message);
    context.warnings.push(`${relativePipelinePath(path)} parse error: ${error.message}`);
    return { value: null };
  }
}

async function readText(path, { required = false, sources, warnings }) {
  try {
    const value = await readFile(path, "utf8");
    recordSource(sources, path, "ok");
    return { value };
  } catch (error) {
    const status = required ? "missing_required" : "missing_optional";
    recordSource(sources, path, status, error.code || error.message);
    if (required) warnings.push(`${relativePipelinePath(path)} missing`);
    return { value: null };
  }
}

function recordSource(sources, path, status, message) {
  const existing = sources.find((source) => source.path === path);
  if (existing) {
    existing.status = status;
    if (message) existing.message = message;
    return;
  }
  sources.push({ path, status, ...(message ? { message } : {}) });
}

function progressFromState(state) {
  const completed = numberOrZero(state.pipeline?.prompts_completed);
  const total = numberOrZero(state.pipeline?.prompts_total);
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

function currentFromState(state) {
  const promptName = state.current?.prompt_name || "";
  const milestoneId = extractMilestoneId(promptName) || extractMilestoneId(state.current?.prompt_file);
  const milestone = asArray(state.milestones).find((item) => item.id === milestoneId) || {};
  return {
    milestone_id: milestoneId,
    prompt_name: state.current?.prompt_name || null,
    phase: state.current?.phase || null,
    step: state.current?.step || null,
    feature_id: milestone.feature_id || extractFeatureId(promptName),
  };
}

function currentFeature({ state, queue, current }) {
  const features = asArray(queue?.features);
  const queueFeature = features.find((feature) => feature.id === queue?.current_feature)
    || features.find((feature) => feature.id === current.feature_id)
    || features.find((feature) => feature.gate === "confirm" && feature.status === "queued")
    || null;
  if (queueFeature) {
    return {
      id: queueFeature.id || null,
      title: queueFeature.title || null,
      status: queueFeature.status || "unknown",
      gate: queueFeature.gate || null,
      decompose_mode: queueFeature.decompose_mode || null,
      milestones: asArray(queueFeature.milestones),
    };
  }
  return {
    id: current.feature_id || null,
    title: null,
    status: state.pipeline?.status || "unknown",
    gate: null,
    decompose_mode: null,
    milestones: [],
  };
}

function gateFromQueue(queue, feature, state) {
  if (queue?.current_feature === null) {
    const waiting = (queue.features || []).find((item) => item.gate === "confirm" && item.status === "queued");
    if (waiting) {
      return {
        status: "waiting_confirmation",
        feature_id: waiting.id,
        gate: "confirm",
      };
    }
  }
  if (feature?.gate === "confirm" && state.pipeline?.status === "stopped") {
    return {
      status: "waiting_confirmation",
      feature_id: feature.id,
      gate: "confirm",
    };
  }
  return {
    status: "none",
    feature_id: feature?.id || null,
    gate: feature?.gate || null,
  };
}

function metricsSummary(metrics, feature, state) {
  const cycleRecord = asArray(metrics?.cycles).find((item) => item.id === metrics?.cycle_id);
  const featureRecord = asArray(metrics?.features).find((item) => item.id === feature?.id);
  const milestoneId = currentFromState(state).milestone_id;
  const milestoneRecord = asArray(metrics?.milestones).find((item) => item.id === milestoneId);
  const record = milestoneRecord || featureRecord || cycleRecord || {};
  return {
    duration_ms: fallbackMetric(record.duration_ms),
    token_count: fallbackMetric(record.token_count),
    cost: fallbackMetric(record.cost),
  };
}

function latestScoreFromState(state) {
  const entries = state.history?.completed_prompts || [];
  const latest = [...entries].reverse().find((entry) => entry.evaluation);
  return latest?.evaluation || null;
}

function latestScoreFromReport(source) {
  if (!source) return null;
  const diff = /diff_score\s*=?\s*(\d+)/i.exec(source)?.[1];
  const overall = /overall\s*=?\s*(\d+)/i.exec(source)?.[1];
  if (!diff && !overall) return null;
  return {
    diff_score: diff ? Number(diff) : null,
    overall: overall ? Number(overall) : null,
    code_quality: null,
  };
}

function fallbackScore(state) {
  return {
    diff_score: state.prompt_state?.diff_score ?? null,
    overall: state.prompt_state?.evaluation?.overall ?? null,
    code_quality: state.prompt_state?.code_quality ?? null,
  };
}

function recentEventsFromLog(log) {
  return buildRecentEvents(log, { limit: 10 });
}

function cycleFromSources(cycle, queue, state) {
  const number = cycle?.cycle?.number || queue?.cycle_id || null;
  return {
    id: typeof number === "number" ? `C${number}` : number,
    name: cycle?.cycle?.name || state.pipeline?.name || null,
    status: cycle?.cycle?.status || state.pipeline?.status || "unknown",
  };
}

function acceptanceFromSources(cycle, state, policy, options = {}) {
  const cycleAcceptance = cycle?.cycle?.acceptance || {};
  const stateAcceptance = state.acceptance || {};
  const raw = {
    scope: stateAcceptance.scope || "cycle",
    state: stateAcceptance.state || cycleAcceptance.state || "none",
    mode: stateAcceptance.mode || cycleAcceptance.mode || policy.mode || null,
    feedback_ref: stateAcceptance.feedback_ref || cycleAcceptance.feedback_ref || null,
    cycle_id: stateAcceptance.cycle_id || cycleFromSources(cycle, null, state).id || null,
    requested_at: stateAcceptance.requested_at || cycleAcceptance.requested_at || null,
    updated_at: stateAcceptance.updated_at || cycleAcceptance.updated_at || null,
  };
  const evaluated = evaluateAcceptanceStatus(raw, policy, options);
  return {
    ...evaluated,
    policy,
  };
}

function lifecycleFromSources(cycle, state, acceptance) {
  const cycleNode = cycle?.cycle || {};
  const policy = resolveStatusLifecyclePolicy(cycleNode);
  const feedbackRef = acceptance?.feedback_ref || state.acceptance?.feedback_ref || cycleNode.acceptance?.feedback_ref || null;
  const continuation = normalizeStatusContinuation(
    state.continuation || selectStatusContinuation(cycleNode) || selectStatusContinuation(policy),
  );

  if (
    state.current?.phase === "needs_revision" ||
    (acceptance?.state === "rejected" && policy.reject.default_action === "needs_revision")
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
    cycleNode.status === "follow_up_planning" ||
    isRunnableStatusContinuation(state.continuation) ||
    (acceptance?.state === "accepted" && policy.accept.next === "follow_up_plan" && continuation)
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
    cycleNode.status === "pending_acceptance" ||
    acceptance?.state === "pending"
  ) {
    return {
      phase: "pending_acceptance",
      next_action: "accept_or_reject",
      reason: "awaiting_acceptance",
      feedback_ref: feedbackRef,
      continuation,
    };
  }

  if (state.pipeline?.status === "blocked" || cycleNode.status === "blocked" || state.prompt_state?.result === "blocked") {
    return {
      phase: "blocked",
      next_action: "inspect_blocker",
      reason: "pipeline_blocked",
      feedback_ref: feedbackRef,
      continuation,
    };
  }

  if (state.pipeline?.status === "completed" || cycleNode.status === "completed" || state.current?.phase === "completed") {
    return {
      phase: "completed",
      next_action: "none",
      reason: "pipeline_completed",
      feedback_ref: feedbackRef,
      continuation: null,
    };
  }

  const phase = normalizeStatusPhase(state.current?.phase);
  if (phase) {
    return {
      phase,
      next_action: nextActionForStatusPhase(phase),
      reason: "current_phase",
      feedback_ref: feedbackRef,
      continuation,
    };
  }

  if (acceptance?.state === "accepted") {
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

function resolveStatusLifecyclePolicy(cycle = {}) {
  const explicit = cycle.lifecycle_policy || {};
  const continuations = normalizeStatusContinuations(cycle.continuations || explicit.continuations || []);
  const hasFollowUp = continuations.some((item) => item.kind === "follow_up_plan");
  return {
    workflow_kind: normalizeStatusWorkflowKind(cycle.workflow_kind || cycle.type),
    reject: {
      default_action: normalizeStatusRejectAction(explicit.reject?.default_action || explicit.reject_default_action),
    },
    accept: {
      next: normalizeStatusAcceptNext(explicit.accept?.next || explicit.accept_next || (hasFollowUp ? "follow_up_plan" : "complete")),
    },
    resume: {
      default_action: "continue_revision",
    },
    gates: {
      acceptance: "auto",
      ...(explicit.gates || {}),
    },
    auto_continue: explicit.auto_continue ?? true,
    continuations,
  };
}

function selectStatusContinuation(value = {}) {
  const continuations = normalizeStatusContinuations(Array.isArray(value) ? value : value.continuations || []);
  return continuations.find((item) => item.kind === "follow_up_plan" && item.status === "active")
    || continuations.find((item) => item.kind === "follow_up_plan" && ["planned", "queued", "pending"].includes(item.status))
    || null;
}

function isRunnableStatusContinuation(value) {
  const continuation = normalizeStatusContinuation(value);
  return continuation?.kind === "follow_up_plan" && ["active", "planned", "queued", "pending"].includes(continuation.status);
}

function normalizeStatusContinuations(value) {
  return (Array.isArray(value) ? value : []).map(normalizeStatusContinuation).filter(Boolean);
}

function normalizeStatusContinuation(value) {
  if (!value || typeof value !== "object") return null;
  const kind = normalizeStatusToken(value.kind || value.type || value.next);
  const status = normalizeStatusToken(value.status) || "planned";
  return {
    ...value,
    id: value.id || value.name || "follow-up",
    kind: ["follow_up_plan", "follow_up_planning", "followup_plan", "plan_follow_up"].includes(kind) ? "follow_up_plan" : kind || "follow_up_plan",
    status: status === "completed" ? "done" : status,
  };
}

function normalizeStatusWorkflowKind(value) {
  const normalized = normalizeStatusToken(value);
  if (["analysis", "analyze", "audit", "debug", "root_cause", "metric", "repo_system"].includes(normalized)) return "analysis";
  if (["showcase", "demo", "presentation"].includes(normalized)) return "showcase";
  return "build";
}

function normalizeStatusRejectAction(value) {
  const normalized = normalizeStatusToken(value);
  if (["replan", "abandon", "abort"].includes(normalized)) return normalized;
  return "needs_revision";
}

function normalizeStatusAcceptNext(value) {
  const normalized = normalizeStatusToken(value);
  if (["follow_up_plan", "follow_up_planning", "followup_plan", "plan_follow_up"].includes(normalized)) return "follow_up_plan";
  if (["auto_continue", "continue"].includes(normalized)) return "auto_continue";
  return "complete";
}

function normalizeStatusPhase(value) {
  const normalized = normalizeStatusToken(value);
  return [
    "planning",
    "ready_to_start",
    "executing",
    "pending_acceptance",
    "needs_revision",
    "accepted",
    "follow_up_planning",
    "blocked",
    "completed",
  ].includes(normalized) ? normalized : null;
}

function nextActionForStatusPhase(phase) {
  if (phase === "planning") return "continue_planning";
  if (phase === "ready_to_start") return "start";
  if (phase === "executing") return "continue_execution";
  if (phase === "pending_acceptance") return "accept_or_reject";
  if (phase === "needs_revision") return "resume_revision";
  if (phase === "follow_up_planning") return "start_follow_up_plan";
  if (phase === "blocked") return "inspect_blocker";
  return "none";
}

function resolveAcceptancePolicy(projectConfig = {}, globalConfig = {}) {
  const merged = mergeObject(
    mergeObject(DEFAULT_ACCEPTANCE_POLICY, globalConfig?.acceptance || {}),
    projectConfig?.acceptance || {},
  );
  const mode = normalizeAcceptanceMode(merged.mode);
  return {
    mode,
    require_user_confirm: mode === "manual" || mode === "confirm" ? true : Boolean(merged.require_user_confirm),
    default_state: normalizeAcceptanceState(merged.default_state),
    timeout_hours: positiveNumber(merged.timeout_hours, DEFAULT_ACCEPTANCE_POLICY.timeout_hours),
    reject_escalation_threshold: positiveInteger(
      merged.reject_escalation_threshold,
      DEFAULT_ACCEPTANCE_POLICY.reject_escalation_threshold,
    ),
  };
}

function evaluateAcceptanceStatus(acceptance = {}, policy = {}, options = {}) {
  const state = acceptance.state || policy.default_state || DEFAULT_ACCEPTANCE_POLICY.default_state;
  const resolved = {
    ...acceptance,
    state,
    mode: acceptance.mode || policy.mode || DEFAULT_ACCEPTANCE_POLICY.mode,
    timed_out: false,
    automatic: Boolean(acceptance.automatic),
  };
  if (state !== "pending" || policy.mode !== "timeout") return resolved;

  const requestedAt = Date.parse(acceptance.requested_at || acceptance.updated_at || "");
  const now = Date.parse(options.now || new Date().toISOString());
  const timeoutHours = positiveNumber(policy.timeout_hours, DEFAULT_ACCEPTANCE_POLICY.timeout_hours);
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

function mergeObject(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : override;
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] = key in merged ? mergeObject(merged[key], value) : value;
  }
  return merged;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeAcceptanceMode(value) {
  return ["manual", "auto", "timeout", "confirm"].includes(value) ? value : DEFAULT_ACCEPTANCE_POLICY.mode;
}

function normalizeAcceptanceState(value) {
  return ["pending", "accepted", "rejected"].includes(value) ? value : DEFAULT_ACCEPTANCE_POLICY.default_state;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function positiveInteger(value, fallback) {
  return Math.max(1, Math.trunc(positiveNumber(value, fallback)));
}

function renderSidebarModel(model) {
  const current = model.current.milestone_id || "no milestone";
  const progress = `${model.progress.completed}/${model.progress.total}`;
  return {
    title: "Hypo-Workflow",
    summary: `${model.cycle.id || "C?"} ${current} ${model.current.step || model.pipeline.status} ${progress}`,
    sections: [
      {
        title: "Current",
        items: [
          `Cycle: ${model.cycle.id || NA}`,
          `Phase: ${model.lifecycle?.phase || NA}`,
          `Next: ${model.lifecycle?.next_action || NA}`,
          `Acceptance: ${model.acceptance?.state || NA} (${model.acceptance?.policy?.mode || model.acceptance?.mode || NA})`,
          `Feature: ${formatFeatureLabel(model.feature)}`,
          `Milestone: ${current}`,
          `Step: ${model.current.step || NA}`,
          `Gate: ${model.gate.status === "none" ? model.feature.gate || NA : model.gate.status}`,
        ],
      },
      ...renderRecoverySections(model),
      {
        title: "Models",
        items: [
          `Current: ${formatAgentModel(model.models.current)}`,
          `Active subagent (runtime only): ${formatAgentModel(model.models.active_subagent)}`,
          ...model.models.subagents.slice(0, 5).map(formatAgentModel),
        ],
      },
      {
        title: "Feature Queue",
        items: [
          `Current: ${model.queue.current_feature || NA}`,
          `Auto-chain: ${formatBoolean(model.queue.auto_chain)}`,
          `Failure policy: ${model.queue.failure_policy || NA}`,
          ...model.queue.features.slice(0, 6).map(formatQueueFeature),
        ],
      },
      ...renderDagSections(model),
      {
        title: "Milestones",
        items: model.feature.milestones.length
          ? model.feature.milestones.map(formatMilestone)
          : [NA],
      },
      {
        title: "Blocked / Deferred",
        items: blockedOrDeferred(model.queue.features),
      },
      {
        title: "Derived Health",
        items: renderDerivedHealthItems(model.derived),
      },
      {
        title: "Metrics",
        items: [
          `Duration: ${model.metrics.duration_ms}`,
          `Tokens: ${model.metrics.token_count}`,
          `Cost: ${model.metrics.cost}`,
        ],
      },
      {
        title: "Recent",
        items: model.recent_events.slice(0, 10).map((event) => event.summary),
      },
    ],
  };
}

function renderFooterModel(model) {
  const score = model.latest_score?.diff_score ?? NA;
  const parts = [
    `HW ${model.pipeline.status}`,
    model.cycle.id || "C?",
    `${model.progress.completed}/${model.progress.total}`,
    model.current.milestone_id || "M?",
    model.current.step || model.gate.status,
    `phase:${model.lifecycle?.phase || NA}`,
    `model:${shortModel(model.models.current.model)}`,
    `sub:${shortModel(model.models.active_subagent.model)}`,
    `score:${score}`,
    `tokens:${model.metrics.token_count}`,
    `cost:${model.metrics.cost}`,
  ];
  if (model.gate.status === "waiting_confirmation") parts.push("confirm");
  if (model.lease?.action === "repair") parts.push("lease:repair");
  if (model.derived && model.derived.ok === false) parts.push(`derived:${model.derived.stale_count || model.derived.error_count}`);
  if (model.acceptance?.state && model.acceptance.state !== "none") parts.push(`acceptance:${model.acceptance.state}`);
  return { text: parts.join(" | ") };
}

function derivedHealthFromSources(health, sources = []) {
  if (!health) {
    const source = sources.find((item) => item.path.endsWith(".pipeline/derived-health.yaml"));
    return {
      ok: true,
      stale_count: 0,
      error_count: 0,
      artifacts: [],
      source: source?.status || "missing_optional",
    };
  }
  const artifacts = asArray(health.artifacts).map((artifact) => ({
    id: artifact.id || null,
    path: artifact.path || null,
    status: artifact.status || "unknown",
    severity: artifact.severity || "unknown",
    repair_hint: artifact.repair_hint || null,
  }));
  return {
    ok: health.ok !== false && Number(health.stale_count || 0) === 0 && Number(health.error_count || 0) === 0,
    stale_count: numberOrZero(health.stale_count),
    error_count: numberOrZero(health.error_count),
    checked_at: health.checked_at || null,
    artifacts,
  };
}

function renderDerivedHealthItems(derived = {}) {
  const items = [
    `Status: ${derived.ok === false ? "needs_repair" : "fresh"}`,
    `Stale: ${derived.stale_count ?? 0}`,
    `Errors: ${derived.error_count ?? 0}`,
  ];
  const needsRepair = asArray(derived.artifacts).filter((artifact) => artifact.status !== "fresh");
  if (needsRepair.length) {
    items.push(...needsRepair.slice(0, 4).map((artifact) => (
      `${artifact.id || artifact.path}: ${artifact.status}${artifact.repair_hint ? ` (${artifact.repair_hint})` : ""}`
    )));
  }
  return items;
}

function assessStatusLease(lease, options = {}) {
  if (!lease) return { action: "none", reason: "no_lease", repair_hint: null };
  const errors = [];
  if (!lease.platform) errors.push("platform is required");
  if (!lease.session_id && !lease.sessionId) errors.push("session_id is required");
  if (!validStatusDate(lease.heartbeat_at || lease.heartbeatAt)) errors.push("heartbeat_at must be an ISO timestamp");
  if (!validStatusDate(lease.expires_at || lease.expiresAt)) errors.push("expires_at must be an ISO timestamp");
  if (errors.length) {
    return {
      action: "repair",
      reason: "malformed_lease",
      errors,
      repair_hint: "Run /hw:check and inspect .pipeline/.lock before resuming.",
    };
  }
  const now = Date.parse(options.now || new Date().toISOString());
  const expires = Date.parse(lease.expires_at || lease.expiresAt);
  if (Number.isFinite(now) && Number.isFinite(expires) && now >= expires) {
    return { action: "takeover_available", reason: "expired_lease", repair_hint: null };
  }
  return { action: "block", reason: "fresh_foreign_lease", repair_hint: null };
}

function renderRecoverySections(model) {
  if (!model.lease || model.lease.action === "none") return [];
  const items = [
    `Lease: ${model.lease.action}`,
    `Reason: ${model.lease.reason}`,
  ];
  if (model.lease.repair_hint) items.push(`Repair: ${model.lease.repair_hint}`);
  return [{ title: "Recovery", items }];
}

function validStatusDate(value) {
  return Boolean(value) && Number.isFinite(Date.parse(value));
}

function extractMilestoneId(value = "") {
  return /\b(M\d+)\b/.exec(String(value))?.[1] || null;
}

function extractFeatureId(value = "") {
  return /\b(F\d+)\b/.exec(String(value))?.[1] || null;
}

function numberOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function fallbackMetric(value) {
  return value === undefined || value === null ? NA : value;
}

function summarizeFeatures(features) {
  return asArray(features).map((feature) => ({
    id: feature.id || null,
    title: feature.title || null,
    status: feature.status || "unknown",
    gate: feature.gate || null,
    decompose_mode: feature.decompose_mode || null,
    depends_on: asArray(feature.depends_on),
    blocked_by: asArray(feature.blocked_by),
    execution_hint: feature.execution_hint || null,
    handoff_hint: feature.handoff_hint || null,
    milestones: asArray(feature.milestones),
  }));
}

function summarizeDagBoard(board) {
  return {
    ok: board.ok,
    visible: board.visible,
    errors: board.errors,
    ready_features: board.ready_features.map((feature) => feature.id),
    blocked_features: board.blocked_features.map((feature) => ({
      id: feature.id,
      blocked_by: feature.blocked_by,
    })),
    parallel_candidates: board.parallel_candidates.map((feature) => feature.id),
  };
}

function resolveFeatureDagBoard(queue = {}) {
  const features = asArray(queue.features).map((feature, index) => ({
    ...feature,
    id: String(feature.id || `F${String(index + 1).padStart(3, "0")}`),
    title: feature.title || feature.id || `F${String(index + 1).padStart(3, "0")}`,
    status: normalizeDagStatus(feature.status),
    depends_on: asArray(feature.depends_on || feature.dependsOn || feature.dependencies).map(String),
    blocked_by: asArray(feature.blocked_by || feature.blockedBy).map(String),
    execution_hint: feature.execution_hint || feature.executionHint || "",
    handoff_hint: feature.handoff_hint || feature.handoffHint || "",
  }));
  const doneIds = new Set(features.filter((feature) => ["done", "completed"].includes(feature.status)).map((feature) => feature.id));
  const enriched = features.map((feature) => {
    const blockedBy = feature.depends_on.filter((dependency) => !doneIds.has(dependency));
    const ready = !["done", "completed", "active", "running", "in_progress"].includes(feature.status)
      && blockedBy.length === 0
      && ["queued", "decomposed", "pending"].includes(feature.status);
    return {
      ...feature,
      ready,
      blocked_by: blockedBy,
    };
  });
  const visible = features.length > 1 && features.some((feature) => feature.depends_on.length || feature.blocked_by.length || feature.execution_hint || feature.handoff_hint);
  const readyFeatures = enriched.filter((feature) => feature.ready);
  return {
    ok: true,
    visible,
    errors: [],
    features: enriched,
    ready_features: readyFeatures,
    blocked_features: enriched.filter((feature) => feature.blocked_by.length > 0),
    parallel_candidates: readyFeatures.length > 1 ? readyFeatures : [],
  };
}

function normalizeDagStatus(value) {
  const normalized = String(value || "queued").trim().toLowerCase();
  if (normalized === "completed") return "done";
  if (normalized === "running" || normalized === "in-progress") return "active";
  return normalized;
}

function renderDagSections(model) {
  const dag = model.queue?.dag;
  if (!dag?.visible) return [];
  const items = [];
  if (!dag.ok) {
    items.push(...dag.errors.map((error) => `Error: ${error.message}`));
  }
  items.push(`Ready: ${dag.ready_features.length ? dag.ready_features.join(", ") : NA}`);
  items.push(`Parallel: ${dag.parallel_candidates.length ? dag.parallel_candidates.join(", ") : NA}`);
  if (dag.blocked_features.length) {
    items.push(...dag.blocked_features.map((feature) => `${feature.id} blocked by ${feature.blocked_by.join(", ")}`));
  }
  return [{ title: "Feature DAG", items }];
}

function formatFeatureLabel(feature) {
  const parts = [feature.id || NA];
  if (feature.title) parts.push(feature.title);
  if (feature.status) parts.push(`(${feature.status})`);
  return parts.join(" ");
}

function formatQueueFeature(feature) {
  const pieces = [
    feature.id || NA,
    feature.status || "unknown",
    feature.gate ? `gate:${feature.gate}` : null,
    feature.decompose_mode ? `mode:${feature.decompose_mode}` : null,
    feature.title || null,
  ].filter(Boolean);
  return pieces.join(" | ");
}

function formatMilestone(milestone) {
  return [milestone.id || NA, milestone.status || "unknown", milestone.prompt_file || null]
    .filter(Boolean)
    .join(" | ");
}

function blockedOrDeferred(features) {
  const items = features
    .filter((feature) => feature.status === "blocked" || feature.status === "deferred")
    .map((feature) => `${feature.id || NA} | ${feature.status} | ${feature.title || ""}`.trim());
  return items.length ? items : ["none"];
}

function modelsFromOpenCode(metadata, runtime) {
  const configured = configuredAgentModels(metadata);
  const current = normalizeRuntimeAgentModel(runtime.current)
    || configured.find((agent) => agent.name === metadata?.default_agent)
    || { agent: runtime.current?.agent || metadata?.default_agent || NA, model: runtime.current?.model || metadata?.model || NA };
  const activeSubagent = normalizeRuntimeAgentModel(runtime.active_subagent || runtime.subagent)
    || { agent: NA, model: NA };

  return {
    current,
    active_subagent: activeSubagent,
    configured,
    subagents: configured.filter((agent) => agent.mode === "subagent"),
  };
}

function configuredAgentModels(metadata) {
  const agents = metadata?.agents || {};
  return OPENCODE_MODEL_AGENTS.map((agent) => {
    const rawModel = agents[agent.role]?.model;
    return {
      agent: agent.name,
      role: agent.role,
      mode: agent.mode,
      model: rawModel ? qualifyModelId(rawModel, metadata) : NA,
    };
  });
}

function normalizeRuntimeAgentModel(value) {
  if (!value || typeof value !== "object") return null;
  const model = normalizeModelId(value.model) || normalizeModelId(value.modelID)
    || normalizeProviderModel(value.providerID, value.modelID);
  if (!model && !value.agent) return null;
  return {
    agent: value.agent || NA,
    model: model || NA,
    evidence_scope: "runtime_observation",
    worker_evidence: false,
  };
}

function normalizeModelId(model) {
  if (!model) return null;
  if (typeof model === "string") return model;
  return normalizeProviderModel(model.providerID, model.modelID);
}

function normalizeProviderModel(providerID, modelID) {
  if (!providerID || !modelID) return null;
  return `${providerID}/${modelID}`;
}

function qualifyModelId(model, metadata) {
  if (!model || model.includes("/")) return model || NA;
  for (const [providerId, provider] of Object.entries(metadata?.providers || {})) {
    if (provider?.models && Object.prototype.hasOwnProperty.call(provider.models, model)) {
      return `${providerId}/${model}`;
    }
  }
  if (model.startsWith("gpt-")) return `openai/${model}`;
  if (model.startsWith("claude-")) return `anthropic/${model}`;
  if (model.startsWith("mimo-")) return `mimo/${model}`;
  if (model.startsWith("deepseek-")) return `deepseek/${model}`;
  return model;
}

function formatAgentModel(value) {
  if (!value) return NA;
  const prefix = value.agent || value.role || NA;
  return `${prefix} -> ${value.model || NA}`;
}

function shortModel(value) {
  if (!value || value === NA) return NA;
  return String(value).split("/").pop();
}

function formatBoolean(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  return NA;
}

function normalizeStatusToken(value) {
  return String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.values(value).filter((item) => item && typeof item === "object");
}

function relativePipelinePath(path) {
  const index = path.indexOf(".pipeline/");
  return index === -1 ? path : path.slice(index);
}

function parseStatusYaml(source) {
  const lines = source
    .split(/\r?\n/)
    .map((raw) => ({ raw, indent: raw.match(/^ */)[0].length, text: raw.trim() }))
    .filter((line) => line.text && !line.text.startsWith("#"));
  let index = 0;

  function parseNode(indent) {
    if (index >= lines.length) return {};
    return isArrayItem(lines[index].text) && lines[index].indent === indent
      ? parseArray(indent)
      : parseObject(indent);
  }

  function parseArray(indent) {
    const value = [];
    while (index < lines.length) {
      const line = lines[index];
      if (line.indent < indent) break;
      if (line.indent !== indent || !isArrayItem(line.text)) break;

      const rest = line.text === "-" ? "" : line.text.slice(2).trim();
      index += 1;
      if (!rest) {
        value.push(index < lines.length && lines[index].indent > indent
          ? parseArrayChild(lines[index].indent)
          : null);
        continue;
      }

      const pair = parseKeyValue(rest);
      if (pair) {
        const item = {};
        setParsedValue(item, pair, indent);
        if (index < lines.length && lines[index].indent > indent) {
          Object.assign(item, parseObject(lines[index].indent));
        }
        value.push(item);
      } else {
        value.push(parseScalar(rest));
      }
    }
    return value;
  }

  function parseArrayChild(childIndent) {
    if (index >= lines.length) return null;
    const child = lines[index];
    if (child.indent !== childIndent) return parseNode(childIndent);
    const pair = parseKeyValue(child.text);
    if (pair) return parseObject(childIndent);
    index += 1;
    return parseScalar(child.text);
  }

  function parseObject(indent) {
    const value = {};
    while (index < lines.length) {
      const line = lines[index];
      if (line.indent < indent) break;
      if (line.indent !== indent) break;
      if (isArrayItem(line.text)) break;

      const pair = parseKeyValue(line.text);
      if (!pair) {
        index += 1;
        continue;
      }
      index += 1;
      setParsedValue(value, pair, indent);
    }
    return value;
  }

  function setParsedValue(object, pair, indent) {
    if (!pair.rawValue) {
      object[pair.key] = index < lines.length && lines[index].indent > indent ? parseNode(lines[index].indent) : {};
    } else {
      object[pair.key] = parseScalar(pair.rawValue);
    }
  }

  return lines.length ? parseNode(lines[0].indent) : {};
}

function isArrayItem(text) {
  return text === "-" || text.startsWith("- ");
}

function parseKeyValue(text) {
  if (isQuotedScalar(text)) return null;
  const match = /^([^:]+):(.*)$/.exec(text);
  if (!match) return null;
  return {
    key: match[1].trim(),
    rawValue: match[2].trim(),
  };
}

function isQuotedScalar(text) {
  return (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  );
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && !trimmed.endsWith("]")) {
    throw new Error(`Malformed inline array: ${trimmed}`);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    return inner ? inner.split(",").map((item) => parseScalar(item.trim())) : [];
  }
  if (
    (trimmed.startsWith('"') && !trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && !trimmed.endsWith("'"))
  ) {
    throw new Error(`Malformed quoted scalar: ${trimmed}`);
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
