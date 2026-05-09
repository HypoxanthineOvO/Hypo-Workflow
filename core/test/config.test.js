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

const DONE = Object.freeze({
  requested: "requested",
  started: "started",
  status: "completed",
  closed: "closed",
});

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
commands:
  - "/hw:start"
  - "/hw:resume"
`);

  assert.equal(parsed.agent.platform, "opencode");
  assert.equal(parsed.output.language, "zh-CN");
  assert.deepEqual(parsed.items, ["one", "two"]);
  assert.deepEqual(parsed.commands, ["/hw:start", "/hw:resume"]);
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
        backend: {
          claude_code: "subclaude",
        },
        authorization: {
          status: "authorized",
          scope: ["/hw:start", "/hw:resume"],
          granted_by: "user",
          fallback_when_declined: "block_start_resume",
          downgrade_requires_confirmation: true,
        },
      },
    },
  });

  assert.equal(policy.mode, "strict");
  assert.equal(policy.providers.test, "claude");
  assert.equal(policy.backend.claude_code, "subclaude");
  assert.equal(policy.authorization.status, "authorized");
  assert.deepEqual(policy.authorization.scope, ["/hw:start", "/hw:resume"]);
  assert.equal(policy.authorization.fallback_when_declined, "block_start_resume");
  assert.ok(policy.degradation.options.includes("switch_provider_and_retry"));

  const degraded = assessWorkerSeparationStatus(policy, {
    workers: [
      { role: "implement", worker_id: "w1", lifecycle: DONE },
      { role: "test", worker_id: "w1", lifecycle: DONE },
    ],
  });
  assert.equal(degraded.degraded, true);
  assert.ok(degraded.collisions.includes("implement_test_shared_worker"));
  assert.equal(degraded.can_proceed, false);
  assert.equal(degraded.acceptance_blocked, true);
});

test("config schema documents worker separation authorization and backend fields", async () => {
  const schema = await readFile("config.schema.yaml", "utf8");

  assert.match(schema, /worker_separation_policy:/);
  assert.match(schema, /authorization:/);
  assert.match(schema, /blocked_until_authorized/);
  assert.match(schema, /downgraded_off/);
  assert.match(schema, /backend:/);
  assert.match(schema, /block_start_resume/);
});

test("recommended mode blocks implement-test degradation unless subworker capability is explicitly unavailable", () => {
  const policy = resolveWorkerSeparationPolicy({
    execution: {
      worker_separation: {
        mode: "recommended",
        authorization: {
          status: "authorized",
          scope: ["/hw:start", "/hw:resume"],
        },
      },
    },
  });

  const blocked = assessWorkerSeparationStatus(policy, {
    workers: [
      { role: "implement", worker_id: "self" },
      { role: "test", worker_id: "self", lifecycle: DONE },
      { role: "audit", worker_id: "audit-1", lifecycle: DONE },
    ],
  });
  assert.equal(blocked.can_proceed, false);
  assert.equal(blocked.acceptance_blocked, true);

  const stillBlocked = assessWorkerSeparationStatus(policy, {
    workers: [
      { role: "implement", worker_id: "self", lifecycle: DONE },
      { role: "test", worker_id: "self", lifecycle: DONE },
      { role: "audit", worker_id: "audit-1", lifecycle: DONE },
    ],
    role_availability: {
      implement: { status: "unavailable", reason: "tool_unavailable" },
      test: { status: "unavailable", reason: "tool_unavailable" },
    },
  });
  assert.equal(stillBlocked.can_proceed, false);
  assert.equal(stillBlocked.acceptance_blocked, true);

  const off = assessWorkerSeparationStatus({
    mode: "off",
  }, {
    workers: [
      { role: "implement", worker_id: "self", lifecycle: DONE },
      { role: "test", worker_id: "self", lifecycle: DONE },
      { role: "audit", worker_id: "audit-1", lifecycle: DONE },
    ],
    role_availability: {
      implement: { status: "unavailable", reason: "tool_unavailable" },
      test: { status: "unavailable", reason: "tool_unavailable" },
    },
  });
  assert.equal(off.can_proceed, true);
  assert.equal(off.acceptance_blocked, false);
});

test("recommended mode requires explicit audit evidence before audit degradation", () => {
  const policy = resolveWorkerSeparationPolicy({
    execution: {
      worker_separation: {
        mode: "recommended",
        authorization: {
          status: "authorized",
          scope: ["/hw:start", "/hw:resume"],
        },
      },
    },
  });

  const blocked = assessWorkerSeparationStatus(policy, {
    workers: [
      { role: "implement", worker_id: "impl-1", lifecycle: DONE },
      { role: "test", worker_id: "test-1", lifecycle: DONE },
    ],
  });
  assert.equal(blocked.can_proceed, false);
  assert.equal(blocked.acceptance_blocked, true);

  const allowed = assessWorkerSeparationStatus(policy, {
    workers: [
      { role: "implement", worker_id: "impl-1", lifecycle: DONE },
      { role: "test", worker_id: "test-1", lifecycle: DONE },
    ],
    role_availability: {
      audit: { status: "unavailable", reason: "command_unavailable" },
    },
  });
  assert.equal(allowed.can_proceed, true);
  assert.equal(allowed.acceptance_blocked, false);
});

test("Codex worker authorization unknown or missing start resume scope blocks separated workers", () => {
  const workers = [
    { role: "implement", worker_id: "impl-1", lifecycle: DONE },
    { role: "test", worker_id: "test-1", lifecycle: DONE },
    { role: "audit", worker_id: "audit-1", lifecycle: DONE },
  ];

  const unknown = assessWorkerSeparationStatus({
    mode: "recommended",
    platform: "codex",
    authorization: { status: "unknown" },
  }, { workers });
  assert.equal(unknown.can_proceed, false);
  assert.equal(unknown.acceptance_blocked, true);
  assert.deepEqual(unknown.authorization_blocked, ["worker_authorization_unknown"]);

  const missingScope = assessWorkerSeparationStatus({
    mode: "strict",
    platform: "codex",
    authorization: { status: "authorized", scope: ["/hw:start"] },
  }, { workers });
  assert.equal(missingScope.can_proceed, false);
  assert.equal(missingScope.acceptance_blocked, true);
  assert.deepEqual(missingScope.authorization_blocked, ["worker_authorization_missing_start_resume_scope"]);
});

test("OpenCode and Claude do not require Codex-only worker authorization gate", () => {
  const workers = [
    { role: "implement", worker_id: "impl-1", lifecycle: DONE },
    { role: "test", worker_id: "test-1", lifecycle: DONE },
    { role: "audit", worker_id: "audit-1", lifecycle: DONE },
  ];

  for (const platform of ["opencode", "claude_code", "claude"]) {
    const status = assessWorkerSeparationStatus({
      mode: "recommended",
      platform,
      authorization: { status: "unknown" },
    }, { workers });
    assert.equal(status.can_proceed, true);
    assert.equal(status.acceptance_blocked, false);
    assert.deepEqual(status.authorization_blocked, []);
  }
});
