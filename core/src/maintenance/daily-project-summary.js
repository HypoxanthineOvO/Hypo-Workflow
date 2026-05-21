import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { stringifyYaml } from "../config/index.js";
import { buildProjectLinkageRegistry } from "../project-linkage/index.js";
import { segmentProjectStopNotification, sendProjectStopNotification } from "../notification-sender/index.js";
import {
  appendJsonlLedgerEntry,
  jsonlLedgerPathFor,
} from "../ledger/index.js";

const DEFAULT_TIMEZONE = "Asia/Shanghai";
const DEFAULT_BOUNDARY_TIME = "00:30";

export function resolveDailyProjectSummaryWindow(input = {}) {
  const timezone = input.timezone || DEFAULT_TIMEZONE;
  const boundaryTime = input.boundary_time || input.boundaryTime || DEFAULT_BOUNDARY_TIME;
  const now = parseShanghaiDateTime(input.now ? normalizeShanghaiDateTime(input.now) : currentShanghaiDateTime());
  const [hour, minute] = boundaryTime.split(":").map(Number);
  const end = {
    year: now.year,
    month: now.month,
    day: now.day,
    hour,
    minute,
    second: 0,
  };
  const start = addShanghaiDays(end, -1);
  return {
    timezone,
    boundary_time: boundaryTime,
    start: formatShanghaiDateTime(start),
    end: formatShanghaiDateTime(end),
    boundary: "start_inclusive_end_exclusive",
  };
}

export function buildDailyProjectSummary(input = {}) {
  const window = input.window || resolveDailyProjectSummaryWindow(input);
  const projects = Array.isArray(input.projects) ? input.projects.map(clone) : [];
  const stopEvents = dedupeById(filterWindow(input.project_stop_events || [], window, "occurred_at"));
  const progressRecords = filterWindow(input.progress_records || [], window, "occurred_at");
  const notificationFailures = [
    ...filterWindow(input.notification_failures || [], window, "occurred_at"),
    ...filterWindow(input.retry_needed_items || [], window, "occurred_at"),
  ]
    .filter((item) => item.retry_needed || item.status === "queued_for_retry" || item.status === "retry_needed" || item.status === "failed");

  const projectCounts = {};
  for (const project of projects) {
    projectCounts[safeCountKey(project.id)] = {
      stop_events: stopEvents.filter((event) => event.project_id === project.id).length,
      progress_records: progressRecords.filter((record) => record.project_id === project.id).length,
    };
  }

  return {
    kind: "daily_project_summary",
    language: input.language || "zh-CN",
    window,
    projects,
    notification_failures: notificationFailures.map(clone),
    retry_needed_items: notificationFailures.filter((item) => item.retry_needed || item.status === "retry_needed").map(clone),
    project_stop_events: stopEvents.map(clone),
    progress_records: progressRecords.map(clone),
    project_counts: projectCounts,
    remote_writes_enabled: false,
    external_actions_enabled: false,
  };
}

export function renderDailyProjectSummary(summary = {}, options = {}) {
  const window = summary.window || {};
  const failures = Array.isArray(summary.notification_failures) ? summary.notification_failures : [];
  const stopEvents = Array.isArray(summary.project_stop_events) ? summary.project_stop_events : [];
  const progressRecords = Array.isArray(summary.progress_records) ? summary.progress_records : [];
  const projects = Array.isArray(summary.projects) ? summary.projects : [];
  const lines = [
    "每日项目摘要",
    `窗口：${window.start || ""} 至 ${window.end || ""}（${window.timezone || DEFAULT_TIMEZONE}，起始含、结束不含）`,
    "",
    "通知失败 / 需要重试",
  ];

  if (failures.length === 0) {
    lines.push("- 无");
  } else {
    for (const failure of failures) {
      lines.push(`- ${displayProject(failure)}：${failure.reason || failure.status || "需要重试"}`);
    }
  }

  lines.push("", "项目动态");
  for (const project of projects) {
    const projectStops = stopEvents.filter((event) => event.project_id === project.id);
    const projectProgress = progressRecords.filter((record) => record.project_id === project.id);
    if (projectStops.length === 0 && projectProgress.length === 0) {
      lines.push(`- ${project.display_name || project.id}：无新增停止事件或进度记录`);
      continue;
    }
    lines.push(`- ${project.display_name || project.id}`);
    for (const event of projectStops) {
      lines.push(`  - 停止：${event.stop_reason || "unknown"}，${event.progress_summary?.summary || event.summary || ""}`);
    }
    for (const record of projectProgress) {
      lines.push(`  - 进度：${record.summary || ""}`);
    }
  }

  return lines.join("\n");
}

