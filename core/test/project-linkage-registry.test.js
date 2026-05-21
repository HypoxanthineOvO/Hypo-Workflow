import test from "node:test";
import assert from "node:assert/strict";
import * as api from "../src/index.js";

const CANONICAL_PROJECTS = Object.freeze([
  {
    id: "hypo-workflow",
    display_name: "Hypo-Workflow",
    path: "/home/heyx/Hypo-Workflow",
    role: "Workflow runtime and root project-management authority",
  },
  {
    id: "hypo-claw",
    display_name: "Hypo-Claw",
    path: "/home/heyx/Hypo-Claw",
    role: "QQ notification outlet for project stop and daily summary messages",
  },
  {
    id: "hypo-writer",
    display_name: "Hypo-Writer",
    path: "/home/heyx/Hypo-Writer",
    role: "Long-form writing and article maintenance project",
  },
  {
    id: "hypo-info-v2",
    display_name: "Hypo-Info-V2",
    path: "/home/heyx/Hypo-Info-V2",
    role: "Current information management successor project",
  },
  {
    id: "hypo-research",
    display_name: "Hypo-Research",
    path: "/home/heyx/Hypo-Research",
    role: "Academic research workflow and literature tooling project",
  },
  {
    id: "hypo-switcher",
    display_name: "Hypo-Switcher",
    path: "/home/heyx/Hypo-Switcher",
    role: "Project/profile switching and environment coordination project",
  },
  {
    id: "hypo-llm",
    display_name: "Hypo-LLM",
    path: "/home/heyx/Hypo-LLM",
    role: "LLM infrastructure, routing, and cost-management project",
  },
]);

function requireBuildRegistry() {
  assert.equal(
    typeof api.buildProjectLinkageRegistry,
    "function",
    "expected buildProjectLinkageRegistry to be exported from ../src/index.js",
  );
  return api.buildProjectLinkageRegistry;
}

function buildRegistry() {
  const buildProjectLinkageRegistry = requireBuildRegistry();
  return buildProjectLinkageRegistry();
}

test("project linkage registry returns exactly the seven first-batch canonical projects", () => {
  const registry = buildRegistry();
  const projectIds = registry.projects.map((project) => project.id);

  assert.deepEqual(projectIds, CANONICAL_PROJECTS.map((project) => project.id));
  assert.equal(new Set(projectIds).size, 7, "canonical project ids must be unique");
});

test("canonical project entries expose stable identity, human roles, and notification enablement flags", () => {
  const registry = buildRegistry();
  const projectsById = new Map(registry.projects.map((project) => [project.id, project]));

  for (const expected of CANONICAL_PROJECTS) {
    const actual = projectsById.get(expected.id);
    assert.ok(actual, `missing canonical project ${expected.id}`);
    assert.equal(actual.display_name, expected.display_name);
    assert.equal(actual.path, expected.path);
    assert.equal(actual.role, expected.role);
    assert.equal(actual.stop_notifications_enabled, true, `${expected.id} must be a stop notification target`);
    assert.equal(actual.daily_summary_enabled, true, `${expected.id} must be included in daily summary`);
  }
});

test("legacy predecessor relations are preserved without activating legacy notification targets", () => {
  const registry = buildRegistry();

  assert.deepEqual(
    registry.relations.map((relation) => `${relation.from}->${relation.to}:${relation.type}`).sort(),
    [
      "hypo-agent->hypo-claw:replaced_by",
      "hypo-info->hypo-info-v2:replaced_by",
    ],
  );

  for (const relation of registry.relations) {
    assert.equal(relation.status, "confirmed");
    assert.equal(relation.authority, "user");
    assert.equal(relation.direction, "from_to");
    assert.deepEqual(relation.projection, {
      project_home: true,
      global_graph: true,
      notion: "summary_link_only",
    });
  }

  assert.deepEqual(
    registry.active_notification_targets.map((project) => project.id),
    CANONICAL_PROJECTS.map((project) => project.id),
  );
  assert.equal(registry.active_notification_targets.some((project) => project.id === "hypo-agent"), false);
  assert.equal(registry.active_notification_targets.some((project) => project.id === "hypo-info"), false);
  assert.equal(registry.projects.some((project) => project.id === "hypo-agent"), false);
  assert.equal(registry.projects.some((project) => project.id === "hypo-info"), false);
});

test("registry seed is metadata-only and plans no Notion writes or external actions", () => {
  const registry = buildRegistry();

  assert.deepEqual(registry.planned_actions, []);
  assert.equal(registry.remote_writes_enabled, false);
  assert.equal(registry.external_actions_enabled, false);
  assert.doesNotMatch(JSON.stringify(registry), /side_effect["']?\s*:\s*["']?(remote_write|external_action)/i);
});
