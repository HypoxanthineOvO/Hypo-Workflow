import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  deriveProjectRegistryFromWorkspace,
  loadWorkspaceAuthority,
  validateWorkspaceAuthority,
  writeConfig,
} from "../src/index.js";

function validWorkspace(overrides = {}) {
  return {
    schema_version: "1",
    workspace: {
      id: "hypoxanthine-main",
      display_name: "Hypoxanthine Workspace",
      roots: ["/home/heyx"],
      authority: "workspace_yaml",
      updated_at: "2026-05-19T15:30:00+08:00",
    },
    objects: [
      {
        id: "hypo-workflow",
        type: "project",
        status: "current",
        display_name: "Hypo-Workflow",
        aliases: ["workflow-root"],
        local: {
          path: "/home/heyx/Hypo-Workflow",
          state_authority: ".pipeline/state.yaml",
          artifact_authority: ".pipeline",
        },
        sync_target_refs: ["notion-hypo-projects"],
        policy_refs: ["local-artifacts-to-storage-projection"],
        secret_refs: ["notion-api"],
      },
      {
        id: "hypo-info",
        type: "project",
        status: "archived",
        display_name: "Hypo-Info",
        aliases: [],
      },
      {
        id: "hypo-info-v2",
        type: "project",
        status: "current",
        display_name: "Hypo-Info-V2",
        aliases: ["info-v2"],
      },
    ],
    relations: [
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
    ],
    sync_targets: [
      {
        id: "notion-hypo-projects",
        backend: "notion",
        display_name: "Hypo Projects",
        root_ref: { page_id: "cd9cb9d0-09b9-4728-a71e-1df5f06cb644" },
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
        purpose: "Notion dry-run and apply after confirmation",
        value_policy: "raw_value_never_projected",
        dependent_objects: ["hypo-workflow"],
        health: { status: "unknown" },
      },
    ],
    derived_views: {
      projects_yaml: {
        path: "~/.hypo-workflow/projects.yaml",
        authority: "derived_from_workspace",
        fields: [
          "id",
          "display_name",
          "path",
          "platform",
          "profile",
          "current_cycle",
          "pipeline_status",
          "open_patch_count",
          "acceptance",
          "knowledge",
          "updated_at",
        ],
      },
    },
    ...overrides,
  };
}

test("workspace authority requires the full v1 section set", () => {
  const workspace = validWorkspace();
  const validation = validateWorkspaceAuthority(workspace);
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);

  const missingSections = { ...workspace };
  delete missingSections.secret_refs;

  assert.throws(
    () => validateWorkspaceAuthority(missingSections, { throwOnError: true }),
    /secret_refs/,
  );
});

test("workspace authority rejects duplicate object ids and aliases", () => {
  assert.throws(
    () => validateWorkspaceAuthority(validWorkspace({
      objects: [
        { id: "hypo-workflow", type: "project", aliases: ["workflow-root"] },
        { id: "hypo-workflow", type: "project", aliases: [] },
      ],
    }), { throwOnError: true }),
    /duplicate object id.*hypo-workflow/i,
  );

  assert.throws(
    () => validateWorkspaceAuthority(validWorkspace({
      objects: [
        { id: "hypo-workflow", type: "project", aliases: ["shared-alias"] },
        { id: "hypo-info-v2", type: "project", aliases: ["shared-alias"] },
      ],
    }), { throwOnError: true }),
    /duplicate alias.*shared-alias/i,
  );
});

test("workspace authority forbids raw secret values and only accepts secret refs", () => {
  assert.throws(
    () => validateWorkspaceAuthority(validWorkspace({
      secret_refs: [
        {
          id: "notion-api",
          provider: "notion",
          store_ref: "local_secret:notion_api",
          value: "secret-token-must-not-be-here",
          value_policy: "raw_value_never_projected",
        },
      ],
    }), { throwOnError: true }),
    /raw secret|secret value|value/i,
  );

  assert.throws(
    () => validateWorkspaceAuthority(validWorkspace({
      objects: [
        {
          id: "hypo-workflow",
          type: "project",
          secrets: { notion_api: "secret-token-must-not-be-here" },
        },
      ],
    }), { throwOnError: true }),
    /raw secret|secret value|secrets/i,
  );
});

