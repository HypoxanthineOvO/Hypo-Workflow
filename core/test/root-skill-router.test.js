import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, readFile, rm, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  prepareSkillBundle,
  snapshotTree,
  temporaryDirectory,
} from "./fixtures/c21-m4/helpers.js";

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const COMMANDS = await import("../src/commands/index.js");
const ROOT_API = await import("../src/index.js");
const HAS_ROUTER = typeof COMMANDS.resolveCommandRoute === "function";

function routerBehavior(name, fn) {
  return test(name, {
    skip: HAS_ROUTER ? false : "core/src/commands resolveCommandRoute API is not implemented",
  }, fn);
}

test("M4 publishes resolveCommandRoute from the command registry and Core root", () => {
  assert.equal(typeof COMMANDS.resolveCommandRoute, "function");
  assert.equal(typeof ROOT_API.resolveCommandRoute, "function");
});

routerBehavior("compatibility aliases resolve bootstrap commands to focused child Skills", async (t) => {
  const bundle = await prepareSkillBundle(t, REPOSITORY_ROOT);
  const variants = [
    ["/hw:init", "/hw:init", "skills/init/SKILL.md"],
    ["/hypo-workflow:init", "/hw:init", "skills/init/SKILL.md"],
    ["$hypo-workflow:init", "/hw:init", "skills/init/SKILL.md"],
    ["/hw:init Build a local task tracker", "/hw:init", "skills/init/SKILL.md"],
    ["/hw:guide", "/hw:guide", "skills/guide/SKILL.md"],
    ["/hypo-workflow:guide", "/hw:guide", "skills/guide/SKILL.md"],
  ];

  for (const [input, canonical, skill] of variants) {
    const route = await COMMANDS.resolveCommandRoute(input, { repoRoot: bundle });
    assert.equal(route.status, "available", input);
    assert.equal(route.canonical, canonical, input);
    assert.equal(route.exposure, "public", input);
    assert.equal(route.availability, "available", input);
    assert.equal(route.skill, skill, input);
    assert.notEqual(route.skill, "SKILL.md");
    assert.equal(await readFile(join(bundle, route.skill), "utf8").then(Boolean), true);
    assert.equal(Object.hasOwn(route, "manual"), false, "router must not inline a command manual");
  }
});

routerBehavior("unknown, removed, deferred, internal, and unavailable routes return explicit zero-write compatibility results", async (t) => {
  const bundle = await prepareSkillBundle(t, REPOSITORY_ROOT);
  const before = await snapshotTree(bundle);
  const cases = [
    ["/hw:rose", "unknown", null],
    ["/hw:setup", "removed", "/hw:setup"],
    ["/hw:analysis", "deferred", "/hw:analysis"],
    ["/hw:status", "internal", "/hw:status"],
    ["/hw:goal Build an editor", "unavailable", "/hw:goal"],
  ];

  for (const [input, status, canonical] of cases) {
    const route = await COMMANDS.resolveCommandRoute(input, { repoRoot: bundle });
    assert.equal(route.status, status, input);
    assert.equal(route.canonical, canonical, input);
    assert.equal(typeof route.message, "string", `${input} needs a user-visible compatibility explanation`);
    assert.ok(route.message.trim().length >= 12, `${input} explanation is too vague`);
    assert.notEqual(route.executable, true, `${input} must not pretend to execute`);
    assert.deepEqual(route.writes ?? [], []);
  }
  assert.deepEqual(await snapshotTree(bundle), before);
});

routerBehavior("resolver checks the projected bundle and downgrades a declared route when its child backend is absent", async (t) => {
  const bundle = await prepareSkillBundle(t, REPOSITORY_ROOT);
  await rm(join(bundle, "skills", "guide", "SKILL.md"));
  const before = await snapshotTree(bundle);

  const route = await COMMANDS.resolveCommandRoute("/hw:guide", { repoRoot: bundle });
  assert.equal(route.canonical, "/hw:guide");
  assert.equal(route.status, "unavailable");
  assert.equal(route.availability, "unavailable");
  assert.match(route.message, /backend|skill|unavailable|尚未可用|缺失/i);
  assert.deepEqual(await snapshotTree(bundle), before);
});

