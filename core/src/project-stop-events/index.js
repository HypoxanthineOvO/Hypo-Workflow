const PROJECT_STOP_TERMINAL_REASONS = Object.freeze([
  "waiting_acceptance",
  "completed",
  "blocked",
  "failed",
  "cannot_continue",
]);

export function classifyProjectStopEvent(input = {}) {
  if (input.manual_pause || String(input.workflow_state?.current?.phase || "") === "chat") {
    return noProjectStopEvent();
  }

  const state = input.workflow_state || {};
  const statusCandidates = [
    state.pipeline?.status,
    state.current?.phase,
    state.prompt_state?.result,
    input.status,
  ].map((item) => normalizeProjectStopReason(item)).filter(Boolean);
  const stopReason = PROJECT_STOP_TERMINAL_REASONS.find((reason) => statusCandidates.includes(reason)) || null;
  if (!stopReason) return noProjectStopEvent();

  const autoContinueAvailable = Boolean(
    state.continuation?.auto_continue_available ||
      state.auto_continue_available ||
      input.auto_continue_available,
  );
  const milestoneComplete = state.current?.phase === "milestone_complete" ||
    (state.milestones || []).some((milestone) => milestone?.status === "completed");
  if (milestoneComplete && autoContinueAvailable) {
    return noProjectStopEvent();
  }

  return {
    should_emit: true,
    stop_reason: stopReason,
    event: buildProjectStopEvent({
      ...input,
      stop_reason: stopReason,
    }),
  };
}

export function buildProjectStopEvent(input = {}) {
  const project = input.project || {};
  const projectId = String(project.id || input.project_id || "").trim();
  const stopReason = String(input.stop_reason || "").trim();
  const sourcePlatform = String(input.source_platform || input.platform || "unknown").trim();
  const session = input.session || {};
  const sessionHint = String(session.id || input.session_id || "").trim();
  const sessionRef = String(session.ref || input.session_ref || "").trim();
  const terminalAt = String(input.terminal_at || input.occurred_at || "").trim();
  const occurredAt = String(input.occurred_at || terminalAt || new Date(0).toISOString()).trim();
  const id = [
    "project-stop",
    safeEventPart(projectId),
    safeEventPart(stopReason),
    safeEventPart(sourcePlatform),
    safeEventPart(sessionHint || sessionRef || "no-session"),
    safeEventPart(terminalAt || occurredAt),
  ].join(":");

  return {
    id,
    dedupe_key: id,
    project_id: projectId,
    project_display_name: project.display_name || input.project_display_name || projectId,
    project_path: project.path || input.project_path || null,
    stop_reason: stopReason,
    occurred_at: occurredAt,
    terminal_at: terminalAt || occurredAt,
    progress_summary: clone(input.progress_summary || {}),
    source_platform: sourcePlatform,
    session_ref: sessionRef || null,
    session_hint: sessionHint || null,
    notification_state: "pending",
    evidence: {
      mode: "local_append_only",
      path: input.evidence_path || "~/.hypo-workflow/maintenance/project-stop-events/events.yaml",
    },
    planned_actions: [],
    remote_writes_enabled: false,
    external_actions_enabled: false,
  };
}

function noProjectStopEvent() {
  return {
    should_emit: false,
    stop_reason: null,
    event: null,
  };
}

function normalizeProjectStopReason(value) {
  const text = String(value || "").trim();
  if (text === "pending_acceptance") return "waiting_acceptance";
  return text;
}

function safeEventPart(value) {
  const normalized = String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._+-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "unknown";
}

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}
