import test from "node:test";
import assert from "node:assert/strict";
import * as api from "../src/index.js";

const REQUIRED_PROJECT_HOME_SLOTS = Object.freeze([
  "overview",
  "progress",
  "architecture",
  "knowledge",
  "docs",
  "prompts_index",
  "reports_index",
  "legacy_links",
  "sync_status",
]);

test("storage sync template is a backend-neutral Project Home projection model", () => {
  const buildStorageSyncTemplate = requireApi("buildStorageSyncTemplate");
  const validateStorageSyncTemplate = requireApi("validateStorageSyncTemplate");

  const template = buildStorageSyncTemplate({
    workspace: workspaceAuthority(),
    project: projectObject(),
    artifactCatalog: artifactCatalog(),
  }, { now: "2026-05-19T17:10:00+08:00" });

  const validation = validateStorageSyncTemplate(template);
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);

  assert.equal(template.kind, "storage_sync_template");
  assert.equal(template.model, "backend-neutral-projection");
  assert.equal(template.object_id, "hypo-workflow");
  assert.equal(template.project_home?.title, "Hypo-Workflow");

  const slots = template.project_home?.slots || [];
  assert.deepEqual(slots.map((slot) => slot.id), REQUIRED_PROJECT_HOME_SLOTS);
  for (const slot of slots) {
    assert.equal(typeof slot.title, "string");
    assert.ok(slot.title.length > 0);
    assert.equal(typeof slot.authority, "string");
    assert.ok(["local_workflow", "derived", "workspace_yaml", "merge_input", "computed"].includes(slot.authority));
    assert.ok(Array.isArray(slot.sources));
    assert.ok(slot.sources.length > 0);
  }

  assert.doesNotMatch(
    JSON.stringify(template),
    /notion_|block_id|page_id|rich_text|property_id|database_id/i,
    "storage sync template must not contain backend-specific Notion projection fields",
  );
});

test("storage sync template redacts or omits secret-looking metadata", () => {
  const buildStorageSyncTemplate = requireApi("buildStorageSyncTemplate");

  const template = buildStorageSyncTemplate({
    workspace: workspaceAuthority({
      objects: [
        {
          ...projectObject(),
          metadata: {
            owner: "test-worker",
            notion_token: "secret_notion_token_must_not_project",
            authorization: "Bearer raw-storage-sync-secret",
          },
        },
      ],
    }),
    project: {
      ...projectObject(),
      metadata: {
        health: "current",
        api_key: "raw-storage-template-api-key",
      },
    },
    artifactCatalog: {
      entries: [
        ...artifactCatalog().entries,
        {
          object_id: "hypo-workflow",
          artifact_id: "secret-metadata",
          kind: "service_config_ref",
          path_or_remote_ref: "local_secret:notion_api",
          authority: "secret_ref",
          freshness: "unknown",
          parseability: "not_applicable",
          sensitivity: "secret_ref",
          projection: "none",
          metadata: {
            token: "raw-artifact-token-must-not-project",
            password: "raw-artifact-password-must-not-project",
          },
          evidence_refs: ["workspace:secret_refs.notion-api"],
        },
      ],
    },
  }, { now: "2026-05-19T17:10:00+08:00" });

  const serialized = JSON.stringify(template);
  assert.doesNotMatch(serialized, /secret_notion_token_must_not_project/);
  assert.doesNotMatch(serialized, /raw-storage-sync-secret/);
  assert.doesNotMatch(serialized, /raw-storage-template-api-key/);
  assert.doesNotMatch(serialized, /raw-artifact-(token|password)-must-not-project/);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

function workspaceAuthority(overrides = {}) {
  return {
    schema_version: "1",
    workspace: {
      id: "hypoxanthine-main",
      display_name: "Hypoxanthine Workspace",
      roots: ["/home/heyx"],
      authority: "workspace_yaml",
      updated_at: "2026-05-19T17:00:00+08:00",
    },
    objects: [projectObject()],
    relations: [],
    sync_targets: [
      {
        id: "notion-hypo-projects",
        backend: "notion",
        display_name: "Hypo Projects",
        root_ref: { page_id: "notion-target-page-ref" },
      },
    ],
    policies: [
      {
        id: "local-artifacts-to-storage-projection",
        type: "sync",
        authority: "workspace",
      },
    ],
    secret_refs: [
      {
        id: "notion-api",
        provider: "notion",
        store_ref: "local_secret:notion_api",
        purpose: "Notion dry-run and gated apply",
        value_policy: "raw_value_never_projected",
      },
    ],
    derived_views: {
      projects_yaml: {
        path: "~/.hypo-workflow/projects.yaml",
        authority: "derived_from_workspace",
      },
    },
    ...overrides,
  };
}

function projectObject() {
  return {
    id: "hypo-workflow",
    type: "project",
    status: "current",
    display_name: "Hypo-Workflow",
    local: {
      path: "/home/heyx/Hypo-Workflow",
      state_authority: ".pipeline/state.yaml",
      artifact_authority: ".pipeline",
    },
    sync_target_refs: ["notion-hypo-projects"],
    policy_refs: ["local-artifacts-to-storage-projection"],
    secret_refs: ["notion-api"],
  };
}

function artifactCatalog() {
  return {
    entries: [
      entry("project_overview", "PROJECT-SUMMARY.md", "derived", "summary"),
      entry("progress", ".pipeline/PROGRESS.md", "local_workflow", "timeline"),
      entry("architecture", ".pipeline/architecture.md", "local_workflow", "architecture"),
      entry("knowledge", ".pipeline/knowledge/knowledge.compact.md", "local_workflow", "knowledge"),
      entry("docs", "docs/guide.md", "local_workflow", "docs"),
      entry("prompt", ".pipeline/prompts/02-storage-sync-template-notion-dry-run.md", "local_workflow", "prompt"),
      entry("report", ".pipeline/reports/02-storage-sync-template-notion-dry-run.report.md", "local_workflow", "report"),
      entry("cycle_archive", ".pipeline/archives/C15/summary.md", "local_workflow", "archive"),
      entry("current_state", ".pipeline/state.yaml", "local_workflow", "state"),
    ],
  };
}

function entry(kind, path, authority, projection) {
  return {
    object_id: "hypo-workflow",
    artifact_id: `hypo-workflow:${kind}:${path}`,
    kind,
    path_or_remote_ref: path,
    authority,
    freshness: "current",
    parseability: "current",
    sensitivity: "internal",
    projection,
    evidence_refs: [`${path}:fixture`],
  };
}
