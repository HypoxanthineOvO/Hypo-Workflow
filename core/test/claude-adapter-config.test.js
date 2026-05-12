import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import {
  DEFAULT_GLOBAL_CONFIG,
  buildModelPoolClaudeAgents,
  capabilityFor,
  loadConfig,
  normalizeClaudeCodeProfile,
  writeConfig,
} from "../src/index.js";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("default config exposes Claude Code adapter profile and role models", () => {
  assert.equal(DEFAULT_GLOBAL_CONFIG.claude_code.profile, "standard");
  assert.equal(DEFAULT_GLOBAL_CONFIG.claude_code.model, "deepseek-v4-pro");
  assert.equal(DEFAULT_GLOBAL_CONFIG.claude_code.settings.local_file, ".claude/settings.local.json");
  assert.equal(DEFAULT_GLOBAL_CONFIG.claude_code.settings.backup, true);
  assert.equal(DEFAULT_GLOBAL_CONFIG.claude_code.hooks.compact.inject_resume_context, true);
  assert.equal(DEFAULT_GLOBAL_CONFIG.claude_code.hooks.stop.block_on_missing_progress, true);
  assert.equal(DEFAULT_GLOBAL_CONFIG.claude_code.status.surface, "auto");
  assert.equal(DEFAULT_GLOBAL_CONFIG.claude_code.agents.docs.model, "deepseek-v4-pro");
  assert.equal(DEFAULT_GLOBAL_CONFIG.claude_code.agents.code.model, "mimo-v2.5-pro");
  assert.equal(DEFAULT_GLOBAL_CONFIG.claude_code.agents.test.model, "mimo-v2.5-pro");
  assert.equal(DEFAULT_GLOBAL_CONFIG.claude_code.agents.report.model, "deepseek-v4-flash");
  assert.equal(DEFAULT_GLOBAL_CONFIG.claude_code.agents.compact.model, "deepseek-v4-flash");
});

test("Claude Code profiles normalize developer standard and strict safety", () => {
  const developer = normalizeClaudeCodeProfile("developer");
  assert.equal(developer.name, "developer");
  assert.equal(developer.permissions, "allow");
  assert.equal(developer.destructive_actions, "allow");
  assert.equal(developer.auto_continue, true);

  const standard = normalizeClaudeCodeProfile("standard");
  assert.equal(standard.name, "standard");
  assert.equal(standard.permissions, "ask");
  assert.equal(standard.destructive_actions, "confirm");
  assert.equal(standard.auto_continue, true);

  const strict = normalizeClaudeCodeProfile("strict");
  assert.equal(strict.name, "strict");
  assert.equal(strict.permissions, "ask");
  assert.equal(strict.destructive_actions, "confirm");
  assert.equal(strict.auto_continue, false);
});

test("model pool maps roles to Claude Code agents without OpenCode coupling", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-claude-model-pool-"));
  const file = join(dir, "config.yaml");
  await writeConfig(file, {
    model_pool: {
      roles: {
        plan: { primary: "plan-model", fallback: ["plan-fallback"] },
        implement: { primary: "impl-model", fallback: ["impl-fallback"] },
        review: { primary: "review-model", fallback: ["review-fallback"] },
        evaluate: { primary: "eval-model", fallback: ["eval-fallback"] },
        chat: { primary: "chat-model", fallback: ["chat-fallback"] },
      },
    },
    claude_code: {
      agents: {
        docs: { model: "explicit-docs" },
      },
    },
  });

  const loaded = await loadConfig(file);
  const agents = buildModelPoolClaudeAgents(loaded);

  assert.equal(agents.plan.model, "plan-model");
  assert.equal(agents.code.model, "impl-model");
  assert.equal(agents.test.model, "impl-model");
  assert.equal(agents.docs.model, "explicit-docs");
  assert.equal(agents.review.model, "review-model");
  assert.equal(agents.report.model, "eval-model");
  assert.equal(agents.compact.model, "eval-model");
});

test("Claude Code platform capability exposes plugin skills hooks settings and model routing", () => {
  const capabilities = capabilityFor("claude-code");
  assert.equal(capabilities.commands, "plugin-slash+skills");
  assert.equal(capabilities.events, "hooks");
  assert.equal(capabilities.permissions, "claude-settings");
  assert.equal(capabilities.model_routing, "claude-agents-from-model-pool");
  assert.equal(capabilities.settings_merge, "managed-settings-local-json");
  assert.match(capabilities.recovery, /hooks/);
});

test("schema and docs mention Claude Code adapter contract fields", async () => {
  const schema = await readFile("config.schema.yaml", "utf8");
  const configSpec = await readFile("references/config-spec.md", "utf8");
  const platformGuide = await readFile("references/platform-claude.md", "utf8");
  const userGuide = await readFile("docs/platforms/claude-code.md", "utf8");

  for (const phrase of [
    "claude_code",
    "developer",
    "standard",
    "strict",
    "deepseek-v4-pro",
    "settings.local_file",
    "inject_resume_context",
  ]) {
    assert.match(schema, new RegExp(phrase.replace(".", ".*")));
    assert.match(configSpec, new RegExp(phrase.replace(".", ".*")));
  }

  assert.match(platformGuide, /Hypo-Workflow is not a runner/);
  assert.match(platformGuide, /developer.*standard.*strict/s);
  assert.match(userGuide, /\/hw:\*/);
  assert.match(userGuide, /DeepSeek.*Mimo/s);
});
