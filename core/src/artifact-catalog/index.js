import { readdir, readFile, stat } from "node:fs/promises";
import { basename, isAbsolute, join, relative } from "node:path";
import { parseYaml } from "../config/index.js";

const WORKFLOW_ARTIFACTS = Object.freeze([
  { kind: "current_state", path: ".pipeline/state.yaml", authority: "state_authority", sensitivity: "internal", projection: "state" },
  { kind: "progress", path: ".pipeline/PROGRESS.md", sensitivity: "internal", projection: "timeline" },
  { kind: "cycle", path: ".pipeline/cycle.yaml", sensitivity: "internal", projection: "cycle" },
  { kind: "runtime_log", path: ".pipeline/log.yaml", sensitivity: "internal", projection: "log" },
  { kind: "rule", path: ".pipeline/rules.yaml", sensitivity: "internal", projection: "rules" },
]);

const DIRECTORY_ARTIFACTS = Object.freeze([
  { kind: "prompt", dir: ".pipeline/prompts", sensitivity: "internal", projection: "prompt" },
  { kind: "report", dir: ".pipeline/reports", sensitivity: "internal", projection: "report" },
  { kind: "cycle_archive", dir: ".pipeline/archives", sensitivity: "internal", projection: "archive" },
  { kind: "docs", dir: "docs", sensitivity: "public", projection: "docs" },
  { kind: "knowledge", dir: ".pipeline/knowledge", sensitivity: "internal", projection: "knowledge" },
]);

const PROJECT_OVERVIEWS = Object.freeze(["PROJECT-SUMMARY.md", "README.md"]);
const YAML_EXTENSIONS = /\.(ya?ml)$/i;
const MARKDOWN_EXTENSIONS = /\.(md|markdown)$/i;

export async function scanArtifactCatalog(workspaceAuthority, options = {}) {
  const entries = [];
  const objects = Array.isArray(workspaceAuthority?.objects) ? workspaceAuthority.objects : [];

  for (const object of objects) {
    if (!object?.id) continue;
    if (object.type === "skill") {
      entries.push(...await scanSkillObject(object));
    } else {
      entries.push(...await scanProjectLikeObject(object));
    }
    entries.push(...scanObjectMetadata(object));
  }

  return { entries };
}

async function scanProjectLikeObject(object) {
  const root = object?.local?.path;
  const entries = [];
  const workflowAuthority = authorityForWorkflowObject(object);
  const workflowApplicable = object.status !== "pre_workflow";

  for (const artifact of WORKFLOW_ARTIFACTS) {
    entries.push(await scanFileArtifact(object, root, artifact.path, {
      kind: artifact.kind,
      authority: workflowApplicable ? workflowAuthority : "manual_or_remote",
      sensitivity: artifact.sensitivity,
      projection: artifact.projection,
      notApplicable: !workflowApplicable,
    }));
  }

  entries.push(...await scanDirectoryArtifacts(object, root, workflowApplicable, workflowAuthority));
  entries.push(await scanArchitectureArtifact(object, root, workflowApplicable, workflowAuthority));
  entries.push(await scanProjectOverview(object, root));

  return entries;
}

async function scanDirectoryArtifacts(object, root, workflowApplicable, workflowAuthority) {
  const entries = [];
  for (const artifact of DIRECTORY_ARTIFACTS) {
    const discovered = workflowApplicable ? await firstReadableFile(root, artifact.dir) : null;
    const path = discovered ? relativePath(root, discovered) : artifact.dir;
    entries.push(await scanFileArtifact(object, root, path, {
      kind: artifact.kind,
      authority: workflowApplicable ? workflowAuthority : "manual_or_remote",
      sensitivity: artifact.sensitivity,
      projection: artifact.projection,
      notApplicable: !workflowApplicable,
    }));
  }
  return entries;
}

