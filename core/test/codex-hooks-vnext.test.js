import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import * as api from "../src/index.js";
import {
  FIXED_NOW,
  OBJECT_REF,
  exists,
  loadOfficialHookCases,
  officialHookCase,
  seedActiveRecovery,
  temporaryGitWorkspace,
} from "./fixtures/c21-m7/helpers.js";

const OFFICIAL_EVENTS = Object.freeze([
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

test("dispatcher publishes exactly the current official Codex event surface and validates official payloads", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-hooks-schema-");
  requireHookApi();
  assert.deepEqual([...api.CODEX_HOOK_EVENTS].sort(), [...OFFICIAL_EVENTS].sort());
  for (const fixture of await loadOfficialHookCases(root)) {
    const normalized = api.validateCodexHookInput(fixture.payload);
    assert.equal(normalized.hook_event_name, fixture.event);
    assert.equal(normalized.cwd, root);
  }
  await assert.rejects(
    async () => api.validateCodexHookInput({ hook_event_name: "InstructionsLoaded", cwd: root }),
    /unsupported|event/i,
  );
});

test("output validator enforces current event-specific restrictions", () => {
  requireHookApi();
  const allowed = [
    ["SessionStart", { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: "bounded context" } }],
    ["PreToolUse", { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "blocked" } }],
    ["PermissionRequest", { hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "deny", message: "blocked" } } }],
    ["PostToolUse", { systemMessage: "Review the completed side effect.", continue: false, stopReason: "review" }],
    ["PreCompact", { continue: true }],
    ["SubagentStart", { hookSpecificOutput: { hookEventName: "SubagentStart", additionalContext: "role evidence" } }],
    ["SubagentStart", { continue: false, stopReason: "parsed for compatibility only" }],
    ["SubagentStop", { decision: "block", reason: "finish evidence" }],
    ["Stop", { continue: true }],
  ];
  for (const [event, output] of allowed) assert.deepEqual(api.validateCodexHookOutput(event, output), output);

  const forbidden = [
    ["PreToolUse", { continue: false }],
    ["PreToolUse", { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask" } }],
    ["PermissionRequest", { updatedInput: { command: "echo rewritten" } }],
    ["PermissionRequest", { interrupt: true }],
    ["PostToolUse", { suppressOutput: true }],
    ["PostToolUse", { updatedMCPToolOutput: {} }],
  ];
  for (const [event, output] of forbidden) {
    assert.throws(() => api.validateCodexHookOutput(event, output), /unsupported|output|field|decision/i);
  }
});

test("PreToolUse is only a guardrail and write-capable events require a unique operation id", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-hooks-ids-");
  requireHookApi();
  for (const event of ["SessionStart", "PreToolUse", "PermissionRequest"]) {
    const output = await api.evaluateCodexHookEvent(root, await officialHookCase(root, event));
    api.validateCodexHookOutput(event, output);
  }
  const preTool = await api.evaluateCodexHookEvent(root, await officialHookCase(root, "PreToolUse"));
  assert.equal(preTool.hookSpecificOutput.permissionDecision, "deny");
  assert.match(preTool.hookSpecificOutput.permissionDecisionReason, /receipt|controlled|delete|destructive/i);

  for (const event of OFFICIAL_EVENTS.filter((name) => !["SessionStart", "PreToolUse", "PermissionRequest"].includes(name))) {
    await assert.rejects(
      () => api.evaluateCodexHookEvent(root, officialHookCaseSyncPlaceholder(event, root)),
      /operation|transaction|unique|id/i,
      `${event} must not persist without an operation id`,
    );
  }
});

test("PreToolUse distinguishes apply_patch source code from an actual file deletion directive", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-hooks-apply-patch-deletion-");
  const base = await officialHookCase(root, "PreToolUse");
  const sourceEdit = await api.evaluateCodexHookEvent(root, {
    ...base,
    tool_name: "apply_patch",
    tool_input: { command: "*** Begin Patch\n*** Update File: core/example.js\n+  await rm(path);\n*** End Patch" },
  });
  assert.deepEqual(sourceEdit, {});

  const deleteFile = await api.evaluateCodexHookEvent(root, {
    ...base,
    tool_name: "apply_patch",
    tool_input: { command: "*** Begin Patch\n*** Delete File: docs/obsolete.md\n*** End Patch" },
  });
  assert.equal(deleteFile.hookSpecificOutput.permissionDecision, "deny");
});

test("compact hooks seal a valid Pack, record the outcome, and restore bounded context", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-hooks-compact-");
  requireHookApi();
  await seedActiveRecovery(root, "m7-compact");

  const pre = await api.evaluateCodexHookEvent(root, await officialHookCase(root, "PreCompact"), {
    id: "m7-pre-compact",
    clock: () => FIXED_NOW,
  });
  api.validateCodexHookOutput("PreCompact", pre);
  const selected = await api.selectLatestValidRecoveryPack(root, { object_ref: OBJECT_REF });
  assert.ok(selected.pack_ref, "PreCompact must seal a Recovery Pack");
  assert.equal(selected.pack.trigger, "pre_compact");

  await api.evaluateCodexHookEvent(root, await officialHookCase(root, "PostCompact"), {
    id: "m7-post-compact",
    clock: () => FIXED_NOW,
  });
  const restored = await api.evaluateCodexHookEvent(root, await officialHookCase(root, "SessionStart"));
  const context = restored.hookSpecificOutput.additionalContext;
  assert.match(context, /seal_recovery_pack_from_verified_capsule/);
  assert.ok(Buffer.byteLength(context) < 16_384, "restored context must stay bounded");
  assert.doesNotMatch(context, /full transcript|raw_journal|transcript_path/i);
});

