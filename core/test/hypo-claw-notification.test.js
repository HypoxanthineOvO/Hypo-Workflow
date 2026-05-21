import test from "node:test";
import assert from "node:assert/strict";
import * as api from "../src/index.js";

const FINAL_ASSISTANT_OUTPUT = [
  "Final assistant answer must remain exact.",
  "",
  "```bash",
  "printf 'keep fenced code intact'",
  "```",
  "",
  "Token-looking text is still original text: sk-test-fixture and Bearer raw-token.",
  "Trailing line with [brackets], 中文, and punctuation must not be summarized.",
].join("\n");

const LONG_FINAL_OUTPUT = Array.from({ length: 18 }, (_, index) => {
  const n = String(index + 1).padStart(2, "0");
  return `assistant-line-${n}: ${"segment-preservation ".repeat(18)}END-${n}`;
}).join("\n");

const BASE_EVENT = Object.freeze({
  id: "project-stop:hypo-workflow:waiting_acceptance:codex-session-20260520",
  project_id: "hypo-workflow",
  project: {
    id: "hypo-workflow",
    display_name: "Hypo-Workflow",
    path: "/home/heyx/Hypo-Workflow",
  },
  stop_reason: "waiting_acceptance",
  progress_summary: {
    cycle_id: "C16",
    milestone_id: "C16-M13",
    prompt_name: "C16-M13 Hypo-Claw QQ Notification Adapter",
    completed_steps: ["write_tests"],
    current_step: "notify_adapter",
    summary: "RED tests define Hypo-Claw QQ notification behavior.",
  },
  final_assistant_output: FINAL_ASSISTANT_OUTPUT,
  source_platform: "codex",
  session_ref: "~/.codex/sessions/2026/05/20/session.jsonl",
  session_hint: "codex-session-20260520",
  occurred_at: "2026-05-20T23:55:00+08:00",
});

test("formatProjectStopNotification includes project, stop reason, progress, and exact final assistant output", () => {
  const formatProjectStopNotification = requireApi("formatProjectStopNotification");

  const message = formatProjectStopNotification(BASE_EVENT);

  assert.match(message, /Hypo-Workflow/);
  assert.match(message, /hypo-workflow/);
  assert.match(message, /waiting_acceptance/);
  assert.match(message, /C16-M13/);
  assert.match(message, /RED tests define Hypo-Claw QQ notification behavior\./);
  assert.equal(countOccurrences(message, FINAL_ASSISTANT_OUTPUT), 1);
  assert.ok(message.endsWith(FINAL_ASSISTANT_OUTPUT), "final assistant output must be appended verbatim at the end");
  assert.doesNotMatch(message, /\[REDACTED\]|\.\.\.|summary|truncated/i);
});

test("segmentProjectStopNotification preserves full content in ordered complete segments without truncation", () => {
  const formatProjectStopNotification = requireApi("formatProjectStopNotification");
  const segmentProjectStopNotification = requireApi("segmentProjectStopNotification");
  const event = { ...BASE_EVENT, final_assistant_output: LONG_FINAL_OUTPUT };
  const message = formatProjectStopNotification(event);

  const segments = segmentProjectStopNotification(message, { max_chars: 420 });

  assert.ok(segments.length > 1, "fixture must force multiple segments");
  assert.deepEqual(
    segments.map((segment) => segment.index),
    Array.from({ length: segments.length }, (_, index) => index + 1),
  );
  assert.deepEqual(
    segments.map((segment) => segment.total),
    Array.from({ length: segments.length }, () => segments.length),
  );
  assert.equal(segments.map((segment) => segment.body).join(""), message);
  assert.equal(countOccurrences(segments.map((segment) => segment.body).join(""), LONG_FINAL_OUTPUT), 1);
  assert.ok(segments.every((segment) => segment.body.length <= 420));
  assert.equal(segments.at(-1).body.endsWith("END-18"), true);
});

