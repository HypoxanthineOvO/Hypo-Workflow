import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createRecoveryStore } from "../recovery/index.js";
import { readActivePointer, readRuntimeObject } from "../runtime/index.js";
import { canonicalHash } from "../serialization/index.js";
import { refreshHostStatusProjection } from "../host-contract/index.js";
import { resolveWorkItemSession } from "../work-placement/index.js";
import { validateWorkerRoutingDecision } from "../worker-routing/index.js";
import { assertWorkspacePathAllowed } from "../workspace-store/index.js";
import {
  appendDiscussionMessage,
  inspectSemanticWorkflow,
  renderSemanticResumeContext,
} from "../semantic-workflow/index.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
} from "../runtime/internal.js";

export const CODEX_HOOK_EVENTS = Object.freeze([
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "SubagentStart",
  "SubagentStop",
  "Stop",
]);

const EVENT_SET = new Set(CODEX_HOOK_EVENTS);
const PERMISSION_MODES = new Set(["default", "acceptEdits", "plan", "dontAsk", "bypassPermissions"]);
const WRITE_EVENTS = new Set(CODEX_HOOK_EVENTS.filter((event) => ![
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
].includes(event)));
const PERMISSION_MODE_EVENTS = new Set([
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "SubagentStart",
  "SubagentStop",
  "Stop",
]);
const SUBAGENT_CONTEXT_EVENTS = new Set([
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
]);
const COMMON_KEYS = ["session_id", "transcript_path", "cwd", "hook_event_name", "model"];
const EVENT_KEYS = Object.freeze({
  SessionStart: ["permission_mode", "source"],
  UserPromptSubmit: ["permission_mode", "turn_id", "prompt"],
  PreToolUse: ["permission_mode", "turn_id", "tool_name", "tool_use_id", "tool_input"],
  PermissionRequest: ["permission_mode", "turn_id", "tool_name", "tool_input"],
  PostToolUse: ["permission_mode", "turn_id", "tool_name", "tool_use_id", "tool_input", "tool_response"],
  PreCompact: ["turn_id", "trigger"],
  PostCompact: ["turn_id", "trigger"],
  SubagentStart: ["permission_mode", "turn_id", "agent_id", "agent_type"],
  SubagentStop: [
    "permission_mode",
    "turn_id",
    "agent_id",
    "agent_type",
    "agent_transcript_path",
    "stop_hook_active",
    "last_assistant_message",
  ],
  Stop: ["permission_mode", "turn_id", "stop_hook_active", "last_assistant_message"],
});

export function validateCodexHookInput(input) {
  assertPlainObject(input, "Codex Hook input");
  const event = input.hook_event_name;
  if (!EVENT_SET.has(event)) {
    throw hookError("ERR_CODEX_HOOK_EVENT_UNSUPPORTED", "Codex Hook event is unsupported");
  }
  const subagentContextKeys = SUBAGENT_CONTEXT_EVENTS.has(event) ? ["agent_id", "agent_type"] : [];
  assertExactKeys(input, [...COMMON_KEYS, ...EVENT_KEYS[event], ...subagentContextKeys], "Codex Hook input");
  requireText(input.session_id, "session_id");
  requireNullableText(input.transcript_path, "transcript_path");
  requireText(input.cwd, "cwd");
  requireText(input.model, "model");
  if (PERMISSION_MODE_EVENTS.has(event)) {
    if (!PERMISSION_MODES.has(input.permission_mode)) {
      throw hookError("ERR_CODEX_HOOK_INPUT_INVALID", "Codex Hook permission_mode is unsupported");
    }
  }
  if (event !== "SessionStart") validateOptionalHookIdentifier(input, "turn_id");
  if (SUBAGENT_CONTEXT_EVENTS.has(event)) validateOptionalAgentContext(input);

  switch (event) {
    case "SessionStart":
      requireOneOf(input.source, ["startup", "resume", "clear", "compact"], "source");
      break;
    case "UserPromptSubmit":
      requireText(input.prompt, "prompt", 128 * 1024);
      break;
    case "PreToolUse":
    case "PostToolUse":
      requireToolInput(input);
      validateOptionalHookIdentifier(input, "tool_use_id");
      if (event === "PostToolUse") normalizeJsonValue(input.tool_response, "tool_response");
      break;
    case "PermissionRequest":
      requireToolInput(input);
      break;
    case "PreCompact":
    case "PostCompact":
      requireOneOf(input.trigger, ["manual", "auto"], "trigger");
      break;
    case "SubagentStart":
      requireAgentFields(input);
      break;
    case "SubagentStop":
      requireAgentFields(input);
      requireNullableText(input.agent_transcript_path, "agent_transcript_path");
      requireBoolean(input.stop_hook_active, "stop_hook_active");
      requireNullableText(input.last_assistant_message, "last_assistant_message", 128 * 1024);
      break;
    case "Stop":
      requireBoolean(input.stop_hook_active, "stop_hook_active");
      requireNullableText(input.last_assistant_message, "last_assistant_message", 128 * 1024);
      break;
  }
  return normalizeCanonicalValue(input, "Codex Hook input");
}

