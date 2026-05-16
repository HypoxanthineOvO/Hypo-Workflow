import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { commandMap, checkSkillQuality, loadRulesSummary } from "../src/index.js";

test("checkSkillQuality reports malformed skill fixtures", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-skill-quality-"));
  await mkdir(join(dir, "skills", "bad"), { recursive: true });
  await writeFile(
    join(dir, "skills", "bad", "SKILL.md"),
    [
      "# /hypo-workflow:bad",
      "",
      "## Preconditions",
      "",
      "## Execution Flow",
      "",
      "## Reference Files",
      "",
      "- `references/missing.md`",
      "",
    ].join("\n"),
  );

  const result = await checkSkillQuality({
    repoRoot: dir,
    skills: ["skills/bad/SKILL.md"],
    commandSkills: [],
  });

  assert.equal(result.ok, false);
  assert.match(result.summary, /3 issue/);
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ["missing-frontmatter", "missing-output-language-rules", "missing-reference-file"],
  );
});

test("checkSkillQuality rejects child skill references to shared root assets as child-local assets", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-skill-quality-"));
  await mkdir(join(dir, "assets"), { recursive: true });
  await mkdir(join(dir, "skills", "cycle"), { recursive: true });
  await writeFile(join(dir, "assets", "state-init.yaml"), "pipeline:\n  status: idle\n");
  await writeFile(
    join(dir, "skills", "cycle", "SKILL.md"),
    [
      "---",
      "name: cycle",
      "description: Test fixture.",
      "---",
      "",
      "# /hypo-workflow:cycle",
      "## 输出语言规则",
      "",
      "📌 输出语言规则：",
      "",
      "## `/hw:cycle new`",
      "",
      "1. 从 `assets/state-init.yaml` 重置 `.pipeline/state.yaml`。",
      "",
    ].join("\n"),
  );

  const result = await checkSkillQuality({
    repoRoot: dir,
    skills: ["skills/cycle/SKILL.md"],
    commandSkills: [],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ["child-skill-shared-asset-path"],
  );
  assert.equal(result.issues[0].path, "skills/cycle/SKILL.md");
  assert.match(result.issues[0].message, /assets\/state-init\.yaml/);
  assert.match(result.issues[0].message, /\.\.\/\.\.\/assets\/state-init\.yaml/);
});

test("checkSkillQuality allows child-local asset, reference, and script paths", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-skill-quality-"));
  await mkdir(join(dir, "skills", "local", "assets"), { recursive: true });
  await mkdir(join(dir, "skills", "local", "references"), { recursive: true });
  await mkdir(join(dir, "skills", "local", "scripts"), { recursive: true });
  await writeFile(join(dir, "skills", "local", "assets", "state-init.yaml"), "pipeline:\n  status: idle\n");
  await writeFile(join(dir, "skills", "local", "references", "local.md"), "# Local reference\n");
  await writeFile(join(dir, "skills", "local", "scripts", "local.sh"), "#!/usr/bin/env bash\n");
  await writeFile(
    join(dir, "skills", "local", "SKILL.md"),
    [
      "---",
      "name: local",
      "description: Test fixture.",
      "---",
      "",
      "# /hypo-workflow:local",
      "## 输出语言规则",
      "",
      "📌 输出语言规则：",
      "",
      "## Execution Flow",
      "",
      "- Read `assets/state-init.yaml`.",
      "- Read `references/local.md`.",
      "- Run `scripts/local.sh`.",
      "",
    ].join("\n"),
  );

  const result = await checkSkillQuality({
    repoRoot: dir,
    skills: ["skills/local/SKILL.md"],
    commandSkills: [],
  });

  assert.equal(result.ok, true);
  assert.equal(result.issues.length, 0);
});

test("checkSkillQuality allows explicit shared root asset paths from child skills", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-skill-quality-"));
  await mkdir(join(dir, "assets"), { recursive: true });
  await mkdir(join(dir, "skills", "cycle"), { recursive: true });
  await writeFile(join(dir, "assets", "state-init.yaml"), "pipeline:\n  status: idle\n");
  await writeFile(
    join(dir, "skills", "cycle", "SKILL.md"),
    [
      "---",
      "name: cycle",
      "description: Test fixture.",
      "---",
      "",
      "# /hypo-workflow:cycle",
      "## 输出语言规则",
      "",
      "📌 输出语言规则：",
      "",
      "## Execution Flow",
      "",
      "- Read `../../assets/state-init.yaml`.",
      "",
    ].join("\n"),
  );

  const result = await checkSkillQuality({
    repoRoot: dir,
    skills: ["skills/cycle/SKILL.md"],
    commandSkills: [],
  });

  assert.equal(result.ok, true);
  assert.equal(result.issues.length, 0);
});

test("checkSkillQuality accepts current repository skills and watchdog exception", async () => {
  const result = await checkSkillQuality();

  assert.equal(result.ok, true);
  assert.equal(result.issues.length, 0);
  assert.ok(result.stats.localSkills >= 35, `localSkills=${result.stats.localSkills} should be >= 35`);
  assert.ok(result.stats.userFacingCommands >= 35, `userFacingCommands=${result.stats.userFacingCommands} should be >= 35`);
  assert.ok(result.stats.userFacingSkillPaths >= 35, `userFacingSkillPaths=${result.stats.userFacingSkillPaths} should be >= 35`);
  assert.equal(result.stats.internalSkills, 1);
  assert.ok(result.internalSkills.includes("skills/watchdog/SKILL.md"));

  for (const command of commandMap("opencode")) {
    assert.ok(result.skillPaths.includes(command.skill), `${command.skill} should be checked`);
  }
});

test("skill-quality rule is available in rules summary and presets", async () => {
  const summary = await loadRulesSummary(".", ".");

  assert.match(summary, /skill-quality\tquality\twarn/);
  assert.match(summary, /readme-freshness/);
});
