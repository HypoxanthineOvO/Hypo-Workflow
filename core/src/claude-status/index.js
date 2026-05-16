import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildOpenCodeStatusModel } from "../opencode-status/index.js";
import { parseProgressTables, readProgressSnapshot } from "../progress/index.js";
import { DEFAULT_GLOBAL_CONFIG, loadConfig } from "../config/index.js";
import { redactSecrets } from "../evidence/index.js";

const DEFAULT_FALLBACKS = Object.freeze(["monitor", "hw-status", "session-summary", "dashboard"]);

export async function buildClaudeStatusSurface(projectRoot = ".", options = {}) {
  const config = await loadConfig(join(projectRoot, ".pipeline", "config.yaml")).catch(() => DEFAULT_GLOBAL_CONFIG);
  const base = await buildOpenCodeStatusModel(projectRoot, options);
  const progressText = await readProgressSnapshot(projectRoot, options);
  const parsed = parseProgressTables(progressText, { limit: options.recentLimit || 10 });
  const progressTable = parsed.milestones.length ? parsed.milestones : milestonesFromBase(base);
  const recentEvents = parsed.recent_events.length
    ? parsed.recent_events.slice(0, options.recentLimit || 5)
    : base.recent_events.slice(0, options.recentLimit || 5).map((event) => ({
      time: event.timestamp || "",
      type: event.type || "",
      event: event.summary || "",
      result: event.status || "",
    }));
  const fallbacks = config.claude_code?.status?.fallback_order || DEFAULT_FALLBACKS;
  const monitor = resolveClaudeMonitorCapability(config);
  const surface = {
    ok: base.ok,
    sources: base.sources,
    warnings: base.warnings,
    pipeline: base.pipeline,
    cycle: base.cycle,
    progress: base.progress,
    current: base.current,
    analysis: base.analysis,
    lifecycle: base.lifecycle,
    progress_metadata: parsed.metadata,
    current_summary: parsed.current.summary || base.sidebar?.summary || "",
    progress_table: progressTable,
    automation: automationFromConfig(config),
    safety_profile: config.claude_code?.profile || DEFAULT_GLOBAL_CONFIG.claude_code.profile,
    monitor,
    fallbacks,
    recent_events: recentEvents.map(redactStatusEvent),
  };
  return {
    ...surface,
    summary: renderClaudeStatusSummary(surface),
    markdown: renderClaudeStatusMarkdown(surface),
  };
}

export function renderClaudeStatusMarkdown(surface = {}) {
  const lines = [
    `# Hypo-Workflow Status`,
    "",
    `- Progress: ${surface.progress?.completed ?? 0}/${surface.progress?.total ?? 0}`,
    `- Current: ${surface.current?.milestone_id || "M?"} ${surface.current?.step || surface.pipeline?.status || "unknown"}`,
    `- Phase: ${surface.lifecycle?.phase || "unknown"}`,
    `- Next: ${surface.lifecycle?.next_action || "none"}`,
    `- Automation: evaluation.auto_continue=${formatBoolean(surface.automation?.evaluation_auto_continue)}, batch.auto_chain=${formatBoolean(surface.automation?.batch_auto_chain)}`,
    `- Safety: ${surface.safety_profile || "standard"}`,
    `- Monitor: ${surface.monitor?.decision || "unknown"} (${surface.monitor?.reason || "n/a"})`,
    ...(surface.analysis ? [
      `- Analysis: ${surface.analysis.question || "active"} | ${surface.analysis.ledger_path || "ledger:n/a"} | ${surface.analysis.conclusion || "conclusion:n/a"} | confidence:${surface.analysis.confidence || "n/a"}`,
    ] : []),
    "",
    `## Milestones`,
    `| # | Feature | Milestone | Status | Summary |`,
    `|---|---|---|---|---|`,
    ...(surface.progress_table || []).slice(0, 8).map((row) => (
      `| ${cell(row.id)} | ${cell(row.feature)} | ${cell(row.milestone || row.name)} | ${cell(row.status)} | ${cell(row.summary)} |`
    )),
    "",
    `## Recent`,
    ...((surface.recent_events || []).slice(0, 5).map((event) => (
      `- ${[event.time, event.type, event.event, event.result].filter(Boolean).join(" | ")}`
    ))),
  ];
  return `${redactSecrets(lines.join("\n"), { replacement: "[redacted]" })}\n`;
}

export function renderClaudeStatusSummary(surface = {}) {
  return [
    `${surface.current?.milestone_id || "M?"}`,
    surface.current?.step || surface.pipeline?.status || "unknown",
    `${surface.progress?.completed ?? 0}/${surface.progress?.total ?? 0}`,
    `next:${surface.lifecycle?.next_action || "none"}`,
    surface.analysis?.ledger_path ? `analysis:${surface.analysis.milestone_id || "active"}` : null,
  ].filter(Boolean).join(" | ");
}

export function renderClaudeStatusMonitorManifest(options = {}) {
  return [
    {
      name: options.name || "hypo-workflow-progress",
      command: options.command || "node hooks/claude-hook.mjs ProgressMonitor",
      description: options.description || "Hypo-Workflow progress status notifications",
      when: options.when || "on-skill-invoke:hw-status",
    },
  ];
}

export async function readClaudeStatusMarkdown(projectRoot = ".", options = {}) {
  return renderClaudeStatusMarkdown(await buildClaudeStatusSurface(projectRoot, options));
}

function resolveClaudeMonitorCapability(config = {}) {
  const surface = config.claude_code?.status?.surface || DEFAULT_GLOBAL_CONFIG.claude_code.status.surface;
  const requested = surface === "monitor" || surface === "auto";
  return {
    supported: true,
    requested,
    decision: requested ? "fallback-required" : "disabled",
    reason: requested
      ? "Claude Code plugin monitors can emit notifications, but no validated native persistent panel/status slot is available; use /hw:status and hook-injected summaries as the primary surface."
      : "Claude status monitor disabled by configuration.",
    fallback_order: config.claude_code?.status?.fallback_order || DEFAULT_FALLBACKS,
    manifest: renderClaudeStatusMonitorManifest(),
  };
}

function automationFromConfig(config = {}) {
  return {
    evaluation_auto_continue: config.evaluation?.auto_continue ?? true,
    batch_auto_chain: config.batch?.auto_chain ?? DEFAULT_GLOBAL_CONFIG.batch.auto_chain,
    status_surface: config.claude_code?.status?.surface || DEFAULT_GLOBAL_CONFIG.claude_code.status.surface,
  };
}

function milestonesFromBase(base = {}) {
  return (base.feature?.milestones || []).map((row) => ({
    id: row.id || "",
    feature: base.feature?.id || "",
    milestone: row.name || row.prompt_file || "",
    status: row.status || "",
    summary: row.summary || "",
  }));
}

function redactStatusEvent(event = {}) {
  return redactSecrets(event, { replacement: "[redacted]" });
}

function cell(value = "") {
  return String(value || "").replace(/\|/g, "\\|").trim() || "-";
}

function formatBoolean(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  return "n/a";
}
