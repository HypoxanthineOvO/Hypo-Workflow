import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  scanArtifactCatalog,
  writeConfig,
} from "../src/index.js";

const REQUIRED_ENTRY_FIELDS = Object.freeze([
  "object_id",
  "artifact_id",
  "kind",
  "path_or_remote_ref",
  "authority",
  "freshness",
  "parseability",
  "sensitivity",
  "projection",
  "evidence_refs",
]);

test("artifact catalog scans current Workflow artifacts and marks stale derived summaries", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-artifact-catalog-current-"));
  const project = join(root, "Hypo-Info-V2");
  await createCurrentWorkflowProject(project);

  const catalog = await scanArtifactCatalog(workspaceAuthority([
    workflowObject("hypo-info-v2", project, { status: "current" }),
  ]), { now: "2026-05-19T16:00:00+08:00" });

  assertCatalogShape(catalog);
  assertKinds(catalog, "hypo-info-v2", [
    "current_state",
    "progress",
    "cycle",
    "prompt",
    "report",
    "cycle_archive",
    "architecture",
    "docs",
    "knowledge",
    "rule",
    "runtime_log",
    "project_overview",
  ]);

  assertEntry(catalog, "hypo-info-v2", "current_state", {
    path: ".pipeline/state.yaml",
    authority: "local_workflow",
    freshness: "current",
    parseability: "current",
    sensitivity: "internal",
  });
  assertEntry(catalog, "hypo-info-v2", "progress", {
    path: ".pipeline/PROGRESS.md",
    authority: "local_workflow",
    freshness: "current",
    parseability: "current",
  });
  assertEntry(catalog, "hypo-info-v2", "project_overview", {
    path: "PROJECT-SUMMARY.md",
    authority: "derived",
    freshness: "stale",
    parseability: "current",
    projection: "summary",
  });
});

test("artifact catalog reports malformed YAML as parse_error instead of missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-artifact-catalog-parse-error-"));
  const project = join(root, "Hypo-Agent");
  await mkdir(join(project, ".pipeline"), { recursive: true });
  await writeFile(join(project, ".pipeline", "state.yaml"), "pipeline:\n  status: [unterminated\n", "utf8");

  const catalog = await scanArtifactCatalog(workspaceAuthority([
    workflowObject("hypo-agent", project, { status: "archived" }),
  ]), { now: "2026-05-19T16:00:00+08:00" });

  const state = assertEntry(catalog, "hypo-agent", "current_state", {
    path: ".pipeline/state.yaml",
    freshness: "parse_error",
    parseability: "parse_error",
    authority: "legacy_workflow",
  });
  assert.match(state.evidence_refs.join("\n"), /parse|yaml/i);
});

test("artifact catalog treats pre-Workflow git-only objects as not_applicable, not broken", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-artifact-catalog-pre-workflow-"));
  const project = join(root, "Hypo-GPU");
  await mkdir(join(project, ".git"), { recursive: true });
  await writeFile(join(project, "README.md"), "# Hypo-GPU\n\nTeaching GPU simulator.\n", "utf8");

  const catalog = await scanArtifactCatalog(workspaceAuthority([
    {
      id: "hypo-gpu",
      type: "project",
      status: "pre_workflow",
      display_name: "Hypo-GPU",
      local: { path: project },
      remote_refs: [{ id: "notion-project-home", kind: "notion_page", ref: "notion://hypo-gpu" }],
    },
  ]), { now: "2026-05-19T16:00:00+08:00" });

  assertCatalogShape(catalog);
  assertEntry(catalog, "hypo-gpu", "project_overview", {
    path: "README.md",
    freshness: "current",
    parseability: "current",
  });

  for (const kind of ["current_state", "progress", "cycle", "prompt", "report", "knowledge", "rule", "runtime_log"]) {
    assertEntry(catalog, "hypo-gpu", kind, {
      freshness: "not_applicable",
      parseability: "not_applicable",
      authority: "manual_or_remote",
    });
  }
});

