import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { redactSecrets } from "../evidence/index.js";
export {
  buildGlobalKnowledgeProjection,
  buildInfrastructureFactProjection,
  buildNotionProjectableGlobalSummary,
  sanitizeProjection,
} from "./projections.js";

export const KNOWLEDGE_RECORD_TYPES = Object.freeze([
  "milestone",
  "patch",
  "chat",
  "explore",
  "release",
  "sync",
]);

export const KNOWLEDGE_INDEX_CATEGORIES = Object.freeze([
  "dependencies",
  "references",
  "pitfalls",
  "decisions",
  "config-notes",
  "secret-refs",
]);

export const DEFAULT_KNOWLEDGE_CONFIG = Object.freeze({
  enabled: true,
  root: ".pipeline/knowledge",
  loading: {
    session_start: true,
    compact: true,
    indexes: [...KNOWLEDGE_INDEX_CATEGORIES],
    records: false,
    global_projection: {
      enabled: true,
      root: "~/.hypo-workflow/knowledge/projections/projects",
      compact: true,
      index: true,
      records: false,
    },
  },
  compaction: {
    auto: true,
    max_records_per_category: 50,
    compact_file: ".pipeline/knowledge/knowledge.compact.md",
  },
  redaction: {
    enabled: true,
    replacement: "[REDACTED]",
    secret_keys: [
      "api_key",
      "token",
      "secret",
      "password",
      "authorization",
      "access_token",
      "refresh_token",
      "client_secret",
    ],
  },
  strictness: {
    invalid_record: "warn",
    missing_index: "warn",
    secret_leak: "error",
  },
});

const REQUIRED_RECORD_FIELDS = Object.freeze([
  "schema_version",
  "id",
  "type",
  "source",
  "created_at",
  "summary",
  "details",
  "tags",
  "categories",
  "refs",
]);

const SOURCE_FIELDS_BY_TYPE = Object.freeze({
  milestone: ["cycle", "feature", "milestone", "prompt_file"],
  patch: ["patch"],
  chat: ["session_id"],
  explore: ["explore_id"],
  release: ["version"],
  sync: ["sync_id"],
});

const CATEGORY_TITLES = Object.freeze({
  dependencies: "Dependencies",
  references: "References",
  pitfalls: "Pitfalls",
  decisions: "Decisions",
  "config-notes": "Config Notes",
  "secret-refs": "Secret Refs",
});

