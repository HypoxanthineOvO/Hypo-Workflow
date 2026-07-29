import test from "node:test";
import assert from "node:assert/strict";
import * as CORE from "../src/index.js";
import {
  createDeliveryTestStore,
  cyclePlanInput,
  issueDeliveryReceipt,
  soloTopologyInput,
  structuredFeedback,
  temporaryCurrentWorkspace,
  writeWorkerEvidence,
} from "./fixtures/c21-m6/helpers.js";

test("confirmation can approve and start a Goal atomically", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-plan-confirm-start-");
  const { store } = createDeliveryTestStore(CORE);
  const design = CORE.compileGoalDesign({
    id: "goal-confirm-start",
    title: "Confirm and start",
    outcome: "The approved Goal starts in the same user-authorized transition.",
    acceptance_criteria: [{ id: "AC1", statement: "The Goal is executing.", verification: "Inspect Runtime." }],
    constraints: [],
    evidence: [{ type: "user", ref: "turn-confirm", summary: "The user selected confirm and start." }],
    revision: 0,
  });
  let delivery = await store.proposeGoal(root, {
    design,
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: "plan-confirm-propose" });
  const receipt = await issueDeliveryReceipt(CORE, root, delivery, "delivery.approve_and_start");
  delivery = await store.approveAndStart(root, receipt, { id: "plan-confirm-and-start" });
  assert.equal(delivery.status, "executing");
});

test("rejecting a Stone records feedback and returns the Plan to revision", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-plan-stone-reject-");
  const { store } = createDeliveryTestStore(CORE);
  const base = cyclePlanInput({ id: "plan-stone-reject" });
  const plan = CORE.compilePlan({
    ...base,
    milestones: base.milestones.map((milestone, index) => index === 0 ? {
      ...milestone,
      stone: {
        id: "S1",
        review: "Inspect the storage behavior before API implementation.",
        acceptance_criteria: ["The storage fixture preserves FIFO order."],
      },
    } : milestone),
  });
  let delivery = await store.proposePlan(root, {
    plan,
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: "plan-stone-reject-propose" });
  let receipt = await issueDeliveryReceipt(CORE, root, delivery, "delivery.approve_and_start");
  delivery = await store.approveAndStart(root, receipt, { id: "plan-stone-reject-start" });
  const evidence = await writeWorkerEvidence(root, ["implement"], {
    object_id: "plan-stone-reject",
    prefix: "m1",
  });
  delivery = await store.verifyMilestone(root, {
    object_ref: delivery.object_ref,
    milestone_id: "M1",
    evidence,
  }, { id: "plan-stone-reject-verify" });

  receipt = await issueDeliveryReceipt(CORE, root, delivery, "stone.reject");
  delivery = await store.rejectStone(root, {
    ...receipt,
    feedback: structuredFeedback({ context: "Stone S1 manual review." }),
  }, { id: "plan-stone-reject-transition" });
  assert.equal(delivery.status, "needs_revision");
  assert.equal(delivery.revision_state, "feedback_pending");
  assert.ok(delivery.feedback_record_ref);
});

test("Plan pauses only at a Stone and resumes the next Milestone after scoped acceptance", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-plan-stone-");
  const { store } = createDeliveryTestStore(CORE);
  const base = cyclePlanInput({ id: "plan-stone" });
  const plan = CORE.compilePlan({
    ...base,
    milestones: base.milestones.map((milestone, index) => index === 0 ? {
      ...milestone,
      stone: {
        id: "S1",
        review: "Inspect the storage behavior before API implementation.",
        acceptance_criteria: ["The storage fixture preserves FIFO order."],
      },
    } : milestone),
  });
  let delivery = await store.proposePlan(root, {
    plan,
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: "plan-stone-propose" });
  let receipt = await issueDeliveryReceipt(CORE, root, delivery, "delivery.approve_and_start");
  delivery = await store.approveAndStart(root, receipt, { id: "plan-stone-start" });
  assert.equal(delivery.status, "executing");
  assert.equal(delivery.milestones[0].status, "executing");

  const evidence = await writeWorkerEvidence(root, ["implement"], {
    object_id: "plan-stone",
    prefix: "m1",
  });
  delivery = await store.verifyMilestone(root, {
    object_ref: delivery.object_ref,
    milestone_id: "M1",
    evidence,
  }, { id: "plan-stone-verify-m1" });
  assert.equal(delivery.status, "waiting_for_stone");
  assert.equal(delivery.milestones[0].status, "pending_stone");
  assert.equal(delivery.milestones[1].status, "pending");

  receipt = await issueDeliveryReceipt(CORE, root, delivery, "stone.accept");
  assert.equal(receipt.scope.milestone_id, "M1");
  assert.equal(receipt.scope.stone_id, "S1");
  delivery = await store.acceptStone(root, receipt, { id: "plan-stone-accept-s1" });
  assert.equal(delivery.status, "executing");
  assert.equal(delivery.milestones[0].status, "verified");
  assert.equal(delivery.milestones[1].status, "executing");
});
