import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  commandMap,
  writeClaudeCodePluginArtifacts,
} from "../src/index.js";

test("writeClaudeCodePluginArtifacts renders hw namespace plugin metadata", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-claude-plugin-"));
  await writeClaudeCodePluginArtifacts(dir);

  const commands = commandMap("claude-code");
  const plugin = JSON.parse(await readFile(join(dir, ".claude-plugin", "plugin.json"), "utf8"));
  const monitors = JSON.parse(await readFile(join(dir, "monitors", "monitors.json"), "utf8"));
  const marketplace = JSON.parse(await readFile(join(dir, ".claude-plugin", "marketplace.json"), "utf8"));

  assert.equal(commands.length, 38);
  assert.equal(plugin.name, "hw");
  assert.equal(plugin.skills, "./skills/");
  assert.equal(plugin.monitors, "./monitors/monitors.json");
  assert.equal(monitors[0].command, "node hooks/claude-hook.mjs ProgressMonitor");
  assert.equal((await writeClaudeCodePluginArtifacts(dir)).namespace, "hw");
  assert.ok(plugin.keywords.includes("claude-code"));
  assert.ok(plugin.keywords.includes("hypo-workflow"));
  assert.equal(marketplace.plugins[0].name, "hw");
  assert.ok(marketplace.plugins[0].tags.includes("claude-code"));
  assert.ok(marketplace.plugins[0].tags.includes("workflow"));
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
  assert.match(guide, /existing workflow skills|现有 workflow skills/s);
  assert.match(guide, /root `skills\/` directory|root `skills\/`/);
  assert.match(guide, /does not generate `skills\/hw-\*` alias skills|不生成 `skills\/hw-\*`/);
  assert.match(guide, /Claude native `\/resume`/);
  assert.match(guide, /Hypo workflow resume is `\/hw:resume`/);
  assert.match(commandSpec, /namespace is `hw`/s);
  assert.match(commandSpec, /existing Hypo-Workflow skill files/s);
  assert.match(commandSpec, /native `\/resume` remains owned by Claude Code/);
});
