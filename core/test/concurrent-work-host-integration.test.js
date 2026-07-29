import test from "node:test";
import assert from "node:assert/strict";
import * as CORE from "../src/index.js";
import { temporaryCurrentWorkspace } from "./fixtures/c21-m2/helpers.js";
import { goalDesignInput, soloTopologyInput } from "./fixtures/c21-m6/helpers.js";

const NOW = "2026-07-29T06:00:00+08:00";

test("SessionStart requires explicit Work Item selection and Host status projects the selected Experiment", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-concurrent-host-");
  const deliveryStore = CORE.createDeliveryStore({ clock: () => NOW });
  const legacy = await deliveryStore.proposeGoal(root, {
    design: CORE.compileGoalDesign(goalDesignInput({ id: "legacy-foreground" })),
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: "host-legacy-delivery" });
  await CORE.writeActivePointer(root, {
    schema_version: "1",
    active: { delivery: legacy.object_ref },
  }, { id: "host-legacy-pointer" });

  const experimentStore = CORE.createExperimentStore({ clock: () => NOW });
  for (const id of ["experiment-a", "experiment-b"]) {
    await experimentStore.create(root, experimentInput(id), { id: `host-${id}` });
  }
  const placements = CORE.createWorkPlacementStore({ clock: () => NOW, lease_ttl_ms: 300_000 });
  for (const id of ["experiment-a", "experiment-b"]) {
    await placements.assessAndAcquire(root, {
      id: `${id}-placement`,
      work_item_ref: { kind: "experiment", id },
      session_binding: { host: "codex", session_id: `${id}-owner` },
      repository_claims: [],
      resource_claims: [],
      worktree_root: ".hypo-worktrees/project",
    }, { id: `host-${id}-placement` });
  }

  const unbound = await CORE.evaluateCodexHookEvent(root, sessionStart(root, "new-session"), {
    id: "host-unbound-session-start",
    clock: () => NOW,
  });
  assert.match(unbound.hookSpecificOutput.additionalContext, /select exactly one/i);
  assert.match(unbound.hookSpecificOutput.additionalContext, /experiment:experiment-a/);
  assert.doesNotMatch(unbound.hookSpecificOutput.additionalContext, /legacy-foreground/);
  const deniedTool = await CORE.evaluateCodexHookEvent(root, {
    ...hookBase(root, "new-session", "PreToolUse"),
    permission_mode: "default",
    turn_id: "turn-unbound-tool",
    tool_name: "Bash",
    tool_use_id: "tool-unbound",
    tool_input: { command: "echo must-not-run" },
  }, { id: "host-unbound-pre-tool", clock: () => NOW });
  assert.equal(deniedTool.hookSpecificOutput.permissionDecision, "deny");
  assert.match(deniedTool.hookSpecificOutput.permissionDecisionReason, /select exactly one/i);
  const deniedPermission = await CORE.evaluateCodexHookEvent(root, {
    ...hookBase(root, "new-session", "PermissionRequest"),
    permission_mode: "default",
    turn_id: "turn-unbound-permission",
    tool_name: "Bash",
    tool_input: { command: "echo must-not-run" },
  }, { id: "host-unbound-permission", clock: () => NOW });
  assert.equal(deniedPermission.hookSpecificOutput.decision.behavior, "deny");
  const deniedPrompt = await CORE.evaluateCodexHookEvent(root, {
    ...hookBase(root, "new-session", "UserPromptSubmit"),
    permission_mode: "default",
    turn_id: "turn-unbound-prompt",
    prompt: "continue the foreground work",
  }, { id: "host-unbound-prompt", clock: () => NOW });
  assert.equal(deniedPrompt.decision, "block");

  await placements.bindSession(root, {
    host: "codex",
    session_id: "new-session",
    work_item_ref: { kind: "experiment", id: "experiment-b" },
  }, { id: "host-bind-new-session" });
  const selected = await CORE.evaluateCodexHookEvent(root, sessionStart(root, "new-session"), {
    id: "host-selected-session-start",
    clock: () => NOW,
  });
  assert.deepEqual(selected, {});
  const preCompact = await CORE.evaluateCodexHookEvent(root, {
    ...hookBase(root, "new-session", "PreCompact"),
    turn_id: "turn-experiment-pre-compact",
    trigger: "auto",
  }, { id: "host-experiment-pre-compact", clock: () => NOW });
  assert.deepEqual(preCompact, { continue: true });
  const postCompact = await CORE.evaluateCodexHookEvent(root, {
    ...hookBase(root, "new-session", "PostCompact"),
    turn_id: "turn-experiment-post-compact",
    trigger: "auto",
  }, { id: "host-experiment-post-compact", clock: () => NOW });
  assert.deepEqual(postCompact, { continue: true });

  const status = await CORE.readHostStatusProjection(root);
  assert.equal(status.projection.session.status, "selected");
  assert.deepEqual(status.projection.session.work_item_ref, { kind: "experiment", id: "experiment-b" });
  assert.equal(status.projection.delivery, null, "legacy foreground Delivery must not replace a selected Experiment");
  assert.deepEqual(status.projection.work_items.map(({ id }) => id), ["experiment-a", "experiment-b"]);
});

test("an expired-only Placement registry allows Session management tools instead of deadlocking", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-expired-host-");
  let currentTime = NOW;
  await CORE.createExperimentStore({ clock: () => currentTime }).create(
    root,
    experimentInput("expired-experiment"),
    { id: "expired-host-experiment" },
  );
  const placements = CORE.createWorkPlacementStore({ clock: () => currentTime, lease_ttl_ms: 1_000 });
  await placements.assessAndAcquire(root, {
    id: "expired-host-placement",
    work_item_ref: { kind: "experiment", id: "expired-experiment" },
    session_binding: { host: "codex", session_id: "expired-owner" },
    repository_claims: [],
    resource_claims: [],
    worktree_root: ".hypo-worktrees/project",
  }, { id: "expired-host-placement-acquire" });
  currentTime = "2026-07-29T06:05:00+08:00";

  const selection = await placements.resolveSession(root, { host: "codex", session_id: "expired-owner" });
  assert.equal(selection.status, "none");
  const tool = await CORE.evaluateCodexHookEvent(root, {
    ...hookBase(root, "expired-owner", "PreToolUse"),
    permission_mode: "default",
    turn_id: "turn-expired-management",
    tool_name: "Bash",
    tool_use_id: "tool-expired-management",
    tool_input: { command: "echo placement-management" },
  }, { id: "expired-management-tool", clock: () => currentTime });
  assert.deepEqual(tool, {});
});

function sessionStart(root, sessionId) {
  return {
    ...hookBase(root, sessionId, "SessionStart"),
    permission_mode: "default",
    source: "startup",
  };
}

function hookBase(root, sessionId, event) {
  return {
    session_id: sessionId,
    transcript_path: null,
    cwd: root,
    hook_event_name: event,
    model: "gpt-5.6-codex",
  };
}

function experimentInput(id) {
  return {
    id,
    title: `Experiment ${id}`,
    project_ref: { kind: "project", id: "m2-fixture-project" },
    lane: "experiment",
    hypothesis: "Concurrent Session selection preserves the selected Work Item.",
    design: {
      kind: "screening",
      parameters: { variant: ["baseline"] },
      dataset_ref: "host-fixture",
    },
    baseline: {
      id: `${id}-baseline`,
      code_ref: "git:host-fixture",
      dataset_ref: "host-fixture",
      metric: { name: "value", value: 1, unit: "count" },
    },
  };
}
