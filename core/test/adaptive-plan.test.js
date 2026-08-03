import test from "node:test";
import assert from "node:assert/strict";
import * as ROOT_API from "../src/index.js";
import * as planning from "../src/planning/index.js";
import * as commands from "../src/commands/index.js";
import {
  REPOSITORY_ROOT,
  cyclePlanInput,
  goalDesignInput,
} from "./fixtures/c21-m6/helpers.js";

test("planning publishes the stable Delivery compilers", () => {
  for (const name of ["compileGoalDesign", "compilePlan", "compileCyclePlan", "selectDeliveryMode"]) {
    assert.equal(typeof planning[name], "function", name);
    assert.equal(typeof ROOT_API[name], "function", `Core root: ${name}`);
  }
});

test("Goal and Plan compilers enforce their structural contracts", () => {
  const goal = planning.compileGoalDesign(goalDesignInput());
  assert.equal(goal.delivery_kind, "goal");
  assert.equal(goal.status, "draft");
  assert.match(goal.plan_hash, /^[a-f0-9]{64}$/);
  assert.equal("milestones" in goal, false);

  assert.throws(
    () => planning.compilePlan(cyclePlanInput()),
    /at least one Stone|manual inspection/i,
  );
  const plan = planning.compilePlan(cyclePlanInput({
    milestones: cyclePlanInput().milestones.map((milestone, index) => index === 0 ? {
      ...milestone,
      stone: {
        id: "S1",
        review: "Inspect the storage contract before the API stage begins.",
        acceptance_criteria: ["The persisted item is visible in the review fixture."],
      },
    } : milestone),
  }));
  assert.equal(plan.delivery_mode, "plan");
  assert.equal(plan.milestones.filter((milestone) => milestone.stone).length, 1);
});

test("Stone presence alone selects Goal versus Plan", () => {
  assert.deepEqual(planning.selectDeliveryMode({ stones: [] }), {
    delivery_kind: "goal",
    stone_count: 0,
    reason: "no_manual_intermediate_check",
  });
  assert.deepEqual(planning.selectDeliveryMode({ stones: [{ id: "S1" }] }), {
    delivery_kind: "plan",
    stone_count: 1,
    reason: "manual_intermediate_check_required",
  });
});

test("final Proposal replies distinguish start, hold, and continued Discussion", async () => {
  const proposed = {
    workspace: "current",
    active_delivery: { status: "proposed" },
    skillRoot: REPOSITORY_ROOT,
  };

  const explicitStart = await commands.resolveWorkflowIntent("确认并开始", proposed);
  assert.equal(explicitStart.authority_intent, "delivery.approve_and_start");

  const contextualStart = await commands.resolveWorkflowIntent("可以", {
    ...proposed,
    awaiting_authority_intent: "delivery.approve_and_start",
  });
  assert.equal(contextualStart.authority_intent, "delivery.approve_and_start");

  const unscopedAgreement = await commands.resolveWorkflowIntent("可以", proposed);
  assert.equal("authority_intent" in unscopedAgreement, false);

  const hold = await commands.resolveWorkflowIntent("确认但不开始", proposed);
  assert.equal(hold.authority_intent, "delivery.approve");

  const discuss = await commands.resolveWorkflowIntent("不确认，继续讨论", proposed);
  assert.equal(discuss.authority_intent, "workflow.continue_discussion");
  assert.deepEqual(discuss.writes, []);
});
