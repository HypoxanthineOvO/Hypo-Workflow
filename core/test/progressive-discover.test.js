import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildProgressiveDiscoverPlan,
  DEFAULT_GLOBAL_CONFIG,
  extractExampleAbstraction,
  loadConfig,
  loadRulesSummary,
  normalizeDiscoverFeature,
  renderBatchPlanArtifacts,
} from "../src/index.js";
import * as coreApi from "../src/index.js";

test("progressive discover spec defines big questions, stages, and command coverage", async () => {
  const spec = await readFile("references/progressive-discover-spec.md", "utf8");
  const planSkill = await readFile("skills/plan/SKILL.md", "utf8");
  const discoverSkill = await readFile("skills/plan-discover/SKILL.md", "utf8");
  const extendSkill = await readFile("skills/plan-extend/SKILL.md", "utf8");
  const planReference = await readFile("plan/PLAN-SKILL.md", "utf8");
  const commandsSpec = await readFile("references/commands-spec.md", "utf8");

  for (const heading of [
    "# Progressive Discover Spec",
    "## Big Questions First",
    "## Progressive Stages",
    "## Batch Discover",
    "## Plan Extend Coverage",
    "## Karpathy Guidelines Rule Pack",
  ]) {
    assert.match(spec, new RegExp(`^${escapeRegExp(heading)}$`, "m"));
  }

  for (const phrase of [
    "task category",
    "desired effect",
    "verification method",
    "真实测试方法",
    "assumption statement",
    "ambiguity resolution",
    "tradeoff review",
    "validation criteria",
    "audit_target",
    "risk_hypotheses",
    "test_scenarios",
    "evidence_required",
    "independent_validator",
    "manual_checks",
    "known_limits",
    "generalize the underlying requirement",
    "@karpathy/guidelines",
    "not default enabled",
  ]) {
    assert.match(spec, new RegExp(escapeRegExp(phrase), "i"));
  }

  assert.match(planSkill, /Progressive Discover/i);
  assert.match(planSkill, /真实测试方法|real test method/i);
  assert.match(planSkill, /off.*recommended.*strict/is);
  assert.match(planSkill, /`test`, `implement`, and `audit` use distinct identities when required/i);
  assert.match(planSkill, /Approval creates `waiting_to_start`; it does not execute/i);
  assert.match(planSkill, /Start only after the user explicitly says to begin/i);
  assert.match(planSkill, /does not enforce `min_rounds`/i);
  assert.match(discoverSkill, /Big Questions First|先问关键问题/i);
  assert.match(discoverSkill, /伪测试|pseudo/i);
  assert.match(discoverSkill, /worker separation|三权分立/i);
  assert.match(discoverSkill, /start-blocking gate/i);
  assert.match(discoverSkill, /Discover must not enter Decompose.*Codex execution subworker authorization gate is unresolved|Codex.*授权门控未解决.*Discover 不得进入 Decompose|Codex.*授权门控未解决.*Discover 不得进入 Decompose/is);
  assert.match(discoverSkill, /Claude Code.*do not ask for subworker authorization|Claude Code.*不要询问子工作器授权/is);
  assert.match(discoverSkill, /explicit user-confirmed fast\/off single-agent mode|explicitly confirm switching to the fastest single-agent|用户显式确认.*快速.*单代理|显式确认切换到最快的单代理/is);
  assert.match(discoverSkill, /do not silently downgrade to `off`|不要静默降级为 `off`/i);
  assert.match(extendSkill, /lightweight Progressive Discover|轻量级 Progressive Discover/i);
  assert.match(planReference, /task category.*desired effect.*verification method/is);
  assert.match(planReference, /real test contract|真实测试方法/i);
  assert.match(planReference, /Codex.*explicit user-confirmed fastest single-agent/is);
  assert.match(planReference, /before leaving Discover on Codex.*even when `execution\.worker_separation\.mode` already exists/is);
  assert.match(planReference, /without one explicit outcome, Discover must not enter Decompose/i);
  assert.match(planReference, /Claude Code.*subcodex.*subclaude/is);
  assert.match(commandsSpec, /task category.*desired effect.*verification method/is);
});

