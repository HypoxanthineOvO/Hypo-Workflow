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

export function buildProgressiveDiscoverPlan(input = {}, options = {}) {
  const mode = input.mode || "single";
  const risk = evaluateDiscoverGrillMeRisk(input);
  const coverage = mode === "extend" || risk.mode === "light_discover" ? "lightweight" : "full";
  const stages = coverage === "lightweight" ? LIGHTWEIGHT_STAGES : FULL_STAGES;
  const minRounds = options.minRounds ?? (coverage === "lightweight" ? 1 : 3);
  const requiredOutputs = [".pipeline/design-spec.md", ".plan-state/discover.yaml"];

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
    min_rounds: minRounds,
    big_questions: DISCOVER_BIG_QUESTIONS.map((item) => ({ ...item })),
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
  };
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
      evidence: normalizeEvidence(verification.evidence || verification.outputs || []),
    };
  }

  return {
    method:
      feature.verification_method ||
      feature.acceptance_boundary ||
      feature.acceptance ||
      "",
    evidence: normalizeEvidence(feature.verification_evidence || []),
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
