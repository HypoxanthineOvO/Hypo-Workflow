export const DEFAULT_ANALYSIS_INTERACTION = Object.freeze({
  interaction_mode: "hybrid",
  boundaries: Object.freeze({
    code_changes: Object.freeze({
      manual: "deny",
      hybrid: "confirm",
      auto: "allow",
    }),
    restart_services: "confirm",
    install_system_dependencies: "ask",
    network_remote_resources: Object.freeze({
      manual: "ask",
      hybrid: "ask",
      auto: "allow",
    }),
    destructive_or_external_side_effects: "ask",
  }),
});

const INTERACTION_MODES = new Set(["manual", "hybrid", "auto"]);
const BOUNDARY_VALUES = new Set(["allow", "confirm", "ask", "deny"]);
const HYPOTHESIS_STATUSES = ["confirmed", "disproved", "partial", "pending"];
const EXPERIMENT_STATUSES = ["completed", "blocked", "pending"];
export const ANALYSIS_OUTCOMES = Object.freeze(["confirmed", "partial", "disproved", "inconclusive", "blocked"]);
export const ANALYSIS_EVALUATION_CRITERIA = Object.freeze([
  "question_addressed",
  "evidence_complete",
  "conclusion_traceable",
  "experiment_executed",
  "change_validated",
  "followup_recorded",
]);

export const ANALYSIS_LEDGER_REQUIRED_FIELDS = Object.freeze([
  "question",
  "environment_snapshot",
  "hypotheses",
  "experiments",
  "observations",
  "metrics",
  "interpretation",
  "conclusion",
  "confidence",
  "next_actions",
  "code_change_refs",
  "threats_to_validity",
  "ruled_out_alternatives",
]);

export const ANALYSIS_ENVIRONMENT_SNAPSHOT_REQUIRED_FIELDS = Object.freeze([
  "branch_commit",
  "effective_config_summary",
  "command_parameters",
  "data_log_sources",
  "time_window",
  "model_provider_parameters",
]);

export function normalizeAnalysisInteraction(input = {}) {
  const analysis = input.execution?.analysis || input.analysis || input;
  const merged = mergeObjects(DEFAULT_ANALYSIS_INTERACTION, analysis || {});
  const interactionMode = normalizeInteractionMode(merged.interaction_mode);
  const boundaries = merged.boundaries || {};

  return {
    interaction_mode: interactionMode,
    boundaries,
    effective: {
      code_changes: resolveBoundary(boundaries.code_changes, interactionMode, "confirm"),
      restart_services: resolveBoundary(boundaries.restart_services, interactionMode, "confirm"),
      install_system_dependencies: resolveBoundary(boundaries.install_system_dependencies, interactionMode, "ask"),
      network_remote_resources: resolveBoundary(boundaries.network_remote_resources, interactionMode, "ask"),
      destructive_or_external_side_effects: resolveBoundary(
        boundaries.destructive_or_external_side_effects,
        interactionMode,
        "ask",
      ),
    },
  };
}

export function renderAnalysisBoundaryGuidance(input = {}) {
  const analysis = normalizeAnalysisInteraction(input);
  return [
    "Analysis boundary:",
    `- interaction_mode=${analysis.interaction_mode}`,
    `- code_changes=${analysis.effective.code_changes} (manual=deny, hybrid=confirm, auto=allow)`,
    `- restart_services=${analysis.effective.restart_services}`,
    `- install_system_dependencies=${analysis.effective.install_system_dependencies}`,
    `- network_remote_resources=${analysis.effective.network_remote_resources}`,
    `- destructive_or_external_side_effects=${analysis.effective.destructive_or_external_side_effects}`,
  ].join("\n");
}

export function analysisLedgerPath(milestoneId) {
  const id = String(milestoneId || "analysis").trim() || "analysis";
  return `.pipeline/analysis/${id}/ledger.yaml`;
}

export function legacyAnalysisLedgerPath(milestoneId) {
  const id = String(milestoneId || "analysis").trim() || "analysis";
  return `.pipeline/analysis/${id}-analysis-ledger.yaml`;
}

export function resolveAnalysisLedgerPath(input = {}, options = {}) {
  const milestoneId = options.milestoneId || options.milestone_id || input.milestone_id || "analysis";
  return options.ledgerPath || options.ledger_path || input.ledger_path || analysisLedgerPath(milestoneId);
}

