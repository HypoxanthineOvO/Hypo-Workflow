export const TEST_PROFILE_DEFINITIONS = Object.freeze({
  webapp: {
    id: "webapp",
    discover: [
      "确认页面或交互对象是什么。",
      "确认希望达到的可视效果和关键用户动作。",
      "确认用哪条 E2E 路径和截图/可视证据验证。",
    ],
    runtime: [
      "must_run_e2e",
      "must_interact_with_browser",
      "must_capture_visual_evidence",
      "forbid_unit_only_pass",
    ],
    report_fields: ["profile", "e2e_tool", "scenario", "screenshots", "result"],
  },
  "agent-service": {
    id: "agent-service",
    discover: [
      "确认 agent-friendly CLI 长什么样。",
      "确认 CLI 与人类界面共用哪套核心接口。",
      "确认要跑的 CLI 场景和成功判据。",
    ],
    runtime: [
      "must_plan_cli_surface",
      "must_share_core_interface",
      "must_execute_cli_scenario",
      "forbid_split_core_logic",
    ],
    report_fields: ["profile", "cli_entry", "scenario", "shared_core", "result"],
  },
  research: {
    id: "research",
    discover: [
      "确认 baseline 指标是什么。",
      "确认预期变化方向是什么。",
      "确认实际执行脚本、数据、随机种子或环境约束。",
    ],
    runtime: [
      "must_define_baseline",
      "must_define_expected_direction",
      "must_execute_validation_script",
      "must_record_before_after_delta",
      "forbid_diff_only_acceptance",
    ],
    report_fields: ["profile", "baseline", "after", "delta", "direction", "script", "result"],
  },
});

const WORKFLOW_OR_PRESET_NAMES = Object.freeze([
  "analysis",
  "build",
  "showcase",
  "tdd",
  "implement-only",
  "custom",
  "root-cause",
  "root_cause",
  "repo-system",
  "repo_system",
  "metric",
]);

export function inferTestProfileFromCategory(category) {
  const normalized = String(category || "").trim().toLowerCase();
  if (normalized === "webapp") return "webapp";
  if (["agent", "service", "agent-service"].includes(normalized)) return "agent-service";
  if (normalized === "research") return "research";
  return null;
}

export function normalizeTestProfileSelection(input = {}) {
  const preset = input.preset || input.steps?.preset || "tdd";
  const explicit = [
    ...toList(input.profiles),
    ...toList(input.test_profiles),
    ...toList(input.testProfiles),
    ...toList(input.execution?.test_profiles?.profiles),
    ...toList(input.execution?.test_profiles?.profile),
  ];
  const inferred = inferTestProfileFromCategory(input.category);
  const normalized = explicit.map(normalizeProfileName).filter(Boolean);
  const profiles = dedupe(
    normalized
      .filter((profile) => TEST_PROFILE_DEFINITIONS[profile])
      .concat(inferred ? [inferred] : []),
  );
  const ignored = dedupe(normalized.filter((profile) => !TEST_PROFILE_DEFINITIONS[profile]));

  return {
    preset,
    profiles,
    compose: profiles.length ? `${profiles.join("+")}+${preset}` : preset,
    legacy_compatible: profiles.length === 0,
    ignored,
  };
}

export function buildTestProfileContract(input = {}) {
  const selection = normalizeTestProfileSelection(input);
  const definitions = selection.profiles
    .map((name) => TEST_PROFILE_DEFINITIONS[name])
    .filter(Boolean);
  return {
    preset: selection.preset,
    profiles: selection.profiles,
    compose: selection.compose,
    legacy_compatible: selection.legacy_compatible,
    discover_prompts: flatten(definitions.map((definition) => definition.discover)),
    runtime_requirements: flatten(definitions.map((definition) => definition.runtime)),
    report_fields: dedupe(flatten(definitions.map((definition) => definition.report_fields))),
  };
}

export function assessTestProfileEvidence(input = {}, evidence = {}) {
  const selection = normalizeTestProfileSelection(input);
  const results = selection.profiles.map((profile) => evaluateProfile(profile, evidence));
  const contract = evaluateRealTestContract(input.verification || input.real_test_contract || input.realTestContract, evidence);
  const missing = dedupe(flatten(results.map((item) => item.missing)).concat(contract.missing));
  const violations = dedupe(flatten(results.map((item) => item.violations)).concat(contract.violations));
  return {
    preset: selection.preset,
    profiles: selection.profiles,
    status: missing.length || violations.length ? "block" : "pass",
    missing,
    violations,
    profile_results: results,
    real_test_contract: contract.contract,
    summary: summarizeEvidenceStatus(selection, results, missing, violations),
  };
}

