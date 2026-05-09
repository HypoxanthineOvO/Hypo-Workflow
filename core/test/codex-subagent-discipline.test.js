import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT_SKILL = "SKILL.md";
const START_SKILL = "skills/start/SKILL.md";
const RESUME_SKILL = "skills/resume/SKILL.md";
const PATCH_SKILL = "skills/patch/SKILL.md";
const HELP_SKILL = "skills/help/SKILL.md";
const SETUP_SKILL = "skills/setup/SKILL.md";
const SUBAGENT_SPEC = "references/subagent-spec.md";
const CODEX_PLATFORM = "references/platform-codex.md";

test("shared execution guidance strongly encourages Codex subagents without external model routing", async () => {
  const root = await readFile(ROOT_SKILL, "utf8");
  const codex = await readFile(CODEX_PLATFORM, "utf8");
  const combined = `${root}\n${codex}`;

  assert.match(combined, /Codex Subagents are Codex\/GPT runtime workers/i);
  assert.match(combined, /must not require .*external model routing/i);
  assert.match(combined, /strongly prefer[s]? concrete Subagent delegation/i);
  assert.match(combined, /record a concise reason/i);
});

test("start and resume use platform-neutral orchestration language", async () => {
  const start = await readFile(START_SKILL, "utf8");
  const resume = await readFile(RESUME_SKILL, "utf8");
  const shared = `${start}\n${resume}`;

  assert.doesNotMatch(shared, /Treat Claude as the orchestrator/i);
  assert.doesNotMatch(shared, /Claude coordinates/i);
  assert.match(shared, /main agent coordinates/i);
  assert.match(shared, /Codex.*Subagent/i);
});

test("subagent policy separates implementation from validation and keeps aliases compatible", async () => {
  const spec = await readFile(SUBAGENT_SPEC, "utf8");

  assert.match(spec, /Implementation and validation separation/i);
  assert.match(spec, /implementation Subagent/i);
  assert.match(spec, /test\/review Subagent/i);
  assert.match(spec, /same Subagent instance must not author and certify the same change/i);
  assert.match(spec, /at least two workers/i);
  assert.match(spec, /closed-loop evidence/i);
  assert.match(spec, /proposer\/challenger/i);
  assert.match(spec, /non-delegation rationale/i);

  for (const alias of ["codex", "claude", "auto"]) {
    assert.match(spec, new RegExp(`\\b${alias}\\b`));
  }
});

test("strict worker separation hides test source from implementation workers and records degraded mode", async () => {
  const spec = await readFile(SUBAGENT_SPEC, "utf8");
  const fullDelegation = await readFile("templates/subagent/full-delegation.md", "utf8");
  const start = await readFile(START_SKILL, "utf8");
  const combined = `${spec}\n${fullDelegation}\n${start}`;

  assert.match(combined, /implementation Subagent.*must not read test source/i);
  assert.match(combined, /fixtures.*snapshot.*assertion/i);
  assert.match(combined, /test command.*pass\/fail.*sanitized failure summary/i);
  assert.match(combined, /degraded mode/i);
  assert.match(combined, /explicit user confirmation/i);
  assert.match(combined, /role.*isolation.*degradation/i);
});

test("patch lane preserves lightweight scope while allowing independent review help", async () => {
  const patch = await readFile(PATCH_SKILL, "utf8");

  assert.match(patch, /Patch fix is a lightweight execution lane/i);
  assert.match(patch, /review\/test Subagent/i);
  assert.match(patch, /must not be the same delegated worker session/i);
  assert.match(patch, /implementation and validation separated/i);
  assert.match(patch, /must never write `\.pipeline\/state\.yaml`/i);
});

test("setup and help do not route Codex Subagents to external providers", async () => {
  const help = await readFile(HELP_SKILL, "utf8");
  const setup = await readFile(SETUP_SKILL, "utf8");
  const combined = `${help}\n${setup}`;

  assert.match(help, /39 user-facing Hypo-Workflow commands/i);
  assert.match(combined, /Codex Subagents are Codex\/GPT runtime workers/i);
  assert.doesNotMatch(combined, /Codex can configure Claude as the subagent provider/i);
  assert.doesNotMatch(combined, /configure Claude as a subagent/i);
  assert.doesNotMatch(combined, /subagent\.provider=claude/i);
});