export function validateCodexHookOutput(event, output, input = undefined) {
  if (!EVENT_SET.has(event)) {
    throw hookError("ERR_CODEX_HOOK_EVENT_UNSUPPORTED", "Codex Hook output event is unsupported");
  }
  assertPlainObject(output, "Codex Hook output");
  const allowed = outputKeysFor(event);
  for (const key of Object.keys(output)) {
    if (!allowed.has(key)) throw hookError("ERR_CODEX_HOOK_OUTPUT_UNSUPPORTED", `Codex Hook output field ${key} is unsupported for ${event}`);
  }
  if (Object.hasOwn(output, "continue")) requireBoolean(output.continue, "continue");
  if (Object.hasOwn(output, "suppressOutput")) requireBoolean(output.suppressOutput, "suppressOutput");
  if (Object.hasOwn(output, "stopReason")) requireText(output.stopReason, "stopReason");
  if (Object.hasOwn(output, "systemMessage")) requireText(output.systemMessage, "systemMessage");
  if (Object.hasOwn(output, "decision")) {
    if (output.decision !== "block") throw hookError("ERR_CODEX_HOOK_OUTPUT_UNSUPPORTED", "Codex Hook decision is unsupported");
    requireText(output.reason, "reason");
  } else if (Object.hasOwn(output, "reason")) {
    throw hookError("ERR_CODEX_HOOK_OUTPUT_INVALID", "Codex Hook reason requires decision:block");
  }
  if (Object.hasOwn(output, "hookSpecificOutput")) validateHookSpecificOutput(event, output.hookSpecificOutput, input);
  return output;
}

export async function evaluateCodexHookEvent(root, rawInput, options = {}) {
  const validatedInput = validateCodexHookInput(rawInput);
  const workspaceRoot = resolve(root || ".");
  if (resolve(validatedInput.cwd) !== workspaceRoot) {
    throw hookError("ERR_CODEX_HOOK_ROOT_MISMATCH", "Codex Hook cwd does not match the target workspace");
  }
  const operation = normalizeEvaluationOptions(validatedInput.hook_event_name, options);
  const input = bindOptionalHookIdentifiers(validatedInput, operation);
  const recovery = createRecoveryStore({ ...(operation.clock ? { clock: operation.clock } : {}) });

  let output;
  try {
    switch (input.hook_event_name) {
      case "SessionStart":
        output = await evaluateSessionStart(workspaceRoot, input, operation, recovery);
        break;
      case "UserPromptSubmit":
        output = await evaluateUserPrompt(workspaceRoot, input, operation);
        break;
      case "PreToolUse":
        output = await evaluatePreToolUse(input);
        break;
      case "PermissionRequest":
        output = await evaluatePermissionRequest(input);
        break;
      case "PostToolUse":
        output = await evaluatePostToolUse(workspaceRoot, input, operation);
        break;
      case "PreCompact":
        output = await evaluatePreCompact(workspaceRoot, input, operation, recovery);
        break;
      case "PostCompact":
        output = await evaluatePostCompact(workspaceRoot, input, operation, recovery);
        break;
      case "SubagentStart":
        output = await evaluateSubagent(workspaceRoot, input, operation, recovery, true);
        break;
      case "SubagentStop":
        output = await evaluateSubagent(workspaceRoot, input, operation, recovery, false);
        break;
      case "Stop":
        output = await evaluateStop(workspaceRoot, input, operation, recovery);
        break;
    }
  } catch (error) {
    if (["PreToolUse", "PermissionRequest"].includes(input.hook_event_name)) throw error;
    output = failOpenHookOutput(input.hook_event_name, error);
  }
  return validateCodexHookOutput(input.hook_event_name, output, input);
}

function bindOptionalHookIdentifiers(input, operation) {
  if (operation.id === undefined) return input;
  const bound = {
    ...input,
    ...(input.hook_event_name !== "SessionStart" && input.turn_id === undefined
      ? { turn_id: `turn-${operation.id}` }
      : {}),
  };
  if (
    ["PreToolUse", "PostToolUse"].includes(input.hook_event_name)
    && input.tool_use_id === undefined
  ) {
    bound.tool_use_id = `tool-${operation.id}`;
  }
  return bound;
}

async function evaluateSessionStart(root, input, operation, recovery) {
  const semantic = await renderSemanticResumeContext(root, {
    host: "codex",
    sessionId: input.session_id,
  });
  if (["selected", "selection_required"].includes(semantic.status)) {
    return sessionStartContext(semantic.context);
  }

  await refreshProjectionIfCurrent(root, operation, "session-start", input);
  const selection = await resolveSessionRouting(root, input, operation.clock);
  if (selection.status === "selection_required") {
    return {
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: renderSelectionContext(selection.candidates),
      },
    };
  }
  const objectRef = selection.object_ref;
  if (!objectRef) return {};
  if (input.source === "compact") {
    try {
      const plan = await recovery.planRecoveryRestore(root, {
        object_ref: objectRef,
        budget_bytes: 12 * 1024,
      });
      return sessionStartContext(boundUtf8(renderRestoreContext(plan), 16_000));
    } catch (error) {
      if (error?.code !== "ERR_RECOVERY_PACK_NOT_FOUND") throw error;
    }
  }
  try {
    const authority = await readRuntimeObject(root, objectRef);
    return sessionStartContext(boundUtf8(renderRuntimeContext(authority), 16_000));
  } catch (error) {
    if (error?.code === "ERR_AUTHORITY_OBJECT_NOT_FOUND") return {};
    throw error;
  }
}

