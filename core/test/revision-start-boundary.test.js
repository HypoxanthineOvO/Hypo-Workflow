import test from "node:test";
import assert from "node:assert/strict";
import * as ROOT_API from "../src/index.js";
import { snapshotTree } from "./fixtures/c21-m2/helpers.js";
import {
  DELIVERY_API_URL,
  FIXED_NOW,
  GOAL_REF,
  LATER_NOW,
  PLANNING_API_URL,
  REVISION_NOW,
  TOPOLOGY_API_URL,
  USER_ACTOR,
  createDeliveryTestStore,
  goalDesignInput,
  importProbe,
  initializeGitWorkspace,
  issueDeliveryReceipt,
  productSnapshot,
  soloTopologyInput,
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
const HAS_REVISION = !DELIVERY_PROBE.error
  && !PLANNING_PROBE.error
  && !TOPOLOGY_PROBE.error
  && typeof DELIVERY_PROBE.api?.createDeliveryStore === "function"
  && typeof PLANNING_PROBE.api?.compileGoalDesign === "function"
  && typeof TOPOLOGY_PROBE.api?.selectExecutionTopology === "function";
const revisionTest = HAS_REVISION ? test : test.skip;

test("M6 Delivery store exposes separate revision, approval, and explicit-start operations", () => {
  if (DELIVERY_PROBE.error) {
    assert.fail(`core/src/delivery/index.js must import cleanly: ${DELIVERY_PROBE.error.code || DELIVERY_PROBE.error.message}`);
  }
  const store = DELIVERY_PROBE.api.createDeliveryStore?.({ clock: () => FIXED_NOW });
  assert.equal(typeof store?.recordRevision, "function");
  assert.equal(typeof store?.approve, "function");
  assert.equal(typeof store?.start, "function");
});

revisionTest("direction-changing feedback writes Feedback + revised Plan Records but no product edits or auto-start", async (t) => {
  const root = await temporaryGitRepository(t, "hw-m6-revision-boundary-");
  const api = combinedApi();
  await initializeGitWorkspace(api, root, { project_id: "m6-revision-boundary" });
  const productBefore = await productSnapshot(root);
  const { store, setNow } = createDeliveryTestStore(api);
  const designV1 = api.compileGoalDesign(goalDesignInput());
  const topology = api.selectExecutionTopology(strictTopologyInput());
  let delivery = await store.proposeGoal(root, { design: designV1, topology }, { id: "m6-revision-propose-v1" });
  const originalPlanRecord = delivery.plan_record_ref;
  let receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.approve");
  delivery = await store.approve(root, receipt, { id: "m6-revision-approve-v1" });
  assert.equal(delivery.status, "waiting_to_start");
  const staleStart = await issueDeliveryReceipt(api, root, delivery, "delivery.start", {
    now: FIXED_NOW,
    transaction_id: "m6-revision-stale-start-receipt",
    tool_use_id: "m6-revision-stale-start",
  });

  setNow(LATER_NOW);
  const feedback = structuredFeedback({ context: "Proposal review before implementation." });
  const designV2 = api.compileGoalDesign(goalDesignInput({
    revision: 1,
    outcome: "A FIFO queue API returns the earliest item and passes only after explicit start.",
  }));
  delivery = await store.recordRevision(root, {
    object_ref: GOAL_REF,
    actor: USER_ACTOR,
    feedback,
    proposal: designV2,
  }, { id: "m6-revision-record-v2" });
  assert.equal(delivery.status, "needs_revision");
  assert.equal(delivery.revision, 1);
  assert.notEqual(delivery.plan_hash, designV1.plan_hash);
  assert.notEqual(delivery.plan_record_ref.id, originalPlanRecord.id);
  assert.ok(delivery.feedback_record_ref?.id);
  assert.deepEqual(await productSnapshot(root), productBefore);

  const feedbackRecord = await api.readRecord(root, delivery.feedback_record_ref.id);
  assert.equal(feedbackRecord.attributes.kind, "feedback");
  assert.equal(feedbackRecord.attributes.scope.type, "goal");
  for (const value of [feedback.problem, feedback.expected, feedback.actual, feedback.context]) {
    assert.ok(feedbackRecord.body.includes(value));
  }
  const revisedPlanRecord = await api.readRecord(root, delivery.plan_record_ref.id);
  assert.equal(revisedPlanRecord.attributes.kind, "decision");
  assert.deepEqual(revisedPlanRecord.attributes.supersedes, [originalPlanRecord.id]);

  await assert.rejects(
    store.start(root, staleStart, { id: "m6-revision-use-stale-start" }),
    /receipt|plan|state|drift|revision|context/i,
  );
  assert.equal((await store.read(root, GOAL_REF)).status, "needs_revision");
  assert.deepEqual(await productSnapshot(root), productBefore);

  receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.approve", { now: LATER_NOW });
  delivery = await store.approve(root, receipt, { id: "m6-revision-approve-v2" });
  assert.equal(delivery.status, "waiting_to_start");
  assert.deepEqual(await productSnapshot(root), productBefore);
  assert.notEqual(delivery.status, "executing", "approval never implies start");

  setNow(REVISION_NOW);
  receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.start", { now: REVISION_NOW });
  delivery = await store.start(root, receipt, { id: "m6-revision-explicit-start-v2" });
  assert.equal(delivery.status, "executing");
  assert.deepEqual(await productSnapshot(root), productBefore, "Core only opens the implementation boundary");
});

revisionTest("feedback without a revised proposal cannot partially mutate authority or begin work", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m6-revision-missing-proposal-");
  const api = combinedApi();
  const { store } = createDeliveryTestStore(api);
  const design = api.compileGoalDesign(goalDesignInput());
  const topology = api.selectExecutionTopology(strictTopologyInput());
  await store.proposeGoal(root, { design, topology }, { id: "m6-revision-missing-proposal-seed" });
  const before = await snapshotTree(root);

  await assert.rejects(
    store.recordRevision(root, {
      object_ref: GOAL_REF,
      actor: USER_ACTOR,
      feedback: structuredFeedback(),
    }, { id: "m6-revision-missing-proposal" }),
    /proposal|plan|revision|required|schema/i,
  );
  assert.deepEqual(await snapshotTree(root), before);
  assert.equal((await store.read(root, GOAL_REF)).status, "proposed");
});

