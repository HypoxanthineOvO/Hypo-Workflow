import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseYaml } from "../src/config/index.js";
import * as api from "../src/index.js";

const PROJECTS = Object.freeze([
  { id: "hypo-workflow", display_name: "Hypo-Workflow" },
  { id: "hypo-claw", display_name: "Hypo-Claw" },
  { id: "hypo-writer", display_name: "Hypo-Writer" },
]);

const EVENTS = Object.freeze([
  stopEvent({
    id: "stop-hw-1",
    project_id: "hypo-workflow",
    project_display_name: "Hypo-Workflow",
    stop_reason: "waiting_acceptance",
    occurred_at: "2026-05-20T00:29:59+08:00",
    summary: "outside previous window",
  }),
  stopEvent({
    id: "stop-hw-2",
    project_id: "hypo-workflow",
    project_display_name: "Hypo-Workflow",
    stop_reason: "completed",
    occurred_at: "2026-05-20T00:30:00+08:00",
    summary: "M13 notification adapter completed",
  }),
  stopEvent({
    id: "stop-hw-2",
    project_id: "hypo-workflow",
    project_display_name: "Hypo-Workflow",
    stop_reason: "completed",
    occurred_at: "2026-05-20T00:35:00+08:00",
    summary: "duplicate should be ignored",
  }),
  stopEvent({
    id: "stop-claw-1",
    project_id: "hypo-claw",
    project_display_name: "Hypo-Claw",
    stop_reason: "blocked",
    occurred_at: "2026-05-20T23:58:00+08:00",
    summary: "QQ delivery needs retry",
  }),
  stopEvent({
    id: "stop-writer-next",
    project_id: "hypo-writer",
    project_display_name: "Hypo-Writer",
    stop_reason: "completed",
    occurred_at: "2026-05-21T00:30:00+08:00",
    summary: "outside next window",
  }),
]);

const PROGRESS = Object.freeze([
  progressRecord("hypo-workflow", "2026-05-20T01:00:00+08:00", "C16-M13 completed"),
  progressRecord("hypo-claw", "2026-05-20T21:00:00+08:00", "Notification outlet checked"),
  progressRecord("hypo-writer", "2026-05-19T23:59:00+08:00", "outside window"),
]);

const FAILURES = Object.freeze([
  {
    id: "nf-001",
    project_id: "hypo-claw",
    project_display_name: "Hypo-Claw",
    occurred_at: "2026-05-20T23:59:00+08:00",
    status: "queued_for_retry",
    reason: "network unavailable",
    retry_needed: true,
  },
]);

const RETRY_NEEDED = Object.freeze([
  {
    id: "retry-001",
    project_id: "hypo-workflow",
    project_display_name: "Hypo-Workflow",
    occurred_at: "2026-05-21T00:05:00+08:00",
    status: "retry_needed",
    reason: "previous stop notification queued for retry",
  },
]);

test("daily project summary window uses Asia/Shanghai 00:30 inclusive/exclusive boundaries", () => {
  const resolveDailyProjectSummaryWindow = requireApi("resolveDailyProjectSummaryWindow");

  const window = resolveDailyProjectSummaryWindow({
    now: "2026-05-21T00:30:00+08:00",
    timezone: "Asia/Shanghai",
    boundary_time: "00:30",
  });

  assert.equal(window.timezone, "Asia/Shanghai");
  assert.equal(window.boundary_time, "00:30");
  assert.equal(window.start, "2026-05-20T00:30:00+08:00");
  assert.equal(window.end, "2026-05-21T00:30:00+08:00");
  assert.equal(window.boundary, "start_inclusive_end_exclusive");

  const utcEquivalent = resolveDailyProjectSummaryWindow({
    now: "2026-05-20T16:30:00.000Z",
    timezone: "Asia/Shanghai",
    boundary_time: "00:30",
  });
  assert.equal(utcEquivalent.start, "2026-05-20T00:30:00+08:00");
  assert.equal(utcEquivalent.end, "2026-05-21T00:30:00+08:00");
});

test("daily project summary aggregates projects in the 00:30 window and deduplicates stop events", () => {
  const buildDailyProjectSummary = requireApi("buildDailyProjectSummary");

  const summary = buildDailyProjectSummary({
    projects: PROJECTS,
    project_stop_events: EVENTS,
    progress_records: PROGRESS,
    notification_failures: FAILURES,
    retry_needed_items: RETRY_NEEDED,
    now: "2026-05-21T00:30:00+08:00",
  });

  assert.equal(summary.window.start, "2026-05-20T00:30:00+08:00");
  assert.equal(summary.window.end, "2026-05-21T00:30:00+08:00");
  assert.deepEqual(summary.project_stop_events.map((event) => event.id), ["stop-hw-2", "stop-claw-1"]);
  assert.equal(summary.project_stop_events.some((event) => event.id === "stop-hw-1"), false);
  assert.equal(summary.project_stop_events.some((event) => event.id === "stop-writer-next"), false);
  assert.equal(summary.progress_records.length, 2);
  assert.deepEqual(summary.project_counts, {
    hypo_workflow: { stop_events: 1, progress_records: 1 },
    hypo_claw: { stop_events: 1, progress_records: 1 },
    hypo_writer: { stop_events: 0, progress_records: 0 },
  });
});

