import test from "node:test";
import assert from "node:assert/strict";
import { lstat } from "node:fs/promises";
import { join } from "node:path";
import * as ROOT_API from "../src/index.js";
import {
  ACCEPT_NOW,
  DELIVERY_API_URL,
  DELIVERY_STORE_METHODS,
  FIXED_NOW,
  GOAL_REF,
  LATER_NOW,
  PLANNING_API_URL,
  REVISION_NOW,
  TOPOLOGY_API_URL,
  USER_ACTOR,
  createDeliveryTestStore,
  freshDeliveryCall,
  freshReceipt,
  freshRootCall,
  goalDesignInput,
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
const HAS_GOAL = !DELIVERY_PROBE.error
  && !PLANNING_PROBE.error
  && !TOPOLOGY_PROBE.error
  && typeof DELIVERY_PROBE.api?.createDeliveryStore === "function"
  && typeof DELIVERY_PROBE.api?.buildDeliveryReceiptContext === "function"
  && typeof PLANNING_PROBE.api?.compileGoalDesign === "function"
  && typeof TOPOLOGY_PROBE.api?.selectExecutionTopology === "function";
const goalTest = HAS_GOAL ? test : test.skip;

test("M6 publishes the Goal lifecycle store and receipt-context API", () => {
  if (DELIVERY_PROBE.error) {
    assert.fail(`core/src/delivery/index.js must import cleanly: ${DELIVERY_PROBE.error.code || DELIVERY_PROBE.error.message}`);
  }
  assert.equal(typeof DELIVERY_PROBE.api.createDeliveryStore, "function");
  assert.equal(typeof DELIVERY_PROBE.api.buildDeliveryReceiptContext, "function");
  assert.equal(typeof ROOT_API.createDeliveryStore, "function");
  assert.equal(typeof ROOT_API.buildDeliveryReceiptContext, "function");
  const store = DELIVERY_PROBE.api.createDeliveryStore({ clock: () => FIXED_NOW });
  for (const method of DELIVERY_STORE_METHODS) {
    assert.equal(typeof store[method], "function", `Delivery store must expose ${method}`);
  }
});

goalTest("Goal proposal persists one Design Record and never exposes a fake Milestone", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m6-goal-proposal-");
  const api = combinedApi();
  const { store } = createDeliveryTestStore(api);
  const design = api.compileGoalDesign(goalDesignInput());
  const topology = api.selectExecutionTopology(strictTopologyInput());
  const proposed = await store.proposeGoal(root, { design, topology }, { id: "m6-goal-proposal" });

  assert.deepEqual(proposed.object_ref, GOAL_REF);
  assert.equal(proposed.delivery_kind, "goal");
  assert.equal(proposed.status, "proposed");
  assert.equal(proposed.revision, 0);
  assert.equal(proposed.plan_hash, design.plan_hash);
  assert.equal("milestones" in proposed, false);
  assert.match(proposed.plan_record_ref.id, /^decision-/);
  assert.match(proposed.plan_record_ref.semantic_hash, /^[a-f0-9]{64}$/);

  const record = await api.readRecord(root, proposed.plan_record_ref.id);
  assert.equal(record.attributes.kind, "decision");
  assert.equal(record.attributes.scope.type, "goal");
  assert.equal(record.attributes.scope.ref, GOAL_REF.id);
  assert.equal(record.attributes.semantic_hash, proposed.plan_record_ref.semantic_hash);
  assert.match(record.body, /queue API|restart-safe/i);

  const active = await api.readActivePointer(root);
  assert.deepEqual(active.active.delivery, GOAL_REF);
  assert.equal(JSON.stringify(active).includes("proposed"), false, "active pointer contains references only");
  const runtime = await api.readRuntimeObject(root, GOAL_REF);
  assert.equal(runtime.runtime.status, "proposed");
  assert.equal("receipt" in runtime.runtime, false);
  assert.equal("receipts" in runtime.runtime, false);
});

