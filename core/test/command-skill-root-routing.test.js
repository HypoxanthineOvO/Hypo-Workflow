import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as COMMANDS from "../src/commands/index.js";

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));

test("九命令公开面可从 commands 目录发现且每命令指向 skill 文件", async () => {
  const entries = await COMMANDS.discoverableCommandMap("opencode", { repositoryRoot: REPOSITORY_ROOT });
  const names = entries.map((entry) => entry.name).sort();
  for (const expected of ["/hw:guide", "/hw:init", "/hw:goal", "/hw:plan", "/hw:cycle", "/hw:resume", "/hw:accept", "/hw:reject", "/hw:maintain", "/hw:experiment"]) {
    assert.ok(names.includes(expected), `${expected} 必须在公开命令面`);
  }
  for (const entry of entries) {
    if (!entry?.skill) continue;
    await readFile(join(REPOSITORY_ROOT, entry.skill), "utf8");
  }
});

test("commands 目录下每个公开命令文件都指向 skills/*/SKILL.md", async () => {
  const { readdir } = await import("node:fs/promises");
  const files = (await readdir(join(REPOSITORY_ROOT, "commands"), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);
  for (const file of files) {
    const content = await readFile(join(REPOSITORY_ROOT, "commands", file), "utf8");
    assert.match(content, /skills\/[a-z-]+\/SKILL\.md/, `${file} 必须指向语义 skill`);
  }
});

test("resolveCommandRoute 返回可读路由说明", async () => {
  const route = await COMMANDS.resolveCommandRoute("/hw:plan", { repositoryRoot: REPOSITORY_ROOT });
  assert.ok(route, "route 必须存在");
  assert.equal(route.status, "available");
  assert.equal(route.canonical, "/hw:plan");
});
