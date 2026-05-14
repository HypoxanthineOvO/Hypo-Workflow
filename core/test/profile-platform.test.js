import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  configurationProfile,
  listConfigurationProfiles,
  capabilityFor,
  normalizeProfile,
  selectProfile,
} from "../src/index.js";

test("normalizeProfile applies known presets", () => {
  assert.equal(normalizeProfile("standard").auto_continue, true);
  assert.equal(normalizeProfile("strict").auto_continue, false);
  assert.equal(normalizeProfile({ name: "automation", permissions: "allow-safe" }).permissions, "allow-safe");
});

test("selectProfile reads config profile", () => {
  const profile = selectProfile({ opencode: { profile: "strict" } });
  assert.equal(profile.name, "strict");
  assert.equal(profile.file_guard, "strict");
});

test("configuration profiles preserve high-risk confirmation gates", () => {
  const profiles = listConfigurationProfiles();
  assert.deepEqual(profiles.map((profile) => profile.key), [
    "solo-auto",
    "manual-review",
    "team-strict",
    "analysis-hybrid",
  ]);

  for (const profile of profiles) {
    assert.equal(profile.config.automation.gates.destructive_external, "confirm", profile.key);
    assert.equal(profile.config.automation.gates.release_publish, "confirm", profile.key);
    assert.equal(profile.cycle_gates.pr_remote_write, "confirm", profile.key);
    assert.equal(profile.cycle_gates.plugin_install, "confirm", profile.key);
    assert.equal(profile.cycle_gates.user_level_config, "confirm", profile.key);
  }

  assert.equal(configurationProfile("solo-auto").config.automation.level, "full");
  assert.equal(configurationProfile("solo-auto").config.execution.bash.mode, "allow_local");
  assert.equal(configurationProfile("solo-auto").config.execution.bash.confirm_external, true);
  assert.equal(configurationProfile("manual-review").config.plan.mode, "interactive");
  assert.equal(configurationProfile("team-strict").config.execution.worker_separation.mode, "strict");
  assert.equal(configurationProfile("team-strict").config.execution.step_overrides.review_code.strict, true);
  assert.equal(configurationProfile("analysis-hybrid").config.default_workflow_kind, "analysis");
  assert.equal(configurationProfile("analysis-hybrid").config.execution.analysis.interaction_mode, "hybrid");
  assert.equal(configurationProfile("analysis-hybrid").config.execution.analysis.boundaries.code_changes.hybrid, "confirm");
});

test("configuration profile docs cover purpose and yaml snippets", () => {
  const profile = configurationProfile("manual-review");
  assert.match(profile.description, /手动|确认/);
  assert.match(profile.yaml, /automation:/);
  assert.match(profile.yaml, /destructive_external: confirm/);
  assert.throws(() => configurationProfile("reckless"), /Unknown configuration profile/);
});

test("configuration governance docs list default profile choices", async () => {
  const content = await readFile("docs/reference/configuration.md", "utf8");
  for (const key of ["solo-auto", "manual-review", "team-strict", "analysis-hybrid"]) {
    assert.match(content, new RegExp(key));
  }
  assert.match(content, /PR\/MR remote write/);
  assert.match(content, /destructive_external: confirm/);
});

test("capabilityFor exposes OpenCode native primitives", () => {
  const capabilities = capabilityFor("opencode");
  assert.equal(capabilities.commands, "native-slash");
  assert.equal(capabilities.ask, "question-tool");
  assert.equal(capabilities.plan, "todowrite");
  assert.equal(capabilities.recovery, "lease-heartbeat-plugin-events");
  assert.match(capabilities.handoff_boundaries, /permissions/);
});

test("capabilityFor exposes third-party IDE adapter targets", () => {
  assert.equal(capabilityFor("cursor").rules, ".cursor/rules/hypo-workflow.mdc");
  assert.equal(capabilityFor("copilot").rules, ".github/copilot-instructions.md");
  assert.equal(capabilityFor("trae").rules, ".trae/rules/project_rules.md");
});

test("capabilityFor keeps Codex subagents inside Codex runtime assumptions", () => {
  const capabilities = capabilityFor("codex");
  assert.equal(capabilities.subagents, "codex-gpt-runtime");
  assert.equal(capabilities.model_routing, "host-gpt-runtime");
  assert.match(capabilities.delegation_policy, /testing\/review/);
  assert.doesNotMatch(JSON.stringify(capabilities), /deepseek|mimo|claude/i);
});
