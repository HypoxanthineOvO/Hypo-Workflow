import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendKnowledgeRecord,
  buildGlobalTuiModel,
  commandByCanonical,
  commandMap,
  runProjectSync,
  runSessionStartLightSyncCheck,
  writeConfig,
} from "../src/index.js";

test("sync command map, skill, and OpenCode artifact are exposed", async () => {
  const root = await fixtureRoot();
  const result = await runProjectSync(root, { mode: "standard" });

  assert.equal(commandMap("opencode").length, 54);
  assert.equal(commandByCanonical("/hw:sync").opencode, "/hw:sync");
  assert.equal(commandByCanonical("/hw:sync").agent, "hw-build");
  assert.match(await readFile("skills/sync/SKILL.md", "utf8"), /--light/);
  const rootConfig = JSON.parse(await readFile(join(root, "opencode.json"), "utf8"));
  assert.match(rootConfig.command["hw:sync"].template, /skills\/sync\/SKILL\.md/);
  assert.match(rootConfig.command["hw:goal"].template, /skills\/goal\/SKILL\.md/);
  assert.ok(result.operations.includes("opencode_artifacts"));
});

test("light sync refreshes registry and knowledge indexes without adapter writes", async () => {
  const root = await fixtureRoot();
  const home = join(await mkdtemp(join(tmpdir(), "hw-sync-home-")), "home");
  const registryFile = join(home, ".hypo-workflow", "projects.yaml");
  await writeConfig(registryFile, {
    schema_version: "1",
    projects: [
      {
        id: "prj-demo",
        display_name: "Demo",
        path: root,
        platform: "opencode",
        profile: "standard",
      },
    ],
  });
  await appendKnowledgeRecord(root, {
    type: "sync",
    source: { sync_id: "S001" },
    created_at: "2026-05-03T02:40:00+08:00",
    summary: "Sync source changed.",
    details: {},
    tags: ["sync"],
    categories: ["config-notes"],
    refs: { files: [".pipeline/config.yaml"] },
  });

  const result = await runProjectSync(root, {
    mode: "light",
    registryFile,
    now: "2026-05-03T02:41:00+08:00",
  });

  assert.equal(result.mode, "light");
  assert.equal(result.heavy, false);
  assert.ok(result.operations.includes("registry_refresh"));
  assert.ok(result.operations.includes("knowledge_refresh"));
  assert.ok(result.operations.includes("external_change_detection"));
  assert.equal(await exists(join(root, "opencode.json")), false);
  assert.match(await readFile(join(root, ".pipeline", "knowledge", "knowledge.compact.md"), "utf8"), /Sync source changed/);
  assert.match(await readFile(registryFile, "utf8"), /pipeline_status/);
});

test("standard and deep sync share core logic with CLI sync", async () => {
  const standardRoot = await fixtureRoot();
  await writeFile(join(standardRoot, ".pipeline", "PROGRESS.md"), "# Progress\n\nrecent event\n", "utf8");
  const standard = await runProjectSync(standardRoot, { mode: "standard" });

  assert.equal(standard.mode, "standard");
  assert.ok(standard.operations.includes("light_sync"));
  assert.ok(standard.operations.includes("opencode_artifacts"));
  assert.ok(standard.operations.includes("config_check"));
  assert.ok(standard.operations.includes("compact_refresh"));
  assert.match(await readFile(join(standardRoot, ".pipeline", "PROGRESS.compact.md"), "utf8"), /recent event/);

  const deepRoot = await fixtureRoot();
  await writeFile(join(deepRoot, "package.json"), JSON.stringify({ dependencies: { ink: "^5.0.0" } }, null, 2), "utf8");
  const deep = await runProjectSync(deepRoot, { mode: "deep" });
  assert.equal(deep.mode, "deep");
  assert.equal(deep.heavy, true);
  assert.ok(deep.operations.includes("dependency_scan"));
  assert.equal(deep.dependency_scan.dependencies.ink, "^5.0.0");
  assert.match(deep.architecture_hint, /rescan/i);

  const cliRoot = await fixtureRoot();
  const cliHome = await mkdtemp(join(tmpdir(), "hw-sync-cli-home-"));
  const lightOutput = execFileSync(process.execPath, ["cli/bin/hypo-workflow", "sync", "--light", "--project", cliRoot], {
    cwd: ".",
    env: { ...process.env, HOME: cliHome },
    encoding: "utf8",
  });
  assert.match(lightOutput, /mode=light/);
  assert.equal(await exists(join(cliRoot, "opencode.json")), false);

  const standardOutput = execFileSync(process.execPath, ["cli/bin/hypo-workflow", "sync", "--project", cliRoot], {
    cwd: ".",
    env: { ...process.env, HOME: cliHome },
    encoding: "utf8",
  });
  assert.match(standardOutput, /mode=standard/);
  const cliRootConfig = JSON.parse(await readFile(join(cliRoot, "opencode.json"), "utf8"));
  assert.ok(cliRootConfig.command["hw:sync"]);
});

