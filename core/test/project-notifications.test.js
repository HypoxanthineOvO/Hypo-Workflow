import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseYaml } from "../src/config/index.js";
import * as api from "../src/index.js";

const FINAL_OUTPUT = "Final output for queued stop notification.\n\nNo truncation.";

test("enqueueProjectStopNotification writes pending evidence without contacting QQ", async () => {
  const enqueueProjectStopNotification = requireApi("enqueueProjectStopNotification");
  const home = await mkdtemp(join(tmpdir(), "hw-pending-notify-home-"));

  const result = await enqueueProjectStopNotification(baseStopInput({ home_dir: home }), {
    now: "2026-05-21T15:00:00+08:00",
    spawn: async () => {
      throw new Error("enqueue must not spawn");
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "queued");
  assert.equal(result.external_contacted, false);
  assert.equal(result.qq_contacted, false);
  assert.match(result.entry.message, /Final output for queued stop notification/);
  assert.equal(result.queue_path, join(home, ".hypo-workflow", "notifications", "project-stop-pending.jsonl"));
  const queue = await readJsonlEntries(result.queue_path);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].status, "pending");
  assert.equal(queue[0].dispatch.mode, "confirmed_dispatcher_required");
  assert.equal(queue[0].dispatch.external_contacted, false);
  assert.equal(queue[0].dispatch.qq_contacted, false);
  assert.match(queue[0].message, /Final output for queued stop notification/);
  await assertCompactSummary(result.queue_path, {
    event_count: 1,
    latest_event_id: queue[0].id,
  });
});

test("dispatchProjectStopNotifications sends pending entries only with confirmed dispatcher", async () => {
  const enqueueProjectStopNotification = requireApi("enqueueProjectStopNotification");
  const dispatchProjectStopNotifications = requireApi("dispatchProjectStopNotifications");
  const home = await mkdtemp(join(tmpdir(), "hw-dispatch-notify-home-"));
  await enqueueProjectStopNotification(baseStopInput({ home_dir: home }), {
    now: "2026-05-21T15:00:00+08:00",
  });

  const blocked = await dispatchProjectStopNotifications({ home_dir: home }, {
    now: "2026-05-21T15:01:00+08:00",
    spawn: async () => {
      throw new Error("unconfirmed dispatcher must not spawn");
    },
  });
  assert.equal(blocked.status, "partial");
  assert.equal(blocked.results[0].status, "blocked_confirmation_required");
  assert.equal(blocked.external_contacted, false);

  await enqueueProjectStopNotification({
    ...baseStopInput({ home_dir: home }),
    terminal_at: "2026-05-21T15:02:00+08:00",
    occurred_at: "2026-05-21T15:02:00+08:00",
  }, { now: "2026-05-21T15:02:00+08:00" });
  const calls = [];
  const sent = await dispatchProjectStopNotifications({ home_dir: home, confirmed: true }, {
    now: "2026-05-21T15:03:00+08:00",
    spawn: async (command, args, options) => {
      calls.push({ command, args, options });
      return {
        status: 0,
        stdout: JSON.stringify({
          outbound: {
            externalContacted: true,
            external_message_id: "qq-project-stop-123",
          },
        }),
        stderr: "",
      };
    },
  });

  assert.equal(sent.sent, 1);
  assert.equal(sent.qq_contacted, true);
  assert.equal(calls[0].command, "hypo-claw-private-target");
  const queue = await readJsonlEntries(sent.queue_path);
  assert.ok(queue.some((entry) => entry.status === "pending"));
  const sentEntry = queue.find((entry) => entry.status === "sent");
  assert.ok(sentEntry, "confirmed dispatch should append a sent queue entry");
  assert.equal(sentEntry.notification_result.qq_delivery.external_message_id, "qq-project-stop-123");
  assert.equal(sentEntry.notification_result.external_contacted, true);
});

