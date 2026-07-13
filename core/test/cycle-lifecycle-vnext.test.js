import test from "node:test";
import assert from "node:assert/strict";
import * as ROOT_API from "../src/index.js";
import {
  ACCEPT_NOW,
  CYCLE_REF,
  DELIVERY_API_URL,
  FIXED_NOW,
  LATER_NOW,
  PLANNING_API_URL,
  REVISION_NOW,
  TOPOLOGY_API_URL,
  USER_ACTOR,
  createDeliveryTestStore,
  cyclePlanInput,
  freshDeliveryCall,
  freshReceipt,
  freshRootCall,
  importProbe,
  initializeGitWorkspace,
  issueDeliveryReceipt,
  productSnapshot,
  sealDeliveryRecoveryPack,
  strictTopologyInput,
  structuredFeedback,
  temporaryCurrentWorkspace,
  temporaryGitRepository,
  writeProductFile,
  writeWorkerEvidence,
} from "./fixtures/c21-m6/helpers.js";

const DELIVERY_PROBE = await importProbe(DELIVERY_API_URL);
const PLANNING_PROBE = await importProbe(PLANNING_API_URL);
const TOPOLOGY_PROBE = await importProbe(TOPOLOGY_API_URL);
const HAS_CYCLE = !DELIVERY_PROBE.error
  && !PLANNING_PROBE.error
  && !TOPOLOGY_PROBE.error
  && typeof DELIVERY_PROBE.api?.createDeliveryStore === "function"
  && typeof PLANNING_PROBE.api?.compileCyclePlan === "function"
  && typeof TOPOLOGY_PROBE.api?.selectExecutionTopology === "function";
const cycleTest = HAS_CYCLE ? test : test.skip;

test("M6 Cycle compiler and Delivery store are available as peer-delivery APIs", () => {
  if (PLANNING_PROBE.error) {
    assert.fail(`core/src/planning/index.js must import cleanly: ${PLANNING_PROBE.error.code || PLANNING_PROBE.error.message}`);
  }
  if (DELIVERY_PROBE.error) {
    assert.fail(`core/src/delivery/index.js must import cleanly: ${DELIVERY_PROBE.error.code || DELIVERY_PROBE.error.message}`);
  }
  assert.equal(typeof PLANNING_PROBE.api.compileCyclePlan, "function");
  assert.equal(typeof DELIVERY_PROBE.api.createDeliveryStore, "function");
  assert.equal(typeof ROOT_API.compileCyclePlan, "function");
  assert.equal(typeof ROOT_API.createDeliveryStore, "function");
});

cycleTest("Cycle proposal persists ordered Milestones but no Milestone acceptance gates", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m6-cycle-proposal-");
  const api = combinedApi();
  const { store } = createDeliveryTestStore(api);
  const plan = api.compileCyclePlan(cyclePlanInput());
  const topology = api.selectExecutionTopology(strictTopologyInput());
  const proposed = await store.proposeCycle(root, { plan, topology }, { id: "m6-cycle-proposal" });

  assert.deepEqual(proposed.object_ref, CYCLE_REF);
  assert.equal(proposed.delivery_kind, "cycle");
  assert.equal(proposed.status, "proposed");
  assert.deepEqual(proposed.milestones.map((item) => [item.id, item.order, item.status]), [
    ["M1", 1, "pending"],
    ["M2", 2, "pending"],
  ]);
  for (const milestone of proposed.milestones) {
    assert.equal("acceptance" in milestone, false);
    assert.equal("acceptance_state" in milestone, false);
    assert.equal("receipt" in milestone, false);
  }
  const record = await api.readRecord(root, proposed.plan_record_ref.id);
  assert.equal(record.attributes.kind, "decision");
  assert.equal(record.attributes.scope.type, "cycle");
  assert.equal(record.attributes.scope.ref, CYCLE_REF.id);
});