async function evaluateUserPrompt(root, input, operation) {
  const discussion = await appendDiscussionMessage(root, {
    speaker: "user",
    text: input.prompt,
    host: "codex",
    sessionId: input.session_id,
    turnId: input.turn_id,
  }, { clock: operation.clock });
  const context = [];
  if (discussion.status === "appended") context.push(`用户原文已追加到 ${discussion.path}。`);
  if (discussion.status === "selection_required") context.push("存在多个 active Cycle；聚焦一个 Cycle 后再写入 Discussion Ledger。普通对话可以继续。");
  const selection = ["appended", "deduplicated", "selection_required"].includes(discussion.status)
    ? { status: discussion.status }
    : await resolveSessionRouting(root, input, operation.clock);
  if (selection.status === "selection_required") context.push(renderSelectionContext(selection.candidates));
  if (selection.status === "selected" && selection.object_ref.kind === "experiment") {
    context.push(
      "Experiment 提醒：用普通 Markdown/YAML 保持实验目的、Attempts、证据、结果和下一步最新。可选辅助工具失败不能阻止清楚的普通文件记录。",
    );
  }
  context.push(
    "Hypo-Workflow 提醒：将本轮用户可见原文追加到当前 Cycle 的本地 Discussion Ledger；明显凭据使用 [REDACTED]。",
    "主模型自行判断明确的长期 requirement、preference、decision 和 feedback，并在适用时更新 Memory。",
    "不要把 brainstorming、临时日志、关键词命中或模型推断写成长期事实。",
  );
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: context.join("\n"),
    },
  };
}

function evaluatePreToolUse(input) {
  if (!isObviousDirectDeletion(input.tool_name, input.tool_input)) return {};
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: deletionGuardReason(),
    },
  };
}

function evaluatePermissionRequest(input) {
  if (!isObviousDirectDeletion(input.tool_name, input.tool_input)) return {};
  return {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: { behavior: "deny", message: deletionGuardReason() },
    },
  };
}

async function evaluatePostToolUse(root, input, operation) {
  const objectRef = await readActiveObjectRef(root, input, operation.clock);
  if (!objectRef) return {};
  const changedPaths = extractChangedPaths(root, input);
  const worktreeEffect = collectReminderWorktreeEffect(root, changedPaths);
  const reminderKey = reminderDigest(input.tool_name, changedPaths, input.tool_input, worktreeEffect.digest);
  await refreshProjectionIfCurrent(root, operation, "post-tool", input);
  if (!shouldRemind(input.tool_name, changedPaths)) return {};
  const target = changedPaths.length ? changedPaths.join(", ") : input.tool_name;
  const systemMessage = `检查 ${target} 是否改变了文档、Progress 或长期项目事实；只有真实变化才需要更新。`;
  const claimed = await claimReminderMarker(root, objectRef, reminderKey, systemMessage);
  if (!claimed) return {};
  return {
    systemMessage,
  };
}

async function claimReminderMarker(root, objectRef, reminderKey, systemMessage) {
  const markerRootRelative = ".pipeline/runtime/codex-hooks/reminders";
  const digest = canonicalHash({ object_ref: objectRef, reminder_key: reminderKey, system_message: systemMessage });
  let markerRoot;
  try {
    markerRoot = await assertWorkspacePathAllowed(root, markerRootRelative, { allowRoot: true });
    await mkdir(markerRoot.path, { recursive: true });
    markerRoot = await assertWorkspacePathAllowed(root, markerRootRelative, { allowRoot: true });
  } catch {
    throw hookError("ERR_CODEX_HOOK_REMINDER_MARKER_FAILED", "Codex Hook reminder marker parent creation failed");
  }
  let marker;
  try {
    marker = await assertWorkspacePathAllowed(root, `${markerRoot.relativePath}/${digest}`);
  } catch {
    throw hookError("ERR_CODEX_HOOK_REMINDER_MARKER_FAILED", "Codex Hook reminder marker path is forbidden");
  }
  try {
    await mkdir(marker.path);
    return true;
  } catch (error) {
    if (error?.code === "EEXIST") {
      try {
        const existing = await assertWorkspacePathAllowed(root, marker.relativePath);
        const stats = await lstat(existing.path);
        if (stats.isDirectory() && !stats.isSymbolicLink()) return false;
      } catch {
        // Fall through to the stable Hook error below.
      }
    }
    throw hookError("ERR_CODEX_HOOK_REMINDER_MARKER_FAILED", "Codex Hook reminder marker claim failed");
  }
}

async function refreshProjectionIfCurrent(root, operation, suffix, input = null) {
  try {
    await refreshHostStatusProjection(root, {
      clock: operation.clock ?? (() => new Date().toISOString()),
      id: `${operation.id}-${suffix}-host-status`,
      ...(input ? { host: "codex", session_id: input.session_id } : {}),
    });
  } catch (error) {
    if (new Set([
      "ERR_WORKSPACE_MANIFEST_MISSING",
      "ERR_WORKSPACE_MANIFEST_INVALID",
      "ERR_AUTHORITY_OBJECT_NOT_FOUND",
      "ERR_HOST_STATUS_INVALID",
    ]).has(error?.code)) return;
    throw error;
  }
}

