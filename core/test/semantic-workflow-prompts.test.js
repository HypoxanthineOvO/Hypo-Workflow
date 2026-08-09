import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFrontmatter } from "../src/serialization/index.js";
import { evaluateCodexHookEvent } from "../src/index.js";
import { renderClaudeCodeSlashCommand } from "../src/artifacts/claude.js";
import { renderCommand as renderOpenCodeCommand } from "../src/artifacts/opencode.js";
import { CANONICAL_COMMANDS } from "../src/commands/index.js";
import {
  officialHookCase,
  seedActiveRecovery,
  temporaryGitWorkspace,
} from "./fixtures/c21-m7/helpers.js";

const ROOT = new URL("../../", import.meta.url).pathname;
const COMMAND_NAMES = CANONICAL_COMMANDS.map(({ canonical }) => canonical.slice(4));
const SKILLS = ["SKILL.md", ...CANONICAL_COMMANDS.map(({ skill }) => skill)];
const MODEL_INTERNALS = /createDeliveryStore|compilePlan|compileGoalDesign|commitRecordPatch|initializeWorkspace|Receipt|Recovery Pack|plan_hash|semantic_hash|worker_routing|Runtime|Continuation|Recovery Journal|Context Capsule|transaction id/i;

test("Router and Child Skills are Chinese-first semantic instructions", async () => {
  for (const relativePath of SKILLS) {
    const source = await readFile(join(ROOT, relativePath), "utf8");
    const parsed = parseFrontmatter(source);
    assert.equal(typeof parsed.attributes.name, "string", `${relativePath} requires a name`);
    assert.match(parsed.body, /\p{Script=Han}/u, `${relativePath} requires Chinese user-facing content`);
    assert.doesNotMatch(source, MODEL_INTERNALS, `${relativePath} exposes internal protocol`);
  }
});

test("Router exposes every authoritative command and its focused Skill", async () => {
  const root = await readFile(join(ROOT, "SKILL.md"), "utf8");

  for (const command of COMMAND_NAMES) {
    assert.match(root, new RegExp(`/hw:${command}`));
    assert.match(root, new RegExp(`skills/${command}/SKILL\\.md`));
  }
});

test("Claude public command adapters stay thin and defer semantics to one Child Skill", async () => {
  for (const command of COMMAND_NAMES) {
    const source = await readFile(join(ROOT, `commands/${command}.md`), "utf8");
    assert.match(source, new RegExp(`skills/${command}/SKILL\\.md`));
    assert.doesNotMatch(source, MODEL_INTERNALS);
  }

  const rendered = renderClaudeCodeSlashCommand({
    canonical: "/hw:plan",
    route: "delivery",
    skill: "skills/plan/SKILL.md",
  });
  assert.match(rendered, /skills\/plan\/SKILL\.md/);
  assert.doesNotMatch(rendered, MODEL_INTERNALS);
});

test("OpenCode public command adapters stay thin and defer semantics to one Child Skill", async () => {
  for (const command of COMMAND_NAMES) {
    const source = await readFile(join(ROOT, `.opencode/commands/hw:${command}.md`), "utf8");
    assert.match(source, new RegExp(`skills/${command}/SKILL\\.md`));
    assert.doesNotMatch(source, MODEL_INTERNALS);
  }

  const rendered = renderOpenCodeCommand({
    canonical: "/hw:plan",
    opencode: "/hw:plan",
    agent: "hw-plan",
    route: "delivery",
    skill: "skills/plan/SKILL.md",
  });
  assert.match(rendered, /skills\/plan\/SKILL\.md/);
  assert.doesNotMatch(rendered, MODEL_INTERNALS);
});

test("Codex registers only semantic conversation, recovery, progress, and safety Hooks", async () => {
  const config = JSON.parse(await readFile(join(ROOT, "hooks/hooks.json"), "utf8"));
  assert.deepEqual(Object.keys(config.hooks).sort(), [
    "PermissionRequest",
    "PreCompact",
    "PreToolUse",
    "SessionStart",
    "Stop",
    "UserPromptSubmit",
  ]);
});

test("registered context Hooks hide internal protocol from the model", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-semantic-prompts-");
  await seedActiveRecovery(root, "semantic-prompts");

  const startup = await evaluateCodexHookEvent(root, {
    ...await officialHookCase(root, "SessionStart"),
    source: "startup",
  });
  const startupContext = startup.hookSpecificOutput.additionalContext;
  assert.match(startupContext, /PLAN\.md/);
  assert.match(startupContext, /PROGRESS\.md/);
  assert.doesNotMatch(startupContext, MODEL_INTERNALS);

  const prompt = await evaluateCodexHookEvent(root, await officialHookCase(root, "UserPromptSubmit"));
  const promptContext = prompt.hookSpecificOutput.additionalContext;
  assert.equal(typeof promptContext, "string");
  assert.ok(promptContext.length > 0);
  assert.doesNotMatch(promptContext, MODEL_INTERNALS);
});
