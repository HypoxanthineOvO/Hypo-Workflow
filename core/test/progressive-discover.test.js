import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildProgressiveDiscoverPlan,
  DEFAULT_GLOBAL_CONFIG,
  loadConfig,
  loadRulesSummary,
  normalizeDiscoverFeature,
  renderBatchPlanArtifacts,
} from "../src/index.js";

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
    "@karpathy/guidelines",
    "not default enabled",
  ]) {
    assert.match(spec, new RegExp(escapeRegExp(phrase), "i"));
  }

  assert.match(planSkill, /Progressive Discover/i);
  assert.match(planSkill, /真实测试方法|real test method/i);
  assert.match(planSkill, /off.*recommended.*strict/is);
  assert.match(planSkill, /implement\/test\/audit|三权分立/i);
  assert.match(planSkill, /Codex.*authorizes execution subworkers|Codex.*authorize.*\/hw:start.*\/hw:resume/is);
  assert.match(planSkill, /even when.*execution\.worker_separation\.mode.*already.*recommended.*strict/is);
  assert.match(planSkill, /P1 must not enter P2.*authorization gate.*unresolved/is);
  assert.match(planSkill, /Claude Code.*subcodex.*subclaude/is);
  assert.match(planSkill, /OpenCode.*no extra authorization gate/is);
  assert.match(planSkill, /For Codex only.*missing authorization.*`recommended`/is);
  assert.match(planSkill, /explicitly confirm.*fastest single-agent/is);
  assert.match(discoverSkill, /Big Questions First/i);
  assert.match(discoverSkill, /伪测试|pseudo/i);
  assert.match(discoverSkill, /worker separation|三权分立/i);
  assert.match(discoverSkill, /start-blocking gate/i);
  assert.match(discoverSkill, /P1 must not enter P2.*Codex execution subworker authorization gate is unresolved/is);
  assert.match(discoverSkill, /Claude Code.*do not ask for subworker authorization/is);
  assert.match(discoverSkill, /explicit user-confirmed fast\/off single-agent mode|explicitly confirm switching to the fastest single-agent/is);
  assert.match(discoverSkill, /do not silently downgrade to `off`/i);
  assert.match(extendSkill, /lightweight Progressive Discover/i);
  assert.match(planReference, /task category.*desired effect.*verification method/is);
  assert.match(planReference, /real test contract|真实测试方法/i);
  assert.match(planReference, /Codex.*explicit user-confirmed fastest single-agent/is);
  assert.match(planReference, /before leaving Discover on Codex.*even when `execution\.worker_separation\.mode` already exists/is);
  assert.match(planReference, /without one explicit outcome, P1 must not enter P2/i);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
