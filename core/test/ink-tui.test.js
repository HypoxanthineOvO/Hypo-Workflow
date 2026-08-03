import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  applyConfigTuiEdit,
  buildConfigTuiModel,
  buildGlobalTuiModel,
  buildReadOnlyProgressDashboardModel,
  loadProjectRegistry,
  renderGlobalTuiSnapshot,
  renderReadOnlyProgressDashboardSnapshot,
  stageConfigTuiEdit,
  writeConfig,
} from "../src/index.js";

test("global TUI model renders project list, detail, config, model pool, and actions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-tui-model-"));
  const home = join(dir, "home");
  const project = join(dir, "project");
  const registryFile = join(home, ".hypo-workflow", "projects.yaml");
  const configFile = join(home, ".hypo-workflow", "config.yaml");

  await writeConfig(configFile, {
    agent: { platform: "opencode", model: "default" },
    model_pool: {
      roles: {
        plan: { primary: "plan-model", fallback: ["plan-fallback"] },
      },
    },
  });
  await writeConfig(registryFile, {
    schema_version: "1",
    projects: [
      {
        id: "prj-demo",
        display_name: "Demo Project",
        path: project,
        platform: "opencode",
        profile: "standard",
        current_cycle: "C4",
        pipeline_status: "running",
        open_patch_count: 2,
        acceptance: { mode: "auto", state: "pending" },
        knowledge: { status: "available" },
      },
    ],
  });

  const model = await buildGlobalTuiModel({ homeDir: home });
  assert.equal(model.projects[0].display_name, "Demo Project");
  assert.equal(model.detail.project.id, "prj-demo");
  assert.equal(model.config.agent.platform, "opencode");
  assert.equal(model.model_pool.roles.plan.primary, "plan-model");
  assert.deepEqual(model.actions.map((action) => action.id), [
    "open",
    "edit-model-pool",
    "add-project",
    "scan-projects",
    "refresh-projects",
    "sync",
    "doctor",
    "quit",
  ]);
  assert.equal(model.detail.acceptance.state, "pending");
  assert.equal(model.detail.knowledge.status, "available");

  const snapshot = renderGlobalTuiSnapshot(model);
  assert.match(snapshot, /Hypo-Workflow Global TUI/);
  assert.match(snapshot, /Demo Project/);
  assert.match(snapshot, /Model Pool/);
  assert.match(snapshot, /Knowledge: available/);
  assert.match(snapshot, /Sync\/Actions/);
  assert.match(snapshot, /Sync Project/);
  assert.doesNotMatch(snapshot, /run pipeline/i);
});

test("no-command CLI routes to setup first, then TUI snapshot when global config exists", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-tui-route-"));
  const home = join(dir, "home");

  const first = execFileSync(process.execPath, ["cli/bin/hypo-workflow"], {
    cwd: ".",
    env: { ...process.env, HOME: home, HW_TUI_SNAPSHOT: "1" },
    encoding: "utf8",
  });
  assert.match(first, /Created .*config\.yaml/);

  const second = execFileSync(process.execPath, ["cli/bin/hypo-workflow"], {
    cwd: ".",
    env: { ...process.env, HOME: home, HW_TUI_SNAPSHOT: "1" },
    encoding: "utf8",
  });
  assert.match(second, /Hypo-Workflow Global TUI/);
  assert.match(second, /Global Config/);
  assert.match(second, /Model Pool/);
});

test("hw alias and Ink dependency are declared in CLI package metadata", async () => {
  const pkg = JSON.parse(await readFile("cli/package.json", "utf8"));
  const lock = JSON.parse(await readFile("cli/package-lock.json", "utf8"));

  assert.equal(pkg.bin["hypo-workflow"], "bin/hypo-workflow");
  assert.equal(pkg.bin.hw, "bin/hypo-workflow");
  assert.ok(pkg.dependencies.ink);
  assert.ok(pkg.dependencies.react);
  assert.equal(lock.packages[""].dependencies.ink, pkg.dependencies.ink);
  assert.equal(lock.packages[""].dependencies.react, pkg.dependencies.react);
});

