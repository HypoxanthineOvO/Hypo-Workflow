import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  checkReadmeFreshness,
  defaultReadmeConfig,
  platformDisplayNames,
  renderReadmeBlock,
  replaceManagedBlock,
  updateReadme,
} from "../src/readme/index.js";

test("defaultReadmeConfig exposes loose marker-safe defaults", () => {
  assert.deepEqual(defaultReadmeConfig(), {
    mode: "loose",
    full_regen: "auto",
  });
});

test("renderReadmeBlock derives command and platform content from assets", async () => {
  const commandCount = renderReadmeBlock("command-count");
  assert.match(commandCount, /40 个用户指令/);
  assert.match(commandCount, /1 个内部 watchdog/);

  const commandReference = renderReadmeBlock("command-reference");
  assert.match(commandReference, /\/hw:release/);
  assert.match(commandReference, /\/hw-release/);
  assert.match(commandReference, /skills\/release\/SKILL\.md/);
  assert.match(commandReference, /\/hw:chat/);
  assert.match(commandReference, /\/hw-chat/);
  assert.match(commandReference, /skills\/chat\/SKILL\.md/);

  const platformMatrix = renderReadmeBlock("platform-matrix");
  for (const platform of platformDisplayNames()) {
    assert.match(platformMatrix, new RegExp(escapeRegExp(platform)));
  }
});

test("replaceManagedBlock replaces only managed content", () => {
  const source = [
    "before",
    "<!-- HW:README:BEGIN command-count -->",
    "stale",
    "<!-- HW:README:END command-count -->",
    "after",
  ].join("\n");

  const result = replaceManagedBlock(source, "command-count", "fresh");

  assert.equal(
    result,
    [
      "before",
      "<!-- HW:README:BEGIN command-count -->",
      "fresh",
      "<!-- HW:README:END command-count -->",
      "after",
    ].join("\n"),
  );
});

test("replaceManagedBlock does not silently create missing strict blocks", () => {
  assert.throws(
    () => replaceManagedBlock("no markers", "command-count", "fresh", { mode: "strict" }),
    /missing managed README block: command-count/,
  );
});

test("checkReadmeFreshness detects stale managed facts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-readme-"));
  await mkdir(join(dir, ".claude-plugin"), { recursive: true });
  await mkdir(join(dir, "core", "src", "commands"), { recursive: true });
  await mkdir(join(dir, "references"), { recursive: true });
  await mkdir(join(dir, "skills", "release"), { recursive: true });
  await writeFile(
    join(dir, ".claude-plugin", "plugin.json"),
    JSON.stringify({ version: "9.9.9" }),
    "utf8",
  );
  await writeFile(
    join(dir, "core", "src", "commands", "index.js"),
    "export const CANONICAL_COMMANDS = Object.freeze([{ canonical: '/hw:start' }, { canonical: '/hw:release' }]);",
    "utf8",
  );
  await writeFile(join(dir, "references", "platform-capabilities.md"), "Codex\nClaude Code\nOpenCode\n", "utf8");
  await writeFile(join(dir, "references", "release-spec.md"), "regression\nversion\nchangelog\ncommit\ntag\npush\n", "utf8");
  await writeFile(join(dir, "skills", "release", "SKILL.md"), "# release\n", "utf8");
  await writeFile(join(dir, "README.md"), "version-0.0.1\n当前版本提供 **1 个用户指令**\n", "utf8");

  const result = await checkReadmeFreshness(join(dir, "README.md"), { projectRoot: dir });

  assert.equal(result.fresh, false);
  assert.ok(result.failures.some((failure) => failure.check === "version"));
  assert.ok(result.failures.some((failure) => failure.check === "command-count"));
});

test("checkReadmeFreshness detects stale narrative command counts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-readme-stale-count-"));
  await mkdir(join(dir, ".claude-plugin"), { recursive: true });
  await mkdir(join(dir, "core", "src", "commands"), { recursive: true });
  await writeFile(join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ version: "10.2.0" }), "utf8");
  await writeFile(
    join(dir, "core", "src", "commands", "index.js"),
    Array.from({ length: 36 }, (_, index) => `{ canonical: '/hw:test-${index}' }`).join("\n"),
    "utf8",
  );
  await writeFile(
    join(dir, "README.md"),
    [
      "v10.2.0",
      "当前版本提供 **36 个用户指令**",
      "| Commands Reference | 37 个 canonical 命令和 OpenCode 映射 |",
      "Codex Claude Code OpenCode",
    ].join("\n"),
    "utf8",
  );

  const result = await checkReadmeFreshness(join(dir, "README.md"), { projectRoot: dir });

  assert.equal(result.fresh, false);
  assert.ok(result.failures.some((failure) => failure.check === "stale-command-count" && failure.actual === 37));
});

