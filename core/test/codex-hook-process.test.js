import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { evaluateCodexHookEvent } from "../src/codex-hooks/index.js";

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const NOW = "2026-08-14T10:00:00.000Z";

const EVENTS = ["SessionStart", "UserPromptSubmit", "PreCompact", "Stop"];

test("Codex Hook 配置只注册四类提醒事件", async () => {
  const config = JSON.parse(await readFile(join(REPOSITORY_ROOT, "hooks", "hooks.json"), "utf8"));
  assert.deepEqual(Object.keys(config.hooks).sort(), [...EVENTS].sort());
  for (const event of EVENTS) {
    for (const group of config.hooks[event]) {
      for (const hook of group.hooks) {
        assert.equal(hook.type, "command");
        assert.match(hook.command, /codex-hook\.mjs/);
      }
    }
  }
  assert.equal("PreToolUse" in config.hooks, false, "删除保护事件已移除");
  assert.equal("PermissionRequest" in config.hooks, false, "授权拦截事件已移除");
});

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "hw-hook-lean-"));
  await mkdir(join(root, ".pipeline", "cycles", "C001-demo"), { recursive: true });
  await mkdir(join(root, ".pipeline", "local", "discussions", "C001-demo"), { recursive: true });
  const plan = ["---", "kind: plan", "cycle: C001-demo", "mode: goal", "status: active", "updated: 2026-08-14", "progress: PROGRESS.md", "execution: EXECUTION.md", "---", "", "# Demo", "", "| ID | 阶段 | 期望结果 | 验证方式 |", "| --- | --- | --- | --- |", "| `M1` | 阶段 | 结果 | 验证 |", ""].join("\n");
  const progress = ["---", "kind: progress", "cycle: C001-demo", "plan: PLAN.md", "status: active", "updated: 2026-08-14T10:00:00+08:00", "current: M1", "next: 完成 M1", "---", "", "# 进度", "", "| ID | 阶段 | 状态 | 当前结果 / 证据 | 下一步 |", "| --- | --- | --- | --- | --- |", "| `M1` | 阶段 | `in_progress` | 无 | 继续 |", ""].join("\n");
  await writeFile(join(root, ".pipeline", "cycles", "C001-demo", "PLAN.md"), plan, "utf8");
  await writeFile(join(root, ".pipeline", "cycles", "C001-demo", "PROGRESS.md"), progress, "utf8");
  await writeFile(join(root, ".pipeline", "cycles", "C001-demo", "EXECUTION.md"), "---\nkind: execution\ncycle: C001-demo\nupdated: 2026-08-14\n---\n\n# 执行记录\n", "utf8");
  await writeFile(join(root, ".pipeline", "cycles", "C001-demo", "DISCUSSION-SUMMARY.md"), "---\nkind: discussion-summary\ncycle: C001-demo\nupdated: 2026-08-14\n---\n\n# 讨论摘要\n", "utf8");
  await writeFile(join(root, ".pipeline", "INDEX.md"), "---\nkind: project-index\nname: demo\nstatus: active\n---\n\n# Demo\n", "utf8");
  return root;
}

function base(root, event, extra = {}) {
  return {
    session_id: "session-a",
    transcript_path: null,
    cwd: root,
    model: "codex-test",
    hook_event_name: event,
    ...extra,
  };
}

test("SessionStart 渲染聚焦 Cycle 的恢复上下文", async (t) => {
  const root = await fixture(t);
  const out = await evaluateCodexHookEvent(root, base(root, "SessionStart", { source: "startup" }), { clock: () => NOW });
  assert.match(out.hookSpecificOutput.additionalContext, /C001-demo/);
  assert.match(out.hookSpecificOutput.additionalContext, /PROGRESS\.md/);
});

test("UserPromptSubmit 追加可见原文并提醒长期事实", async (t) => {
  const root = await fixture(t);
  const out = await evaluateCodexHookEvent(root, base(root, "UserPromptSubmit", { turn_id: "t1", prompt: "把这个偏好记下来：优先中文。" }), { clock: () => NOW });
  assert.match(out.hookSpecificOutput.additionalContext, /Maintain/);
  const ledger = await readFile(join(root, ".pipeline", "local", "discussions", "C001-demo", "session-a.md"), "utf8");
  assert.match(ledger, /优先中文/);
});

test("PreCompact 检查恢复记录并提醒", async (t) => {
  const root = await fixture(t);
  const out = await evaluateCodexHookEvent(root, base(root, "PreCompact", { turn_id: "t2", trigger: "manual" }), { clock: () => NOW });
  assert.equal(out.continue, true);
  assert.match(out.systemMessage, /压缩前检查/);
});

test("未绑定 Session 不阻塞：无 Cycle 时普通提示继续", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-hook-unbound-"));
  const out = await evaluateCodexHookEvent(root, base(root, "UserPromptSubmit", { turn_id: "t3", prompt: "普通诊断继续。" }), { clock: () => NOW });
  assert.equal(out.systemMessage, undefined);
  assert.equal(out.hookSpecificOutput?.additionalContext, undefined);
});

test("未知事件被拒绝，调用错误直接抛出", async (t) => {
  const root = await fixture(t);
  await assert.rejects(
    evaluateCodexHookEvent(root, base(root, "PostToolUse", { turn_id: "t4", tool_name: "Bash", tool_input: {}, tool_response: {} }), { clock: () => NOW }),
    /not registered/,
  );
  const badRoot = await mkdtemp(join(tmpdir(), "hw-hook-other-"));
  await assert.rejects(
    evaluateCodexHookEvent(root, { ...base(badRoot, "SessionStart", { source: "startup" }) }, { clock: () => NOW }),
    /cwd does not match/,
  );
});
