import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { ASK_QUESTIONS_GUIDANCE } from "../src/artifacts/agent-guidance.js";
import { commandMap } from "../src/commands/index.js";

const AUDIT_SPEC = "references/audit-spec.md";
const AUDIT_SKILL = "skills/audit/SKILL.md";
const QUALITY_SPEC = "references/quality-spec.md";
const QUALITY_SKILL = "skills/quality/SKILL.md";
const QUALITY_COMMAND = "commands/quality.md";
const OPTIMIZE_SPEC = "references/optimize-spec.md";
const OPTIMIZE_SKILL = "skills/optimize/SKILL.md";
const OPTIMIZE_COMMAND = "commands/optimize.md";
const INTEGRATION_SYNC_SPEC = "references/integration-sync-spec.md";

test("/hw:audit is Intake-first and uses the C18 engineering audit model", async () => {
  const audit = await readCombined([AUDIT_SPEC, AUDIT_SKILL]);

  assert.match(audit, /intake[- ]first/i);
  for (const term of [
    "GQM",
    "ISO/IEC 25010",
    "ATAM-lite",
    "SWEBOK",
    "Experience",
    "Engineering",
    "Risk",
    "Critical",
    "blocking",
    "Action Queue",
  ]) {
    assert.match(audit, new RegExp(escapeRegExp(term), "i"), `missing audit term: ${term}`);
  }

  const dimensionsTable = sectionAfterHeading(audit, "Audit Dimensions", 1200);
  for (const oldDimension of [
    "Security",
    "Bugs",
    "Architecture",
    "Performance",
    "Test Coverage",
    "Code Quality",
  ]) {
    assert.doesNotMatch(
      dimensionsTable,
      new RegExp(`^\\s*\\|\\s*${escapeRegExp(oldDimension)}\\s*\\|`, "im"),
      `${oldDimension} must not remain a top-level Audit Dimensions table row`,
    );
  }
});

test("/hw:quality is a first-class scorecard command with gate and report contracts", async () => {
  assertCommand("/hw:quality", {
    opencode: "/hw:quality",
    skill: QUALITY_SKILL,
  });
  for (const file of [QUALITY_SPEC, QUALITY_SKILL, QUALITY_COMMAND]) {
    assert.ok(existsSync(file), `missing /hw:quality file: ${file}`);
  }

  const quality = await readCombined([QUALITY_SPEC, QUALITY_SKILL, QUALITY_COMMAND]);
  for (const term of [
    "scorecard",
    "baseline",
    "compare",
    "review",
    "action queue",
    "1-5",
    "Overall >= 4",
    "core dimensions",
  ]) {
    assert.match(quality, new RegExp(escapeRegExp(term), "i"), `missing quality term: ${term}`);
  }
});

test("/hw:optimize is a first-class closed-loop command with safety handoffs", async () => {
  assertCommand("/hw:optimize", {
    opencode: "/hw:optimize",
    skill: OPTIMIZE_SKILL,
  });
  for (const file of [OPTIMIZE_SPEC, OPTIMIZE_SKILL, OPTIMIZE_COMMAND]) {
    assert.ok(existsSync(file), `missing /hw:optimize file: ${file}`);
  }

  const optimize = await readCombined([OPTIMIZE_SPEC, OPTIMIZE_SKILL, OPTIMIZE_COMMAND]);
  assert.match(optimize, /Audit\s*\+\s*Quality[\s\S]{0,160}Implement\/Test[\s\S]{0,160}Audit\s*\+\s*Quality/i);
  for (const term of ["backup", "correctness", "budget", "validation path", "Patch", "Plan", "handoff"]) {
    assert.match(optimize, new RegExp(escapeRegExp(term), "i"), `missing optimize term: ${term}`);
  }
});

test("integration sync is a release workflow spec and not a user command", async () => {
  assert.ok(existsSync(INTEGRATION_SYNC_SPEC), `missing integration sync spec: ${INTEGRATION_SYNC_SPEC}`);

  const integrationSync = await readFile(INTEGRATION_SYNC_SPEC, "utf8");
  assert.match(integrationSync, /not a user command|not a user-facing command|not exposed as a command/i);
  for (const term of [
    "source summary",
    "target inspection",
    "gap analysis",
    "target adaptation plan",
    "target validation",
    "target records",
    "source backlink",
  ]) {
    assert.match(integrationSync, new RegExp(escapeRegExp(term), "i"), `missing integration sync term: ${term}`);
  }

  const commands = commandMap("opencode").map((command) => command.canonical);
  assert.ok(!commands.includes("/hw:integrations"), "/hw:integrations must not be a user command");
  assert.ok(!commands.includes("/hw:sync integrations"), "/hw:sync integrations must not be a user command");
});

test("shared Ask guidance requires visible phase artifacts before major Plan confirmation gates", () => {
  assert.match(ASK_QUESTIONS_GUIDANCE, /actual phase artifacts|phase artifacts/i);
  assert.match(ASK_QUESTIONS_GUIDANCE, /before (?:Question Tool|`question`|Ask|confirmation)/i);
  assert.match(ASK_QUESTIONS_GUIDANCE, /explain[\s\S]{0,120}why the decision is needed/i);
  assert.match(ASK_QUESTIONS_GUIDANCE, /what will change for each answer/i);
  assert.match(ASK_QUESTIONS_GUIDANCE, /Never open a bare question card/i);
  for (const gate of ["Discover", "Technical Stack", "Architecture", "Decompose", "Generate"]) {
    assert.match(ASK_QUESTIONS_GUIDANCE, new RegExp(escapeRegExp(gate), "i"), `missing Plan gate: ${gate}`);
  }
});

test("Plan skills require explanation before Question Tool gates and conversation report summaries", async () => {
  const plan = await readCombined([
    "skills/plan/SKILL.md",
    "skills/plan-discover/SKILL.md",
    "skills/plan-decompose/SKILL.md",
    "skills/plan-generate/SKILL.md",
  ]);
  assert.match(plan, /调用 Question Tool \/ Ask 之前[\s\S]{0,120}解释|Question Tool \/ Ask 之前[\s\S]{0,120}解释/i);
  assert.match(plan, /为什么.*需要.*决定|为什么.*需要.*确认/);
  assert.match(plan, /不同选项会改变什么|确认\/要求修改分别会改变什么/);
  assert.match(plan, /不得只说.*已写入|不得只给 `?\.pipeline\//);
});

function assertCommand(canonical, expected) {
  const command = commandMap("opencode").find((item) => item.canonical === canonical);
  assert.ok(command, `missing commandMap entry: ${canonical}`);
  assert.equal(command.opencode, expected.opencode);
  assert.equal(command.skill, expected.skill);
}

async function readCombined(files) {
  const contents = await Promise.all(files.map((file) => readFile(file, "utf8")));
  return contents.join("\n\n");
}

function sectionAfterHeading(markdown, heading, limit) {
  const match = markdown.match(new RegExp(`^#{1,4}\\s+${escapeRegExp(heading)}\\s*$`, "im"));
  if (!match) {
    assert.fail(`missing heading: ${heading}`);
  }
  return markdown.slice(match.index, match.index + limit);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
