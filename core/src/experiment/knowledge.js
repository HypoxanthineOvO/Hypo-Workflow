import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import {
  commitRecordPatch,
  createRecordPatch,
  rebuildRecordIndexes,
} from "../records/index.js";
import { parseRecordDocument } from "../records/frontmatter.js";
import { recordScopeDirectory } from "../records/schema.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  containsForbiddenReasoning,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
  normalizeSha256,
  normalizeTransactionOptions,
  readCurrentManifest,
} from "../runtime/internal.js";
import {
  assertWorkspacePathAllowed,
  normalizeWorkspacePath,
} from "../workspace-store/index.js";

const FACT_TYPES = new Set(["principle", "metric", "module", "optimization"]);
const FACT_KEYS = Object.freeze([
  "project_id",
  "fact_type",
  "fact_key",
  "title",
  "aliases",
  "summary",
  "details",
  "source_refs",
  "code_refs",
  "version_ref",
  "confidence",
  "supersedes",
]);
const SOURCE_REF_KEYS = Object.freeze(["type", "ref", "version", "locator"]);
const CODE_REF_KEYS = Object.freeze(["path", "sha256", "locator"]);
const VERSION_REF_KEYS = Object.freeze(["type", "ref"]);
const KNOWLEDGE_RECORD_KIND = "decision";
const KNOWLEDGE_BODY_ROLE = "experiment_knowledge_fact";

export function createExperimentKnowledgeStore(input = {}) {
  assertPlainObject(input, "Experiment Knowledge Store options");
  assertExactKeys(input, ["clock"], "Experiment Knowledge Store options");
  if (typeof input.clock !== "function") {
    throw knowledgeError(
      "ERR_EXPERIMENT_KNOWLEDGE_SCHEMA_INVALID",
      "Experiment Knowledge Store clock must be a zero-argument function",
    );
  }
  const clock = input.clock;
  return Object.freeze({
    recordFact(root, fact, options = {}) {
      return recordFact(root, fact, options, clock);
    },
    list,
    resolve: resolveFacts,
    assessFreshness,
  });
}

async function recordFact(root, input, options, clock) {
  const fact = normalizeFact(input, "Experiment Knowledge fact");
  await readCurrentManifest(root);
  await validateCodeBindings(root, fact);
  const operation = normalizeTransactionOptions(options, "experiment-knowledge-record", {
    project_id: fact.project_id,
    fact_key: fact.fact_key,
  });
  const timestamp = readClock(clock);
  const patch = createRecordPatch({
    scope: { type: "project", ref: fact.project_id },
    kind: KNOWLEDGE_RECORD_KIND,
    source_refs: recordSourceRefs(fact),
    confidence: fact.confidence,
    dedupe_key: factDedupeKey(fact.project_id, fact.fact_key),
    created_at: timestamp,
    updated_at: timestamp,
    supersedes: fact.supersedes,
    body: renderFactBody(fact),
  });
  const committed = await commitRecordPatch(root, patch, operation);
  await rebuildRecordIndexes(root, {
    id: `${operation.id}-index`,
    faultInjector: operation.faultInjector,
  });
  const persisted = (await list(root, {
    project_id: fact.project_id,
    include_superseded: true,
  })).find((entry) => entry.record_ref.id === committed.id);
  if (!persisted) {
    throw knowledgeError(
      "ERR_EXPERIMENT_KNOWLEDGE_INTEGRITY",
      "Committed Knowledge Record cannot be resolved from project authority",
    );
  }
  return persisted;
}

async function validateCodeBindings(root, fact) {
  const digestCache = new Map();
  for (const ref of fact.code_refs) {
    const observed = await readSourceDigest(root, ref.path, digestCache);
    if (observed.status === "missing") {
      throw knowledgeError(
        "ERR_EXPERIMENT_KNOWLEDGE_SOURCE_INVALID",
        `Knowledge code source ${ref.path} is missing`,
      );
    }
    if (observed.sha256 !== ref.sha256) {
      throw knowledgeError(
        "ERR_EXPERIMENT_KNOWLEDGE_SOURCE_DIGEST_MISMATCH",
        `Knowledge code source ${ref.path} digest does not match current bytes`,
      );
    }
  }
}

