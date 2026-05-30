import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { commandByCanonical, commandMap, loadRulesSummary, writeOpenCodeArtifacts } from "../src/index.js";

const MAINTAIN_SUBCOMMANDS = Object.freeze([
  "status",
  "scan",
  "plan",
  "queue",
  "run",
  "apply",
  "verify",
  "log",
]);

test("commandMap contains 52 OpenCode mappings including /hw:maintain", () => {
  const commands = commandMap("opencode");
  assert.equal(commands.length, 52);
  assert.equal(commandByCanonical("/hw:plan").opencode, "/hw:plan");
  assert.equal(commandByCanonical("/hw:plan:deep").opencode, "/hw:plan:deep");
  assert.equal(commandByCanonical("/hw:report").agent, "hw-report");
  assert.equal(commandByCanonical("/hw:compact").agent, "hw-compact");
  assert.equal(commandByCanonical("/hw:debug").agent, "hw-debug");
  assert.equal(commandByCanonical("/hw:chat").opencode, "/hw:chat");
  assert.equal(commandByCanonical("/hw:analysis").opencode, "/hw:analysis");
  assert.equal(commandByCanonical("/hw:knowledge").opencode, "/hw:knowledge");
  assert.equal(commandByCanonical("/hw:accept").opencode, "/hw:accept");
  assert.equal(commandByCanonical("/hw:reject").opencode, "/hw:reject");
  assert.equal(commandByCanonical("/hw:explore").opencode, "/hw:explore");
  assert.equal(commandByCanonical("/hw:sync").opencode, "/hw:sync");
  assert.equal(commandByCanonical("/hw:docs").opencode, "/hw:docs");
  assert.equal(commandByCanonical("/hw:pr").opencode, "/hw:pr");
  assert.equal(commandByCanonical("/hw:pr").agent, "hw-review");
  assert.equal(commandByCanonical("/hw:pr create").opencode, "/hw:pr:create");
  assert.equal(commandByCanonical("/hw:pr create").agent, "hw-build");
  assert.equal(commandByCanonical("/hw:explain").opencode, "/hw:explain");
  assert.equal(commandByCanonical("/hw:quality").opencode, "/hw:quality");
  assert.equal(commandByCanonical("/hw:quality").agent, "hw-review");
  assert.equal(commandByCanonical("/hw:quality").skill, "skills/quality/SKILL.md");
  assert.equal(commandByCanonical("/hw:optimize").opencode, "/hw:optimize");
  assert.equal(commandByCanonical("/hw:optimize").agent, "hw-build");
  assert.equal(commandByCanonical("/hw:optimize").skill, "skills/optimize/SKILL.md");

  const maintain = commandByCanonical("/hw:maintain");
  assert.equal(maintain.opencode, "/hw:maintain");
  assert.equal(maintain.agent, "hw-build");
  assert.equal(maintain.route, "maintenance");
  assert.equal(maintain.skill, "skills/maintain/SKILL.md");
  for (const subcommand of MAINTAIN_SUBCOMMANDS) {
    const command = commandByCanonical(`/hw:maintain ${subcommand}`);
    assert.equal(command.opencode, `/hw:maintain:${subcommand}`);
    assert.equal(command.agent, "hw-build");
    assert.equal(command.route, "maintenance");
    assert.equal(command.skill, "skills/maintain/SKILL.md");
  }
});

test("loadRulesSummary reads builtin rules", async () => {
  const summary = await loadRulesSummary(".", ".");
  assert.match(summary, /Rules: recommended/);
  assert.match(summary, /git-clean-check/);
  assert.match(summary, /Summary:/);
});

