import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  checkDocs,
  checkDocsLanguage,
  checkNarrativeDocsForRelease,
  commandByCanonical,
  commandMap,
  docsMap,
  repairDocs,
} from "../src/index.js";

test("docs command is exposed and mapped to OpenCode", async () => {
  assert.equal(commandMap("opencode").length, 39);
  assert.equal(commandByCanonical("/hw:docs").opencode, "/hw-docs");
  assert.equal(commandByCanonical("/hw:docs").agent, "hw-docs");
  assert.equal(commandByCanonical("/hw:docs").skill, "skills/docs/SKILL.md");
  assert.match(await readFile("skills/docs/SKILL.md", "utf8"), /generate|check|repair|sync/i);
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
  const releaseNote = map.documents.find((doc) => doc.path === "docs/release/v12.5.1.md");
  const englishReleaseNote = map.documents.find((doc) => doc.path === "docs/en/release/v12.5.1.md");

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

test("docs repair writes docs IA and generated references without silently rewriting narrative docs", async () => {
  const root = await fixtureRoot();
  await writeFile(join(root, "README.md"), [
    "# Manual README",
    "",
    "<!-- HW:README:BEGIN command-count -->",
    "stale",
    "<!-- HW:README:END command-count -->",
  ].join("\n"), "utf8");

  const result = await repairDocs(root, { write: true });

  assert.ok(result.generated.includes("README.en.md"));
  assert.ok(result.generated.includes("docs/reference/commands.md"));
  assert.ok(result.generated.includes("docs/en/reference/commands.md"));
  assert.ok(result.generated.includes("docs/reference/configuration.md"));
  assert.ok(result.generated.includes("docs/en/reference/configuration.md"));
  assert.ok(result.generated.includes("docs/user-guide.md"));
  assert.ok(result.generated.includes("docs/en/user-guide.md"));
  assert.ok(result.generated.includes("docs/platforms/opencode.md"));
  assert.ok(result.generated.includes("docs/en/platforms/opencode.md"));
  assert.ok(result.managed_blocks.includes("command-count"));
  assert.match(await readFile(join(root, "README.md"), "utf8"), /Manual README/);
  assert.match(await readFile(join(root, "README.md"), "utf8"), /39 个用户指令/);
  assert.match(await readFile(join(root, "README.en.md"), "utf8"), /docs\/en\/user-guide\.md/);
  assert.match(await readFile(join(root, "README.en.md"), "utf8"), /docs\/en\/platforms\/opencode\.md/);
  assert.match(await readFile(join(root, "docs/en/user-guide.md"), "utf8"), /\/hw:pr create/);
  assert.doesNotMatch(await readFile(join(root, "README.en.md"), "utf8"), /docs\/user-guide\.md/);
  assert.match(await readFile(join(root, "docs/reference/commands.md"), "utf8"), /\/hw:docs/);
  assert.match(await readFile(join(root, "docs/reference/commands.md"), "utf8"), /\/hw:pr/);
  assert.match(await readFile(join(root, "docs/reference/commands.md"), "utf8"), /\/hw:pr create/);
  assert.match(await readFile(join(root, "docs/reference/commands.md"), "utf8"), /\/hw:explain/);
  const userGuide = await readFile(join(root, "docs/user-guide.md"), "utf8");
  const englishUserGuide = await readFile(join(root, "docs/en/user-guide.md"), "utf8");
  const opencodeGuide = await readFile(join(root, "docs/platforms/opencode.md"), "utf8");
  const englishOpencodeGuide = await readFile(join(root, "docs/en/platforms/opencode.md"), "utf8");
  const generatedArtifacts = await readFile(join(root, "docs/reference/generated-artifacts.md"), "utf8");
  const englishGeneratedArtifacts = await readFile(join(root, "docs/en/reference/generated-artifacts.md"), "utf8");
  const englishConfiguration = await readFile(join(root, "docs/en/reference/configuration.md"), "utf8");

  assert.match(userGuide, /\/hw:explain --subagent/);
  assert.match(userGuide, /P0 Configure/);
  assert.match(userGuide, /\/hw:pr create/);
  assert.match(userGuide, /\/hw:accept[\s\S]*worker evidence/);
  assert.match(userGuide, /close_failed/);
  assert.match(userGuide, /dirty_only/);
  assert.match(englishUserGuide, /\/hw:accept[\s\S]*worker evidence/);
  assert.match(englishUserGuide, /close_failed/);
  assert.match(englishUserGuide, /dirty_only/);
  assert.match(opencodeGuide, /runtime-only[\s\S]*worker evidence/);
  assert.match(englishOpencodeGuide, /runtime-only[\s\S]*worker evidence/);
  assert.match(generatedArtifacts, /dirty_only/);
  assert.match(englishGeneratedArtifacts, /dirty_only/);
  assert.match(await readFile(join(root, "docs/reference/configuration.md"), "utf8"), /automation\.gates\.destructive_external/);
  assert.match(await readFile(join(root, "docs/reference/configuration.md"), "utf8"), /strict worker separation/);
  assert.match(englishConfiguration, /Acceptance hardening/);
  assert.match(englishConfiguration, /runtime-only observations/);
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

test("v12.5.1 release coverage is Chinese-first and linked from entrypoints", async () => {
  const chineseRelease = await readFile("docs/release/v12.5.1.md", "utf8");
  const englishRelease = await readFile("docs/en/release/v12.5.1.md", "utf8");
  const readme = await readFile("README.md", "utf8");
  const englishReadme = await readFile("README.en.md", "utf8");

  for (const item of ["Claude Code", "/hw:resume", "claude-hw-command-namespace", "437/437", "commands/*.md"]) {
    assert.match(chineseRelease, new RegExp(escapeRegExp(item)), `Chinese release note missing ${item}`);
    assert.match(englishRelease, new RegExp(escapeRegExp(item)), `mirror release note missing ${item}`);
  }
  assert.match(chineseRelease, /Features[\s\S]*Fixes[\s\S]*Documentation[\s\S]*Tests/);
  assert.match(englishRelease, /Features[\s\S]*Fixes[\s\S]*Documentation[\s\S]*Tests/);
  assert.match(readme, /docs\/release\/v12\.5\.1\.md/);
  assert.match(englishReadme, /docs\/en\/release\/v12\.5\.1\.md/);
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
