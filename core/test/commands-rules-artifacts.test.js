import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  commandByCanonical,
  commandMap,
  loadRulesSummary,
  writeClaudeCodeAgentArtifacts,
  writeClaudeCodePluginArtifacts,
  writeOpenCodeArtifacts,
} from "../src/index.js";

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

test("commandMap exposes Plan phase commands and removes user-facing plan confirm", () => {
  const commands = commandMap("opencode");
  assert.equal(commands.length, 53);
  assert.equal(commandByCanonical("/hw:plan").opencode, "/hw:plan");
  assert.equal(commandByCanonical("/hw:plan:deep").opencode, "/hw:plan:deep");
  assert.equal(commandByCanonical("/hw:plan:discover").opencode, "/hw:plan:discover");
  assert.equal(commandByCanonical("/hw:plan:technical-stack").opencode, "/hw:plan:technical-stack");
  assert.equal(commandByCanonical("/hw:plan:technical-stack").agent, "hw-plan");
  assert.equal(commandByCanonical("/hw:plan:technical-stack").route, "plan");
  assert.equal(commandByCanonical("/hw:plan:technical-stack").skill, "skills/plan-technical-stack/SKILL.md");
  assert.equal(commandByCanonical("/hw:plan:architecture").opencode, "/hw:plan:architecture");
  assert.equal(commandByCanonical("/hw:plan:architecture").agent, "hw-plan");
  assert.equal(commandByCanonical("/hw:plan:architecture").route, "plan");
  assert.equal(commandByCanonical("/hw:plan:architecture").skill, "skills/plan-architecture/SKILL.md");
  assert.equal(commandByCanonical("/hw:plan:decompose").opencode, "/hw:plan:decompose");
  assert.equal(commandByCanonical("/hw:plan:generate").opencode, "/hw:plan:generate");
  assert.equal(commandByCanonical("/hw:plan:confirm"), undefined);
  assert.equal(commands.some((command) => command.canonical === "/hw:plan:confirm"), false);
  assert.equal(commands.some((command) => command.opencode === "/hw:plan:confirm"), false);
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

test("karpathy guideline pack remains optional while preserving pack severity defaults", async () => {
  const defaultSummary = await loadRulesSummary(".", ".");
  for (const rule of FOUR_RULE_DISCIPLINE) {
    assert.match(defaultSummary, new RegExp(`${rule.id}\\tguideline\\toff`));
  }

  const dir = await mkdtemp(join(tmpdir(), "hw-karpathy-guidelines-"));
  await writeFile(
    join(dir, ".pipeline-rules.yaml"),
    [
      "extends:",
      "  - recommended",
      "  - @karpathy/guidelines",
      "rules: {}",
      "",
    ].join("\n"),
    "utf8",
  );

  const packSummary = await loadRulesSummary(".", ".", { rulesFile: join(dir, ".pipeline-rules.yaml") });
  assert.match(packSummary, /Pack: @karpathy\/guidelines/);
  for (const rule of FOUR_RULE_DISCIPLINE) {
    assert.match(packSummary, new RegExp(`${rule.id}\\tguideline\\twarn`));
  }
});

test("writeOpenCodeArtifacts renders commands, agents, and config", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-"));
  await writeOpenCodeArtifacts(dir, { profile: "standard" });

  const agent = await readFile(join(dir, ".opencode", "agents", "hw-plan.md"), "utf8");
  const plugin = await readFile(join(dir, ".opencode", "plugins", "hypo-workflow.ts"), "utf8");
  const adapterConfig = JSON.parse(await readFile(join(dir, ".opencode", "opencode.json"), "utf8"));
  const config = JSON.parse(await readFile(join(dir, "opencode.json"), "utf8"));
  const metadata = JSON.parse(await readFile(join(dir, ".opencode", "hypo-workflow.json"), "utf8"));

  const commandFiles = await readdir(join(dir, ".opencode", "commands"));
  assert.ok(commandFiles.includes("hw:plan.md"));
  assert.ok(commandFiles.includes("hw:plan:technical-stack.md"));
  assert.ok(commandFiles.includes("hw:plan:architecture.md"));
  assert.equal(commandFiles.includes("hw:plan:confirm.md"), false);
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
  assert.ok(config.command["hw:plan:technical-stack"]);
  assert.ok(config.command["hw:plan:architecture"]);
  assert.equal(config.command["hw:plan:confirm"], undefined);
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
  assert.equal(metadata.commandMap.find((command) => command.canonical === "/hw:plan:technical-stack")?.opencode, "/hw:plan:technical-stack");
  assert.equal(metadata.commandMap.find((command) => command.canonical === "/hw:plan:architecture")?.opencode, "/hw:plan:architecture");
  assert.equal(metadata.commandMap.some((command) => command.canonical === "/hw:plan:confirm"), false);
});

test("OpenCode artifacts project four-rule discipline and visible phase gates", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-opencode-rule-projection-"));
  await writeOpenCodeArtifacts(dir, { profile: "standard" });

  const agents = await readFile(join(dir, "AGENTS.md"), "utf8");
  const planAgent = await readFile(join(dir, ".opencode", "agents", "hw-plan.md"), "utf8");
  const planCommand = await readFile(join(dir, ".opencode", "commands", "hw:plan.md"), "utf8");
  const technicalStackCommand = await readFile(join(dir, ".opencode", "commands", "hw:plan:technical-stack.md"), "utf8");
  const architectureCommand = await readFile(join(dir, ".opencode", "commands", "hw:plan:architecture.md"), "utf8");

  assertFourRuleDiscipline(agents, "AGENTS.md");
  assertFourRuleDiscipline(planAgent, "hw-plan agent");
  assertFourRuleDiscipline(planCommand, "hw:plan command");

  for (const [name, surface] of [
    ["hw-plan agent", planAgent],
    ["hw:plan command", planCommand],
    ["hw:plan:technical-stack command", technicalStackCommand],
    ["hw:plan:architecture command", architectureCommand],
  ]) {
    assertVisiblePhaseGateGuidance(surface, name);
  }

  assert.match(planAgent, /DeepSeek Tool Calling Rules/);
  assert.match(planAgent, /When using DeepSeek through OpenCode/);
});