async function scanArchitectureArtifact(object, root, workflowApplicable, workflowAuthority) {
  const path = await firstExisting(root, [".pipeline/architecture.md", "architecture.md", "docs/architecture.md"]);
  return scanFileArtifact(object, root, path || ".pipeline/architecture.md", {
    kind: "architecture",
    authority: workflowApplicable ? workflowAuthority : "manual_or_remote",
    sensitivity: "internal",
    projection: "architecture",
    notApplicable: !workflowApplicable,
  });
}

async function scanProjectOverview(object, root) {
  const path = await firstExisting(root, PROJECT_OVERVIEWS);
  const selected = path || PROJECT_OVERVIEWS[0];
  const entry = await scanFileArtifact(object, root, selected, {
    kind: "project_overview",
    authority: selected === "PROJECT-SUMMARY.md" ? "derived" : "manual_or_remote",
    sensitivity: "public",
    projection: selected === "PROJECT-SUMMARY.md" ? "summary" : "overview",
  });
  if (entry.freshness === "current" && selected === "PROJECT-SUMMARY.md") {
    const staleEvidence = await staleDerivedEvidence(root, selected, [
      ".pipeline/state.yaml",
      ".pipeline/PROGRESS.md",
      ".pipeline/log.yaml",
    ]);
    if (staleEvidence.length) {
      entry.freshness = "stale";
      entry.evidence_refs.push(...staleEvidence);
    }
  }
  return entry;
}

async function scanSkillObject(object) {
  const root = object?.local?.path;
  const entries = [
    await scanFileArtifact(object, root, "SKILL.md", {
      kind: "skill_spec",
      authority: "skill",
      sensitivity: "internal",
      projection: "summary",
    }),
  ];

  for (const ref of toArray(object.service_config_refs)) {
    entries.push(makeEntry(object, "service_config_ref", {
      path_or_remote_ref: ref.path || ref.store_ref || ref.id || "service_config_ref",
      authority: "secret_ref",
      freshness: "unknown",
      parseability: "not_applicable",
      sensitivity: "secret_ref",
      projection: "none",
      evidence_refs: [
        `workspace:objects.${object.id}.service_config_refs.${ref.id || ref.store_ref || "ref"}`,
      ],
    }));
  }

  return entries;
}

function scanObjectMetadata(object) {
  const entries = [];
  if (object.infrastructure && typeof object.infrastructure === "object") {
    entries.push(makeEntry(object, "infrastructure_fact", {
      path_or_remote_ref: `workspace:objects.${object.id}.infrastructure`,
      authority: "workspace_yaml",
      freshness: "current",
      parseability: "current",
      sensitivity: "internal",
      projection: "metadata",
      evidence_refs: [`workspace:objects.${object.id}.infrastructure`],
    }));
  }
  return entries;
}

async function scanFileArtifact(object, root, path, options) {
  if (options.notApplicable) {
    return makeEntry(object, options.kind, {
      path_or_remote_ref: path,
      authority: options.authority,
      freshness: "not_applicable",
      parseability: "not_applicable",
      sensitivity: options.sensitivity,
      projection: options.projection,
      evidence_refs: [`workspace:objects.${object.id}.status:${object.status || "unknown"}`],
    });
  }

  if (!root) {
    return missingEntry(object, path, options, "missing_local_path");
  }

  const absolutePath = resolveArtifactPath(root, path);
  const artifactStat = await safeStat(absolutePath);
  if (!artifactStat) return missingEntry(object, path, options, "missing");
  if (!artifactStat.isFile()) {
    return makeEntry(object, options.kind, {
      path_or_remote_ref: path,
      authority: options.authority,
      freshness: "current",
      parseability: "not_applicable",
      sensitivity: options.sensitivity,
      projection: options.projection,
      evidence_refs: [`${path}:not_file`],
    });
  }

  const parseability = await parseabilityForFile(absolutePath, path);
  const freshness = parseability.status === "parse_error" ? "parse_error" : "current";
  return makeEntry(object, options.kind, {
    path_or_remote_ref: path,
    authority: options.authority,
    freshness,
    parseability: parseability.status,
    sensitivity: options.sensitivity,
    projection: options.projection,
    evidence_refs: parseability.evidence_refs.length ? parseability.evidence_refs : [`${path}:mtime:${artifactStat.mtime.toISOString()}`],
  });
}