test("projects.yaml is derived from workspace authority and cannot override object identity", async () => {
  const workspace = validWorkspace();
  const derived = deriveProjectRegistryFromWorkspace(workspace, {
    existingProjects: [
      {
        id: "hypo-workflow",
        display_name: "Spoofed Name",
        path: "/tmp/spoofed",
        platform: "claude-code",
        pipeline_status: "stale",
      },
      {
        id: "legacy-only-project",
        display_name: "Legacy Only",
        path: "/tmp/legacy",
      },
    ],
  });

  assert.equal(derived.schema_version, "1");
  assert.equal(derived.projects.length, 1);
  assert.equal(derived.projects[0].id, "hypo-workflow");
  assert.equal(derived.projects[0].display_name, "Hypo-Workflow");
  assert.equal(derived.projects[0].path, "/home/heyx/Hypo-Workflow");
  assert.notEqual(derived.projects[0].display_name, "Spoofed Name");
  assert.ok(derived.drift.some((item) => item.id === "hypo-workflow" && item.field === "display_name"));
  assert.ok(derived.drift.some((item) => item.id === "legacy-only-project" && item.reason === "missing_from_workspace"));
});

test("derived projects.yaml strips raw secrets from compatibility project fields", () => {
  const derived = deriveProjectRegistryFromWorkspace(validWorkspace(), {
    existingProjects: [
      {
        id: "hypo-workflow",
        path: "/home/heyx/Hypo-Workflow",
        acceptance: {
          mode: "manual",
          token: "raw-acceptance-token-must-not-project",
        },
        knowledge: {
          status: "available",
          password: "raw-knowledge-password-must-not-project",
        },
      },
    ],
  });

  assert.equal(derived.projects.length, 1);
  assert.equal(derived.projects[0].id, "hypo-workflow");
  assert.equal(derived.projects[0].acceptance.mode, "manual");
  assert.equal("token" in derived.projects[0].acceptance, false);
  assert.equal(derived.projects[0].knowledge.status, "available");
  assert.equal("password" in derived.projects[0].knowledge, false);
  assert.doesNotMatch(JSON.stringify(derived.projects[0]), /raw-(acceptance-token|knowledge-password)-must-not-project/);
  assert.doesNotMatch(JSON.stringify(derived), /raw-(acceptance-token|knowledge-password)-must-not-project/);
});

test("workspace authority requires projects.yaml derived view to declare workspace authority", () => {
  assert.throws(
    () => validateWorkspaceAuthority(validWorkspace({
      derived_views: {
        projects_yaml: {
          path: "~/.hypo-workflow/projects.yaml",
          authority: "compatibility_projects_yaml",
        },
      },
    }), { throwOnError: true }),
    /derived_views\.projects_yaml\.authority.*derived_from_workspace/i,
  );
});

test("workspace authority loads ~/.hypo-workflow/workspace.yaml before compatibility projects.yaml", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-workspace-authority-"));
  const home = join(dir, "home");
  const workspaceFile = join(home, ".hypo-workflow", "workspace.yaml");
  const projectsFile = join(home, ".hypo-workflow", "projects.yaml");

  await writeConfig(workspaceFile, validWorkspace());
  await writeConfig(projectsFile, {
    schema_version: "1",
    projects: [
      {
        id: "hypo-workflow",
        display_name: "Compatibility View Cannot Override",
        path: "/tmp/incorrect",
      },
    ],
  });

  const loaded = await loadWorkspaceAuthority({ home });
  assert.equal(loaded.source, workspaceFile);
  assert.equal(loaded.authority.workspace.id, "hypoxanthine-main");
  assert.equal(loaded.authority.objects.find((object) => object.id === "hypo-workflow").local.path, "/home/heyx/Hypo-Workflow");
  assert.equal(loaded.compatibility_view?.projects?.[0]?.display_name, "Compatibility View Cannot Override");
});
