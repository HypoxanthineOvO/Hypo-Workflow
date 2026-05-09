import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { DEFAULT_GLOBAL_CONFIG, loadConfig, parseYaml, stringifyYaml } from "../config/index.js";
import { buildDerivedArtifactMap } from "../sync/index.js";

const COMPACT_ARTIFACT_IDS = Object.freeze([
  "progress_compact",
  "state_compact",
  "log_compact",
  "metrics_compact",
  "reports_compact",
  "patches_compact",
]);

const SUCCESS_STATUSES = Object.freeze([
  "completed",
  "complete",
  "passed",
  "pass",
  "success",
  "succeeded",
  "green",
  "pending_acceptance",
]);

export function compactEndOfRunTargets(options = {}) {
  const ids = new Set(options.ids || COMPACT_ARTIFACT_IDS);
  return buildDerivedArtifactMap().filter((entry) => (
    ids.has(entry.id)
    && entry.path.includes(".compact.")
    && typeof entry.refresh === "function"
  ));
}

export async function runEndOfRunCompact(projectRoot = ".", options = {}) {
  const root = resolve(projectRoot);
  const config = options.config || await loadConfig(join(root, ".pipeline", "config.yaml"))
    .catch(() => DEFAULT_GLOBAL_CONFIG);
  const compactConfig = {
    auto: true,
    end_of_run: true,
    refresh_policy: "dirty_only",
    ...(config.compact || {}),
    ...(options.compact || {}),
  };

  const result = {
    ok: true,
    skipped: false,
    reason: null,
    policy: compactConfig.refresh_policy || "dirty_only",
    refreshed: [],
    unchanged: [],
    failures: [],
  };

  if (compactConfig.auto === false) {
    return { ...result, skipped: true, reason: "compact_auto_disabled" };
  }
  if (compactConfig.end_of_run === false) {
    return { ...result, skipped: true, reason: "end_of_run_compact_disabled" };
  }
  if (!isSuccessfulRun(options)) {
    return { ...result, skipped: true, reason: "run_not_successful" };
  }

  const entries = compactEndOfRunTargets(options);
  for (const entry of entries) {
    const decision = await shouldRefreshCompact(root, entry, {
      ...options,
      policy: result.policy,
    });
    if (!decision.refresh) {
      result.unchanged.push({ id: entry.id, path: entry.path, reason: decision.reason });
      continue;
    }

    try {
      const content = await entry.refresh(root, entry, options);
      if (content === null || content === undefined) {
        result.unchanged.push({ id: entry.id, path: entry.path, reason: "source_missing" });
        continue;
      }
      await writeText(join(root, entry.path), content);
      result.refreshed.push(entry.path);
    } catch (error) {
      result.failures.push({ id: entry.id, path: entry.path, reason: error.message || String(error) });
    }
  }

  result.ok = result.failures.length === 0;
  if (!result.ok && options.writeMarker !== false) {
    await writeEndOfRunCompactMarker(root, result, options);
  }
  return result;
}

export async function shouldRefreshCompact(root, entry, options = {}) {
  const target = await pathMtime(join(root, entry.path));
  const sources = [];
  for (const source of entry.derived_from || []) {
    sources.push(await pathMtime(join(root, source), source));
  }
  const existingSources = sources.filter((source) => source.exists);
  if (!existingSources.length) return { refresh: false, reason: "missing_sources", sources };
  if (!target.exists) return { refresh: true, reason: "target_missing", sources };

  if (options.policy === "always" || options.force) {
    return { refresh: true, reason: "forced", sources };
  }

  const dirtySources = existingSources.filter((source) => source.mtimeMs > target.mtimeMs);
  if (dirtySources.length) {
    return { refresh: true, reason: "dirty_sources", sources: dirtySources };
  }
  return { refresh: false, reason: "fresh", sources };
}

function isSuccessfulRun(options = {}) {
  if (options.success === true) return true;
  if (options.success === false) return false;
  const status = String(options.status || options.pipeline_status || "").trim().toLowerCase();
  return SUCCESS_STATUSES.includes(status);
}

async function pathMtime(path, relativePath = null) {
  try {
    const stats = await stat(path);
    if (!stats.isDirectory()) {
      return { path: relativePath, exists: true, mtimeMs: stats.mtimeMs };
    }
    return {
      path: relativePath,
      exists: true,
      mtimeMs: Math.max(stats.mtimeMs, await maxDirectoryMtime(path)),
    };
  } catch (error) {
    if (error.code === "ENOENT") return { path: relativePath, exists: false, mtimeMs: 0 };
    throw error;
  }
}

async function maxDirectoryMtime(dir) {
  let max = 0;
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return max;
  }
  for (const entry of entries) {
    const child = join(dir, entry.name);
    const stats = await stat(child);
    max = Math.max(max, stats.mtimeMs);
    if (entry.isDirectory()) max = Math.max(max, await maxDirectoryMtime(child));
  }
  return max;
}

async function writeEndOfRunCompactMarker(root, result, options = {}) {
  const path = join(root, ".pipeline", "derived-refresh.yaml");
  let existing = {};
  try {
    existing = parseYaml(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const marker = {
    ...existing,
    compact_end_of_run: {
      ok: result.ok,
      checked_at: options.now || new Date().toISOString(),
      policy: result.policy,
      refreshed: result.refreshed,
      failures: result.failures,
    },
  };
  await writeText(path, `${stringifyYaml(marker).trimEnd()}\n`);
}

async function writeText(file, content) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}