async function evaluatePreCompact(root, input, operation, recovery) {
  const semantic = await inspectSemanticWorkflow(root, {
    host: "codex",
    sessionId: input.session_id,
  });
  if (semantic.present) {
    const resume = await renderSemanticResumeContext(root, {
      host: "codex",
      sessionId: input.session_id,
    });
    return {
      continue: true,
      systemMessage: resume.status === "selected"
        ? `压缩前语义恢复检查完成：${resume.cycle} 的 Plan、Progress、Execution 和 Discussion Summary 可读取。`
        : "压缩前发现多个 active Cycle；恢复后需要先选择一个 Cycle。",
    };
  }

  const objectRef = await readActiveObjectRef(root, input, operation.clock);
  if (!objectRef) return { continue: true };
  if (objectRef.kind === "experiment") return { continue: true };
  const runtime = await readRuntimeObject(root, objectRef);
  if (["accepted", "rejected"].includes(runtime.runtime.status)) return { continue: true };
  const [capsule, worktreeSummary] = await Promise.all([
    recovery.readContextCapsule(root, objectRef),
    collectGitWorktreeSummary(root),
  ]);
  const sealed = await recovery.sealRecoveryPack(root, {
    object_ref: objectRef,
    trigger: "pre_compact",
    capsule,
    continuation: runtime.continuation,
    record_refs: capsule.sources.records,
    receipt_refs: capsule.sources.receipts,
    evidence_refs: [],
    worktree_summary: worktreeSummary,
    cursor: capsule.cursor,
  }, { id: operation.id });
  await recovery.appendRecoveryEvent(root, {
    object_ref: objectRef,
    session_id: input.session_id,
    writer: { kind: "main", id: "main" },
    turn_id: input.turn_id,
    type: "compact.started",
    summary: "Codex started context compaction after sealing a Recovery Pack.",
    payload: { operation_id: operation.id, trigger: input.trigger, pack_ref: sealed.pack_ref, evidence_refs: [] },
  });
  return { continue: true };
}

async function evaluatePostCompact(root, input, operation, recovery) {
  const objectRef = await readActiveObjectRef(root, input, operation.clock);
  if (!objectRef) return { continue: true };
  if (objectRef.kind === "experiment") return { continue: true };
  const runtime = await readRuntimeObject(root, objectRef);
  if (["accepted", "rejected"].includes(runtime.runtime.status)) return { continue: true };
  const selected = await recovery.selectLatestValidRecoveryPack(root, { object_ref: objectRef });
  await recovery.appendRecoveryEvent(root, {
    object_ref: objectRef,
    session_id: input.session_id,
    writer: { kind: "main", id: "main" },
    turn_id: input.turn_id,
    type: "compact.completed",
    summary: "Codex completed context compaction.",
    payload: {
      operation_id: operation.id,
      trigger: input.trigger,
      pack_ref: selected.pack_ref,
      evidence_refs: [],
    },
  });
  return { continue: true };
}

async function evaluateSubagent(root, input, operation, recovery, starting) {
  const objectRef = await readActiveObjectRef(root, input, operation.clock);
  const evidenceRefs = starting ? [] : extractEvidenceLocators(input.last_assistant_message);
  const workerRouting = objectRef
    ? await readWorkerRoutingForEvent(root, objectRef, input, recovery, starting)
    : null;
  if (objectRef) {
    const writer = { kind: "subagent", id: input.agent_id };
    await recovery.appendRecoveryEvent(root, {
      object_ref: objectRef,
      session_id: input.session_id,
      writer,
      turn_id: input.turn_id,
      type: starting ? "worker.started" : "worker.stopped",
      summary: `Codex subagent ${input.agent_id} ${starting ? "started" : "stopped"}.`,
      payload: {
        operation_id: operation.id,
        writer,
        role: input.agent_type,
        evidence_refs: evidenceRefs,
        ...(workerRouting ? { worker_routing: workerRouting } : {}),
      },
    });
  }
  if (!starting) {
    return evidenceRefs.length ? {} : {
      systemMessage: `Subagent ${input.agent_id} stopped without an explicit evidence locator; record the bounded evidence reference before relying on its result.`,
    };
  }
  return {
    hookSpecificOutput: {
      hookEventName: "SubagentStart",
      additionalContext: workerRouting
        ? renderWorkerRoutingContext(workerRouting)
        : "Keep role-specific evidence_refs explicit and return a concise result to the main agent.",
    },
  };
}

async function readWorkerRoutingForEvent(root, objectRef, input, recovery, starting) {
  if (starting) return readActiveWorkerRouting(root, objectRef);
  const replay = await recovery.replayRecoveryJournal(root, { object_ref: objectRef });
  const workerEvents = replay.events.filter((event) => (
    event.writer?.kind === "subagent"
    && event.writer.id === input.agent_id
    && (event.type === "worker.started" || event.type === "worker.stopped")
  ));
  const sameSessionStart = findOpenWorkerStart(workerEvents, input.session_id);
  const priorStart = sameSessionStart ?? findOpenWorkerStart(workerEvents);
  if (priorStart && priorStart.payload?.worker_routing === undefined) return null;
  if (priorStart) {
    return validateWorkerRoutingDecision(priorStart.payload.worker_routing);
  }
  return readActiveWorkerRouting(root, objectRef);
}

function findOpenWorkerStart(events, sessionId = null) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (sessionId !== null && event.session_id !== sessionId) continue;
    if (event.type === "worker.stopped") return null;
    if (event.type === "worker.started") return event;
  }
  return null;
}

async function readActiveWorkerRouting(root, objectRef) {
  const authority = await readRuntimeObject(root, objectRef);
  const runtimeRouting = authority.runtime?.worker_routing;
  const continuationRouting = authority.continuation?.worker_routing;
  if (runtimeRouting === undefined && continuationRouting === undefined) return null;
  const selected = validateWorkerRoutingDecision(continuationRouting ?? runtimeRouting);
  if (runtimeRouting !== undefined && canonicalHash(validateWorkerRoutingDecision(runtimeRouting)) !== canonicalHash(selected)) {
    throw hookError("ERR_CODEX_HOOK_INPUT_INVALID", "Runtime and Continuation Worker Routing decisions differ");
  }
  return selected;
}

function renderWorkerRoutingContext(routing) {
  void routing;
  return "Worker 提醒：只执行当前 Handoff 的目的、边界和验证；结果与证据返回主模型，由主模型更新 Progress 与 Execution。";
}