goalTest("Goal runs proposed -> waiting -> executing -> verified -> pending acceptance -> accepted", async (t) => {
  const root = await temporaryGitRepository(t, "hw-m6-goal-lifecycle-");
  const api = combinedApi();
  await initializeGitWorkspace(api, root, { project_id: "m6-goal-lifecycle" });
  const productBefore = await productSnapshot(root);
  const { store, setNow } = createDeliveryTestStore(api);
  const design = api.compileGoalDesign(goalDesignInput());
  const topology = api.selectExecutionTopology(strictTopologyInput());
  let delivery = await store.proposeGoal(root, { design, topology }, { id: "m6-goal-lifecycle-propose" });
  assert.deepEqual(await productSnapshot(root), productBefore);

  let receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.approve");
  delivery = await store.approve(root, receipt, { id: "m6-goal-lifecycle-approve" });
  assert.equal(delivery.status, "waiting_to_start");
  assert.deepEqual(await productSnapshot(root), productBefore);

  await assert.rejects(
    store.verify(root, { object_ref: delivery.object_ref, evidence: [] }, { id: "m6-goal-before-start" }),
    /start|executing|state|evidence/i,
  );
  assert.equal((await store.read(root, delivery.object_ref)).status, "waiting_to_start");

  setNow(LATER_NOW);
  receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.start", { now: LATER_NOW });
  delivery = await store.start(root, receipt, { id: "m6-goal-lifecycle-start" });
  assert.equal(delivery.status, "executing");
  assert.deepEqual(await productSnapshot(root), productBefore, "explicit start authorizes work but Core does not write product files");

  await writeProductFile(root, "src/queue.js", "export const dequeue = (items) => items.shift();\n");
  const evidence = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: GOAL_REF.id,
    prefix: "goal-lifecycle",
  });
  delivery = await store.verify(root, { object_ref: GOAL_REF, evidence }, { id: "m6-goal-lifecycle-verify" });
  assert.equal(delivery.status, "verified");

  delivery = await store.requestAcceptance(root, { object_ref: GOAL_REF }, { id: "m6-goal-lifecycle-request-acceptance" });
  assert.equal(delivery.status, "pending_acceptance");
  setNow(ACCEPT_NOW);
  receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.accept", { now: ACCEPT_NOW });
  const acceptReceiptId = receipt.receipt_id;
  delivery = await store.accept(root, receipt, { id: "m6-goal-lifecycle-accept" });
  assert.equal(delivery.status, "accepted");
  assert.equal((await api.readReceipt(root, acceptReceiptId)).state, "consumed");

  await sealDeliveryRecoveryPack(api, root, delivery, {
    now: ACCEPT_NOW,
    receipt_ids: [acceptReceiptId],
  });
  const resumed = await store.resume(root, {});
  assert.equal(resumed.delivery.status, "accepted");
  assert.deepEqual(resumed.delivery.object_ref, GOAL_REF);
  assert.equal(resumed.recovery.pack_status, "current");
  assert.deepEqual(resumed.continuation.object_ref, GOAL_REF);
});