cycleTest("Cycle enforces Milestone order and only aggregate verification can request acceptance", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m6-cycle-order-");
  const api = combinedApi();
  const { store, setNow } = createDeliveryTestStore(api);
  const plan = api.compileCyclePlan(cyclePlanInput());
  const topology = api.selectExecutionTopology(strictTopologyInput());
  let delivery = await store.proposeCycle(root, { plan, topology }, { id: "m6-cycle-order-propose" });
  let receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.approve");
  delivery = await store.approve(root, receipt, { id: "m6-cycle-order-approve" });
  setNow(LATER_NOW);
  receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.start", { now: LATER_NOW });
  delivery = await store.start(root, receipt, { id: "m6-cycle-order-start" });
  assert.equal(delivery.status, "executing");

  const m2Evidence = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: CYCLE_REF.id,
    prefix: "cycle-order-m2-early",
  });
  await assert.rejects(
    store.verifyMilestone(root, {
      object_ref: CYCLE_REF,
      milestone_id: "M2",
      evidence: m2Evidence,
    }, { id: "m6-cycle-order-m2-early" }),
    /M1|order|dependency|previous|milestone/i,
  );
  delivery = await store.read(root, CYCLE_REF);
  assert.deepEqual(delivery.milestones.map((item) => item.status), ["executing", "pending"]);

  const m1Evidence = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: CYCLE_REF.id,
    prefix: "cycle-order-m1",
  });
  delivery = await store.verifyMilestone(root, {
    object_ref: CYCLE_REF,
    milestone_id: "M1",
    evidence: m1Evidence,
  }, { id: "m6-cycle-order-m1" });
  assert.deepEqual(delivery.milestones.map((item) => item.status), ["verified", "executing"]);
  assert.equal(delivery.status, "executing");
  await assert.rejects(
    store.requestAcceptance(root, { object_ref: CYCLE_REF }, { id: "m6-cycle-order-premature-acceptance" }),
    /verified|milestone|state|complete/i,
  );

  const m2Valid = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: CYCLE_REF.id,
    prefix: "cycle-order-m2",
  });
  delivery = await store.verifyMilestone(root, {
    object_ref: CYCLE_REF,
    milestone_id: "M2",
    evidence: m2Valid,
  }, { id: "m6-cycle-order-m2" });
  assert.deepEqual(delivery.milestones.map((item) => item.status), ["verified", "verified"]);
  assert.equal(delivery.status, "executing");

  delivery = await store.verify(root, { object_ref: CYCLE_REF, evidence: m2Valid }, { id: "m6-cycle-order-aggregate" });
  assert.equal(delivery.status, "verified");
  delivery = await store.requestAcceptance(root, { object_ref: CYCLE_REF }, { id: "m6-cycle-order-pending" });
  assert.equal(delivery.status, "pending_acceptance");
  assert.equal(delivery.milestones.some((item) => item.status === "pending_acceptance"), false);
});

