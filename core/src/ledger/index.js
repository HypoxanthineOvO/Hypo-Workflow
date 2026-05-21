import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { parseYaml, stringifyYaml } from "../config/index.js";

export function jsonlLedgerPathFor(path) {
  const text = String(path || "");
  if (text.endsWith(".jsonl")) return text;
  if (text.endsWith(".yaml") || text.endsWith(".yml")) return `${text.replace(/\.(ya?ml)$/, "")}.jsonl`;
  return join(text, "ledger.jsonl");
}

export function compactLedgerSummaryPathFor(path) {
  const jsonlPath = jsonlLedgerPathFor(path);
  return `${jsonlPath.replace(/\.jsonl$/, "")}.summary.yaml`;
}

export async function appendJsonlLedgerEntry(path, entry = {}, options = {}) {
  const jsonlPath = jsonlLedgerPathFor(path);
  const legacyPath = migrationSourceFor(jsonlPath, options);
  if (legacyPath) {
    await migrateYamlLedgerToJsonl(legacyPath, {
      jsonl_path: jsonlPath,
      summary_path: options.summary_path,
    });
  }

  await mkdir(dirname(jsonlPath), { recursive: true });
  await appendFile(jsonlPath, `${JSON.stringify(entry)}\n`, "utf8");
  const ledger = await readJsonlLedger(jsonlPath);
  const summary = await writeCompactLedgerSummary(jsonlPath, ledger.events, {
    summary_path: options.summary_path,
  });
  return {
    path: jsonlPath,
    authority_path: jsonlPath,
    event: entry,
    entry,
    ledger,
    summary,
    summary_path: summary.path,
  };
}

export async function readJsonlLedger(path, options = {}) {
  const jsonlPath = jsonlLedgerPathFor(path);
  const legacyPath = migrationSourceFor(jsonlPath, options);
  if (options.migrate !== false && legacyPath) {
    await migrateYamlLedgerToJsonl(legacyPath, {
      jsonl_path: jsonlPath,
      summary_path: options.summary_path,
    });
  }

  let source = "";
  try {
    source = await readFile(jsonlPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const events = [];
  const lines = source.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      throw new Error(`Invalid JSONL ledger line ${index + 1} in ${jsonlPath}: ${error.message}`);
    }
  }

  return normalizeJsonlLedger(jsonlPath, events);
}

export async function migrateYamlLedgerToJsonl(yamlPath, options = {}) {
  const spec = isPlainObject(yamlPath) ? yamlPath : { yaml_path: yamlPath, ...options };
  const legacyPath = String(spec.yaml_path || spec.yamlPath || spec.legacy_path || spec.legacyPath || "");
  const jsonlPath = jsonlLedgerPathFor(spec.jsonl_path || spec.jsonlPath || legacyPath);
  const summaryPath = spec.summary_path || spec.summaryPath || compactLedgerSummaryPathFor(jsonlPath);

  let yamlEvents = [];
  try {
    const parsed = parseYaml(await readFile(legacyPath, "utf8"));
    yamlEvents = Array.isArray(parsed?.events) ? parsed.events : [];
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const existing = await readJsonlLedger(jsonlPath, { migrate: false });
  const existingIds = new Set(existing.events.map((event) => event?.id).filter(Boolean));
  const additions = [];
  for (const event of yamlEvents) {
    if (event?.id && existingIds.has(event.id)) continue;
    additions.push(event);
    if (event?.id) existingIds.add(event.id);
  }

  if (additions.length > 0) {
    await mkdir(dirname(jsonlPath), { recursive: true });
    await appendFile(jsonlPath, additions.map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");
  }

  const ledger = await readJsonlLedger(jsonlPath, { migrate: false });
  const summary = await writeCompactLedgerSummary(jsonlPath, ledger.events, {
    summary_path: summaryPath,
  });
  return {
    path: jsonlPath,
    authority_path: jsonlPath,
    legacy_path: legacyPath,
    migrated_count: additions.length,
    event_count: ledger.events.length,
    ledger,
    summary,
    summary_path: summary.path,
  };
}

export async function writeCompactLedgerSummary(path, eventsOrLedger = [], options = {}) {
  const spec = isPlainObject(path) ? path : { path, events: eventsOrLedger, ...options };
  const jsonlPath = jsonlLedgerPathFor(spec.jsonl_path || spec.jsonlPath || spec.path);
  const providedEvents = spec.events;
  const events = providedEvents === undefined && isPlainObject(path)
    ? null
    : Array.isArray(providedEvents)
    ? providedEvents
    : Array.isArray(providedEvents?.events)
      ? providedEvents.events
      : (Array.isArray(eventsOrLedger)
          ? eventsOrLedger
          : Array.isArray(eventsOrLedger?.events)
            ? eventsOrLedger.events
            : (typeof eventsOrLedger === "string" ? null : []));
  const sourceEvents = events === null
    ? (await readJsonlLedger(jsonlPath, { migrate: false })).events
    : events;
  const eventIds = sourceEvents.map((event) => event?.id).filter(Boolean);
  const summary = {
    authority: "jsonl",
    authority_path: jsonlPath,
    schema_version: "1",
    event_count: sourceEvents.length,
    latest_event_id: eventIds.length > 0 ? eventIds[eventIds.length - 1] : null,
    event_ids: eventIds,
  };
  const summaryPath = spec.summary_path || spec.summaryPath || (typeof eventsOrLedger === "string" ? eventsOrLedger : compactLedgerSummaryPathFor(jsonlPath));
  await mkdir(dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, `${stringifyYaml(summary).trimEnd()}\n`, "utf8");
  return { path: summaryPath, summary };
}

function normalizeJsonlLedger(path, events) {
  return {
    authority: "jsonl",
    authority_path: path,
    schema_version: "1",
    events,
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function legacyYamlLedgerPathFor(path) {
  const text = String(path || "");
  if (extname(text) === ".jsonl") return `${text.replace(/\.jsonl$/, "")}.yaml`;
  return text;
}

function migrationSourceFor(jsonlPath, options = {}) {
  const explicit = options.migrate_from || options.legacy_path;
  if (!explicit) return legacyYamlLedgerPathFor(jsonlPath);
  const text = String(explicit);
  if (text.endsWith(".jsonl")) return legacyYamlLedgerPathFor(text);
  return text;
}
