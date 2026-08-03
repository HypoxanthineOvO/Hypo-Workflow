import {
  normalizeAnalysisKind,
  normalizeWorkflowKind,
} from "../lifecycle/index.js";
import { evaluateDiscoverGrillMeRisk } from "../guide/index.js";

export const DISCOVER_BIG_QUESTIONS = Object.freeze([
  {
    id: "task_category",
    label: "task category",
    prompt: "先判断这次任务属于哪一类，例如 webapp、agent-service、research 或 other。",
  },
  {
    id: "desired_effect",
    label: "desired effect",
    prompt: "再确认希望达到什么效果，最好用用户可见或结果可验证的方式描述。",
  },
  {
    id: "verification_method",
    label: "verification method",
    prompt: "最后先问怎么验证成功，避免还没定义验收就开始拆 Milestone。",
  },
]);

export const PLAN_PHASE_MODEL = deepFreeze([
  {
    id: "discover",
    label: "Discover",
    order: 1,
    interaction: "conversation",
    scope: "requirements_only",
    required_outputs: ["stage_summary", "decision_table", "open_questions"],
  },
  {
    id: "technical_stack",
    label: "Technical Stack",
    order: 2,
    interaction: "conversation",
    scope: "implementation_substrate",
    required_outputs: ["stage_summary", "decision_table", "open_questions"],
  },
  {
    id: "architecture",
    label: "Architecture",
    order: 3,
    interaction: "conversation",
    scope: "architecture_and_integration_points",
    required_outputs: ["stage_summary", "decision_table", "open_questions"],
  },
  {
    id: "decompose",
    label: "Decompose",
    order: 4,
    interaction: "conversation",
    scope: "milestone_splitting",
    required_outputs: ["stage_summary", "decision_table", "open_questions"],
  },
  {
    id: "generate",
    label: "Generate",
    order: 5,
    interaction: "conversation",
    scope: "prompt_and_runtime_artifacts",
    required_outputs: ["stage_summary", "decision_table", "open_questions"],
  },
  {
    id: "implementation",
    label: "Implementation",
    order: 6,
    interaction: "execution",
    scope: "run_approved_milestones",
    required_outputs: [],
  },
]);

export const P0_CONFIGURE_STAGE = Object.freeze({
  id: "p0_configure",
  label: "P0 Configure",
  trigger: "cycle_new_before_discover",
  guidance: "在 Discover 前确认自动化程度、Subagent 授权、验收模式、PR/MR 远端写确认策略、完整回归、analysis 边界和 worker separation；用户可以沿用上次配置。",
  questions: [
    "automation_level",
    "subagent_authorization",
    "acceptance_mode",
    "pr_remote_write_policy",
    "full_regression",
    "analysis_boundaries",
    "worker_separation",
  ],
});

export const PLAN_AUDIT_FIELDS = Object.freeze([
  "audit_target",
  "risk_hypotheses",
  "test_scenarios",
  "evidence_required",
  "independent_validator",
  "manual_checks",
  "known_limits",
]);

export const EXAMPLE_ABSTRACTION_STEPS = Object.freeze([
  "identify_example",
  "generalize_requirement",
  "confirm_scope",
]);

const FULL_STAGES = Object.freeze([
  {
    id: "assumption_statement",
    label: "assumption statement",
    guidance: "先声明当前假设，给用户一个改正或补充的入口。",
  },
  {
    id: "ambiguity_resolution",
    label: "ambiguity resolution",
    guidance: "把仍不确定的点逐条摊开，不要悄悄自己补完。",
  },
  {
    id: "tradeoff_review",
    label: "tradeoff review",
    guidance: "列出 1-3 条实现路径和权衡，让用户选择方向。",
  },
  {
    id: "validation_criteria",
    label: "validation criteria",
    guidance: "把需求收束成可验证目标、边界条件和验收方式。",
  },
  {
    id: "worker_separation_policy",
    label: "worker separation policy",
    guidance: "确认是否启用 implement/test/audit 三权分立，以及降级和验收边界。",
  },
]);

const LIGHTWEIGHT_STAGES = Object.freeze([
  FULL_STAGES[0],
  FULL_STAGES[3],
]);

export function buildProgressiveDiscoverPlan(input = {}) {
  const mode = input.mode || "single";
  const risk = evaluateDiscoverGrillMeRisk(input);
  const coverage = mode === "extend" || risk.mode === "light_discover" ? "lightweight" : "full";
  const stages = coverage === "lightweight" ? LIGHTWEIGHT_STAGES : FULL_STAGES;
  const requiredOutputs = [".plan-state/p0-configure.yaml", ".pipeline/design-spec.md", ".plan-state/discover.yaml"];

  if (mode === "batch") {
    requiredOutputs.push(".plan-state/batch-discover.yaml");
  }
  if (risk.requires_design_concept_alignment) {
    requiredOutputs.push(".pipeline/design-concepts.yaml", ".pipeline/glossary.md");
  }

  return {
    mode,
    coverage,
    grill_me: risk,
    phase_model: PLAN_PHASE_MODEL.map((phase) => ({ ...phase, required_outputs: [...phase.required_outputs] })),
    discussion_guidance: "Use semantic judgment to expose assumptions and material questions. Always show Discover, Technical, and Architecture artifacts; do not create one confirmation gate per artifact or use a question-round quota.",
    pre_discover_stage: { ...P0_CONFIGURE_STAGE, questions: [...P0_CONFIGURE_STAGE.questions] },
    big_questions: DISCOVER_BIG_QUESTIONS.map((item) => ({ ...item })),
    audit_questions: buildPlanAuditQuestions(input),
    required_audit_fields: [...PLAN_AUDIT_FIELDS],
    example_abstraction: {
      required: true,
      steps: [...EXAMPLE_ABSTRACTION_STEPS],
      guidance: "用户给出“比如/例如/举个例子”时，先识别为 example，再提炼泛化需求，并反问确认覆盖范围。",
    },
    stages: stages.map((item) => ({ ...item })),
    required_outputs: requiredOutputs,
    notes: coverage === "lightweight"
      ? [
          "Plan Extend reuses the big questions first contract.",
          "It does not force the full four-stage interview when the scope is clearly incremental.",
        ]
      : [
          "Keep the structure strong enough to prevent shallow planning, but still allow the agent to merge related questions.",
          "Batch mode should carry category and verification requirements for each Feature candidate.",
        ],
  };
}

