import { createHash } from "node:crypto";
import { spawn as spawnChildProcess } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { cloneJson, isPlainObject, safeId, stableStringify } from "../utils/index.js";
import { sendProjectStopNotification } from "../notification-sender/index.js";
import {
  appendJsonlLedgerEntry,
  jsonlLedgerPathFor,
  readJsonlLedger,
} from "../ledger/index.js";

const DEFAULT_PROJECT_EVENTS_ROOT = ".hypo-workflow/project-events";
const DEFAULT_TIMEZONE_OFFSET = "+08:00";

export function buildProjectEvent(input = {}, options = {}) {
  const now = normalizeTimestamp(options.now || input.timestamp || new Date().toISOString());
  const eventType = requiredText(input.event_type || input.eventType, "event_type");
  const metadata = isPlainObject(input.metadata) ? cloneJson(input.metadata) : {};
  const event = {
    kind: "project_event",
    schema_version: "1",
    id: input.id || deterministicEventId({
      event_type: eventType,
      timestamp: now,
      source_project: input.source_project || input.sourceProject,
      target_project: input.target_project || input.targetProject,
      object_ref: input.object_ref || input.objectRef,
      metadata,
    }),
    event_type: eventType,
    status: input.status || statusForEventType(eventType),
    timestamp: now,
    actor: input.actor || "system",
    source_project: input.source_project || input.sourceProject || null,
    target_project: input.target_project || input.targetProject || null,
    object_ref: input.object_ref || input.objectRef || null,
    summary: input.summary || defaultEventSummary(eventType, metadata),
    evidence_refs: arrayOfText(input.evidence_refs || input.evidenceRefs || input.evidence),
    metadata,
    parent_event_id: input.parent_event_id || input.parentEventId || null,
    remote_writes_enabled: false,
    external_actions_enabled: false,
  };

  if (input.dedupe_key || input.dedupeKey) event.dedupe_key = input.dedupe_key || input.dedupeKey;
  return event;
}

export async function emitProjectEvent(input = {}, options = {}) {
  const event = buildProjectEvent(input, options);
  const ledger = await appendProjectEvent(options.home_dir || input.home_dir, event, {
    ledger_path: options.ledger_path || input.ledger_path,
  });
  return {
    ok: true,
    errors: [],
    event,
    ledger_path: ledger.path,
    ledger: ledger.ledger,
    remote_writes_enabled: false,
    external_actions_enabled: false,
  };
}

export async function loadProjectEventLedger(homeDir, options = {}) {
  const legacyPath = options.ledger_path || projectEventLedgerPath(homeDir);
  const path = jsonlLedgerPathFor(legacyPath);
  const ledger = await readJsonlLedger(path, { legacy_path: legacyPath });
  return {
    path,
    ledger: normalizeLedger(ledger),
  };
}

export async function routeProjectEvent(input = {}, options = {}) {
  const homeDir = options.home_dir || input.home_dir;
  const ledgerState = await loadProjectEventLedger(homeDir, {
    ledger_path: options.ledger_path || input.ledger_path,
  });
  const events = ledgerState.ledger.events;
  const sourceEvent = selectRouteSourceEvent(events, input);
  if (!sourceEvent) {
    return {
      ok: false,
      errors: ["No artifact.ready project event found to route."],
      ledger_path: ledgerState.path,
      remote_writes_enabled: false,
      external_actions_enabled: false,
    };
  }
  if (sourceEvent.event_type !== "artifact.ready") {
    return {
      ok: false,
      errors: [`Project event ${sourceEvent.id} is ${sourceEvent.event_type}, expected artifact.ready.`],
      source_event: sourceEvent,
      ledger_path: ledgerState.path,
      remote_writes_enabled: false,
      external_actions_enabled: false,
    };
  }

  const routeKind = input.route || input.route_kind || input.routeKind || "writer.news.issue";
  if (routeKind !== "writer.news.issue") {
    return {
      ok: false,
      errors: [`Unsupported project event route: ${routeKind}`],
      source_event: sourceEvent,
      ledger_path: ledgerState.path,
      remote_writes_enabled: false,
      external_actions_enabled: false,
    };
  }

  return routeWriterNewsIssue(sourceEvent, input, {
    ...options,
    ledger_path: ledgerState.path,
  });
}

