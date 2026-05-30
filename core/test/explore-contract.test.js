import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildExploreWorktreePath,
  commandByCanonical,
  createExploration,
  decideExploreDirtyWorktree,
  loadConfig,
  parseYaml,
  writeConfig,
  writeOpenCodeArtifacts,
} from "../src/index.js";

test("explore contract creates metadata and isolated global worktree", async () => {
  const root = await gitFixture();
  const home = join(await mkdtemp(join(tmpdir(), "hw-explore-home-")), "home");

  const result = await createExploration(root, {
    topic: "Try a safer sync strategy",
    homeDir: home,
    now: "2026-05-03T01:50:00+08:00",
  });

  assert.equal(result.exploration.id, "E001");
  assert.equal(result.exploration.slug, "try-a-safer-sync-strategy");
  assert.equal(result.exploration.status, "active");
  assert.equal(result.exploration.source_project.path, root);
  assert.equal(result.exploration.base_branch, "main");
  assert.match(result.exploration.base_commit, /^[0-9a-f]{40}$/);
  assert.equal(result.exploration.explore_branch, "explore/E001-try-a-safer-sync-strategy");
  assert.match(result.exploration.worktree_path, /\.hypo-workflow\/worktrees\/prj-[0-9a-f]{12}\/E001-try-a-safer-sync-strategy$/);
  assert.equal(result.exploration.notes_path, ".pipeline/explorations/E001-try-a-safer-sync-strategy/notes.md");
  assert.equal(result.exploration.summary_path, ".pipeline/explorations/E001-try-a-safer-sync-strategy/summary.md");

  const metadata = parseYaml(await readFile(join(root, ".pipeline", "explorations", "E001-try-a-safer-sync-strategy", "exploration.yaml"), "utf8"));
  assert.equal(metadata.id, "E001");
  assert.equal(metadata.worktree_path, result.exploration.worktree_path);
  assert.match(await readFile(join(root, ".pipeline", "log.yaml"), "utf8"), /exploration_start/);
  assert.match(await readFile(join(root, ".pipeline", "knowledge", "records", `${result.knowledge.record.id}.yaml`), "utf8"), /Try a safer sync strategy/);

  const worktreeStatus = spawnSync("git", ["-C", result.exploration.worktree_path, "status", "--short"], { encoding: "utf8" });
  assert.equal(worktreeStatus.status, 0, worktreeStatus.stderr);
});

test("dirty main worktree requires explicit decision before exploration metadata writes", async () => {
  const root = await gitFixture();
  await writeFile(join(root, "dirty.txt"), "dirty\n", "utf8");

  const decision = await decideExploreDirtyWorktree(root);
  assert.equal(decision.dirty, true);
  assert.equal(decision.requires_decision, true);
  assert.match(decision.summary, /dirty/i);

  await assert.rejects(
    createExploration(root, { topic: "dirty trial", homeDir: join(root, "home") }),
    /dirty worktree requires explicit user decision/i,
  );

  const result = await createExploration(root, {
    topic: "dirty trial",
    homeDir: join(root, "home"),
    allowDirty: true,
    now: "2026-05-03T01:51:00+08:00",
  });
  assert.equal(result.exploration.status, "active");
});

test("explore command map, skill, OpenCode artifact, and worktree path are exposed", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-explore-docs-"));
  await writeOpenCodeArtifacts(root, { profile: "standard" });

  assert.equal(commandByCanonical("/hw:explore").opencode, "/hw:explore");
  assert.equal(commandByCanonical("/hw:explore").agent, "hw-explore");
  assert.match(await readFile("skills/explore/SKILL.md", "utf8"), /E001-slug/);
  assert.match(await readFile(join(root, ".opencode", "commands", "hw:explore.md"), "utf8"), /\/hw:explore/);
  assert.match(await readFile(join(root, ".opencode", "runtime", "hypo-workflow-hooks.js"), "utf8"), /\.hypo-workflow\/worktrees/);

  const config = await loadConfig(".pipeline/config.yaml");
  const path = buildExploreWorktreePath("/repo/project", "E123-topic", { homeDir: "/home/hw" });
  assert.match(path, /^\/home\/hw\/\.hypo-workflow\/worktrees\/prj-[0-9a-f]{12}\/E123-topic$/);
  assert.equal(config.batch.default_gate, "auto");
});

async function gitFixture() {
  const root = await mkdtemp(join(tmpdir(), "hw-explore-git-"));
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Explore Fixture" },
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