async function list(root, input) {
  const request = normalizeListRequest(input);
  await readCurrentManifest(root);
  const records = await readProjectKnowledgeRecords(root, request.project_id);
  const parsedRecords = records.map((record) => ({
    record,
    fact: parseFactRecord(record, request.project_id),
  }));
  validateKnowledgeSupersedesGraph(records);
  const superseded = new Set(records.flatMap((record) => record.attributes.supersedes));
  const digestCache = new Map();
  const facts = [];
  for (const { record, fact } of parsedRecords) {
    const active = !superseded.has(record.attributes.id);
    if (!active && !request.include_superseded) continue;
    const freshness = await freshnessForFact(root, fact, digestCache);
    facts.push(projectFact(fact, record.attributes.id, active, freshness.status));
  }
  return facts.sort(compareFacts);
}

function validateKnowledgeSupersedesGraph(records) {
  const byId = new Map(records.map((record) => [record.attributes.id, record]));
  const groups = new Map();
  for (const record of records) {
    const key = record.attributes.dedupe_key;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
    for (const targetId of record.attributes.supersedes) {
      const target = byId.get(targetId);
      if (!target || target.attributes.dedupe_key !== key) {
        throw knowledgeError(
          "ERR_EXPERIMENT_KNOWLEDGE_SUPERSEDES_INVALID",
          "Knowledge supersedes must reference an existing Record with the same fact key",
        );
      }
    }
    assertAcyclicKnowledgeRecord(record.attributes.id, byId, new Set());
  }
  for (const entries of groups.values()) {
    const superseded = new Set(entries.flatMap((record) => record.attributes.supersedes));
    const active = entries.filter((record) => !superseded.has(record.attributes.id));
    if (active.length !== 1) {
      throw knowledgeError(
        "ERR_EXPERIMENT_KNOWLEDGE_SUPERSEDES_CONFLICT",
        "Knowledge fact history must have exactly one active Record",
      );
    }
  }
}

function assertAcyclicKnowledgeRecord(recordId, byId, ancestors) {
  if (ancestors.has(recordId)) {
    throw knowledgeError(
      "ERR_EXPERIMENT_KNOWLEDGE_SUPERSEDES_CONFLICT",
      "Knowledge supersedes graph contains a cycle",
    );
  }
  const record = byId.get(recordId);
  if (!record) return;
  const next = new Set(ancestors).add(recordId);
  for (const targetId of record.attributes.supersedes) {
    assertAcyclicKnowledgeRecord(targetId, byId, next);
  }
}

