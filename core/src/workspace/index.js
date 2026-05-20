import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadProjectRegistry, parseYaml } from "../config/index.js";

const REQUIRED_WORKSPACE_SECTIONS = Object.freeze([
  "workspace",
  "objects",
  "relations",
  "sync_targets",
  "policies",
  "secret_refs",
  "derived_views",
]);

const SUPPORTED_RELATION_TYPES = Object.freeze([
  "replaced_by",
  "predecessor_of",
  "successor_of",
  "forked_from",
  "split_into",
  "merged_into",
  "depends_on",
  "feeds_content_to",
  "publishes_to",
  "uses_service",
  "provides_skill_to",
  "shares_secret_ref",
  "shares_rules",
  "shares_knowledge",
  "syncs_to",
  "tracked_by",
  "related_to",
]);

const SUPPORTED_RELATION_DIRECTIONS = Object.freeze(["from_to", "bidirectional"]);
const REQUIRED_RELATION_FIELDS = Object.freeze([
  "id",
  "from",
  "to",
  "type",
  "status",
  "authority",
  "direction",
  "evidence_refs",
  "projection",
  "created_at",
  "updated_at",
]);

const RAW_SECRET_KEYS = /^(value|secret|secrets|token|api_key|apikey|password|private_key|credential|credentials)$/i;

export function validateWorkspaceAuthority(workspace, options = {}) {
  const errors = [];
  if (!isPlainObject(workspace)) {
    errors.push("workspace authority must be an object");
    return finishValidation(errors, options);
  }

  for (const section of REQUIRED_WORKSPACE_SECTIONS) {
    if (!Object.prototype.hasOwnProperty.call(workspace, section)) {
      errors.push(`required workspace section missing: ${section}`);
    }
  }

  if (workspace.objects !== undefined && !Array.isArray(workspace.objects)) {
    errors.push("objects must be an array");
  }
  if (workspace.relations !== undefined && !Array.isArray(workspace.relations)) {
    errors.push("relations must be an array");
  }
  if (workspace.sync_targets !== undefined && !Array.isArray(workspace.sync_targets)) {
    errors.push("sync_targets must be an array");
  }
  if (workspace.policies !== undefined && !Array.isArray(workspace.policies)) {
    errors.push("policies must be an array");
  }
  if (workspace.secret_refs !== undefined && !Array.isArray(workspace.secret_refs)) {
    errors.push("secret_refs must be an array");
  }

  errors.push(...validateObjects(workspace));
  errors.push(...validateSecretRefs(workspace));
  errors.push(...validateRelationList(workspace));
  errors.push(...validateObjectReferenceLists(workspace));
  errors.push(...validateDerivedViews(workspace));

  return finishValidation(errors, options);
}

export function validateWorkspaceRelations(workspace, options = {}) {
  const errors = [];
  if (!isPlainObject(workspace)) {
    errors.push("workspace authority must be an object");
  } else {
    errors.push(...validateRelationList(workspace));
  }
  return finishValidation(errors, options);
}

export function deriveProjectRegistryFromWorkspace(workspace, options = {}) {
  const validation = validateWorkspaceAuthority(workspace, { throwOnError: options.throwOnError });
  if (!validation.valid && options.throwOnError === false) {
    return { schema_version: "1", projects: [], drift: validation.errors.map((error) => ({ reason: error })) };
  }

  const existingProjects = normalizeExistingProjects(options.existingProjects || options.existing_projects || []);
  const existingById = new Map(existingProjects.map((project) => [String(project.id), project]));
  const workspaceObjectIds = new Set((workspace.objects || []).map((object) => String(object.id)));
  const projects = (workspace.objects || [])
    .filter((object) => object?.type === "project" && hasText(object?.local?.path))
    .map((object) => deriveProjectRecord(object, existingById.get(String(object.id)), options));

  const drift = [];
  for (const project of projects) {
    const existing = existingById.get(project.id);
    if (!existing) continue;
    for (const field of Object.keys(project)) {
      if (existing[field] === undefined) continue;
      if (!sameValue(existing[field], project[field])) {
        drift.push({
          id: project.id,
          field,
          existing: stripRawSecretFields(existing[field]),
          authority: stripRawSecretFields(project[field]),
          reason: "derived_view_drift",
        });
      }
    }
  }

  for (const existing of existingProjects) {
    if (!workspaceObjectIds.has(String(existing.id))) {
      drift.push({ id: String(existing.id), reason: "missing_from_workspace" });
    }
  }

  return {
    schema_version: String(workspace.schema_version || "1"),
    projects,
    drift,
  };
}

