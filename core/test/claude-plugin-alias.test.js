import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  auditClaudeResumeNamespace,
  commandMap,
  loadStructuredRulesAuthority,
  writeClaudeCodePluginArtifacts,
} from "../src/index.js";

test("writeClaudeCodePluginArtifacts renders hw namespace plugin metadata", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-claude-plugin-"));
  await writeClaudeCodePluginArtifacts(dir);

  const commands = commandMap("claude-code");
  const plugin = JSON.parse(await readFile(join(dir, ".claude-plugin", "plugin.json"), "utf8"));
  const monitors = JSON.parse(await readFile(join(dir, "monitors", "monitors.json"), "utf8"));
  const marketplace = JSON.parse(await readFile(join(dir, ".claude-plugin", "marketplace.json"), "utf8"));
  const patchCommand = await readFile(join(dir, "commands", "patch.md"), "utf8");
  const planDiscoverCommand = await readFile(join(dir, "commands", "plan", "discover.md"), "utf8");
  const setupCommand = await readFile(join(dir, "commands", "setup.md"), "utf8");

  assert.equal(commands.length, 40);
  assert.equal(plugin.name, "hw");
  assert.equal(plugin.skills, "./skills/");
  assert.equal(plugin.monitors, "./monitors/monitors.json");
  assert.equal(monitors[0].command, "node hooks/claude-hook.mjs ProgressMonitor");
  const result = await writeClaudeCodePluginArtifacts(dir);
  assert.equal(result.namespace, "hw");
  assert.equal(result.command_count, 40);
  assert.ok(result.written_commands.includes("commands/patch.md"));
  assert.ok(result.written_commands.includes("commands/plan/discover.md"));
  assert.ok(plugin.keywords.includes("claude-code"));
  assert.ok(plugin.keywords.includes("hypo-workflow"));
  assert.equal(marketplace.plugins[0].name, "hw");
  assert.ok(marketplace.plugins[0].tags.includes("claude-code"));
  assert.ok(marketplace.plugins[0].tags.includes("workflow"));
  assert.match(patchCommand, /Canonical command: `\/hw:patch`/);
  assert.match(patchCommand, /Skill: `skills\/patch\/SKILL\.md`/);
  assert.match(patchCommand, /Ask Questions Discipline/);
  assert.match(patchCommand, /DeepSeek Tool Calling Rules/);
  assert.match(planDiscoverCommand, /Canonical command: `\/hw:plan:discover`/);
  assert.match(setupCommand, /Canonical command: `\/hw:setup`/);
  assert.doesNotMatch(setupCommand, /\/hypo-workflow:setup/);
});

test("Claude slash commands preserve route-specific guidance and optional DeepSeek rules", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-claude-command-guidance-"));
  await writeClaudeCodePluginArtifacts(dir, { model: "claude-sonnet-4-6" });

  const planCommand = await readFile(join(dir, "commands", "plan.md"), "utf8");
  const planDeepCommand = await readFile(join(dir, "commands", "plan", "deep.md"), "utf8");
  const patchFixCommand = await readFile(join(dir, "commands", "patch", "fix.md"), "utf8");

  assert.match(planCommand, /If the user provides `--deep`/);
  assert.match(planCommand, /Ask Questions Discipline/);
  assert.doesNotMatch(planCommand, /DeepSeek Tool Calling Rules/);
  assert.match(planDeepCommand, /target for the `\/hw:plan --deep` alias/);
  assert.match(patchFixCommand, /Patch Fix lane/);
});

test("writeClaudeCodePluginArtifacts removes legacy hw-* alias skills", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-claude-plugin-alias-cleanup-"));
  await mkdir(join(dir, "skills", "hw-status"), { recursive: true });
  await writeFile(
    join(dir, "skills", "hw-status", "SKILL.md"),
    "---\nname: hw-status\ndescription: Thin Claude Code alias for /hw:status.\n---\n",
    "utf8",
  );
  await mkdir(join(dir, "skills", "status"), { recursive: true });
  await writeFile(join(dir, "skills", "status", "SKILL.md"), "---\nname: status\n---\n", "utf8");

  const result = await writeClaudeCodePluginArtifacts(dir);

  assert.deepEqual(result.removed_legacy_aliases, ["skills/hw-status"]);
  await assert.rejects(readFile(join(dir, "skills", "hw-status", "SKILL.md"), "utf8"), /ENOENT/);
  assert.match(await readFile(join(dir, "skills", "status", "SKILL.md"), "utf8"), /name: status/);
});

test("Claude Code platform docs explain hw namespace without replacing existing skills", async () => {
  const guide = await readFile("docs/platforms/claude-code.md", "utf8");
  const commandSpec = await readFile("references/commands-spec.md", "utf8");

  assert.match(guide, /plugin name .*`hw`|plugin name 有意设为 `hw`/s);
  assert.match(guide, /plugin-root `commands\/`/);
  assert.match(guide, /root `skills\/` authority/);
  assert.match(guide, /does not generate `skills\/hw-\*` alias skills|不生成 `skills\/hw-\*`/);
  assert.match(guide, /Claude native `\/resume`/);
  assert.match(guide, /Hypo workflow resume is `\/hw:resume`/);
  assert.match(commandSpec, /namespace is `hw`/s);
  assert.match(commandSpec, /plugin-root `commands\/` files/s);
  assert.match(commandSpec, /existing `skills\/\*\/SKILL\.md` authority/s);
  assert.match(commandSpec, /native `\/resume` remains owned by Claude Code/);
});

test("project rules enforce Claude hw command namespace and resume boundary", async () => {
  const authority = await loadStructuredRulesAuthority(".", ".");
  const rule = authority.effective.rules.find((item) => item.id === "claude-hw-command-namespace");
  const audit = await auditClaudeResumeNamespace(".");

  assert.equal(rule.scope, "project");
  assert.equal(rule.severity, "error");
  assert.deepEqual(rule.hooks, ["always", "pre-commit", "pre-release"]);
  assert.match(rule.content.instruction, /\/hw:\*/);
  assert.match(rule.content.rationale, /\/hw:resume/);
  assert.equal(audit.ok, true);
});