async function resolveFacts(root, input) {
  assertPlainObject(input, "Experiment Knowledge resolve request");
  assertExactKeys(input, ["project_id", "query"], "Experiment Knowledge resolve request");
  const projectId = normalizeSafeIdentifier(input.project_id, "Experiment Knowledge resolve request.project_id");
  const query = normalizeText(input.query, "Experiment Knowledge resolve request.query");
  const facts = await list(root, { project_id: projectId });
  const scored = facts
    .map((fact) => ({ fact, score: queryScore(query, fact) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || compareFacts(left.fact, right.fact));
  return {
    project_id: projectId,
    matches: scored.map(({ fact }) => fact),
  };
}

async function assessFreshness(root, input) {
  assertPlainObject(input, "Experiment Knowledge freshness request");
  assertExactKeys(input, ["project_id"], "Experiment Knowledge freshness request");
  const projectId = normalizeSafeIdentifier(input.project_id, "Experiment Knowledge freshness request.project_id");
  const facts = await list(root, { project_id: projectId });
  const digestCache = new Map();
  const staleRefs = [];
  for (const fact of facts) {
    const result = await freshnessForFact(root, fact, digestCache);
    staleRefs.push(...result.stale_refs);
  }
  return {
    project_id: projectId,
    status: staleRefs.length ? "stale" : "fresh",
    stale_refs: staleRefs.sort(compareStaleRefs),
  };
}

function normalizeFact(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, FACT_KEYS, field);
  assertNoRawSecrets(input, field);
  if (containsForbiddenReasoning(input)) {
    throw knowledgeError(
      "ERR_HIDDEN_REASONING_FORBIDDEN",
      `${field} contains forbidden hidden reasoning fields`,
    );
  }
  const factType = normalizeSafeIdentifier(input.fact_type, `${field}.fact_type`);
  if (!FACT_TYPES.has(factType)) {
    throw knowledgeError(
      "ERR_EXPERIMENT_KNOWLEDGE_SCHEMA_INVALID",
      `${field}.fact_type must be principle, metric, module, or optimization`,
    );
  }
  const factKey = normalizeSafeIdentifier(input.fact_key, `${field}.fact_key`);
  if (!factKey.startsWith(`${factType}.`)) {
    throw knowledgeError(
      "ERR_EXPERIMENT_KNOWLEDGE_SCHEMA_INVALID",
      `${field}.fact_key must be namespaced by fact_type`,
    );
  }
  const aliases = normalizeStringArray(input.aliases, `${field}.aliases`);
  const sourceRefs = normalizeNonEmptyArray(input.source_refs, `${field}.source_refs`, normalizeSourceRef);
  const codeRefs = normalizeArray(input.code_refs, `${field}.code_refs`, normalizeCodeRef);
  const supersedes = normalizeArray(input.supersedes, `${field}.supersedes`, (value, nestedField) => (
    normalizeSafeIdentifier(value, nestedField)
  ));
  if (new Set(supersedes).size !== supersedes.length) {
    throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_SCHEMA_INVALID", `${field}.supersedes contains duplicates`);
  }
  return {
    project_id: normalizeSafeIdentifier(input.project_id, `${field}.project_id`),
    fact_type: factType,
    fact_key: factKey,
    title: normalizeText(input.title, `${field}.title`),
    aliases,
    summary: normalizeText(input.summary, `${field}.summary`),
    details: normalizeDetails(input.details, `${field}.details`),
    source_refs: sourceRefs,
    code_refs: codeRefs,
    version_ref: normalizeVersionRef(input.version_ref, `${field}.version_ref`),
    confidence: normalizeConfidence(input.confidence, `${field}.confidence`),
    supersedes,
  };
}

function normalizeSourceRef(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, SOURCE_REF_KEYS, field);
  return {
    type: normalizeSafeIdentifier(input.type, `${field}.type`),
    ref: normalizeLogicalRef(input.ref, `${field}.ref`),
    version: normalizeText(input.version, `${field}.version`),
    locator: normalizeText(input.locator, `${field}.locator`),
  };
}

function normalizeCodeRef(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, CODE_REF_KEYS, field);
  return {
    path: normalizeKnowledgePath(input.path, `${field}.path`),
    sha256: normalizeSha256(input.sha256, `${field}.sha256`),
    locator: normalizeText(input.locator, `${field}.locator`),
  };
}

function normalizeVersionRef(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, VERSION_REF_KEYS, field);
  return {
    type: normalizeSafeIdentifier(input.type, `${field}.type`),
    ref: normalizeLogicalRef(input.ref, `${field}.ref`),
  };
}

function normalizeListRequest(input) {
  assertPlainObject(input, "Experiment Knowledge list request");
  assertExactKeys(input, ["project_id", "include_superseded"], "Experiment Knowledge list request");
  if (Object.hasOwn(input, "include_superseded") && typeof input.include_superseded !== "boolean") {
    throw knowledgeError(
      "ERR_EXPERIMENT_KNOWLEDGE_SCHEMA_INVALID",
      "Experiment Knowledge list request.include_superseded must be boolean",
    );
  }
  return {
    project_id: normalizeSafeIdentifier(input.project_id, "Experiment Knowledge list request.project_id"),
    include_superseded: input.include_superseded === true,
  };
}

async function readProjectKnowledgeRecords(root, projectId) {
  const scope = { type: "project", ref: projectId };
  const directory = `.pipeline/memory/records/${recordScopeDirectory(scope)}/${KNOWLEDGE_RECORD_KIND}`;
  const guarded = await assertWorkspacePathAllowed(resolve(root || "."), directory, { allowRoot: true });
  let entries;
  try {
    entries = await readdir(guarded.path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return [];
    throw error;
  }
  const records = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isSymbolicLink()) {
      throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_INTEGRITY", "Knowledge Record directory contains a symlink");
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const absolutePath = resolve(guarded.path, entry.name);
    const record = parseRecordDocument(await readFile(absolutePath, "utf8"));
    const expectedPath = `${directory}/${record.attributes.id}.md`;
    const relativePath = relative(resolve(root || "."), absolutePath).split(sep).join("/");
    if (relativePath !== expectedPath) {
      throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_INTEGRITY", "Knowledge Record path does not match its id");
    }
    if (
      record.attributes.scope.type !== "project"
      || record.attributes.scope.ref !== projectId
      || record.attributes.kind !== KNOWLEDGE_RECORD_KIND
      || !record.attributes.dedupe_key.startsWith(factDedupePrefix(projectId))
    ) {
      continue;
    }
    records.push({ ...record, path: relativePath });
  }
  return records;
}

