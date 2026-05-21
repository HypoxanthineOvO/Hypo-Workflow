import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as api from "../src/index.js";

const REQUIRED_LAYERED_CONFIG_EXPORTS = [
  "loadLayeredConfig",
  "buildConfigMigrationPlan",
  "renderConfigMigrationPrompt",
  "writeUserConfigMigration",
];

test("layered config resolves project > user > safe defaults and records sources", async () => {
  requireApiExports(REQUIRED_LAYERED_CONFIG_EXPORTS);
  const root = await fixtureProjectRoot();
  const home = await fixtureHome({
    "output.timezone": "America/New_York",
    "integrations.hypo_writer.root": "/tmp/user/Hypo-Writer",
    "integrations.hypo_claw.root": "/tmp/user/Hypo-Claw",
    "projects[0].id": "user-only",
  });
  await writeFile(join(root, ".pipeline", "config.yaml"), [
    "output:",
    "  timezone: Europe/Berlin",
    "integrations:",
    "  hypo_writer:",
    "    root: /tmp/project/Hypo-Writer",
    "project_linkage:",
    "  seeds:",
    "    - id: project-seed",
    "      path: /tmp/project/Seed",
    "",
  ].join("\n"), "utf8");

  const result = await api.loadLayeredConfig({
    projectRoot: root,
    homeDir: home,
  });
  const config = result.config || result;

  assert.equal(config.output.timezone, "Europe/Berlin");
  assert.equal(config.integrations.hypo_writer.root, "/tmp/project/Hypo-Writer");
  assert.equal(config.integrations.hypo_claw.root, "/tmp/user/Hypo-Claw");
  assert.equal(config.execution.default_mode, "self");
  assert.deepEqual(result.sources?.authority_order, [
    "project:.pipeline/config.yaml",
    "user:~/.hypo-workflow/config.yaml",
    "defaults",
  ]);
  assert.equal(result.sources?.output?.timezone, "project");
  assert.equal(result.sources?.integrations?.hypo_claw?.root, "user");
  assert.equal(result.sources?.execution?.default_mode, "defaults");
});

test("integration defaults cover local projects without embedding /home/heyx", async () => {
  requireApiExports(["loadLayeredConfig"]);
  const root = await fixtureProjectRoot();
  const home = await fixtureHome();

  const result = await api.loadLayeredConfig({ projectRoot: root, homeDir: home });
  const config = result.config || result;

  assert.ok(config.integrations?.hypo_claw, "missing integrations.hypo_claw");
  assert.ok(config.integrations?.hypo_writer, "missing integrations.hypo_writer");
  assert.ok(Array.isArray(config.projects), "missing projects[] integration registry");
  assert.ok(config.projects.some((project) => project.id === "hypo-workflow"));
  assert.ok(config.projects.some((project) => project.id === "hypo-writer"));
  assert.ok(config.output?.timezone, "missing output.timezone");
  assert.ok(Array.isArray(config.project_linkage?.seeds), "missing project linkage seeds");

  const serialized = JSON.stringify({
    integrations: config.integrations,
    projects: config.projects,
    output: config.output,
    project_linkage: config.project_linkage,
  });
  assert.doesNotMatch(serialized, /\/home\/heyx/);
});

test("migration plan is dry-run by default and renders explicit sync/start prompt", async () => {
  requireApiExports(["buildConfigMigrationPlan", "renderConfigMigrationPrompt"]);
  const home = await fixtureHome();
  const userConfigFile = join(home, ".hypo-workflow", "config.yaml");

  const plan = await api.buildConfigMigrationPlan({
    homeDir: home,
    legacyDefaults: {
      integrations: {
        hypo_claw: { root: "/tmp/legacy/Hypo-Claw" },
        hypo_writer: { root: "/tmp/legacy/Hypo-Writer" },
      },
      projects: [{ id: "hypo-workflow", path: "/tmp/legacy/Hypo-Workflow" }],
      output: { timezone: "Asia/Shanghai" },
      project_linkage: { seeds: [{ id: "hypo-writer", path: "/tmp/legacy/Hypo-Writer" }] },
    },
  });

  assert.equal(plan.dry_run, true);
  assert.equal(plan.would_write, userConfigFile);
  assert.match(plan.content || plan.yaml || "", /hypo_claw:/);
  assert.match(plan.content || plan.yaml || "", /hypo_writer:/);
  await assert.rejects(stat(userConfigFile), { code: "ENOENT" });

  const prompt = api.renderConfigMigrationPrompt(plan, { command: "sync" });
  assert.match(prompt, /hypo-workflow config migrate|config migrate/i);
  assert.match(prompt, /sync|start/i);
  assert.match(prompt, /will not write|不会.*写|不会.*生成|no silent write/i);
});

