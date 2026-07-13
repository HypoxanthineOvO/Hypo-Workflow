import test from "node:test";
import assert from "node:assert/strict";
import * as ROOT_API from "../src/index.js";
import {
  expectZeroWriteRejection,
  snapshotTree,
} from "./fixtures/c21-m2/helpers.js";
import {
  ACCEPT_NOW,
  CYCLE_REF,
  DELIVERY_API_URL,
  FIXED_NOW,
  GOAL_REF,
  LATER_NOW,
  PLANNING_API_URL,
  REVISION_NOW,
  TOPOLOGY_API_URL,
  USER_ACTOR,
  createDeliveryTestStore,
  cyclePlanInput,
  goalDesignInput,
  importProbe,
  issueDeliveryReceipt,
  soloTopologyInput,
  strictTopologyInput,
  structuredFeedback,
  temporaryCurrentWorkspace,
  writeWorkerEvidence,
} from "./fixtures/c21-m6/helpers.js";

const DELIVERY_PROBE = await importProbe(DELIVERY_API_URL);
const PLANNING_PROBE = await importProbe(PLANNING_API_URL);
const TOPOLOGY_PROBE = await importProbe(TOPOLOGY_API_URL);
const HAS_PREFLIGHT = !DELIVERY_PROBE.error
  && !PLANNING_PROBE.error
  && !TOPOLOGY_PROBE.error
  && typeof DELIVERY_PROBE.api?.createDeliveryStore === "function"
  && typeof PLANNING_PROBE.api?.compileGoalDesign === "function"
  && typeof PLANNING_PROBE.api?.compileCyclePlan === "function"
  && typeof TOPOLOGY_PROBE.api?.selectExecutionTopology === "function";
const preflightTest = HAS_PREFLIGHT ? test : test.skip;

preflightTest("an accepted Goal cannot be overwritten by another Goal with the same object_ref", async (t) => {
  const fixture = await acceptedGoal(t, "same-goal");
  const { api, root, store, delivery: accepted } = fixture;
  const originalRecord = await api.readRecord(root, accepted.plan_record_ref.id);
  const replacement = api.compileGoalDesign(goalDesignInput({
    outcome: "A conflicting replacement must not overwrite accepted authority.",
  }));
  const replacementTopology = api.selectExecutionTopology(strictTopologyInput());

  await expectZeroWriteRejection(
    root,
    () => store.proposeGoal(root, {
      design: replacement,
      topology: replacementTopology,
    }, { id: "m6-preflight-repeat-goal" }),
    /already|active|exists|terminal|replace|delivery|proposal/i,
  );

  assert.deepEqual(await store.read(root, GOAL_REF), accepted);
  assert.deepEqual(await api.readRecord(root, accepted.plan_record_ref.id), originalRecord);
});

preflightTest("an accepted Goal cannot be overwritten by a Cycle with the same object_ref", async (t) => {
  const fixture = await acceptedGoal(t, "same-id-kind-swap");
  const { api, root, store, delivery: accepted } = fixture;
  const originalRecord = await api.readRecord(root, accepted.plan_record_ref.id);
  const replacement = api.compileCyclePlan(cyclePlanInput({
    id: GOAL_REF.id,
    title: "Conflicting Cycle replacement",
    outcome: "A Cycle kind swap must not replace accepted Goal authority.",
  }));
  const replacementTopology = api.selectExecutionTopology(strictTopologyInput());

  await expectZeroWriteRejection(
    root,
    () => store.proposeCycle(root, {
      plan: replacement,
      topology: replacementTopology,
    }, { id: "m6-preflight-goal-cycle-kind-swap" }),
    /already|active|exists|terminal|replace|delivery|proposal|kind/i,
  );

  const preserved = await store.read(root, GOAL_REF);
  assert.deepEqual(preserved, accepted);
  assert.equal(preserved.delivery_kind, "goal");
  assert.equal("milestones" in preserved, false);
  assert.deepEqual(await api.readRecord(root, accepted.plan_record_ref.id), originalRecord);
});

preflightTest("a different Delivery id is rejected while the active Delivery is nonterminal", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m6-preflight-active-nonterminal-");
  const api = combinedApi();
  const { store } = createDeliveryTestStore(api);
  const topology = api.selectExecutionTopology(soloTopologyInput());
  const original = await store.proposeGoal(root, {
    design: api.compileGoalDesign(goalDesignInput()),
    topology,
  }, { id: "m6-preflight-active-seed" });
  const originalRecord = await api.readRecord(root, original.plan_record_ref.id);
  const next = api.compileGoalDesign(goalDesignInput({
    id: "goal-beta",
    title: "Second Goal",
    outcome: "The second Goal must wait until the active Goal is terminal.",
  }));

  await expectZeroWriteRejection(
    root,
    () => store.proposeGoal(root, { design: next, topology }, { id: "m6-preflight-active-second" }),
    /active|nonterminal|another|delivery|state/i,
  );

  const active = await api.readActivePointer(root);
  assert.equal(active.schema_version, "1");
  assert.deepEqual(active.active.delivery, GOAL_REF);
  assert.deepEqual(await store.read(root, GOAL_REF), original);
  assert.deepEqual(await api.readRecord(root, original.plan_record_ref.id), originalRecord);
});

