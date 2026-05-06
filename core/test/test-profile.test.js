import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assessTestProfileEvidence,
  buildTestProfileContract,
  DEFAULT_GLOBAL_CONFIG,
  inferTestProfileFromCategory,
  normalizeTestProfileSelection,
  renderBatchPlanArtifacts,
} from "../src/index.js";

test("test profile spec defines compose model and three scenario contracts", async () => {
  const spec = await readFile("references/test-profile-spec.md", "utf8");
  const configSpec = await readFile("references/config-spec.md", "utf8");
  const evaluationSpec = await readFile("references/evaluation-spec.md", "utf8");
  const planSkill = await readFile("skills/plan/SKILL.md", "utf8");
  const discoverSkill = await readFile("skills/plan-discover/SKILL.md", "utf8");

  for (const heading of [
    "# Test Profile Spec",
    "## Compose Model",
    "## Config Surface",
    "## Plan Guidance",
    "## WebApp Profile",
    "## Agent-Service Profile",
    "## Research Profile",
  ]) {
    assert.match(spec, new RegExp(`^${escapeRegExp(heading)}$`, "m"));
  }

  for (const phrase of [
    "Profile is a superset of preset",
    "webapp + tdd",
    "agent-service",
    "research",
    "baseline",
    "validation script",
    "CLI",
    "E2E",
    "closed-loop validation plan",
    "independent validation",
    "open-loop plans",
  ]) {
    assert.match(spec, new RegExp(escapeRegExp(phrase), "i"));
  }

  assert.match(configSpec, /execution\.test_profiles/);
  assert.match(evaluationSpec, /Test Profile Evidence/i);
  assert.match(planSkill, /test profile/i);
  assert.match(discoverSkill, /research/i);
});

test("test profile selection composes with preset and preserves legacy preset-only behavior", () => {
  const legacy = normalizeTestProfileSelection({ preset: "tdd" });
  assert.equal(legacy.compose, "tdd");
  assert.equal(legacy.legacy_compatible, true);
  assert.deepEqual(legacy.profiles, []);

  const composed = normalizeTestProfileSelection({
    preset: "tdd",
    profiles: ["webapp"],
  });
  assert.equal(composed.compose, "webapp+tdd");
  assert.equal(composed.legacy_compatible, false);

  assert.equal(inferTestProfileFromCategory("service"), "agent-service");
  assert.equal(inferTestProfileFromCategory("research"), "research");

  const inferred = normalizeTestProfileSelection({
    preset: "implement-only",
    category: "webapp",
  });
  assert.deepEqual(inferred.profiles, ["webapp"]);
});

test("workflow and preset names never become Test Profiles", () => {
  const selection = normalizeTestProfileSelection({
    workflow_kind: "analysis",
    analysis_kind: "repo_system",
    preset: "analysis",
    profiles: ["analysis", "webapp", "tdd", "showcase", "research"],
    test_profiles: "implement-only,agent-service",
  });

  assert.equal(selection.preset, "analysis");
  assert.deepEqual(selection.profiles, ["webapp", "research", "agent-service"]);
  assert.equal(selection.compose, "webapp+research+agent-service+analysis");
  assert.deepEqual(selection.ignored, ["analysis", "tdd", "showcase", "implement-only"]);
});

test("analysis workflow planning artifacts do not emit analysis as a Test Profile", () => {
  const artifacts = renderBatchPlanArtifacts(
    {
      cycle_id: "C12",
      features: [
        {
          id: "F900",
          title: "Investigate regression",
          workflow_kind: "analysis",
          analysis_kind: "root_cause",
          preset: "analysis",
          profiles: ["analysis", "research"],
          verification: { method: "analysis ledger" },
        },
      ],
    },
    { decompose_mode: "upfront" },
  );

  const feature = artifacts.queue.features[0];
  assert.equal(feature.workflow_kind, "analysis");
  assert.equal(feature.analysis_kind, "root_cause");
  assert.deepEqual(feature.test_profiles, ["research"]);
  assert.doesNotMatch(artifacts.markdown, /analysis\+analysis/);
});

