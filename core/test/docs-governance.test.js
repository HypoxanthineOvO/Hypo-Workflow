import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  commandByCanonical,
  commandMap,
} from "../src/index.js";
import {
  checkDocs,
  checkDocsLanguage,
  checkNarrativeDocsForRelease,
  docsMap,
  repairDocs,
} from "../src/docs/index.js";

test("public command surface is exactly ten routes and Docs remains deferred", () => {
  assert.deepEqual(commandMap("codex").map(({ canonical }) => canonical), [
    "/hw:guide",
    "/hw:init",
    "/hw:goal",
    "/hw:plan",
    "/hw:cycle",
    "/hw:maintain",
    "/hw:experiment",
    "/hw:resume",
    "/hw:accept",
    "/hw:reject",
  ]);
  assert.equal(commandByCanonical("/hw:docs"), undefined);
});

test("docs map defines ownership, generated references, and narrative policy", () => {
  const map = docsMap();
  const readme = map.documents.find((doc) => doc.path === "README.md");
  const englishReadme = map.documents.find((doc) => doc.path === "README.en.md");
  const commands = map.documents.find((doc) => doc.path === "docs/reference/commands.md");
  const englishCommands = map.documents.find((doc) => doc.path === "docs/en/reference/commands.md");
  const userGuide = map.documents.find((doc) => doc.path === "docs/user-guide.md");
  const englishUserGuide = map.documents.find((doc) => doc.path === "docs/en/user-guide.md");
  const configuration = map.documents.find((doc) => doc.path === "docs/reference/configuration.md");
  const releaseNote = map.documents.find((doc) => doc.path === "docs/release/v14.0.0-alpha.3.md");
  const englishReleaseNote = map.documents.find((doc) => doc.path === "docs/en/release/v14.0.0-alpha.3.md");

  assert.equal(readme.role, "concise_user_entrypoint");
  assert.equal(readme.narrative_update_policy, "explicit_repair");
  assert.ok(readme.must_not_include.includes("full_test_matrix"));
  assert.equal(englishReadme.role, "english_user_entrypoint");
  assert.equal(englishReadme.update_class, "generated_translation");
  assert.equal(commands.update_class, "generated_reference");
  assert.equal(englishCommands.update_class, "generated_translation");
  assert.ok(commands.sources.includes("core/src/commands/index.js"));
  assert.equal(userGuide.role, "full_user_guide");
  assert.equal(englishUserGuide.role, "english_full_user_guide");
  assert.equal(configuration.role, "configuration_governance_reference");
  assert.ok(configuration.sources.includes("references/config-spec.md"));
  assert.equal(releaseNote.role, "release_note");
  assert.equal(releaseNote.narrative_update_policy, "release_flow");
  assert.equal(englishReleaseNote.role, "english_release_note");
});

test("docs check rejects README internals, stale commands, and missing license links", async () => {
  const root = await fixtureRoot();
  await writeFile(join(root, "README.md"), [
    "# Demo",
    "",
    "Internal adapter runtime details and full test matrix.",
    "当前版本提供 **1 个用户指令**。",
  ].join("\n"), "utf8");

  const result = await checkDocs(root);

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.check === "readme-must-not-include"));
  assert.ok(result.failures.some((failure) => failure.check === "command-count"));
  assert.ok(result.failures.some((failure) => failure.check === "license-link"));
});

test("docs repair returns a zero-write preview without rewriting narrative docs", async () => {
  const root = await fixtureRoot();
  await writeFile(join(root, "README.md"), [
    "# Manual README",
    "",
    "<!-- HW:README:BEGIN command-count -->",
    "stale",
    "<!-- HW:README:END command-count -->",
  ].join("\n"), "utf8");

  const before = await readFile(join(root, "README.md"), "utf8");
  const result = await repairDocs(root, { write: false });

  assert.equal(result.status, "preview");
  assert.equal(result.write, false);
  assert.deepEqual(result.generated, []);
  for (const path of [
    "README.en.md",
    "docs/reference/commands.md",
    "docs/en/reference/commands.md",
    "docs/reference/configuration.md",
    "docs/en/reference/configuration.md",
    "docs/user-guide.md",
    "docs/en/user-guide.md",
    "docs/platforms/opencode.md",
    "docs/en/platforms/opencode.md",
  ]) {
    assert.ok(result.planned_files.includes(path), `preview missing ${path}`);
  }
  assert.ok(result.managed_blocks.includes("command-count"));
  assert.equal(result.narrative_rewritten, false);
  assert.equal(await readFile(join(root, "README.md"), "utf8"), before);
});

test("configuration governance reference covers automation, strictness, and hard gates", async () => {
  const content = await readFile("docs/reference/configuration.md", "utf8");
  const required = [
    "automation.level",
    "automation.gates.planning",
    "automation.gates.destructive_external",
    "automation.gates.release_publish",
    "execution.worker_separation.mode",
    "execution.analysis.interaction_mode",
    "execution.analysis.boundaries.code_changes",
    "acceptance.mode",
    "evaluation.auto_continue",
    "batch.auto_chain",
    "opencode.auto_continue",
    "PR/MR remote write",
    "plugin install",
    "user-level config write",
    "Codex",
    "Claude Code",
    "OpenCode",
  ];
  for (const item of required) {
    assert.match(content, new RegExp(escapeRegExp(item)), `missing ${item}`);
  }
  assert.match(content, /Hypo-Workflow 不是后台 runner/);
  assert.doesNotMatch(content, /Hypo-Workflow\s+会自动执行实际编码/);
});

test("human-facing docs and key references stay Chinese-body", async () => {
  const result = await checkDocsLanguage(".");

  assert.equal(result.ok, true, JSON.stringify(result.failures, null, 2));
  assert.ok(result.checked.some((item) => item.path === "docs/platforms/claude-code.md"));
  assert.ok(result.checked.some((item) => item.path === "references/commands-spec.md"));
});

test("v14.0.0-alpha.3 release coverage is Chinese-first and linked from entrypoints", async () => {
  const chineseRelease = await readFile("docs/release/v14.0.0-alpha.3.md", "utf8");
  const englishRelease = await readFile("docs/en/release/v14.0.0-alpha.3.md", "utf8");
  const readme = await readFile("README.md", "utf8");
  const englishReadme = await readFile("README.en.md", "utf8");

  for (const item of ["Recovery Journal", "Hook", "marker", "multi-process", "PostToolUse", "Stop", "12288"]) {
    assert.match(chineseRelease, new RegExp(escapeRegExp(item)), `Chinese release note missing ${item}`);
    assert.match(englishRelease, new RegExp(escapeRegExp(item)), `mirror release note missing ${item}`);
  }
  assert.match(chineseRelease, /修复[\s\S]*验证/);
  assert.match(englishRelease, /Fix[\s\S]*Validation/);
  assert.doesNotMatch(`${chineseRelease}\n${englishRelease}`, /operation-scoped|cursor metadata.*grows|stream isolation/i);
  assert.match(readme, /docs\/release\/v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\.md/);
  assert.match(englishReadme, /docs\/en\/release\/v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\.md/);
});

test("release narrative fact check blocks stale docs claims", async () => {
  const root = await fixtureRoot();
  await writeFile(join(root, "docs", "user-guide.md"), "Hypo-Workflow has 1 commands and no OpenCode support.\n", "utf8");

  const result = await checkNarrativeDocsForRelease(root);

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.check === "stale-command-count"));
  assert.ok(result.failures.some((failure) => failure.check === "stale-platform-claim"));
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-docs-"));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(join(root, "README.md"), "# Demo\n\n[License](LICENSE)\n", "utf8");
  return root;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
