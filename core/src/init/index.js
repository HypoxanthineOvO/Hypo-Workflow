import { lstat, mkdir, readFile, readdir, realpath } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { createWorkspaceManifest } from "../manifest/index.js";
import { inspectLegacyWorkspace } from "../migration/legacy-inspector.js";
import { renderRecordDocument } from "../records/frontmatter.js";
import {
  buildPersistedRecord,
  recordMetadata,
  recordScopeDirectory,
} from "../records/schema.js";
import { normalizePersistedCapsule } from "../recovery/capsule.js";
import { emptyCursor } from "../recovery/shared.js";
import {
  AUTHORITY_SCHEMA_VERSION,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  containsForbiddenReasoning,
  normalizeSafeIdentifier,
  readCurrentManifest,
} from "../runtime/internal.js";
import { canonicalHash, stringifyYaml } from "../serialization/index.js";
import { detectWorkspaceFormat } from "../workspace-format/index.js";
import { commitWorkspaceTransaction } from "../workspace-store/index.js";

const REQUEST_KEYS = Object.freeze(["intent", "project_id", "workspace_id"]);
const OPTION_KEYS = Object.freeze(["id", "faultInjector"]);
const BROWNFIELD_ROOT_FILES = Object.freeze([
  "package.json",
  "README.md",
  "README",
  "readme.md",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
]);
const BROWNFIELD_SOURCE_ROOTS = Object.freeze(["src", "app", "lib", "test", "tests"]);
const SKIPPED_SCAN_DIRECTORIES = new Set([
  ".git",
  ".pipeline",
  ".venv",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
]);
const MAX_SCAN_FILES = 12;
const MAX_SCAN_DEPTH = 4;
const MAX_PACKAGE_BYTES = 256 * 1024;
const HIDDEN_METADATA_LABELS = new Set([
  "chain_of_thought",
  "hidden_reasoning",
  "private_reasoning",
  "scratchpad",
]);
const SENSITIVE_ASSIGNMENT = /\b(?:access[_-]?key|api[_-]?key|authorization|client[_-]?secret|credential|password|passwd|private[_-]?key|secret|session[_-]?token|token)\s*[:=]\s*(?:Basic\s+|Bearer\s+)?[^\s,;&\r\n]{8,}/i;
const SENSITIVE_IDENTIFIER = /(?:^|[._\s-])(?:api[._\s-]?key|credential|password|passwd|secret|session[._\s-]?token|token)[._\s-](?:key|seed|value)[._\s-][A-Za-z0-9]{8,}(?:[._\s-]|$)/i;

export async function initializeWorkspace(root, request = {}, options = {}) {
  const normalized = normalizeInitializeInput(request, options);
  const workspaceRoot = resolve(root || ".");
  await assertSafePipelineEntry(workspaceRoot);
  const detected = await detectWorkspaceFormat(workspaceRoot);

  if (detected.kind === "damaged_current") throw damagedWorkspaceError();
  if (detected.kind === "current") {
    return {
      status: "already_initialized",
      classification: detected.kind,
      manifest: await readCurrentManifest(workspaceRoot),
    };
  }
  if (detected.kind === "mixed_current_with_legacy_residue") {
    return {
      status: "already_initialized_with_legacy_residue",
      classification: detected.kind,
      manifest: await readCurrentManifest(workspaceRoot),
    };
  }
  if (detected.kind === "legacy") {
    return {
      status: "legacy_detected",
      classification: detected.kind,
      inspection: await inspectLegacyWorkspace(workspaceRoot),
    };
  }
  if (normalized.intent === null) {
    return {
      status: "needs_input",
      classification: detected.kind,
      ask: {
        kind: "question",
        id: "init_outcome",
        prompt: "What outcome should this project achieve?",
        required: true,
      },
    };
  }

  if (detected.kind === "empty") await ensureInitializationRoot(workspaceRoot);

  const adoption = detected.kind === "unmanaged_brownfield"
    ? await inspectBrownfieldRepository(workspaceRoot)
    : { facts: [], packageName: null };
  const projectId = deriveProjectId(workspaceRoot, normalized.projectId, adoption.packageName);
  const workspaceId = normalized.workspaceId ?? normalizeDerivedIdentifier(`${projectId}-workspace`, "workspace_id");
  assertSensitiveTextSafe(projectId, "project_id");
  assertSensitiveTextSafe(workspaceId, "workspace_id");

  const createdAt = new Date().toISOString();
  const manifest = createWorkspaceManifest({
    project_id: projectId,
    workspace_id: workspaceId,
    created_at: createdAt,
  });
  const bootstrapId = `bootstrap-${canonicalHash({
    project_id: projectId,
    workspace_id: workspaceId,
    intent: normalized.intent,
  }).slice(0, 24)}`;
  const objectRef = { kind: "bootstrap_job", id: bootstrapId };
  const compiled = compileInitialWorkspace({
    classification: detected.kind,
    manifest,
    objectRef,
    intent: normalized.intent,
    facts: adoption.facts,
    createdAt,
  });
  const transactionId = normalized.id ?? `init-${canonicalHash({
    manifest,
    writes: compiled.writes.map((entry) => ({ path: entry.path, hash: canonicalHash(entry.content) })),
  }).slice(0, 24)}`;

  await commitWorkspaceTransaction(workspaceRoot, {
    id: transactionId,
    faultInjector: normalized.faultInjector,
    manifest,
    writes: compiled.writes,
  });

  return {
    status: "initialized",
    classification: detected.kind,
    manifest,
    bootstrap: {
      object_ref: objectRef,
      runtime_path: compiled.runtimePath,
      continuation_path: compiled.continuationPath,
      capsule_path: compiled.capsulePath,
    },
    records: compiled.records,
    adoption_brief: {
      record_id: compiled.adoptionRecord.id,
      facts: adoption.facts,
    },
    initial_snapshot: null,
  };
}