async function evaluateStop(root, input, operation, recovery) {
  const discussion = await appendDiscussionMessage(root, {
    speaker: "assistant",
    text: input.last_assistant_message || "",
    host: "codex",
    sessionId: input.session_id,
    turnId: input.turn_id,
  }, { clock: operation.clock });
  if (["appended", "deduplicated"].includes(discussion.status)) {
    return {
      continue: true,
      ...(discussion.status === "appended" ? {
        systemMessage: `助手回复已追加到 ${discussion.path}。如本轮改变了计划状态，请同步更新 Progress 与 Execution。`,
      } : {}),
    };
  }
  if (discussion.status === "selection_required") {
    return { continue: true, systemMessage: "存在多个 active Cycle；聚焦一个 Cycle 后再保存助手回复。" };
  }
  const objectRef = await readActiveObjectRef(root, input, operation.clock);
  if (objectRef) {
    await recovery.appendRecoveryEvent(root, {
      object_ref: objectRef,
      session_id: input.session_id,
      writer: { kind: "main", id: "main" },
      turn_id: input.turn_id,
      type: "turn.agent",
      summary: "Codex reached the turn Stop boundary.",
      payload: {
        operation_id: operation.id,
        stop_hook_active: input.stop_hook_active,
        evidence_refs: [],
      },
    });
  }
  return {
    continue: true,
    ...(discussion.status === "appended" ? {
      systemMessage: `助手回复已追加到 ${discussion.path}。如本轮改变了计划状态，请同步更新 Progress 与 Execution。`,
    } : {}),
  };
}

function normalizeEvaluationOptions(event, options) {
  assertPlainObject(options, "Codex Hook evaluation options");
  assertExactKeys(options, ["id", "clock"], "Codex Hook evaluation options");
  const clock = options.clock;
  if (clock !== undefined && typeof clock !== "function") {
    throw hookError("ERR_CODEX_HOOK_OPTIONS_INVALID", "Codex Hook clock must be a zero-argument function");
  }
  if (!WRITE_EVENTS.has(event)) {
    return {
      ...(options.id === undefined ? {} : { id: normalizeSafeIdentifier(options.id, "Codex Hook operation id") }),
      ...(clock === undefined ? {} : { clock }),
    };
  }
  if (options.id === undefined) {
    throw hookError("ERR_CODEX_HOOK_OPERATION_REQUIRED", `${event} requires a unique operation id`);
  }
  return { id: normalizeSafeIdentifier(options.id, "Codex Hook operation id"), ...(clock === undefined ? {} : { clock }) };
}

async function readActiveObjectRef(root, input, clock) {
  const selection = await resolveSessionRouting(root, input, clock);
  return selection.status === "selected" ? selection.object_ref : null;
}

async function resolveSessionRouting(root, input, clock) {
  const selection = await resolveWorkItemSession(root, {
    host: "codex",
    session_id: input.session_id,
  }, { ...(clock ? { clock } : {}) });
  if (selection.status === "selected") {
    return { status: "selected", object_ref: selection.work_item_ref };
  }
  if (selection.placement_registry_present) return selection;
  try {
    const pointer = await readActivePointer(root);
    const objectRef = pointer.active.delivery ?? pointer.active.activity ?? pointer.active.bootstrap_job ?? null;
    return objectRef ? { status: "selected", object_ref: objectRef, legacy: true } : { status: "none" };
  } catch (error) {
    if (error?.code === "ERR_AUTHORITY_OBJECT_NOT_FOUND") return { status: "none" };
    throw error;
  }
}

function renderSelectionContext(candidates) {
  const choices = candidates.map(({ work_item_ref }) => `${work_item_ref.kind}:${work_item_ref.id}`).join(", ");
  return `当前 Session 尚未聚焦一个工作项。候选项：${choices}。在修改 Workflow 记录或占用独占资源前选择一个；普通提问和诊断可以继续。`;
}

function failOpenHookOutput(event, error) {
  const code = typeof error?.code === "string" ? error.code : "ERR_CODEX_HOOK_AUXILIARY_FAILED";
  return {
    systemMessage: `Hypo-Workflow ${event} 辅助处理暂不可用（${code}）。继续当前工作，并用普通文件维护所需记录。`,
    ...(["PreCompact", "PostCompact"].includes(event) ? { continue: true } : {}),
  };
}

function isObviousDirectDeletion(toolName, toolInput) {
  const command = typeof toolInput?.command === "string" ? toolInput.command : "";
  if (toolName === "apply_patch" && /^\*\*\* Delete File:/m.test(command)) return true;
  if (/(?:^|[;&|()\n]\s*|\bsudo\s+)(?:rm|unlink|rmdir)\b|\bgit\s+clean\b|\bfind\b[^\n]*\s-delete\b|\bRemove-Item\b|\bdel(?:ete)?\s+\//i.test(command)) {
    return true;
  }
  return /(?:^|__)(?:delete|remove|unlink|rmdir)(?:$|__)/i.test(toolName);
}

function deletionGuardReason() {
  return "已阻止直接破坏性删除：先展示准确的删除清单和影响，获得用户明确授权，再使用受控删除方式。此 Hook 只是额外安全保护。";
}

