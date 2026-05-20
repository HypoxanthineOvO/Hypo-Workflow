import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProjectLinkGraph,
  validateWorkspaceAuthority,
  validateWorkspaceRelations,
} from "../src/index.js";

const OBJECTS = Object.freeze([
  { id: "hypo-info", type: "project", status: "archived", display_name: "Hypo-Info", aliases: [] },
  { id: "hypo-info-v2", type: "project", status: "current", display_name: "Hypo-Info-V2", aliases: ["info-v2"] },
  { id: "hypo-agent", type: "project", status: "archived", display_name: "Hypo-Agent", aliases: [] },
  { id: "hypo-claw", type: "project", status: "current", display_name: "Hypo-Claw", aliases: ["claw"] },
]);

function workspaceWithRelations(relations) {
  return {
    schema_version: "1",
    workspace: {
      id: "hypoxanthine-main",
      display_name: "Hypoxanthine Workspace",
      roots: ["/home/heyx"],
      authority: "workspace_yaml",
      updated_at: "2026-05-19T15:30:00+08:00",
    },
    objects: OBJECTS,
    relations,
    sync_targets: [],
    policies: [],
    secret_refs: [],
    derived_views: {
      projects_yaml: {
        path: "~/.hypo-workflow/projects.yaml",
        authority: "derived_from_workspace",
      },
    },
  };
}

const SEED_RELATIONS = Object.freeze([
  {
    id: "edge-hypo-info-replaced-by-v2",
    from: "hypo-info",
    to: "hypo-info-v2",
    type: "replaced_by",
    status: "confirmed",
    authority: "user",
    direction: "from_to",
    evidence_refs: ["user-confirmation-2026-05-18"],
    projection: { project_home: true, global_graph: true, notion: "summary_link_only" },
    created_at: "2026-05-18T23:15:30+08:00",
    updated_at: "2026-05-18T23:15:30+08:00",
  },
  {
    id: "edge-hypo-agent-replaced-by-claw",
    from: "hypo-agent",
    to: "hypo-claw",
    type: "replaced_by",
    status: "confirmed",
    authority: "user",
    direction: "from_to",
    evidence_refs: ["user-confirmation-2026-05-18"],
    projection: { project_home: true, global_graph: true, notion: "summary_link_only" },
    created_at: "2026-05-18T23:15:30+08:00",
    updated_at: "2026-05-18T23:15:30+08:00",
  },
]);

test("workspace typed relations include the required replaced_by seed edges", () => {
  const workspace = workspaceWithRelations([...SEED_RELATIONS]);
  const validation = validateWorkspaceAuthority(workspace);
  assert.equal(validation.valid, true);

  const graph = buildProjectLinkGraph(workspace);
  assert.deepEqual(
    graph.edges.map((edge) => `${edge.from}->${edge.to}:${edge.type}`).sort(),
    [
      "hypo-agent->hypo-claw:replaced_by",
      "hypo-info->hypo-info-v2:replaced_by",
    ],
  );
  assert.deepEqual(graph.successorsOf("hypo-info"), ["hypo-info-v2"]);
  assert.deepEqual(graph.predecessorsOf("hypo-claw"), ["hypo-agent"]);
});

test("workspace relation validator rejects unknown endpoints, unsupported types, and invalid direction", () => {
  assert.throws(
    () => validateWorkspaceRelations(workspaceWithRelations([
      { ...SEED_RELATIONS[0], to: "missing-project" },
    ]), { throwOnError: true }),
    /unknown relation endpoint.*missing-project/i,
  );

  assert.throws(
    () => validateWorkspaceRelations(workspaceWithRelations([
      { ...SEED_RELATIONS[0], type: "same_as_but_untyped" },
    ]), { throwOnError: true }),
    /unsupported relation type.*same_as_but_untyped/i,
  );

  assert.throws(
    () => validateWorkspaceRelations(workspaceWithRelations([
      { ...SEED_RELATIONS[0], direction: "sideways" },
    ]), { throwOnError: true }),
    /unsupported relation direction.*sideways/i,
  );
});

test("workspace relation validator enforces required edge metadata", () => {
  assert.throws(
    () => validateWorkspaceRelations(workspaceWithRelations([
      {
        from: "hypo-info",
        to: "hypo-info-v2",
        type: "replaced_by",
      },
    ]), { throwOnError: true }),
    /relation id|required.*status|required.*authority|required.*direction/i,
  );
});

test("project link graph derives inverse display links without making projects.yaml authoritative", () => {
  const graph = buildProjectLinkGraph(workspaceWithRelations([...SEED_RELATIONS]), {
    derivedProjects: [
      { id: "hypo-info", successors: [] },
      { id: "hypo-info-v2", predecessors: ["wrong-predecessor"] },
    ],
  });

  assert.deepEqual(graph.displayLinksFor("hypo-info-v2"), [
    {
      id: "edge-hypo-info-replaced-by-v2",
      direction: "incoming",
      related_object_id: "hypo-info",
      type: "successor_of",
      source_type: "replaced_by",
      authority: "workspace.yaml",
    },
  ]);
  assert.ok(graph.drift.some((item) => item.id === "hypo-info-v2" && item.field === "predecessors"));
});
