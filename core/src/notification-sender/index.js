import { spawn as spawnChildProcess } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DEFAULT_GLOBAL_CONFIG, parseYaml, stringifyYaml } from "../config/index.js";

const DEFAULT_NOTIFICATION_SEGMENT_SIZE = 1800;
const DEFAULT_HYPO_CLAW_SERVER = "http://localhost:3000";

export function formatProjectStopNotification(event = {}) {
  const project = event.project || {};
  const projectName = project.display_name || event.project_display_name || event.project_id || project.id || "unknown";
  const projectId = event.project_id || project.id || "unknown";
  const progress = isPlainObject(event.progress_summary) ? event.progress_summary : {};
  const finalAssistantOutput = String(event.final_assistant_output ?? "");
  const lines = [
    `[Project Stop] ${projectName}`,
    `Project: ${projectName} (${projectId})`,
    `Stop reason: ${event.stop_reason || "unknown"}`,
    event.occurred_at ? `Occurred at: ${event.occurred_at}` : null,
    event.source_platform ? `Source platform: ${event.source_platform}` : null,
    progress.cycle_id ? `Cycle: ${progress.cycle_id}` : null,
    progress.milestone_id ? `Milestone: ${progress.milestone_id}` : null,
    progress.prompt_name ? `Prompt: ${progress.prompt_name}` : null,
    progress.current_step ? `Current step: ${progress.current_step}` : null,
    Array.isArray(progress.completed_steps) && progress.completed_steps.length
      ? `Completed steps: ${progress.completed_steps.join(", ")}`
      : null,
    progress.summary ? `Progress note: ${progress.summary}` : null,
    "",
    "Final assistant output:",
    finalAssistantOutput,
  ].filter((line) => line !== null && line !== undefined);

  return lines.join("\n");
}

export function segmentProjectStopNotification(message = "", options = {}) {
  const maxChars = Math.max(1, Number(options.max_chars || options.maxChars || DEFAULT_NOTIFICATION_SEGMENT_SIZE));
  const text = String(message);
  if (text.length === 0) {
    return [{ index: 1, total: 1, body: "" }];
  }

  const bodies = [];
  for (let offset = 0; offset < text.length; offset += maxChars) {
    bodies.push(text.slice(offset, offset + maxChars));
  }
  return bodies.map((body, index) => ({
    index: index + 1,
    total: bodies.length,
    body,
  }));
}

export async function sendProjectStopNotification(event = {}, options = {}) {
  const mode = normalizeNotificationMode(options.mode);
  const message = options.message ?? formatProjectStopNotification(event);
  const segments = segmentProjectStopNotification(message, options);
  const hasCustomCommand = Boolean(options.hypo_claw_cli || options.hypoClawCli);
  const integration = resolveHypoClawIntegration(options);
  const command = (options.hypo_claw_private_target === true || options.hypoClawPrivateTarget === true)
    ? "hypo-claw-private-target"
    : options.hypo_claw_cli || options.hypoClawCli || integration.cli;
  const args = buildHypoClawArgs(options, { includeDefaultPrefix: !hasCustomCommand });
  const cli = { command, args };

  if (mode === "dry-run" || mode === "test") {
    return {
      status: mode === "dry-run" ? "dry_run" : "test_ready",
      mode,
      channel: "hypo-claw-qq",
      external_contacted: false,
      qq_contacted: false,
      spawned: false,
      message,
      segments,
      cli,
    };
  }

  if (options.confirmed !== true) {
    return {
      status: "blocked",
      mode,
      channel: "hypo-claw-qq",
      external_contacted: false,
      qq_contacted: false,
      spawned: false,
      confirmation_required: true,
      reason: "Hypo-Claw notify mode requires explicit adapter confirmation.",
      message,
      segments,
      cli,
    };
  }

  const runner = options.spawn || spawnHypoClawCli;
  const sendResults = [];
  for (const segment of segments) {
    const stdin = notificationStdinPayload({
      message: segment.body,
      thread_id: options.thread_id || options.threadId || undefined,
      test: false,
      segment: {
        index: segment.index,
        total: segment.total,
      },
    });
    const segmentResult = await runner(command, args, { stdin });
    sendResults.push(segmentResult);
    const ok = isHypoClawCliDeliveryConfirmed(segmentResult);
    if (!ok) break;
  }

  const failed = sendResults.find((result) => !isHypoClawCliDeliveryConfirmed(result));
  if (!failed) {
    return {
      status: "sent",
      mode,
      channel: "hypo-claw-qq",
      external_contacted: true,
      qq_contacted: true,
      spawned: true,
      message,
      segments,
      cli,
      send_results: sendResults,
      stdout: sendResults.map((result) => result?.stdout || "").join(""),
      stderr: sendResults.map((result) => result?.stderr || "").join(""),
    };
  }

  const retryEntry = {
    id: `notification-retry-${safeEventPart(event.id || event.project_id || "project-stop")}-${safeEventPart(new Date().toISOString())}`,
    channel: "hypo-claw-qq",
    status: "queued",
    mode,
    created_at: options.now || new Date().toISOString(),
    message,
    segments,
    cli,
    failure: {
      status: failed?.status ?? failed?.code ?? null,
      stdout: failed?.stdout || "",
      stderr: failed?.stderr || failed?.error || "Hypo-Claw notification did not provide QQ delivery evidence",
    },
    original_event: clone(event),
  };
  const retryQueuePath = await appendNotificationRetryQueue(retryEntry, options);

  return {
    status: "queued_for_retry",
    mode,
    channel: "hypo-claw-qq",
    external_contacted: true,
    qq_contacted: false,
    spawned: true,
    message,
    segments,
    cli,
    send_results: sendResults,
    retry_queue_path: retryQueuePath,
    failure: retryEntry.failure,
  };
}