routerBehavior("symlinked repoRoot is not a trusted Skill bundle root for routing or discovery", async (t) => {
  const bundle = await prepareSkillBundle(t, REPOSITORY_ROOT);
  const linkHome = await temporaryDirectory(t, "hw-m4-skill-root-link-");
  const linkedRoot = join(linkHome, "bundle");
  await symlink(bundle, linkedRoot, "dir");
  const bundleBefore = await snapshotTree(bundle);
  const linkBefore = await snapshotTree(linkHome);

  await t.test("resolver", async () => {
    const route = await COMMANDS.resolveCommandRoute("/hw:guide", { repoRoot: linkedRoot });
    assert.equal(route.canonical, "/hw:guide");
    assert.equal(route.status, "unavailable");
    assert.equal(route.availability, "unavailable");
    assert.deepEqual(route.writes ?? [], []);
    assert.equal(JSON.stringify(route).includes(bundle), false, "route result must not disclose the symlink target path");
  });

  await t.test("discovery", async () => {
    const discovered = await COMMANDS.discoverableCommandMap("codex", { repoRoot: linkedRoot });
    assert.deepEqual(discovered, [], "an untrusted Root must not advertise either bootstrap backend");
  });
  assert.deepEqual(await snapshotTree(bundle), bundleBefore);
  assert.deepEqual(await snapshotTree(linkHome), linkBefore);
});

routerBehavior("child symlinks and near-prefix directories remain unavailable under a trusted ordinary root", async (t) => {
  await t.test("child-directory-symlink", async (subtest) => {
    const bundle = await prepareSkillBundle(subtest, REPOSITORY_ROOT);
    const external = await temporaryDirectory(subtest, "hw-m4-guide-dir-target-");
    await cp(join(bundle, "skills", "guide"), join(external, "guide"), { recursive: true });
    await rm(join(bundle, "skills", "guide"), { recursive: true });
    await symlink(join(external, "guide"), join(bundle, "skills", "guide"), "dir");
    await assertGuideUnavailableWithInitDiscoverable(bundle, external);
  });

  await t.test("child-file-symlink", async (subtest) => {
    const bundle = await prepareSkillBundle(subtest, REPOSITORY_ROOT);
    const external = await temporaryDirectory(subtest, "hw-m4-guide-file-target-");
    const target = join(external, "GUIDE.md");
    await cp(join(bundle, "skills", "guide", "SKILL.md"), target);
    await rm(join(bundle, "skills", "guide", "SKILL.md"));
    await symlink(target, join(bundle, "skills", "guide", "SKILL.md"), "file");
    await assertGuideUnavailableWithInitDiscoverable(bundle, external);
  });

  await t.test("near-prefix-directory", async (subtest) => {
    const bundle = await prepareSkillBundle(subtest, REPOSITORY_ROOT);
    await rm(join(bundle, "skills", "guide"), { recursive: true });
    await mkdir(join(bundle, "skills", "guide-copy"), { recursive: true });
    await cp(
      join(REPOSITORY_ROOT, "skills", "guide", "SKILL.md"),
      join(bundle, "skills", "guide-copy", "SKILL.md"),
    );
    await assertGuideUnavailableWithInitDiscoverable(bundle);
  });
});

test("Root SKILL is a bounded compatibility router; scale checks are secondary to resolver tests", async () => {
  const source = await readFile(join(REPOSITORY_ROOT, "SKILL.md"), "utf8");
  const lines = source.split("\n").length;
  assert.ok(Buffer.byteLength(source) <= 18_000, `Root SKILL is ${Buffer.byteLength(source)} bytes; routing entry must stay <= 18000`);
  assert.ok(lines <= 320, `Root SKILL is ${lines} lines; routing entry must stay <= 320`);
  assert.match(source, /skills\/init\/SKILL\.md/);
  assert.match(source, /skills\/guide\/SKILL\.md/);
  assert.doesNotMatch(source, /# Prompt Pipeline 执行骨架[\s\S]{20000,}/, "Root router must not retain the old embedded manual");
});

async function assertGuideUnavailableWithInitDiscoverable(bundle, external) {
  const bundleBefore = await snapshotTree(bundle);
  const externalBefore = external ? await snapshotTree(external) : null;
  const route = await COMMANDS.resolveCommandRoute("/hw:guide", { repoRoot: bundle });
  assert.equal(route.status, "unavailable");
  assert.equal(route.availability, "unavailable");
  assert.deepEqual(route.writes ?? [], []);
  if (external) assert.equal(JSON.stringify(route).includes(external), false);
  const discovered = await COMMANDS.discoverableCommandMap("codex", { repoRoot: bundle });
  assert.deepEqual(discovered.map((command) => command.canonical), ["/hw:init"]);
  assert.deepEqual(await snapshotTree(bundle), bundleBefore);
  if (external) assert.deepEqual(await snapshotTree(external), externalBefore);
}
