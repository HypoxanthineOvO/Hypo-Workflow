import { createHash } from "node:crypto";
import { stableStringify } from "../utils/index.js";
import {
  buildProjectLinkageRegistry,
} from "../project-linkage/index.js";
import {
  buildProjectStopEvent,
  classifyProjectStopEvent,
} from "../project-stop-events/index.js";
import {
  captureFinalAssistantOutput,
} from "../codex-capture/index.js";
import {
  sendProjectStopNotification,
} from "../notification-sender/index.js";
import {
  buildDailyProjectSummary,
  renderDailyProjectSummary,
  sendDailyProjectSummary,
} from "./daily-project-summary.js";

export async function buildProjectLinkageE2EDryRunBundle(input = {}, options = {}) {
  const generatedAt = options.now || new Date().toISOString();
  const registry = buildProjectLinkageRegistry();
  const runs = Array.isArray(input.runs) ? input.runs : [];
  const stopEvents = [];
  const captureResults = [];
  const notificationResults = [];
  const notificationFailures = [];
  const progressRecords = [];

  for (const run of runs) {
    const classification = classifyProjectStopEvent(run);
    if (!classification.should_emit) continue;

    const stopEvent = buildProjectStopEvent({
      ...run,
      stop_reason: classification.stop_reason,
    });
    stopEvents.push(stopEvent);
    progressRecords.push({
      id: `progress-${stopEvent.project_id}-${stopEvent.id}`,
      project_id: stopEvent.project_id,
      occurred_at: stopEvent.occurred_at,
      summary: stopEvent.progress_summary?.summary || "",
    });

    const capture = await captureFinalAssistantOutput({
      platform: run.source_platform || "codex",
      session_path: run.session_path,
    });
    captureResults.push({
      project_id: stopEvent.project_id,
      ...capture,
    });

    if (capture.status === "captured") {
      const notificationEvent = {
        ...stopEvent,
        project: run.project,
        final_assistant_output: capture.output,
      };
      const notification = await sendProjectStopNotification(notificationEvent, {
        mode: "dry-run",
        max_chars: options.max_chars || options.maxChars,
        spawn: options.spawn,
        qq_client: options.qq_client,
      });
      notificationResults.push({
        project_id: stopEvent.project_id,
        ...notification,
      });
      stopEvent.notification_state = "dry_run_ready";
    } else {
      const reason = capture.reason || "missing final assistant output";
      notificationResults.push({
        project_id: stopEvent.project_id,
        status: "blocked",
        reason: `capture failed: ${reason}`,
        mode: "dry-run",
        channel: "hypo-claw-qq",
        external_contacted: false,
        qq_contacted: false,
        spawned: false,
        segments: [],
      });
      notificationFailures.push({
        id: `capture-failed-${stopEvent.project_id}`,
        project_id: stopEvent.project_id,
        project_display_name: stopEvent.project_display_name,
        occurred_at: stopEvent.occurred_at,
        status: "failed",
        reason: `assistant output capture failed: ${reason}`,
        retry_needed: true,
      });
      stopEvent.notification_state = "blocked_capture_failed";
    }
  }

  const projects = Array.isArray(input.projects) ? input.projects : registry.projects;
  const dailySummary = buildDailyProjectSummary({
    projects,
    project_stop_events: stopEvents,
    progress_records: progressRecords,
    notification_failures: notificationFailures,
    now: generatedAt,
    timezone: options.timezone || "Asia/Shanghai",
  });
  const dailyMessage = renderDailyProjectSummary(dailySummary, { language: "zh-CN" });
  const dailyNotification = await sendDailyProjectSummary(dailySummary, {
    mode: "dry-run",
    message: dailyMessage,
    max_chars: options.max_chars || options.maxChars,
    spawn: options.spawn,
    notion_client: options.notion_client,
    qq_client: options.qq_client,
  });

  const sections = {
    registry,
    stop_events: { events: stopEvents },
    capture_results: { results: captureResults },
    notification_dry_run: { results: notificationResults },
    daily_summary: {
      summary: dailySummary,
      message: dailyMessage,
      notification: dailyNotification,
    },
    no_external_side_effects: {
      qq_sent: false,
      notion_written: false,
      publish_called: false,
      spawned: false,
      remote_writes_enabled: false,
      external_actions_enabled: false,
    },
  };
  const contentHash = sha256({
    generated_at: generatedAt,
    sections,
    mode: "dry-run",
  });
  return {
    kind: "project_linkage_e2e_dry_run_bundle",
    schema_version: "1",
    mode: "dry-run",
    bundle_id: `project-linkage-e2e-${contentHash.slice(7, 19)}`,
    bundle_hash: contentHash,
    generated_at: generatedAt,
    sections,
    remote_writes_enabled: false,
    external_actions_enabled: false,
    publish_enabled: false,
    planned_actions: [],
  };
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}
