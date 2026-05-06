import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { loadConfig, parseYaml } from "../src/index.js";

test("init-project bootstraps non-git projects with automation policy", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-init-non-git-"));
  const result = spawnSync("node", [
    "cli/bin/hypo-workflow",
    "init-project",
    "--platform",
    "opencode",
    "--project",
    root,
    "--automation",
    "full",
  ], { cwd: ".", encoding: "utf8", env: { ...process.env, HOME: await mkdtemp(join(tmpdir(), "hw-home-")) } });

  assert.equal(result.status, 0, result.stderr);
  await stat(join(root, ".pipeline", "config.yaml"));
  await assert.rejects(stat(join(root, ".git")));

  const config = parseYaml(await readFile(join(root, ".pipeline", "config.yaml"), "utf8"));
  assert.equal(config.automation.level, "full");
  assert.deepEqual(Object.keys(config.automation), ["level"]);

  const effective = await loadConfig(join(root, ".pipeline", "config.yaml"));
  assert.equal(effective.automation.gates.planning, "confirm");
  assert.equal(effective.automation.gates.destructive_external, "confirm");
  assert.equal(effective.automation.gates.release_publish, "confirm");
  assert.equal(effective.automation.codex.external_model_routing, false);
  assert.equal(effective.execution.worker_separation.mode, "recommended");
});

test("init-project defaults automation to balanced and rejects invalid levels", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-init-balanced-"));
  const home = await mkdtemp(join(tmpdir(), "hw-home-"));
  const result = spawnSync("node", [
    "cli/bin/hypo-workflow",
    "init-project",
    "--platform",
    "opencode",
    "--project",
    root,
  ], { cwd: ".", encoding: "utf8", env: { ...process.env, HOME: home } });

  assert.equal(result.status, 0, result.stderr);
  const config = parseYaml(await readFile(join(root, ".pipeline", "config.yaml"), "utf8"));
  assert.equal(config.automation.level, "balanced");

  const invalidRoot = await mkdtemp(join(tmpdir(), "hw-init-invalid-"));
  const invalid = spawnSync("node", [
    "cli/bin/hypo-workflow",
    "init-project",
    "--platform",
    "opencode",
    "--project",
    invalidRoot,
    "--automation",
    "reckless",
  ], { cwd: ".", encoding: "utf8", env: { ...process.env, HOME: home } });

  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /Unsupported automation level/);
  await assert.rejects(stat(join(invalidRoot, ".pipeline", "config.yaml")));
});

test("validate-config rejects invalid automation levels", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-init-validator-"));
  const configFile = join(root, "config.yaml");
  await writeFile(configFile, [
    "pipeline:",
    "  name: Validator Fixture",
    "  source: local",
    "  output: local",
    "execution:",
    "  mode: self",
    "  steps:",
    "    preset: tdd",
    "automation:",
    "  level: reckless",
    "",
  ].join("\n"), "utf8");

  const result = spawnSync("bash", ["scripts/validate-config.sh", configFile], {
    cwd: ".",
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /automation.level must be one of: manual, balanced, full/);
});

test("init docs separate normal non-git bootstrap from git-bound history import", async () => {
  const initSkill = await readFile("skills/init/SKILL.md", "utf8");
  const initSpec = await readFile("references/init-spec.md", "utf8");
  const commands = await readFile("references/commands-spec.md", "utf8");
  const combined = `${initSkill}\n${initSpec}\n${commands}`;

  assert.match(combined, /normal `\/hw:init` does not require git/i);
  assert.match(combined, /稳妥模式 \(`manual`\)/);
  assert.match(combined, /自动模式 \(`balanced`\)/);
  assert.match(combined, /全自动模式 \(`full`\)/);
  assert.match(combined, /worker separation mode/i);
  assert.match(combined, /recommended/);
  assert.match(combined, /strict/);
  assert.match(combined, /`\/hw:init --import-history`.*requires git/i);
  assert.match(combined, /git rev-parse --is-inside-work-tree/);
  assert.doesNotMatch(combined, /Codex.*external model/i);
});