export async function routeWriterNewsIssue(sourceEvent = {}, input = {}, options = {}) {
  const metadata = isPlainObject(sourceEvent.metadata) ? sourceEvent.metadata : {};
  const topic = input.topic || metadata.topic || "ai-news";
  const reportDate = input.report_date || input.reportDate || metadata.report_date || metadata.date;
  if (!reportDate) {
    return routeFailure(sourceEvent, options, "writer.news.issue route requires report_date.");
  }
  const writerRoot = resolveWriterRoot(input.writer_root || input.writerRoot || metadata.writer_root || input.config?.integrations?.hypo_writer?.root);
  const inputUrl = input.input_url || input.inputUrl || metadata.input_url || metadata.artifact_url || sourceEvent.object_ref;
  if (!inputUrl) {
    return routeFailure(sourceEvent, options, "writer.news.issue route requires input_url or artifact_url.");
  }
  const issueOut = input.issue_out || input.issueOut || join(writerRoot, "workspace", "series", "news-pipeline", "issues", topic, reportDate);
  const writerCommand = buildWriterNewsCommand({
    writer_root: writerRoot,
    topic,
    input_url: inputUrl,
    overwrite: input.overwrite !== false,
    mock: input.mock !== false,
  });

  let commandResult = {
    status: 0,
    stdout: "",
    stderr: "",
    skipped: true,
    reason: "dry-run",
  };
  if (input.dry_run !== true && input.dryRun !== true && options.dry_run !== true && options.dryRun !== true) {
    commandResult = await runProjectEventCommand(writerCommand, options.runner || input.runner);
  }
  const commandOk = commandResult.status === 0 || commandResult.code === 0 || commandResult.ok === true;
  if (!commandOk) {
    const failureEvent = buildProjectEvent({
      event_type: "writer.issue.failed",
      status: "failed",
      source_project: "hypo-writer",
      target_project: sourceEvent.source_project || null,
      object_ref: issueOut,
      parent_event_id: sourceEvent.id,
      summary: `Hypo-Writer issue generation failed for ${topic} ${reportDate}.`,
      evidence_refs: sourceEvent.evidence_refs || [],
      metadata: {
        topic,
        report_date: reportDate,
        input_url: inputUrl,
        writer_issue: issueOut,
        command_status: commandResult.status ?? commandResult.code ?? null,
        stderr: String(commandResult.stderr || "").slice(0, 2000),
        remote_publish: false,
        wechat_draft_created: false,
      },
    }, options);
    const ledger = await appendProjectEvent(options.home_dir || input.home_dir, failureEvent, {
      ledger_path: options.ledger_path || input.ledger_path,
    });
    return {
      ok: false,
      errors: [`Hypo-Writer issue generation failed: ${commandResult.stderr || commandResult.error || commandResult.status}`],
      source_event: sourceEvent,
      writer_issue_event: failureEvent,
      writer_command: writerCommand,
      writer_result: commandResult,
      ledger_path: ledger.path,
      remote_writes_enabled: false,
      external_actions_enabled: false,
    };
  }

  const writerIssueEvent = buildProjectEvent({
    event_type: "writer.issue.ready",
    status: "ready",
    source_project: "hypo-writer",
    target_project: "hypo-workflow",
    object_ref: issueOut,
    parent_event_id: sourceEvent.id,
    summary: `Hypo-Writer issue package is ready for ${topic} ${reportDate}.`,
    evidence_refs: [...arrayOfText(sourceEvent.evidence_refs), issueOut],
    metadata: {
      topic,
      report_date: reportDate,
      input_url: inputUrl,
      source_artifact_event_id: sourceEvent.id,
      writer_issue: issueOut,
      remote_publish: false,
      wechat_draft_created: false,
      command_skipped: commandResult.skipped === true,
    },
  }, options);
  const ledger = await appendProjectEvent(options.home_dir || input.home_dir, writerIssueEvent, {
    ledger_path: options.ledger_path || input.ledger_path,
  });

  const notifyMode = input.notify === true || input.mode === "notify" || options.notify === true ? "notify" : "dry-run";
  const message = renderWriterIssueReadyMessage(writerIssueEvent, sourceEvent);
  const notification = await sendProjectStopNotification({
    id: writerIssueEvent.id,
    project_id: "hypo-writer",
    project_display_name: "Hypo-Writer",
    stop_reason: "writer_issue_ready",
    occurred_at: writerIssueEvent.timestamp,
    progress_summary: { summary: writerIssueEvent.summary },
    final_assistant_output: message,
  }, {
    mode: notifyMode,
    confirmed: input.confirmed === true || options.confirmed === true,
    message,
    max_chars: input.max_chars || input.maxChars || options.max_chars || options.maxChars,
    hypo_claw_cli: input.hypo_claw_cli || input.hypoClawCli || options.hypo_claw_cli || options.hypoClawCli,
    hypo_claw_args: input.hypo_claw_args || input.hypoClawArgs || options.hypo_claw_args || options.hypoClawArgs,
    hypo_claw_private_target: input.hypo_claw_private_target ?? input.hypoClawPrivateTarget ?? options.hypo_claw_private_target ?? options.hypoClawPrivateTarget,
    thread_id: input.thread_id || input.threadId || options.thread_id || options.threadId,
    server: input.server || options.server,
    spawn: options.spawn || input.spawn,
  });

  return {
    ok: true,
    errors: [],
    source_event: sourceEvent,
    writer_issue_event: writerIssueEvent,
    writer_command: writerCommand,
    writer_result: commandResult,
    notification,
    ledger_path: ledger.path,
    remote_writes_enabled: false,
    external_actions_enabled: notification.external_contacted === true,
    remote_publish: false,
    wechat_draft_created: false,
  };
}

