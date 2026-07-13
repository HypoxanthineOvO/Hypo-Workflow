import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  commandByCanonical,
  commandMap,
  writeClaudeCodePluginArtifacts,
  writeOpenCodeArtifacts,
} from "../src/index.js";

const DEEP_PLAN_CANONICAL = "/hw:plan:deep";
const DEEP_PLAN_OPENCODE = "/hw:plan:deep";

test("Deep Plan remains a single internal compatibility route in generated command maps", () => {
  for (const platform of ["opencode", "claude-code"]) {
    const commands = commandMap(platform);
    const deepPlanCommands = commands.filter((command) => command.canonical === DEEP_PLAN_CANONICAL);

    assert.equal(commands.length, 54, `${platform} command map should include Goal plus the compatibility inventory`);
    assert.equal(deepPlanCommands.length, 1, `${platform} should expose Deep Plan exactly once`);
    assert.equal(deepPlanCommands[0].agent, "hw-plan");
    assert.equal(deepPlanCommands[0].route, "plan");
    assert.equal(deepPlanCommands[0].skill, "skills/plan-deep/SKILL.md");
    assert.equal(deepPlanCommands[0].exposure, "internal");
    assert.equal(deepPlanCommands[0].availability, "unavailable");
  }

  assert.equal(commandByCanonical(DEEP_PLAN_CANONICAL).opencode, DEEP_PLAN_OPENCODE);
  assert.equal(commandMap("opencode").find((command) => command.canonical === DEEP_PLAN_CANONICAL).opencode, DEEP_PLAN_OPENCODE);
});

test("OpenCode artifact generation uses commandMap for Deep Plan without artifact-side command splicing", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-deep-plan-opencode-"));
  await writeOpenCodeArtifacts(dir, { profile: "standard" });

  const commandFiles = await readdir(join(dir, ".opencode", "commands"));
  const metadata = JSON.parse(await readFile(join(dir, ".opencode", "hypo-workflow.json"), "utf8"));
  const plugin = await readFile(join(dir, ".opencode", "plugins", "hypo-workflow.ts"), "utf8");
  const source = await readFile("core/src/artifacts/opencode.js", "utf8");

  assert.ok(commandFiles.includes("hw:plan:deep.md"));
  assert.equal(commandFiles.includes("hw-plan-deep.md"), false);
  assert.equal(metadata.commandMap.filter((command) => command.canonical === DEEP_PLAN_CANONICAL).length, 1);
  assert.ok(countOccurrences(plugin, DEEP_PLAN_CANONICAL) >= 1);
  assert.deepEqual(metadata.commandMap, commandMap("opencode"));
  assert.doesNotMatch(source, /DEEP_PLAN_COMMAND/, "OpenCode artifacts should not append Deep Plan outside commandMap()");
});

test("Claude Code generated commands include Deep Plan as a namespaced slash command", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-deep-plan-claude-"));
  const result = await writeClaudeCodePluginArtifacts(dir);

  assert.equal(result.command_count, 54);
  assert.equal(result.written_commands.filter((file) => file === "commands/plan/deep.md").length, 1);

  const command = await readFile(join(dir, "commands", "plan", "deep.md"), "utf8");
  assert.match(command, /# \/hw:plan:deep/);
  assert.match(command, /skills\/plan-deep\/SKILL\.md/);
});

test("Help, docs, and references present Deep Plan as integrated operations with boundaries", async () => {
  const help = await readFile("skills/help/SKILL.md", "utf8");
  const skillSpec = await readFile("references/skill-spec.md", "utf8");
  const commandSpec = await readFile("references/commands-spec.md", "utf8");
  const planSkill = await readFile("skills/plan/SKILL.md", "utf8");
  const deepPlanSkill = await readFile("skills/plan-deep/SKILL.md", "utf8");
  const generatedCommand = await readFile("commands/plan/deep.md", "utf8");

  assert.match(help, /53 user-facing Hypo-Workflow commands/i);
  assert.match(help, /\/hw:plan:deep/);
  assert.match(skillSpec, /53 user-facing commands/i);
  assert.doesNotMatch(skillSpec, /plan:deep[\s\S]{0,120}(deferred|outside the legacy OpenCode `commandMap\(\)` count)/i);
  assert.doesNotMatch(skillSpec, /deferred to M6/i);

  const combined = [commandSpec, planSkill, deepPlanSkill, generatedCommand].join("\n\n");
  assert.match(combined, /Deep Plan operations/i);
  assert.match(combined, /durable discussion package/i);
  assert.match(combined, /must not directly execute implementation milestones/i);
  assert.match(combined, /analysis boundaries|boundaries/i);
  assert.match(combined, /not `\/hw:explore`|distinct from `\/hw:explore`|\/hw:explore` remains bounded/i);
  assert.match(combined, /ordinary `\/hw:plan`.*Discover.*Technical Stack.*Architecture.*Decompose.*Generate/is);
  assert.match(combined, /must not skip.*Discover.*Technical Stack.*Architecture.*Decompose.*Generate/is);
});

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}