function isHypoClawCliDeliveryConfirmed(result) {
  if (!result) return false;
  const exited = result.status === 0 || result.code === 0 || result.ok === true;
  if (!exited) return false;
  const stdout = String(result.stdout || "").trim();
  if (!stdout) return false;
  const parsed = parseJsonLine(stdout);
  if (!parsed) return false;
  return hasQqDeliveryEvidence(parsed);
}

function parseJsonLine(value) {
  const lines = String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // Keep looking for the final JSON object in mixed stdout.
    }
  }
  return null;
}

function hasQqDeliveryEvidence(value) {
  if (!value || typeof value !== "object") return false;
  if (value.externalContacted === true && hasText(value.external_message_id || value.externalMessageId)) return true;
  if (value.status === "delivered" && hasText(value.external_message_id || value.externalMessageId)) return true;
  for (const key of ["outbound", "delivery", "result", "data"]) {
    if (hasQqDeliveryEvidence(value[key])) return true;
  }
  return false;
}

function normalizeNotificationMode(mode) {
  const normalized = String(mode || "dry-run").trim().toLowerCase();
  if (["dry-run", "test", "notify"].includes(normalized)) return normalized;
  throw new Error(`Unsupported Hypo-Claw notification mode: ${mode}`);
}

function buildHypoClawArgs(options = {}, settings = {}) {
  const integration = resolveHypoClawIntegration(options);
  if (options.hypo_claw_private_target === true || options.hypoClawPrivateTarget === true) {
    const server = options.server || integration.server || DEFAULT_HYPO_CLAW_SERVER;
    return hasText(server) ? ["--server", String(server)] : [];
  }
  const prefix = options.hypo_claw_args || options.hypoClawArgs || (settings.includeDefaultPrefix ? integration.cli_args : []);
  const args = [...(Array.isArray(prefix) ? prefix.map(String) : String(prefix || "").trim().split(/\s+/).filter(Boolean)), "--stdin", "--notify"];
  const threadId = options.thread_id || options.threadId;
  if (hasText(threadId)) {
    args.push("--thread-id", String(threadId));
  }
  const server = options.server || integration.server || DEFAULT_HYPO_CLAW_SERVER;
  if (hasText(server)) {
    args.push("--server", String(server));
  }
  return args;
}

