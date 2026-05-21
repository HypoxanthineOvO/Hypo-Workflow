import { homedir } from "node:os";
import { join } from "node:path";

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

const PROJECT_LINKAGE_SEED_PROJECTS = Object.freeze([
  Object.freeze({
    id: "hypo-workflow",
    display_name: "Hypo-Workflow",
    path: "~/Hypo-Workflow",
    role: "Workflow runtime and root project-management authority",
    stop_notifications_enabled: true,
    daily_summary_enabled: true,
  }),
  Object.freeze({
    id: "hypo-claw",
    display_name: "Hypo-Claw",
    path: "~/Hypo-Claw",
    role: "QQ notification outlet for project stop and daily summary messages",
    stop_notifications_enabled: true,
    daily_summary_enabled: true,
  }),
  Object.freeze({
    id: "hypo-writer",
    display_name: "Hypo-Writer",
    path: "~/Hypo-Writer",
    role: "Long-form writing and article maintenance project",
    stop_notifications_enabled: true,
    daily_summary_enabled: true,
  }),
  Object.freeze({
    id: "hypo-info-v2",
    display_name: "Hypo-Info-V2",
    path: "~/Hypo-Info-V2",
    role: "Current information management successor project",
    stop_notifications_enabled: true,
    daily_summary_enabled: true,
  }),
  Object.freeze({
    id: "hypo-research",
    display_name: "Hypo-Research",
    path: "~/Hypo-Research",
    role: "Academic research workflow and literature tooling project",
    stop_notifications_enabled: true,
    daily_summary_enabled: true,
  }),
  Object.freeze({
    id: "hypo-switcher",
    display_name: "Hypo-Switcher",
    path: "~/Hypo-Switcher",
    role: "Project/profile switching and environment coordination project",
    stop_notifications_enabled: true,
    daily_summary_enabled: true,
  }),
  Object.freeze({
    id: "hypo-llm",
    display_name: "Hypo-LLM",
    path: "~/Hypo-LLM",
    role: "LLM infrastructure, routing, and cost-management project",
    stop_notifications_enabled: true,
    daily_summary_enabled: true,
  }),
]);

const PROJECT_LINKAGE_SEED_RELATIONS = Object.freeze([
  Object.freeze({
    id: "edge-hypo-agent-replaced-by-claw",
    from: "hypo-agent",
    to: "hypo-claw",
    type: "replaced_by",
    status: "confirmed",
    authority: "user",
    direction: "from_to",
    evidence_refs: Object.freeze(["user-confirmation-2026-05-18"]),
    projection: Object.freeze({
      project_home: true,
      global_graph: true,
      notion: "summary_link_only",
    }),
  }),
  Object.freeze({
    id: "edge-hypo-info-replaced-by-v2",
    from: "hypo-info",
    to: "hypo-info-v2",
    type: "replaced_by",
    status: "confirmed",
    authority: "user",
    direction: "from_to",
    evidence_refs: Object.freeze(["user-confirmation-2026-05-18"]),
    projection: Object.freeze({
      project_home: true,
      global_graph: true,
      notion: "summary_link_only",
    }),
  }),
]);

export function buildProjectLinkageRegistry() {
  const projects = PROJECT_LINKAGE_SEED_PROJECTS.map((project) => ({
    ...clone(project),
    path: expandHomePath(project.path),
  }));

  return {
    schema_version: "1",
    projects,
    relations: PROJECT_LINKAGE_SEED_RELATIONS.map(clone),
    active_notification_targets: projects
      .filter((project) => project.stop_notifications_enabled || project.daily_summary_enabled)
      .map(clone),
    planned_actions: [],
    remote_writes_enabled: false,
    external_actions_enabled: false,
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

export function validateWorkspaceRelations(workspace, options = {}) {
  const errors = [];
  if (!isPlainObject(workspace)) {
    errors.push("workspace authority must be an object");
  } else {
    errors.push(...validateRelationList(workspace));
  }
  return finishValidation(errors, options);
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

function expandHomePath(value, home = homedir()) {
  const text = String(value || "");
  if (text === "~") return home;
  if (text.startsWith("~/")) return join(home, text.slice(2));
  return text;
}

function normalizeExistingProjects(projects) {
  return Array.isArray(projects) ? projects.filter(isPlainObject) : [];
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
