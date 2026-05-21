import test from "node:test";
import assert from "node:assert/strict";
import * as api from "../src/index.js";

const TERMINAL_STATES = Object.freeze([
  ["waiting_acceptance", "waiting_acceptance"],
  ["completed", "completed"],
  ["blocked", "blocked"],
  ["failed", "failed"],
  ["cannot_continue", "cannot_continue"],
]);

const BASE_INPUT = Object.freeze({
  project: {
    id: "hypo-workflow",
    display_name: "Hypo-Workflow",
    path: "/home/heyx/Hypo-Workflow",
  },
  source_platform: "codex",
  session: {
    id: "codex-session-20260520-231500",
    ref: "~/.codex/sessions/2026/05/20/session.jsonl",
  },
  progress_summary: {
    cycle_id: "C16",
    milestone_id: "C16-M11",
    prompt_name: "C16-M11 Project Stop Event Detection",
    completed_steps: ["write_tests"],
    current_step: "red_contract_tests",
    summary: "RED project-stop event contract tests were added.",
  },
  occurred_at: "2026-05-20T23:15:00+08:00",
  terminal_at: "2026-05-20T23:14:30+08:00",
});

test("terminal workflow states classify as project stop events", () => {
  const classifyProjectStopEvent = requireApi("classifyProjectStopEvent");

  for (const [status, expectedReason] of TERMINAL_STATES) {
    const result = classifyProjectStopEvent({
      ...BASE_INPUT,
      workflow_state: workflowState({
        pipeline_status: status,
        phase: status,
        auto_continue_available: false,
      }),
    });

    assert.equal(result.should_emit, true, `${status} must emit a stop event`);
    assert.equal(result.stop_reason, expectedReason);
    assert.equal(result.event.project_id, "hypo-workflow");
    assert.equal(result.event.stop_reason, expectedReason);
  }
});

test("manual chat pause and user message text do not classify as project stop events", () => {
  const classifyProjectStopEvent = requireApi("classifyProjectStopEvent");

  const result = classifyProjectStopEvent({
    ...BASE_INPUT,
    source_platform: "opencode",
    workflow_state: workflowState({
      pipeline_status: "running",
      phase: "chat",
      auto_continue_available: true,
    }),
    user_message: "先暂停一下，等我后续消息。",
    manual_pause: {
      kind: "chat_pause",
      requested_by: "user",
      reason: "manual conversation pause",
    },
  });

  assert.equal(result.should_emit, false);
  assert.equal(result.stop_reason, null);
  assert.equal(result.event, null);
});

test("intermediate milestone completion does not emit when auto-continue remains possible", () => {
  const classifyProjectStopEvent = requireApi("classifyProjectStopEvent");

  const result = classifyProjectStopEvent({
    ...BASE_INPUT,
    workflow_state: workflowState({
      pipeline_status: "running",
      phase: "milestone_complete",
      milestone_status: "completed",
      auto_continue_available: true,
      prompts_total: 5,
      prompts_completed: 2,
    }),
  });

  assert.equal(result.should_emit, false);
  assert.equal(result.stop_reason, null);
  assert.equal(result.event, null);
});

test("project stop event exposes local append-only evidence contract and no external action plan", () => {
  const buildProjectStopEvent = requireApi("buildProjectStopEvent");

  const event = buildProjectStopEvent({
    ...BASE_INPUT,
    stop_reason: "waiting_acceptance",
  });

  assert.equal(event.project_id, "hypo-workflow");
  assert.equal(event.stop_reason, "waiting_acceptance");
  assert.equal(event.occurred_at, "2026-05-20T23:15:00+08:00");
  assert.deepEqual(event.progress_summary, BASE_INPUT.progress_summary);
  assert.equal(event.source_platform, "codex");
  assert.equal(event.session_ref, "~/.codex/sessions/2026/05/20/session.jsonl");
  assert.equal(event.session_hint, "codex-session-20260520-231500");
  assert.equal(event.notification_state, "pending");

  assert.match(event.id, /^project-stop:hypo-workflow:waiting_acceptance:/);
  assert.equal(event.dedupe_key, event.id);
  assert.equal(event.evidence.mode, "local_append_only");
  assert.match(event.evidence.path, /project-stop-events/);
  assert.deepEqual(event.planned_actions, []);
  assert.equal(event.remote_writes_enabled, false);
  assert.equal(event.external_actions_enabled, false);
  assert.doesNotMatch(JSON.stringify(event), /\b(QQ|Notion|notify|send|external_action|remote_write)\b/i);
});

test("duplicate terminal states produce a stable event id and dedupe key", () => {
  const buildProjectStopEvent = requireApi("buildProjectStopEvent");

  const first = buildProjectStopEvent({
    ...BASE_INPUT,
    stop_reason: "failed",
    occurred_at: "2026-05-20T23:15:00+08:00",
  });
  const duplicate = buildProjectStopEvent({
    ...BASE_INPUT,
    stop_reason: "failed",
    occurred_at: "2026-05-20T23:16:00+08:00",
  });

  assert.equal(first.id, duplicate.id);
  assert.equal(first.dedupe_key, duplicate.dedupe_key);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

function workflowState({
  pipeline_status,
  phase,
  milestone_status = "in_progress",
  auto_continue_available,
  prompts_total = 1,
  prompts_completed = 1,
}) {
  return {
    pipeline: {
      name: "Hypo-Workflow",
      status: pipeline_status,
      prompts_total,
      prompts_completed,
    },
    current: {
      phase,
      prompt_name: "C16-M11 Project Stop Event Detection",
      step: null,
    },
    milestones: [
      {
        id: "C16-M11",
        status: milestone_status,
      },
    ],
    continuation: {
      auto_continue_available,
    },
  };
}