export async function loadWorkspaceAuthority(options = {}) {
  const home = options.home || homedir();
  const workspaceFile = options.workspaceFile || join(home, ".hypo-workflow", "workspace.yaml");
  const projectsFile = options.projectsFile || join(home, ".hypo-workflow", "projects.yaml");
  const raw = await readFile(workspaceFile, "utf8");
  const authority = parseYaml(raw);
  const validation = validateWorkspaceAuthority(authority, { throwOnError: true });
  const compatibilityView = await exists(projectsFile) ? await loadProjectRegistry(projectsFile) : null;
  return {
    source: workspaceFile,
    authority,
    validation,
    compatibility_view: compatibilityView,
    derived_view: deriveProjectRegistryFromWorkspace(authority, {
      existingProjects: compatibilityView?.projects || [],
    }),
  };
}

export function buildProjectLinkGraph(workspace, options = {}) {
  validateWorkspaceRelations(workspace, { throwOnError: true });
  const projectIds = new Set((workspace.objects || [])
    .filter((object) => object?.type === "project")
    .map((object) => String(object.id)));
  const edges = (workspace.relations || [])
    .filter((relation) => projectIds.has(String(relation.from)) && projectIds.has(String(relation.to)))
    .map((relation) => ({
      id: String(relation.id),
      from: String(relation.from),
      to: String(relation.to),
      type: String(relation.type),
      status: relation.status,
      authority: relation.authority,
      direction: relation.direction,
      evidence_refs: Array.isArray(relation.evidence_refs) ? [...relation.evidence_refs] : [],
      projection: clone(relation.projection || {}),
    }));
  const drift = detectDerivedProjectLinkDrift(edges, options.derivedProjects || options.derived_projects || []);

  return {
    edges,
    drift,
    successorsOf(id) {
      return edges
        .filter((edge) => edge.from === id)
        .map((edge) => edge.to)
        .sort();
    },
    predecessorsOf(id) {
      return edges
        .filter((edge) => edge.to === id)
        .map((edge) => edge.from)
        .sort();
    },
    displayLinksFor(id) {
      return deriveDisplayLinks(edges, id);
    },
  };
}

function validateObjects(workspace) {
  const errors = [];
  if (!Array.isArray(workspace.objects)) return errors;

  const ids = new Set();
  const aliases = new Map();
  for (const object of workspace.objects) {
    if (!isPlainObject(object)) {
      errors.push("object records must be objects");
      continue;
    }
    if (!hasText(object.id)) {
      errors.push("object id is required");
    } else if (ids.has(String(object.id))) {
      errors.push(`duplicate object id: ${object.id}`);
    } else {
      ids.add(String(object.id));
    }
    if (!hasText(object.type)) {
      errors.push(`object type is required: ${object.id || "(unknown)"}`);
    }
    if (containsRawSecretValue(object, { allowSecretRefs: true })) {
      errors.push(`raw secret value is not allowed in object record: ${object.id || "(unknown)"}`);
    }
    for (const alias of toStringList(object.aliases)) {
      if (aliases.has(alias)) {
        errors.push(`duplicate alias: ${alias}`);
      } else {
        aliases.set(alias, object.id);
      }
    }
  }
  return errors;
}