export async function sendDailyProjectSummary(summary = {}, options = {}) {
  const message = options.message || renderDailyProjectSummary(summary, options);
  if (options.mode === "dry-run" || options.mode === "test" || !options.mode) {
    return {
      status: options.mode === "test" ? "test_ready" : "dry_run",
      mode: options.mode || "dry-run",
      channel: "hypo-claw-qq",
      external_contacted: false,
      qq_contacted: false,
      spawned: false,
      remote_writes_enabled: false,
      message,
      segments: segmentProjectStopNotification(message, options),
    };
  }

  return {
    ...await sendProjectStopNotification({
      project_id: "daily-project-summary",
      project_display_name: "Daily Project Summary",
      stop_reason: "daily_summary",
      progress_summary: { summary: "Daily project summary notification." },
      final_assistant_output: message,
      occurred_at: summary.window?.end || new Date().toISOString(),
    }, {
      ...options,
      message,
    }),
    remote_writes_enabled: false,
  };
}

export async function runDailyProjectSummaryScheduler(input = {}, options = {}) {
  const now = options.now || input.now || new Date().toISOString();
  const mode = input.mode || "dry-run";
  if (!["dry-run", "notify"].includes(mode)) {
    return {
      ok: false,
      errors: ["daily project summary scheduler only supports dry-run or confirmed notify mode"],
      scheduler: dailySchedulerSummary("blocked", now),
    };
  }
  if (mode === "notify" && input.confirmed !== true) {
    return {
      ok: false,
      errors: ["daily project summary notify mode requires --confirmed"],
      scheduler: dailySchedulerSummary("blocked", now),
    };
  }

  const registry = input.projects ? null : buildProjectLinkageRegistry();
  const projects = input.projects || registry?.active_notification_targets || [];
  const summary = buildDailyProjectSummary({
    projects,
    project_stop_events: input.project_stop_events || [],
    progress_records: input.progress_records || [],
    notification_failures: input.notification_failures || [],
    retry_needed_items: input.retry_needed_items || [],
    now,
    timezone: input.timezone || DEFAULT_TIMEZONE,
    boundary_time: input.boundary_time || DEFAULT_BOUNDARY_TIME,
  });
  const message = renderDailyProjectSummary(summary, { language: input.language || "zh-CN" });
  const notification = await sendDailyProjectSummary(summary, {
    mode,
    confirmed: input.confirmed,
    message,
    max_chars: input.max_chars || input.maxChars,
    hypo_claw_cli: input.hypo_claw_cli || input.hypoClawCli,
    hypo_claw_args: input.hypo_claw_args || input.hypoClawArgs,
    hypo_claw_private_target: input.hypo_claw_private_target ?? input.hypoClawPrivateTarget ?? true,
    thread_id: input.thread_id || input.threadId,
    server: input.server,
    spawn: input.spawn,
  });
  const homeDir = input.home_dir || process.env.HOME || ".";
  const maintenanceRoot = input.maintenance_root || join(homeDir, ".hypo-workflow", "maintenance");
  const runId = `daily-project-summary-${compactDate(summary.window.end)}`;
  const evidenceRoot = join(maintenanceRoot, "evidence", "daily-project-summary");
  const evidencePaths = {
    summary: join(evidenceRoot, `${runId}.yaml`),
    message: join(evidenceRoot, `${runId}.md`),
    notification: join(evidenceRoot, `${runId}-notification.yaml`),
  };

  await writeYaml(evidencePaths.summary, summary);
  await writeFileEnsured(evidencePaths.message, `${message}\n`);
  await writeYaml(evidencePaths.notification, notification);
  const ledger = await appendDailySummaryLedgerEvent(maintenanceRoot, {
    id: `ml-${compactTimestamp(now)}-${runId}-scheduled`,
    queue_item_id: null,
    object_ref: "global:project-summary",
    event_type: "daily_project_summary_scheduled",
    status: "completed",
    timestamp: normalizeShanghaiDateTime(now),
    actor: "system",
    summary: "Daily 00:30 project summary scheduler created safe-local dry-run evidence.",
    evidence_refs: Object.values(evidencePaths),
    metadata: {
      run_id: runId,
      schedule: "00:30 Asia/Shanghai",
      remote_writes_enabled: false,
      external_contacted: notification.external_contacted === true,
      apply_required: false,
      notification_status: notification.status,
    },
  });

  return {
    ok: true,
    errors: [],
    scheduler: dailySchedulerSummary("completed", now, { external_contacted: notification.external_contacted === true }),
    summary,
    message,
    notification,
    evidence_paths: evidencePaths,
    ledger_path: ledger.path,
    ledger_event: ledger.event,
    cron: {
      install_hint: "30 0 * * * /path/to/Hypo-Workflow/scripts/daily-summary-scheduler.sh /path/to/Hypo-Workflow",
      command: mode === "notify" ? "hypo-workflow daily-summary-scheduler --notify --confirmed" : "hypo-workflow daily-summary-scheduler --dry-run",
    },
  };
}