async function assertSafePipelineEntry(root) {
  let stats;
  try {
    stats = await lstat(join(root, ".pipeline"));
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return;
    throw error;
  }
  if (stats.isSymbolicLink()) {
    throw authorityError("ERR_INIT_WORKSPACE_PATH_FORBIDDEN", "Init workspace path forbidden: .pipeline symlink is not allowed");
  }
  if (!stats.isDirectory()) {
    throw authorityError("ERR_INIT_WORKSPACE_PATH_FORBIDDEN", "Init workspace path forbidden: .pipeline must be a directory");
  }
}

async function ensureInitializationRoot(root) {
  let stats;
  try {
    stats = await lstat(root);
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
    await mkdir(root, { recursive: true });
    stats = await lstat(root);
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw authorityError("ERR_INIT_SCAN_FORBIDDEN", "Init root must be a regular directory");
  }
}

function normalizeInitializeInput(request, options) {
  assertPlainObject(request, "Init request");
  assertPlainObject(options, "Init options");
  assertSupportedInitFields(request, REQUEST_KEYS, "Init request");
  assertSupportedInitFields(options, OPTION_KEYS, "Init options");
  if (containsForbiddenReasoning(request) || containsForbiddenReasoning(options)) {
    throw authorityError("ERR_HIDDEN_REASONING_FORBIDDEN", "Init input must not contain hidden reasoning fields");
  }
  assertNoRawSecrets(request, "Init request");
  assertNoRawSecrets(options.id, "Init options.id");

  const intent = normalizeIntent(request.intent);
  const projectId = request.project_id === undefined
    ? null
    : normalizeInitIdentifier(request.project_id, "project_id");
  const workspaceId = request.workspace_id === undefined
    ? null
    : normalizeInitIdentifier(request.workspace_id, "workspace_id");
  const id = options.id === undefined
    ? null
    : normalizeInitIdentifier(options.id, "Init options.id");
  if (options.faultInjector !== undefined && typeof options.faultInjector !== "function") {
    throw authorityError("ERR_INIT_REQUEST_INVALID", "Init options.faultInjector must be a function");
  }
  return { intent, projectId, workspaceId, id, faultInjector: options.faultInjector };
}

