import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  archiveExploration,
  buildExplorePlanContext,
  createExploration,
  createExploreAnalysisContext,
  endExploration,
  listExplorations,
  parseYaml,
  readExploration,
  writeConfig,
} from "../src/index.js";

test("explore status lists active explorations without collapsing parallel worktrees", async () => {
  const root = await gitFixture();
  const home = join(await mkdtemp(join(tmpdir(), "hw-explore-life-home-")), "home");

  const first = await createExploration(root, {
    topic: "Check config drift",
    homeDir: home,
    now: "2026-05-03T02:20:00+08:00",
  });
  const second = await createExploration(root, {
    topic: "Prototype upgrade path",
    homeDir: home,
    allowDirty: true,
    now: "2026-05-03T02:21:00+08:00",
  });

  const explorations = await listExplorations(root);
  assert.deepEqual(explorations.map((item) => item.id), ["E001", "E002"]);
  assert.equal(explorations[0].status, "active");
  assert.equal(explorations[1].status, "active");
  assert.notEqual(first.exploration.worktree_path, second.exploration.worktree_path);
  assert.match(await readFile("skills/explore/SKILL.md", "utf8"), /\/hw:explore status/);
});

test("explore end summarizes changed files and commits while retaining worktree", async () => {
  const root = await gitFixture();
  const home = join(await mkdtemp(join(tmpdir(), "hw-explore-end-home-")), "home");
  const started = await createExploration(root, {
    topic: "Try lifecycle summary",
    homeDir: home,
    now: "2026-05-03T02:22:00+08:00",
  });
  await writeFile(join(started.exploration.worktree_path, "idea.md"), "finding\n", "utf8");
  runGit(started.exploration.worktree_path, ["add", "idea.md"]);
  runGit(started.exploration.worktree_path, ["commit", "-m", "record finding"]);

  const ended = await endExploration(root, "E001", {
    outcome: "Useful; build a smaller sync command.",
    findings: ["Config drift is caused by artifact sync gaps."],
    now: "2026-05-03T02:25:00+08:00",
  });

  assert.equal(ended.exploration.status, "ended");
  assert.equal(ended.exploration.ended_at, "2026-05-03T02:25:00+08:00");
  assert.deepEqual(ended.summary.changed_files, ["idea.md"]);
  assert.equal(ended.summary.commits.length, 1);
  assert.match(ended.summary.commits[0].subject, /record finding/);
  assert.match(await readFile(join(root, ".pipeline", "explorations", "E001-try-lifecycle-summary", "summary.md"), "utf8"), /Useful/);
  assert.match(await readFile(join(root, ".pipeline", "log.yaml"), "utf8"), /exploration_end/);

  const status = spawnSync("git", ["-C", started.exploration.worktree_path, "status", "--short"], { encoding: "utf8" });
  assert.equal(status.status, 0, status.stderr);
});

test("explore archive preserves metadata and requires explicit deletion confirmation", async () => {
  const root = await gitFixture();
  const home = join(await mkdtemp(join(tmpdir(), "hw-explore-archive-home-")), "home");
  const started = await createExploration(root, {
    topic: "Archive retained worktree",
    homeDir: home,
    now: "2026-05-03T02:26:00+08:00",
  });
  await endExploration(root, "E001", {
    outcome: "No build needed.",
    now: "2026-05-03T02:27:00+08:00",
  });

  await assert.rejects(
    archiveExploration(root, "E001", { deleteWorktree: true }),
    /explicit deletion confirmation/i,
  );

  const archived = await archiveExploration(root, "E001", {
    now: "2026-05-03T02:28:00+08:00",
  });
  assert.equal(archived.exploration.status, "archived");
  assert.equal(archived.worktree_retained, true);
  assert.equal(archived.worktree_deleted, false);
  assert.equal((await readExploration(root, "E001")).status, "archived");

  const status = spawnSync("git", ["-C", started.exploration.worktree_path, "status", "--short"], { encoding: "utf8" });
  assert.equal(status.status, 0, status.stderr);
});

test("explore contexts can feed plan discover and analysis without losing evidence", async () => {
  const root = await gitFixture();
  const home = join(await mkdtemp(join(tmpdir(), "hw-explore-context-home-")), "home");
  await createExploration(root, {
    topic: "Assess analysis upgrade",
    homeDir: home,
    now: "2026-05-03T02:29:00+08:00",
  });
  await writeFile(join(root, ".pipeline", "explorations", "E001-assess-analysis-upgrade", "notes.md"), [
    "# Assess analysis upgrade",
    "",
    "## Hypotheses",
    "- Existing context sources are too narrow.",
    "",
    "## Evidence",
    "- Summary should be injectable into plan and analysis.",
    "",
  ].join("\n"), "utf8");
  await endExploration(root, "E001", {
    outcome: "Upgrade to analysis for deeper validation.",
    findings: ["Context source support should accept explore:E001."],
    now: "2026-05-03T02:31:00+08:00",
  });

  const plan = await buildExplorePlanContext(root, "explore:E001");
  assert.equal(plan.source, "explore:E001");
  assert.equal(plan.kind, "plan_context");
  assert.match(plan.discover_context, /Assess analysis upgrade/);
  assert.match(plan.discover_context, /Context source support/);
  assert.match(plan.discover_context, /Summary should be injectable into plan and analysis/);

  const analysis = await createExploreAnalysisContext(root, "E001", {
    now: "2026-05-03T02:32:00+08:00",
  });
  assert.equal(analysis.context.source, "explore:E001");
  assert.deepEqual(analysis.context.hypotheses, ["Existing context sources are too narrow."]);
  assert.match(analysis.context.summary, /Upgrade to analysis/);
  assert.equal(analysis.path, ".pipeline/analysis/explore-E001-context.yaml");
  const persisted = parseYaml(await readFile(join(root, analysis.path), "utf8"));
  assert.equal(persisted.source, "explore:E001");
  assert.match(await readFile("skills/explore/SKILL.md", "utf8"), /upgrade analysis/);
});

async function gitFixture() {
  const root = await mkdtemp(join(tmpdir(), "hw-explore-life-git-"));
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Explore Lifecycle Fixture" },
  });
  await writeFile(join(root, "README.md"), "# fixture\n", "utf8");
  runGit(root, ["init", "-b", "main"]);
  runGit(root, ["config", "user.email", "test@example.com"]);
  runGit(root, ["config", "user.name", "Test User"]);
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "-m", "initial"]);
  return root;
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}
