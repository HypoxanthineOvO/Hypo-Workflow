import { homedir } from "node:os";
import { join } from "node:path";
import {
  appendJsonlLedgerEntry,
  jsonlLedgerPathFor,
  readJsonlLedger,
} from "../ledger/index.js";
import {
  buildProjectStopEvent,
  classifyProjectStopEvent,
} from "../project-stop-events/index.js";
import { captureFinalAssistantOutput } from "../codex-capture/index.js";
import {
  formatProjectStopNotification,
  sendProjectStopNotification,
} from "../notification-sender/index.js";

const DEFAULT_QUEUE_RELATIVE = ".hypo-workflow/notifications/project-stop-pending.jsonl";

export async function enqueueProjectStopNotification(input = {}, options = {}) {
  const now = options.now || input.now || new Date().toISOString();
  const classification = classifyProjectStopEvent(input);
  if (!classification.should_emit) {
    return {
      ok: true,
      status: "skipped",
      reason: "not a terminal project stop event",
      enqueued: false,
      external_contacted: false,
      qq_contacted: false,
    };
  }

  const stopEvent = classification.event || buildProjectStopEvent({
    ...input,
    stop_reason: classification.stop_reason,
  });
  const capture = await resolveFinalAssistantOutput(input, options);
  if (capture.status !== "captured") {
    const blocked = pendingEntry({
      stopEvent,
      status: "blocked_capture_failed",
      now,
      capture,
      message: null,
    });
    const write = await appendPendingNotification(blocked, input, options);
    return {
      ok: false,
      status: "blocked_capture_failed",
      errors: [`final assistant output capture failed: ${capture.reason || capture.status}`],
      enqueued: true,
      entry: blocked,
      queue_path: write.path,
      external_contacted: false,
      qq_contacted: false,
    };
  }

  const notificationEvent = {
    ...stopEvent,
    final_assistant_output: capture.output,
  };
  const message = formatProjectStopNotification(notificationEvent);
  const entry = pendingEntry({
    stopEvent: notificationEvent,
    status: "pending",
    now,
    capture,
    message,
  });
  const write = await appendPendingNotification(entry, input, options);
  return {
    ok: true,
    status: "queued",
    enqueued: true,
    entry,
    queue_path: write.path,
    external_contacted: false,
    qq_contacted: false,
  };
}

export async function dispatchProjectStopNotifications(input = {}, options = {}) {
  const state = await loadPendingNotifications(input, options);
  const entries = state.queue.entries || [];
  const pending = entries.filter((entry) => entry.status === "pending");
  const results = [];
  const updated = entries.map((entry) => ({ ...entry }));

  for (const entry of pending) {
    const index = updated.findIndex((item) => item.id === entry.id);
    const message = formatProjectStopNotification(entry.event);
    const result = await sendProjectStopNotification(entry.event, {
      mode: "notify",
      confirmed: input.confirmed === true || options.confirmed === true,
      message,
      max_chars: input.max_chars || input.maxChars || options.max_chars || options.maxChars,
      hypo_claw_private_target: input.hypo_claw_private_target ?? input.hypoClawPrivateTarget ?? options.hypo_claw_private_target ?? options.hypoClawPrivateTarget ?? true,
      hypo_claw_cli: input.hypo_claw_cli || input.hypoClawCli || options.hypo_claw_cli || options.hypoClawCli,
      hypo_claw_args: input.hypo_claw_args || input.hypoClawArgs || options.hypo_claw_args || options.hypoClawArgs,
      thread_id: input.thread_id || input.threadId || options.thread_id || options.threadId,
      server: input.server || options.server,
      spawn: options.spawn || input.spawn,
      retry_root: input.retry_root || input.retryRoot || options.retry_root || options.retryRoot,
      retry_queue_file: input.retry_queue_file || input.retryQueueFile || options.retry_queue_file || options.retryQueueFile,
      append_retry_queue: input.append_retry_queue || input.appendRetryQueue || options.append_retry_queue || options.appendRetryQueue,
      now: input.now || options.now,
    });
    const nextStatus = result.status === "sent"
      ? "sent"
      : result.status === "blocked"
        ? "blocked_confirmation_required"
        : "queued_for_retry";
    if (index >= 0) {
      updated[index] = {
        ...updated[index],
        status: nextStatus,
        dispatched_at: options.now || input.now || new Date().toISOString(),
        message,
        notification_result: summarizeNotificationResult(result),
      };
    }
    results.push({
      entry_id: entry.id,
      status: nextStatus,
      notification: result,
    });
  }

  for (const result of results) {
    const entry = updated.find((item) => item.id === result.entry_id);
    if (entry) {
      await appendJsonlLedgerEntry(state.path, entry, {
        legacy_path: pendingNotificationsPath(input, options),
      });
    }
  }
  return {
    ok: results.every((result) => result.status === "sent"),
    status: results.length === 0 ? "empty" : results.every((result) => result.status === "sent") ? "sent" : "partial",
    queue_path: state.path,
    attempted: results.length,
    sent: results.filter((result) => result.status === "sent").length,
    results,
    external_contacted: results.some((result) => result.notification.external_contacted === true),
    qq_contacted: results.some((result) => result.notification.qq_contacted === true),
  };
}

