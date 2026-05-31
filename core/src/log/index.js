import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseYaml, stringifyYaml } from "../config/index.js";
import { redactSecrets, validateSecretSafeEvidence } from "../evidence/index.js";

export const LIFECYCLE_LOG_FAMILIES = Object.freeze([
  "cycle",
  "plan",
  "feature",
  "milestone",
  "step",
  "patch",
  "pr",
  "acceptance",
  "sync",
  "recovery",
  "handoff",
  "derived_refresh",
  "platform",
  "audit",
  "quality",
  "debug",
  "release",
  "watchdog",
  "chat",
  "deep_plan",
]);

export const LIFECYCLE_LOG_STATUSES = Object.freeze([
  "active",
  "completed",
  "completed_with_transport_error",
  "warning",
  "blocked",
  "failed",
  "proposed",
  "queued",
  "skipped",
  "accepted",
  "rejected",
  "deferred",
  "running",
  "done",
  "closed",
  "revised",
  "pending_acceptance",
  "prepared",
  "partially_published",
  "waiting_confirmation",
  "confirmed",
  "started",
  "needs_changes",
  "needs_repair",
  "recorded",
  "review_ready",
  "remote_review_submitted",
  "rereview_passed",
  "merged",
  "researching",
  "module_drilldown",
  "architecture_mapping",
  "drafted",
  "ready",
  "revision",
  "in_progress",
  "decided",
]);

const RECENT_FAMILIES = new Set([
  "cycle",
  "plan",
  "feature",
  "milestone",
  "patch",
  "pr",
  "acceptance",
  "sync",
  "recovery",
  "handoff",
  "derived_refresh",
  "audit",
  "quality",
  "debug",
  "release",
  "chat",
]);

const INTERNAL_TYPES = new Set([
  "step_heartbeat",
  "platform_heartbeat",
  "hook_heartbeat",
  "watchdog_heartbeat",
  "compact_refresh",
]);

export function validateLifecycleLog(input = {}) {
  const log = typeof input === "string" ? parseYaml(input) : input;
  const errors = [];
  const families = new Set();
  const entries = Array.isArray(log.entries) ? log.entries : [];
  if (!Array.isArray(log.entries)) errors.push("entries must be an array");

  for (const [index, entry] of entries.entries()) {
    const prefix = `entries[${index}]`;
    for (const field of ["id", "type", "status", "timestamp", "summary"]) {
      if (!(field in entry)) errors.push(`${prefix}.${field} is required`);
    }
    const family = logFamily(entry.type);
    if (!family) errors.push(`${prefix}.type unsupported: ${entry.type}`);
    else families.add(family);
    if (!LIFECYCLE_LOG_STATUSES.includes(normalizeLogStatusForValidation(entry.status))) {
      errors.push(`${prefix}.status unsupported: ${entry.status}`);
    }
    if (!Number.isFinite(Date.parse(entry.timestamp || ""))) {
      errors.push(`${prefix}.timestamp must be ISO-8601`);
    }
    const secretCheck = validateSecretSafeEvidence({
      surface: "log",
      status: entry.status,
      content: entry,
    });
    if (!secretCheck.ok) errors.push(`${prefix} contains unredacted secret evidence`);
  }

  return {
    ok: errors.length === 0,
    errors,
    families: [...families].sort(),
    entries,
  };
}

export function buildRecentEvents(log = {}, options = {}) {
  const limit = Number(options.limit || 10);
  const entries = Array.isArray(log?.entries) ? log.entries : [];
  return entries
    .filter(isRecentEvent)
    .sort(compareByTimestampDesc)
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id || null,
      type: entry.type || null,
      family: logFamily(entry.type),
      status: entry.status || null,
      timestamp: entry.timestamp || null,
      summary: redactSecrets(entry.summary || ""),
      report: entry.report || null,
    }));
}