function validateSecretRefs(workspace) {
  const errors = [];
  if (!Array.isArray(workspace.secret_refs)) return errors;
  const ids = new Set();
  for (const secretRef of workspace.secret_refs) {
    if (!isPlainObject(secretRef)) {
      errors.push("secret_refs entries must be objects");
      continue;
    }
    if (!hasText(secretRef.id)) {
      errors.push("secret_ref id is required");
    } else if (ids.has(String(secretRef.id))) {
      errors.push(`duplicate secret_ref id: ${secretRef.id}`);
    } else {
      ids.add(String(secretRef.id));
    }
    if (containsRawSecretValue(secretRef, { allowSecretRefs: false })) {
      errors.push(`raw secret value is not allowed in secret_refs: ${secretRef.id || "(unknown)"}`);
    }
  }
  return errors;
}

function validateRelationList(workspace) {
  const errors = [];
  const objectIds = new Set((workspace.objects || []).map((object) => String(object?.id || "")));
  const relationIds = new Set();
  if (!Array.isArray(workspace.relations)) return errors;

  for (const relation of workspace.relations) {
    if (!isPlainObject(relation)) {
      errors.push("relations entries must be objects");
      continue;
    }
    const missing = REQUIRED_RELATION_FIELDS.filter((field) => isEmptyRelationField(relation[field]));
    if (missing.length) {
      errors.push(`relation id or required metadata missing: required ${missing.join(", ")}`);
    }
    if (hasText(relation.id)) {
      if (relationIds.has(String(relation.id))) {
        errors.push(`duplicate relation id: ${relation.id}`);
      } else {
        relationIds.add(String(relation.id));
      }
    }
    for (const endpoint of ["from", "to"]) {
      if (hasText(relation[endpoint]) && !objectIds.has(String(relation[endpoint]))) {
        errors.push(`unknown relation endpoint: ${relation[endpoint]}`);
      }
    }
    if (hasText(relation.type) && !SUPPORTED_RELATION_TYPES.includes(String(relation.type))) {
      errors.push(`unsupported relation type: ${relation.type}`);
    }
    if (hasText(relation.direction) && !SUPPORTED_RELATION_DIRECTIONS.includes(String(relation.direction))) {
      errors.push(`unsupported relation direction: ${relation.direction}`);
    }
  }
  return errors;
}

function validateObjectReferenceLists(workspace) {
  const errors = [];
  if (!Array.isArray(workspace.objects)) return errors;
  const syncTargetIds = new Set((workspace.sync_targets || []).map((target) => String(target?.id || "")));
  const policyIds = new Set((workspace.policies || []).map((policy) => String(policy?.id || "")));
  const secretRefIds = new Set((workspace.secret_refs || []).map((secretRef) => String(secretRef?.id || "")));

  for (const object of workspace.objects) {
    for (const ref of toStringList(object.sync_target_refs)) {
      if (!syncTargetIds.has(ref)) errors.push(`unknown sync target ref: ${ref}`);
    }
    for (const ref of toStringList(object.policy_refs)) {
      if (!policyIds.has(ref)) errors.push(`unknown policy ref: ${ref}`);
    }
    for (const ref of toStringList(object.secret_refs)) {
      if (!secretRefIds.has(ref)) errors.push(`unknown secret ref: ${ref}`);
    }
  }
  return errors;
}

function validateDerivedViews(workspace) {
  const errors = [];
  if (!isPlainObject(workspace.derived_views)) return errors;
  const projectsYaml = workspace.derived_views.projects_yaml;
  if (projectsYaml === undefined) return errors;
  if (!isPlainObject(projectsYaml)) {
    errors.push("derived_views.projects_yaml must be an object");
    return errors;
  }
  if (projectsYaml.authority !== "derived_from_workspace") {
    errors.push("derived_views.projects_yaml.authority must be derived_from_workspace");
  }
  return errors;
}