test("init-project registered projects appear in the TUI snapshot", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-tui-init-"));
  const home = join(dir, "home");
  const project = join(dir, "project");

  execFileSync(process.execPath, ["cli/bin/hypo-workflow", "init-project", "--platform", "opencode", "--project", project], {
    cwd: ".",
    env: { ...process.env, HOME: home },
    stdio: "pipe",
  });

  const registry = await loadProjectRegistry(join(home, ".hypo-workflow", "projects.yaml"));
  assert.equal(registry.projects.length, 1);

  const snapshot = execFileSync(process.execPath, ["cli/bin/hypo-workflow", "tui", "--snapshot"], {
    cwd: ".",
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });
  assert.match(snapshot, new RegExp(registry.projects[0].display_name));
  assert.match(snapshot, /initialized/);
});

test("config TUI model separates global and project targets", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-config-tui-targets-"));
  const home = join(dir, "home");
  const project = join(dir, "project");
  const globalFile = join(home, ".hypo-workflow", "config.yaml");
  const projectFile = join(project, ".pipeline", "config.yaml");

  await writeConfig(globalFile, {
    agent: { platform: "codex", model: "default" },
    plan: { default_mode: "interactive" },
    output: { language: "zh-CN", timezone: "Asia/Shanghai" },
  });
  await writeConfig(projectFile, {
    pipeline: { name: "Target Project", source: "local", output: "local" },
    platform: "auto",
    plan: { mode: "interactive" },
    execution: { mode: "self", steps: { preset: "tdd" } },
    evaluation: { auto_continue: true, max_diff_score: 3 },
  });

  const globalModel = await buildConfigTuiModel({ target: "global", homeDir: home, projectRoot: project });
  const projectModel = await buildConfigTuiModel({ target: "project", homeDir: home, projectRoot: project });

  assert.equal(globalModel.target.id, "global");
  assert.equal(globalModel.target.config_file, globalFile);
  assert.equal(projectModel.target.id, "project");
  assert.equal(projectModel.target.config_file, projectFile);
  assert.equal(globalModel.controls.some((control) => control.path === "agent.platform"), true);
  assert.equal(projectModel.controls.some((control) => control.path === "platform"), true);
  assert.equal(projectModel.controls.some((control) => control.path === "agent.platform"), false);
});

test("config TUI edit stages diff, validates schema values, confirms before writing, and guides sync", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-config-tui-edit-"));
  const home = join(dir, "home");
  const project = join(dir, "project");
  const globalFile = join(home, ".hypo-workflow", "config.yaml");
  const projectFile = join(project, ".pipeline", "config.yaml");

  await writeConfig(globalFile, {
    agent: { platform: "codex", model: "default" },
    dashboard: { enabled: true, port: 7700 },
    output: { language: "zh-CN", timezone: "Asia/Shanghai" },
  });
  await writeConfig(projectFile, {
    pipeline: { name: "Editable Project", source: "local", output: "local" },
    platform: "auto",
    execution: { mode: "self", steps: { preset: "tdd" } },
    evaluation: { auto_continue: true, max_diff_score: 3 },
    opencode: { profile: "standard" },
  });
  await writeConfig(join(project, ".pipeline", "state.yaml"), { pipeline: { status: "running" } });
  await writeConfig(join(project, ".pipeline", "cycle.yaml"), { cycle: { status: "active" } });
  await writeConfig(join(project, ".pipeline", "rules.yaml"), { extends: "recommended" });

  const protectedBefore = await Promise.all([
    readFile(join(project, ".pipeline", "state.yaml"), "utf8"),
    readFile(join(project, ".pipeline", "cycle.yaml"), "utf8"),
    readFile(join(project, ".pipeline", "rules.yaml"), "utf8"),
  ]);

  const staged = await stageConfigTuiEdit({
    target: "project",
    homeDir: home,
    projectRoot: project,
    edits: {
      platform: "codex",
      "opencode.profile": "strict",
      "output.language": "en",
    },
  });

  assert.equal(staged.valid, true);
  assert.equal(staged.target.config_file, projectFile);
  assert.deepEqual(staged.diff.map((entry) => entry.path).sort(), ["opencode.profile", "output.language", "platform"]);
  assert.equal(staged.sync.required, true);
  assert.match(staged.sync.guidance, /hw:sync --light/);
  assert.equal((await readFile(projectFile, "utf8")).includes("profile: strict"), false);

  const applied = await applyConfigTuiEdit(staged, { confirm: true, now: "2026-05-03T23:40:00+08:00" });
  assert.equal(applied.written, true);
  assert.match(await readFile(projectFile, "utf8"), /profile: strict/);
  assert.match(await readFile(projectFile, "utf8"), /language: en/);
  assert.equal((await readFile(globalFile, "utf8")).includes("profile: strict"), false);
  assert.deepEqual(await Promise.all([
    readFile(join(project, ".pipeline", "state.yaml"), "utf8"),
    readFile(join(project, ".pipeline", "cycle.yaml"), "utf8"),
    readFile(join(project, ".pipeline", "rules.yaml"), "utf8"),
  ]), protectedBefore);

  const invalid = await stageConfigTuiEdit({
    target: "project",
    projectRoot: project,
    edits: { platform: "opencode" },
  });
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join("\n"), /platform/);
  assert.doesNotMatch(await readFile(projectFile, "utf8"), /platform: opencode/);

  await assert.rejects(
    () => stageConfigTuiEdit({
      target: "project",
      projectRoot: project,
      configFile: join(project, ".pipeline", "state.yaml"),
      edits: { platform: "codex" },
    }),
    /protected lifecycle file/,
  );
});

