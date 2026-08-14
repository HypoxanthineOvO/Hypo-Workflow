import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeWorkspace, readProjectIndex, renderInitSummary } from "../src/init/index.js";

test("initializeWorkspace 搭出人类可读语义骨架，无哈希命名", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-init-lean-"));
  const result = await initializeWorkspace(root, { name: "demo-project", description: "演示" }, {
    clock: () => "2026-08-14T10:00:00.000Z",
  });
  assert.equal(result.status, "initialized");
  assert.match(result.manifest.name, /demo-project/);

  const entries = await readdir(join(root, ".pipeline"), { withFileTypes: true });
  const names = entries.map((entry) => entry.name).sort();
  for (const expected of ["INDEX.md", "cycles", "memory", "experiments", "local"]) {
    assert.ok(names.includes(expected), `${expected} 必须存在`);
  }

  const memoryIndex = await readFile(join(root, ".pipeline", "memory", "INDEX.md"), "utf8");
  assert.match(memoryIndex, /constraint/);
  assert.match(memoryIndex, /无哈希/);

  const project = await readProjectIndex(root);
  assert.equal(project.name, "demo-project");
});

test("renderInitSummary 给出人读摘要与下一步", () => {
  const summary = renderInitSummary({ name: "demo", description: "目的" });
  assert.match(summary, /# demo 初始化/);
  assert.match(summary, /Discussion/);
});

test("initializeWorkspace 拒绝缺失名称", async () => {
  const root = await mkdtemp(join(tmpdir(), "hw-init-noname-"));
  await assert.rejects(initializeWorkspace(root, {}), /name is required/);
});