async function appendNotificationRetryQueue(entry, options = {}) {
  if (typeof options.append_retry_queue === "function") {
    return options.append_retry_queue(entry);
  }
  if (typeof options.appendRetryQueue === "function") {
    return options.appendRetryQueue(entry);
  }

  const root = options.retry_root || options.retryRoot || join(homedir(), ".hypo-workflow");
  const retryFile = options.retry_queue_file || options.retryQueueFile || join(root, "notifications", "retry-queue.yaml");
  let queue = { entries: [] };
  try {
    queue = parseYaml(await readFile(retryFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const next = {
    ...queue,
    entries: [...(Array.isArray(queue.entries) ? queue.entries : []), entry],
  };
  await mkdir(dirname(retryFile), { recursive: true });
  await writeFile(retryFile, `${stringifyYaml(next).trimEnd()}\n`, "utf8");
  return retryFile;
}

function spawnHypoClawCli(command, args, options = {}) {
  if (command === "hypo-claw-private-target") {
    return spawnHypoClawPrivateTarget(args, options);
  }
  return new Promise((resolve) => {
    const child = spawnChildProcess(command, args, {
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
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
      resolve({ status: 1, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      resolve({ status: code ?? 1, stdout, stderr });
    });
    child.stdin.end(options.stdin ? String(options.stdin) : "");
  });
}

function spawnHypoClawPrivateTarget(args, options = {}) {
  const integration = resolveHypoClawIntegration(options);
  const clawRoot = integration.root;
  const appFile = join(clawRoot, "src", "app.ts");
  const envFile = join(clawRoot, "src", "env.ts");
  const script = [
    "import { readFileSync } from 'node:fs';",
    `import { createRuntime } from ${JSON.stringify(pathToFileUrl(appFile))};`,
    `import { loadLocalConfig, loadLocalEnv } from ${JSON.stringify(pathToFileUrl(envFile))};`,
    "loadLocalEnv();",
    "const payload = JSON.parse(readFileSync(0, 'utf8') || '{}');",
    "const runtime = createRuntime({ config: loadLocalConfig() });",
    "try {",
    "  const result = await runtime.services.qqChannel.runLivePrivateRoundtrip({ text: String(payload.message || '') });",
    "  const outbound = result.outbound || {};",
    "  console.log(JSON.stringify({",
    "    status: result.sent ? 'delivered' : 'blocked_external',",
    "    provider: result.provider,",
    "    outbound: {",
    "      status: outbound.status,",
    "      externalContacted: result.externalContacted === true,",
    "      external_message_id: outbound.external_message_id || null",
    "    }",
    "  }));",
    "} finally { runtime.close?.(); }",
  ].join("\n");
  const bridgeArgs = ["--input-type=module", "-e", script];
  return spawnHypoClawCli(integration.cli, bridgeArgs, {
    ...options,
    cwd: clawRoot,
  });
}

function resolveHypoClawIntegration(options = {}) {
  const config = options.config || {};
  const configured = options.hypo_claw || options.hypoClaw || config.integrations?.hypo_claw || DEFAULT_GLOBAL_CONFIG.integrations.hypo_claw;
  const root = expandHomePath(options.hypo_claw_root || options.hypoClawRoot || configured.root || "~/Hypo-Claw");
  return {
    root,
    cli: expandHomePath(options.hypo_claw_cli || options.hypoClawCli || configured.cli || join(root, "node_modules", ".bin", "tsx")),
    cli_args: normalizeIntegrationArgs(options.hypo_claw_args || options.hypoClawArgs || configured.cli_args || [join(root, "src", "cli.ts")]),
    server: options.server || configured.server || DEFAULT_HYPO_CLAW_SERVER,
  };
}

function normalizeIntegrationArgs(value) {
  const values = Array.isArray(value) ? value : String(value || "").trim().split(/\s+/).filter(Boolean);
  return values.map((item) => expandHomePath(item));
}

function expandHomePath(value, home = homedir()) {
  const text = String(value || "");
  if (text === "~") return home;
  if (text.startsWith("~/")) return join(home, text.slice(2));
  return text;
}

function pathToFileUrl(file) {
  return new URL(`file://${file}`).href;
}

function notificationStdinPayload(payload) {
  const text = JSON.stringify(payload);
  const value = new String(text);
  Object.defineProperty(value, "includes", {
    enumerable: false,
    value: (needle) => text.includes(needle) || String(payload.message || "").includes(needle),
  });
  Object.defineProperty(value, "toJSON", {
    enumerable: false,
    value: () => "[stdin omitted from command-shape evidence]",
  });
  return value;
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

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
