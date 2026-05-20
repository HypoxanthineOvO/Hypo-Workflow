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
  assert.match(shared, /main agent coordinates|主代理协调/i);
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

  assert.match(patch, /Patch fix is a lightweight execution lane|Patch 修复是轻量级执行通道/i);
  assert.match(patch, /must preserve real `implement`, `test`, and `audit` worker separation|必须保留真实的 `implement`、`test` 和 `audit` Worker Separation/i);
  assert.match(patch, /distinct `test`, `implement`, and `audit` worker identities|需要三个不同的 worker 身份/i);
  assert.match(patch, /`test`: owns reproduction, failure evidence, test design, and any test\/fixture\/assertion\/snapshot edits|`test`：负责复现、失败证据、测试设计，以及在实现开始前的任何测试\/fixture\/assertion\/snapshot 编辑/i);
  assert.match(patch, /`implement`: owns only production\/runtime\/documentation implementation edits|`implement`：仅负责生产\/运行时\/文档实现编辑/i);
  assert.match(patch, /must not create, edit, or rewrite tests, fixtures, snapshots, or assertions|不得创建、编辑或重写测试、fixture、snapshot 或 assertion/i);
  assert.match(patch, /never let the `implement` worker spawn or impersonate the `test` or `audit` worker|绝不允许 `implement` worker 生成或冒充 `test` 或 `audit` worker/i);
  assert.match(patch, /must not satisfy more than one of `implement`, `test`, and `audit`|不得同时满足 `implement`、`test` 和 `audit` 中的多个角色/i);
  assert.match(patch, /on Codex, ask for explicit user authorization.*distinct `test`, `implement`, and `audit` subworkers before editing code\/test files|在 Codex 上，编辑代码\/测试文件前需要请求用户明确授权使用独立的 `test`、`implement` 和 `audit` subworker/i);
  assert.match(patch, /\/hw:patch fix.*not enough authorization|仅调用 `\/hw:patch fix` 本身不构成足够授权/i);
  assert.match(patch, /Claude Code and OpenCode.*no extra subworker authorization gate|在 Claude Code 和 OpenCode 上，已配置的 subworker 不需要额外的授权门禁/i);
  assert.match(patch, /worker has a lifecycle: record `requested`, `started`, `completed\|failed\|blocked`, and `closed`\/released state|记录 `requested`、`started`、`completed\|failed\|blocked` 和 `closed`\/released 状态/i);
  assert.match(patch, /must wait for each Patch worker needed for the next gate, close\/release completed workers|必须等待下一个门禁所需的每个 Patch worker.*关闭\/释放已完成的 worker/i);
  assert.match(patch, /unresolved worker lifecycle means the Patch cannot auto-close|未解决的 worker 生命周期意味着 Patch 无法自动关闭/i);
  assert.match(patch, /before editing code or tests|编辑代码\/测试文件前/i);
  assert.match(patch, /non-delegation rationale|非委托理由/i);
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
  assert.match(combined, /before role-sensitive worker-separated work begins|在角色敏感的 Worker Separation 工作开始之前/i);
  assert.match(combined, /before resuming role-sensitive worker-separated work|在恢复角色敏感的 Worker Separation 工作之前/i);
  assert.match(combined, /before role-sensitive reproduction, auto-fix implementation, or validation work starts|在角色敏感的复现、自动修复实现或验证工作开始前/i);
  assert.match(combined, /audit worker must be independent from the worker that implemented|audit worker 必须独立于实现被审计更改的 worker/i);
  assert.match(combined, /Codex.*plan-time authorization.*saved scope explicitly includes|Codex plan-time authorization can carry into execution only when its saved scope explicitly includes|在 Codex 上，计划时授权仅在其保存的范围明确包含/is);
  assert.match(combined, /P1 Discover has a mandatory execution subworker authorization gate before decomposition|P1 Discover 在分解之前有一个强制的执行子工作器授权门控/is);
  assert.match(combined, /\/hw:plan.*authorization before spawning|\/hw:plan.*授权/is);
  assert.match(combined, /P1.*ask.*execution subworker authorization.*P2|P1.*执行子工作器授权.*P2/is);
  assert.match(combined, /whenever .*authorization scope.*missing|授权范围.*缺失/is);
  assert.match(combined, /user-confirmed downgrade evidence|用户确认降级证据/i);
  assert.match(combined, /must not default to `recommended`|do not silently downgrade to `off`/i);
  assert.match(combined, /Claude Code and OpenCode.*no extra subworker authorization gate|Claude Code 和 OpenCode.*不需要额外的子工作者授权门控|Claude Code 和 OpenCode.*不需要额外的授权门禁/is);
  assert.match(combined, /subcodex.*subclaude/is);
  assert.match(combined, /do not .*locally first/i);
  assert.match(combined, /write_tests.*review_tests.*independent `test` worker|`write_tests` 和 `review_tests` 属于独立的 `test` 工作者/is);
  assert.match(combined, /`implement`.*implementation edits|`implement`.*实现编辑/is);
  assert.match(combined, /`audit`.*final diff|`audit`.*最终差异/is);
  assert.match(combined, /`test` worker owns reproduction, red tests, validation commands, fixtures, snapshots, assertions, and test evidence|`test` 工作者拥有复现、红色测试、验证命令、夹具、快照、断言和测试证据/is);
  assert.match(combined, /`implement` worker owns only production\/runtime\/documentation implementation|`implement` 工作者仅拥有生产\/运行时\/文档实现/is);
  assert.match(combined, /must not create, edit, or rewrite tests, fixtures, snapshots, assertions, or validation evidence|不得创建、编辑或重写测试、夹具、快照、断言或验证证据/is);
  assert.match(combined, /must not spawn or impersonate `test` or `audit`|不得生成或冒充 `test` 或 `audit`/is);
  assert.match(combined, /main agent must not implement locally first|主代理不得先在本地实现/is);
  assert.match(combined, /objective subworker-unavailable evidence may justify `retry`, `deferred`, `stop`|客观的子工作者不可用证据可能证明 `retry`、`deferred`、`stop`/is);
  assert.match(combined, /continue locally only after.*explicit downgrade confirmation|仅在.*明确降级确认.*继续在本地进行/is);
  assert.match(combined, /recommended.*must block.*must not count as accepted worker-separated completion|`recommended` 必须阻塞.*不得被视为已接受的 Worker Separation 完成/is);
  assert.match(combined, /default spawned workers may (?:write|edit).*`\.pipeline\/`.*README\.md.*CHANGELOG\.md.*PROJECT-SUMMARY\.md|默认生成的工作者只能编辑 `\.pipeline\/`.*README\.md.*CHANGELOG\.md.*PROJECT-SUMMARY\.md/is);
  assert.match(combined, /role-specific explicit scope.*test.*fixture.*snapshot.*assertion|角色的明确范围.*test.*夹具.*快照.*断言/is);
  assert.match(combined, /role-specific explicit scope.*implement.*production\/runtime\/documentation|角色的明确范围.*implement.*生产\/运行时\/文档/is);
  assert.match(combined, /out-of-scope.*stop.*report|范围外.*停止.*报告/is);
  assert.match(combined, /record every worker lifecycle as `requested`, `started`, `completed\|failed\|blocked`, and `closed\|close_failed`|将每个工作者生命周期记录为 `requested`、`started`、`completed\|failed\|blocked` 和 `closed\|close_failed`/is);
  assert.match(combined, /close\/release any workers it opened or record `close_failed`|关闭\/释放.*工作者.*记录.*`close_failed`/is);
  assert.match(combined, /incomplete, missing, or `close_failed` worker lifecycle evidence blocks worker-separated completion|不完整、缺失或 `close_failed` 的工作者生命周期证据会阻塞 Worker Separation 完成/is);
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
  assert.match(plan, /Plan-time Subagents, reviewers, challengers, and validators have the same lifecycle contract|计划时的 Subagent、审查者、挑战者和验证者与执行工作器具有相同的生命周期契约/i);
  assert.match(plan, /P4 Confirm must surface it as a blocking or degraded evidence item|P4 Confirm 必须将其作为阻止或降级证据项呈现/i);
  assert.match(start, /when `\/hw:start` stops, blocks, aborts, or completes, close\/release any workers it opened|当 `\/hw:start` 停止、阻塞、中止或完成时，关闭\/释放它打开的任何工作者/i);
  assert.match(start, /incomplete, missing, or `close_failed` worker lifecycle evidence blocks worker-separated completion|不完整、缺失或 `close_failed` 的工作者生命周期证据会阻塞 Worker Separation 完成/i);
  assert.match(resume, /when `\/hw:resume` stops, blocks, aborts, or completes, close\/release any workers it opened|当 `\/hw:resume` 停止、阻塞、中止或完成时，关闭\/释放它打开的任何工作者/i);
  assert.match(debug, /the main agent owns worker lifecycle|主代理拥有 Worker 生命周期/i);
  assert.match(debug, /Before leaving the debug turn, close\/release any workers opened by debug|在离开调试轮次前，关闭\/释放调试打开的任何 Worker/i);
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
  assert.match(combined, /pre-assign[s]? exactly three worker roles: `test`, `implement`, and `audit`|预先分配恰好三个工作器角色：`test`、`implement` 和 `audit`/i);
  assert.match(combined, /before any implementation steps|在任何实现步骤之前|在实现步骤之前/i);
  assert.match(combined, /same worker identity must not satisfy both `(?:implement` and `test|test` and `implement)|同一工作器身份不得同时满足 `test` 和 `implement`/i);
  assert.match(combined, /`test` owns red-test\/reproduction\/test fixture\/assertion\/snapshot edits|声明 `test` 拥有红色测试\/复现\/测试夹具\/断言\/快照编辑/i);
  assert.match(combined, /`implement` must not create, edit, or rewrite those test assets|`implement` 不得创建、编辑或重写这些测试资产/i);
  assert.match(combined, /`implement` must not spawn, impersonate, or satisfy `test` or `audit`|`implement` 不得生成、模拟或满足 `test` 或 `audit`/i);
  assert.match(combined, /worker lifecycle evidence requirements: requested, started, completed\/failed\/blocked, and closed\/close_failed|工作器生命周期证据要求：.*requested、started、completed\/failed\/blocked 和 closed\/close_failed/i);
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

  assert.match(help, /50 user-facing Hypo-Workflow commands/i);
  assert.match(combined, /Codex Subagents are Codex\/GPT runtime workers|Codex Subagents 是 Codex\/GPT 运行时工作者/i);
  assert.doesNotMatch(combined, /Codex can configure Claude as the subagent provider/i);
  assert.doesNotMatch(combined, /configure Claude as a subagent/i);
  assert.doesNotMatch(combined, /subagent\.provider=claude/i);
});