test("checkReadmeFreshness requires Chinese Quick Start and six platform entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-readme-platform-entrypoint-"));
  await mkdir(join(dir, ".claude-plugin"), { recursive: true });
  await mkdir(join(dir, "core", "src", "commands"), { recursive: true });
  await writeFile(join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ version: "11.0.0" }), "utf8");
  await writeFile(
    join(dir, "core", "src", "commands", "index.js"),
    Array.from({ length: 36 }, (_, index) => `{ canonical: '/hw:test-${index}' }`).join("\n"),
    "utf8",
  );
  await writeFile(
    join(dir, "README.md"),
    [
      "# Hypo-Workflow",
      "version-11.0.0",
      "当前版本提供 **36 个用户指令**",
      "Codex Claude Code OpenCode",
      "/hw:init /hw:plan /hw:start",
    ].join("\n"),
    "utf8",
  );

  const result = await checkReadmeFreshness(join(dir, "README.md"), { projectRoot: dir });

  assert.equal(result.fresh, false);
  assert.ok(result.failures.some((failure) => failure.check === "repository-import"));
  assert.ok(result.failures.some((failure) => failure.check === "quick-start"));
  assert.ok(result.failures.some((failure) => failure.check === "platform-entry" && failure.expected === "Cursor"));
  assert.ok(result.failures.some((failure) => failure.check === "platform-entry" && failure.expected === "GitHub Copilot"));
  assert.ok(result.failures.some((failure) => failure.check === "platform-entry" && failure.expected === "Trae"));
  assert.ok(result.failures.some((failure) => failure.check === "first-screen-entrypoint"));
  assert.ok(result.failures.some((failure) => failure.check === "resume-flow"));
  assert.ok(result.failures.some((failure) => failure.check === "subagent-guidance"));
});

test("checkReadmeFreshness rejects English prose and external model routing claims", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-readme-language-"));
  await mkdir(join(dir, ".claude-plugin"), { recursive: true });
  await mkdir(join(dir, "core", "src", "commands"), { recursive: true });
  await writeFile(join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ version: "11.0.0" }), "utf8");
  await writeFile(
    join(dir, "core", "src", "commands", "index.js"),
    Array.from({ length: 36 }, (_, index) => `{ canonical: '/hw:test-${index}' }`).join("\n"),
    "utf8",
  );
  await writeFile(
    join(dir, "README.md"),
    [
      "# Hypo-Workflow",
      "version-11.0.0",
      "Hypo-Workflow 是 AI coding workflow runner。",
      "`HypoxanthineOvO/Hypo-Workflow`",
      "/hw:init -> /hw:plan -> /hw:start",
      "/hw:status -> /hw:resume",
      "Codex Claude Code OpenCode Cursor GitHub Copilot Trae",
      "Codex Subagents 优先，测试/审查分离，可以 route 到 DeepSeek。",
      "当前版本提供 **36 个用户指令**",
    ].join("\n"),
    "utf8",
  );

  const result = await checkReadmeFreshness(join(dir, "README.md"), { projectRoot: dir });

  assert.equal(result.fresh, false);
  assert.ok(result.failures.some((failure) => failure.check === "chinese-entrypoint"));
  assert.ok(result.failures.some((failure) => failure.check === "codex-external-model-routing"));
});

test("updateReadme replaces requested managed blocks and reports a summary", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hw-readme-update-"));
  const file = join(dir, "README.md");
  await writeFile(
    file,
    [
      "manual intro",
      "<!-- HW:README:BEGIN command-count -->",
      "stale count",
      "<!-- HW:README:END command-count -->",
      "manual outro",
    ].join("\n"),
    "utf8",
  );

  const summary = await updateReadme(file, {
    blocks: ["command-count"],
    write: true,
  });
  const updated = await readFile(file, "utf8");

  assert.equal(summary.changedBlocks.length, 1);
  assert.deepEqual(summary.changedBlocks, ["command-count"]);
  assert.equal(summary.fullRegenerated, false);
  assert.match(updated, /manual intro/);
  assert.match(updated, /40 个用户指令/);
  assert.match(updated, /manual outro/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