test("artifact catalog records secret refs and infrastructure facts without reading raw secret files", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-artifact-catalog-secret-"));
  const skillRoot = join(root, "skills", "hypo-image");
  const secretFile = join(root, "private", "hypo-image.env");
  await mkdir(skillRoot, { recursive: true });
  await mkdir(join(root, "private"), { recursive: true });
  await writeFile(join(skillRoot, "SKILL.md"), "# hypo-image\n\nUses GPT image proxy through a private config ref.\n", "utf8");
  await writeFile(secretFile, "OPENAI_API_KEY=raw-secret-value-that-must-never-appear\nnot: [valid\n", "utf8");
  await chmod(secretFile, 0o000);

  try {
    const catalog = await scanArtifactCatalog(workspaceAuthority([
      {
        id: "hypo-image",
        type: "skill",
        status: "current",
        display_name: "hypo-image",
        local: { path: skillRoot },
        service_config_refs: [
          {
            id: "hypo-image-private-env",
            path: secretFile,
            store_ref: "local_secret:hypo_image_proxy",
          },
        ],
        infrastructure: {
          runtime: "codex-skill",
          wrapper: "gpt_image_cli",
          health_check: "manual",
        },
        secret_refs: ["hypo-image-proxy"],
      },
    ]), { now: "2026-05-19T16:00:00+08:00" });

    assertEntry(catalog, "hypo-image", "skill_spec", {
      path: "SKILL.md",
      freshness: "current",
      parseability: "current",
      projection: "summary",
    });
    assertEntry(catalog, "hypo-image", "service_config_ref", {
      path: secretFile,
      freshness: "unknown",
      parseability: "not_applicable",
      sensitivity: "secret_ref",
      projection: "none",
    });
    assertEntry(catalog, "hypo-image", "infrastructure_fact", {
      path: "workspace:objects.hypo-image.infrastructure",
      freshness: "current",
      parseability: "current",
      sensitivity: "internal",
    });
    assert.doesNotMatch(JSON.stringify(catalog), /raw-secret-value-that-must-never-appear|OPENAI_API_KEY=raw-secret/);
  } finally {
    await chmod(secretFile, 0o600);
  }
});

function workspaceAuthority(objects) {
  return {
    schema_version: "1",
    workspace: {
      id: "artifact-catalog-fixture",
      display_name: "Artifact Catalog Fixture",
      roots: [],
      authority: "workspace_yaml",
      updated_at: "2026-05-19T15:30:00+08:00",
    },
    objects,
    relations: [],
    sync_targets: [],
    policies: [],
    secret_refs: [
      {
        id: "hypo-image-proxy",
        provider: "openai-compatible-image-proxy",
        store_ref: "local_secret:hypo_image_proxy",
        purpose: "Image generation proxy config",
        value_policy: "raw_value_never_projected",
      },
    ],
    derived_views: {
      projects_yaml: {
        path: "~/.hypo-workflow/projects.yaml",
        authority: "derived_from_workspace",
      },
    },
  };
}

function workflowObject(id, path, overrides = {}) {
  return {
    id,
    type: "project",
    status: "current",
    display_name: id,
    local: {
      path,
      state_authority: ".pipeline/state.yaml",
      artifact_authority: ".pipeline",
    },
    ...overrides,
  };
}

