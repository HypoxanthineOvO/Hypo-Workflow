import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendDiscussionMessage,
  inspectSemanticWorkflow,
  renderSemanticResumeContext,
  validateSemanticCycle,
} from "../src/semantic-workflow/index.js";
import { evaluateCodexHookEvent } from "../src/codex-hooks/index.js";

const NOW = "2026-08-05T15:30:00.000Z";

test("semantic validation aligns complete Plan and Progress IDs", async (t) => {
  const root = await semanticFixture(t);
  const inspected = await inspectSemanticWorkflow(root, { host: "codex", sessionId: "session-a" });
  assert.equal(inspected.status, "selected");
  assert.equal(inspected.cycle.name, "C001-demo");

  const validation = await validateSemanticCycle(root, "C001-demo");
  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.deepEqual(validation.plan_ids, ["M1", "S1", "M2"]);
  assert.deepEqual(validation.progress_ids, validation.plan_ids);
  assert.equal(validation.current, "M2");
});

test("semantic validation reports a stale Progress table", async (t) => {
  const root = await semanticFixture(t);
  const path = join(root, ".pipeline/cycles/C001-demo/PROGRESS.md");
  const source = await readFile(path, "utf8");
  await writeFile(path, source.replace("| `M2` | 实现", "| `M3` | 实现"), "utf8");

  const validation = await validateSemanticCycle(root, "C001-demo");
  assert.equal(validation.ok, false);
  assert.equal(validation.errors.length > 0, true);
  assert.match(validation.errors.join("\n"), /Progress.*Plan.*ID/i);
});

test("Discussion Ledger appends visible messages, redacts secrets, and deduplicates turns", async (t) => {
  const root = await semanticFixture(t);
  const input = {
    speaker: "user",
    text: "请保留这句原话，token=supersecretvalue123。",
    host: "codex",
    sessionId: "session-a",
    turnId: "turn-user-1",
  };
  const first = await appendDiscussionMessage(root, input, { clock: () => NOW });
  const repeated = await appendDiscussionMessage(root, input, { clock: () => NOW });
  const assistant = await appendDiscussionMessage(root, {
    ...input,
    speaker: "assistant",
    text: "已经记录，并会更新 Progress。",
    turnId: "turn-assistant-1",
  }, { clock: () => NOW });

  assert.equal(first.status, "appended");
  assert.equal(first.redacted, true);
  assert.equal(repeated.status, "deduplicated");
  assert.equal(assistant.status, "appended");
  const ledger = await readFile(join(root, first.path), "utf8");
  assert.match(ledger, /请保留这句原话/);
  assert.match(ledger, /\[REDACTED\]/);
  assert.doesNotMatch(ledger, /supersecretvalue123/);
  assert.equal((ledger.match(/turn:user:turn-user-1/g) || []).length, 1);
  assert.match(ledger, /已经记录，并会更新 Progress/);
  assert.equal(await readFile(join(root, ".pipeline/local/.gitignore"), "utf8"), "*\n");
});

test("semantic resume is bounded, readable, and free of internal protocol", async (t) => {
  const root = await semanticFixture(t);
  const result = await renderSemanticResumeContext(root, { host: "codex", sessionId: "session-a" });
  assert.equal(result.status, "selected");
  assert.match(result.context, /C001-demo/);
  assert.match(result.context, /M2/);
  assert.match(result.context, /实现已开始/);
  assert.match(result.context, /使用语义文件恢复/);
  assert.doesNotMatch(result.context, /Receipt|Recovery Pack|Runtime|Continuation|worker_routing|plan_hash/i);
  assert.ok(Buffer.byteLength(result.context) < 16_000);
});

test("registered Hooks use semantic resume and append both visible speakers", async (t) => {
  const root = await semanticFixture(t);
  const common = {
    session_id: "session-a",
    transcript_path: null,
    cwd: root,
    model: "codex-test",
  };
  const startup = await evaluateCodexHookEvent(root, {
    ...common,
    hook_event_name: "SessionStart",
    permission_mode: "default",
    source: "startup",
  });
  assert.match(startup.hookSpecificOutput.additionalContext, /C001-demo/);

  const prompt = await evaluateCodexHookEvent(root, {
    ...common,
    hook_event_name: "UserPromptSubmit",
    permission_mode: "default",
    turn_id: "turn-hook-user",
    prompt: "用户通过 Hook 说的话。",
  });
  assert.equal(typeof prompt.hookSpecificOutput.additionalContext, "string");
  assert.ok(prompt.hookSpecificOutput.additionalContext.length > 0);

  const stop = await evaluateCodexHookEvent(root, {
    ...common,
    hook_event_name: "Stop",
    permission_mode: "default",
    turn_id: "turn-hook-assistant",
    stop_hook_active: false,
    last_assistant_message: "助手通过 Hook 回复的话。",
  }, { id: "semantic-stop", clock: () => NOW });
  assert.equal(typeof stop.systemMessage, "string");
  assert.ok(stop.systemMessage.length > 0);

  const ledger = await readFile(join(root, ".pipeline/local/discussions/C001-demo/session-a.md"), "utf8");
  assert.match(ledger, /用户通过 Hook 说的话/);
  assert.match(ledger, /助手通过 Hook 回复的话/);
});

