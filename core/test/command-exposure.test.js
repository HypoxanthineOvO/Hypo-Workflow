import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  prepareSkillBundle,
  snapshotTree,
} from "./fixtures/c21-m4/helpers.js";

const REPOSITORY_ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const COMMANDS = await import("../src/commands/index.js");
const ROOT_API = await import("../src/index.js");
const EXPOSURES = new Set(["public", "contextual", "internal", "deferred", "removed"]);
const AVAILABILITY = new Set(["available", "unavailable"]);
const HAS_DISCOVERY = typeof COMMANDS.discoverableCommandMap === "function";

function discoveryBehavior(name, fn) {
  return test(name, {
    skip: HAS_DISCOVERY ? false : "core/src/commands discoverableCommandMap API is not implemented",
  }, fn);
}

test("M4 publishes the generator-facing discoverableCommandMap API", () => {
  assert.equal(typeof COMMANDS.discoverableCommandMap, "function");
  assert.equal(typeof ROOT_API.discoverableCommandMap, "function");
});

test("every compatibility command declares exposure and C21 backend availability", () => {
  assert.ok(Array.isArray(COMMANDS.CANONICAL_COMMANDS));
  assert.ok(COMMANDS.CANONICAL_COMMANDS.length > 0);
  for (const command of COMMANDS.CANONICAL_COMMANDS) {
    assert.ok(EXPOSURES.has(command.exposure), `${command.canonical} has invalid exposure ${command.exposure}`);
    assert.ok(AVAILABILITY.has(command.availability), `${command.canonical} has invalid availability ${command.availability}`);
    if (command.availability === "unavailable") {
      assert.equal(typeof command.availability_reason, "string", `${command.canonical} needs availability_reason`);
      assert.ok(command.availability_reason.trim().length > 0);
    }
  }
});

test("current exposure taxonomy keeps delivery, internal, deferred, and removed routes honest", () => {
  const byCanonical = new Map(COMMANDS.CANONICAL_COMMANDS.map((command) => [command.canonical, command]));
  const expected = new Map([
    ["/hw:guide", ["public", "available"]],
    ["/hw:init", ["public", "available"]],
    ["/hw:goal", ["public", "available"]],
    ["/hw:plan", ["public", "available"]],
    ["/hw:cycle", ["public", "available"]],
    ["/hw:maintain", ["public", "available"]],
    ["/hw:resume", ["public", "available"]],
    ["/hw:accept", ["contextual", "available"]],
    ["/hw:reject", ["contextual", "available"]],
    ["/hw:status", ["internal", "unavailable"]],
    ["/hw:report", ["internal", "unavailable"]],
    ["/hw:debug", ["internal", "unavailable"]],
    ["/hw:analysis", ["deferred", "unavailable"]],
    ["/hw:audit", ["deferred", "unavailable"]],
    ["/hw:quality", ["deferred", "unavailable"]],
    ["/hw:optimize", ["deferred", "unavailable"]],
    ["/hw:explore", ["deferred", "unavailable"]],
    ["/hw:docs", ["deferred", "unavailable"]],
    ["/hw:pr", ["deferred", "unavailable"]],
    ["/hw:release", ["deferred", "unavailable"]],
    ["/hw:setup", ["removed", "unavailable"]],
    ["/hw:rules", ["removed", "unavailable"]],
    ["/hw:stop", ["removed", "unavailable"]],
    ["/hw:skip", ["removed", "unavailable"]],
    ["/hw:reset", ["removed", "unavailable"]],
    ["/hw:showcase", ["removed", "unavailable"]],
    ["/hw:patch", ["removed", "unavailable"]],
    ["/hw:help", ["removed", "unavailable"]],
  ]);

  for (const [canonical, [exposure, availability]] of expected) {
    const command = byCanonical.get(canonical);
    assert.ok(command, `command registry is missing compatibility route ${canonical}`);
    assert.equal(command.exposure, exposure, canonical);
    assert.equal(command.availability, availability, canonical);
  }

  const active = COMMANDS.CANONICAL_COMMANDS
    .filter((command) => command.availability === "available")
    .map((command) => command.canonical)
    .sort();
  assert.deepEqual(active, [
    "/hw:accept",
    "/hw:cycle",
    "/hw:goal",
    "/hw:guide",
    "/hw:init",
    "/hw:maintain",
    "/hw:plan",
    "/hw:reject",
    "/hw:resume",
  ]);
});

discoveryBehavior("Codex bootstrap discovery advertises only public/contextual commands with real backends", async (t) => {
  const bundle = await prepareSkillBundle(t, REPOSITORY_ROOT);
  const before = await snapshotTree(bundle);
  const discovered = await COMMANDS.discoverableCommandMap("codex", { repoRoot: bundle });

  assert.deepEqual(discovered.map((command) => command.canonical).sort(), ["/hw:guide", "/hw:init"]);
  for (const command of discovered) {
    assert.ok(["public", "contextual"].includes(command.exposure));
    assert.equal(command.availability, "available");
    assert.match(command.skill, /^skills\/(?:guide|init)\/SKILL\.md$/);
  }
  assert.equal(discovered.some((command) => [
    "/hw:goal",
    "/hw:cycle",
    "/hw:maintain",
    "/hw:resume",
    "/hw:accept",
    "/hw:reject",
    "/hw:analysis",
    "/hw:setup",
  ].includes(command.canonical)), false);
  assert.deepEqual(await snapshotTree(bundle), before);
});

discoveryBehavior("platform discovery re-checks projected backend presence instead of trusting registry metadata", async (t) => {
  const bundle = await prepareSkillBundle(t, REPOSITORY_ROOT);
  await rm(join(bundle, "skills", "guide", "SKILL.md"));
  const before = await snapshotTree(bundle);

  for (const platform of ["codex", "opencode", "claude-code"] ) {
    const discovered = await COMMANDS.discoverableCommandMap(platform, { repoRoot: bundle });
    assert.deepEqual(discovered.map((command) => command.canonical), ["/hw:init"], platform);
  }
  assert.deepEqual(await snapshotTree(bundle), before);
});

discoveryBehavior("removed, deferred, internal, and unavailable registry entries cannot leak through a custom platform projection", async (t) => {
  const bundle = await prepareSkillBundle(t, REPOSITORY_ROOT);
  const discovered = await COMMANDS.discoverableCommandMap("codex", { repoRoot: bundle });
  const allowed = discovered.every(
    (command) => ["public", "contextual"].includes(command.exposure) && command.availability === "available",
  );
  assert.equal(allowed, true);
  assert.equal(new Set(discovered.map((command) => command.canonical)).size, discovered.length);
});
