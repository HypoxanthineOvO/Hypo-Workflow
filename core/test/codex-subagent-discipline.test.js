import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const ROOT_SKILL = "SKILL.md";
const START_SKILL = "skills/start/SKILL.md";
const RESUME_SKILL = "skills/resume/SKILL.md";
const PLAN_SKILL = "skills/plan/SKILL.md";
const PLAN_GENERATE_SKILL = "skills/plan-generate/SKILL.md";
const PROMPT_TEMPLATE = "plan/assets/prompt-template.md";
const PATCH_SKILL = "skills/patch/SKILL.md";
const DEBUG_SKILL = "skills/debug/SKILL.md";
const AUDIT_SKILL = "skills/audit/SKILL.md";
const HELP_SKILL = "skills/help/SKILL.md";
const SETUP_SKILL = "skills/setup/SKILL.md";
const SUBAGENT_SPEC = "references/subagent-spec.md";
const CODEX_PLATFORM = "references/platform-codex.md";

function assertLifecycleContract(content, label) {
  assert.match(content, /requested/i, `${label}: missing requested lifecycle state`);
  assert.match(content, /started/i, `${label}: missing started lifecycle state`);
  assert.match(content, /completed\|failed\|blocked|completed\/failed\/blocked|`completed`, `failed`, or `blocked`/i, `${label}: missing terminal worker task states`);
  assert.match(content, /closed\|close_failed|closed\/close_failed|closed`\/released|`closed` or `close_failed`/i, `${label}: missing close lifecycle states`);
  assert.match(content, /wait|等待|must wait/i, `${label}: missing wait requirement`);
  assert.match(content, /close\/release|closed\/released|关闭|close_failed/i, `${label}: missing close/release requirement`);
  assert.match(content, /close_failed/i, `${label}: missing close_failed handling`);
}

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
  assert.match(spec, /Authorization Before Role-Sensitive Work/i);
  assert.match(spec, /must not implement, write tests, review tests, debug, audit, or plan locally first/i);

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
  assert.match(patch, /must preserve real `implement`, `test`, and `audit` worker separation/i);
  assert.match(patch, /distinct `test`, `implement`, and `audit` worker identities/i);
  assert.match(patch, /`test`: owns reproduction, failure evidence, test design, and any test\/fixture\/assertion\/snapshot edits/i);
  assert.match(patch, /`implement`: owns only production\/runtime\/documentation implementation edits/i);
  assert.match(patch, /must not create, edit, or rewrite tests, fixtures, snapshots, or assertions/i);
  assert.match(patch, /never let the `implement` worker spawn or impersonate the `test` or `audit` worker/i);
  assert.match(patch, /must not satisfy more than one of `implement`, `test`, and `audit`/i);
  assert.match(patch, /on Codex, ask for explicit user authorization.*distinct `test`, `implement`, and `audit` subworkers before editing code\/test files/i);
  assert.match(patch, /\/hw:patch fix.*not enough authorization/i);
  assert.match(patch, /Claude Code and OpenCode.*no extra subworker authorization gate/i);
  assert.match(patch, /worker has a lifecycle: record `requested`, `started`, `completed\|failed\|blocked`, and `closed`\/released state/i);
  assert.match(patch, /must wait for each Patch worker needed for the next gate, close\/release completed workers/i);
  assert.match(patch, /unresolved worker lifecycle means the Patch cannot auto-close/i);
  assert.match(patch, /before editing code or tests/i);
  assert.match(patch, /non-delegation rationale/i);
  assert.match(patch, /must never write `\.pipeline\/state\.yaml`/i);
  assert.doesNotMatch(patch, /`test_review` worker/i);
});

test("role-sensitive commands resolve worker authorization before local fallback", async () => {
  const start = await readFile(START_SKILL, "utf8");
  const resume = await readFile(RESUME_SKILL, "utf8");
  const debug = await readFile(DEBUG_SKILL, "utf8");
  const audit = await readFile(AUDIT_SKILL, "utf8");
  const plan = await readFile(PLAN_SKILL, "utf8");
  const codex = await readFile(CODEX_PLATFORM, "utf8");
  const combined = `${start}\n${resume}\n${debug}\n${audit}\n${plan}\n${codex}`;

  assert.match(codex, /Developer Instruction Authorization Gate/i);
  assert.match(combined, /before role-sensitive worker-separated work begins/i);
  assert.match(combined, /before resuming role-sensitive worker-separated work/i);
  assert.match(combined, /before role-sensitive reproduction, auto-fix implementation, or validation work starts/i);
  assert.match(combined, /audit worker must be independent from the worker that implemented/i);
  assert.match(combined, /Codex.*plan-time authorization.*saved scope explicitly includes/is);
  assert.match(combined, /P1 Discover has a mandatory execution subworker authorization gate before decomposition/is);
  assert.match(combined, /\/hw:plan.*authorization before spawning/is);
  assert.match(combined, /P1.*ask.*execution subworker authorization.*P2/is);
  assert.match(combined, /whenever .*authorization scope.*missing/is);
  assert.match(combined, /user-confirmed downgrade evidence/i);
  assert.match(combined, /must not default to `recommended`|do not silently downgrade to `off`/i);
  assert.match(combined, /Claude Code and OpenCode.*no extra subworker authorization gate/is);
  assert.match(combined, /subcodex.*subclaude/is);
  assert.match(combined, /do not .*locally first/i);
  assert.match(combined, /write_tests.*review_tests.*independent `test` worker/is);
  assert.match(combined, /`implement`.*implementation edits/is);
  assert.match(combined, /`audit`.*final diff/is);
  assert.match(combined, /`test` worker owns reproduction, red tests, validation commands, fixtures, snapshots, assertions, and test evidence/is);
  assert.match(combined, /`implement` worker owns only production\/runtime\/documentation implementation/is);
  assert.match(combined, /must not create, edit, or rewrite tests, fixtures, snapshots, assertions, or validation evidence/is);
  assert.match(combined, /must not spawn or impersonate `test` or `audit`/is);
  assert.match(combined, /main agent must not implement locally first/is);
  assert.match(combined, /objective subworker-unavailable evidence may justify `retry`, `deferred`, `stop`/is);
  assert.match(combined, /continue locally only after.*explicit downgrade confirmation/is);
  assert.match(combined, /recommended.*must block.*must not count as accepted worker-separated completion/is);
  assert.match(combined, /default spawned workers may (?:write|edit).*`\.pipeline\/`.*README\.md.*CHANGELOG\.md.*PROJECT-SUMMARY\.md/is);
  assert.match(combined, /role-specific explicit scope.*test.*fixture.*snapshot.*assertion/is);
  assert.match(combined, /role-specific explicit scope.*implement.*production\/runtime\/documentation/is);
  assert.match(combined, /out-of-scope.*stop.*report/is);
  assert.match(combined, /record every worker lifecycle as `requested`, `started`, `completed\|failed\|blocked`, and `closed\|close_failed`/is);
  assert.match(combined, /close\/release any workers it opened or record `close_failed`/is);
  assert.match(combined, /incomplete, missing, or `close_failed` worker lifecycle evidence blocks worker-separated completion/is);
  assert.match(combined, /review_tests.*step/i);
  assert.doesNotMatch(combined, /`test_review` worker/i);
});

test("plan resume debug and patch share subworker lifecycle contract", async () => {
  const start = await readFile(START_SKILL, "utf8");
  const plan = await readFile(PLAN_SKILL, "utf8");
  const resume = await readFile(RESUME_SKILL, "utf8");
  const debug = await readFile(DEBUG_SKILL, "utf8");
  const patch = await readFile(PATCH_SKILL, "utf8");
  const spec = await readFile(SUBAGENT_SPEC, "utf8");
  const combined = `${start}\n${plan}\n${resume}\n${debug}\n${patch}\n${spec}`;

  assert.match(spec, /## Worker Lifecycle/);
  assertLifecycleContract(spec, "subagent spec");
  assertLifecycleContract(start, "start");
  assertLifecycleContract(plan, "plan");
  assertLifecycleContract(resume, "resume");
  assertLifecycleContract(debug, "debug");
  assertLifecycleContract(patch, "patch");
  assert.match(combined, /\/hw:plan.*\/hw:start.*\/hw:resume.*\/hw:debug.*\/hw:patch fix/is);
  assert.match(combined, /requested.*started.*completed\|failed\|blocked.*closed\|close_failed/is);
  assert.match(plan, /Plan-time Subagents, reviewers, challengers, and validators have the same lifecycle contract/i);
  assert.match(plan, /P4 Confirm must surface it as a blocking or degraded evidence item/i);
  assert.match(start, /when `\/hw:start` stops, blocks, aborts, or completes, close\/release any workers it opened/i);
  assert.match(start, /incomplete, missing, or `close_failed` worker lifecycle evidence blocks worker-separated completion/i);
  assert.match(resume, /when `\/hw:resume` stops, blocks, aborts, or completes, close\/release any workers it opened/i);
  assert.match(debug, /the main agent owns worker lifecycle/i);
  assert.match(debug, /Before leaving the debug turn, close\/release any workers opened by debug/i);
  assert.match(patch, /未 wait、未 close\/release、未记录生命周期状态就宣称 Patch 完成/);
});

test("plan generate pre-assigns subworker tasks in prompts before execution", async () => {
  const plan = await readFile(PLAN_SKILL, "utf8");
  const generate = await readFile(PLAN_GENERATE_SKILL, "utf8");
  const spec = await readFile(SUBAGENT_SPEC, "utf8");
  const template = await readFile(PROMPT_TEMPLATE, "utf8");
  const combined = `${plan}\n${generate}\n${spec}\n${template}`;

  assert.match(combined, /Subworker Assignment Plan/);
  assert.match(template, /## Subworker Assignment Plan/);
  assert.match(template, /status: blocked_until_authorized/i);
  assert.match(template, /must not write red tests or implementation locally/i);
  assert.match(combined, /pre-assign[s]? exactly three worker roles: `test`, `implement`, and `audit`/i);
  assert.match(combined, /before any implementation steps/i);
  assert.match(combined, /same worker identity must not satisfy both `(?:implement` and `test|test` and `implement)`/i);
  assert.match(combined, /`test` owns red-test\/reproduction\/test fixture\/assertion\/snapshot edits/i);
  assert.match(combined, /`implement` must not create, edit, or rewrite those test assets/i);
  assert.match(combined, /`implement` must not spawn, impersonate, or satisfy `test` or `audit`/i);
  assert.match(combined, /worker lifecycle evidence requirements: requested, started, completed\/failed\/blocked, and closed\/close_failed/i);
  assert.match(combined, /blocked_until_authorized/i);
  assert.match(combined, /Missing Codex authorization.*must not remove the `test` \/ `implement` \/ `audit` role plan/is);
  assert.match(combined, /root-level non-project documentation such as `README\.md`, `CHANGELOG\.md`, and `PROJECT-SUMMARY\.md`/i);
  assert.match(combined, /role-specific explicit scope may authorize the `test` worker/is);
  assert.match(combined, /role-specific explicit scope may authorize.*`implement` worker/is);
  assert.match(combined, /must not edit project source, tests, fixtures, runtime code, package manifests, generated adapters, rules, skills, templates, or config outside `\.pipeline\/` unless that exact path is included in the role-specific explicit scope/is);
  assert.doesNotMatch(combined, /test` (?:can|may|edits?) (?:edit|write) only tests/i);
  assert.doesNotMatch(combined, /implement` (?:can|may|edits?) (?:edit|write) (?:only )?(?:production|non-test implementation)/i);
  assert.doesNotMatch(combined, /`test_review` role/i);
  assert.match(combined, /`review_tests`.*`test` worker role/is);
});

test("legacy worker-separation phrases do not remain in repository text", async () => {
  const legacyPattern = [
    "test_review worker",
    "test_review subworker",
    "test_review role",
    "six-step patch lane",
    "six-step lane",
    "explicit test and audit subworkers",
    "implement owns code or test edit",
    "`implement`: owns the code or test edit",
    "native `test` worker evidence",
  ].join("|");
  const matches = await findTextMatches(".", new RegExp(legacyPattern, "i"), {
    excludeFiles: new Set(["core/test/codex-subagent-discipline.test.js"]),
  });
  assert.deepEqual(matches, []);
});

async function findTextMatches(root, pattern, options = {}) {
  const matches = [];
  const excludedDirs = new Set([
    ".git",
    "node_modules",
    ".venv",
    "dist",
    "coverage",
  ]);
  const excludeFiles = options.excludeFiles || new Set();

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const path = dir === "." ? entry.name : `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!excludedDirs.has(entry.name)) {
          await walk(path);
        }
        continue;
      }
      if (!entry.isFile() || excludeFiles.has(path)) continue;
      let content = "";
      try {
        content = await readFile(path, "utf8");
      } catch {
        continue;
      }
      if (pattern.test(content)) {
        matches.push(path);
      }
    }
  }

  await walk(root);
  return matches.sort();
}

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
