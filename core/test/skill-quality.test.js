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

test("checkSkillQuality accepts current repository skills and watchdog exception", async () => {
  const result = await checkSkillQuality();

  assert.equal(result.ok, true);
  assert.equal(result.issues.length, 0);
  assert.equal(result.stats.localSkills, 39);
  assert.equal(result.stats.userFacingCommands, 39);
  assert.equal(result.stats.userFacingSkillPaths, 37);
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