test("rendered daily summary is Chinese and puts notification failures before project activity", () => {
  const buildDailyProjectSummary = requireApi("buildDailyProjectSummary");
  const renderDailyProjectSummary = requireApi("renderDailyProjectSummary");
  const summary = buildDailyProjectSummary({
    projects: PROJECTS,
    project_stop_events: EVENTS,
    progress_records: PROGRESS,
    notification_failures: FAILURES,
    retry_needed_items: RETRY_NEEDED,
    now: "2026-05-21T00:30:00+08:00",
  });

  const rendered = renderDailyProjectSummary(summary, { language: "zh-CN" });

  assert.match(rendered, /每日项目摘要/);
  assert.match(rendered, /2026-05-20T00:30:00\+08:00/);
  assert.match(rendered, /通知失败/);
  assert.match(rendered, /需要重试|retry/i);
  assert.match(rendered, /Hypo-Claw/);
  assert.match(rendered, /network unavailable/);
  assert.match(rendered, /previous stop notification queued for retry/);
  assert.ok(rendered.indexOf("通知失败") < rendered.indexOf("项目动态"));
  assert.ok(rendered.search(/需要重试|retry/i) < rendered.indexOf("项目动态"));
  assert.ok(rendered.includes("M13 notification adapter completed"));
  assert.doesNotMatch(rendered, /\[REDACTED\]|\.\.\.|truncated/i);
});

test("daily summary notification dry-run reuses Hypo-Claw segmentation without real QQ or Notion writes", async () => {
  const buildDailyProjectSummary = requireApi("buildDailyProjectSummary");
  const sendDailyProjectSummary = requireApi("sendDailyProjectSummary");
  assert.equal(
    typeof api.segmentProjectStopNotification,
    "function",
    "daily summary must reuse the existing Hypo-Claw segmentation contract",
  );
  const calls = [];
  const summary = buildDailyProjectSummary({
    projects: PROJECTS,
    project_stop_events: [
      ...EVENTS,
      stopEvent({
        id: "stop-long",
        project_id: "hypo-writer",
        project_display_name: "Hypo-Writer",
        stop_reason: "completed",
        occurred_at: "2026-05-20T22:00:00+08:00",
        summary: "long ".repeat(500),
      }),
    ],
    progress_records: PROGRESS,
    notification_failures: FAILURES,
    retry_needed_items: RETRY_NEEDED,
    now: "2026-05-21T00:30:00+08:00",
  });

  for (const mode of ["dry-run", "test"]) {
    const result = await sendDailyProjectSummary(summary, {
      mode,
      max_chars: 360,
      spawn: (...args) => {
        calls.push(args);
        throw new Error(`${mode} must not spawn`);
      },
      qq_client: {
        send() {
          throw new Error(`${mode} must not contact QQ`);
        },
      },
      notion_client: {
        appendBlock() {
          throw new Error(`${mode} must not write Notion`);
        },
      },
    });

    assert.equal(result.mode, mode);
    assert.equal(result.external_contacted, false);
    assert.equal(result.qq_contacted, false);
    assert.equal(result.remote_writes_enabled, false);
    assert.ok(result.segments.length > 1);
    assert.equal(result.segments.map((segment) => segment.body).join(""), result.message);
    assert.match(result.message, /long long long/);
    assert.doesNotMatch(result.message, /\[REDACTED\]|\.\.\.|truncated|截断/i);
  }
  assert.deepEqual(calls, []);
});