export function validateAnalysisLedger(ledger = {}) {
  const errors = [];
  for (const field of ANALYSIS_LEDGER_REQUIRED_FIELDS) {
    if (!(field in ledger)) errors.push(`missing required field: ${field}`);
  }

  const snapshot = ledger.environment_snapshot || {};
  for (const field of ANALYSIS_ENVIRONMENT_SNAPSHOT_REQUIRED_FIELDS) {
    if (!(field in snapshot)) errors.push(`missing environment_snapshot field: ${field}`);
  }

  for (const field of ["hypotheses", "experiments", "observations"]) {
    if (!Array.isArray(ledger[field])) {
      errors.push(`${field} must be an array`);
    }
  }
  for (const field of [
    "next_actions",
    "code_change_refs",
    "threats_to_validity",
    "ruled_out_alternatives",
  ]) {
    if (!Array.isArray(ledger[field])) {
      errors.push(`${field} must be an array`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function buildAnalysisStateSummary(ledger = {}, options = {}) {
  const milestoneId = options.milestoneId || options.milestone_id || ledger.milestone_id || null;
  return {
    milestone_id: milestoneId,
    question: ledger.question || null,
    ledger_path: resolveAnalysisLedgerPath(ledger, options),
    hypothesis_counts: countStatuses(ledger.hypotheses, HYPOTHESIS_STATUSES),
    experiment_counts: countStatuses(ledger.experiments, EXPERIMENT_STATUSES),
    conclusion: ledger.conclusion || null,
    confidence: ledger.confidence || null,
    updated_at: options.updatedAt || options.updated_at || null,
  };
}

export function normalizeAnalysisExperimentResult(experiment = {}, options = {}) {
  const status = normalizeExperimentStatus(experiment.status || options.status);
  const boundaryDecision = normalizeBoundaryValue(experiment.boundary_decision || options.boundary_decision, "allow");
  return {
    id: experiment.id || options.id || null,
    hypothesis_refs: normalizeStringArray(experiment.hypothesis_refs || experiment.hypothesisRefs),
    action: normalizeExperimentAction(experiment.action || options.action),
    status,
    command: experiment.command || null,
    inputs: experiment.inputs || {},
    output_summary: experiment.output_summary || experiment.outputSummary || "",
    artifacts: normalizeStringArray(experiment.artifacts || experiment.artifact_refs),
    evidence_refs: normalizeStringArray(experiment.evidence_refs || experiment.evidenceRefs || experiment.observation_refs),
    metrics: normalizeExperimentMetrics(experiment.metrics),
    boundary_decision: boundaryDecision,
    blocked_reason: status === "blocked" ? experiment.blocked_reason || options.blocked_reason || "" : null,
    code_change_refs: normalizeStringArray(experiment.code_change_refs || experiment.codeChangeRefs),
  };
}

export function determineAnalysisOutcome(ledger = {}) {
  if ((ledger.experiments || []).some((experiment) => experiment.status === "blocked")) return "blocked";
  if (ledger.outcome && ANALYSIS_OUTCOMES.includes(ledger.outcome)) return ledger.outcome;
  const statuses = new Set((ledger.hypotheses || []).map((item) => String(item.status || "pending").toLowerCase()));
  if (statuses.has("confirmed")) return statuses.has("partial") || statuses.has("pending") ? "partial" : "confirmed";
  if (statuses.has("partial")) return "partial";
  if (statuses.size === 1 && statuses.has("disproved")) return "disproved";
  return "inconclusive";
}

export function buildAnalysisFollowupProposal(input = {}) {
  return {
    workflow_kind: "build",
    source_analysis: input.source_analysis || input.sourceAnalysis || null,
    title: input.title || "Build follow-up from analysis",
    problem: input.problem || input.question || "",
    recommended_change: input.recommended_change || input.recommendedChange || "",
    validation_plan: normalizeStringArray(input.validation_plan || input.validationPlan),
    evidence_refs: normalizeStringArray(input.evidence_refs || input.evidenceRefs),
    mode_required: input.mode_required || input.modeRequired || "hybrid",
  };
}

export function evaluateAnalysisEvidence(ledger = {}, options = {}) {
  const hasCodeChanges = Boolean(
    options.hasCodeChanges ??
      (ledger.experiments || []).some((item) => item.action === "modify_code" || item.code_change_refs?.length),
  );
  const experimentExecuted = (ledger.experiments || []).some((item) => item.status === "completed");
  const checks = {
    question_addressed: Boolean(ledger.question && ledger.conclusion),
    evidence_complete: validateAnalysisLedger(ledger).ok,
    conclusion_traceable: Boolean(ledger.conclusion && (ledger.observations || []).length),
    experiment_executed: experimentExecuted,
    change_validated: hasCodeChanges
      ? experimentExecuted && (ledger.experiments || []).some((item) => item.code_change_refs?.length || item.metrics)
      : "n/a",
    followup_recorded: Boolean((ledger.next_actions || []).length || ledger.followup_proposal),
  };
  const failed = Object.entries(checks)
    .filter(([, value]) => value === false)
    .map(([key]) => key);
  return {
    preset: "analysis",
    criteria: ANALYSIS_EVALUATION_CRITERIA.map((criterion) => ({
      id: criterion,
      status: checks[criterion] === "n/a" ? "not_applicable" : checks[criterion] ? "pass" : "fail",
    })),
    failed_checks: failed,
    diff_score: Math.min(1 + failed.length, 5),
    outcome: determineAnalysisOutcome(ledger),
  };
}

export function buildAnalysisReportContract(ledger = {}, options = {}) {
  const milestoneId = options.milestoneId || options.milestone_id || ledger.milestone_id || "analysis";
  const ledgerPath = resolveAnalysisLedgerPath(ledger, { ...options, milestoneId });
  return {
    preset: "analysis",
    report_type: "analysis",
    milestone_id: milestoneId,
    ledger_path: ledgerPath,
    report_file: options.reportFile || options.report_file || null,
    question: ledger.question || null,
    conclusion: ledger.conclusion || null,
    confidence: ledger.confidence || null,
    outcome: determineAnalysisOutcome(ledger),
    metrics: ledger.metrics || {},
    evidence_refs: [
      ledgerPath,
      ...normalizeStringArray(ledger.evidence_refs || ledger.evidenceRefs),
      ...normalizeStringArray((ledger.experiments || []).flatMap((experiment) => experiment.evidence_refs || [])),
    ].filter(Boolean),
    evaluation: evaluateAnalysisEvidence(ledger, options),
  };
}

export function renderAnalysisPromptPlan(feature = {}) {
  const normalizedKind = feature.analysis_kind || feature.analysisKind || "root_cause";
  return [
    `workflow_kind: analysis`,
    `analysis_kind: ${normalizedKind}`,
    "",
    "Steps:",
    "- define_question",
    "- gather_context",
    "- hypothesize",
    "- experiment",
    "- interpret",
    "- conclude",
    "",
    "Evidence:",
    "- maintain `.pipeline/analysis/<cycle-or-milestone>/ledger.yaml`",
    "- preserve `.pipeline/analysis/<milestone-id>-analysis-ledger.yaml` only when resuming legacy state that already points there",
    "- keep `state.yaml` limited to `prompt_state.analysis_summary`",
  ].join("\n");
}

function normalizeInteractionMode(value) {
  const normalized = String(value || "hybrid").trim().toLowerCase();
  return INTERACTION_MODES.has(normalized) ? normalized : "hybrid";
}

function countStatuses(items, statuses) {
  const counts = { total: Array.isArray(items) ? items.length : 0 };
  for (const status of statuses) counts[status] = 0;
  for (const item of Array.isArray(items) ? items : []) {
    const status = String(item?.status || "pending").trim().toLowerCase();
    if (status in counts) counts[status] += 1;
  }
  return counts;
}

function normalizeExperimentStatus(value) {
  const normalized = String(value || "pending").trim().toLowerCase();
  return EXPERIMENT_STATUSES.includes(normalized) ? normalized : "pending";
}

function normalizeExperimentAction(value) {
  const normalized = String(value || "read_source").trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (["run_command", "run_script", "run_test", "run_benchmark", "read_log", "read_config", "read_source", "collect_metric", "instrument", "modify_code"].includes(normalized)) {
    return normalized;
  }
  return "read_source";
}

function normalizeExperimentMetrics(metrics = {}) {
  return {
    before: metrics.before ?? "n/a",
    after: metrics.after ?? "n/a",
    delta: metrics.delta ?? "n/a",
  };
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  return value ? [String(value)] : [];
}

function resolveBoundary(value, mode, fallback) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return normalizeBoundaryValue(value[mode] || value.hybrid || fallback, fallback);
  }
  return normalizeBoundaryValue(value, fallback);
}

function normalizeBoundaryValue(value, fallback) {
  const normalized = String(value || fallback).trim().toLowerCase();
  return BOUNDARY_VALUES.has(normalized) ? normalized : fallback;
}

function mergeObjects(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : override;
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] = key in merged ? mergeObjects(merged[key], value) : value;
  }
  return merged;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
