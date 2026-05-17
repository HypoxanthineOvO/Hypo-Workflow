import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  runProjectSync,
  writeConfig,
  writeThirdPartyAdapterArtifacts,
} from "../src/index.js";

test("third-party adapter artifacts teach conservative repository installation", async () => {
  const root = await fixtureRoot();
  const result = await writeThirdPartyAdapterArtifacts(root, { platform: "all" });

  assert.deepEqual(result.files.map((file) => file.path).sort(), [
    ".cursor/rules/hypo-workflow.mdc",
    ".github/copilot-instructions.md",
    ".trae/rules/project_rules.md",
  ]);
  assert.deepEqual(result.skill_bundles.map((bundle) => bundle.path), [
    ".cursor/skills",
  ]);

  const cursor = await readFile(join(root, ".cursor", "rules", "hypo-workflow.mdc"), "utf8");
  const copilot = await readFile(join(root, ".github", "copilot-instructions.md"), "utf8");
  const trae = await readFile(join(root, ".trae", "rules", "project_rules.md"), "utf8");
  const cursorRootSkill = await readFile(join(root, ".cursor", "skills", "hypo-workflow.md"), "utf8");
  const cursorStartSkill = await readFile(join(root, ".cursor", "skills", "hw-start.md"), "utf8");
  const cursorStartCommand = await readFile(join(root, ".cursor", "commands", "hw-start.md"), "utf8");
  const cursorCommandsSpec = await readFile(join(root, ".cursor", "hypo-workflow", "references", "commands-spec.md"), "utf8");

  for (const content of [cursor, copilot, trae]) {
    assert.match(content, /HypoxanthineOvO\/Hypo-Workflow/);
    assert.match(content, /not a runner/i);
    assert.match(content, /\.pipeline\//);
    assert.match(content, /\/hw:init/);
    assert.match(content, /\/hw:plan/);
    assert.match(content, /\/hw:start/);
    assert.match(content, /\/hw:resume/);
    assert.match(content, /\/hw:status/);
    assert.match(content, /protected files/i);
    assert.match(content, /preflight/i);
    assert.match(content, /implementation and testing\/review/i);
    assert.match(content, /Codex\/GPT runtime/i);
    assert.doesNotMatch(content, /guaranteed hook|lifecycle enforcement|auto-install/i);
    assert.doesNotMatch(content, /deepseek|mimo|claude model/i);
  }
  assert.match(cursor, /^---\ndescription:/);
  assert.match(cursor, /Cursor Skills And Commands/);
  assert.match(cursor, /\.cursor\/skills\/hw-\*\.md/);
  assert.match(cursorRootSkill, /name: hypo-workflow/);
  assert.match(cursorRootSkill, /\.cursor\/skills\/hw-start\.md/);
  assert.match(cursorRootSkill, /Cursor UI\/session/);
  assert.match(cursorStartSkill, /\/hw:start/);
  assert.match(cursorStartSkill, /Embedded authority source: `skills\/start\/SKILL\.md`/);
  assert.match(cursorStartSkill, /\.cursor\/skills\/hypo-workflow\.md/);
  assert.match(cursorStartSkill, /Cursor chooses the active model in the UI\/session/);
  assert.match(cursorStartCommand, /\.cursor\/skills\/hw-start\.md/);
  assert.match(cursorCommandsSpec, /\/hw:start/);
  assert.ok(result.skill_bundles[0].source_paths.includes("references/commands-spec.md"));
  assert.ok(result.skill_bundles[0].source_paths.includes("references/skill-spec.md"));
  assert.ok(!result.skill_bundles[0].source_paths.includes("config.schema.yaml"));
  assert.ok(!result.skill_bundles[0].source_paths.includes("references/config-spec.md"));
  assert.equal(await exists(join(root, ".cursor", "hypo-workflow", "skills", "start", "SKILL.md")), false);
  assert.equal(await exists(join(root, ".cursor", "hypo-workflow", "templates", "report.md")), false);
  assert.equal(await exists(join(root, ".cursor", "hypo-workflow", "rules", "presets", "recommended.yaml")), false);
  assert.equal(await exists(join(root, ".cursor", "hypo-workflow", "config.schema.yaml")), false);
  assert.equal(await exists(join(root, ".cursor", "hypo-workflow", "references", "config-spec.md")), false);
  assert.equal(await exists(join(root, ".cursor", "hypo-workflow", "references", "opencode-spec.md")), false);
  assert.equal(await exists(join(root, ".cursor", "hypo-workflow", "references", "platform-claude.md")), false);
  assert.equal(await exists(join(root, ".cursor", "hypo-workflow", "scripts", "claude-smoke-fixture.mjs")), false);
  const cursorFiles = await readTreeText(join(root, ".cursor"));
  assert.doesNotMatch(cursorFiles, /gpt-5\.4|claude-sonnet-4-20250514|deepseek-v4|mimo-v2\.5/);
  assert.doesNotMatch(cursorFiles, /agent\.model|subagent\.codex\.model|subagent\.claude\.model/);
});

test("third-party adapters preserve user-owned content around managed blocks", async () => {
  const root = await fixtureRoot();
  const target = join(root, ".github", "copilot-instructions.md");
  await mkdir(join(root, ".github"), { recursive: true });
  await writeFile(
    target,
    [
      "# Team Instructions",
      "",
      "Keep this local convention.",
      "",
      "<!-- HYPO-WORKFLOW:MANAGED:BEGIN -->",
      "old managed content",
      "<!-- HYPO-WORKFLOW:MANAGED:END -->",
      "",
      "Local footer.",
      "",
    ].join("\n"),
    "utf8",
  );

  await writeThirdPartyAdapterArtifacts(root, { platform: "copilot" });
  const content = await readFile(target, "utf8");

  assert.match(content, /Keep this local convention/);
  assert.match(content, /Local footer/);
  assert.doesNotMatch(content, /old managed content/);
  assert.match(content, /HypoxanthineOvO\/Hypo-Workflow/);
});

test("sync platform selection writes the requested third-party adapter only", async () => {
  const root = await fixtureRoot();
  const result = await runProjectSync(root, { mode: "standard", platform: "trae" });

  assert.ok(result.operations.includes("trae_adapter"));
  assert.equal(await exists(join(root, ".trae", "rules", "project_rules.md")), true);
  assert.equal(await exists(join(root, ".cursor", "rules", "hypo-workflow.mdc")), false);
  assert.equal(await exists(join(root, ".cursor", "skills", "hw-start.md")), false);
  assert.equal(await exists(join(root, ".cursor", "commands", "hw-start.md")), false);
  assert.equal(await exists(join(root, ".github", "copilot-instructions.md")), false);
});

test("cursor sync writes repository rule, flat skills, and slash commands", async () => {
  const root = await fixtureRoot();
  const result = await runProjectSync(root, { mode: "standard", platform: "cursor" });

  assert.ok(result.operations.includes("cursor_adapter"));
  assert.equal(await exists(join(root, ".cursor", "rules", "hypo-workflow.mdc")), true);
  assert.equal(await exists(join(root, ".cursor", "skills", "hypo-workflow.md")), true);
  assert.equal(await exists(join(root, ".cursor", "skills", "hw-start.md")), true);
  assert.equal(await exists(join(root, ".cursor", "skills", "hw-plan.md")), true);
  assert.equal(await exists(join(root, ".cursor", "commands", "hw-start.md")), true);
  assert.equal(await exists(join(root, ".cursor", "commands", "hw-plan.md")), true);
  assert.equal(await exists(join(root, ".cursor", "hypo-workflow", "SKILL.md")), false);
  assert.equal(await exists(join(root, ".cursor", "hypo-workflow", "references", "commands-spec.md")), true);
  assert.equal(await exists(join(root, ".cursor", "hypo-workflow", "skills", "start", "SKILL.md")), false);
  const cursorSetupSkill = await readFile(join(root, ".cursor", "skills", "hw-setup.md"), "utf8");
  assert.doesNotMatch(cursorSetupSkill, /gpt-5\.4|claude-sonnet-4-20250514|deepseek-v4|mimo-v2\.5/);
  assert.doesNotMatch(cursorSetupSkill, /subagent\.codex\.model|subagent\.claude\.model|agent\.model/);
  assert.doesNotMatch(cursorSetupSkill, /`references\/config-spec\.md`/);
  assert.match(cursorSetupSkill, /Cursor chooses the active model in the UI\/session/);
  await assertCursorSkillReferencesResolvable(root);
  assert.equal(result.third_party_adapter.skill_bundles[0].entry, ".cursor/skills/hypo-workflow.md");
  assert.ok(result.third_party_adapter.skill_bundles[0].files.includes(".cursor/skills/hw-start.md"));
  assert.ok(result.third_party_adapter.skill_bundles[0].command_files.includes(".cursor/commands/hw-start.md"));
});

test("cursor sync rebuilds managed resources and prunes stale command files", async () => {
  const root = await fixtureRoot();
  await mkdir(join(root, ".cursor", "hypo-workflow", "templates"), { recursive: true });
  await writeFile(
    join(root, ".cursor", "hypo-workflow", ".hypo-workflow-managed.json"),
    `${JSON.stringify({ managed_by: "hypo-workflow", source_paths: ["templates"] })}\n`,
    "utf8",
  );
  await writeFile(join(root, ".cursor", "hypo-workflow", "templates", "stale.md"), "stale\n", "utf8");
  await mkdir(join(root, ".cursor", "skills"), { recursive: true });
  await writeFile(
    join(root, ".cursor", "skills", "hw-old.md"),
    [
      "---",
      "name: hw-old",
      'description: "Hypo-Workflow Cursor skill for /hw-old"',
      "---",
      "",
    ].join("\n"),
    "utf8",
  );
  await mkdir(join(root, ".cursor", "commands"), { recursive: true });
  await writeFile(
    join(root, ".cursor", "commands", "hw-old.md"),
    "Load Cursor Skill `.cursor/skills/hw-old.md`, then execute canonical command `/hw:old` with any user-provided arguments.\n",
    "utf8",
  );

  await runProjectSync(root, { mode: "standard", platform: "cursor" });

  assert.equal(await exists(join(root, ".cursor", "hypo-workflow", "templates", "stale.md")), false);
  assert.equal(await exists(join(root, ".cursor", "skills", "hw-old.md")), false);
  assert.equal(await exists(join(root, ".cursor", "commands", "hw-old.md")), false);
  assert.equal(await exists(join(root, ".cursor", "commands", "hw-pr.md")), true);
  assert.equal(await exists(join(root, ".cursor", "commands", "hw-pr-create.md")), true);
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-platform-adapters-"));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Adapter Fixture" },
    execution: { mode: "self", steps: { preset: "tdd" } },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { status: "running" },
    current: { prompt_name: "M05 / Adapters" },
  });
  return root;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function readTreeText(root) {
  const chunks = [];
  await collect(root);
  return chunks.join("\n");

  async function collect(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await collect(path);
      } else if (entry.isFile()) {
        chunks.push(await readFile(path, "utf8"));
      }
    }
  }
}