test("Claude Stop hook reports retired project notification path without external side effects", async () => {
  const evaluateClaudeHookEvent = requireApi("evaluateClaudeHookEvent");
  const dir = await mkdtemp(join(tmpdir(), "hw-claude-stop-notify-"));
  const home = await mkdtemp(join(tmpdir(), "hw-claude-stop-home-"));
  await writeCompletedState(dir);

  const output = await evaluateClaudeHookEvent("Stop", {
    cwd: dir,
    final_assistant_output: FINAL_OUTPUT,
    notification_home_dir: home,
  }, { projectRoot: dir });

  assert.match(output.systemMessage, /notification enqueue is retired/i);
  assert.equal(output.project_stop_notification.status, "retired");
  assert.equal(output.project_stop_notification.replacement, "Hermes Codex completion watch");
  assert.equal(output.project_stop_notification.external_contacted, false);
  assert.equal(output.project_stop_notification.qq_contacted, false);
});

test("Codex notify hook no longer enqueues retired project-stop QQ notifications", async () => {
  const script = await readFile("hooks/codex-notify.sh", "utf8");

  assert.match(script, /workflow_root=/);
  assert.match(script, /project-stop QQ enqueue retired/);
  assert.doesNotMatch(script, /project-notifications enqueue/);
  assert.doesNotMatch(script, /project-notifications dispatch/);
  assert.doesNotMatch(script, /--confirmed/);
});

test("project notification dispatcher wrapper is retired and does not dispatch", async () => {
  const script = await readFile("scripts/project-notification-dispatcher.sh", "utf8");

  assert.match(script, /\$\{HOME\}\/\.local\/bin:\$\{HOME\}\/\.volta\/bin/);
  assert.match(script, /\/usr\/local\/bin:\/usr\/bin:\/bin/);
  assert.doesNotMatch(script, /\/home\/heyx/);
  assert.match(script, /dispatcher is retired/);
  assert.doesNotMatch(script, /project-notifications dispatch/);
  assert.doesNotMatch(script, /--confirmed/);
});

test("project-notifications CLI exposes status and dispatch commands", () => {
  const help = execFileSync(process.execPath, ["cli/bin/hypo-workflow", "--help"], {
    cwd: ".",
    encoding: "utf8",
  });

  assert.match(help, /project-notifications enqueue\|dispatch\|status/);
});

function baseStopInput(overrides = {}) {
  return {
    project: {
      id: "hypo-workflow",
      display_name: "Hypo-Workflow",
      path: "/home/heyx/Hypo-Workflow",
    },
    source_platform: "codex",
    workflow_state: {
      pipeline: {
        name: "Hypo-Workflow",
        status: "pending_acceptance",
      },
      current: {
        phase: "pending_acceptance",
        prompt_name: "C16-M15 Project Linkage End To End Dry-Run",
      },
    },
    final_assistant_output: FINAL_OUTPUT,
    occurred_at: "2026-05-21T15:00:00+08:00",
    terminal_at: "2026-05-21T15:00:00+08:00",
    ...overrides,
  };
}

async function writeCompletedState(dir) {
  await mkdir(join(dir, ".pipeline"), { recursive: true });
  await writeFile(join(dir, ".pipeline", "config.yaml"), "project:\n  id: hypo-workflow\n", "utf8");
  await writeFile(join(dir, ".pipeline", "cycle.yaml"), "cycle:\n  number: 16\n", "utf8");
  await writeFile(join(dir, ".pipeline", "state.yaml"), [
    "pipeline:",
    "  name: Hypo-Workflow",
    "  status: pending_acceptance",
    "  finished: 2026-05-21T01:30:00+08:00",
    "current:",
    "  phase: pending_acceptance",
    "  prompt_name: C16-M15 Project Linkage End To End Dry-Run",
    "  prompt_file: .pipeline/prompts/14-project-linkage-e2e-dry-run.md",
    "",
  ].join("\n"), "utf8");
}

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

async function readJsonlEntries(file) {
  assert.match(file, /\.jsonl$/, `${file} must be a JSONL authority file`);
  const source = await readFile(file, "utf8");
  return source.trimEnd().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

async function assertCompactSummary(jsonlPath, expected) {
  const summaryPath = jsonlPath.replace(/\.jsonl$/, ".summary.yaml");
  const summary = parseYaml(await readFile(summaryPath, "utf8"));
  assert.equal(summary.authority, "jsonl");
  assert.equal(summary.authority_path, jsonlPath);
  assert.equal(summary.event_count, expected.event_count);
  assert.equal(summary.latest_event_id, expected.latest_event_id);
  assert.equal(summary.events, undefined, "compact summary must not be the pending queue authority");
}