async function createCurrentWorkflowProject(project) {
  await mkdir(join(project, ".pipeline", "prompts"), { recursive: true });
  await mkdir(join(project, ".pipeline", "reports"), { recursive: true });
  await mkdir(join(project, ".pipeline", "archives", "C01"), { recursive: true });
  await mkdir(join(project, ".pipeline", "knowledge", "index"), { recursive: true });
  await mkdir(join(project, "docs"), { recursive: true });

  await writeConfig(join(project, ".pipeline", "state.yaml"), {
    pipeline: { name: "Hypo-Info-V2", status: "pending_acceptance", prompts_completed: 6, prompts_total: 6 },
    current: { cycle: "C3", milestone: "M06", step: "await_acceptance" },
    updated_at: "2026-05-19T15:00:00+08:00",
  });
  await writeConfig(join(project, ".pipeline", "cycle.yaml"), {
    id: "C3",
    status: "pending_acceptance",
    milestones: [{ id: "M06", status: "completed" }],
  });
  await writeConfig(join(project, ".pipeline", "log.yaml"), {
    entries: [{ id: "m6", type: "milestone_complete", status: "completed", timestamp: "2026-05-19T15:10:00+08:00" }],
  });
  await writeConfig(join(project, ".pipeline", "rules.yaml"), {
    rules: [{ id: "prefer-chinese-output", severity: "warn" }],
  });
  await writeFile(join(project, ".pipeline", "PROGRESS.md"), "# Progress\n\nM06 completed and awaiting acceptance.\n", "utf8");
  await writeFile(join(project, ".pipeline", "architecture.md"), "# Architecture\n\nCurrent architecture.\n", "utf8");
  await writeFile(join(project, ".pipeline", "prompts", "01-artifact-catalog-scanner.md"), "# Prompt\n", "utf8");
  await writeFile(join(project, ".pipeline", "reports", "C03-M06.md"), "# Report\n", "utf8");
  await writeFile(join(project, ".pipeline", "archives", "C01", "summary.md"), "# Archive\n", "utf8");
  await writeFile(join(project, ".pipeline", "knowledge", "knowledge.compact.md"), "# Knowledge Compact\n", "utf8");
  await writeFile(join(project, "docs", "guide.md"), "# Guide\n", "utf8");
  await writeFile(join(project, "README.md"), "# Hypo-Info-V2\n", "utf8");
  await writeFile(join(project, "PROJECT-SUMMARY.md"), "# Project Summary\n\nPlanning snapshot from before C3 completion.\n", "utf8");

  const stale = new Date("2026-05-18T10:00:00+08:00");
  const current = new Date("2026-05-19T15:00:00+08:00");
  await utimes(join(project, "PROJECT-SUMMARY.md"), stale, stale);
  for (const relative of [".pipeline/state.yaml", ".pipeline/PROGRESS.md", ".pipeline/log.yaml"]) {
    await utimes(join(project, relative), current, current);
  }
}

function assertCatalogShape(catalog) {
  assert.ok(catalog && typeof catalog === "object");
  assert.equal(Array.isArray(catalog.entries), true);
  assert.ok(catalog.entries.length > 0);
  for (const entry of catalog.entries) {
    for (const field of REQUIRED_ENTRY_FIELDS) {
      assert.ok(Object.hasOwn(entry, field), `missing ${field} in ${JSON.stringify(entry)}`);
    }
    assert.equal(Array.isArray(entry.evidence_refs), true, `${entry.artifact_id} evidence_refs must be an array`);
  }
}

function assertKinds(catalog, objectId, kinds) {
  const available = new Set(catalog.entries.filter((entry) => entry.object_id === objectId).map((entry) => entry.kind));
  for (const kind of kinds) {
    assert.equal(available.has(kind), true, `missing ${kind} for ${objectId}`);
  }
}

function assertEntry(catalog, objectId, kind, expected) {
  const entry = catalog.entries.find((item) => {
    if (item.object_id !== objectId || item.kind !== kind) return false;
    if (!expected.path) return true;
    return item.path_or_remote_ref === expected.path || item.path_or_remote_ref.endsWith(expected.path);
  });
  assert.ok(entry, `missing ${kind} for ${objectId} at ${expected.path || "(any path)"}`);
  for (const [key, value] of Object.entries(expected)) {
    if (key === "path") continue;
    assert.equal(entry[key], value, `${objectId} ${kind} ${key}`);
  }
  return entry;
}