function parseFactRecord(record, projectId) {
  let document;
  try {
    document = JSON.parse(record.body);
  } catch {
    throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_INTEGRITY", "Knowledge Record body is not valid JSON");
  }
  assertPlainObject(document, "Knowledge Record body");
  assertExactKeys(document, ["schema_version", "authority_role", "fact"], "Knowledge Record body");
  if (document.schema_version !== "1" || document.authority_role !== KNOWLEDGE_BODY_ROLE) {
    throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_INTEGRITY", "Knowledge Record body role or version is invalid");
  }
  const fact = normalizeFact(document.fact, "Knowledge Record fact");
  if (
    fact.project_id !== projectId
    || record.attributes.dedupe_key !== factDedupeKey(projectId, fact.fact_key)
    || record.attributes.confidence !== fact.confidence
    || JSON.stringify(record.attributes.supersedes) !== JSON.stringify(fact.supersedes)
    || JSON.stringify(record.attributes.source_refs) !== JSON.stringify(recordSourceRefs(fact))
  ) {
    throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_INTEGRITY", "Knowledge Record metadata does not match its fact");
  }
  return fact;
}

function recordSourceRefs(fact) {
  const refs = [
    ...fact.source_refs.map((source) => ({
      type: source.type,
      ref: source.ref,
      locator: source.locator,
    })),
    ...fact.code_refs.map((source) => ({
      type: "code",
      ref: source.path,
      locator: source.locator,
    })),
  ];
  if (!refs.length) {
    throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_SCHEMA_INVALID", "Knowledge fact requires provenance");
  }
  return refs;
}

function renderFactBody(fact) {
  return JSON.stringify({
    schema_version: "1",
    authority_role: KNOWLEDGE_BODY_ROLE,
    fact,
  }, null, 2);
}

async function freshnessForFact(root, fact, digestCache) {
  const staleRefs = [];
  for (const ref of fact.code_refs) {
    const observed = await readSourceDigest(root, ref.path, digestCache);
    if (observed.status === "missing") {
      staleRefs.push({
        fact_key: fact.fact_key,
        path: ref.path,
        locator: ref.locator,
        reason: "missing",
        expected_sha256: ref.sha256,
      });
    } else if (observed.sha256 !== ref.sha256) {
      staleRefs.push({
        fact_key: fact.fact_key,
        path: ref.path,
        locator: ref.locator,
        reason: "digest_mismatch",
        expected_sha256: ref.sha256,
        actual_sha256: observed.sha256,
      });
    }
  }
  return { status: staleRefs.length ? "stale" : "fresh", stale_refs: staleRefs };
}

async function readSourceDigest(root, path, cache) {
  if (cache.has(path)) return cache.get(path);
  let result;
  try {
    const firstComponent = path.split("/")[0];
    const guarded = await assertWorkspacePathAllowed(resolve(root || "."), path, {
      allowedRoots: [firstComponent],
      allowRoot: true,
    });
    const stats = await lstat(guarded.path);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_SOURCE_INVALID", `Knowledge code path ${path} is not a regular file`);
    }
    result = { status: "present", sha256: sha256(await readFile(guarded.path)) };
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") result = { status: "missing" };
    else throw error;
  }
  cache.set(path, result);
  return result;
}

function projectFact(fact, recordId, active, freshness) {
  return {
    ...clone(fact),
    record_ref: { kind: "record", id: recordId },
    active,
    freshness,
  };
}

