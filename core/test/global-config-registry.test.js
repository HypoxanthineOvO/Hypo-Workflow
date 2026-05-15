import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  DEFAULT_GLOBAL_CONFIG,
  buildModelPoolOpenCodeAgents,
  loadConfig,
  loadGlobalConfigForSave,
  loadProjectRegistry,
  projectRegistryId,
  registerProject,
  saveMigratedGlobalConfig,
  writeConfig,
  writeOpenCodeArtifacts,
} from "../src/index.js";

test("default global config exposes model pool, acceptance, sync, and knowledge defaults", () => {
  assert.deepEqual(Object.keys(DEFAULT_GLOBAL_CONFIG.model_pool.roles), [
    "plan",
    "implement",
    "review",
    "evaluate",
    "chat",
  ]);
  assert.equal(DEFAULT_GLOBAL_CONFIG.model_pool.roles.plan.primary, "deepseek-v4-pro");
  assert.deepEqual(DEFAULT_GLOBAL_CONFIG.model_pool.roles.implement.fallback, ["deepseek-v4-pro", "mimo-v2.5-pro"]);
  assert.equal(DEFAULT_GLOBAL_CONFIG.acceptance.mode, "auto");
  assert.equal(DEFAULT_GLOBAL_CONFIG.acceptance.require_user_confirm, false);
  assert.equal(DEFAULT_GLOBAL_CONFIG.sync.platforms.opencode.profile, "standard");
  assert.equal(DEFAULT_GLOBAL_CONFIG.sync.platforms.opencode.auto_continue_mode, "safe");
  assert.equal(DEFAULT_GLOBAL_CONFIG.knowledge.loading.records, false);
});

test("model pool maps roles to the OpenCode agent matrix without breaking overrides", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-model-pool-"));
  const file = join(dir, "config.yaml");
  await writeConfig(file, {
    model_pool: {
      roles: {
        plan: { primary: "plan-model", fallback: ["plan-fallback"] },
        implement: { primary: "impl-model", fallback: ["impl-fallback"] },
        review: { primary: "review-model", fallback: ["review-fallback"] },
        evaluate: { primary: "eval-model", fallback: ["eval-fallback"] },
        chat: { primary: "chat-model", fallback: ["chat-fallback"] },
      },
    },
    opencode: {
      agents: {
        compact: { model: "explicit-compact" },
      },
    },
  });

  const loaded = await loadConfig(file);
  const agents = buildModelPoolOpenCodeAgents(loaded);
  assert.equal(agents.plan.model, "plan-model");
  assert.equal(agents["code-a"].model, "impl-model");
  assert.equal(agents["code-b"].model, "impl-fallback");
  assert.equal(agents.debug.model, "review-model");
  assert.equal(agents.docs.model, "review-fallback");
  assert.equal(agents.report.model, "eval-model");
  assert.equal(agents.compact.model, "explicit-compact");

  await writeOpenCodeArtifacts(dir, { config: loaded });
  const buildAgent = await readFile(join(dir, ".opencode", "agents", "hw-build.md"), "utf8");
  const codeBAgent = await readFile(join(dir, ".opencode", "agents", "hw-code-b.md"), "utf8");
  const metadata = JSON.parse(await readFile(join(dir, ".opencode", "hypo-workflow.json"), "utf8"));
  assert.match(buildAgent, /^model: impl-model$/m);
  assert.match(codeBAgent, /^model: impl-fallback$/m);
  assert.equal(metadata.model_pool.roles.implement.primary, "impl-model");
});

test("lazy global config migration does not rewrite on read and backs up on save", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-global-migration-"));
  const file = join(dir, "config.yaml");
  await writeConfig(file, {
    version: "10.0.1",
    opencode: {
      agents: {
        plan: { model: "legacy-plan" },
        "code-a": { model: "legacy-code" },
      },
    },
    profiles: {
      custom: { platform: "opencode", model: "custom", opencodeProfile: "standard" },
    },
  });
  const before = (await stat(file)).mtimeMs;

  const loaded = await loadGlobalConfigForSave(file);
  const afterRead = (await stat(file)).mtimeMs;
  assert.equal(afterRead, before);
  assert.equal(loaded.config.model_pool.roles.plan.primary, "legacy-plan");
  assert.equal(loaded.config.model_pool.roles.implement.primary, "legacy-code");
  assert.equal(loaded.config.profiles.custom.model, "custom");
  assert.equal(loaded.needsMigration, true);

  await saveMigratedGlobalConfig(file, loaded.config, { now: "2026-05-02T22:10:00+08:00" });
  const files = await readdir(dir);
  assert.ok(files.some((name) => /^config\.yaml\.bak\.20260502T221000/.test(name)));

  const saved = await loadConfig(file);
  assert.equal(saved.version, DEFAULT_GLOBAL_CONFIG.version);
  assert.equal(saved.model_pool.roles.plan.primary, "legacy-plan");
  assert.equal(saved.profiles.custom.opencodeProfile, "standard");
});

test("project registry has stable IDs and persists project status summaries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-registry-"));
  const home = join(dir, "home");
  const project = join(dir, "project");
  const registryFile = join(home, ".hypo-workflow", "projects.yaml");

  const firstId = projectRegistryId(project);
  const secondId = projectRegistryId(`${project}/`);
  assert.equal(firstId, secondId);

  const result = await registerProject(registryFile, {
    path: project,
    display_name: "Registry Project",
    platform: "opencode",
    profile: "standard",
    current_cycle: "C4",
    pipeline_status: "running",
    open_patch_count: 2,
    acceptance: { mode: "confirm", state: "pending" },
  });
  assert.equal(result.project.id, firstId);

  const registry = await loadProjectRegistry(registryFile);
  assert.equal(registry.projects.length, 1);
  assert.equal(registry.projects[0].display_name, "Registry Project");
  assert.equal(registry.projects[0].acceptance.state, "pending");
});

test("init-project registers initialized projects in ~/.hypo-workflow/projects.yaml", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-init-registry-"));
  const home = join(dir, "home");
  const project = join(dir, "project");

  execFileSync(process.execPath, ["cli/bin/hypo-workflow", "init-project", "--platform", "opencode", "--project", project], {
    cwd: ".",
    env: { ...process.env, HOME: home },
    stdio: "pipe",
  });

  const registry = await loadProjectRegistry(join(home, ".hypo-workflow", "projects.yaml"));
  assert.equal(registry.projects.length, 1);
  assert.equal(registry.projects[0].path, project);
  assert.equal(registry.projects[0].platform, "opencode");
  assert.equal(registry.projects[0].pipeline_status, "initialized");
  assert.equal(registry.projects[0].acceptance.mode, DEFAULT_GLOBAL_CONFIG.acceptance.mode);
});

test("config schema and spec document model pool, migration, and registry fields", async () => {
  const schema = await readFile("config.schema.yaml", "utf8");
  const spec = await readFile("references/config-spec.md", "utf8");

  for (const phrase of [
    "model_pool",
    "acceptance",
    "sync",
    "project_registry",
    "auto_continue_mode",
  ]) {
    assert.match(schema, new RegExp(phrase));
    assert.match(spec, new RegExp(phrase));
  }

  assert.match(spec, /## Model Pool And OpenCode Matrix/);
  assert.match(spec, /## Lazy Global Migration/);
  assert.match(spec, /## Project Registry/);
});
