import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildExplainEvidencePacket,
  commandByCanonical,
  renderExplainAnswer,
} from "../src/index.js";

test("command map exposes /hw:explain as a read-only evidence command", () => {
  const command = commandByCanonical("/hw:explain");
  assert.equal(command.opencode, "/hw:explain");
  assert.equal(command.agent, "hw-review");
  assert.equal(command.route, "explain");
  assert.equal(command.skill, "skills/explain/SKILL.md");
});

test("explain evidence packet cites explicit files and configuration keys", async () => {
  const root = await explainFixture();
  const packet = await buildExplainEvidencePacket(root, "为什么这个配置是 strict?", {
    targets: [".pipeline/config.yaml"],
  });

  assert.equal(packet.question, "为什么这个配置是 strict?");
  assert.equal(packet.mode, "read_only");
  assert.equal(packet.confidence, "grounded");
  assert.deepEqual(packet.files_read.map((item) => item.path), [".pipeline/config.yaml"]);
  assert.match(packet.files_read[0].excerpt, /worker_separation/);
  assert.match(packet.files_read[0].excerpt, /strict/);

  const answer = renderExplainAnswer(packet);
  assert.match(answer, /## 结论/);
  assert.match(answer, /## 解释/);
  assert.match(answer, /## 下一步/);
  assert.match(answer, /证据/);
  assert.match(answer, /\.pipeline\/config\.yaml/);
  assert.match(answer, /strict/);
});

test("explain framework questions infer project entrypoint evidence", async () => {
  const root = await explainFixture();
  const packet = await buildExplainEvidencePacket(root, "这个新项目代码框架是什么?");
  const answer = renderExplainAnswer(packet);

  assert.deepEqual(packet.files_read.map((item) => item.path), [
    "README.md",
    "package.json",
    "core/src/index.js",
    "core/src/commands/index.js",
  ]);
  assert.equal(packet.confidence, "grounded");
  assert.match(answer, /package\.json/);
  assert.match(answer, /core\/src\/index\.js/);
});

test("explain recent-change questions infer progress and log evidence", async () => {
  const root = await explainFixture();
  const packet = await buildExplainEvidencePacket(root, "刚才为什么这样写?", {
    diff: true,
  });
  const answer = renderExplainAnswer(packet);

  assert.deepEqual(packet.diff_refs, [
    ".pipeline/PROGRESS.md",
    ".pipeline/log.yaml",
    ".pipeline/state.yaml",
  ]);
  assert.match(packet.files_read.map((item) => item.path).join("\n"), /\.pipeline\/PROGRESS\.md/);
  assert.match(answer, /recent action/);
  assert.match(answer, /\.pipeline\/log\.yaml/);
});

test("explain is read-only for state, log, and reports", async () => {
  const root = await explainFixture();
  const stateBefore = await readFile(join(root, ".pipeline", "state.yaml"), "utf8");
  const logBefore = await readFile(join(root, ".pipeline", "log.yaml"), "utf8");

  await buildExplainEvidencePacket(root, "刚才为什么这样写?", {
    targets: [".pipeline/state.yaml", ".pipeline/log.yaml", "README.md"],
  });

  assert.equal(await readFile(join(root, ".pipeline", "state.yaml"), "utf8"), stateBefore);
  assert.equal(await readFile(join(root, ".pipeline", "log.yaml"), "utf8"), logBefore);
});

test("explain redacts secret-like evidence before packet and answer rendering", async () => {
  const root = await explainFixture();
  await writeFile(join(root, "secrets.md"), [
    "# Secret fixture",
    "Authorization: Bearer should-not-show",
    "token=abc123",
    "",
  ].join("\n"), "utf8");

  const packet = await buildExplainEvidencePacket(root, "解释 secrets.md", {
    targets: ["secrets.md"],
  });
  const answer = renderExplainAnswer(packet);

  assert.doesNotMatch(packet.files_read[0].excerpt, /should-not-show|abc123/);
  assert.doesNotMatch(answer, /should-not-show|abc123/);
  assert.match(packet.files_read[0].excerpt, /\[REDACTED\]/);
  assert.match(answer, /\[REDACTED\]/);
});

test("explain reports unknowns instead of inventing unsupported answers", async () => {
  const root = await explainFixture();
  const packet = await buildExplainEvidencePacket(root, "这个不存在的模块为什么这样设计?", {
    targets: ["src/missing-module.js"],
  });
  const answer = renderExplainAnswer(packet);

  assert.equal(packet.confidence, "needs_context");
  assert.deepEqual(packet.files_read, []);
  assert.match(packet.unknowns.join("\n"), /src\/missing-module\.js/);
  assert.match(answer, /无法确认/);
  assert.match(answer, /needs_context/);
  assert.match(answer, /## 下一步/);
});

async function explainFixture() {
  const root = await mkdtemp(join(tmpdir(), "hw-explain-"));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeFile(join(root, ".pipeline", "config.yaml"), [
    "execution:",
    "  worker_separation:",
    "    mode: strict",
    "",
  ].join("\n"), "utf8");
  await writeFile(join(root, ".pipeline", "state.yaml"), "pipeline:\n  status: running\n", "utf8");
  await writeFile(join(root, ".pipeline", "log.yaml"), "entries:\n  - summary: recent action chose evidence-first Explain tests\n", "utf8");
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), "# Progress\n\nrecent action: added Explain fixture coverage.\n", "utf8");
  await writeFile(join(root, "README.md"), "# Demo\n\nEvidence-first docs.\n", "utf8");
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "demo", type: "module" }, null, 2), "utf8");
  await mkdir(join(root, "core", "src", "commands"), { recursive: true });
  await writeFile(join(root, "core", "src", "index.js"), "export * from './commands/index.js';\n", "utf8");
  await writeFile(join(root, "core", "src", "commands", "index.js"), "export const CANONICAL_COMMANDS = [];\n", "utf8");
  return root;
}