revisionTest("manual rejection returns to needs_revision and a later approval still needs a new start", async (t) => {
  const root = await temporaryGitRepository(t, "hw-m6-reject-start-boundary-");
  const api = combinedApi();
  await initializeGitWorkspace(api, root, { project_id: "m6-reject-start-boundary" });
  const { store, setNow } = createDeliveryTestStore(api);
  const designV1 = api.compileGoalDesign(goalDesignInput());
  const topology = api.selectExecutionTopology(soloTopologyInput());
  let delivery = await store.proposeGoal(root, { design: designV1, topology }, { id: "m6-reject-boundary-propose" });
  let receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.approve");
  delivery = await store.approve(root, receipt, { id: "m6-reject-boundary-approve" });
  setNow(LATER_NOW);
  receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.start", { now: LATER_NOW });
  delivery = await store.start(root, receipt, { id: "m6-reject-boundary-start" });
  await writeProductFile(root, "src/queue.js", "export const dequeue = (items) => items.pop();\n");
  const evidence = await writeWorkerEvidence(root, ["implement"], {
    object_id: GOAL_REF.id,
    prefix: "reject-boundary-solo",
  });
  delivery = await store.verify(root, { object_ref: GOAL_REF, evidence }, { id: "m6-reject-boundary-verify" });
  delivery = await store.requestAcceptance(root, { object_ref: GOAL_REF }, { id: "m6-reject-boundary-pending" });
  const productAtAcceptance = await productSnapshot(root);

  setNow(REVISION_NOW);
  receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.reject", { now: REVISION_NOW });
  const feedback = structuredFeedback();
  delivery = await store.reject(root, { ...receipt, feedback }, { id: "m6-reject-boundary-reject" });
  assert.equal(delivery.status, "needs_revision");
  assert.deepEqual(await productSnapshot(root), productAtAcceptance);

  const designV2 = api.compileGoalDesign(goalDesignInput({
    revision: 1,
    outcome: "A FIFO queue API returns the earliest item.",
  }));
  delivery = await store.recordRevision(root, {
    object_ref: GOAL_REF,
    actor: USER_ACTOR,
    feedback,
    proposal: designV2,
  }, { id: "m6-reject-boundary-revision" });
  receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.approve", { now: REVISION_NOW });
  delivery = await store.approve(root, receipt, { id: "m6-reject-boundary-reapprove" });
  assert.equal(delivery.status, "waiting_to_start");
  assert.deepEqual(await productSnapshot(root), productAtAcceptance);
});

function combinedApi() {
  return {
    ...ROOT_API,
    ...DELIVERY_PROBE.api,
    ...PLANNING_PROBE.api,
    ...TOPOLOGY_PROBE.api,
  };
}
