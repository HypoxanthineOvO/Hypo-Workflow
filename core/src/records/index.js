import { lstat, readFile, readdir } from "node:fs/promises";
import { basename, relative, resolve, sep } from "node:path";
import { stringifyYaml } from "../serialization/index.js";
import {
  assertWorkspacePathAllowed,
  commitWorkspaceTransaction,
} from "../workspace-store/index.js";
import {
  AUTHORITY_SCHEMA_VERSION,
  authorityError,
  normalizeSafeIdentifier,
  normalizeTransactionOptions,
  readCurrentManifest,
} from "../runtime/internal.js";
import { parseRecordDocument, renderRecordDocument } from "./frontmatter.js";
import {
  buildPersistedRecord,
  normalizeRecordPatch,
  recordMetadata,
  recordScopeDirectory,
} from "./schema.js";

const RECORDS_ROOT = ".pipeline/memory/records";

export function createRecordPatch(input) {
  return normalizeRecordPatch(input);
}

export function compileRecordStore(patches) {
  if (!Array.isArray(patches) || patches.length === 0) {
    throw authorityError("ERR_RECORD_SCHEMA_INVALID", "Record compilation requires a non-empty array of Record Patches");
  }
  const records = patches.map((patch) => {
    const record = buildPersistedRecord(patch);
    const path = `${RECORDS_ROOT}/${recordScopeDirectory(record.attributes.scope)}/${record.attributes.kind}/${record.id}.md`;
    return { path, attributes: record.attributes, body: record.body };
  }).sort((left, right) => left.attributes.id.localeCompare(right.attributes.id));
  if (new Set(records.map((record) => record.attributes.id)).size !== records.length) {
    throw authorityError("ERR_RECORD_INTEGRITY", "Record compilation produced duplicate semantic IDs");
  }
  const indexes = compileRecordIndexes(records);
  return {
    records,
    metadata: indexes.metadata,
    machine_index: indexes.machineIndex,
    markdown_index: indexes.markdownIndex,
    writes: [
      ...records.map((record) => ({
        path: record.path,
        content: renderRecordDocument(record.attributes, record.body),
      })),
      { path: ".pipeline/memory/index.yaml", content: `${stringifyYaml(indexes.machineIndex).trimEnd()}\n` },
      { path: ".pipeline/memory/INDEX.md", content: indexes.markdownIndex },
    ],
  };
}

export async function commitRecordPatch(root, stagedPatch, options = {}) {
  const record = buildPersistedRecord(stagedPatch);
  const path = `${RECORDS_ROOT}/${recordScopeDirectory(record.attributes.scope)}/${record.attributes.kind}/${record.id}.md`;
  const existingRecords = await readAllRecords(root);
  const identical = existingRecords.find((entry) => entry.attributes.id === record.id);
  if (identical) {
    if (identical.attributes.semantic_hash !== record.semantic_hash) {
      throw authorityError("ERR_RECORD_INTEGRITY", "Existing Record id has different durable content");
    }
    return { id: record.id, path: identical.path, deduplicated: true };
  }

  enforceSupersedes(existingRecords, record);
  const transaction = normalizeTransactionOptions(options, "record-commit", {
    id: record.id,
    semantic_hash: record.semantic_hash,
  });
  const manifest = await readCurrentManifest(root);
  await commitWorkspaceTransaction(root, {
    id: transaction.id,
    faultInjector: transaction.faultInjector,
    manifest,
    writes: [{ path, content: renderRecordDocument(record.attributes, record.body) }],
  });
  return { id: record.id, path, deduplicated: false };
}

export async function readRecord(root, idInput) {
  const id = normalizeSafeIdentifier(idInput, "Record id");
  const matches = (await readAllRecords(root)).filter((record) => record.attributes.id === id);
  if (matches.length === 0) throw authorityError("ERR_RECORD_NOT_FOUND", "Record was not found");
  if (matches.length > 1) throw authorityError("ERR_RECORD_INTEGRITY", "Record id is duplicated across the Record Store");
  return matches[0];
}

export async function rebuildRecordIndexes(root, options = {}) {
  const records = await readAllRecords(root);
  const compiled = compileRecordIndexes(records);
  const transaction = normalizeTransactionOptions(options, "record-index-rebuild", compiled.machineIndex);
  const manifest = await readCurrentManifest(root);
  const yamlPath = ".pipeline/memory/index.yaml";
  const markdownPath = ".pipeline/memory/INDEX.md";
  await commitWorkspaceTransaction(root, {
    id: transaction.id,
    faultInjector: transaction.faultInjector,
    manifest,
    writes: [
      { path: yamlPath, content: `${stringifyYaml(compiled.machineIndex).trimEnd()}\n` },
      { path: markdownPath, content: compiled.markdownIndex },
    ],
  });
  return { index_path: yamlPath, markdown_path: markdownPath, records: compiled.metadata.length };
}