test("read-only progress dashboard uses canonical status model fields", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-readonly-dashboard-"));
  const project = join(dir, "project");
  await writeConfig(join(project, ".pipeline", "config.yaml"), {
    pipeline: { name: "Dashboard Project", source: "local", output: "local" },
    platform: "codex",
    execution: { mode: "self", steps: { preset: "tdd" } },
    evaluation: { auto_continue: true, max_diff_score: 3 },
    output: { language: "en", timezone: "UTC" },
    opencode: { profile: "standard", auto_continue: true },
  });
  await writeConfig(join(project, ".pipeline", "state.yaml"), {
    pipeline: { name: "Dashboard Project", status: "running", prompts_total: 2, prompts_completed: 1 },
    current: { phase: "executing", prompt_name: "M02 / F002 - Dashboard", step: "implement" },
    milestones: [
      { id: "M01", feature_id: "F001", status: "done" },
      { id: "M02", feature_id: "F002", status: "in_progress" },
    ],
  });
  await writeConfig(join(project, ".pipeline", "log.yaml"), {
    entries: [
      {
        id: "E1",
        type: "milestone",
        status: "started",
        timestamp: "2026-05-03T23:41:00+08:00",
        summary: "M02 started",
      },
    ],
  });
  await writeConfig(join(project, ".pipeline", "derived-health.yaml"), {
    ok: false,
    stale_count: 1,
    error_count: 0,
    artifacts: [{ id: "progress_compact", path: ".pipeline/PROGRESS.compact.md", status: "stale" }],
  });
  await writeConfig(join(project, ".pipeline", ".lock"), {
    platform: "opencode",
    session_id: "s1",
    heartbeat_at: "2026-05-03T23:41:00+08:00",
    expires_at: "2026-05-04T00:00:00+08:00",
  });

  const dashboard = await buildReadOnlyProgressDashboardModel(project, {
    now: "2026-05-03T23:45:00+08:00",
  });
  assert.equal(dashboard.read_only, true);
  assert.equal(dashboard.phase, "executing");
  assert.equal(dashboard.next_action, "continue_execution");
  assert.equal(dashboard.lease.action, "block");
  assert.equal(dashboard.derived_health.stale_count, 1);
  assert.equal(dashboard.recent_events[0].summary, "M02 started");
  assert.equal(dashboard.active_config.platform, "codex");
  assert.equal(dashboard.active_config.execution_mode, "self");
  assert.equal(dashboard.active_config.preset, "tdd");

  const snapshot = renderReadOnlyProgressDashboardSnapshot(dashboard);
  assert.match(snapshot, /Read-Only Progress Dashboard/);
  assert.match(snapshot, /Phase: executing/);
  assert.match(snapshot, /Next: continue_execution/);
  assert.match(snapshot, /Lease: block/);
  assert.match(snapshot, /Derived: needs_repair stale=1 errors=0/);
  assert.match(snapshot, /M02 started/);
  assert.doesNotMatch(snapshot, /start pipeline/i);
  assert.doesNotMatch(snapshot, /accept cycle/i);
});