test("SessionStart light sync detects drift without writes and TUI exposes explicit sync action", async () => {
  const root = await fixtureRoot();
  runGit(root, ["init", "-b", "main"]);
  runGit(root, ["config", "user.email", "test@example.com"]);
  runGit(root, ["config", "user.name", "Test User"]);
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "-m", "initial"]);
  await writeFile(join(root, "external.txt"), "changed\n", "utf8");

  const before = await snapshotFiles(root);
  const check = await runSessionStartLightSyncCheck(root);
  const after = await snapshotFiles(root);

  assert.equal(check.mode, "session-start-light");
  assert.equal(check.heavy, false);
  assert.equal(check.prompt_required, true);
  assert.match(check.prompt, /\/hw:sync/);
  assert.deepEqual(after, before);

  const hookOutput = spawnSync("bash", ["-lc", `printf '{"cwd":"${root}"}' | bash hooks/session-start.sh resume`], {
    cwd: ".",
    encoding: "utf8",
  });
  assert.equal(hookOutput.status, 0, hookOutput.stderr);
  assert.match(JSON.parse(hookOutput.stdout).additionalContext, /Sync Light Check/);

  const globalKnowledgeRoot = join(root, ".hw-home", "knowledge", "projections", "projects");
  await mkdir(globalKnowledgeRoot, { recursive: true });
  await writeFile(join(globalKnowledgeRoot, "hw-sync-standard.compact.md"), "# Global Knowledge Projection\n\n- global context\n", "utf8");
  await writeFile(join(globalKnowledgeRoot, "hw-sync-standard.yaml"), "schema_version: 1\nentries: []\n", "utf8");
  const globalHookOutput = spawnSync("bash", ["-lc", `printf '{"cwd":"${root}"}' | HYPO_WORKFLOW_HOME="${join(root, ".hw-home")}" HYPO_WORKFLOW_PROJECT_ID=hw-sync-standard bash hooks/session-start.sh resume`], {
    cwd: ".",
    encoding: "utf8",
  });
  assert.equal(globalHookOutput.status, 0, globalHookOutput.stderr);
  assert.match(JSON.parse(globalHookOutput.stdout).additionalContext, /Global Knowledge compact/);
  assert.match(JSON.parse(globalHookOutput.stdout).additionalContext, /Loaded global knowledge projection compact\/index only/);

  const home = join(await mkdtemp(join(tmpdir(), "hw-sync-tui-home-")), "home");
  const registryFile = join(home, ".hypo-workflow", "projects.yaml");
  await writeConfig(join(home, ".hypo-workflow", "config.yaml"), {});
  await writeConfig(registryFile, {
    schema_version: "1",
    projects: [{ id: "prj-demo", display_name: "Demo", path: root, platform: "opencode", profile: "standard" }],
  });
  const model = await buildGlobalTuiModel({ homeDir: home });
  assert.equal(model.actions.find((action) => action.id === "sync").label, "Sync Project");
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-sync-standard-"));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Sync Fixture" },
    execution: { mode: "self", steps: { preset: "tdd" } },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { status: "running" },
    current: { prompt_name: "M14 / Sync" },
  });
  return root;
}

async function exists(file) {
  try {
    await readFile(file, "utf8");
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function snapshotFiles(root) {
  const files = [];
  async function visit(dir, prefix = "") {
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await visit(join(dir, entry.name), relative);
      } else {
        files.push(relative);
      }
    }
  }
  await visit(root);
  return files.sort();
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}
