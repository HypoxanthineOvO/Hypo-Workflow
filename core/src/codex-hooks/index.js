import { resolve } from "node:path";
import {
  appendDiscussionMessage,
  inspectSemanticWorkflow,
  renderSemanticResumeContext,
} from "../semantic-workflow/index.js";
import {
  assertExactKeys,
  assertPlainObject,
  authorityError,
  normalizeSafeIdentifier,
} from "../runtime/internal.js";

// C027：精简 hook 核心。只服务注册的 4 个事件；删除保护、恢复、路由等机器已移除。
// 教义：Hooks 是提醒，不是正确性来源；失败 fail-open；未绑定 Session 不阻塞。

export const CODEX_HOOK_EVENTS = Object.freeze([
  "SessionStart",
  "UserPromptSubmit",
  "PreCompact",
  "Stop",
]);

const EVENT_SET = new Set(CODEX_HOOK_EVENTS);
const COMMON_KEYS = ["session_id", "transcript_path", "cwd", "hook_event_name", "model", "permission_mode"];
const EVENT_KEYS = Object.freeze({
  SessionStart: ["source"],
  UserPromptSubmit: ["turn_id", "prompt"],
  PreCompact: ["turn_id", "trigger"],
  Stop: ["turn_id", "response", "stop_hook_active", "last_assistant_message"],
});

export async function evaluateCodexHookEvent(root, rawInput, options = {}) {
  const input = validateCodexHookInput(rawInput);
  const workspaceRoot = resolve(root || ".");
  if (resolve(input.cwd) !== workspaceRoot) {
    throw authorityError("ERR_CODEX_HOOK_ROOT_MISMATCH", "Codex Hook cwd does not match the target workspace");
  }
  const clock = typeof options.clock === "function" ? options.clock : undefined;

  try {
    switch (input.hook_event_name) {
      case "SessionStart":
        return await evaluateSessionStart(workspaceRoot, input);
      case "UserPromptSubmit":
        return await evaluateUserPrompt(workspaceRoot, input, clock);
      case "PreCompact":
        return await evaluatePreCompact(workspaceRoot, input);
      case "Stop":
        return await evaluateStop(workspaceRoot, input, clock);
      default:
        return {};
    }
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "ERR_CODEX_HOOK_AUXILIARY_FAILED";
    return {
      systemMessage: `Hypo-Workflow ${input.hook_event_name} 辅助处理暂不可用（${code}）。继续当前工作，并用普通文件维护所需记录。`,
    };
  }
}

function context(event, text) {
  if (!text) return {};
  return {
    systemMessage: undefined,
    hookSpecificOutput: { hookEventName: event, additionalContext: text },
  };
}

async function evaluateSessionStart(root, input) {
  const resumed = await renderSemanticResumeContext(root, {
    host: "codex",
    sessionId: input.session_id,
  });
  if (resumed.status === "selection_required") return context(input.hook_event_name, resumed.context);
  if (resumed.status !== "selected") return {};
  return context(input.hook_event_name, resumed.context);
}

async function evaluateUserPrompt(root, input, clock) {
  await appendDiscussionMessage(root, {
    speaker: "user",
    text: input.prompt,
    host: "codex",
    sessionId: input.session_id,
    turnId: input.turn_id,
  }, { clock });
  const inspected = await inspectSemanticWorkflow(root, { host: "codex", sessionId: input.session_id });
  if (inspected.status !== "selected" && inspected.status !== "selection_required") return {};
  const lines = [];
  if (inspected.status === "selection_required") {
    lines.push("存在多个 active Cycle 且本 Session 未聚焦；普通提问与诊断继续，修改记录前先聚焦。");
  }
  lines.push("注意用户消息中的长期需求、偏好、决定或反馈：解释后通过 Maintain 以可读命名保存（memory/global 分层与 level 标注），不要记录头脑风暴或临时诊断。");
  return context(input.hook_event_name, lines.join("\n"));
}

async function evaluatePreCompact(root, input) {
  const resumed = await renderSemanticResumeContext(root, {
    host: "codex",
    sessionId: input.session_id,
  });
  const lines = [];
  if (resumed.status !== "selected") {
    lines.push("当前无聚焦 Cycle；压缩前确认工作记录已写入对应文件。");
  } else {
    const ok = resumed.validation?.ok ?? true;
    lines.push(`压缩前检查：PLAN/PROGRESS/EXECUTION/DISCUSSION-SUMMARY 是否足以恢复当前 Cycle（${resumed.cycle}）？`);
    lines.push(ok ? "Plan 与 Progress 对齐。" : `注意：${(resumed.validation.errors || []).join("；")}`);
    lines.push("不足则先补齐记录再压缩。");
  }
  return { continue: true, systemMessage: lines.join("\n") };
}

async function evaluateStop(root, input, clock) {
  const text = input.response || input.last_assistant_message || "";
  if (text) {
    await appendDiscussionMessage(root, {
      speaker: "assistant",
      text,
      host: "codex",
      sessionId: input.session_id,
      turnId: input.turn_id,
    }, { clock });
  }
  return {
    systemMessage: "检查本轮是否改变了 Plan 进度或长期项目事实；只有真实变化才更新 PROGRESS/EXECUTION 与 Memory。",
  };
}

function assertSafeIdentifierValue(value, field) {
  normalizeSafeIdentifier(value, field);
}

function validateCodexHookInput(rawInput) {
  assertPlainObject(rawInput, "Codex Hook input");
  const event = rawInput.hook_event_name;
  if (!EVENT_SET.has(event)) {
    throw authorityError("ERR_CODEX_HOOK_EVENT_UNKNOWN", `Codex Hook event ${event} is not registered`);
  }
  assertExactKeys(rawInput, [...COMMON_KEYS, ...(EVENT_KEYS[event] ?? [])], "Codex Hook input");
  assertSafeIdentifierValue(rawInput.session_id, "Codex Hook input.session_id");
  if (rawInput.transcript_path !== null) {
    if (typeof rawInput.transcript_path !== "string") {
      throw authorityError("ERR_CODEX_HOOK_INPUT_INVALID", "Codex Hook transcript_path must be a string or null");
    }
  }
  if (typeof rawInput.cwd !== "string" || !rawInput.cwd.trim()) {
    throw authorityError("ERR_CODEX_HOOK_INPUT_INVALID", "Codex Hook cwd is required");
  }
  return {
    ...rawInput,
    cwd: resolve(rawInput.cwd),
    prompt: rawInput.prompt === undefined ? "" : String(rawInput.prompt),
    response: rawInput.response === undefined ? "" : String(rawInput.response),
  };
}
