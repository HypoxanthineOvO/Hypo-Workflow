import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  OBJECT_REF,
  REPOSITORY_ROOT,
  officialHookCase,
  seedActiveRecovery,
  spawnHook,
  temporaryGitWorkspace,
  WRAPPER_PATH,
} from "./fixtures/c21-m7/helpers.js";

const EVENTS = [
  "SessionStart", "UserPromptSubmit", "PreToolUse", "PermissionRequest", "PostToolUse",
  "PreCompact", "PostCompact", "SubagentStart", "SubagentStop", "Stop",
];

test("Codex plugin Hook config registers every official event with seconds-based command handlers", async () => {
  const config = JSON.parse(await readFile(join(REPOSITORY_ROOT, "hooks", "hooks.json"), "utf8"));
  assert.deepEqual(Object.keys(config.hooks).sort(), [...EVENTS].sort());
  for (const event of EVENTS) {
    assert.ok(config.hooks[event].length > 0, `${event} must have a matcher group`);
    for (const group of config.hooks[event]) {
      for (const hook of group.hooks) {
        assert.equal(hook.type, "command");
        assert.match(hook.command, /codex-hook\.mjs/);
        assert.equal(Number.isInteger(hook.timeout), true);
        assert.ok(hook.timeout > 0 && hook.timeout <= 600, "Codex timeout must be expressed in seconds");
      }
    }
  }
  assert.equal("InstructionsLoaded" in config.hooks, false, "Claude-only events must be isolated from Codex config");
});

test("wrapper emits exactly one JSON object on stdout and keeps diagnostics on stderr", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-hook-process-");
  const payload = await officialHookCase(root, "UserPromptSubmit");
  const child = spawnHook(root, payload, { operation_id: "m7-process-valid" });
  assert.equal(child.status, 0, child.stderr);
  const lines = child.stdout.split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 1, `stdout must contain one JSON line, got: ${child.stdout}`);
  assert.doesNotThrow(() => JSON.parse(lines[0]));
  assert.doesNotMatch(child.stdout, /debug|diagnostic|stack|warning:/i);

  const invalid = spawnHook(root, null, { raw_input: "{not valid json\n", operation_id: "m7-process-invalid" });
  assert.notEqual(invalid.status, 0);
  assert.equal(invalid.stdout.trim(), "", "invalid-input diagnostics must not leak onto stdout");
  assert.match(invalid.stderr, /json|parse|invalid/i);
});

test("wrapper accepts a VSP subagent PostToolUse command input", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m3a-subagent-post-tool-");
  const payload = {
    ...await officialHookCase(root, "PostToolUse"),
    agent_id: "vsp-test-worker-1",
    agent_type: "test",
  };
  const child = spawnHook(root, payload, { operation_id: "m3a-subagent-post-tool" });
  assert.equal(child.status, 0, child.stderr);
  const lines = child.stdout.split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 1, `stdout must contain one JSON line, got: ${child.stdout}`);
  assert.doesNotThrow(() => JSON.parse(lines[0]));
});

test("concurrent PostToolUse processes claim one reminder marker while Stop retains main Recovery", async (t) => {
  const root = await temporaryGitWorkspace(t, "hw-m7-hook-concurrent-reminder-");
  const { recovery } = await seedActiveRecovery(root, "m7-hook-concurrent-reminder");
  const preCompact = spawnHookWithDeadline(
    root,
    await officialHookCase(root, "PreCompact"),
    "concurrent-reminder-pre-compact",
  );
  t.after(() => killChild(preCompact.child));
  const preCompactResult = await preCompact.result;
  assert.equal(preCompactResult.code, 0, preCompactResult.stderr);

  const sessionId = "session-hook-concurrent-reminder";
  const postToolPayload = {
    ...await officialHookCase(root, "PostToolUse"),
    session_id: sessionId,
  };
  const operations = [
    ...Array.from({ length: 16 }, (_, index) => ({
      id: `concurrent-post-tool-${index}`,
      payload: postToolPayload,
    })),
    {
      id: "concurrent-stop",
      payload: {
        ...await officialHookCase(root, "Stop"),
        session_id: sessionId,
        turn_id: "turn-concurrent-stop",
      },
    },
  ];
  const children = operations.map(({ id, payload }) => spawnHookWithDeadline(root, payload, id));
  t.after(() => children.forEach(({ child }) => killChild(child)));

  const results = await Promise.all(children.map(({ result }) => result));
  const outputs = [];
  for (const result of results) {
    assert.equal(result.code, 0, result.stderr);
    const lines = result.stdout.split(/\r?\n/).filter(Boolean);
    assert.equal(lines.length, 1, result.stdout);
    outputs.push(JSON.parse(lines[0]));
  }
  assert.equal(outputs.filter((output) => typeof output.systemMessage === "string").length, 1);

  const replay = await recovery.replayRecoveryJournal(root, { object_ref: OBJECT_REF });
  assert.equal(replay.events.some((event) => event.type === "tool.completed"), false);
  const events = replay.events.filter((event) => event.session_id === sessionId);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "turn.agent");
  assert.deepEqual(events[0].writer, { kind: "main", id: "main" });
  const cursorStreams = replay.cursor.streams.filter((stream) => stream.session_id === sessionId);
  assert.equal(cursorStreams.length, 1);
  assert.deepEqual(cursorStreams[0].writer, { kind: "main", id: "main" });
  assert.equal(cursorStreams[0].sequence, 1);

  const restore = await recovery.planRecoveryRestore(root, {
    object_ref: OBJECT_REF,
    budget_bytes: 12_288,
  });
  assert.ok(restore.selected_pack_ref);
  assert.equal(typeof restore.next_action, "string");
});

function killChild(child) {
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
}

function spawnHookWithDeadline(root, payload, operationId, timeoutMs = 15_000) {
  const child = spawn(process.execPath, [WRAPPER_PATH], {
    cwd: root,
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      PLUGIN_ROOT: REPOSITORY_ROOT,
      HYPO_WORKFLOW_TEST_OPERATION_ID: operationId,
    },
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdin.end(`${JSON.stringify(payload)}\n`);
  const result = new Promise((resolveResult, rejectResult) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectResult(new Error(`Hook process deadline exceeded after ${timeoutMs}ms: ${operationId}`));
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      rejectResult(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolveResult({ code, signal, stdout, stderr });
    });
  });
  return { child, result };
}