test("dry-run and test modes render segments without contacting QQ or spawning Hypo-Claw", async () => {
  const sendProjectStopNotification = requireApi("sendProjectStopNotification");
  const calls = [];

  for (const mode of ["dry-run", "test"]) {
    const result = await sendProjectStopNotification(BASE_EVENT, {
      mode,
      hypo_claw_cli: "/home/heyx/Hypo-Claw/dist/cli.js",
      server: "https://claw.example.invalid",
      thread_id: "qq-thread-123",
      spawn: (...args) => {
        calls.push(args);
        throw new Error(`${mode} must not spawn`);
      },
      qq_client: {
        send() {
          throw new Error(`${mode} must not contact QQ`);
        },
      },
    });

    assert.equal(result.mode, mode);
    assert.equal(result.external_contacted, false);
    assert.equal(result.qq_contacted, false);
    assert.equal(result.spawned, false);
    assert.ok(result.segments.length >= 1);
    assert.equal(result.segments.map((segment) => segment.body).join("").includes(FINAL_ASSISTANT_OUTPUT), true);
  }

  assert.deepEqual(calls, []);
});

test("notify mode only constructs Hypo-Claw CLI stdin notify invocation with thread id and server", async () => {
  const sendProjectStopNotification = requireApi("sendProjectStopNotification");
  const calls = [];
  const stdout = JSON.stringify({
    status: "delivered",
    outbound: {
      externalContacted: true,
      external_message_id: "qq-msg-123",
    },
  });

  const result = await sendProjectStopNotification(BASE_EVENT, {
    mode: "notify",
    confirmed: true,
    hypo_claw_cli: "/home/heyx/Hypo-Claw/dist/cli.js",
    server: "https://claw.example.invalid",
    thread_id: "qq-thread-123",
    spawn: async (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0, stdout, stderr: "" };
    },
    qq_client: {
      send() {
        throw new Error("adapter must not contact QQ directly");
      },
    },
  });

  assert.equal(result.status, "sent");
  assert.equal(result.external_contacted, true);
  assert.equal(result.qq_contacted, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "/home/heyx/Hypo-Claw/dist/cli.js");
  assert.deepEqual(calls[0].args, [
    "--stdin",
    "--notify",
    "--thread-id",
    "qq-thread-123",
    "--server",
    "https://claw.example.invalid",
  ]);
  assert.equal(calls[0].options?.stdin.includes(FINAL_ASSISTANT_OUTPUT), true);
  assert.doesNotMatch(JSON.stringify(calls[0]), /--test|curl|qq_client|sendMessage|token/i);
});

test("notify mode supports executable plus prefix args for TypeScript Hypo-Claw CLI", async () => {
  const sendProjectStopNotification = requireApi("sendProjectStopNotification");
  const calls = [];
  const stdout = JSON.stringify({
    outbound: {
      externalContacted: true,
      external_message_id: "qq-msg-456",
    },
  });

  const result = await sendProjectStopNotification(BASE_EVENT, {
    mode: "notify",
    confirmed: true,
    hypo_claw_cli: "/home/heyx/Hypo-Claw/node_modules/.bin/tsx",
    hypo_claw_args: ["/home/heyx/Hypo-Claw/src/cli.ts"],
    server: "http://localhost:3000",
    spawn: async (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0, stdout, stderr: "" };
    },
  });

  assert.equal(result.status, "sent");
  assert.equal(calls[0].command, "/home/heyx/Hypo-Claw/node_modules/.bin/tsx");
  assert.deepEqual(calls[0].args, [
    "/home/heyx/Hypo-Claw/src/cli.ts",
    "--stdin",
    "--notify",
    "--server",
    "http://localhost:3000",
  ]);
});