test("buildProgressiveDiscoverPlan starts broad and keeps low-risk work lightweight", () => {
  const full = buildProgressiveDiscoverPlan({
    mode: "batch",
    intent: "redesign workflow source of truth",
  }, { minRounds: 5 });

  assert.equal(full.coverage, "full");
  assert.equal(full.grill_me.mode, "deep_grill_me");
  assert.equal(full.min_rounds, 5);
  assert.deepEqual(
    full.big_questions.map((question) => question.id),
    ["task_category", "desired_effect", "verification_method"],
  );
  assert.deepEqual(full.required_audit_fields, [
    "audit_target",
    "risk_hypotheses",
    "test_scenarios",
    "evidence_required",
    "independent_validator",
    "manual_checks",
    "known_limits",
  ]);
  assert.equal(full.example_abstraction.required, true);
  assert.match(full.audit_questions.join("\n"), /risk_hypotheses/);
  assert.deepEqual(
    full.stages.map((stage) => stage.id),
    ["assumption_statement", "ambiguity_resolution", "tradeoff_review", "validation_criteria", "worker_separation_policy"],
  );
  assert.ok(full.required_outputs.includes(".plan-state/batch-discover.yaml"));
  assert.ok(full.required_outputs.includes(".pipeline/design-concepts.yaml"));
  assert.ok(full.required_outputs.includes(".pipeline/glossary.md"));

  const extend = buildProgressiveDiscoverPlan({ mode: "extend" });
  assert.equal(extend.coverage, "lightweight");
  assert.equal(extend.stages.length, 2);
  assert.match(extend.notes.join("\n"), /does not force the full four-stage interview/i);

  const ordinary = buildProgressiveDiscoverPlan({ mode: "single", intent: "small copy fix" });
  assert.equal(ordinary.coverage, "lightweight");
  assert.equal(ordinary.grill_me.requires_design_concept_alignment, false);
});

test("discover abstracts examples before treating them as scope", () => {
  const result = extractExampleAbstraction("比如他调研链接只给文件路径，不解释内容");

  assert.equal(result.has_example, true);
  assert.deepEqual(result.steps, ["identify_example", "generalize_requirement", "confirm_scope"]);
  assert.match(result.generalized_requirement, /调研链接只给文件路径/);
  assert.match(result.confirmation_question, /是否要按这个覆盖范围规划/);
});

test("batch feature artifacts carry category, desired effect, and verification requirements", () => {
  const feature = normalizeDiscoverFeature({
    id: "F101",
    title: "Evaluation dashboard",
    category: "webapp",
    desired_effect: "Users can inspect run quality without a command.",
    verification: {
      method: "Playwright E2E",
      evidence: ["browser click flow", "screenshot"],
    },
  });

  assert.equal(feature.category, "webapp");
  assert.equal(feature.desired_effect, "Users can inspect run quality without a command.");
  assert.equal(feature.verification.method, "Playwright E2E");
  assert.deepEqual(feature.verification.evidence, ["browser click flow", "screenshot"]);

  const artifacts = renderBatchPlanArtifacts(
    {
      cycle_id: "C9",
      features: [feature],
    },
    { decompose_mode: "upfront" },
  );

  assert.equal(artifacts.queue.features[0].category, "webapp");
  assert.equal(artifacts.queue.features[0].verification.method, "Playwright E2E");
  assert.match(artifacts.markdown, /Category/);
  assert.match(artifacts.markdown, /Verification/);
});

test("discover carries real test contract into batch artifacts for audit", () => {
  const feature = normalizeDiscoverFeature({
    id: "F202",
    title: "Heaticy agent message flow",
    category: "agent-service",
    desired_effect: "Agent responds correctly to a real account message.",
    verification: {
      method: "NapCat real QQ message",
      scenario: "Use NapCat to simulate the main account sending a message to the agent.",
      pass_signal: "Agent replies with the expected action and persisted state change.",
      evidence: ["NapCat transcript", "agent log", "state diff"],
      independent_validator: "test worker",
      audit_policy: { reject_pseudo_tests: true },
    },
  });

  assert.equal(feature.verification.method, "NapCat real QQ message");
  assert.match(feature.verification.scenario, /main account/);
  assert.match(feature.verification.pass_signal, /persisted state change/);
  assert.equal(feature.verification.independent_validator, "test worker");
  assert.equal(feature.verification.audit_policy.reject_pseudo_tests, true);
  assert.deepEqual(Object.keys(feature.audit_fields), [
    "audit_target",
    "risk_hypotheses",
    "test_scenarios",
    "evidence_required",
    "independent_validator",
    "manual_checks",
    "known_limits",
  ]);

  const artifacts = renderBatchPlanArtifacts(
    {
      cycle_id: "C9",
      features: [feature],
    },
    { decompose_mode: "upfront" },
  );

  assert.match(artifacts.markdown, /NapCat real QQ message/);
  assert.match(artifacts.markdown, /reject pseudo tests/i);
  assert.equal(artifacts.queue.features[0].verification.method, "NapCat real QQ message");
  assert.equal(artifacts.queue.features[0].verification.audit_policy.reject_pseudo_tests, true);
});