test("Claude artifacts receive shared rule and gate guidance with DeepSeek compatibility", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-claude-rule-projection-"));
  await writeClaudeCodePluginArtifacts(dir);
  await writeClaudeCodeAgentArtifacts(dir);

  const planCommand = await readFile(join(dir, "commands", "plan.md"), "utf8");
  const technicalStackCommand = await readFile(join(dir, "commands", "plan", "technical-stack.md"), "utf8");
  const architectureCommand = await readFile(join(dir, "commands", "plan", "architecture.md"), "utf8");
  const docsAgent = await readFile(join(dir, ".claude", "agents", "hw-docs.md"), "utf8");

  for (const [name, surface] of [
    ["Claude /hw:plan command", planCommand],
    ["Claude /hw:plan:technical-stack command", technicalStackCommand],
    ["Claude /hw:plan:architecture command", architectureCommand],
    ["Claude hw-docs agent", docsAgent],
  ]) {
    assertFourRuleDiscipline(surface, name);
    assertVisiblePhaseGateGuidance(surface, name);
    assert.match(surface, /Ask Questions Discipline/, `${name}: missing shared Ask guidance heading`);
  }

  assert.match(planCommand, /DeepSeek Tool Calling Rules/);
  assert.match(planCommand, /When using DeepSeek through Claude Code/);
  assert.match(docsAgent, /DeepSeek Tool Calling Rules/);
  assert.match(docsAgent, /When using DeepSeek through Claude Code/);
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

const FOUR_RULE_DISCIPLINE = Object.freeze([
  { id: "karpathy-think-before-coding", label: "Think Before Coding" },
  { id: "karpathy-simplicity-first", label: "Simplicity First" },
  { id: "karpathy-surgical-changes", label: "Surgical Changes" },
  { id: "karpathy-goal-driven-execution", label: "Goal-Driven Execution" },
]);

function assertFourRuleDiscipline(surface, name) {
  for (const rule of FOUR_RULE_DISCIPLINE) {
    assert.match(surface, new RegExp(escapeRegExp(rule.label)), `${name}: missing ${rule.label}`);
  }
  assert.match(surface, /four-rule discipline|4-rule discipline|four rule discipline/i, `${name}: missing concise discipline label`);
}

function assertVisiblePhaseGateGuidance(surface, name) {
  assert.match(surface, /actual phase artifacts|phase artifacts/i, `${name}: missing phase artifact visibility guidance`);
  assert.match(surface, /before (?:Question Tool|`question`|Ask|confirmation)/i, `${name}: must show artifacts before confirmation`);
  assert.match(surface, /Discover/i, `${name}: missing Discover gate reference`);
  assert.match(surface, /Technical Stack/i, `${name}: missing Technical Stack gate reference`);
  assert.match(surface, /Architecture/i, `${name}: missing Architecture gate reference`);
  assert.match(surface, /Decompose/i, `${name}: missing Decompose gate reference`);
  assert.match(surface, /Generate/i, `${name}: missing Generate gate reference`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