goalTest("real Goal repository survives fresh processes and manual reject/revision/start/accept", async (t) => {
  const root = await temporaryGitRepository(t, "hw-m6-goal-e2e-");
  const api = combinedApi();
  await initializeGitWorkspace(api, root, {
    project_id: "m6-goal-e2e",
    workspace_id: "m6-goal-e2e-local",
    transaction_id: "m6-goal-e2e-init",
  });
  const originalProduct = await productSnapshot(root);
  const designV1 = freshRootCall(root, "compileGoalDesign", [goalDesignInput()], FIXED_NOW);
  const topology = freshRootCall(root, "selectExecutionTopology", [strictTopologyInput()], FIXED_NOW);
  let delivery = freshDeliveryCall(root, "proposeGoal", [
    { design: designV1, topology },
    { id: "m6-goal-e2e-propose-v1" },
  ], FIXED_NOW);
  assert.equal(delivery.status, "proposed");
  assert.deepEqual(await productSnapshot(root), originalProduct);

  let receipt = freshReceipt(root, GOAL_REF, "delivery.approve", {
    now: FIXED_NOW,
    transaction_id: "m6-goal-e2e-receipt-approve-v1",
    tool_use_id: "m6-goal-e2e-approve-v1",
  });
  delivery = freshDeliveryCall(root, "approve", [receipt, { id: "m6-goal-e2e-approve-v1" }], FIXED_NOW);
  assert.equal(delivery.status, "waiting_to_start");
  receipt = freshReceipt(root, GOAL_REF, "delivery.start", {
    now: LATER_NOW,
    transaction_id: "m6-goal-e2e-receipt-start-v1",
    tool_use_id: "m6-goal-e2e-start-v1",
  });
  delivery = freshDeliveryCall(root, "start", [receipt, { id: "m6-goal-e2e-start-v1" }], LATER_NOW);
  assert.equal(delivery.status, "executing");
  assert.deepEqual(await productSnapshot(root), originalProduct);

  await writeProductFile(root, "src/queue.js", "export const dequeue = (items) => items.pop();\n");
  const evidenceV1 = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: GOAL_REF.id,
    prefix: "goal-e2e-v1",
  });
  delivery = freshDeliveryCall(root, "verify", [
    { object_ref: GOAL_REF, evidence: evidenceV1 },
    { id: "m6-goal-e2e-verify-v1" },
  ], LATER_NOW);
  delivery = freshDeliveryCall(root, "requestAcceptance", [
    { object_ref: GOAL_REF },
    { id: "m6-goal-e2e-pending-v1" },
  ], LATER_NOW);
  assert.equal(delivery.status, "pending_acceptance");

  receipt = freshReceipt(root, GOAL_REF, "delivery.reject", {
    now: REVISION_NOW,
    transaction_id: "m6-goal-e2e-receipt-reject-v1",
    tool_use_id: "m6-goal-e2e-reject-v1",
  });
  const feedback = structuredFeedback();
  delivery = freshDeliveryCall(root, "reject", [
    { ...receipt, feedback },
    { id: "m6-goal-e2e-reject-v1" },
  ], REVISION_NOW);
  assert.equal(delivery.status, "needs_revision");
  assert.ok(delivery.feedback_record_ref?.id);
  const rejectedProduct = await productSnapshot(root);

  const designV2 = freshRootCall(root, "compileGoalDesign", [goalDesignInput({
    revision: 1,
    outcome: "A FIFO queue API returns the earliest enqueued item and passes after explicit restart-safe execution.",
  })], REVISION_NOW);
  delivery = freshDeliveryCall(root, "recordRevision", [{
    object_ref: GOAL_REF,
    actor: USER_ACTOR,
    feedback,
    proposal: designV2,
  }, { id: "m6-goal-e2e-revision-v2" }], REVISION_NOW);
  assert.equal(delivery.status, "needs_revision");
  assert.equal(delivery.revision, 1);
  assert.notEqual(delivery.plan_hash, designV1.plan_hash);
  assert.deepEqual(await productSnapshot(root), rejectedProduct, "revised proposal is not editing authorization");

  receipt = freshReceipt(root, GOAL_REF, "delivery.approve", {
    now: REVISION_NOW,
    transaction_id: "m6-goal-e2e-receipt-approve-v2",
    tool_use_id: "m6-goal-e2e-approve-v2",
  });
  delivery = freshDeliveryCall(root, "approve", [receipt, { id: "m6-goal-e2e-approve-v2" }], REVISION_NOW);
  assert.equal(delivery.status, "waiting_to_start");
  assert.deepEqual(await productSnapshot(root), rejectedProduct);

  receipt = freshReceipt(root, GOAL_REF, "delivery.start", {
    now: ACCEPT_NOW,
    transaction_id: "m6-goal-e2e-receipt-start-v2",
    tool_use_id: "m6-goal-e2e-start-v2",
  });
  delivery = freshDeliveryCall(root, "start", [receipt, { id: "m6-goal-e2e-start-v2" }], ACCEPT_NOW);
  assert.equal(delivery.status, "executing");
  await writeProductFile(root, "src/queue.js", "export const dequeue = (items) => items.shift();\n");
  const evidenceV2 = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: GOAL_REF.id,
    prefix: "goal-e2e-v2",
  });
  for (const worker of evidenceV2) {
    const stats = await lstat(join(root, worker.evidence_refs[0].path));
    assert.equal(stats.isFile(), true);
  }
  delivery = freshDeliveryCall(root, "verify", [
    { object_ref: GOAL_REF, evidence: evidenceV2 },
    { id: "m6-goal-e2e-verify-v2" },
  ], ACCEPT_NOW);
  delivery = freshDeliveryCall(root, "requestAcceptance", [
    { object_ref: GOAL_REF },
    { id: "m6-goal-e2e-pending-v2" },
  ], ACCEPT_NOW);
  receipt = freshReceipt(root, GOAL_REF, "delivery.accept", {
    now: ACCEPT_NOW,
    transaction_id: "m6-goal-e2e-receipt-accept-v2",
    tool_use_id: "m6-goal-e2e-accept-v2",
  });
  const acceptReceiptId = receipt.receipt_id;
  delivery = freshDeliveryCall(root, "accept", [receipt, { id: "m6-goal-e2e-accept-v2" }], ACCEPT_NOW);
  assert.equal(delivery.status, "accepted");

  await sealDeliveryRecoveryPack(api, root, delivery, {
    now: ACCEPT_NOW,
    receipt_ids: [acceptReceiptId],
    session_id: "m6-goal-e2e-final",
  });
  const resumed = freshDeliveryCall(root, "resume", [{}], ACCEPT_NOW);
  assert.equal(resumed.delivery.status, "accepted");
  assert.equal(resumed.delivery.revision, 1);
  assert.deepEqual(resumed.delivery.object_ref, GOAL_REF);
  assert.equal(resumed.recovery.pack_status, "current");
});

