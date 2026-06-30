import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { commandByCanonical, writeOpenCodeArtifacts } from "../src/index.js";

const REQUIRED_OPERATIONS = [
  "new",
  "ask",
  "research",
  "map",
  "drill",
  "readiness",
  "convert",
];

const REQUIRED_STATES = [
  "drafting",
  "researching",
  "architecture_mapping",
  "module_drilldown",
  "ready_for_plan",
  "converted",
  "archived",
];

test("deep plan command registry exposes canonical command and --deep alias", async () => {
  const deep = commandByCanonical("/hw:plan:deep");
  assert.ok(deep, "missing canonical /hw:plan:deep command registry entry");
  assert.equal(deep.route, "plan");
  assert.equal(deep.agent, "hw-plan");
  assert.equal(deep.opencode, "/hw:plan:deep");
  assert.match(deep.skill, /skills\/plan-deep\/SKILL\.md$/);

  const root = await mkdtemp(join(tmpdir(), "hw-deep-plan-adapter-"));
  await writeOpenCodeArtifacts(root, { profile: "standard" });

  const config = JSON.parse(await readFile(join(root, "opencode.json"), "utf8"));

  assert.ok(config.command["hw:plan:deep"]);
  assert.match(config.command["hw:plan:deep"].template, /skills\/plan-deep\/SKILL\.md/);
  assert.ok(config.command["hw:plan"]);
});

test("deep plan skill defines operation vocabulary and lifecycle states", async () => {
  const skill = await readFile("skills/plan-deep/SKILL.md", "utf8");
  const commandsSpec = await readFile("references/commands-spec.md", "utf8");

  for (const operation of REQUIRED_OPERATIONS) {
    assert.match(skill, new RegExp(`\\b${operation}\\b`), `missing Deep Plan operation: ${operation}`);
  }

  for (const state of REQUIRED_STATES) {
    assert.match(skill, new RegExp(`\\b${state}\\b`), `missing Deep Plan lifecycle state: ${state}`);
  }

  assert.match(skill, /\.pipeline\/deep-plans\/DP[0-9]+/);
  assert.match(skill, /machine[- ]readable|机器可读/i);
  assert.match(skill, /Mermaid|Markdown/);
  assert.match(commandsSpec, /\/hw:plan:deep/);
  assert.match(commandsSpec, /--deep/);
});

test("deep plan boundary is distinct from guide onboarding and explore worktrees", async () => {
  const deepSkill = await readFile("skills/plan-deep/SKILL.md", "utf8");
  const guideSkill = await readFile("skills/guide/SKILL.md", "utf8");
  const exploreSkill = await readFile("skills/explore/SKILL.md", "utf8");

  assert.match(deepSkill, /not.*\/hw:guide|\/hw:guide.*not/is);
  assert.match(deepSkill, /not.*\/hw:explore|\/hw:explore.*not/is);
  assert.match(deepSkill, /discussion package/i);
  assert.match(deepSkill, /readiness/i);
  assert.match(deepSkill, /convert/i);

  assert.doesNotMatch(guideSkill, /primary path.*deep plan/is);
  assert.doesNotMatch(exploreSkill, /primary path.*deep plan/is);
  assert.doesNotMatch(deepSkill, /worktree_path|git worktree/i);
});

test("ordinary /hw:plan keeps named phase gates and --deep routes before ordinary planning", async () => {
  const planSkill = await readFile("skills/plan/SKILL.md", "utf8");
  const planCommand = await readFile("commands/plan.md", "utf8");
  const commandsSpec = await readFile("references/commands-spec.md", "utf8");

  assert.match(planSkill, /Discover -> Technical Stack -> Architecture -> Decompose -> Generate -> Implementation/);
  assert.match(planSkill, /ordinary.*\/hw:plan|\/hw:plan.*ordinary|普通的.*\/hw:plan|\/hw:plan.*普通/is);
  assert.match(planSkill, /--deep/);
  assert.match(planSkill, /must not skip.*Discover.*Technical Stack.*Architecture.*Decompose.*Generate|不得跳过.*Discover.*Technical Stack.*Architecture.*Decompose.*Generate/is);

  assert.match(planCommand, /--deep/);
  assert.match(planCommand, /route.*\/hw:plan:deep|\/hw:plan:deep.*route/is);
  assert.match(commandsSpec, /--deep/);
  assert.match(commandsSpec, /ordinary `\/hw:plan`.*Discover.*Technical Stack.*Architecture.*Decompose.*Generate/is);
});
