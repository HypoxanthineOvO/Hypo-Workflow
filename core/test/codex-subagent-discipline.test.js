import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import {
  assessExecutionEvidence,
  selectExecutionTopology,
} from "../src/index.js";

const ROOT_SKILL = "SKILL.md";
const START_SKILL = "skills/start/SKILL.md";
const RESUME_SKILL = "skills/resume/SKILL.md";
const PLAN_SKILL = "skills/plan/SKILL.md";
const PATCH_SKILL = "skills/patch/SKILL.md";
const HELP_SKILL = "skills/help/SKILL.md";
const SETUP_SKILL = "skills/setup/SKILL.md";
const SUBAGENT_SPEC = "references/subagent-spec.md";
const CODEX_PLATFORM = "references/platform-codex.md";

function topologyInput(overrides = {}) {
  return {
    task_kind: "engineering",
    change_size: "material",
    reversible: true,
    policy: { profile: "auto", allow_solo_verified: false },
    ...overrides,
  };
}

function workerEvidence(role, workerId) {
  return {
    role,
    worker_id: workerId,
    status: "completed",
    evidence_refs: [{
      type: "file",
      path: `.pipeline/reviews/workers/${role}.txt`,
      digest: `sha256:${"0".repeat(64)}`,
    }],
  };
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

test("execution topology selects strict, solo, migration, and custom worker policies", () => {
  const strict = selectExecutionTopology(topologyInput());
  assert.equal(strict.profile, "strict");
  assert.deepEqual(strict.required_roles, ["test", "implement", "audit"]);
  assert.equal(strict.separation_required, true);
  assert.deepEqual(strict.identity_constraints, [
    ["test", "implement"],
    ["test", "audit"],
    ["implement", "audit"],
  ]);

  const solo = selectExecutionTopology(topologyInput({
    change_size: "trivial",
    policy: { profile: "solo-verified", allow_solo_verified: true },
  }));
  assert.equal(solo.profile, "solo-verified");
  assert.deepEqual(solo.required_roles, ["implement"]);
  assert.equal(solo.separation_required, false);

  const migration = selectExecutionTopology(topologyInput({
    task_kind: "migration",
    reversible: false,
  }));
  assert.equal(migration.profile, "migration");
  assert.deepEqual(migration.required_roles, ["extractor", "curator", "auditor", "deterministic-writer"]);

  const custom = selectExecutionTopology(topologyInput({
    policy: { profile: "custom", allow_solo_verified: false },
    custom_roles: ["proposer", "challenger"],
  }));
  assert.equal(custom.profile, "custom");
  assert.deepEqual(custom.required_roles, ["proposer", "challenger"]);
  assert.equal(custom.separation_required, true);
});

test("execution evidence enforces selected role coverage and distinct identities", () => {
  const strict = selectExecutionTopology(topologyInput());
  const complete = assessExecutionEvidence({
    topology: strict,
    evidence: [
      workerEvidence("test", "worker-test"),
      workerEvidence("implement", "worker-implement"),
      workerEvidence("audit", "worker-audit"),
    ],
  });
  assert.equal(complete.ready, true);
  assert.deepEqual(complete.roles, ["test", "implement", "audit"]);

  const collision = assessExecutionEvidence({
    topology: strict,
    evidence: [
      workerEvidence("test", "shared-worker"),
      workerEvidence("implement", "shared-worker"),
      workerEvidence("audit", "worker-audit"),
    ],
  });
  assert.equal(collision.ready, false);
  assert.match(collision.identity_collisions.join("\n"), /test and implement share worker identity/);

  const missing = assessExecutionEvidence({
    topology: strict,
    evidence: [workerEvidence("test", "worker-test")],
  });
  assert.equal(missing.ready, false);
  assert.deepEqual(missing.missing_roles, ["implement", "audit"]);

  const solo = selectExecutionTopology(topologyInput({
    change_size: "trivial",
    policy: { profile: "solo-verified", allow_solo_verified: true },
  }));
  assert.equal(assessExecutionEvidence({
    topology: solo,
    evidence: [workerEvidence("implement", "solo-worker")],
  }).ready, true);
});

test("Plan and Resume reference topology policy and worker lifecycle without duplicating a fixed topology", async () => {
  const plan = await readFile(PLAN_SKILL, "utf8");
  const resume = await readFile(RESUME_SKILL, "utf8");

  assert.match(plan, /Material execution selects `off`, `recommended`, or `strict` worker separation/i);
  assert.match(plan, /distinct identities when required/i);
  assert.match(plan, /requested -> started -> completed\|failed\|blocked -> closed\|close_failed evidence/i);
  assert.match(plan, /Degraded mode requires user confirmation and a non-delegation rationale/i);
  assert.match(resume, /For worker-separated work, preserve requested -> started -> completed\|failed\|blocked -> closed\|close_failed evidence and distinct identities/i);
  assert.match(resume, /close\/release workers it opened or record `close_failed`/i);
  assert.match(resume, /incomplete lifecycle evidence blocks worker-separated completion/i);
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

  assert.match(help, /53 user-facing Hypo-Workflow commands/i);
  assert.match(combined, /Codex Subagents are Codex\/GPT runtime workers|Codex Subagents 是 Codex\/GPT 运行时工作者/i);
  assert.doesNotMatch(combined, /Codex can configure Claude as the subagent provider/i);
  assert.doesNotMatch(combined, /configure Claude as a subagent/i);
  assert.doesNotMatch(combined, /subagent\.provider=claude/i);
});