export async function loadPendingNotifications(input = {}, options = {}) {
  const legacyPath = pendingNotificationsPath(input, options);
  const path = jsonlLedgerPathFor(legacyPath);
  const ledger = await readJsonlLedger(path, { legacy_path: legacyPath });
  return {
    path,
    queue: normalizeQueue({ entries: ledger.events }),
  };
}

async function resolveFinalAssistantOutput(input, options) {
  if (typeof input.final_assistant_output === "string") {
    return {
      status: "captured",
      platform: input.source_platform || input.platform || "manual",
      output: input.final_assistant_output,
      captured_at: options.now || input.now || new Date().toISOString(),
      source: { kind: "provided" },
      side_effect: "local_read",
      planned_external_actions: [],
    };
  }
  return captureFinalAssistantOutput({
    platform: input.source_platform || input.platform || "codex",
    session_path: input.session_path || input.sessionPath,
    session_id: input.session_id || input.sessionId || input.session?.id,
    sessions_root: input.sessions_root || input.sessionsRoot,
  });
}

function pendingEntry({ stopEvent, status, now, capture, message }) {
  return {
    id: `pending-${stopEvent.dedupe_key || stopEvent.id}`,
    status,
    channel: "hypo-claw-qq",
    created_at: now,
    dedupe_key: stopEvent.dedupe_key || stopEvent.id,
    event: stopEvent,
    message,
    capture: sanitizeCapture(capture),
    dispatch: {
      mode: "confirmed_dispatcher_required",
      hook_safe: true,
      external_contacted: false,
      qq_contacted: false,
    },
  };
}

async function appendPendingNotification(entry, input = {}, options = {}) {
  const state = await loadPendingNotifications(input, options);
  const entries = state.queue.entries || [];
  const existing = entries.find((item) => item.dedupe_key === entry.dedupe_key);
  const nextEntry = existing
    ? { ...existing, ...entry, id: existing.id, created_at: existing.created_at }
    : entry;
  const legacyPath = pendingNotificationsPath(input, options);
  const appended = await appendJsonlLedgerEntry(state.path, nextEntry, {
    legacy_path: legacyPath,
  });
  const queue = normalizeQueue({ entries: appended.ledger.events });
  return { path: appended.path, queue };
}

function pendingNotificationsPath(input = {}, options = {}) {
  if (options.queue_path || options.queuePath || input.queue_path || input.queuePath) {
    return options.queue_path || options.queuePath || input.queue_path || input.queuePath;
  }
  const home = options.home_dir || options.homeDir || input.home_dir || input.homeDir || homedir();
  return join(home, DEFAULT_QUEUE_RELATIVE);
}

function normalizeQueue(value) {
  const entries = [];
  const indexByKey = new Map();
  for (const entry of Array.isArray(value?.entries) ? value.entries : []) {
    const key = entry?.dedupe_key || entry?.id;
    if (!key) {
      entries.push(entry);
      continue;
    }
    if (indexByKey.has(key)) {
      const index = indexByKey.get(key);
      entries[index] = {
        ...entries[index],
        ...entry,
        id: entries[index].id || entry.id,
        created_at: entries[index].created_at || entry.created_at,
      };
    } else {
      indexByKey.set(key, entries.length);
      entries.push(entry);
    }
  }
  return {
    schema_version: "1",
    ...(value && typeof value === "object" ? value : {}),
    entries,
  };
}

function summarizeNotificationResult(result = {}) {
  return {
    status: result.status,
    channel: result.channel,
    external_contacted: result.external_contacted === true,
    qq_contacted: result.qq_contacted === true,
    qq_delivery: extractQqDeliveryEvidence(result),
    retry_queue_path: result.retry_queue_path || null,
    failure: result.failure || null,
    cli: result.cli || null,
  };
}

function extractQqDeliveryEvidence(result = {}) {
  const outputs = [];
  if (typeof result.stdout === "string") outputs.push(result.stdout);
  for (const item of Array.isArray(result.send_results) ? result.send_results : []) {
    if (typeof item?.stdout === "string") outputs.push(item.stdout);
  }
  for (const output of outputs) {
    const parsed = parseFinalJsonLine(output);
    const evidence = findQqDeliveryEvidence(parsed);
    if (evidence) return evidence;
  }
  return null;
}

function parseFinalJsonLine(value) {
  const lines = String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // Continue looking for a JSON object in mixed CLI output.
    }
  }
  return null;
}

function findQqDeliveryEvidence(value) {
  if (!value || typeof value !== "object") return null;
  const messageId = value.external_message_id || value.externalMessageId;
  if (value.externalContacted === true && typeof messageId === "string" && messageId.trim()) {
    return {
      external_contacted: true,
      external_message_id: messageId,
      status: value.status || null,
      provider: value.provider || null,
    };
  }
  for (const key of ["outbound", "delivery", "result", "data"]) {
    const nested = findQqDeliveryEvidence(value[key]);
    if (nested) return nested;
  }
  return null;
}

function sanitizeCapture(capture = {}) {
  return {
    status: capture.status,
    platform: capture.platform,
    captured_at: capture.captured_at || null,
    source: capture.source || null,
    reason: capture.reason || null,
    side_effect: capture.side_effect || "local_read",
    planned_external_actions: [],
  };
}