function filterWindow(items, window, field) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => inWindow(item?.[field], window))
    .map(clone);
}

function inWindow(value, window) {
  const stamp = toComparable(value);
  return stamp >= toComparable(window.start) && stamp < toComparable(window.end);
}

function dedupeById(items) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const id = item.id || JSON.stringify(item);
    if (seen.has(id)) continue;
    seen.add(id);
    output.push(item);
  }
  return output;
}

function displayProject(item) {
  return item.project_display_name || item.project_id || "未知项目";
}

function safeCountKey(value) {
  return String(value || "unknown").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function toComparable(value) {
  return Date.parse(normalizeShanghaiDateTime(value));
}

function parseShanghaiDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(value));
  if (!match) throw new Error(`Invalid date-time: ${value}`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] || 0),
  };
}

function normalizeShanghaiDateTime(value) {
  const text = String(value || "");
  if (/[+-]\d{2}:\d{2}$/.test(text) || text.endsWith("Z")) {
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) throw new Error(`Invalid date-time: ${value}`);
    const shanghai = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return `${shanghai.toISOString().slice(0, 19)}+08:00`;
  }
  return text;
}

function currentShanghaiDateTime() {
  return normalizeShanghaiDateTime(new Date().toISOString());
}

function addShanghaiDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second || 0,
  };
}

function formatShanghaiDateTime(parts) {
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second || 0)}+08:00`;
}

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function dailySchedulerSummary(status, now, options = {}) {
  const externalContacted = options.external_contacted === true || options.externalContacted === true;
  return {
    kind: "maintenance_scheduler",
    status,
    run_type: "daily_project_summary",
    schedule: {
      local_time: "00:30",
      timezone: DEFAULT_TIMEZONE,
      expression: "00:30 Asia/Shanghai",
    },
    timezone: DEFAULT_TIMEZONE,
    triggered_at: normalizeShanghaiDateTime(now),
    safe_local_only: !externalContacted,
    pipeline_runner: false,
    remote_writes_enabled: false,
    external_contacted: externalContacted,
    apply_required: false,
  };
}

async function appendDailySummaryLedgerEvent(root, event) {
  const appended = await appendJsonlLedgerEntry(jsonlLedgerPathFor(join(root, "ledger.jsonl")), event);
  return { path: appended.path, event, ledger: appended.ledger };
}

async function writeYaml(file, value) {
  await writeFileEnsured(file, `${stringifyYaml(value).trimEnd()}\n`);
}

async function writeFileEnsured(file, value) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, value, "utf8");
}

function compactDate(value) {
  return String(value).slice(0, 10).replace(/-/g, "");
}

function compactTimestamp(value) {
  return normalizeShanghaiDateTime(value).replace(/[-:]/g, "").replace(/\+.*$/, "");
}
