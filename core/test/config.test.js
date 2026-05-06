import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  assessWorkerSeparationStatus,
  DEFAULT_GLOBAL_CONFIG,
  loadConfig,
  normalizeAutomationPolicy,
  parseYaml,
  resolveWorkerSeparationPolicy,
  writeConfig,
} from "../src/config/index.js";

test("parseYaml reads nested objects and arrays", () => {
  const parsed = parseYaml(`
agent:
  platform: opencode
  model: qwen
output:
  language: zh-CN
items:
  - one
  - two
`);

  assert.equal(parsed.agent.platform, "opencode");
  assert.equal(parsed.output.language, "zh-CN");
  assert.deepEqual(parsed.items, ["one", "two"]);
});

test("loadConfig merges defaults and writeConfig persists yaml", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-core-"));
  const file = join(dir, "config.yaml");
  await writeConfig(file, {
    agent: { platform: "opencode", model: "kimi" },
    output: { language: "zh-CN", timezone: "Asia/Shanghai" },
  });

  const loaded = await loadConfig(file);
  const raw = await readFile(file, "utf8");

  assert.equal(loaded.agent.platform, "opencode");
  assert.equal(loaded.execution.default_mode, "self");
  assert.equal(loaded.output.timezone, "Asia/Shanghai");
  assert.equal(loaded.release.readme.mode, "loose");
  assert.equal(loaded.release.readme.full_regen, "auto");
  assert.match(raw, /platform: opencode/);
});

test("default config exposes OpenCode model matrix defaults", () => {
  assert.equal(DEFAULT_GLOBAL_CONFIG.opencode.auto_continue, true);
  assert.equal(DEFAULT_GLOBAL_CONFIG.opencode.profile, "standard");
  assert.equal(DEFAULT_GLOBAL_CONFIG.opencode.compaction.effective_context_target, 900000);
  assert.equal(DEFAULT_GLOBAL_CONFIG.opencode.agents.plan.model, "gpt-5.5");
  assert.equal(DEFAULT_GLOBAL_CONFIG.opencode.agents.compact.model, "deepseek-v4-flash");
  assert.equal(DEFAULT_GLOBAL_CONFIG.opencode.agents.test.model, "deepseek-v4-pro");
  assert.equal(DEFAULT_GLOBAL_CONFIG.opencode.agents["code-a"].model, "mimo-v2.5-pro");
  assert.equal(DEFAULT_GLOBAL_CONFIG.opencode.agents["code-b"].model, "deepseek-v4-pro");
  assert.equal(DEFAULT_GLOBAL_CONFIG.opencode.agents.debug.model, "gpt-5.5");
  assert.equal(DEFAULT_GLOBAL_CONFIG.opencode.agents.docs.model, "deepseek-v4-pro");
  assert.equal(DEFAULT_GLOBAL_CONFIG.opencode.agents.report.model, "deepseek-v4-flash");
});

test("loadConfig accepts project overrides for OpenCode model matrix", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-core-opencode-matrix-"));
  const file = join(dir, "config.yaml");
  await writeConfig(file, {
    opencode: {
      compaction: {
        effective_context_target: 750000,
      },
      agents: {
        plan: { model: "custom-plan" },
        compact: { model: "custom-flash" },
        test: { model: "custom-test" },
      },
    },
  });

  const loaded = await loadConfig(file);
  assert.equal(loaded.opencode.compaction.effective_context_target, 750000);
  assert.equal(loaded.opencode.agents.plan.model, "custom-plan");
  assert.equal(loaded.opencode.agents.compact.model, "custom-flash");
  assert.equal(loaded.opencode.agents.test.model, "custom-test");
  assert.equal(loaded.opencode.agents["code-a"].model, "mimo-v2.5-pro");
});

test("default config exposes automation policy levels and safe gates", () => {
  assert.equal(DEFAULT_GLOBAL_CONFIG.automation.level, "balanced");
  assert.deepEqual(
    Object.keys(DEFAULT_GLOBAL_CONFIG.automation.levels),
    ["manual", "balanced", "full"],
  );
  assert.equal(DEFAULT_GLOBAL_CONFIG.automation.levels.manual.label, "稳妥模式");
  assert.equal(DEFAULT_GLOBAL_CONFIG.automation.levels.balanced.label, "自动模式");
  assert.equal(DEFAULT_GLOBAL_CONFIG.automation.levels.full.label, "全自动模式");
  assert.equal(DEFAULT_GLOBAL_CONFIG.automation.gates.planning, "confirm");
  assert.equal(DEFAULT_GLOBAL_CONFIG.automation.gates.destructive_external, "confirm");
  assert.equal(DEFAULT_GLOBAL_CONFIG.automation.gates.execution, "auto");
  assert.equal(DEFAULT_GLOBAL_CONFIG.execution.worker_separation.mode, "recommended");
});

test("normalizeAutomationPolicy preserves planning gates under full automation", () => {
  const policy = normalizeAutomationPolicy({
    level: "full",
    gates: {
      planning: "auto",
      execution: "auto",
      destructive_external: "auto",
      release_publish: "auto",
    },
  });

  assert.equal(policy.level, "full");
  assert.equal(policy.gates.planning, "confirm");
  assert.equal(policy.gates.destructive_external, "confirm");
  assert.equal(policy.gates.release_publish, "confirm");
  assert.equal(policy.gates.execution, "auto");
});

test("normalizeAutomationPolicy rejects invalid automation levels", () => {
  assert.throws(
    () => normalizeAutomationPolicy({ level: "reckless" }),
    /Unsupported automation level/,
  );
});

test("worker separation policy resolves project-local modes and degraded coverage", () => {
  const policy = resolveWorkerSeparationPolicy({
    execution: {
      worker_separation: {
        mode: "strict",
        providers: {
          implement: "codex",
          test: "claude",
          audit: "codex",
        },
      },
    },
  });

  assert.equal(policy.mode, "strict");
  assert.equal(policy.providers.test, "claude");
  assert.ok(policy.degradation.options.includes("switch_provider_and_retry"));

  const degraded = assessWorkerSeparationStatus(policy, {
    workers: [
      { role: "implement", worker_id: "w1" },
      { role: "test", worker_id: "w1" },
    ],
  });
  assert.equal(degraded.degraded, true);
  assert.ok(degraded.collisions.includes("implement_test_shared_worker"));
  assert.equal(degraded.can_proceed, false);
  assert.equal(degraded.acceptance_blocked, true);
});