function deriveProjectRecord(object, existing = {}, options = {}) {
  const now = options.now || object.updated_at || options.updated_at || null;
  return {
    id: String(object.id),
    display_name: object.display_name || object.name || String(object.id),
    path: object.local.path,
    platform: object.platform || existing.platform || "unknown",
    profile: object.profile || existing.profile || "default",
    current_cycle: object.current_cycle || existing.current_cycle || null,
    pipeline_status: object.pipeline_status || existing.pipeline_status || "unknown",
    open_patch_count: Number(object.open_patch_count ?? existing.open_patch_count ?? 0),
    acceptance: stripRawSecretFields(object.acceptance || existing.acceptance || {}),
    knowledge: stripRawSecretFields(object.knowledge || existing.knowledge || {}),
    updated_at: now || existing.updated_at || null,
  };
}

function deriveDisplayLinks(edges, id) {
  const links = [];
  for (const edge of edges) {
    if (edge.to === id) {
      links.push({
        id: edge.id,
        direction: "incoming",
        related_object_id: edge.from,
        type: inverseDisplayType(edge.type, "incoming"),
        source_type: edge.type,
        authority: "workspace.yaml",
      });
    }
    if (edge.from === id) {
      links.push({
        id: edge.id,
        direction: "outgoing",
        related_object_id: edge.to,
        type: inverseDisplayType(edge.type, "outgoing"),
        source_type: edge.type,
        authority: "workspace.yaml",
      });
    }
  }
  return links.sort((a, b) => a.id.localeCompare(b.id) || a.direction.localeCompare(b.direction));
}

function inverseDisplayType(type, direction) {
  if (type === "replaced_by") return direction === "incoming" ? "successor_of" : "predecessor_of";
  return type;
}

function detectDerivedProjectLinkDrift(edges, derivedProjects) {
  const drift = [];
  const derivedById = new Map(normalizeExistingProjects(derivedProjects).map((project) => [String(project.id), project]));
  for (const [id, project] of derivedById.entries()) {
    const successors = edges.filter((edge) => edge.from === id).map((edge) => edge.to).sort();
    const predecessors = edges.filter((edge) => edge.to === id).map((edge) => edge.from).sort();
    if (Array.isArray(project.successors) && !sameValue([...project.successors].sort(), successors)) {
      drift.push({ id, field: "successors", existing: clone(project.successors), authority: successors, reason: "derived_view_drift" });
    }
    if (Array.isArray(project.predecessors) && !sameValue([...project.predecessors].sort(), predecessors)) {
      drift.push({ id, field: "predecessors", existing: clone(project.predecessors), authority: predecessors, reason: "derived_view_drift" });
    }
  }
  return drift;
}

function containsRawSecretValue(value, options = {}, path = []) {
  if (!isPlainObject(value) && !Array.isArray(value)) return false;
  if (Array.isArray(value)) {
    return value.some((item, index) => containsRawSecretValue(item, options, [...path, String(index)]));
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "secret_refs" && options.allowSecretRefs) continue;
    if (key === "store_ref" || key === "value_policy") continue;
    if (RAW_SECRET_KEYS.test(key)) return true;
    if (containsRawSecretValue(child, options, [...path, key])) return true;
  }
  return false;
}

function stripRawSecretFields(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripRawSecretFields(item));
  }
  if (!isPlainObject(value)) {
    return clone(value);
  }

  const sanitized = {};
  for (const [key, child] of Object.entries(value)) {
    if (RAW_SECRET_KEYS.test(key)) continue;
    sanitized[key] = stripRawSecretFields(child);
  }
  return sanitized;
}

function isEmptyRelationField(value) {
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return !hasText(value);
}

function finishValidation(errors, options) {
  const result = {
    valid: errors.length === 0,
    errors,
  };
  if (!result.valid && options.throwOnError) {
    const error = new Error(errors.join("; "));
    error.validation = result;
    throw error;
  }
  return result;
}

function normalizeExistingProjects(projects) {
  return Array.isArray(projects) ? projects.filter(isPlainObject) : [];
}

function toStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(hasText).map(String);
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
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

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