export function validateKnowledgeRecord(record = {}) {
  const errors = [];
  for (const field of REQUIRED_RECORD_FIELDS) {
    if (!(field in record)) errors.push(`missing required field: ${field}`);
  }

  if (!KNOWLEDGE_RECORD_TYPES.includes(record.type)) {
    errors.push(`unsupported record type: ${record.type}`);
  }

  const source = record.source || {};
  for (const field of SOURCE_FIELDS_BY_TYPE[record.type] || []) {
    if (!(field in source)) errors.push(`missing source field for ${record.type}: ${field}`);
  }

  for (const field of ["tags", "categories"]) {
    if (!Array.isArray(record[field])) errors.push(`${field} must be an array`);
  }

  for (const category of Array.isArray(record.categories) ? record.categories : []) {
    if (!KNOWLEDGE_INDEX_CATEGORIES.includes(category)) {
      errors.push(`unsupported category: ${category}`);
    }
  }

  if (!isPlainObject(record.refs)) {
    errors.push("refs must be an object");
  }

  for (const secretRef of Array.isArray(record.secret_refs) ? record.secret_refs : []) {
    if (!secretRef.provider) errors.push("secret_refs.provider is required");
    if (!secretRef.env) errors.push("secret_refs.env is required");
    for (const forbidden of ["raw_value", "value", "secret", "token", "api_key", "password"]) {
      if (Object.hasOwn(secretRef, forbidden)) {
        errors.push(`secret_refs must not store raw secret field: ${forbidden}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function normalizeKnowledgeRecord(record = {}, options = {}) {
  const redactionOptions = options.redaction ? { redaction: options.redaction } : {};
  const normalized = redactKnowledgeSecrets({
    schema_version: record.schema_version || "1",
    type: normalizeRecordType(record.type || "milestone"),
    source: normalizeKnowledgeSource(record.source || {}, record.type || "milestone"),
    created_at: record.created_at || new Date().toISOString(),
    summary: String(record.summary || "").trim(),
    details: isPlainObject(record.details) ? record.details : {},
    tags: normalizeKnowledgeTags(record.tags),
    categories: normalizeCategories(record.categories),
    refs: isPlainObject(record.refs) ? record.refs : {},
    ...(Array.isArray(record.secret_refs) ? { secret_refs: normalizeSecretRefs(record.secret_refs) } : {}),
  }, redactionOptions);

  const id = record.id || buildKnowledgeRecordId(normalized);
  return {
    id,
    ...normalized,
  };
}

export function normalizeKnowledgeSourceRef(value) {
  const ref = String(value || "").trim();
  const milestone = /^C(\d+)\/M(\d+)$/i.exec(ref);
  if (milestone) {
    return {
      kind: "milestone",
      ref: `C${Number(milestone[1])}/M${String(Number(milestone[2])).padStart(2, "0")}`,
      cycle: `C${Number(milestone[1])}`,
      milestone: `M${String(Number(milestone[2])).padStart(2, "0")}`,
    };
  }

  const patch = /^P(\d+)$/i.exec(ref);
  if (patch) {
    const id = `P${String(Number(patch[1])).padStart(3, "0")}`;
    return { kind: "patch", ref: id, patch: id };
  }

  const explore = /^E(\d+)$/i.exec(ref);
  if (explore) {
    const id = `E${String(Number(explore[1])).padStart(3, "0")}`;
    return { kind: "explore", ref: id, explore_id: id };
  }

  return { kind: "unknown", ref };
}

export function redactKnowledgeSecrets(value, options = {}) {
  const config = {
    ...DEFAULT_KNOWLEDGE_CONFIG.redaction,
    ...(options.redaction || options),
  };
  if (config.enabled === false) return value;
  return redactSecrets(value, {
    replacement: config.replacement,
    preservePaths: ["secret_refs"],
  });
}

export function buildKnowledgeLoadPlan(config = DEFAULT_KNOWLEDGE_CONFIG) {
  const merged = mergeObjects(DEFAULT_KNOWLEDGE_CONFIG, config || {});
  const root = merged.root || ".pipeline/knowledge";
  const loading = merged.loading || {};
  const globalProjection = normalizeGlobalProjectionLoadConfig(loading.global_projection);
  const indexes = loading.indexes === true
    ? [...KNOWLEDGE_INDEX_CATEGORIES]
    : Array.isArray(loading.indexes)
      ? loading.indexes
      : [];

  return {
    enabled: Boolean(merged.enabled),
    session_start: Boolean(loading.session_start),
    compact: loading.compact === false ? null : merged.compaction?.compact_file || `${root}/knowledge.compact.md`,
    indexes: indexes.map((category) => `${root}/index/${category}.yaml`),
    records: loading.records ? [`${root}/records/*.yaml`] : [],
    global_projection: {
      enabled: globalProjection.enabled,
      compact: globalProjection.enabled && globalProjection.compact ? `${globalProjection.root}/{project_id}.compact.md` : null,
      index: globalProjection.enabled && globalProjection.index ? `${globalProjection.root}/{project_id}.yaml` : null,
      records: [],
    },
  };
}

export function buildProjectGlobalKnowledgeProjection(input = {}) {
  const projectId = safeString(input.project_id || input.project?.id || input.object_id || "project");
  const project = findProjectRecord(projectId, input.project || input.project_registry || input.projects);
  const entries = filterProjectEntries(projectId, input.global_knowledge_projection?.entries || input.entries);
  const infrastructure = filterProjectEntries(projectId, input.infrastructure_projection?.facts || input.infrastructure_facts || input.facts);
  const secretRefs = filterProjectEntries(projectId, input.secret_capability_projection?.secret_refs || input.secret_refs)
    .map((ref) => compactObject({
      id: ref.id,
      provider: ref.provider,
      allowed_for: normalizeRefs(ref.allowed_for),
      health: ref.health ? compactObject({
        status: ref.health.status || "unknown",
        checked_at: ref.health.checked_at ?? null,
      }) : undefined,
      store_ref: {
        store_ref: ref.secret_ref?.store_ref || ref.store_ref || `local_secret:${ref.id || ref.provider || "unknown"}`,
        metadata_only: true,
      },
    }));

  return redactKnowledgeSecrets(compactObject({
    schema_version: "1",
    projection: "project_global_knowledge",
    project_id: projectId,
    generated_at: input.generated_at || null,
    raw_global_records_copied: false,
    raw_project_records_copied: false,
    facts: compactObject({
      display_name: project.display_name || project.name,
      canonical_path: project.path || project.canonical_path,
      status: project.status,
      platform: project.platform,
      profile: project.profile,
    }),
    relationships: normalizeRelationshipList(project.relationships || project.relations || project.links),
    entries: entries.map((entry) => projectProjectionEntry(entry)),
    infrastructure: infrastructure.map((fact) => projectProjectionEntry(fact)),
    secret_refs: secretRefs,
  }));
}

export function renderProjectGlobalProjectionCompact(projection = {}) {
  const lines = [
    "# Global Knowledge Projection",
    "",
    `Project: ${projection.project_id || "unknown"}`,
    `Generated: ${projection.generated_at || "unknown"}`,
    "",
    "This is a project-scoped read-only projection. Raw global records and raw secrets are not loaded.",
  ];

  const facts = projection.facts || {};
  lines.push("", "## Project Facts");
  const factLines = [
    facts.display_name ? `- Name: ${facts.display_name}` : null,
    facts.canonical_path ? `- Canonical path: ${facts.canonical_path}` : null,
    facts.status ? `- Status: ${facts.status}` : null,
    facts.platform ? `- Platform: ${facts.platform}` : null,
  ].filter(Boolean);
  lines.push(...(factLines.length ? factLines : ["- n/a"]));

  lines.push("", "## Relationships");
  const relationships = Array.isArray(projection.relationships) ? projection.relationships : [];
  lines.push(...(relationships.length
    ? relationships.map((item) => `- ${[item.kind, item.target, item.reason].filter(Boolean).join(": ")}`)
    : ["- n/a"]));

  lines.push("", "## Global Entries");
  const entries = Array.isArray(projection.entries) ? projection.entries : [];
  lines.push(...(entries.length ? entries.map(renderProjectionLine) : ["- n/a"]));

  lines.push("", "## Infrastructure");
  const infrastructure = Array.isArray(projection.infrastructure) ? projection.infrastructure : [];
  lines.push(...(infrastructure.length ? infrastructure.map(renderProjectionLine) : ["- n/a"]));

  lines.push("", "## Secret Refs");
  const secretRefs = Array.isArray(projection.secret_refs) ? projection.secret_refs : [];
  lines.push(...(secretRefs.length
    ? secretRefs.map((ref) => `- ${ref.id || ref.provider}: ${ref.provider || "unknown"} (${ref.store_ref?.store_ref || "metadata-only"})`)
    : ["- n/a"]));

  return `${lines.join("\n")}\n`;
}

export async function appendKnowledgeRecord(projectRoot, record, options = {}) {
  const normalized = normalizeKnowledgeRecord(record, options);
  const result = validateKnowledgeRecord(normalized);
  if (!result.ok) {
    throw new Error(`Invalid knowledge record:\n${result.errors.join("\n")}`);
  }

  const root = knowledgeRoot(projectRoot, options);
  const recordsDir = join(root, "records");
  await mkdir(recordsDir, { recursive: true });
  const path = join(recordsDir, `${normalized.id}.yaml`);
  await writeFile(path, `${(await stringifySharedYaml(normalized)).trimEnd()}\n`, "utf8");
  return { record: normalized, path };
}

export async function rebuildKnowledgeIndexes(projectRoot, options = {}) {
  const records = await loadKnowledgeRecords(projectRoot, options);
  const root = knowledgeRoot(projectRoot, options);
  const indexDir = join(root, "index");
  await mkdir(indexDir, { recursive: true });

  const files = {};
  for (const category of KNOWLEDGE_INDEX_CATEGORIES) {
    const index = buildCategoryIndex(category, records, options);
    const path = join(indexDir, `${category}.yaml`);
    await writeFile(path, `${(await stringifySharedYaml(index)).trimEnd()}\n`, "utf8");
    files[category] = path;
  }

  return { records, files };
}

export async function renderKnowledgeCompact(projectRoot, options = {}) {
  const records = options.records || await loadKnowledgeRecords(projectRoot, options);
  const content = renderCompactContent(records, options);
  const compactFile = options.compact_file || DEFAULT_KNOWLEDGE_CONFIG.compaction.compact_file;
  const path = join(projectRoot, compactFile);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  return { path, content };
}

export async function rebuildKnowledgeLedger(projectRoot, options = {}) {
  const indexes = await rebuildKnowledgeIndexes(projectRoot, options);
  const compact = await renderKnowledgeCompact(projectRoot, { ...options, records: indexes.records });
  return {
    records: indexes.records,
    indexes: indexes.files,
    compact: compact.path,
  };
}

export async function loadKnowledgeRecords(projectRoot, options = {}) {
  const recordsDir = join(knowledgeRoot(projectRoot, options), "records");
  let entries = [];
  try {
    entries = await readdir(recordsDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const records = [];
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".yaml")).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(recordsDir, entry.name);
    const record = await parseSharedYaml(await readFile(path, "utf8"));
    const normalized = normalizeKnowledgeRecord(record, options);
    const result = validateKnowledgeRecord(normalized);
    if (!result.ok) {
      throw new Error(`Invalid knowledge record ${relative(projectRoot, path)}:\n${result.errors.join("\n")}`);
    }
    records.push(normalized);
  }
  return records.sort(compareRecords);
}

function mergeObjects(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : override;
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] = key in merged ? mergeObjects(merged[key], value) : value;
  }
  return merged;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRecordType(type) {
  return String(type || "").trim().toLowerCase();
}

function normalizeKnowledgeSource(source, type) {
  if (typeof source === "string") {
    const sourceRef = normalizeKnowledgeSourceRef(source);
    if (sourceRef.kind === "milestone") return { cycle: sourceRef.cycle, milestone: sourceRef.milestone };
    if (sourceRef.kind === "patch") return { patch: sourceRef.patch };
    if (sourceRef.kind === "explore") return { explore_id: sourceRef.explore_id };
  }

  const result = { ...(isPlainObject(source) ? source : {}) };
  if ("cycle" in result) result.cycle = normalizePrefixedId(result.cycle, "C", 0);
  if ("feature" in result) result.feature = normalizePrefixedId(result.feature, "F", 3);
  if ("milestone" in result) result.milestone = normalizePrefixedId(result.milestone, "M", 2);
  if ("patch" in result) result.patch = normalizePrefixedId(result.patch, "P", 3);
  if ("explore_id" in result) result.explore_id = normalizePrefixedId(result.explore_id, "E", 3);
  if ("sync_id" in result) result.sync_id = String(result.sync_id).trim();
  if ("version" in result) result.version = String(result.version).trim();

  if (type === "patch" && !result.patch && result.id) result.patch = normalizePrefixedId(result.id, "P", 3);
  return result;
}

function normalizePrefixedId(value, prefix, width) {
  const raw = String(value || "").trim();
  const match = new RegExp(`^${prefix}?(\\d+)$`, "i").exec(raw);
  if (!match) return raw.toUpperCase();
  const number = String(Number(match[1]));
  return `${prefix}${width ? number.padStart(width, "0") : number}`;
}

function normalizeStringList(value) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
}

function normalizeCategories(value) {
  const normalized = [...new Set(normalizeStringList(value).map((category) => {
    const normalized = category.toLowerCase().replace(/[_\s]+/g, "-");
    return normalized === "secret-ref" ? "secret-refs" : normalized;
  }).filter((category) => KNOWLEDGE_INDEX_CATEGORIES.includes(category)))];
  return KNOWLEDGE_INDEX_CATEGORIES.filter((category) => normalized.includes(category));
}

function normalizeKnowledgeTags(value) {
  return normalizeStringList(value)
    .map((tag) => tag.toLowerCase().replace(/[_\s]+/g, "-"))
    .filter(Boolean);
}

function normalizeSecretRefs(secretRefs) {
  return secretRefs.map((secretRef) => {
    const result = {};
    for (const [key, value] of Object.entries(secretRef || {})) {
      if (["raw_value", "value", "secret", "token", "api_key", "password"].includes(key)) continue;
      result[key] = typeof value === "string" ? value.trim() : value;
    }
    return result;
  });
}

function buildKnowledgeRecordId(record) {
  const source = formatKnowledgeSource(record).replace("/", "-");
  const summary = slugify(record.summary || record.type || "knowledge-record");
  const hash = createHash("sha256").update(stableStringify(record)).digest("hex").slice(0, 8);
  return `${source}-${summary || "knowledge-record"}-${hash}`;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function knowledgeRoot(projectRoot, options = {}) {
  return join(projectRoot, options.root || DEFAULT_KNOWLEDGE_CONFIG.root);
}

function normalizeGlobalProjectionLoadConfig(config = {}) {
  const value = config === false ? { enabled: false } : isPlainObject(config) ? config : {};
  return {
    enabled: value.enabled !== false,
    root: value.root || "~/.hypo-workflow/knowledge/projections/projects",
    compact: value.compact !== false,
    index: value.index !== false,
    records: false,
  };
}

function findProjectRecord(projectId, input) {
  if (Array.isArray(input)) {
    return input.find((item) => safeString(item.id || item.project_id) === projectId) || {};
  }
  if (isPlainObject(input)) {
    if (safeString(input.id || input.project_id) === projectId) return input;
    const projects = input.projects || input.items || input.entries;
    if (Array.isArray(projects)) return findProjectRecord(projectId, projects);
    return input[projectId] || {};
  }
  return {};
}

function filterProjectEntries(projectId, entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => isAcceptedProjectionEntry(entry))
    .filter((entry) => isProjectRelevant(projectId, entry))
    .map((entry) => redactKnowledgeSecrets(entry));
}

function isAcceptedProjectionEntry(entry = {}) {
  const status = safeString(entry.status || "accepted").toLowerCase();
  return !["pending", "pending_review", "rejected", "raw", "superseded"].includes(status);
}

function isProjectRelevant(projectId, entry = {}) {
  const refs = [
    ...normalizeRefs(entry.project_ids),
    ...normalizeRefs(entry.projects),
    ...normalizeRefs(entry.object_refs),
    ...normalizeRefs(entry.applies_to),
  ];
  if (!refs.length) return true;
  return refs.some((ref) => ref === projectId || ref === `project:${projectId}`);
}

function projectProjectionEntry(entry = {}) {
  return compactObject({
    id: entry.id,
    type: entry.type || entry.category || entry.kind,
    title: entry.title,
    summary: entry.summary,
    sensitivity: entry.sensitivity,
    freshness: entry.freshness,
    status: entry.status,
    authority: entry.authority,
    source_ref: entry.source_ref || entry.path,
    evidence_refs: normalizeRefs(entry.evidence_refs || entry.source_record_refs),
    tags: normalizeRefs(entry.tags),
  });
}

function normalizeRelationshipList(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => {
      if (typeof item === "string") return { target: item };
      if (!isPlainObject(item)) return null;
      return compactObject({
        kind: item.kind || item.type || item.relation,
        target: item.target || item.to || item.project_id || item.id,
        reason: item.reason || item.summary,
      });
    })
    .filter(Boolean);
}

function renderProjectionLine(entry = {}) {
  const label = entry.title || entry.id || entry.type || "entry";
  const summary = entry.summary ? `: ${entry.summary}` : "";
  return `- ${label}${summary}`;
}

function compactObject(object = {}) {
  const result = {};
  for (const [key, value] of Object.entries(object || {})) {
    if (value === undefined) continue;
    if (value === null) {
      result[key] = value;
      continue;
    }
    if (Array.isArray(value) && value.length === 0) continue;
    if (isPlainObject(value) && Object.keys(value).length === 0) continue;
    result[key] = value;
  }
  return result;
}

function normalizeRefs(value) {
  return Array.isArray(value) ? value.map((item) => safeString(item)).filter(Boolean) : [];
}

function safeString(value) {
  return String(value || "").trim();
}

function buildCategoryIndex(category, records, options = {}) {
  const max = Number(options.max_records_per_category || DEFAULT_KNOWLEDGE_CONFIG.compaction.max_records_per_category);
  const entries = records
    .filter((record) => record.categories.includes(category))
    .slice(0, max > 0 ? max : undefined)
    .map((record) => ({
      record_id: record.id,
      type: record.type,
      source: formatKnowledgeSource(record),
      created_at: record.created_at,
      summary: record.summary,
      tags: record.tags,
      refs: record.refs,
      items: categoryItems(record, category),
    }));

  return {
    schema_version: "1",
    category,
    entries,
  };
}

function categoryItems(record, category) {
  if (category === "secret-refs") return record.secret_refs || [];
  const details = record.details || {};
  const value = details[category] ?? details[category.replace(/-/g, "_")];
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function renderCompactContent(records, options = {}) {
  const max = Number(options.max_records_per_category || DEFAULT_KNOWLEDGE_CONFIG.compaction.max_records_per_category);
  const lines = [
    "# Knowledge Compact",
    "",
    "Generated from `.pipeline/knowledge/records/*.yaml`. Raw records are loaded only on demand.",
  ];

  for (const category of KNOWLEDGE_INDEX_CATEGORIES) {
    const entries = records
      .filter((record) => record.categories.includes(category))
      .slice(0, max > 0 ? max : undefined);
    lines.push("", `## ${CATEGORY_TITLES[category]}`);
    if (!entries.length) {
      lines.push("- n/a");
      continue;
    }
    for (const record of entries) {
      const itemSummary = summarizeItems(categoryItems(record, category));
      lines.push(`- ${record.id} (${formatKnowledgeSource(record)}): ${record.summary}${itemSummary ? ` - ${itemSummary}` : ""}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function summarizeItems(items) {
  if (!items.length) return "";
  const first = items[0];
  if (typeof first === "string") return first;
  if (isPlainObject(first)) {
    return first.title || first.name || first.issue || first.key || first.env || first.purpose || "";
  }
  return String(first);
}

function formatKnowledgeSource(record) {
  const source = record.source || {};
  if (record.type === "milestone") return `${source.cycle}/${source.milestone}`;
  if (record.type === "patch") return source.patch;
  if (record.type === "explore") return source.explore_id;
  if (record.type === "chat") return source.session_id;
  if (record.type === "release") return source.version;
  if (record.type === "sync") return source.sync_id;
  return "unknown";
}

function compareRecords(a, b) {
  return String(b.created_at).localeCompare(String(a.created_at)) || a.id.localeCompare(b.id);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function parseSharedYaml(source) {
  const { parseYaml } = await import("../config/index.js");
  return parseYaml(source);
}

async function stringifySharedYaml(value) {
  const { stringifyYaml } = await import("../config/index.js");
  return stringifyYaml(value);
}