test("writeOpenCodeArtifacts renders commands, agents, and config", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-"));
  await writeOpenCodeArtifacts(dir, { profile: "standard" });

  const commandFiles = await readdir(join(dir, ".opencode", "commands"));
  const agent = await readFile(join(dir, ".opencode", "agents", "hw-plan.md"), "utf8");
  const plugin = await readFile(join(dir, ".opencode", "plugins", "hypo-workflow.ts"), "utf8");
  const adapterConfig = JSON.parse(await readFile(join(dir, ".opencode", "opencode.json"), "utf8"));
  const config = JSON.parse(await readFile(join(dir, "opencode.json"), "utf8"));
  const metadata = JSON.parse(await readFile(join(dir, ".opencode", "hypo-workflow.json"), "utf8"));

  assert.ok(commandFiles.includes("hw:plan.md"));
  assert.ok(commandFiles.includes("hw:quality.md"));
  assert.ok(commandFiles.includes("hw:optimize.md"));
  assert.equal(commandFiles.includes("hw-plan.md"), false);
  assert.equal(commandFiles.includes("hw-start.md"), false);
  assert.match(agent, /todowrite/);
  assert.match(agent, /Ask Questions Discipline/);
  assert.match(agent, /Use Ask Questions proactively/);
  assert.match(agent, /Use the `question` tool when it is available/);
  assert.match(agent, /permission:/);
  assert.match(agent, /^model: deepseek\/deepseek-v4-pro$/m);
  assert.match(agent, /DeepSeek Tool Calling Rules/);
  assert.doesNotMatch(agent, /^tools:/m);
  assert.match(plugin, /commandMap/);
  assert.equal(config.$schema, "https://opencode.ai/config.json");
  assert.ok(config.command["hw:plan"]);
  assert.ok(config.command["hw:plan:deep"]);
  assert.ok(config.command["hw:patch:fix"]);
  assert.ok(config.command["hw:pr:create"]);
  assert.equal(config.command["hw-plan"], undefined);
  assert.equal(config.command["hw-start"], undefined);
  assert.deepEqual(config.plugin, [
    ".opencode/plugins/hypo-workflow.ts",
  ]);
  await assert.rejects(readFile(join(dir, "tui.json"), "utf8"));
  await assert.rejects(readFile(join(dir, ".opencode", "tui", "hypo-workflow-tui.tsx"), "utf8"));
  assert.equal(adapterConfig.$schema, "https://opencode.ai/config.json");
  assert.equal("plugin" in adapterConfig, false);
  assert.equal(config.compaction.auto, true);
  assert.equal(config.compaction.prune, true);
  assert.equal(config.permission["*"], "allow");
  assert.equal(config.permission.edit, "allow");
  assert.equal(config.permission.bash, "allow");
  assert.equal(config.compaction.effective_context_target, undefined);
  assert.equal(config.agents, undefined);
  assert.equal(metadata.autoContinue, true);
  assert.equal(metadata.auto_continue.mode, "safe");
  assert.equal(metadata.execution_bash.mode, "allow_local");
  assert.equal(metadata.execution_bash.confirm_external, false);
  assert.equal(metadata.compaction.effective_context_target, 900000);
  assert.equal(metadata.providers, undefined);
  assert.equal(config.provider, undefined);
  assert.doesNotMatch(JSON.stringify(config), /bypass/);
  assert.equal(metadata.agents.test.model, "deepseek-v4-pro");
  assert.equal(metadata.commandMap.find((command) => command.canonical === "/hw:plan:deep")?.opencode, "/hw:plan:deep");
});

test("writeOpenCodeArtifacts renders explicit provider placeholders when configured", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-providers-"));
  await writeOpenCodeArtifacts(dir, {
    profile: {
      name: "standard",
      providers: {
        deepseek: {
          name: "DeepSeek",
          options: { apiKey: "{env:DEEPSEEK_API_KEY}" },
          models: {
            "deepseek-v4-pro": { name: "DeepSeek V4 Pro" },
          },
        },
      },
    },
  });

  const config = JSON.parse(await readFile(join(dir, "opencode.json"), "utf8"));
  const metadata = JSON.parse(await readFile(join(dir, ".opencode", "hypo-workflow.json"), "utf8"));

  assert.equal(config.provider.deepseek.options.apiKey, "{env:DEEPSEEK_API_KEY}");
  assert.equal(config.provider.deepseek.models["deepseek-v4-pro"].name, "DeepSeek V4 Pro");
  assert.equal(metadata.providers.deepseek.models["deepseek-v4-pro"].name, "DeepSeek V4 Pro");
});

test("OpenCode artifact rendering resolves templates from the installed package, not cwd", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "hw-foreign-cwd-"));
  const outDir = join(cwd, "target-project");
  const script = `
    import { writeOpenCodeArtifacts } from ${JSON.stringify(new URL("../src/index.js", import.meta.url).href)};
    await writeOpenCodeArtifacts(${JSON.stringify(outDir)}, { profile: "standard" });
  `;

  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const agents = await readFile(join(outDir, "AGENTS.md"), "utf8");
  assert.match(agents, /Hypo-Workflow managed OpenCode instructions/);
  await assert.rejects(readFile(join(outDir, ".opencode", "tui", "hypo-workflow-tui.tsx"), "utf8"));
});