export async function appendLifecycleLogEntry(projectRoot = ".", entry = {}, options = {}) {
  const logFile = options.logFile || join(projectRoot, ".pipeline", "log.yaml");
  let log = { entries: [] };
  try {
    log = parseYaml(await readFile(logFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const normalized = normalizeLogEntry(entry, options);
  const next = {
    ...log,
    entries: [...(Array.isArray(log.entries) ? log.entries : []), normalized],
  };
  const result = validateLifecycleLog(next);
  if (!result.ok) {
    throw new Error(`Invalid lifecycle log:\n${result.errors.join("\n")}`);
  }
  await mkdir(dirname(logFile), { recursive: true });
  await writeFile(logFile, `${stringifyYaml(next).trimEnd()}\n`, "utf8");
  return { entry: normalized, log: next, path: logFile };
}

export function normalizeLogEntry(entry = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const type = normalizeLogType(entry.type || "milestone");
  const timestamp = entry.timestamp || now;
  const normalized = redactSecrets({
    id: entry.id || `${type}-${compactTimestamp(timestamp)}`,
    type,
    ref: entry.ref || null,
    status: normalizeLogStatus(entry.status || "completed"),
    timestamp,
    summary: entry.summary || "",
    ...(entry.report ? { report: entry.report } : {}),
    trigger: entry.trigger || "auto",
    ...(entry.related_milestone ? { related_milestone: entry.related_milestone } : {}),
    ...(entry.details ? { details: entry.details } : {}),
  });
  const secretCheck = validateSecretSafeEvidence({
    surface: "log",
    status: normalized.status,
    content: normalized,
  });
  if (!secretCheck.ok) {
    return redactSecrets(normalized);
  }
  return normalized;
}

export function logFamily(type) {
  const normalized = normalizeLogType(type);
  if (!normalized) return null;
  if (normalized === "plan_review" || normalized.startsWith("plan_")) return "plan";
  if (normalized.startsWith("planning")) return "plan";
  if (normalized.startsWith("discovery")) return "plan";
  if (normalized.startsWith("deep_plan")) return "deep_plan";
  if (normalized.startsWith("cycle")) return "cycle";
  if (normalized.startsWith("feature")) return "feature";
  if (normalized.startsWith("milestone")) return "milestone";
  if (normalized.startsWith("step")) return "step";
  if (normalized.startsWith("worker")) return "step";
  if (normalized.startsWith("patch")) return "patch";
  if (normalized.startsWith("pr")) return "pr";
  if (normalized.startsWith("revision")) return "step";
  if (normalized.startsWith("acceptance") || normalized.startsWith("cycle_accept") || normalized.startsWith("cycle_reject")) return "acceptance";
  if (normalized.startsWith("sync")) return "sync";
  if (normalized.startsWith("external_sync")) return "sync";
  if (normalized.startsWith("release")) return "release";
  if (normalized.startsWith("recovery") || normalized.includes("lease") || normalized.includes("takeover")) return "recovery";
  if (normalized.startsWith("handoff")) return "handoff";
  if (normalized.startsWith("derived")) return "derived_refresh";
  if (normalized.startsWith("platform")) return "platform";
  if (normalized.startsWith("audit")) return "audit";
  if (normalized.startsWith("quality")) return "quality";
  if (normalized.startsWith("debug")) return "debug";
  if (normalized.startsWith("watchdog")) return "watchdog";
  if (normalized.startsWith("chat")) return "chat";
  if (normalized.startsWith("pipeline")) return "cycle";
  if (["fix"].includes(normalized)) return "patch";
  return null;
}

function isRecentEvent(entry) {
  const type = normalizeLogType(entry.type);
  if (INTERNAL_TYPES.has(type)) return false;
  const family = logFamily(type);
  if (!RECENT_FAMILIES.has(family)) return false;
  const status = String(entry.status || "");
  if (family === "platform" && !["blocked", "failed", "warning"].includes(status)) return false;
  return true;
}

function compareByTimestampDesc(a, b) {
  const diff = Date.parse(b.timestamp || "") - Date.parse(a.timestamp || "");
  if (Number.isFinite(diff) && diff !== 0) return diff;
  return String(b.id || "").localeCompare(String(a.id || ""));
}

function normalizeLogType(value) {
  return String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function normalizeLogStatus(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (normalized === "done") return "completed";
  if (normalized === "in_progress") return "active";
  return LIFECYCLE_LOG_STATUSES.includes(normalized) ? normalized : "completed";
}

function normalizeLogStatusForValidation(value) {
  return String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function compactTimestamp(value) {
  return String(value)
    .replace(/[-:]/g, "")
    .replace(/\.\d+/, "")
    .replace(/\+/, "+")
    .replace(/Z$/, "Z");
}