test("daily summary scheduler dry-run creates local evidence and CLI entry without sending QQ", async () => {
  const runDailyProjectSummaryScheduler = requireApi("runDailyProjectSummaryScheduler");
  const home = await mkdtemp(join(tmpdir(), "hw-daily-summary-home-"));

  const result = await runDailyProjectSummaryScheduler({
    home_dir: home,
    mode: "dry-run",
    projects: PROJECTS,
    project_stop_events: EVENTS,
    progress_records: PROGRESS,
    notification_failures: FAILURES,
    retry_needed_items: RETRY_NEEDED,
  }, { now: "2026-05-20T16:30:00.000Z" });

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.scheduler.schedule.local_time, "00:30");
  assert.equal(result.scheduler.schedule.timezone, "Asia/Shanghai");
  assert.equal(result.summary.window.start, "2026-05-20T00:30:00+08:00");
  assert.equal(result.summary.window.end, "2026-05-21T00:30:00+08:00");
  assert.equal(result.notification.mode, "dry-run");
  assert.equal(result.notification.external_contacted, false);
  assert.equal(result.notification.qq_contacted, false);
  assert.equal(result.notification.remote_writes_enabled, false);
  assert.match(await readFile(result.evidence_paths.summary, "utf8"), /daily_project_summary/);
  assert.match(await readFile(result.evidence_paths.message, "utf8"), /每日项目摘要/);
  const events = await readJsonlEvents(result.ledger_path);
  assert.equal(events.length, 1);
  assert.equal(events[0].event_type, "daily_project_summary_scheduled");
  assert.equal(events[0].metadata.notification_status, "dry_run");
  assert.equal(events[0].metadata.remote_writes_enabled, false);
  assert.equal(events[0].metadata.external_contacted, false);
  await assertCompactSummary(result.ledger_path, {
    event_count: 1,
    latest_event_id: events[0].id,
  });
});

test("daily summary scheduler notify mode requires confirmation and can contact Hypo-Claw through injected runner", async () => {
  const runDailyProjectSummaryScheduler = requireApi("runDailyProjectSummaryScheduler");
  const home = await mkdtemp(join(tmpdir(), "hw-daily-summary-notify-home-"));

  const blocked = await runDailyProjectSummaryScheduler({
    home_dir: home,
    mode: "notify",
  }, { now: "2026-05-20T16:30:00.000Z" });
  assert.equal(blocked.ok, false);
  assert.match(blocked.errors.join("\n"), /confirmed/i);

  const result = await runDailyProjectSummaryScheduler({
    home_dir: home,
    mode: "notify",
    confirmed: true,
    projects: PROJECTS,
    project_stop_events: EVENTS,
    progress_records: PROGRESS,
    notification_failures: FAILURES,
    spawn: async (command, args) => {
      assert.equal(command, "hypo-claw-private-target");
      assert.deepEqual(args, ["--server", "http://localhost:3000"]);
      return {
      status: 0,
      stdout: JSON.stringify({
        outbound: {
          externalContacted: true,
          external_message_id: "qq-daily-summary-123",
        },
      }),
      stderr: "",
      };
    },
  }, { now: "2026-05-20T16:30:00.000Z" });

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.notification.status, "sent");
  assert.equal(result.notification.external_contacted, true);
  assert.equal(result.notification.qq_contacted, true);
  assert.equal(result.scheduler.external_contacted, true);
  const events = await readJsonlEvents(result.ledger_path);
  assert.equal(events.at(-1).event_type, "daily_project_summary_scheduled");
  assert.equal(events.at(-1).metadata.notification_status, "sent");
  assert.equal(events.at(-1).metadata.external_contacted, true);
});

test("CLI daily-summary-scheduler dry-run is cron-callable and has no remote side effects", async () => {
  const home = await mkdtemp(join(tmpdir(), "hw-daily-summary-cli-home-"));
  const output = execFileSync(process.execPath, [
    "cli/bin/hypo-workflow",
    "daily-summary-scheduler",
    "--home",
    home,
    "--now",
    "2026-05-20T16:30:00.000Z",
    "--dry-run",
  ], {
    cwd: ".",
    encoding: "utf8",
  });

  assert.match(output, /daily_project_summary/);
  assert.match(output, /00:30 Asia\/Shanghai/);
  assert.match(output, /remote_writes_enabled=false/);
  assert.match(output, /external_contacted=false/);
  assert.match(output, /crontab/);
  const events = await readJsonlEvents(join(home, ".hypo-workflow", "maintenance", "ledger.jsonl"));
  assert.equal(events.at(-1).event_type, "daily_project_summary_scheduled");
  assert.equal(events.at(-1).metadata.remote_writes_enabled, false);
  assert.equal(events.at(-1).metadata.external_contacted, false);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

async function readJsonlEvents(file) {
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
  assert.equal(summary.events, undefined, "compact summary must not be the maintenance write authority");
}

function stopEvent(overrides = {}) {
  return {
    id: "stop-fixture",
    project_id: "hypo-workflow",
    project_display_name: "Hypo-Workflow",
    stop_reason: "completed",
    occurred_at: "2026-05-20T12:00:00+08:00",
    progress_summary: {
      summary: overrides.summary || "Project stopped.",
    },
    ...overrides,
  };
}

function progressRecord(projectId, occurredAt, summary) {
  return {
    id: `progress-${projectId}-${occurredAt}`,
    project_id: projectId,
    occurred_at: occurredAt,
    summary,
  };
}