test("notify mode requires explicit adapter confirmation before spawning Hypo-Claw", async () => {
  const sendProjectStopNotification = requireApi("sendProjectStopNotification");
  const calls = [];

  const result = await sendProjectStopNotification(BASE_EVENT, {
    mode: "notify",
    confirmed: false,
    hypo_claw_cli: "/home/heyx/Hypo-Claw/dist/cli.js",
    spawn: async (...args) => {
      calls.push(args);
      throw new Error("unconfirmed notify must not spawn");
    },
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.external_contacted, false);
  assert.equal(result.spawned, false);
  assert.equal(result.confirmation_required, true);
  assert.match(result.reason, /confirmation/i);
  assert.deepEqual(calls, []);
});

test("notify mode sends long notifications as ordered Hypo-Claw segment calls", async () => {
  const sendProjectStopNotification = requireApi("sendProjectStopNotification");
  const calls = [];
  const event = { ...BASE_EVENT, final_assistant_output: LONG_FINAL_OUTPUT };
  const stdout = JSON.stringify({
    delivery: {
      externalContacted: true,
      external_message_id: "qq-msg-long",
    },
  });

  const result = await sendProjectStopNotification(event, {
    mode: "notify",
    confirmed: true,
    max_chars: 420,
    hypo_claw_cli: "/home/heyx/Hypo-Claw/dist/cli.js",
    server: "https://claw.example.invalid",
    thread_id: "qq-thread-123",
    spawn: async (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0, stdout, stderr: "" };
    },
  });

  assert.equal(result.status, "sent");
  assert.ok(result.segments.length > 1);
  assert.equal(calls.length, result.segments.length);
  assert.deepEqual(
    calls.map((call) => JSON.parse(String(call.options.stdin)).segment.index),
    result.segments.map((segment) => segment.index),
  );
  assert.deepEqual(
    calls.map((call) => JSON.parse(String(call.options.stdin)).segment.total),
    result.segments.map((segment) => segment.total),
  );
  assert.equal(
    calls.map((call) => JSON.parse(String(call.options.stdin)).message).join(""),
    result.message,
  );
});

test("notify mode queues retry when Hypo-Claw exits cleanly without QQ delivery evidence", async () => {
  const sendProjectStopNotification = requireApi("sendProjectStopNotification");
  const retryWrites = [];

  const result = await sendProjectStopNotification(BASE_EVENT, {
    mode: "notify",
    confirmed: true,
    hypo_claw_cli: "/home/heyx/Hypo-Claw/dist/cli.js",
    server: "https://claw.example.invalid",
    thread_id: "qq-thread-123",
    spawn: async () => ({
      status: 0,
      stdout: JSON.stringify({ text: "收到", thread_id: "thr_local_only" }),
      stderr: "",
    }),
    append_retry_queue: async (entry) => {
      retryWrites.push(entry);
      return "/home/heyx/.hypo-workflow/notifications/retry-queue.yaml";
    },
  });

  assert.equal(result.status, "queued_for_retry");
  assert.equal(retryWrites.length, 1);
  assert.equal(retryWrites[0].failure.stderr, "Hypo-Claw notification did not provide QQ delivery evidence");
});

test("notify failure writes a local retry queue entry and preserves original message text", async () => {
  const sendProjectStopNotification = requireApi("sendProjectStopNotification");
  const retryWrites = [];

  const result = await sendProjectStopNotification(BASE_EVENT, {
    mode: "notify",
    confirmed: true,
    hypo_claw_cli: "/home/heyx/Hypo-Claw/dist/cli.js",
    server: "https://claw.example.invalid",
    thread_id: "qq-thread-123",
    spawn: async () => ({ status: 1, stdout: "", stderr: "network unavailable" }),
    append_retry_queue: async (entry) => {
      retryWrites.push(entry);
      return "/home/heyx/.hypo-workflow/notifications/retry-queue.yaml";
    },
  });

  assert.equal(result.status, "queued_for_retry");
  assert.equal(result.retry_queue_path, "/home/heyx/.hypo-workflow/notifications/retry-queue.yaml");
  assert.equal(retryWrites.length, 1);
  assert.equal(retryWrites[0].channel, "hypo-claw-qq");
  assert.equal(retryWrites[0].status, "queued");
  assert.equal(retryWrites[0].failure.stderr, "network unavailable");
  assert.deepEqual(retryWrites[0].cli.args, [
    "--stdin",
    "--notify",
    "--thread-id",
    "qq-thread-123",
    "--server",
    "https://claw.example.invalid",
  ]);
  assert.equal(retryWrites[0].message.includes(FINAL_ASSISTANT_OUTPUT), true);
  assert.equal(retryWrites[0].original_event.final_assistant_output, FINAL_ASSISTANT_OUTPUT);
  assert.doesNotMatch(JSON.stringify(retryWrites[0]), /\[REDACTED\]|\.\.\.|truncated/i);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

function countOccurrences(value, needle) {
  return value.split(needle).length - 1;
}