function missingEntry(object, path, options, reason) {
  return makeEntry(object, options.kind, {
    path_or_remote_ref: path,
    authority: options.authority,
    freshness: "missing",
    parseability: "missing",
    sensitivity: options.sensitivity,
    projection: options.projection,
    evidence_refs: [`${path}:${reason}`],
  });
}

async function parseabilityForFile(absolutePath, displayPath) {
  if (!YAML_EXTENSIONS.test(displayPath)) {
    return {
      status: MARKDOWN_EXTENSIONS.test(displayPath) ? "current" : "not_applicable",
      evidence_refs: [`${displayPath}:readable`],
    };
  }

  try {
    const source = await readFile(absolutePath, "utf8");
    strictYamlPrecheck(source);
    parseYaml(source);
    return { status: "current", evidence_refs: [`${displayPath}:yaml:parsed`] };
  } catch (error) {
    return {
      status: "parse_error",
      evidence_refs: [`${displayPath}:yaml:parse_error:${error.message}`],
    };
  }
}

function strictYamlPrecheck(source) {
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (hasUnbalancedInlineCollection(trimmed, "[", "]") || hasUnbalancedInlineCollection(trimmed, "{", "}")) {
      throw new Error("unbalanced inline yaml collection");
    }
  }
}

function hasUnbalancedInlineCollection(text, open, close) {
  let depth = 0;
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote && text[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
    } else if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth < 0) return true;
    }
  }
  return depth !== 0;
}

async function staleDerivedEvidence(root, derivedPath, authorityPaths) {
  const derived = await safeStat(resolveArtifactPath(root, derivedPath));
  if (!derived) return [];
  const evidence = [];
  for (const authorityPath of authorityPaths) {
    const authorityStat = await safeStat(resolveArtifactPath(root, authorityPath));
    if (authorityStat && authorityStat.mtime > derived.mtime) {
      evidence.push(`${derivedPath}:older_than:${authorityPath}`);
    }
  }
  return evidence;
}

async function firstExisting(root, paths) {
  for (const path of paths) {
    const artifactStat = await safeStat(resolveArtifactPath(root, path));
    if (artifactStat?.isFile()) return path;
  }
  return null;
}

async function firstReadableFile(root, directory) {
  const absoluteDirectory = resolveArtifactPath(root, directory);
  const directoryStat = await safeStat(absoluteDirectory);
  if (!directoryStat?.isDirectory()) return null;
  const files = await collectFiles(absoluteDirectory);
  files.sort();
  return files[0] || null;
}

async function collectFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isFile()) files.push(path);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
  }
  return files;
}

async function safeStat(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

function makeEntry(object, kind, fields) {
  return {
    object_id: String(object.id),
    artifact_id: `${object.id}:${kind}:${basename(String(fields.path_or_remote_ref || kind))}`,
    kind,
    path_or_remote_ref: String(fields.path_or_remote_ref || ""),
    authority: fields.authority,
    freshness: fields.freshness,
    parseability: fields.parseability,
    sensitivity: fields.sensitivity,
    projection: fields.projection,
    evidence_refs: Array.isArray(fields.evidence_refs) ? fields.evidence_refs.map(String) : [],
  };
}

function authorityForWorkflowObject(object) {
  return object.status === "current" ? "local_workflow" : "legacy_workflow";
}

function resolveArtifactPath(root, path) {
  if (!path) return root;
  return isAbsolute(path) ? path : join(root, path);
}

function relativePath(root, path) {
  return isAbsolute(path) ? relative(root, path) : path;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}