test("multiple active Cycles require local Session focus before Discussion writes", async (t) => {
  const root = await semanticFixture(t);
  await addSecondCycle(root);

  const unresolved = await inspectSemanticWorkflow(root, { host: "codex", sessionId: "session-a" });
  assert.equal(unresolved.status, "selection_required");
  const skipped = await appendDiscussionMessage(root, {
    speaker: "user",
    text: "这句话还不能归入任何 Cycle。",
    host: "codex",
    sessionId: "session-a",
    turnId: "turn-unfocused",
  });
  assert.equal(skipped.status, "selection_required");

  const focusRoot = join(root, ".pipeline/local/sessions/codex");
  await mkdir(focusRoot, { recursive: true });
  await writeFile(join(focusRoot, "session-a.yaml"), "cycle: C002-other\nupdated: 2026-08-05T15:30:00Z\n", "utf8");
  const selected = await inspectSemanticWorkflow(root, { host: "codex", sessionId: "session-a" });
  assert.equal(selected.status, "selected");
  assert.equal(selected.cycle.name, "C002-other");

  const appended = await appendDiscussionMessage(root, {
    speaker: "user",
    text: "这句话属于第二个 Cycle。",
    host: "codex",
    sessionId: "session-a",
    turnId: "turn-focused",
  }, { clock: () => NOW });
  assert.equal(appended.cycle, "C002-other");
  assert.match(await readFile(join(root, appended.path), "utf8"), /属于第二个 Cycle/);
});

test("semantic PreCompact checks readable files without legacy recovery writes", async (t) => {
  const root = await semanticFixture(t);
  const output = await evaluateCodexHookEvent(root, {
    session_id: "session-a",
    transcript_path: null,
    cwd: root,
    model: "codex-test",
    hook_event_name: "PreCompact",
    turn_id: "turn-compact",
    trigger: "auto",
  }, { id: "semantic-precompact", clock: () => NOW });
  assert.equal(output.continue, true);
  assert.equal(typeof output.systemMessage, "string");
  await assert.rejects(readFile(join(root, ".pipeline/runtime/recovery/index.yaml"), "utf8"), /ENOENT/);
});

async function semanticFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "hw-semantic-runtime-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cycleRoot = join(root, ".pipeline/cycles/C001-demo");
  await mkdir(cycleRoot, { recursive: true });
  await writeFile(join(cycleRoot, "PLAN.md"), plan(), "utf8");
  await writeFile(join(cycleRoot, "PROGRESS.md"), progress(), "utf8");
  await writeFile(join(cycleRoot, "EXECUTION.md"), execution(), "utf8");
  await writeFile(join(cycleRoot, "DISCUSSION-SUMMARY.md"), discussion(), "utf8");
  return root;
}

async function addSecondCycle(root) {
  const cycleRoot = join(root, ".pipeline/cycles/C002-other");
  await mkdir(cycleRoot, { recursive: true });
  for (const [name, content] of [
    ["PLAN.md", plan().replaceAll("C001-demo", "C002-other").replace("# Demo Plan", "# Other Plan")],
    ["PROGRESS.md", progress().replaceAll("C001-demo", "C002-other")],
    ["EXECUTION.md", execution().replaceAll("C001-demo", "C002-other")],
    ["DISCUSSION-SUMMARY.md", discussion().replaceAll("C001-demo", "C002-other")],
  ]) await writeFile(join(cycleRoot, name), content, "utf8");
}

function plan() {
  return `---
kind: plan
cycle: C001-demo
status: active
progress: PROGRESS.md
execution: EXECUTION.md
---

# Demo Plan

## 完整计划

| ID | 阶段 | 期望结果 | 验证方式 |
| --- | --- | --- | --- |
| \`M1\` | 准备 | 输入就绪 | 检查 |
| \`S1\` | 审阅 | 用户接受 | 人工审阅 |
| \`M2\` | 实现 | 功能完成 | 测试 |
`;
}

function progress() {
  return `---
kind: progress
cycle: C001-demo
plan: PLAN.md
status: active
current: M2
next: implement-demo
---

# Demo 进度

## 当前状态

当前位于 \`M2\`。

## 完整计划状态

| ID | 阶段 | 状态 | 当前结果 / 证据 | 下一步 |
| --- | --- | --- | --- | --- |
| \`M1\` | 准备 | \`completed\` | 已完成 | 无 |
| \`S1\` | 审阅 | \`completed\` | 已接受 | 无 |
| \`M2\` | 实现 | \`in_progress\` | 进行中 | 完成测试 |
`;
}

function execution() {
  return `---
kind: execution-log
cycle: C001-demo
---

# Demo 执行记录

## 2026-08-05 23:00 - 开始实现

- **计划项：** \`M2\`
- **结果：** 实现已开始。
`;
}

function discussion() {
  return `---
kind: discussion-summary
cycle: C001-demo
---

# Demo 讨论摘要

## 已作决定

- 使用语义文件恢复。
`;
}
