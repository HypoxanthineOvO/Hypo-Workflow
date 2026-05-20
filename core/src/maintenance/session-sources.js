import { readFile, readdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { detectSecretLeaks, redactSecrets } from "../evidence/index.js";

export const CONSOLIDATION_SOURCE_KINDS = Object.freeze([
  "codex_sessions",
  "opencode_sessions",
  "claude_sessions",
  "notion_pages",
]);

const DEFAULT_SOURCE_ROOTS = Object.freeze({
  codex_sessions: ".codex/sessions",
  opencode_sessions: ".opencode/sessions",
  claude_sessions: ".claude/projects",
  notion_pages: ".pipeline/notion/exports",
});

export async function discoverConsolidationSources(input = {}, options = {}) {
  const safeLocalOnly = input.safe_local_only !== false;
  if (!safeLocalOnly) {
    throw new Error("Global consolidation source discovery only supports safe_local_only local reads.");
  }

  const now = options.now || new Date().toISOString();
  const sourceKinds = canonicalSourceKinds(input.source_kinds);
  const roots = resolveSourceRoots(input, sourceKinds);
  const sources = [];
  const probes = [];

  for (const kind of sourceKinds) {
    const root = roots[kind];
    probes.push({
      kind,
      root,
      side_effect: "local_read",
      safe_local_only: true,
      probed_at: now,
    });

    const records = await readSourceRecords(kind, root, {
      fixture: Boolean(input.fixture_root || input.roots?.[kind]),
    });
    const sensitivity = combineSensitivity(records.map((record) => record.sensitivity));
    sources.push({
      kind,
      root,
      reader: input.fixture_root ? "fixture" : "local_probe",
      safe_local_only: true,
      records,
      sensitivity,
    });
  }

  return redactSecrets({
    safe_local_only: true,
    remote_writes_enabled: false,
    network_enabled: false,
    discovered_at: now,
    source_kinds: sourceKinds,
    probes,
    sources,
  }, {
    preservePaths: [/(\.|^)sensitivity(\.|$)/],
  });
}

export function canonicalSourceKinds(sourceKinds = CONSOLIDATION_SOURCE_KINDS) {
  const requested = new Set(Array.isArray(sourceKinds) && sourceKinds.length > 0
    ? sourceKinds
    : CONSOLIDATION_SOURCE_KINDS);
  return CONSOLIDATION_SOURCE_KINDS.filter((kind) => requested.has(kind));
}

export function classifyAndRedactRecord(record = {}) {
  const leaks = detectSecretLeaks(record);
  const rawSecretSeen = leaks.length > 0;
  const redacted = scrubConsolidationSecretMarkers(redactSecrets(record));
  return {
    ...redacted,
    sensitivity: {
      raw_secret_seen: rawSecretSeen,
      raw_secret_recorded: false,
      classification: rawSecretSeen ? "redacted_internal" : "internal",
    },
  };
}

export function scrubConsolidationSecretMarkers(value) {
  if (Array.isArray(value)) return value.map((item) => scrubConsolidationSecretMarkers(item));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, scrubConsolidationSecretMarkers(child)]));
  }
  if (typeof value !== "string") return value;
  return value
    .replace(/\bauthorization\s*:\s*bearer\s+\[REDACTED\]/gi, "[REDACTED]")
    .replace(/\b(cookie\s*:\s*)\[REDACTED\]/gi, "[REDACTED]")
    .replace(/\b(api[_-]?key|token|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret)\s*[:=]\s*\[REDACTED\]/gi, "[REDACTED]");
}

async function readSourceRecords(kind, root, options = {}) {
  const files = await listReadableFiles(root);
  const records = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const format = formatFor(file);
    const parsed = parseSourceFile(text, format, kind, file);
    const normalized = normalizeParsedRecords(kind, file, format, parsed, options);
    records.push(...normalized);
  }
  return records.sort((a, b) => {
    const byTime = String(a.created_at).localeCompare(String(b.created_at));
    if (byTime !== 0) return byTime;
    return String(a.source_ref).localeCompare(String(b.source_ref));
  });
}

async function listReadableFiles(root) {
  if (!root) return [];
  let info;
  try {
    info = await stat(root);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  if (info.isFile()) return isSupportedFile(root) ? [root] : [];
  if (!info.isDirectory()) return [];

  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listReadableFiles(path));
    } else if (entry.isFile() && isSupportedFile(path)) {
      files.push(path);
    }
  }
  return files.sort();
}

function resolveSourceRoots(input, sourceKinds) {
  const roots = {};
  for (const kind of sourceKinds) {
    if (input.roots?.[kind]) {
      roots[kind] = input.roots[kind];
    } else if (input.fixture_root) {
      roots[kind] = join(input.fixture_root, kind);
    } else {
      roots[kind] = DEFAULT_SOURCE_ROOTS[kind];
    }
  }
  return roots;
}