function extractChangedPaths(root, input) {
  const commandPaths = input.tool_name === "apply_patch"
    ? extractApplyPatchPaths(input.tool_input?.command)
    : [];
  const bashPaths = input.tool_name === "Bash"
    ? extractBashWriteTargets(input.tool_input?.command)
    : [];
  const candidates = input.tool_response && typeof input.tool_response === "object" && !Array.isArray(input.tool_response)
    ? input.tool_response.changed_paths
    : null;
  const responsePaths = Array.isArray(candidates) ? candidates : [];
  const fallbackPaths = input.tool_name === "Bash"
    && bashPaths.length === 0
    && isLikelyMutatingBash(input.tool_input?.command)
    ? collectBoundedDirtyPaths(root)
    : [];
  return [...new Set([...commandPaths, ...bashPaths, ...responsePaths, ...fallbackPaths].map(normalizeReminderPath).filter(Boolean))]
    .sort()
    .slice(0, 32);
}

function extractApplyPatchPaths(command) {
  if (typeof command !== "string") return [];
  const paths = [];
  for (const match of command.matchAll(/^\*\*\* (?:Add|Update|Delete) File:\s*(.+?)\s*$/gm)) paths.push(match[1]);
  for (const match of command.matchAll(/^\*\*\* Move to:\s*(.+?)\s*$/gm)) paths.push(match[1]);
  return paths;
}

function extractBashWriteTargets(command) {
  if (typeof command !== "string") return [];
  const paths = [];
  for (const match of command.matchAll(/(?:^|\s)\d*>>?\s*(?!&)(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/gm)) {
    paths.push(match[1] ?? match[2] ?? match[3]);
  }
  for (const segment of command.split(/&&|\|\||[;\n|]/)) {
    const words = shellWords(segment);
    if (!words.length) continue;
    let commandIndex = words[0] === "sudo" ? 1 : 0;
    if (words[commandIndex] === "env") {
      commandIndex += 1;
      while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[commandIndex] ?? "")) commandIndex += 1;
    }
    const executable = (words[commandIndex] ?? "").split("/").at(-1);
    const args = words.slice(commandIndex + 1);
    if (["touch", "mkdir", "tee"].includes(executable)) {
      paths.push(...args.filter((arg) => !arg.startsWith("-")));
    } else if (["cp", "mv", "install", "truncate"].includes(executable)) {
      const operands = args.filter((arg) => !arg.startsWith("-"));
      if (operands.length) paths.push(operands.at(-1));
    } else if (executable === "sed" && args.some((arg) => /^-[^-]*i/.test(arg))) {
      const operands = args.filter((arg) => !arg.startsWith("-"));
      if (operands.length > 1) paths.push(operands.at(-1));
    } else if (executable === "perl" && args.some((arg) => /^-[^-]*i/.test(arg))) {
      const operands = args.filter((arg) => !arg.startsWith("-"));
      if (operands.length) paths.push(operands.at(-1));
    } else if (executable === "dd") {
      const output = args.find((arg) => arg.startsWith("of="));
      if (output) paths.push(output.slice(3));
    }
  }
  return paths;
}

function shellWords(value) {
  return (value.match(/"(?:\\.|[^"])*"|'[^']*'|[^\s]+/g) ?? []).map((word) => {
    if ((word.startsWith('"') && word.endsWith('"')) || (word.startsWith("'") && word.endsWith("'"))) {
      return word.slice(1, -1);
    }
    return word;
  });
}

function isLikelyMutatingBash(command) {
  if (typeof command !== "string") return false;
  if (extractBashWriteTargets(command).length) return true;
  return /(?:^|[;&|\n]\s*)(?:sudo\s+)?(?:git\s+(?:apply|checkout|restore|reset|add|rm|mv)\b|(?:npm|pnpm|yarn|bun)\s+(?:run|install|uninstall|update|add|remove)\b|make\b|cmake\s+--build\b|cargo\s+(?:build|fix|fmt)\b|patch\b)/im.test(command);
}

function collectBoundedDirtyPaths(root) {
  const result = spawnSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024,
  });
  if (result.status !== 0) return [];
  return parseStatusPaths(result.stdout)
    .map(normalizeReminderPath)
    .filter(Boolean)
    .slice(0, 32);
}

function normalizeReminderPath(value) {
  if (typeof value !== "string") return null;
  const path = value.trim().replaceAll("\\", "/");
  if (
    !path
    || path.length > 512
    || path.startsWith("/")
    || /^[A-Za-z]:\//.test(path)
    || /[\0-\x1f\x7f]/.test(path)
    || path.split("/").some((part) => !part || part === "." || part === "..")
  ) return null;
  return path;
}

function collectReminderWorktreeEffect(root, paths) {
  const facts = paths.map((path) => ({
    path,
    worktree_blob: runGitOptional(root, ["hash-object", "--", path]) || "missing",
  }));
  return {
    digest: `sha256:${canonicalHash({ paths, facts })}`,
    facts,
  };
}

function runGitOptional(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 });
  if (result.status !== 0) return null;
  return result.stdout.trim().slice(0, 256);
}

function reminderDigest(toolName, paths, toolInput, effectDigest) {
  const command = typeof toolInput?.command === "string" ? toolInput.command : null;
  return canonicalHash({ tool_name: toolName, changed_paths: paths, command, effect_digest: effectDigest });
}