cycleTest("real two-Milestone Cycle survives reject, revised plan, fresh starts, and one final acceptance", async (t) => {
  const root = await temporaryGitRepository(t, "hw-m6-cycle-e2e-");
  const api = combinedApi();
  await initializeGitWorkspace(api, root, {
    project_id: "m6-cycle-e2e",
    workspace_id: "m6-cycle-e2e-local",
    transaction_id: "m6-cycle-e2e-init",
  });
  const initialProduct = await productSnapshot(root);
  const planV1 = freshRootCall(root, "compileCyclePlan", [cyclePlanInput()], FIXED_NOW);
  const topology = freshRootCall(root, "selectExecutionTopology", [strictTopologyInput()], FIXED_NOW);
  let delivery = freshDeliveryCall(root, "proposeCycle", [
    { plan: planV1, topology },
    { id: "m6-cycle-e2e-propose-v1" },
  ], FIXED_NOW);
  let receipt = freshReceipt(root, CYCLE_REF, "delivery.approve", {
    now: FIXED_NOW,
    transaction_id: "m6-cycle-e2e-receipt-approve-v1",
    tool_use_id: "m6-cycle-e2e-approve-v1",
  });
  delivery = freshDeliveryCall(root, "approve", [receipt, { id: "m6-cycle-e2e-approve-v1" }], FIXED_NOW);
  assert.equal(delivery.status, "waiting_to_start");
  assert.deepEqual(await productSnapshot(root), initialProduct);
  receipt = freshReceipt(root, CYCLE_REF, "delivery.start", {
    now: LATER_NOW,
    transaction_id: "m6-cycle-e2e-receipt-start-v1",
    tool_use_id: "m6-cycle-e2e-start-v1",
  });
  delivery = freshDeliveryCall(root, "start", [receipt, { id: "m6-cycle-e2e-start-v1" }], LATER_NOW);
  assert.equal(delivery.status, "executing");
  assert.deepEqual(await productSnapshot(root), initialProduct);

  await writeProductFile(root, "src/storage.js", "export const take = (items) => items.pop();\n");
  const m1v1 = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: CYCLE_REF.id,
    prefix: "cycle-e2e-m1-v1",
  });
  delivery = freshDeliveryCall(root, "verifyMilestone", [{
    object_ref: CYCLE_REF,
    milestone_id: "M1",
    evidence: m1v1,
  }, { id: "m6-cycle-e2e-m1-v1" }], LATER_NOW);
  await writeProductFile(root, "src/api.js", "export const dequeue = (items) => items.pop();\n");
  const m2v1 = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: CYCLE_REF.id,
    prefix: "cycle-e2e-m2-v1",
  });
  delivery = freshDeliveryCall(root, "verifyMilestone", [{
    object_ref: CYCLE_REF,
    milestone_id: "M2",
    evidence: m2v1,
  }, { id: "m6-cycle-e2e-m2-v1" }], LATER_NOW);
  delivery = freshDeliveryCall(root, "verify", [
    { object_ref: CYCLE_REF, evidence: m2v1 },
    { id: "m6-cycle-e2e-aggregate-v1" },
  ], LATER_NOW);
  delivery = freshDeliveryCall(root, "requestAcceptance", [
    { object_ref: CYCLE_REF },
    { id: "m6-cycle-e2e-pending-v1" },
  ], LATER_NOW);
  assert.equal(delivery.status, "pending_acceptance");

  receipt = freshReceipt(root, CYCLE_REF, "delivery.reject", {
    now: REVISION_NOW,
    transaction_id: "m6-cycle-e2e-receipt-reject-v1",
    tool_use_id: "m6-cycle-e2e-reject-v1",
  });
  const feedback = structuredFeedback({ context: "Cycle-level manual acceptance after M2." });
  delivery = freshDeliveryCall(root, "reject", [
    { ...receipt, feedback },
    { id: "m6-cycle-e2e-reject-v1" },
  ], REVISION_NOW);
  assert.equal(delivery.status, "needs_revision");
  const rejectedProduct = await productSnapshot(root);

  const planV2 = freshRootCall(root, "compileCyclePlan", [cyclePlanInput({
    revision: 1,
    outcome: "Storage and API preserve FIFO order, verify in sequence, and receive one Cycle acceptance.",
  })], REVISION_NOW);
  delivery = freshDeliveryCall(root, "recordRevision", [{
    object_ref: CYCLE_REF,
    actor: USER_ACTOR,
    feedback,
    proposal: planV2,
  }, { id: "m6-cycle-e2e-revision-v2" }], REVISION_NOW);
  assert.equal(delivery.status, "needs_revision");
  assert.equal(delivery.revision, 1);
  assert.deepEqual(delivery.milestones.map((item) => item.status), ["pending", "pending"]);
  assert.deepEqual(await productSnapshot(root), rejectedProduct);

  receipt = freshReceipt(root, CYCLE_REF, "delivery.approve", {
    now: REVISION_NOW,
    transaction_id: "m6-cycle-e2e-receipt-approve-v2",
    tool_use_id: "m6-cycle-e2e-approve-v2",
  });
  delivery = freshDeliveryCall(root, "approve", [receipt, { id: "m6-cycle-e2e-approve-v2" }], REVISION_NOW);
  assert.equal(delivery.status, "waiting_to_start");
  assert.deepEqual(await productSnapshot(root), rejectedProduct);
  receipt = freshReceipt(root, CYCLE_REF, "delivery.start", {
    now: ACCEPT_NOW,
    transaction_id: "m6-cycle-e2e-receipt-start-v2",
    tool_use_id: "m6-cycle-e2e-start-v2",
  });
  delivery = freshDeliveryCall(root, "start", [receipt, { id: "m6-cycle-e2e-start-v2" }], ACCEPT_NOW);
  assert.equal(delivery.status, "executing");

  await writeProductFile(root, "src/storage.js", "export const take = (items) => items.shift();\n");
  const m1v2 = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: CYCLE_REF.id,
    prefix: "cycle-e2e-m1-v2",
  });
  delivery = freshDeliveryCall(root, "verifyMilestone", [{
    object_ref: CYCLE_REF,
    milestone_id: "M1",
    evidence: m1v2,
  }, { id: "m6-cycle-e2e-m1-v2" }], ACCEPT_NOW);
  await writeProductFile(root, "src/api.js", "export const dequeue = (items) => items.shift();\n");
  const m2v2 = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: CYCLE_REF.id,
    prefix: "cycle-e2e-m2-v2",
  });
  delivery = freshDeliveryCall(root, "verifyMilestone", [{
    object_ref: CYCLE_REF,
    milestone_id: "M2",
    evidence: m2v2,
  }, { id: "m6-cycle-e2e-m2-v2" }], ACCEPT_NOW);
  delivery = freshDeliveryCall(root, "verify", [
    { object_ref: CYCLE_REF, evidence: m2v2 },
    { id: "m6-cycle-e2e-aggregate-v2" },
  ], ACCEPT_NOW);
  delivery = freshDeliveryCall(root, "requestAcceptance", [
    { object_ref: CYCLE_REF },
    { id: "m6-cycle-e2e-pending-v2" },
  ], ACCEPT_NOW);
  receipt = freshReceipt(root, CYCLE_REF, "delivery.accept", {
    now: ACCEPT_NOW,
    transaction_id: "m6-cycle-e2e-receipt-accept-v2",
    tool_use_id: "m6-cycle-e2e-accept-v2",
  });
  const acceptReceiptId = receipt.receipt_id;
  delivery = freshDeliveryCall(root, "accept", [receipt, { id: "m6-cycle-e2e-accept-v2" }], ACCEPT_NOW);
  assert.equal(delivery.status, "accepted");
  assert.equal(delivery.milestones.every((item) => item.status === "verified"), true);
  assert.equal(delivery.milestones.some((item) => "acceptance" in item), false);

  await sealDeliveryRecoveryPack(api, root, delivery, {
    now: ACCEPT_NOW,
    receipt_ids: [acceptReceiptId],
    session_id: "m6-cycle-e2e-final",
  });
  const resumed = freshDeliveryCall(root, "resume", [{}], ACCEPT_NOW);
  assert.equal(resumed.delivery.status, "accepted");
  assert.equal(resumed.delivery.delivery_kind, "cycle");
  assert.equal(resumed.delivery.revision, 1);
  assert.deepEqual(resumed.delivery.milestones.map((item) => item.id), ["M1", "M2"]);
  assert.equal(resumed.recovery.pack_status, "current");
});

function combinedApi() {
  return {
    ...ROOT_API,
    ...DELIVERY_PROBE.api,
    ...PLANNING_PROBE.api,
    ...TOPOLOGY_PROBE.api,
  };
}
