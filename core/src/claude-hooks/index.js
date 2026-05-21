import { access, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { DEFAULT_GLOBAL_CONFIG, loadConfig, parseYaml } from "../config/index.js";
import { buildClaudeStatusSurface } from "../claude-status/index.js";
import { enqueueProjectStopNotification } from "../project-notifications/index.js";

const PROTECTED_PIPELINE_FILES = Object.freeze([
  ".pipeline/state.yaml",
  ".pipeline/cycle.yaml",
  ".pipeline/rules.yaml",
]);

export function renderClaudeCodeSettingsHooks(config = DEFAULT_GLOBAL_CONFIG) {
  const stopTimeout = config.claude_code?.hooks?.stop?.timeout || 5000;
  const sessionTimeout = config.claude_code?.hooks?.session_start?.timeout || 3000;
  const compactTimeout = config.claude_code?.hooks?.compact?.timeout || 3000;
  const permissionTimeout = config.claude_code?.hooks?.permission?.timeout || 3000;
  const toolTimeout = config.claude_code?.hooks?.tool?.timeout || 3000;

  return {
    Stop: [managedHookGroup("", "Stop", stopTimeout)],
    SessionStart: [
      managedHookGroup("startup|clear", "SessionStart startup", sessionTimeout),
      managedHookGroup("resume", "SessionStart resume", sessionTimeout),
      managedHookGroup("compact", "SessionStart compact", sessionTimeout),
    ],
    PreCompact: [managedHookGroup("", "PreCompact", compactTimeout)],
    PostCompact: [managedHookGroup("", "PostCompact", compactTimeout)],
    PostToolUse: [managedHookGroup("", "PostToolUse", toolTimeout)],
    PostToolBatch: [managedHookGroup("", "PostToolBatch", toolTimeout)],
    UserPromptSubmit: [managedHookGroup("", "UserPromptSubmit", sessionTimeout)],
    PermissionRequest: [managedHookGroup("", "PermissionRequest", permissionTimeout)],
    FileChanged: [managedHookGroup(".pipeline/PROGRESS.md", "FileChanged", toolTimeout)],
  };
}

export function renderClaudeHookWrapper(options = {}) {
  const coreImport = options.coreImport || "../core/src/index.js";
  return `#!/usr/bin/env node
// hypo_workflow_managed_hook: true
import { evaluateClaudeHookEvent } from ${JSON.stringify(coreImport)};

const event = process.argv[2] || "";
const matcher = process.argv[3];
const input = await readStdin();
let payload = {};
try {
  payload = input.trim() ? JSON.parse(input) : {};
} catch (error) {
  payload = { parse_error: error.message };
}
if (matcher && !payload.matcher) payload.matcher = matcher;

const output = await evaluateClaudeHookEvent(event, payload);
process.stdout.write(\`\${JSON.stringify(output)}\\n\`);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data;
}
`;
}

export async function evaluateClaudeHookEvent(event, payload = {}, options = {}) {
  const root = resolve(payload.cwd || options.projectRoot || ".");
  const eventName = normalizeEventName(event);
  if (eventName === "ProgressMonitor") return renderProgressMonitor(root);
  if (eventName === "Stop") return evaluateStop(root, payload);
  if (eventName === "PermissionRequest") return evaluatePermission(root, payload);
  if (["SessionStart", "UserPromptSubmit"].includes(eventName)) return renderResumeOutput(root, payload, "Hypo-Workflow Resume");
  if (["PreCompact", "PostCompact"].includes(eventName)) return renderResumeOutput(root, payload, "Compact Resume Packet");
  if (["PostToolUse", "PostToolBatch", "FileChanged"].includes(eventName)) return renderProgressRefresh(root, payload);
  return {};
}

function managedHookGroup(matcher, event, timeout) {
  return {
    hypo_workflow_managed: true,
    matcher,
    hooks: [
      {
        type: "command",
        command: `node hooks/claude-hook.mjs ${event}`,
        timeout,
      },
    ],
  };
}

async function renderResumeOutput(root, payload, title) {
  const context = await loadHookContext(root);
  if (!context.state.pipeline) return {};
  const current = context.state.current || {};
  const cycle = context.cycle.cycle || {};
  const compact = title.includes("Compact");
  const lines = [
    `[${title}]`,
    `cycle: C${cycle.number || cycle.id || "?"}`,
    `pipeline: ${context.state.pipeline?.name || "unknown"}`,
    `status: ${context.state.pipeline?.status || "unknown"}`,
    `current: ${current.prompt_name || current.prompt_file || "unknown"}`,
    `step: ${current.step || "unknown"} (step_index: ${current.step_index ?? "n/a"})`,
    `next action: continue ${current.step || "current step"} from .pipeline/state.yaml`,
    `automation: auto_continue=${Boolean(context.config.evaluation?.auto_continue ?? context.config.batch?.auto_chain)}`,
    "required files: .pipeline/state.yaml, .pipeline/log.yaml, .pipeline/PROGRESS.md, current report at milestone end",
    "Do not replay completed steps; trust state.yaml/history and continue from the saved pointer.",
  ];
  if (payload.matcher) lines.push(`matcher: ${payload.matcher}`);
  const recent = recentLogLines(context.logText);
  if (recent) lines.push("", "Recent events:", recent);
  if (compact) lines.push("", "Compact note: this packet is intentionally short and resume-oriented.");
  return {
    systemMessage: `Hypo-Workflow: ${current.step || "resume"}`,
    additionalContext: `${lines.join("\n")}\n`,
  };
}

async function evaluateStop(root, payload = {}) {
  const context = await loadHookContext(root);
  if (!context.state.pipeline) return {};
  if (context.state.pipeline.status && context.state.pipeline.status !== "running") {
    const pending = await enqueueStopNotificationFromHook(root, context, payload).catch((error) => ({
      ok: false,
      status: "hook_enqueue_failed",
      errors: [error.message],
    }));
    if (pending.enqueued) {
      return {
        systemMessage: `Hypo-Workflow project stop notification queued: ${pending.queue_path}. Run: hypo-workflow project-notifications dispatch --confirmed`,
        project_stop_notification: {
          status: pending.status,
          queue_path: pending.queue_path,
          entry_id: pending.entry?.id || null,
          external_contacted: false,
          qq_contacted: false,
        },
      };
    }
    if (pending.status === "skipped") return {};
    return {
      systemMessage: `Hypo-Workflow project stop notification enqueue failed: ${(pending.errors || []).join("; ")}`,
      project_stop_notification: {
        status: pending.status,
        errors: pending.errors || [],
        external_contacted: false,
        qq_contacted: false,
      },
    };
  }

  const missing = [];
  if (!await exists(join(root, ".pipeline", "state.yaml"))) missing.push(".pipeline/state.yaml");
  if (!await exists(join(root, ".pipeline", "log.yaml"))) missing.push(".pipeline/log.yaml");
  if (!await exists(join(root, ".pipeline", "PROGRESS.md"))) missing.push(".pipeline/PROGRESS.md");

  if (isFinalStep(context.state)) {
    const report = currentReportPath(context.state);
    if (report && !await exists(join(root, report))) missing.push(report);
  }

  if (missing.length) {
    return {
      decision: "block",
      reason: `Workflow-critical evidence is missing: ${missing.join(", ")}. Update the files before stopping.`,
    };
  }

  const warnings = [];
  if (!await exists(join(root, ".pipeline", "metrics.yaml"))) warnings.push("metrics gap: .pipeline/metrics.yaml is missing");
  if (await exists(join(root, ".pipeline", "derived-refresh.yaml"))) warnings.push("derived refresh gap: .pipeline/derived-refresh.yaml exists");
  if (!warnings.length) return {};
  return {
    systemMessage: `Hypo-Workflow warnings: ${warnings.join("; ")}`,
  };
}

async function enqueueStopNotificationFromHook(root, context, payload = {}) {
  const projectId = projectIdFromContext(root, context);
  const current = context.state.current || {};
  const cycle = context.cycle.cycle || {};
  const progressSummary = {
    cycle_id: cycle.number ? `C${cycle.number}` : context.acceptance?.cycle_id || null,
    milestone_id: current.milestone_id || current.prompt_name || null,
    prompt_name: current.prompt_name || current.prompt_file || null,
    current_step: current.step || null,
    summary: `${context.state.pipeline?.name || projectId} stopped with status ${context.state.pipeline?.status || "unknown"}.`,
  };
  return enqueueProjectStopNotification({
    home_dir: payload.notification_home_dir || payload.notificationHomeDir || process.env.HOME,
    project: {
      id: projectId,
      display_name: displayName(projectId, context.state.pipeline?.name),
      path: root,
    },
    source_platform: "claude-code",
    workflow_state: context.state,
    status: context.state.pipeline?.status,
    final_assistant_output: payload.final_assistant_output || payload.finalAssistantOutput || payload.transcript_tail || payload.message,
    session_path: payload.session_path || payload.sessionPath,
    session_id: payload.session_id || payload.sessionId,
    occurred_at: new Date().toISOString(),
    terminal_at: context.state.pipeline?.finished || new Date().toISOString(),
    progress_summary: progressSummary,
  });
}

async function evaluatePermission(root, payload) {
  const context = await loadHookContext(root);
  const profile = payload.profile || context.config.claude_code?.profile || "standard";
  const risks = classifyPermissionRisk(payload);

  if (profile === "developer") {
    return { permissionDecision: "allow", reason: "developer profile allows local automation." };
  }
  if (profile === "strict" && risks.length) {
    return { permissionDecision: "deny", reason: `strict profile denies ${risks.join(", ")} automation.` };
  }
  if (profile === "strict") {
    return { permissionDecision: "allow", reason: "strict profile allows this low-risk action." };
  }
  if (risks.length) {
    return { permissionDecision: "ask", reason: `standard profile requires confirmation for ${risks.join(", ")} automation.` };
  }
  return { permissionDecision: "allow", reason: "standard profile allows this action." };
}

async function renderProgressRefresh(root, payload) {
  const paths = collectPayloadPaths(payload);
  const progressTouched = payload.file_path === ".pipeline/PROGRESS.md"
    || paths.some((path) => normalizePath(path).endsWith(".pipeline/PROGRESS.md"));
  const progressFile = join(root, ".pipeline", "PROGRESS.md");
  const progressText = await readOptionalText(progressFile);
  const statusSurface = await buildClaudeStatusSurface(root).catch(() => null);
  return {
    progress_refresh: {
      path: ".pipeline/PROGRESS.md",
      touched: progressTouched,
      exists: Boolean(progressText),
      summary: firstMeaningfulLine(progressText) || "Progress unavailable",
    },
    ...(statusSurface ? {
      claude_status: {
        summary: statusSurface.summary,
        current: statusSurface.current,
        progress: statusSurface.progress,
        progress_table: statusSurface.progress_table,
        automation: statusSurface.automation,
        safety_profile: statusSurface.safety_profile,
        recent_events: statusSurface.recent_events,
      },
    } : {}),
  };
}

async function renderProgressMonitor(root) {
  const status = await buildClaudeStatusSurface(root);
  return {
    notification: status.summary,
    additionalContext: status.markdown,
  };
}

async function loadHookContext(root) {
  const config = await loadConfig(join(root, ".pipeline", "config.yaml")).catch(() => DEFAULT_GLOBAL_CONFIG);
  const state = await readYaml(join(root, ".pipeline", "state.yaml"));
  const cycle = await readYaml(join(root, ".pipeline", "cycle.yaml"));
  const logText = await readOptionalText(join(root, ".pipeline", "log.yaml"));
  return { config, state, cycle, logText };
}

function isFinalStep(state) {
  const currentIndex = Number(state.current?.step_index ?? 0);
  const steps = state.prompt_state?.steps || [];
  return steps.length > 0 && currentIndex >= steps.length - 1;
}

function currentReportPath(state) {
  const promptFile = state.current?.prompt_file;
  if (!promptFile) return null;
  return `.pipeline/reports/${basename(promptFile).replace(/\.md$/, ".report.md")}`;
}

function classifyPermissionRisk(payload) {
  const risks = new Set();
  for (const path of collectPayloadPaths(payload)) {
    const normalized = normalizePath(path);
    if (PROTECTED_PIPELINE_FILES.includes(normalized)) risks.add("protected workflow file");
    if (normalized.includes(".pipeline/") && !PROTECTED_PIPELINE_FILES.includes(normalized)) risks.add("pipeline write");
  }
  const command = String(payload.args?.command || payload.command || "");
  if (/\brm\s+-rf\b|\bsudo\b|\bchmod\s+-R\b/.test(command)) risks.add("destructive command");
  if (/\bcurl\b|\bwget\b|\bgit\s+push\b|\bnpm\s+publish\b|\bssh\b|\bscp\b|\brsync\b/.test(command)) risks.add("external side effect");
  return [...risks];
}

function collectPayloadPaths(payload) {
  const paths = [];
  collectPaths(payload.args || payload.tool?.args || payload, paths);
  return [...new Set(paths)];
}

function collectPaths(value, paths) {
  if (Array.isArray(value)) {
    for (const item of value) collectPaths(item, paths);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (["path", "file", "filePath", "file_path"].includes(key) && typeof child === "string") paths.push(child);
    collectPaths(child, paths);
  }
}

function recentLogLines(logText) {
  return logText
    .split(/\r?\n/)
    .filter((line) => /summary:|event|Step|Milestone/i.test(line))
    .slice(-6)
    .join("\n");
}

function firstMeaningfulLine(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
}

function projectIdFromContext(root, context = {}) {
  const configured = context.config.project?.id || context.config.pipeline?.project_id;
  if (configured) return slugify(configured);
  return slugify(basename(root));
}

function displayName(projectId, pipelineName) {
  if (pipelineName && pipelineName !== "unknown") return pipelineName;
  return projectId.split("-").map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part).join("-");
}

function slugify(value) {
  return String(value || "project").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
}

async function readYaml(file) {
  const text = await readOptionalText(file);
  return text ? parseYaml(text) : {};
}

async function readOptionalText(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function normalizeEventName(event) {
  return String(event || "").trim();
}

function normalizePath(path) {
  return String(path || "").replace(/\\/g, "/").replace(/\/+/g, "/");
}