function assertSupportedInitFields(value, allowedFields, label) {
  const allowed = new Set(allowedFields);
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string" || !allowed.has(key))) {
    throw authorityError("ERR_INIT_REQUEST_INVALID", `${label} contains unsupported fields`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (keys.some((key) => !descriptors[key].enumerable || !Object.hasOwn(descriptors[key], "value"))) {
    throw authorityError("ERR_INIT_REQUEST_INVALID", `${label} fields must be plain data`);
  }
}

function normalizeIntent(value) {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) return null;
  if (typeof value !== "string" || value !== value.trim() || value.length > 16_384 || /[\0\r]/.test(value)) {
    throw authorityError("ERR_INIT_REQUEST_INVALID", "Init intent must be concise non-empty text");
  }
  assertSensitiveTextSafe(value, "intent");
  return value.replace(/\r\n?/g, "\n");
}

function normalizeInitIdentifier(value, field) {
  const normalized = normalizeSafeIdentifier(value, field);
  if (normalized.length > 128) {
    throw authorityError("ERR_INIT_REQUEST_INVALID", `${field} must not exceed 128 characters`);
  }
  assertSensitiveTextSafe(normalized, field);
  return normalized;
}

function assertSensitiveTextSafe(value, field) {
  if (typeof value !== "string") return;
  assertNoRawSecrets(value, field);
  if (SENSITIVE_ASSIGNMENT.test(value) || SENSITIVE_IDENTIFIER.test(value)) {
    throw authorityError("ERR_RAW_SECRET_FORBIDDEN", "Init input contains a secret-like value");
  }
}

function deriveProjectId(root, explicitId, packageName) {
  if (explicitId) return explicitId;
  const candidates = [packageName, basename(root)];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate) assertMetadataSurfaceLabelSafe(candidate);
    const normalized = sanitizeDerivedIdentifier(candidate);
    if (normalized) return normalizeDerivedIdentifier(normalized, "project_id");
  }
  return `project-${canonicalHash("hypo-workflow-init").slice(0, 12)}`;
}

function sanitizeDerivedIdentifier(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value
    .trim()
    .replace(/^@/, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/-+$/g, "")
    .slice(0, 96);
  return normalized || null;
}

function normalizeDerivedIdentifier(value, field) {
  return normalizeInitIdentifier(value, field);
}

