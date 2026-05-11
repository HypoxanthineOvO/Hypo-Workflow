import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { commandMap } from "../src/commands/index.js";

const SPEC_FILE = "references/skill-spec.md";

test("skill spec documents required sections and quality contract", async () => {
  const spec = await readFile(SPEC_FILE, "utf8");

  for (const heading of [
    "# Skill Spec",
    "## Goals",
    "## Inventory",
    "## Directory and Naming",
    "## Required SKILL.md Format",
    "## Platform Mapping",
    "## Quality Checklist",
    "## Current Audit Findings",
    "## External References",
  ]) {
    assert.match(spec, new RegExp(`^${escapeRegExp(heading)}$`, "m"));
  }

  for (const requiredPhrase of [
    "39 local Skill files",
    "37 user-facing Skill paths",
    "40 user-facing commands",
    "watchdog",
    "internal",
    "no merge or delete",
    "Output Language Rules",
    "Preconditions",
    "Execution Flow",
    "Reference Files",
  ]) {
    assert.match(spec, new RegExp(escapeRegExp(requiredPhrase), "i"));
  }
});

test("skill spec keeps command map and local skill inventory traceable", async () => {
  const spec = await readFile(SPEC_FILE, "utf8");
  const commands = commandMap("opencode");
  const userSkillPaths = [...new Set(commands.map((command) => command.skill))];

  assert.equal(commands.length, 40);
  assert.equal(userSkillPaths.length, 37);

  for (const skillPath of userSkillPaths) {
    assert.ok(existsSync(skillPath), `command map references missing skill: ${skillPath}`);
    assert.match(spec, new RegExp(escapeRegExp(skillPath)));
  }

  assert.match(spec, /skills\/watchdog\/SKILL\.md/);
  assert.match(spec, /cron-only/i);
});

test("skill spec records known audit findings and external references", async () => {
  const spec = await readFile(SPEC_FILE, "utf8");

  for (const reference of [
    "Oh My OpenAgent",
    "SuperSkills",
    "Anthropic skill-development",
    "SkillsLLM",
    "SkillsBench",
  ]) {
    assert.match(spec, new RegExp(escapeRegExp(reference), "i"));
  }

  assert.match(spec, /skills\/showcase\/SKILL\.md/);
  assert.match(spec, /\/hw:review/);
  assert.match(spec, /V7/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