test("compact hooks ignore terminal Delivery objects without a Context Capsule", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-hooks-terminal-compact-");
  const authorities = await seedActiveRecovery(root, "m7-terminal-compact");
  await api.writeRuntimeObject(root, {
    object_ref: OBJECT_REF,
    runtime: {
      ...authorities.authorities.runtimeInput.runtime,
      status: "accepted",
      phase: "accepted",
    },
    continuation: authorities.authorities.runtimeInput.continuation,
  }, { id: "m7-terminal-compact-runtime" });

  const capsulePath = join(root, ".pipeline/memory/capsules/delivery/goal-alpha.yaml");
  await rm(capsulePath);

  for (const event of ["PreCompact", "PostCompact"]) {
    const output = await api.evaluateCodexHookEvent(root, await officialHookCase(root, event), {
      id: `m7-terminal-${event.toLowerCase()}`,
      clock: () => FIXED_NOW,
    });
    assert.deepEqual(output, { continue: true });
  }
});

test("repeated SessionStart projection refresh is a byte-stable no-op", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-hooks-session-start-noop-");
  await seedActiveRecovery(root, "m7-session-start-noop");
  const payload = { ...await officialHookCase(root, "SessionStart"), source: "resume" };
  await api.evaluateCodexHookEvent(root, payload, {
    id: "m7-session-start-noop-first",
    clock: () => "2026-07-19T12:58:09.635Z",
  });
  const statusPath = join(root, ".pipeline/runtime/host-status-v1.json");
  const before = await readFile(statusPath, "utf8");

  await api.evaluateCodexHookEvent(root, payload, {
    id: "m7-session-start-noop-second",
    clock: () => "2026-07-19T12:58:09.636Z",
  });
  assert.equal(await readFile(statusPath, "utf8"), before);
  const transactions = await readdir(join(root, ".pipeline/runtime/transactions"), {
    withFileTypes: true,
  }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  assert.equal(transactions.some((entry) => entry.isDirectory()), false);
});

test("Subagent streams remain distinct and repeated documentation/Record reminders deduplicate", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-hooks-workers-");
  requireHookApi();
  const { recovery } = await seedActiveRecovery(root, "m7-workers");
  const start = await officialHookCase(root, "SubagentStart");
  const stop = await officialHookCase(root, "SubagentStop");
  const secondStart = { ...start, agent_id: "worker-audit-2", agent_type: "audit" };
  const secondStop = { ...stop, agent_id: "worker-audit-2", agent_type: "audit" };
  await Promise.all([
    api.evaluateCodexHookEvent(root, start, { id: "m7-worker-start-1" }),
    api.evaluateCodexHookEvent(root, secondStart, { id: "m7-worker-start-2" }),
  ]);
  await Promise.all([
    api.evaluateCodexHookEvent(root, stop, { id: "m7-worker-stop-1" }),
    api.evaluateCodexHookEvent(root, secondStop, { id: "m7-worker-stop-2" }),
  ]);
  const replay = await recovery.replayRecoveryJournal(root, { object_ref: OBJECT_REF });
  const workerEvents = replay.events.filter((event) => ["worker.started", "worker.stopped"].includes(event.type));
  assert.equal(workerEvents.length, 4);
  assert.deepEqual(new Set(workerEvents.map((event) => event.writer.id)), new Set(["worker-test-1", "worker-audit-2"]));
  assert.equal(workerEvents.every((event) => Array.isArray(event.payload.evidence_refs)), true);

  const post = await officialHookCase(root, "PostToolUse");
  const first = await api.evaluateCodexHookEvent(root, post, { id: "m7-reminder-first" });
  const second = await api.evaluateCodexHookEvent(root, post, { id: "m7-reminder-repeat" });
  assert.match(first.systemMessage, /document|Record/i);
  assert.equal(second.systemMessage, undefined, "identical semantic change must not repeat its reminder");
  assert.equal(await exists(join(root, ".pipeline/chat/journal.yaml")), false);
  assert.equal(await exists(join(root, ".pipeline/inbox/items.yaml")), false);
});

function requireHookApi() {
  for (const name of [
    "CODEX_HOOK_EVENTS",
    "validateCodexHookInput",
    "validateCodexHookOutput",
    "evaluateCodexHookEvent",
  ]) assert.ok(name in api, `${name} must be exported from the Core root`);
}

function officialHookCaseSyncPlaceholder(event, root) {
  const base = {
    session_id: "session-m7",
    transcript_path: null,
    cwd: root,
    hook_event_name: event,
    model: "gpt-5.6-codex",
    turn_id: "turn-m7",
  };
  const extras = {
    UserPromptSubmit: { permission_mode: "default", prompt: "remember this requirement" },
    PostToolUse: { permission_mode: "default", tool_name: "Bash", tool_use_id: "tool", tool_input: { command: "echo ok" }, tool_response: {} },
    PreCompact: { trigger: "auto" },
    PostCompact: { trigger: "auto" },
    SubagentStart: { permission_mode: "default", agent_id: "worker", agent_type: "test" },
    SubagentStop: { permission_mode: "default", agent_id: "worker", agent_type: "test", agent_transcript_path: null, stop_hook_active: false, last_assistant_message: null },
    Stop: { permission_mode: "default", stop_hook_active: false, last_assistant_message: null },
  };
  return { ...base, ...extras[event] };
}