export function buildPlanAuditQuestions(input = {}) {
  const target = input.audit_target || input.title || input.intent || "本次计划";
  return [
    `这次要审计的对象是什么？请确认 audit_target 是否是：${target}`,
    "最担心哪些失败方式或回归？请列出 risk_hypotheses。",
    "用哪些真实场景或命令验证成功？请说明 test_scenarios、evidence_required 和 independent_validator。",
  ];
}

export function extractExampleAbstraction(text = "") {
  const raw = String(text || "").trim();
  const hasExample = /比如|例如|举个例子|for example|e\.g\./i.test(raw);
  const generalized = raw
    .replace(/比如|例如|举个例子|for example|e\.g\./gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    has_example: hasExample,
    steps: [...EXAMPLE_ABSTRACTION_STEPS],
    generalized_requirement: hasExample ? generalized : raw,
    confirmation_question: hasExample
      ? `我理解这个例子表达的是更泛化的需求：“${generalized}”。是否要按这个覆盖范围规划，而不是只处理例子本身？`
      : "",
  };
}

export function normalizeDiscoverFeature(feature = {}) {
  const verification = normalizeVerification(feature.verification, feature);
  const workflowKind = normalizeWorkflowKind(
    feature.workflow_kind || feature.workflowKind || feature.workflow || workflowKindFromAnalysisKind(feature),
    feature,
  );
  return {
    ...feature,
    category: normalizeCategory(feature.category || feature.type || feature.profile),
    workflow_kind: workflowKind,
    analysis_kind: normalizeAnalysisKind(feature.analysis_kind || feature.analysisKind || feature.investigation_kind, workflowKind),
    desired_effect:
      feature.desired_effect ||
      feature.desiredEffect ||
      feature.user_visible_goal ||
      feature.goal ||
      "",
    verification,
    audit_fields: normalizeAuditFields(feature.audit_fields || feature.auditFields || feature.verification?.audit_fields || {}),
  };
}

function normalizeAuditFields(value = {}) {
  const result = {};
  for (const field of PLAN_AUDIT_FIELDS) {
    const raw = value[field];
    result[field] = Array.isArray(raw)
      ? raw.map((item) => String(item)).filter(Boolean)
      : raw == null ? "" : String(raw);
  }
  return result;
}

function workflowKindFromAnalysisKind(feature = {}) {
  return feature.analysis_kind || feature.analysisKind || feature.investigation_kind ? "analysis" : null;
}

function normalizeCategory(value) {
  const normalized = String(value || "other").trim().toLowerCase();
  if (["webapp", "agent", "agent-service", "service", "research", "other"].includes(normalized)) {
    if (normalized === "agent" || normalized === "service") {
      return "agent-service";
    }
    return normalized;
  }
  return "other";
}

function normalizeVerification(verification, feature) {
  if (verification && typeof verification === "object" && !Array.isArray(verification)) {
    return {
      method: verification.method || verification.type || "",
      scenario: verification.scenario || verification.procedure || verification.test_scenario || verification.testScenario || "",
      pass_signal: verification.pass_signal || verification.passSignal || verification.expected_signal || verification.expectedSignal || "",
      independent_validator:
        verification.independent_validator ||
        verification.independentValidator ||
        verification.validator ||
        "",
      evidence: normalizeEvidence(verification.evidence || verification.outputs || []),
      audit_policy: normalizeAuditPolicy(verification.audit_policy || verification.auditPolicy || {}),
    };
  }

  return {
    method:
      feature.verification_method ||
      feature.acceptance_boundary ||
      feature.acceptance ||
      "",
    scenario: feature.verification_scenario || feature.test_scenario || feature.real_test_scenario || "",
    pass_signal: feature.pass_signal || feature.expected_signal || feature.observable_pass_signal || "",
    independent_validator: feature.independent_validator || feature.validator || "",
    evidence: normalizeEvidence(feature.verification_evidence || []),
    audit_policy: normalizeAuditPolicy(feature.audit_policy || feature.auditPolicy || {}),
  };
}

function normalizeAuditPolicy(value = {}) {
  return {
    reject_pseudo_tests: value.reject_pseudo_tests !== false,
  };
}

function normalizeEvidence(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return [String(value)];
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return Object.freeze(value);
}
