import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { commandByCanonical, commandMap, loadRulesSummary, writeOpenCodeArtifacts } from "../src/index.js";

test("commandMap contains 38 OpenCode mappings", () => {
  const commands = commandMap("opencode");
  assert.equal(commands.length, 38);
  assert.equal(commandByCanonical("/hw:plan").opencode, "/hw-plan");
  assert.equal(commandByCanonical("/hw:report").agent, "hw-report");
  assert.equal(commandByCanonical("/hw:compact").agent, "hw-compact");
  assert.equal(commandByCanonical("/hw:debug").agent, "hw-debug");
  assert.equal(commandByCanonical("/hw:chat").opencode, "/hw-chat");
  assert.equal(commandByCanonical("/hw:knowledge").opencode, "/hw-knowledge");
  assert.equal(commandByCanonical("/hw:accept").opencode, "/hw-accept");
  assert.equal(commandByCanonical("/hw:reject").opencode, "/hw-reject");
  assert.equal(commandByCanonical("/hw:explore").opencode, "/hw-explore");
  assert.equal(commandByCanonical("/hw:sync").opencode, "/hw-sync");
  assert.equal(commandByCanonical("/hw:docs").opencode, "/hw-docs");
  assert.equal(commandByCanonical("/hw:pr").opencode, "/hw-pr");
  assert.equal(commandByCanonical("/hw:pr").agent, "hw-review");
  assert.equal(commandByCanonical("/hw:explain").opencode, "/hw-explain");
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

  const releaseCommand = await readFile(join(dir, ".opencode", "commands", "hw-release.md"), "utf8");
  const explainCommand = await readFile(join(dir, ".opencode", "commands", "hw-explain.md"), "utf8");
  const chatCommand = await readFile(join(dir, ".opencode", "commands", "hw-chat.md"), "utf8");
  const command = await readFile(join(dir, ".opencode", "commands", "hw-plan.md"), "utf8");
  const agent = await readFile(join(dir, ".opencode", "agents", "hw-plan.md"), "utf8");
  const plugin = await readFile(join(dir, ".opencode", "plugins", "hypo-workflow.ts"), "utf8");
  const adapterConfig = JSON.parse(await readFile(join(dir, ".opencode", "opencode.json"), "utf8"));
  const config = JSON.parse(await readFile(join(dir, "opencode.json"), "utf8"));
  const tuiConfig = JSON.parse(await readFile(join(dir, "tui.json"), "utf8"));
  const metadata = JSON.parse(await readFile(join(dir, ".opencode", "hypo-workflow.json"), "utf8"));

  assert.match(command, /\/hw:plan/);
  assert.match(command, /not a separate runner/);
  assert.match(releaseCommand, /update_readme/);
  assert.match(releaseCommand, /readme-freshness/);
  assert.match(explainCommand, /evidence-first/);
  assert.match(explainCommand, /read-only/);
  assert.match(explainCommand, /--subagent/);
  assert.match(chatCommand, /\/hw:chat/);
  assert.match(chatCommand, /state\.yaml \+ cycle\.yaml \+ PROGRESS\.md \+ recent report/);
  assert.match(chatCommand, /chat entries instead of Milestone reports/);
  assert.match(agent, /todowrite/);
  assert.match(agent, /permission:/);
  assert.match(agent, /^model: openai\/gpt-5\.5$/m);
  assert.doesNotMatch(agent, /^tools:/m);
  assert.match(plugin, /commandMap/);
  assert.equal(config.$schema, "https://opencode.ai/config.json");
  assert.deepEqual(config.plugin, [
    ".opencode/plugins/hypo-workflow.ts",
  ]);
  assert.equal(tuiConfig.$schema, "https://opencode.ai/tui.json");
  assert.deepEqual(tuiConfig.plugin, [".opencode/tui/hypo-workflow-tui.tsx"]);
  assert.equal(adapterConfig.$schema, "https://opencode.ai/config.json");
  assert.equal("plugin" in adapterConfig, false);
  assert.equal(config.compaction.auto, true);
  assert.equal(config.compaction.prune, true);
  assert.equal(config.compaction.effective_context_target, undefined);
  assert.equal(config.agents, undefined);
  assert.equal(metadata.autoContinue, true);
  assert.equal(metadata.auto_continue.mode, "safe");
  assert.equal(metadata.compaction.effective_context_target, 900000);
  assert.equal(metadata.providers, undefined);
  assert.equal(config.provider, undefined);
  assert.equal(metadata.agents.test.model, "deepseek-v4-pro");
});

test("writeOpenCodeArtifacts renders explicit provider placeholders when configured", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-providers-"));
  await writeOpenCodeArtifacts(dir, {
    profile: {
      name: "standard",
      providers: {
        openai: {
          name: "OpenAI",
          options: { apiKey: "{env:OPENAI_API_KEY}" },
          models: {
            "gpt-5.5": { name: "GPT 5.5" },
          },
        },
      },
    },
  });

  const config = JSON.parse(await readFile(join(dir, "opencode.json"), "utf8"));
  const metadata = JSON.parse(await readFile(join(dir, ".opencode", "hypo-workflow.json"), "utf8"));

  assert.equal(config.provider.openai.options.apiKey, "{env:OPENAI_API_KEY}");
  assert.equal(config.provider.openai.models["gpt-5.5"].name, "GPT 5.5");
  assert.equal(metadata.providers.openai.models["gpt-5.5"].name, "GPT 5.5");
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
  const tui = await readFile(join(outDir, ".opencode", "tui", "hypo-workflow-tui.tsx"), "utf8");
  assert.match(agents, /Hypo-Workflow managed OpenCode instructions/);
  assert.match(tui, /export const tui/);
});