function shouldRemind(toolName, paths) {
  if (paths.length) return paths.some((path) => /^(?:core|src|lib|app|packages|skills|references|scripts)\//.test(path));
  return toolName === "apply_patch";
}

function extractEvidenceLocators(message) {
  if (typeof message !== "string" || !message.trim()) return [];
  const matches = message.matchAll(/(?:^|[\s`'"(\[])(\.?[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+(?::\d+)?)/g);
  const refs = [];
  for (const match of matches) {
    const ref = match[1];
    if (
      ref.length > 256
      || ref.startsWith("/")
      || ref.includes("\\")
      || ref.split("/").some((part) => part === "..")
    ) continue;
    refs.push(ref);
    if (refs.length === 8) break;
  }
  return [...new Set(refs)].sort();
}

async function collectGitWorktreeSummary(root) {
  const head = runGit(root, ["rev-parse", "--verify", "HEAD"]) || "unborn";
  const status = runGit(root, ["status", "--porcelain=v1", "-z"]);
  const numstat = runGit(root, ["diff", "--numstat", "HEAD", "--"]);
  const dirtyPaths = parseStatusPaths(status);
  let insertions = 0;
  let deletions = 0;
  let filesChanged = 0;
  for (const line of numstat.split("\n").filter(Boolean)) {
    const [added, removed] = line.split("\t");
    filesChanged += 1;
    if (/^\d+$/.test(added)) insertions += Number(added);
    if (/^\d+$/.test(removed)) deletions += Number(removed);
  }
  return {
    head,
    dirty_paths: dirtyPaths,
    diff_summary: { files_changed: filesChanged, insertions, deletions },
    diff_digest: `sha256:${createHash("sha256").update(`${status}\0${numstat}`).digest("hex")}`,
  };
}

function runGit(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw hookError("ERR_CODEX_HOOK_GIT_FAILED", result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function parseStatusPaths(status) {
  if (!status) return [];
  const entries = status.split("\0").filter(Boolean);
  const paths = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const code = entry.slice(0, 2);
    const path = entry.slice(3);
    if (path) paths.push(path);
    if ((code.includes("R") || code.includes("C")) && entries[index + 1]) index += 1;
  }
  return [...new Set(paths)].sort();
}

function renderRestoreContext(plan) {
  return [
    "Hypo-Workflow 恢复提示：",
    `下一步：${plan.next_action}`,
    `当前目的：${plan.context.current_goal ?? "未记录"}`,
    `执行范围：${JSON.stringify(plan.context.scope ?? [])}`,
    `非目标：${JSON.stringify(plan.context.non_goals ?? [])}`,
    `最近验证：${JSON.stringify(plan.context.recent_verification ?? null)}`,
    "继续前优先核对当前 Cycle 的 PLAN.md、PROGRESS.md、最近 EXECUTION.md 和 DISCUSSION-SUMMARY.md；不要重放已完成动作。",
  ].join("\n");
}

function renderRuntimeContext(authority) {
  const status = authority.runtime?.status ?? "unknown";
  const nextAction = authority.continuation?.next_action ?? authority.continuation?.action ?? "读取当前 Progress";
  return [
    "Hypo-Workflow 当前工作提示：",
    `工作项：${authority.object_ref.kind}:${authority.object_ref.id}`,
    `状态：${status}`,
    `下一步：${nextAction}`,
    "优先读取语义索引和当前 Cycle 的 PLAN.md、PROGRESS.md、最近 EXECUTION.md 与 DISCUSSION-SUMMARY.md，并以用户最新消息为准。",
  ].join("\n");
}

function sessionStartContext(additionalContext) {
  return {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext,
    },
  };
}

function boundUtf8(value, maximumBytes) {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.length < maximumBytes) return value;
  return `${bytes.subarray(0, maximumBytes - 32).toString("utf8").replace(/\uFFFD+$/u, "")}\n[context truncated]`;
}

function validateHookSpecificOutput(event, value, input) {
  assertPlainObject(value, "Codex Hook hookSpecificOutput");
  if (value.hookEventName !== event) throw hookError("ERR_CODEX_HOOK_OUTPUT_INVALID", "hookEventName does not match the event");
  const contextEvents = new Set(["SessionStart", "UserPromptSubmit", "SubagentStart", "PostToolUse"]);
  if (event === "PreToolUse") {
    assertAllowedOutputKeys(value, ["hookEventName", "additionalContext", "permissionDecision", "permissionDecisionReason", "updatedInput"]);
    if (Object.hasOwn(value, "additionalContext")) requireText(value.additionalContext, "additionalContext");
    if (Object.hasOwn(value, "permissionDecision")) {
      requireOneOf(value.permissionDecision, ["allow", "deny"], "permissionDecision");
      if (value.permissionDecision === "deny") requireText(value.permissionDecisionReason, "permissionDecisionReason");
      if (value.permissionDecision === "allow" && Object.hasOwn(value, "permissionDecisionReason")) {
        throw hookError("ERR_CODEX_HOOK_OUTPUT_UNSUPPORTED", "permissionDecisionReason is only supported for deny");
      }
      if (Object.hasOwn(value, "updatedInput")) {
        if (value.permissionDecision !== "allow") throw hookError("ERR_CODEX_HOOK_OUTPUT_UNSUPPORTED", "updatedInput requires permissionDecision:allow");
        validateUpdatedToolInput(value.updatedInput, input);
      }
    } else if (Object.hasOwn(value, "permissionDecisionReason") || Object.hasOwn(value, "updatedInput")) {
      throw hookError("ERR_CODEX_HOOK_OUTPUT_UNSUPPORTED", "PreToolUse decision fields require permissionDecision");
    }
    return;
  }
  if (event === "PermissionRequest") {
    assertAllowedOutputKeys(value, ["hookEventName", "decision"]);
    assertPlainObject(value.decision, "PermissionRequest decision");
    assertAllowedOutputKeys(value.decision, ["behavior", "message"]);
    requireOneOf(value.decision.behavior, ["allow", "deny"], "PermissionRequest behavior");
    if (value.decision.behavior === "deny") requireText(value.decision.message, "PermissionRequest message");
    return;
  }
  if (!contextEvents.has(event)) throw hookError("ERR_CODEX_HOOK_OUTPUT_UNSUPPORTED", `hookSpecificOutput is unsupported for ${event}`);
  assertAllowedOutputKeys(value, ["hookEventName", "additionalContext"]);
  requireText(value.additionalContext, "additionalContext");
}

function validateUpdatedToolInput(updatedInput, input) {
  assertPlainObject(updatedInput, "updatedInput");
  let normalizedInput;
  try {
    normalizedInput = validateCodexHookInput(input);
  } catch {
    throw hookError("ERR_CODEX_HOOK_OUTPUT_INVALID", "updatedInput rewrite requires validated PreToolUse input context");
  }
  if (normalizedInput.hook_event_name !== "PreToolUse") {
    throw hookError("ERR_CODEX_HOOK_OUTPUT_INVALID", "updatedInput rewrite requires validated PreToolUse input context");
  }
  if (normalizedInput.tool_name === "Bash" || normalizedInput.tool_name === "apply_patch") {
    requireText(updatedInput.command, "updatedInput.command", 512 * 1024);
    return;
  }
  if (/^mcp__[^_].*__[^_].*/i.test(normalizedInput.tool_name)) {
    normalizeJsonValue(updatedInput, "updatedInput");
    return;
  }
  throw hookError("ERR_CODEX_HOOK_OUTPUT_UNSUPPORTED", `updatedInput rewrite is unsupported for ${normalizedInput.tool_name}`);
}

function outputKeysFor(event) {
  if (event === "PreToolUse") return new Set(["systemMessage", "decision", "reason", "hookSpecificOutput"]);
  if (event === "PermissionRequest") return new Set(["systemMessage", "hookSpecificOutput"]);
  if (event === "PostToolUse") return new Set(["continue", "stopReason", "systemMessage", "decision", "reason", "hookSpecificOutput"]);
  if (event === "SubagentStart") return new Set(["continue", "stopReason", "systemMessage", "hookSpecificOutput"]);
  if (event === "SessionStart") return new Set(["continue", "stopReason", "suppressOutput", "systemMessage", "hookSpecificOutput"]);
  if (["UserPromptSubmit", "SubagentStop", "Stop"].includes(event)) {
    const keys = ["continue", "stopReason", "systemMessage", "decision", "reason"];
    if (event === "UserPromptSubmit") keys.push("hookSpecificOutput");
    if (["UserPromptSubmit", "SubagentStop", "Stop"].includes(event)) keys.push("suppressOutput");
    return new Set(keys);
  }
  if (["PreCompact", "PostCompact"].includes(event)) {
    return new Set(["continue", "stopReason", "suppressOutput", "systemMessage"]);
  }
  return new Set(["continue", "stopReason", "systemMessage"]);
}

function requireToolInput(input) {
  requireText(input.tool_name, "tool_name");
  normalizeJsonValue(input.tool_input, "tool_input");
  if (input.tool_name === "Bash" || input.tool_name === "apply_patch") {
    assertPlainObject(input.tool_input, "tool_input");
    requireText(input.tool_input.command, "tool_input.command", 512 * 1024);
  } else if (input.tool_input && typeof input.tool_input === "object" && !Array.isArray(input.tool_input) && Object.hasOwn(input.tool_input, "command")) {
    requireText(input.tool_input.command, "tool_input.command", 512 * 1024);
  }
}

function requireAgentFields(input) {
  requireText(input.agent_id, "agent_id");
  requireText(input.agent_type, "agent_type");
}

function validateOptionalAgentContext(input) {
  const hasAgentId = Object.hasOwn(input, "agent_id");
  const hasAgentType = Object.hasOwn(input, "agent_type");
  if (hasAgentId !== hasAgentType) {
    throw hookError("ERR_CODEX_HOOK_INPUT_INVALID", "Codex Hook agent_id and agent_type must be provided together");
  }
  if (hasAgentId) requireAgentFields(input);
}

function normalizeJsonValue(value, field) {
  normalizeCanonicalValue(value, field);
}

function assertAllowedOutputKeys(value, allowed) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) throw hookError("ERR_CODEX_HOOK_OUTPUT_UNSUPPORTED", `Codex Hook output field ${key} is unsupported`);
  }
}

function requireText(value, field, max = 4096) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\0\r]/.test(value)) {
    throw hookError("ERR_CODEX_HOOK_INPUT_INVALID", `Codex Hook ${field} must be non-empty text`);
  }
}

function requireNullableText(value, field, max = 4096) {
  if (value === null) return;
  requireText(value, field, max);
}

function validateOptionalHookIdentifier(input, field) {
  if (!Object.hasOwn(input, field)) return;
  assertNoRawSecrets(input[field], `Codex Hook ${field}`);
  try {
    normalizeSafeIdentifier(input[field], `Codex Hook ${field}`);
  } catch (error) {
    if (error?.code === "ERR_RAW_SECRET_FORBIDDEN") throw error;
    throw hookError("ERR_CODEX_HOOK_INPUT_INVALID", `Codex Hook ${field} must be a safe identifier`);
  }
}

function requireBoolean(value, field) {
  if (typeof value !== "boolean") throw hookError("ERR_CODEX_HOOK_INPUT_INVALID", `Codex Hook ${field} must be boolean`);
}

function requireOneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw hookError("ERR_CODEX_HOOK_INPUT_INVALID", `Codex Hook ${field} is unsupported`);
}

function hookError(code, message) {
  return authorityError(code, message);
}