test("@karpathy/guidelines is an optional rule pack and not enabled by default", async () => {
  const defaultSummary = await loadRulesSummary(".", ".");
  assert.match(defaultSummary, /karpathy-think-before-coding\tguideline\toff/);
  assert.match(defaultSummary, /karpathy-goal-driven-execution\tguideline\toff/);

  const dir = await mkdtemp(join(tmpdir(), "hw-karpathy-rules-"));
  await writeFile(
    join(dir, ".pipeline-rules.yaml"),
    [
      "extends:",
      "  - recommended",
      "  - @karpathy/guidelines",
      "",
      "rules: {}",
      "",
    ].join("\n"),
  );

  const summary = await loadRulesSummary(".", ".", { rulesFile: join(dir, ".pipeline-rules.yaml") });
  assert.match(summary, /Pack: @karpathy\/guidelines/);
  assert.match(summary, /karpathy-think-before-coding\tguideline\twarn/);
  assert.match(summary, /karpathy-simplicity-first\tguideline\twarn/);
  assert.match(summary, /karpathy-surgical-changes\tguideline\twarn/);
  assert.match(summary, /karpathy-goal-driven-execution\tguideline\twarn/);
});

test("config defaults expose progressive discover controls", async () => {
  assert.equal(DEFAULT_GLOBAL_CONFIG.plan.discover.progressive, true);
  assert.equal(DEFAULT_GLOBAL_CONFIG.plan.discover.big_questions_first, true);
  assert.equal(DEFAULT_GLOBAL_CONFIG.plan.discover.plan_extend_mode, "lightweight");

  const projectConfig = await loadConfig(".pipeline/config.yaml");
  assert.equal(projectConfig.plan.discover.progressive, true);
  assert.equal(projectConfig.plan.discover.big_questions_first, true);
});

test("core exports deterministic Plan Phase Model constants", () => {
  assert.ok(coreApi.PLAN_PHASE_MODEL, "PLAN_PHASE_MODEL must be exported from core");
  assert.deepEqual(
    coreApi.PLAN_PHASE_MODEL.map((phase) => ({
      id: phase.id,
      label: phase.label,
      order: phase.order,
    })),
    [
      { id: "discover", label: "Discover", order: 1 },
      { id: "technical_stack", label: "Technical Stack", order: 2 },
      { id: "architecture", label: "Architecture", order: 3 },
      { id: "decompose", label: "Decompose", order: 4 },
      { id: "generate", label: "Generate", order: 5 },
      { id: "implementation", label: "Implementation", order: 6 },
    ],
  );
  assert.deepEqual(
    coreApi.PLAN_PHASE_MODEL.map((phase) => phase.gate),
    [
      "question_tool",
      "question_tool",
      "question_tool",
      "question_tool",
      "question_tool",
      "execution",
    ],
  );
  assert.ok(Object.isFrozen(coreApi.PLAN_PHASE_MODEL), "phase model must be immutable");
});

test("Discover completion gate requires scope, effect, and acceptance clarity instead of min_rounds only", () => {
  assert.equal(
    typeof coreApi.assessDiscoverCompletionGate,
    "function",
    "assessDiscoverCompletionGate must be exported",
  );

  const shallow = coreApi.assessDiscoverCompletionGate({
    rounds_completed: 5,
    min_rounds: 3,
    scope_clarity: "missing",
    effect_clarity: "clear",
    acceptance_clarity: "clear",
  });

  assert.equal(shallow.complete, false);
  assert.equal(shallow.rounds_satisfied, true);
  assert.deepEqual(shallow.missing_signals, ["scope_clarity"]);
  assert.match(shallow.reason, /scope.*effect.*acceptance/i);

  const complete = coreApi.assessDiscoverCompletionGate({
    rounds_completed: 1,
    min_rounds: 3,
    scope_clarity: "clear",
    effect_clarity: "clear",
    acceptance_clarity: "clear",
  });

  assert.equal(complete.complete, true);
  assert.equal(complete.rounds_satisfied, false);
  assert.deepEqual(complete.required_signals, [
    "scope_clarity",
    "effect_clarity",
    "acceptance_clarity",
  ]);
});

test("visible phase output contract blocks Question Tool gate until summary, decisions, and questions are rendered", () => {
  assert.equal(
    typeof coreApi.validateVisiblePhaseGate,
    "function",
    "validateVisiblePhaseGate must be exported",
  );

  const blocked = coreApi.validateVisiblePhaseGate({
    phase_id: "architecture",
    before_gate: true,
    stage_summary: "Architecture narrows integration to the existing core helpers.",
    decision_table: [],
    open_questions: [],
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.gate, "question_tool");
  assert.deepEqual(blocked.missing_outputs, ["decision_table", "open_questions"]);
  assert.match(blocked.message, /before.*Question Tool|before.*Ask/i);

  const ready = coreApi.validateVisiblePhaseGate({
    phase_id: "architecture",
    before_gate: true,
    stage_summary: "Architecture narrows integration to the existing core helpers.",
    decision_table: [
      {
        decision: "Expose core helpers",
        rationale: "Skills and adapters need deterministic contracts.",
        status: "proposed",
      },
    ],
    open_questions: [
      {
        id: "q1",
        question: "Confirm whether adapters consume the same helper outputs.",
      },
    ],
  });

  assert.equal(ready.ok, true);
  assert.deepEqual(ready.required_outputs, [
    "stage_summary",
    "decision_table",
    "open_questions",
  ]);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