export function buildWriterNewsCommand(input = {}) {
  const writerRoot = resolveWriterRoot(input.writer_root || input.writerRoot || input.config?.integrations?.hypo_writer?.root);
  const args = [
    "--import",
    "tsx",
    "manager/src/cli/index.ts",
    "news",
    "generate",
    "--topic",
    input.topic || "ai-news",
    "--input-url",
    requiredText(input.input_url || input.inputUrl, "input_url"),
    "--channel",
    "wechat",
    "--workspace",
    "workspace",
  ];
  if (input.mock !== false) args.push("--mock");
  if (input.overwrite !== false) args.push("--overwrite");
  return {
    command: input.node || process.execPath,
    args,
    cwd: writerRoot,
    remote_publish: false,
    wechat_draft_created: false,
  };
}

function resolveWriterRoot(value) {
  return expandHomePath(value || "~/Hypo-Writer");
}

function expandHomePath(value, home = homedir()) {
  const text = String(value || "");
  if (text === "~") return home;
  if (text.startsWith("~/")) return join(home, text.slice(2));
  return text;
}

export function renderWriterIssueReadyMessage(writerIssueEvent = {}, sourceEvent = {}) {
  const metadata = writerIssueEvent.metadata || {};
  const lines = [
    "[Writer Issue Ready]",
    `Topic: ${metadata.topic || "unknown"}`,
    `Report date: ${metadata.report_date || "unknown"}`,
    `Writer issue: ${metadata.writer_issue || writerIssueEvent.object_ref || "unknown"}`,
    `Source event: ${sourceEvent.id || metadata.source_artifact_event_id || "unknown"}`,
    `Source artifact: ${metadata.input_url || sourceEvent.object_ref || "unknown"}`,
    "Remote publish: false",
    "WeChat draft created: false",
  ];
  return lines.join("\n");
}

function selectRouteSourceEvent(events, input = {}) {
  const eventId = input.event_id || input.eventId || input.id;
  if (eventId) return [...events].reverse().find((event) => event.id === eventId) || null;
  return [...events].reverse().find((event) => event.event_type === "artifact.ready") || null;
}

async function appendProjectEvent(homeDir, event, options = {}) {
  const legacyPath = options.ledger_path || projectEventLedgerPath(homeDir);
  const appended = await appendJsonlLedgerEntry(jsonlLedgerPathFor(legacyPath), event, {
    legacy_path: legacyPath,
  });
  return {
    path: appended.path,
    event,
    ledger: normalizeLedger(appended.ledger),
  };
}

function normalizeLedger(value) {
  return {
    schema_version: "1",
    ...(isPlainObject(value) ? value : {}),
    events: Array.isArray(value?.events) ? value.events : [],
  };
}

function projectEventLedgerPath(homeDir) {
  const home = homeDir || process.env.HOME || ".";
  return join(home, DEFAULT_PROJECT_EVENTS_ROOT, "ledger.jsonl");
}

async function runProjectEventCommand(commandSpec, runner) {
  if (runner) return runner(commandSpec.command, commandSpec.args, { cwd: commandSpec.cwd });
  return new Promise((resolve) => {
    const child = spawnChildProcess(commandSpec.command, commandSpec.args, {
      cwd: commandSpec.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ status: 1, stdout, stderr, error: error.message });
    });
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function routeFailure(sourceEvent, options, message) {
  return {
    ok: false,
    errors: [message],
    source_event: sourceEvent,
    ledger_path: options.ledger_path || projectEventLedgerPath(options.home_dir),
    remote_writes_enabled: false,
    external_actions_enabled: false,
  };
}

function statusForEventType(eventType) {
  if (eventType.endsWith(".failed")) return "failed";
  if (eventType.endsWith(".ready")) return "ready";
  return "recorded";
}

function defaultEventSummary(eventType, metadata = {}) {
  if (eventType === "artifact.ready") {
    return `Artifact ready${metadata.topic ? ` for ${metadata.topic}` : ""}${metadata.report_date ? ` ${metadata.report_date}` : ""}.`;
  }
  if (eventType === "writer.issue.ready") {
    return `Writer issue ready${metadata.topic ? ` for ${metadata.topic}` : ""}${metadata.report_date ? ` ${metadata.report_date}` : ""}.`;
  }
  return `${eventType} project event.`;
}

function deterministicEventId(value) {
  const hash = createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
  return `pe-${safeEventPart(value.event_type)}-${hash}`;
}

function normalizeTimestamp(value) {
  const text = String(value || "");
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    if (/[+-]\d{2}:\d{2}$/.test(text) && text.endsWith(DEFAULT_TIMEZONE_OFFSET)) return text;
    const shanghai = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return `${shanghai.toISOString().slice(0, 19)}+08:00`;
  }
  return text;
}

function requiredText(value, name) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function arrayOfText(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return [String(value)];
}

function safeEventPart(value) {
  return safeId(value).replace(/[._]+/g, "-") || "event";
}