function evaluateProfile(profile, evidence) {
  if (profile === "webapp") {
    const missing = [];
    const violations = [];
    if (!truthy(evidence.e2e_run)) missing.push("e2e_run");
    if (!truthy(evidence.browser_interaction)) missing.push("browser_interaction");
    if (!truthy(evidence.screenshot) && !truthy(evidence.visual_evidence)) missing.push("visual_evidence");
    if (truthy(evidence.unit_only)) violations.push("unit_only_pass");
    return { profile, missing, violations };
  }

  if (profile === "agent-service") {
    const missing = [];
    const violations = [];
    if (!truthy(evidence.cli_planned)) missing.push("cli_planned");
    if (!truthy(evidence.shared_core_interface)) missing.push("shared_core_interface");
    if (!truthy(evidence.cli_run)) missing.push("cli_run");
    if (truthy(evidence.split_core_logic)) violations.push("split_core_logic");
    return { profile, missing, violations };
  }

  if (profile === "research") {
    const missing = [];
    const violations = [];
    if (!hasValue(evidence.baseline_metric)) missing.push("baseline_metric");
    if (!hasValue(evidence.expected_direction)) missing.push("expected_direction");
    if (!hasValue(evidence.validation_script)) missing.push("validation_script");
    if (!truthy(evidence.script_executed)) missing.push("script_executed");
    const before = toNumber(evidence.before_metric);
    const after = toNumber(evidence.after_metric);
    const delta = hasValue(evidence.delta) ? toNumber(evidence.delta) : computeDelta(before, after);
    if (before === null) missing.push("before_metric");
    if (after === null) missing.push("after_metric");
    if (delta === null) missing.push("delta");
    if (truthy(evidence.diff_only)) violations.push("diff_only_acceptance");
    return {
      profile,
      missing,
      violations,
      baseline: before,
      after,
      delta,
    };
  }

  return { profile, missing: [], violations: [] };
}

function evaluateRealTestContract(verification = {}, evidence = {}) {
  const contract = normalizeRealTestContract(verification);
  if (!contract.method && !contract.scenario && !contract.pass_signal) {
    return { contract, missing: [], violations: [] };
  }

  const missing = [];
  const violations = [];
  const actualMethod = String(evidence.actual_method || evidence.method || "").trim();

  if (!truthy(evidence.scenario_executed) && !truthy(evidence.real_scenario_executed)) {
    missing.push("scenario_executed");
  }
  if (contract.method && !actualMethod) {
    missing.push("actual_method");
  }
  if (contract.pass_signal && !hasValue(evidence.observable_pass_signal)) {
    missing.push("observable_pass_signal");
  }
  if (contract.audit_policy.reject_pseudo_tests && truthy(evidence.pseudo_test)) {
    violations.push("pseudo_test");
  }
  if (contract.method && actualMethod && normalizeComparable(actualMethod) !== normalizeComparable(contract.method)) {
    violations.push("real_test_method_mismatch");
  }

  return { contract, missing, violations };
}

function normalizeRealTestContract(verification = {}) {
  return {
    method: String(verification.method || verification.type || "").trim(),
    scenario: String(verification.scenario || verification.procedure || "").trim(),
    pass_signal: String(verification.pass_signal || verification.passSignal || "").trim(),
    audit_policy: {
      reject_pseudo_tests: verification.audit_policy?.reject_pseudo_tests !== false,
    },
  };
}

function normalizeComparable(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function summarizeEvidenceStatus(selection, results, missing, violations) {
  if (!selection.profiles.length) {
    return "No explicit test profile; keep legacy preset-only validation behavior.";
  }
  if (!missing.length && !violations.length) {
    return `Profiles ${selection.profiles.join(", ")} satisfied with preset ${selection.preset}.`;
  }
  const parts = [];
  if (missing.length) parts.push(`missing ${missing.join(", ")}`);
  if (violations.length) parts.push(`violations ${violations.join(", ")}`);
  return `Profiles ${selection.profiles.join(", ")} blocked: ${parts.join("; ")}.`;
}

function normalizeProfileName(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  if (!normalized) return null;
  if (normalized === "agent" || normalized === "service") return "agent-service";
  if (WORKFLOW_OR_PRESET_NAMES.includes(normalized)) return normalized;
  return normalized;
}

function toList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .split(/[,+]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupe(list) {
  return [...new Set(list)];
}

function flatten(list) {
  return list.flatMap((item) => item || []);
}

function truthy(value) {
  return value === true || value === "true" || value === 1;
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function computeDelta(before, after) {
  if (before === null || after === null) return null;
  return Number((after - before).toFixed(6));
}