preflightTest("an accepted Goal allows a new Goal id and atomically switches the active pointer", async (t) => {
  const fixture = await acceptedGoal(t, "accepted-new-goal");
  const { api, root, store, delivery: accepted } = fixture;
  const originalRecord = await api.readRecord(root, accepted.plan_record_ref.id);
  const originalRuntime = await api.readRuntimeObject(root, GOAL_REF);
  const nextRef = { kind: "delivery", id: "goal-beta" };
  const next = api.compileGoalDesign(goalDesignInput({
    id: nextRef.id,
    title: "Deliver the follow-up Goal",
    outcome: "A new Goal becomes active after the previous Goal is accepted.",
  }));

  const proposed = await store.proposeGoal(root, {
    design: next,
    topology: api.selectExecutionTopology(soloTopologyInput()),
  }, { id: "m6-preflight-accepted-new-goal" });

  assert.deepEqual(proposed.object_ref, nextRef);
  assert.equal(proposed.status, "proposed");
  assert.deepEqual((await api.readActivePointer(root)).active.delivery, nextRef);
  assert.deepEqual(await store.read(root, GOAL_REF), accepted);
  assert.deepEqual(await api.readRuntimeObject(root, GOAL_REF), originalRuntime);
  assert.deepEqual(await api.readRecord(root, accepted.plan_record_ref.id), originalRecord);
});

preflightTest("an accepted Goal allows a new Cycle id without losing old Runtime or Records", async (t) => {
  const fixture = await acceptedGoal(t, "accepted-new-cycle");
  const { api, root, store, delivery: accepted } = fixture;
  const originalRecord = await api.readRecord(root, accepted.plan_record_ref.id);
  const originalRuntime = await api.readRuntimeObject(root, GOAL_REF);
  const next = api.compileCyclePlan(cyclePlanInput());

  const proposed = await store.proposeCycle(root, {
    plan: next,
    topology: api.selectExecutionTopology(strictTopologyInput()),
  }, { id: "m6-preflight-accepted-new-cycle" });

  assert.deepEqual(proposed.object_ref, CYCLE_REF);
  assert.equal(proposed.delivery_kind, "cycle");
  assert.equal(proposed.status, "proposed");
  assert.deepEqual((await api.readActivePointer(root)).active.delivery, CYCLE_REF);
  assert.deepEqual(await store.read(root, GOAL_REF), accepted);
  assert.deepEqual(await api.readRuntimeObject(root, GOAL_REF), originalRuntime);
  assert.deepEqual(await api.readRecord(root, accepted.plan_record_ref.id), originalRecord);
});

preflightTest("rejection cannot build or issue approval until recordRevision persists a new plan", async (t) => {
  const fixture = await rejectedGoal(t, "feedback-pending");
  const { api, root, store, delivery: rejected, feedback } = fixture;
  const rejectedTree = await snapshotTree(root);
  const rejectedPlanHash = rejected.plan_hash;
  const rejectedPlanRecordRef = rejected.plan_record_ref;

  assert.throws(
    () => api.buildDeliveryReceiptContext(rejected, {
      actor: USER_ACTOR,
      intent: "delivery.approve",
    }),
    /revision|proposal|feedback|pending|approve|state/i,
  );
  await assert.rejects(
    issueDeliveryReceipt(api, root, rejected, "delivery.approve", {
      now: REVISION_NOW,
      transaction_id: "m6-preflight-feedback-pending-issue",
    }),
    /revision|proposal|feedback|pending|approve|state/i,
  );
  assert.deepEqual(await snapshotTree(root), rejectedTree);
  assert.equal((await store.read(root, GOAL_REF)).plan_hash, rejectedPlanHash);
  assert.deepEqual((await store.read(root, GOAL_REF)).plan_record_ref, rejectedPlanRecordRef);

  const revisedDesign = api.compileGoalDesign(goalDesignInput({
    revision: 1,
    outcome: "The revised FIFO Goal is ready for renewed approval.",
  }));
  const revised = await store.recordRevision(root, {
    object_ref: GOAL_REF,
    actor: USER_ACTOR,
    feedback,
    proposal: revisedDesign,
  }, { id: "m6-preflight-feedback-pending-revision" });
  assert.equal(revised.status, "needs_revision");
  assert.notEqual(revised.plan_hash, rejectedPlanHash);
  assert.notDeepEqual(revised.plan_record_ref, rejectedPlanRecordRef);

  const receipt = await issueDeliveryReceipt(api, root, revised, "delivery.approve", {
    now: REVISION_NOW,
    transaction_id: "m6-preflight-proposal-ready-issue",
  });
  const approved = await store.approve(root, receipt, { id: "m6-preflight-proposal-ready-approve" });
  assert.equal(approved.status, "waiting_to_start");
});