function compileRecordIndexes(records) {
  const byId = new Map(records.map((record) => [record.attributes.id, record]));
  validateSupersedesGraph(records, byId);
  const activeByDedupeKey = deriveActiveRecords(records);
  const metadata = records
    .map((record) => ({
      ...recordMetadata(record),
      active: activeByDedupeKey.get(record.attributes.dedupe_key) === record.attributes.id,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const machineIndex = {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    authority_role: "derived",
    records: metadata,
    active_by_dedupe_key: Object.fromEntries(
      [...activeByDedupeKey.entries()].sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
  return {
    metadata,
    machineIndex,
    markdownIndex: renderHumanIndex(metadata),
  };
}

function enforceSupersedes(existingRecords, candidate) {
  const sameKey = existingRecords.filter(
    (record) => record.attributes.dedupe_key === candidate.attributes.dedupe_key,
  );
  const supersedes = candidate.attributes.supersedes;
  if (!sameKey.length) {
    if (supersedes.length) {
      throw authorityError("ERR_RECORD_SUPERSEDES_INVALID", "Record supersedes does not identify an active Record with the same dedupe key");
    }
    return;
  }
  const active = activeLeaves(sameKey);
  if (active.length !== 1) {
    throw authorityError("ERR_RECORD_SUPERSEDES_CONFLICT", "Record dedupe key has multiple active facts and cannot be replaced implicitly");
  }
  if (supersedes.length !== 1 || supersedes[0] !== active[0].attributes.id) {
    throw authorityError("ERR_RECORD_SUPERSEDES_REQUIRED", "Changed fact requires explicit supersedes of the active Record");
  }
}

function deriveActiveRecords(records) {
  const groups = new Map();
  for (const record of records) {
    const key = record.attributes.dedupe_key;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const result = new Map();
  for (const [key, entries] of groups) {
    const active = activeLeaves(entries);
    if (active.length !== 1) {
      throw authorityError(
        "ERR_RECORD_SUPERSEDES_CONFLICT",
        `Record dedupe key ${key} must have exactly one active authority leaf`,
      );
    }
    result.set(key, active[0].attributes.id);
  }
  return result;
}

function activeLeaves(records) {
  const superseded = new Set(records.flatMap((record) => record.attributes.supersedes));
  return records.filter((record) => !superseded.has(record.attributes.id));
}

function validateSupersedesGraph(records, byId) {
  for (const record of records) {
    for (const targetId of record.attributes.supersedes) {
      const target = byId.get(targetId);
      if (!target || target.attributes.dedupe_key !== record.attributes.dedupe_key) {
        throw authorityError("ERR_RECORD_SUPERSEDES_INVALID", "Record supersedes must reference existing Records with the same dedupe key");
      }
    }
    assertAcyclicSupersedes(record.attributes.id, byId, new Set());
  }
}

function assertAcyclicSupersedes(recordId, byId, ancestors) {
  if (ancestors.has(recordId)) {
    throw authorityError("ERR_RECORD_SUPERSEDES_CONFLICT", "Record supersedes graph contains a cycle");
  }
  const record = byId.get(recordId);
  if (!record) return;
  const nextAncestors = new Set(ancestors).add(recordId);
  for (const targetId of record.attributes.supersedes) {
    assertAcyclicSupersedes(targetId, byId, nextAncestors);
  }
}

async function readAllRecords(root) {
  const workspaceRoot = resolve(root || ".");
  const guarded = await assertWorkspacePathAllowed(workspaceRoot, RECORDS_ROOT, { allowRoot: true });
  const files = await walkMarkdownFiles(guarded.path, workspaceRoot);
  const records = [];
  for (const absolutePath of files) {
    const source = await readFile(absolutePath, "utf8");
    const parsed = parseRecordDocument(source);
    const relativePath = relative(workspaceRoot, absolutePath).split(sep).join("/");
    const expectedPath = `${RECORDS_ROOT}/${recordScopeDirectory(parsed.attributes.scope)}/${parsed.attributes.kind}/${parsed.attributes.id}.md`;
    if (basename(relativePath) !== `${parsed.attributes.id}.md` || relativePath !== expectedPath) {
      throw authorityError("ERR_RECORD_INTEGRITY", "Record path does not match its scope, kind, and id");
    }
    records.push({ path: relativePath, attributes: parsed.attributes, body: parsed.body });
  }
  return records.sort((a, b) => a.attributes.id.localeCompare(b.attributes.id));
}

async function walkMarkdownFiles(directory, workspaceRoot) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) {
      throw authorityError("ERR_WORKSPACE_PATH_FORBIDDEN", "Record Store must not contain symbolic links");
    }
    if (entry.isDirectory()) {
      const relativePath = relative(workspaceRoot, path).split(sep).join("/");
      await assertWorkspacePathAllowed(workspaceRoot, relativePath, { allowRoot: true });
      files.push(...await walkMarkdownFiles(path, workspaceRoot));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const stats = await lstat(path);
      if (!stats.isFile() || stats.isSymbolicLink()) {
        throw authorityError("ERR_WORKSPACE_PATH_FORBIDDEN", "Record path is not a regular file");
      }
      files.push(path);
    }
  }
  return files;
}

function renderHumanIndex(records) {
  const lines = [
    "# Record Index",
    "",
    "Derived view. Individual Markdown Records remain authoritative.",
    "",
    "| Record ID | Status | Kind | Scope | Dedupe key | Supersedes |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const record of records) {
    const status = record.active ? "active" : "inactive (superseded)";
    const supersedes = record.supersedes.length ? record.supersedes.join(", ") : "-";
    lines.push(
      `| ${escapeCell(record.id)} | ${status} | ${escapeCell(record.kind)} | ${escapeCell(renderScope(record.scope))} | ${escapeCell(record.dedupe_key)} | ${escapeCell(supersedes)} |`,
    );
  }
  lines.push("", `Records: ${records.length}`, "");
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderScope(scope) {
  return `${scope?.type || "unknown"}:${scope?.ref || "unknown"}`;
}

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