goalTest("fresh-process Resume degrades to Runtime and Continuation when no Delivery Pack exists", async (t) => {
  const root = await temporaryGitRepository(t, "hw-m6-goal-no-pack-resume-");
  const api = combinedApi();
  await initializeGitWorkspace(api, root, {
    project_id: "m6-goal-no-pack-resume",
    workspace_id: "m6-goal-no-pack-resume-local",
    transaction_id: "m6-goal-no-pack-resume-init",
  });
  const productBefore = await productSnapshot(root);
  const design = freshRootCall(root, "compileGoalDesign", [goalDesignInput()], FIXED_NOW);
  const topology = freshRootCall(root, "selectExecutionTopology", [strictTopologyInput()], FIXED_NOW);
  const proposed = freshDeliveryCall(root, "proposeGoal", [
    { design, topology },
    { id: "m6-goal-no-pack-resume-propose" },
  ], FIXED_NOW);
  assert.equal(proposed.status, "proposed");

  const resumed = freshDeliveryCall(root, "resume", [{}], LATER_NOW);
  assert.equal(resumed.delivery.status, "proposed");
  assert.deepEqual(resumed.delivery.object_ref, GOAL_REF);
  assert.deepEqual(resumed.continuation.object_ref, GOAL_REF);
  assert.equal(resumed.recovery.pack_ref, null);
  assert.equal(resumed.recovery.pack_status, "missing");
  assert.equal(resumed.recovery.degraded, true);
  assert.deepEqual(await productSnapshot(root), productBefore);
});

goalTest("a stale valid Recovery Pack cannot replace newer Runtime authority", async (t) => {
  const root = await temporaryGitRepository(t, "hw-m6-goal-stale-pack-");
  const api = combinedApi();
  await initializeGitWorkspace(api, root, { project_id: "m6-goal-stale-pack" });
  const { store, setNow } = createDeliveryTestStore(api);
  const design = api.compileGoalDesign(goalDesignInput());
  const topology = api.selectExecutionTopology(strictTopologyInput());
  let delivery = await store.proposeGoal(root, { design, topology }, { id: "m6-goal-stale-propose" });
  await sealDeliveryRecoveryPack(api, root, delivery, { now: FIXED_NOW });

  setNow(LATER_NOW);
  const receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.approve", { now: LATER_NOW });
  delivery = await store.approve(root, receipt, { id: "m6-goal-stale-approve" });
  assert.equal(delivery.status, "waiting_to_start");

  const resumed = await store.resume(root, {});
  assert.equal(resumed.delivery.status, "waiting_to_start", "Runtime remains lifecycle authority");
  assert.equal(resumed.recovery.pack_status, "stale");
  assert.ok(resumed.recovery.replay_required);
  await assert.rejects(
    store.resume(root, { object_ref: { kind: "delivery", id: "another-goal" } }),
    /active|object|mismatch|not found|resume/i,
  );
});

function combinedApi() {
  return {
    ...ROOT_API,
    ...DELIVERY_PROBE.api,
    ...PLANNING_PROBE.api,
    ...TOPOLOGY_PROBE.api,
  };
}
