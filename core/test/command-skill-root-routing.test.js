import test from "node:test";
import assert from "node:assert/strict";
import * as COMMANDS from "../src/commands/index.js";
import {
  snapshotTree,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m2/helpers.js";
import { REPOSITORY_ROOT } from "./fixtures/c21-m6/helpers.js";

const EXTERNAL_CONTEXT = Object.freeze({
  workspace: "current",
  active_delivery: null,
});

test("resolveCommandRoute keeps target repoRoot separate from explicit skillRoot", async (t) => {
  const targetRoot = await temporaryCurrentWorkspace(t, "hw-m6-command-route-target-");
  const before = await snapshotTree(targetRoot);

  const route = await COMMANDS.resolveCommandRoute("/hw:goal 构建可验收的队列 API", {
    ...EXTERNAL_CONTEXT,
    repoRoot: targetRoot,
    skillRoot: REPOSITORY_ROOT,
  });

  assert.equal(route.status, "available");
  assert.equal(route.canonical, "/hw:goal");
  assert.equal(route.skill, "skills/goal/SKILL.md");
  assert.deepEqual(route.writes, []);
  assert.deepEqual(await snapshotTree(targetRoot), before);
});

test("resolveWorkflowIntent uses the same explicit skillRoot contract for an external target", async (t) => {
  const targetRoot = await temporaryCurrentWorkspace(t, "hw-m6-intent-route-target-");
  const before = await snapshotTree(targetRoot);

  const route = await COMMANDS.resolveWorkflowIntent("/hw:goal 构建可验收的队列 API", {
    ...EXTERNAL_CONTEXT,
    repoRoot: targetRoot,
    skillRoot: REPOSITORY_ROOT,
  });

  assert.equal(route.status, "available");
  assert.equal(route.canonical, "/hw:goal");
  assert.equal(route.authority_intent, "delivery.propose_goal");
  assert.deepEqual(route.writes, []);
  assert.deepEqual(await snapshotTree(targetRoot), before);
});

test("discoverableCommandMap discovers installed backends through skillRoot, not target repoRoot", async (t) => {
  const targetRoot = await temporaryCurrentWorkspace(t, "hw-m6-discovery-route-target-");
  const before = await snapshotTree(targetRoot);

  const discovered = await COMMANDS.discoverableCommandMap("codex", {
    ...EXTERNAL_CONTEXT,
    repoRoot: targetRoot,
    skillRoot: REPOSITORY_ROOT,
  });

  assert.deepEqual(discovered.map((command) => command.canonical).sort(), [
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
  assert.deepEqual(await snapshotTree(targetRoot), before);
});
