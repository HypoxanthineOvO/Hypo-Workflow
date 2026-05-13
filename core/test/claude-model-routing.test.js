import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildClaudeAgentRoutingMetadata,
  renderClaudeCodeAgent,
  runProjectSync,
  selectClaudeAgentRole,
  writeClaudeCodeAgentArtifacts,
  writeConfig,
} from "../src/index.js";

test("Claude agent routing metadata keeps DeepSeek docs and Mimo code/test defaults", () => {
  const metadata = buildClaudeAgentRoutingMetadata();

  assert.equal(metadata.agents.docs.model, "deepseek-v4-pro");
  assert.equal(metadata.agents.code.model, "mimo-v2.5-pro");
  assert.equal(metadata.agents.test.model, "mimo-v2.5-pro");
  assert.equal(metadata.agents.report.model, "deepseek-v4-flash");
  assert.equal(metadata.agents.compact.model, "deepseek-v4-flash");
  assert.equal(metadata.source, "model_pool+claude_code");
});

test("Claude agent rendering exposes inspectable model routing", () => {
  const rendered = renderClaudeCodeAgent("docs", { model: "deepseek-v4-pro" });

  assert.match(rendered, /^---\nname: hw-docs/m);
  assert.match(rendered, /^model: deepseek-v4-pro/m);
  assert.match(rendered, /^hypo_workflow_managed: true/m);
  assert.match(rendered, /Role: `docs`/);
  assert.match(rendered, /Ask Questions Discipline/);
  assert.match(rendered, /Use Ask Questions proactively/);
  assert.match(rendered, /Use the `question` tool when it is available/);
  assert.match(rendered, /DeepSeek Tool Calling Rules/);
  assert.match(rendered, /When using DeepSeek through Claude Code/);
  assert.match(rendered, /Omit optional fields you do not need/);
  assert.match(rendered, /File paths, URLs, IDs/);
  assert.match(rendered, /Do not call models directly/);
});

test("Claude agent rendering does not inject DeepSeek tool rules for non-DeepSeek models", () => {
  const rendered = renderClaudeCodeAgent("code", { model: "mimo-v2.5-pro" });

  assert.match(rendered, /Ask Questions Discipline/);
  assert.doesNotMatch(rendered, /DeepSeek Tool Calling Rules/);
});

test("writeClaudeCodeAgentArtifacts writes managed agents and metadata without overwriting user-owned agents", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-claude-agents-"));
  await mkdir(join(root, ".claude", "agents"), { recursive: true });
  await writeFile(join(root, ".claude", "agents", "hw-code.md"), "# user code agent\n", "utf8");

  const result = await writeClaudeCodeAgentArtifacts(root);
  const docsAgent = await readFile(join(root, ".claude", "agents", "hw-docs.md"), "utf8");
  const codeAgent = await readFile(join(root, ".claude", "agents", "hw-code.md"), "utf8");
  const metadata = JSON.parse(await readFile(join(root, ".claude", "hypo-workflow-agents.json"), "utf8"));

  assert.equal(result.agent_count, 8);
  assert.deepEqual(result.conflicts, [{ path: ".claude/agents/hw-code.md", reason: "user-owned-agent" }]);
  assert.match(docsAgent, /model: deepseek-v4-pro/);
  assert.equal(codeAgent, "# user code agent\n");
  assert.equal(metadata.agents.docs.model, "deepseek-v4-pro");
  assert.equal(metadata.conflicts[0].path, ".claude/agents/hw-code.md");
});

test("explicit claude_code agent overrides win over model pool derived roles", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-claude-agent-overrides-"));
  const file = join(dir, "config.yaml");
  await writeConfig(file, {
    model_pool: {
      roles: {
        plan: { primary: "plan-model" },
        implement: { primary: "impl-model" },
        review: { primary: "review-model" },
        evaluate: { primary: "eval-model" },
      },
    },
    claude_code: {
      agents: {
        code: { model: "explicit-code" },
        docs: { model: "explicit-docs" },
      },
    },
  });

  const result = await writeClaudeCodeAgentArtifacts(dir, { configFile: file });
  const codeAgent = await readFile(join(dir, ".claude", "agents", "hw-code.md"), "utf8");
  const docsAgent = await readFile(join(dir, ".claude", "agents", "hw-docs.md"), "utf8");

  assert.equal(result.agents.code.model, "explicit-code");
  assert.equal(result.agents.plan.model, "plan-model");
  assert.match(codeAgent, /model: explicit-code/);
  assert.match(docsAgent, /model: explicit-docs/);
});

test("dynamic Claude role selection refines by task, test profile, and failure state", () => {
  assert.equal(selectClaudeAgentRole({ task_category: "documentation" }).role, "docs");
  assert.equal(selectClaudeAgentRole({ test_profile: "webapp" }).role, "test");
  assert.equal(selectClaudeAgentRole({ failure_state: "test_failure", retry_count: 1 }).role, "debug");
  assert.equal(selectClaudeAgentRole({ milestone_name: "Release notes", task_category: "report" }).role, "report");
  assert.equal(selectClaudeAgentRole({ task_category: "implementation" }).role, "code");
});

test("claude-code project sync writes subagent artifacts and routing metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-claude-agent-sync-"));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Claude Agent Sync" },
    execution: { mode: "self", steps: { preset: "tdd" } },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { status: "running" },
  });

  const result = await runProjectSync(root, { mode: "standard", platform: "claude-code" });
  const docsAgent = await readFile(join(root, ".claude", "agents", "hw-docs.md"), "utf8");
  const metadata = JSON.parse(await readFile(join(root, ".claude", "hypo-workflow-agents.json"), "utf8"));

  assert.ok(result.operations.includes("claude_code_agents"));
  assert.equal(result.claude_code_agents.agent_count, 8);
  assert.match(docsAgent, /model: deepseek-v4-pro/);
  assert.match(docsAgent, /Ask Questions Discipline/);
  assert.match(docsAgent, /DeepSeek Tool Calling Rules/);
  assert.equal(metadata.agents.code.model, "mimo-v2.5-pro");
});