test("test profile contract merges discover and runtime requirements", () => {
  const contract = buildTestProfileContract({
    preset: "tdd",
    profiles: ["webapp", "research"],
  });

  assert.equal(contract.compose, "webapp+research+tdd");
  assert.match(contract.discover_prompts.join("\n"), /baseline/i);
  assert.match(contract.discover_prompts.join("\n"), /可视效果/);
  assert.ok(contract.runtime_requirements.includes("must_run_e2e"));
  assert.ok(contract.runtime_requirements.includes("must_record_before_after_delta"));
});

test("webapp profile blocks unit-only evidence and requires browser validation", () => {
  const blocked = assessTestProfileEvidence(
    { preset: "tdd", profiles: ["webapp"] },
    { unit_only: true, e2e_run: false },
  );
  assert.equal(blocked.status, "block");
  assert.ok(blocked.missing.includes("e2e_run"));
  assert.ok(blocked.violations.includes("unit_only_pass"));

  const passed = assessTestProfileEvidence(
    { preset: "tdd", profiles: ["webapp"] },
    {
      e2e_run: true,
      browser_interaction: true,
      screenshot: true,
    },
  );
  assert.equal(passed.status, "pass");
});

test("agent-service profile requires CLI planning, shared core, and real CLI run", () => {
  const blocked = assessTestProfileEvidence(
    { preset: "implement-only", profiles: ["agent-service"] },
    { cli_planned: true, cli_run: false, shared_core_interface: false },
  );
  assert.equal(blocked.status, "block");
  assert.ok(blocked.missing.includes("shared_core_interface"));
  assert.ok(blocked.missing.includes("cli_run"));

  const passed = assessTestProfileEvidence(
    { preset: "implement-only", profiles: ["agent-service"] },
    { cli_planned: true, cli_run: true, shared_core_interface: true },
  );
  assert.equal(passed.status, "pass");
});

test("research profile requires baseline, script execution, and before-after delta", () => {
  const blocked = assessTestProfileEvidence(
    { preset: "implement-only", profiles: ["research"] },
    {
      baseline_metric: "accuracy",
      expected_direction: "up",
      validation_script: "python eval.py",
      script_executed: false,
      diff_only: true,
    },
  );
  assert.equal(blocked.status, "block");
  assert.ok(blocked.missing.includes("script_executed"));
  assert.ok(blocked.missing.includes("before_metric"));
  assert.ok(blocked.violations.includes("diff_only_acceptance"));

  const passed = assessTestProfileEvidence(
    { preset: "implement-only", profiles: ["research"] },
    {
      baseline_metric: "accuracy",
      expected_direction: "up",
      validation_script: "python eval.py",
      script_executed: true,
      before_metric: 0.81,
      after_metric: 0.86,
    },
  );
  assert.equal(passed.status, "pass");
  assert.equal(passed.profile_results[0].delta, 0.05);
});

test("batch plan artifacts keep profile summaries alongside category and verification", () => {
  const artifacts = renderBatchPlanArtifacts(
    {
      cycle_id: "C9",
      features: [
        {
          id: "F201",
          title: "Browser dashboard",
          category: "webapp",
          desired_effect: "Inspect status visually",
          verification: { method: "Playwright E2E" },
        },
      ],
    },
    { decompose_mode: "upfront" },
  );

  assert.deepEqual(artifacts.queue.features[0].test_profiles, ["webapp"]);
  assert.match(artifacts.markdown, /Profiles/);
  assert.match(artifacts.markdown, /webapp/);
});

test("default config exposes test profile controls near execution settings", () => {
  assert.equal(DEFAULT_GLOBAL_CONFIG.execution.test_profiles.enabled, true);
  assert.equal(DEFAULT_GLOBAL_CONFIG.execution.test_profiles.selection, "auto");
  assert.equal(DEFAULT_GLOBAL_CONFIG.execution.test_profiles.compose, true);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