function queryScore(queryInput, fact) {
  const query = searchable(queryInput);
  const fields = [fact.fact_key, fact.title, fact.summary, ...fact.aliases].map(searchable);
  let score = 0;
  for (const [index, field] of fields.entries()) {
    if (!field) continue;
    if (field === query) score += index === 0 ? 140 : 120;
    if (query.includes(field)) score += 70 + Math.min(field.length, 30);
    if (field.includes(query)) score += 55;
  }
  const queryTokens = searchTokens(query);
  const factTokens = new Set(searchTokens([
    fact.fact_key,
    fact.title,
    fact.summary,
    ...fact.aliases,
    JSON.stringify(fact.details),
  ].join(" ")));
  for (const token of queryTokens) {
    if (factTokens.has(token)) score += token.length > 1 ? 10 : 2;
  }
  return score;
}

function searchTokens(value) {
  return searchable(value).match(/[\p{L}\p{N}._+-]+/gu) || [];
}

function searchable(value) {
  return String(value || "").normalize("NFKC").toLocaleLowerCase();
}

function normalizeKnowledgePath(value, field) {
  let path;
  try {
    path = normalizeWorkspacePath(value);
  } catch {
    throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_PATH_INVALID", `${field} is unsafe`);
  }
  if (
    path === ".git"
    || path.startsWith(".git/")
    || path === ".pipeline"
    || path.startsWith(".pipeline/")
  ) {
    throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_PATH_INVALID", `${field} targets private authority storage`);
  }
  return path;
}

function normalizeLogicalRef(value, field) {
  const ref = normalizeText(value, field);
  if (
    ref.startsWith("/")
    || /^[A-Za-z]:[\\/]/.test(ref)
    || ref.includes("\\")
    || ref.split("/").some((part) => part === "." || part === "..")
  ) {
    throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_SOURCE_INVALID", `${field} is unsafe`);
  }
  return ref;
}

function normalizeDetails(value, field) {
  assertPlainObject(value, field);
  return normalizeCanonicalValue(value, field);
}

function normalizeConfidence(value, field) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1) return value;
  if (["low", "medium", "high", "confirmed"].includes(value)) return value;
  throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_SCHEMA_INVALID", `${field} is invalid`);
}

function normalizeStringArray(value, field) {
  const normalized = normalizeArray(value, field, (entry, nestedField) => normalizeText(entry, nestedField));
  if (new Set(normalized).size !== normalized.length) {
    throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_SCHEMA_INVALID", `${field} contains duplicates`);
  }
  return normalized;
}

function normalizeArray(value, field, normalizer) {
  if (!Array.isArray(value)) {
    throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_SCHEMA_INVALID", `${field} must be an array`);
  }
  return value.map((entry, index) => normalizer(entry, `${field}[${index}]`));
}

function normalizeNonEmptyArray(value, field, normalizer) {
  const normalized = normalizeArray(value, field, normalizer);
  if (!normalized.length) {
    throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_SCHEMA_INVALID", `${field} must be non-empty`);
  }
  return normalized;
}

function normalizeText(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 4096 || /[\0\r\n]/.test(value)) {
    throw knowledgeError("ERR_EXPERIMENT_KNOWLEDGE_SCHEMA_INVALID", `${field} must be non-empty single-line text`);
  }
  return value;
}

function factDedupePrefix(projectId) {
  return `experiment.knowledge.${projectId}.`;
}

function factDedupeKey(projectId, factKey) {
  return `${factDedupePrefix(projectId)}${factKey}`;
}

function compareFacts(left, right) {
  return left.fact_key.localeCompare(right.fact_key)
    || left.record_ref.id.localeCompare(right.record_ref.id);
}

function compareStaleRefs(left, right) {
  return left.fact_key.localeCompare(right.fact_key)
    || left.path.localeCompare(right.path)
    || left.locator.localeCompare(right.locator);
}

function readClock(clock) {
  const value = clock();
  const rendered = value instanceof Date ? value.toISOString() : String(value || "");
  if (!Number.isFinite(Date.parse(rendered)) || !/(?:Z|[+-]\d{2}:\d{2})$/.test(rendered)) {
    throw knowledgeError(
      "ERR_EXPERIMENT_KNOWLEDGE_SCHEMA_INVALID",
      "Experiment Knowledge Store clock must return a timezone-bearing timestamp",
    );
  }
  return rendered;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function clone(value) {
  return structuredClone(value);
}

function knowledgeError(code, message) {
  return authorityError(code, message);
}