async function assertCursorSkillReferencesResolvable(root) {
  const skillFiles = await listMarkdownFiles(join(root, ".cursor", "skills"));
  for (const skillFile of skillFiles) {
    const content = await readFile(skillFile, "utf8");
    const references = extractBacktickReferences(content);
    for (const reference of references) {
      if (await cursorReferenceExists(root, reference)) continue;
      assert.match(
        content,
        /external\/non-local/i,
        `${reference} in ${skillFile} is missing and not marked external/non-local`,
      );
      assert.match(
        content,
        /fallback/i,
        `${reference} in ${skillFile} is missing and has no fallback behavior`,
      );
    }
  }
}

async function cursorReferenceExists(root, reference) {
  if (reference.startsWith(".cursor/")) {
    return exists(join(root, reference));
  }
  if (/^(adapters|assets|references|scripts)\//.test(reference)) {
    return exists(join(root, ".cursor", "hypo-workflow", reference));
  }
  return false;
}

function extractBacktickReferences(content) {
  const references = new Set();
  for (const match of content.matchAll(/`([^`\s]+)`/g)) {
    const value = match[1];
    if (value.startsWith("/")) continue;
    if (value.startsWith("~")) continue;
    if (value.includes("*")) continue;
    if (value.startsWith(".pipeline/")) continue;
    if (!looksLikePathReference(value)) continue;
    references.add(value);
  }
  return [...references];
}

function looksLikePathReference(value) {
  return (
    value === "SKILL.md"
    || value.startsWith(".cursor/")
    || /^(adapters|assets|core|docs|references|rules|scripts|templates)\//.test(value)
  );
}

async function listMarkdownFiles(root) {
  const files = [];
  await collect(root);
  return files;

  async function collect(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await collect(path);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(path);
      }
    }
  }
}
