import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_GLOBAL_CONFIG,
  buildProgressiveDiscoverPlan,
  resolveP0ConfigurePolicy,
} from "../src/index.js";

test("default config exposes P0 Configure as a cycle-scoped setup gate", () => {
  assert.equal(DEFAULT_GLOBAL_CONFIG.cycle.configure.stage, "P0 Configure");
  assert.equal(DEFAULT_GLOBAL_CONFIG.cycle.configure.trigger, "cycle_new_before_discover");
  assert.equal(DEFAULT_GLOBAL_CONFIG.cycle.configure.allow_reuse, true);
  assert.deepEqual(DEFAULT_GLOBAL_CONFIG.cycle.configure.inheritance_order, [
    "cycle_explicit",
    "previous_cycle_snapshot",
    "project_config",
    "global_config",
    "built_in_default",
  ]);
  assert.deepEqual(DEFAULT_GLOBAL_CONFIG.cycle.configure.questions, [
    "automation_level",
    "subagent_authorization",
    "acceptance_mode",
    "pr_remote_write_policy",
    "full_regression",
    "analysis_boundaries",
    "worker_separation",
  ]);
});

test("P0 Configure policy resolves inheritance sources and records reused decisions", () => {
  const policy = resolveP0ConfigurePolicy({
    previous_cycle_snapshot: {
      automation_level: "full",
      worker_separation: "strict",
      pr_remote_write_policy: "single_confirmation",
    },
    project_config: {
      automation_level: "manual",
      acceptance_mode: "manual",
    },
    global_config: {
      full_regression: true,
    },
  }, {
    reuse: true,
    now: "2026-05-08T23:59:00+08:00",
  });

  assert.equal(policy.stage, "P0 Configure");
  assert.equal(policy.decisions.automation_level.value, "full");
  assert.equal(policy.decisions.automation_level.source, "previous_cycle_snapshot");
  assert.equal(policy.decisions.acceptance_mode.value, "manual");
  assert.equal(policy.decisions.acceptance_mode.source, "project_config");
  assert.equal(policy.decisions.full_regression.value, true);
  assert.equal(policy.decisions.full_regression.source, "global_config");
  assert.equal(policy.audit.reused, true);
  assert.equal(policy.audit.created_at, "2026-05-08T23:59:00+08:00");
});

test("Progressive Discover plan includes P0 Configure before Discover questions", () => {
  const plan = buildProgressiveDiscoverPlan({
    mode: "single",
    intent: "plan cycle setup and workflow lifecycle",
  }, { minRounds: 5 });

  assert.equal(plan.pre_discover_stage.id, "p0_configure");
  assert.equal(plan.pre_discover_stage.label, "P0 Configure");
  assert.ok(plan.pre_discover_stage.questions.includes("subagent_authorization"));
  assert.ok(plan.required_outputs.includes(".plan-state/p0-configure.yaml"));
});

test("Guide, Init, Plan, and config docs describe P0 Configure coverage", async () => {
  const files = [
    "skills/guide/SKILL.md",
    "skills/init/SKILL.md",
    "skills/plan/SKILL.md",
    "skills/plan-discover/SKILL.md",
    "references/config-spec.md",
    "references/progressive-discover-spec.md",
  ];
  const combined = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");

  assert.match(combined, /P0 Configure/);
  assert.match(combined, /cycle new.*Discover/is);
  assert.match(combined, /automation.*Subagent.*acceptance.*PR\/MR remote write.*full regression.*analysis.*worker separation/is);
  assert.match(combined, /cycle_explicit.*previous_cycle_snapshot.*project_config.*global_config.*built_in_default/is);
  assert.match(combined, /沿用|reuse/i);
});