preflightTest("a pre-rejection approval Receipt fails after rejection without any authority write", async (t) => {
  const fixture = await rejectedGoal(t, "stale-approve", { retainStaleApproval: true });
  const { root, store, delivery: rejected, staleApproval } = fixture;
  const before = await snapshotTree(root);

  await assert.rejects(
    store.approve(root, staleApproval, { id: "m6-preflight-reject-stale-approve" }),
    /revision|proposal|feedback|pending|receipt|state|drift|approve/i,
  );

  assert.deepEqual(
    await snapshotTree(root),
    before,
    "approval preflight must reject before reserving or invalidating a stale Receipt",
  );
  const preserved = await store.read(root, GOAL_REF);
  assert.equal(preserved.status, "needs_revision");
  assert.equal(preserved.plan_hash, rejected.plan_hash);
  assert.deepEqual(preserved.plan_record_ref, rejected.plan_record_ref);
});

async function acceptedGoal(t, suffix) {
  const fixture = await goalAtPendingAcceptance(t, suffix);
  const { api, root, store, setNow } = fixture;
  setNow(ACCEPT_NOW);
  const receipt = await issueDeliveryReceipt(api, root, fixture.delivery, "delivery.accept", {
    now: ACCEPT_NOW,
    transaction_id: `m6-preflight-${suffix}-accept-receipt`,
    tool_use_id: `m6-preflight-${suffix}-accept`,
  });
  const delivery = await store.accept(root, receipt, { id: `m6-preflight-${suffix}-accept` });
  assert.equal(delivery.status, "accepted");
  return { ...fixture, delivery };
}

async function rejectedGoal(t, suffix, options = {}) {
  const fixture = await goalAtPendingAcceptance(t, suffix, options);
  const { api, root, store, setNow } = fixture;
  setNow(REVISION_NOW);
  const receipt = await issueDeliveryReceipt(api, root, fixture.delivery, "delivery.reject", {
    now: REVISION_NOW,
    transaction_id: `m6-preflight-${suffix}-reject-receipt`,
    tool_use_id: `m6-preflight-${suffix}-reject`,
  });
  const feedback = structuredFeedback();
  const delivery = await store.reject(root, {
    ...receipt,
    feedback,
  }, { id: `m6-preflight-${suffix}-reject` });
  assert.equal(delivery.status, "needs_revision");
  return { ...fixture, delivery, feedback };
}

async function goalAtPendingAcceptance(t, suffix, options = {}) {
  const root = await temporaryCurrentWorkspace(t, `hw-m6-preflight-${suffix}-`);
  const api = combinedApi();
  const { store, setNow } = createDeliveryTestStore(api);
  const design = api.compileGoalDesign(goalDesignInput());
  const topology = api.selectExecutionTopology(soloTopologyInput());
  let delivery = await store.proposeGoal(root, {
    design,
    topology,
  }, { id: `m6-preflight-${suffix}-propose` });

  let staleApproval = null;
  if (options.retainStaleApproval) {
    staleApproval = await issueDeliveryReceipt(api, root, delivery, "delivery.approve", {
      expires_at: "2098-01-01T00:00:00Z",
      transaction_id: `m6-preflight-${suffix}-stale-approve-receipt`,
      tool_use_id: `m6-preflight-${suffix}-stale-approve`,
    });
  }
  let receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.approve", {
    transaction_id: `m6-preflight-${suffix}-approve-receipt`,
    tool_use_id: `m6-preflight-${suffix}-approve`,
  });
  delivery = await store.approve(root, receipt, { id: `m6-preflight-${suffix}-approve` });

  setNow(LATER_NOW);
  receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.start", {
    now: LATER_NOW,
    transaction_id: `m6-preflight-${suffix}-start-receipt`,
    tool_use_id: `m6-preflight-${suffix}-start`,
  });
  delivery = await store.start(root, receipt, { id: `m6-preflight-${suffix}-start` });
  const evidence = await writeWorkerEvidence(root, ["implement"], {
    object_id: GOAL_REF.id,
    prefix: `preflight-${suffix}`,
  });
  delivery = await store.verify(root, {
    object_ref: GOAL_REF,
    evidence,
  }, { id: `m6-preflight-${suffix}-verify` });
  delivery = await store.requestAcceptance(root, {
    object_ref: GOAL_REF,
  }, { id: `m6-preflight-${suffix}-request-acceptance` });
  assert.equal(delivery.status, "pending_acceptance");
  return { api, root, store, setNow, delivery, staleApproval };
}

function combinedApi() {
  return {
    ...ROOT_API,
    ...DELIVERY_PROBE.api,
    ...PLANNING_PROBE.api,
    ...TOPOLOGY_PROBE.api,
  };
}