function normalizeParsedRecords(kind, file, format, parsed, options = {}) {
  if (format === "jsonl") {
    const grouped = groupJsonlMessages(parsed);
    return [...grouped.values()].map((items, index) => normalizeRecord(kind, file, format, {
      id: items[0]?.id || `${basename(file)}-${index + 1}`,
      created_at: items[0]?.timestamp || items[0]?.created_at,
      messages: items.map((item) => ({
        role: item.role || "unknown",
        content: item.content || item.text || "",
        timestamp: item.timestamp || item.created_at || null,
      })),
    }, options));
  }

  const values = Array.isArray(parsed) ? parsed : [parsed];
  return values.map((value, index) => normalizeRecord(kind, file, format, {
    ...value,
    id: value?.id || `${basename(file)}-${index + 1}`,
  }, options));
}

function normalizeRecord(kind, file, format, value = {}, options = {}) {
  const id = String(value.id || basename(file));
  const messages = normalizeMessages(value);
  const blocks = normalizeBlocks(value, format);
  const createdAt = value.created_at || value.timestamp || value.exported_at || inferDateFromName(file);
  const record = {
    id,
    source_kind: kind,
    source_ref: `${kind}:${id}`,
    created_at: new Date(createdAt).toISOString(),
    format,
    safe_local_fixture: Boolean(options.fixture),
    ...(messages.length > 0 ? { messages } : {}),
    ...(blocks.length > 0 ? { blocks } : {}),
    metadata: {
      file: basename(file),
      reader: options.fixture ? "fixture" : "local_probe",
    },
  };
  return classifyAndRedactRecord(record);
}

function parseSourceFile(text, format, kind, file) {
  if (format === "json") return JSON.parse(text);
  if (format === "jsonl") {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  if (format === "markdown") return parseMarkdownSession(text, kind, file);
  return {
    id: basename(file),
    created_at: inferDateFromName(file),
    messages: [{ role: "unknown", content: text }],
  };
}

function parseMarkdownSession(text, kind, file) {
  const lines = text.split(/\r?\n/);
  const messages = [];
  for (const line of lines) {
    const bullet = /^\s*[-*]\s*(?:(\d{1,2}:\d{2})\s*)?([^：:]+)[：:]\s*(.*)$/.exec(line);
    if (!bullet) continue;
    messages.push({
      role: normalizeRole(bullet[2]),
      content: bullet[3] || "",
      timestamp: bullet[1] || null,
    });
  }
  return {
    id: basename(file, extname(file)),
    created_at: inferDateFromName(file),
    messages: messages.length > 0 ? messages : [{ role: "unknown", content: text }],
    source_kind: kind,
  };
}

function normalizeMessages(value = {}) {
  if (Array.isArray(value.messages)) {
    return value.messages.map((message) => ({
      role: normalizeRole(message.role),
      content: String(message.content || message.text || ""),
      ...(message.timestamp || message.created_at ? { timestamp: message.timestamp || message.created_at } : {}),
    }));
  }
  if (value.content || value.text) {
    return [{
      role: normalizeRole(value.role),
      content: String(value.content || value.text || ""),
      ...(value.timestamp || value.created_at ? { timestamp: value.timestamp || value.created_at } : {}),
    }];
  }
  return [];
}

function normalizeBlocks(value = {}, format) {
  if (Array.isArray(value.blocks)) {
    return value.blocks.map((block) => ({
      id: block.id || null,
      type: block.type || "paragraph",
      text: String(block.text || block.content || ""),
    }));
  }
  if (format === "markdown" && value.content) {
    return [{ id: null, type: "markdown", text: String(value.content) }];
  }
  return [];
}

function groupJsonlMessages(items = []) {
  const groups = new Map();
  for (const item of items) {
    const key = item.id || "jsonl-session";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function combineSensitivity(items = []) {
  const rawSecretSeen = items.some((item) => item?.raw_secret_seen);
  return {
    raw_secret_seen: rawSecretSeen,
    raw_secret_recorded: false,
    classification: rawSecretSeen ? "redacted_internal" : "internal",
  };
}

function normalizeRole(value) {
  const text = String(value || "unknown").trim().toLowerCase();
  if (["用户", "user", "human"].includes(text)) return "user";
  if (["助手", "assistant"].includes(text)) return "assistant";
  if (["system", "系统"].includes(text)) return "system";
  return text || "unknown";
}

function isSupportedFile(path) {
  return ["json", "jsonl", "markdown"].includes(formatFor(path));
}

function formatFor(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".json") return "json";
  if (extension === ".jsonl") return "jsonl";
  if (extension === ".md" || extension === ".markdown") return "markdown";
  return extension.replace(/^\./, "") || "unknown";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function inferDateFromName(file) {
  const match = /(\d{4}-\d{2}-\d{2})/.exec(basename(file));
  return match ? `${match[1]}T00:00:00.000Z` : new Date(0).toISOString();
}