test("only explicit migration write API creates user config; sync CLI does not", async () => {
  requireApiExports(["writeUserConfigMigration", "buildConfigMigrationPlan"]);
  const root = await fixtureProjectRoot();
  const home = await fixtureHome();
  const userConfigFile = join(home, ".hypo-workflow", "config.yaml");

  const sync = spawnSync(process.execPath, [
    "cli/bin/hypo-workflow",
    "sync",
    "--platform",
    "opencode",
    "--project",
    root,
  ], {
    cwd: ".",
    encoding: "utf8",
    env: { ...process.env, HOME: home },
  });
  assert.equal(sync.status, 0, sync.stderr || sync.stdout);
  await assert.rejects(stat(userConfigFile), { code: "ENOENT" });
  assert.match(`${sync.stdout}\n${sync.stderr}`, /config migrate|migration|迁移/i);

  const plan = await api.buildConfigMigrationPlan({
    homeDir: home,
    legacyDefaults: {
      integrations: { hypo_writer: { root: "/tmp/explicit/Hypo-Writer" } },
      projects: [{ id: "hypo-writer", path: "/tmp/explicit/Hypo-Writer" }],
    },
  });
  const written = await api.writeUserConfigMigration(plan, { confirm: true });
  assert.equal(written.path, userConfigFile);
  assert.equal(written.written, true);
  assert.match(await readFile(userConfigFile, "utf8"), /hypo_writer:/);
});

test("runtime source and scripts contain no forbidden /home/heyx paths", async () => {
  const inventory = await api.buildAuditInventory({ cwd: "." });
  const hits = inventory.categories.hardcoded_paths.entries
    .filter((entry) => entry.file.startsWith("core/src/") || entry.file.startsWith("scripts/"));
  const summary = hits
    .slice(0, 12)
    .map((entry) => `${entry.file}:${entry.line} ${entry.match}`)
    .join("\n");

  assert.deepEqual(hits, [], `forbidden /home/heyx runtime paths remain:\n${summary}`);
});

function requireApiExports(names) {
  const missing = names.filter((name) => typeof api[name] !== "function");
  assert.deepEqual(missing, [], `missing expected C17-M2 config API exports: ${missing.join(", ")}`);
}

async function fixtureProjectRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-layered-config-project-"));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeFile(join(root, ".pipeline", "config.yaml"), "pipeline:\n  name: Layered Config Fixture\n", "utf8");
  await writeFile(join(root, ".pipeline", "state.yaml"), "pipeline:\n  status: running\n", "utf8");
  await writeFile(join(root, ".pipeline", "cycle.yaml"), "cycle:\n  id: C17\n", "utf8");
  await writeFile(join(root, ".pipeline", "rules.yaml"), "extends: recommended\n", "utf8");
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), "# Progress\n", "utf8");
  return root;
}

async function fixtureHome(values = {}) {
  const home = await mkdtemp(join(tmpdir(), "hw-layered-config-home-"));
  if (Object.keys(values).length === 0) return home;
  await mkdir(join(home, ".hypo-workflow"), { recursive: true });
  await writeFile(join(home, ".hypo-workflow", "config.yaml"), renderFixtureUserConfig(values), "utf8");
  return home;
}

function renderFixtureUserConfig(values) {
  const lines = [];
  if (values["output.timezone"]) {
    lines.push("output:", `  timezone: ${values["output.timezone"]}`);
  }
  if (values["integrations.hypo_writer.root"] || values["integrations.hypo_claw.root"]) {
    lines.push("integrations:");
    if (values["integrations.hypo_writer.root"]) {
      lines.push("  hypo_writer:", `    root: ${values["integrations.hypo_writer.root"]}`);
    }
    if (values["integrations.hypo_claw.root"]) {
      lines.push("  hypo_claw:", `    root: ${values["integrations.hypo_claw.root"]}`);
    }
  }
  if (values["projects[0].id"]) {
    lines.push("projects:", `  - id: ${values["projects[0].id"]}`, "    path: /tmp/user-only");
  }
  return `${lines.join("\n")}\n`;
}