function compileInitialWorkspace({ classification, manifest, objectRef, intent, facts, createdAt }) {
  const storedRef = { kind: objectRef.kind, id: objectRef.id };
  const runtimePath = `.pipeline/runtime/objects/${objectRef.kind}/${objectRef.id}/runtime.yaml`;
  const continuationPath = `.pipeline/runtime/objects/${objectRef.kind}/${objectRef.id}/continuation.yaml`;
  const capsulePath = `.pipeline/memory/capsules/${objectRef.kind}/${objectRef.id}.yaml`;
  const runtime = {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    object_ref: storedRef,
    status: "initialized",
  };
  const continuation = {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    object_ref: storedRef,
    next_action: "Use /hw:guide to choose the next available workflow.",
  };
  const requestSource = { type: "user_request", ref: "init", locator: "request.intent" };
  const projectScope = { type: "project", ref: `project:${manifest.project_id}` };
  const intentRecord = buildPersistedRecord({
    scope: projectScope,
    kind: "requirement",
    source_refs: [requestSource],
    confidence: "confirmed",
    dedupe_key: "project_intent",
    created_at: createdAt,
    updated_at: createdAt,
    supersedes: [],
    body: `# Project Intent\n\n${intent}`,
  });
  const adoptionSources = uniqueSourceRefs(facts.flatMap((fact) => fact.source_refs));
  const adoptionRecord = buildPersistedRecord({
    scope: projectScope,
    kind: "decision",
    source_refs: adoptionSources.length ? adoptionSources : [requestSource],
    confidence: facts.some((fact) => fact.basis === "inferred") ? "medium" : "high",
    dedupe_key: "adoption_brief",
    created_at: createdAt,
    updated_at: createdAt,
    supersedes: [],
    body: renderAdoptionBrief(classification, facts),
  });
  const persistedRecords = [intentRecord, adoptionRecord].map((record) => {
    const path = `.pipeline/memory/records/${recordScopeDirectory(record.attributes.scope)}/${record.attributes.kind}/${record.id}.md`;
    return { ...record, path };
  });
  const metadata = persistedRecords
    .map((record) => ({ ...recordMetadata(record), active: true }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const machineIndex = {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    authority_role: "derived",
    records: metadata,
    active_by_dedupe_key: Object.fromEntries(
      metadata.map((record) => [record.dedupe_key, record.id]).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
  const capsuleDurable = {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    authority_role: "derived",
    object_ref: storedRef,
    cursor: emptyCursor(storedRef),
    sources: {
      records: metadata.map((record) => ({
        type: "record",
        id: record.id,
        semantic_hash: record.semantic_hash,
      })),
      continuation: {
        type: "continuation",
        object_ref: storedRef,
        semantic_hash: canonicalHash(continuation),
      },
      receipts: [],
    },
    context: {
      current_goal: null,
      scope: [],
      non_goals: [],
      next_action: continuation.next_action,
      recent_verification: null,
      workers: [],
      recent_events: [],
    },
  };
  const capsule = normalizePersistedCapsule(
    { ...capsuleDurable, semantic_hash: canonicalHash(capsuleDurable) },
    storedRef,
  );
  const writes = [
    { path: runtimePath, content: renderYaml(runtime) },
    { path: continuationPath, content: renderYaml(continuation) },
    {
      path: ".pipeline/runtime/active.yaml",
      content: renderYaml({
        schema_version: AUTHORITY_SCHEMA_VERSION,
        active: { bootstrap_job: storedRef },
      }),
    },
    ...persistedRecords.map((record) => ({
      path: record.path,
      content: renderRecordDocument(record.attributes, record.body),
    })),
    { path: ".pipeline/memory/index.yaml", content: renderYaml(machineIndex) },
    { path: ".pipeline/memory/INDEX.md", content: renderRecordIndex(metadata) },
    { path: capsulePath, content: renderYaml(capsule) },
  ];
  return {
    writes,
    runtimePath,
    continuationPath,
    capsulePath,
    adoptionRecord,
    records: persistedRecords.map((record) => ({
      id: record.id,
      kind: record.attributes.kind,
      path: record.path,
    })),
  };
}

async function inspectBrownfieldRepository(root) {
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw authorityError("ERR_INIT_SCAN_FORBIDDEN", "Init root must be a regular directory");
  }
  const rootReal = await realpath(root);
  const files = [];
  for (const path of BROWNFIELD_ROOT_FILES) {
    const inspected = await inspectOptionalPath(root, rootReal, path);
    if (inspected?.kind === "file") files.push(path);
  }
  for (const directory of BROWNFIELD_SOURCE_ROOTS) {
    await collectSafeFiles(root, rootReal, directory, 0, files);
    if (files.length >= MAX_SCAN_FILES + BROWNFIELD_ROOT_FILES.length) break;
  }
  const uniqueFiles = [...new Set(files)].sort();
  const factFiles = uniqueFiles.slice(0, MAX_SCAN_FILES);
  factFiles.forEach(assertRepositoryMetadataPathSafe);
  const packageMetadata = uniqueFiles.includes("package.json")
    ? await readPackageMetadata(root, rootReal)
    : { packageName: null, facts: [] };
  const observedFileFacts = factFiles.map((path) => ({
    statement: `Repository file \`${path}\` exists.`,
    basis: "observed",
    confidence: 1,
    source_refs: [repositorySourceRef(path)],
  }));
  const facts = [...observedFileFacts, ...packageMetadata.facts];
  if (factFiles.length) {
    facts.push({
      statement: "Existing repository evidence indicates brownfield adoption rather than an empty project.",
      basis: "inferred",
      confidence: 0.9,
      source_refs: factFiles.slice(0, 4).map(repositorySourceRef),
    });
  }
  return { facts, packageName: packageMetadata.packageName };
}

async function collectSafeFiles(root, rootReal, relativePath, depth, files) {
  if (depth > MAX_SCAN_DEPTH || files.length >= MAX_SCAN_FILES + BROWNFIELD_ROOT_FILES.length) return;
  const inspected = await inspectOptionalPath(root, rootReal, relativePath);
  if (!inspected) return;
  if (inspected.kind === "file") {
    files.push(relativePath);
    return;
  }
  const entries = await readdir(inspected.absolutePath, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = `${relativePath}/${entry.name}`;
    assertRepositoryMetadataPathSafe(child);
    if (SKIPPED_SCAN_DIRECTORIES.has(entry.name)) continue;
    if (entry.isSymbolicLink()) {
      throw authorityError("ERR_INIT_SCAN_FORBIDDEN", "Brownfield evidence must not use symbolic links");
    }
    if (entry.isDirectory()) await collectSafeFiles(root, rootReal, child, depth + 1, files);
    else if (entry.isFile()) files.push(child);
    if (files.length >= MAX_SCAN_FILES + BROWNFIELD_ROOT_FILES.length) return;
  }
}

async function inspectOptionalPath(root, rootReal, relativePath) {
  assertRepositoryMetadataPathSafe(relativePath);
  const absolutePath = resolve(root, relativePath);
  const rel = relative(root, absolutePath);
  if (!rel || rel === ".." || rel.startsWith("../")) {
    throw authorityError("ERR_INIT_SCAN_FORBIDDEN", "Brownfield evidence path escapes the repository");
  }
  let stats;
  try {
    stats = await lstat(absolutePath);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }
  if (stats.isSymbolicLink()) {
    throw authorityError("ERR_INIT_SCAN_FORBIDDEN", "Brownfield evidence must not use symbolic links");
  }
  const targetReal = await realpath(absolutePath);
  const realRel = relative(rootReal, targetReal);
  if (realRel === ".." || realRel.startsWith("../")) {
    throw authorityError("ERR_INIT_SCAN_FORBIDDEN", "Brownfield evidence resolves outside the repository");
  }
  if (stats.isFile()) return { kind: "file", absolutePath, stats };
  if (stats.isDirectory()) return { kind: "directory", absolutePath, stats };
  throw authorityError("ERR_INIT_SCAN_FORBIDDEN", "Brownfield evidence must be a regular file or directory");
}

async function readPackageMetadata(root, rootReal) {
  const inspected = await inspectOptionalPath(root, rootReal, "package.json");
  if (!inspected || inspected.kind !== "file" || inspected.stats.size > MAX_PACKAGE_BYTES) {
    return { packageName: null, facts: [] };
  }
  let parsed;
  try {
    parsed = JSON.parse(await readFile(inspected.absolutePath, "utf8"));
  } catch {
    return { packageName: null, facts: [] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { packageName: null, facts: [] };
  }
  assertPackageMetadataKeysSafe(parsed);
  const facts = [];
  const packageName = typeof parsed.name === "string"
    && parsed.name === parsed.name.trim()
    && parsed.name.length > 0
    && parsed.name.length <= 214
    && !/[\0\r\n]/.test(parsed.name)
    ? parsed.name
    : null;
  if (packageName !== null) {
    assertMetadataSurfaceLabelSafe(packageName);
    assertSensitiveTextSafe(packageName, "package name");
    facts.push(packageFact(`package.json declares the package name \`${escapeInlineCode(packageName)}\`.`));
  }
  const scripts = safePackageKeys(parsed.scripts);
  if (scripts.length) facts.push(packageFact(`package.json declares script keys: ${scripts.map((name) => `\`${escapeInlineCode(name)}\``).join(", ")}.`));
  const dependencies = safePackageKeys({
    ...(isMapping(parsed.dependencies) ? parsed.dependencies : {}),
    ...(isMapping(parsed.devDependencies) ? parsed.devDependencies : {}),
  });
  if (dependencies.length) facts.push(packageFact(`package.json declares dependency keys: ${dependencies.map((name) => `\`${escapeInlineCode(name)}\``).join(", ")}.`));
  return { packageName, facts };
}

function packageFact(statement) {
  return {
    statement,
    basis: "observed",
    confidence: 1,
    source_refs: [repositorySourceRef("package.json")],
  };
}

function safePackageKeys(value) {
  if (!isMapping(value)) return [];
  return Object.keys(value)
    .filter((key) => key && key.length <= 128 && !/[\0\r\n]/.test(key))
    .sort()
    .slice(0, 12);
}

function assertPackageMetadataKeysSafe(value, seen = new Set()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) {
    throw authorityError("ERR_INIT_SCAN_FORBIDDEN", "Brownfield package metadata is not safely traversable");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) assertPackageMetadataKeysSafe(entry, seen);
  } else {
    for (const [key, nested] of Object.entries(value)) {
      assertMetadataLabelSafe(key, { fileComponent: false });
      assertPackageMetadataKeysSafe(nested, seen);
    }
  }
  seen.delete(value);
}

function assertRepositoryMetadataPathSafe(path) {
  if (
    typeof path !== "string"
    || !path
    || path.startsWith("/")
    || path.includes("\\")
    || /[\0\r\n]/.test(path)
  ) {
    throw authorityError("ERR_INIT_SCAN_FORBIDDEN", "Brownfield metadata path is forbidden");
  }
  const components = path.split("/");
  if (components.some((component) => !component || component === "." || component === "..")) {
    throw authorityError("ERR_INIT_SCAN_FORBIDDEN", "Brownfield metadata path is forbidden");
  }
  for (const component of components) assertMetadataLabelSafe(component, { fileComponent: true });
}

function assertMetadataSurfaceLabelSafe(value) {
  const components = String(value).split(/[/@]+/).filter(Boolean);
  for (const component of components) assertMetadataLabelSafe(component, { fileComponent: false });
}

function assertMetadataLabelSafe(value, { fileComponent }) {
  if (typeof value !== "string" || !value || value.length > 256 || /[\0\r\n]/.test(value)) {
    throw authorityError("ERR_INIT_SCAN_FORBIDDEN", "Brownfield metadata label is forbidden");
  }
  if (SENSITIVE_IDENTIFIER.test(value)) {
    throw authorityError("ERR_RAW_SECRET_FORBIDDEN", "Brownfield metadata contains a secret-like label");
  }
  const candidates = [value];
  if (fileComponent) {
    let stem = value;
    while (stem.includes(".")) {
      stem = stem.slice(0, stem.lastIndexOf("."));
      candidates.push(stem);
    }
  }
  for (const candidate of candidates) {
    const normalized = normalizeMetadataLabel(candidate);
    if (containsHiddenMetadataLabel(normalized)) {
      throw authorityError("ERR_HIDDEN_REASONING_FORBIDDEN", "Brownfield metadata contains a hidden-context label");
    }
  }
}

function containsHiddenMetadataLabel(normalized) {
  for (const label of HIDDEN_METADATA_LABELS) {
    if (
      normalized === label
      || normalized.startsWith(`${label}_`)
      || normalized.endsWith(`_${label}`)
      || normalized.includes(`_${label}_`)
    ) return true;
  }
  return false;
}

function normalizeMetadataLabel(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isMapping(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function escapeInlineCode(value) {
  return String(value).replace(/`/g, "\\`");
}

function repositorySourceRef(path) {
  assertRepositoryMetadataPathSafe(path);
  return { type: "repository_file", ref: path, locator: path };
}

function uniqueSourceRefs(refs) {
  const unique = new Map();
  for (const ref of refs) unique.set(`${ref.type}\0${ref.ref}\0${ref.locator}`, ref);
  return [...unique.values()].sort((left, right) => left.locator.localeCompare(right.locator));
}

function renderAdoptionBrief(classification, facts) {
  const lines = [
    "# Adoption Brief",
    "",
    `Classification: \`${classification}\``,
    "",
    "## Facts",
    "",
  ];
  if (!facts.length) lines.push("- No pre-existing repository evidence was available.");
  for (const fact of facts) {
    const sources = fact.source_refs.map((source) => `\`${source.locator}\``).join(", ");
    lines.push(`- [${fact.basis}; confidence ${fact.confidence}] ${fact.statement} Sources: ${sources}`);
  }
  return lines.join("\n");
}

function renderRecordIndex(records) {
  const lines = [
    "# Record Index",
    "",
    "Derived view. Individual Markdown Records remain authoritative.",
    "",
    "| Record ID | Status | Kind | Scope | Dedupe key | Supersedes |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const record of records) {
    const supersedes = record.supersedes.length ? record.supersedes.join(", ") : "-";
    lines.push(`| ${record.id} | active | ${record.kind} | ${record.scope.type}:${record.scope.ref} | ${record.dedupe_key} | ${supersedes} |`);
  }
  lines.push("", `Records: ${records.length}`, "");
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderYaml(value) {
  return `${stringifyYaml(value).trimEnd()}\n`;
}

function damagedWorkspaceError() {
  return authorityError(
    "ERR_INIT_WORKSPACE_DAMAGED",
    "The current Hypo-Workflow manifest is damaged. Repair or restore .pipeline/manifest.yaml before initialization; legacy writers remain blocked.",
  );
}
