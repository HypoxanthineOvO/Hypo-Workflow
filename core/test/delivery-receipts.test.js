import test from "node:test";
import assert from "node:assert/strict";
import * as ROOT_API from "../src/index.js";
import {
  DELIVERY_API_URL,
  EXPIRED_NOW,
  FIXED_NOW,
  GOAL_REF,
  LATER_NOW,
  OTHER_ACTOR,
  PLANNING_API_URL,
  TOPOLOGY_API_URL,
  USER_ACTOR,
  createDeliveryTestStore,
  goalDesignInput,
  importProbe,
  issueDeliveryReceipt,
  strictTopologyInput,
  structuredFeedback,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m6/helpers.js";

const DELIVERY_PROBE = await importProbe(DELIVERY_API_URL);
const PLANNING_PROBE = await importProbe(PLANNING_API_URL);
const TOPOLOGY_PROBE = await importProbe(TOPOLOGY_API_URL);
const HAS_RECEIPT_DELIVERY = !DELIVERY_PROBE.error
  && !PLANNING_PROBE.error
  && !TOPOLOGY_PROBE.error
  && typeof DELIVERY_PROBE.api?.createDeliveryStore === "function"
  && typeof DELIVERY_PROBE.api?.buildDeliveryReceiptContext === "function"
  && typeof PLANNING_PROBE.api?.compileGoalDesign === "function"
  && typeof TOPOLOGY_PROBE.api?.selectExecutionTopology === "function";
const receiptTest = HAS_RECEIPT_DELIVERY ? test : test.skip;

test("M6 exports exact Delivery Receipt context construction", () => {
  if (DELIVERY_PROBE.error) {
    assert.fail(`core/src/delivery/index.js must import cleanly: ${DELIVERY_PROBE.error.code || DELIVERY_PROBE.error.message}`);
  }
  assert.equal(typeof DELIVERY_PROBE.api.buildDeliveryReceiptContext, "function");
  assert.equal(typeof ROOT_API.buildDeliveryReceiptContext, "function");
});

receiptTest("Receipt context binds actor, intent, object, scope, plan hash, revision, and fresh state", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m6-receipt-context-");
  const api = combinedApi();
  const { store } = createDeliveryTestStore(api);
  const delivery = await seedGoal(api, store, root, "m6-receipt-context");
  const context = api.buildDeliveryReceiptContext(delivery, {
    actor: USER_ACTOR,
    intent: "delivery.approve",
  });

  assert.deepEqual(Object.keys(context).sort(), ["actor", "intent", "object_ref", "plan_hash", "scope"]);
  assert.deepEqual(context.actor, USER_ACTOR);
  assert.equal(context.intent, "delivery.approve");
  assert.deepEqual(context.object_ref, GOAL_REF);
  assert.equal(context.plan_hash, delivery.plan_hash);
  assert.equal(context.scope.delivery_kind, "goal");
  assert.equal(context.scope.expected_state, "proposed");
  assert.equal(context.scope.revision, 0);
  assert.equal(context.scope.action, "approve");
  assert.match(context.scope.state_hash, /^[a-f0-9]{64}$/);

  for (const intent of ["delivery.start", "delivery.accept", "delivery.reject", "delivery.delete"] ) {
    assert.throws(
      () => api.buildDeliveryReceiptContext(delivery, { actor: USER_ACTOR, intent }),
      /intent|state|transition|unsupported/i,
      `${intent} is invalid from proposed`,
    );
  }
});

receiptTest("wrong actor, scope, and plan bindings invalidate authorization without moving Delivery", async (t) => {
  const cases = [
    {
      name: "actor",
      mutate: (receipt) => ({ ...receipt, actor: OTHER_ACTOR }),
    },
    {
      name: "scope",
      mutate: (receipt) => ({ ...receipt, scope: { ...receipt.scope, revision: 99 } }),
    },
    {
      name: "plan",
      mutate: (receipt) => ({ ...receipt, plan_hash: "f".repeat(64) }),
    },
  ];
  const api = combinedApi();

  for (const entry of cases) {
    await t.test(entry.name, async (subtest) => {
      const root = await temporaryCurrentWorkspace(subtest, `hw-m6-receipt-wrong-${entry.name}-`);
      const { store } = createDeliveryTestStore(api);
      const delivery = await seedGoal(api, store, root, `m6-receipt-wrong-${entry.name}`);
      const receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.approve", {
        transaction_id: `m6-receipt-wrong-${entry.name}-issue`,
        tool_use_id: `m6-receipt-wrong-${entry.name}-tool`,
      });
      await assert.rejects(
        store.approve(root, entry.mutate(receipt), { id: `m6-receipt-wrong-${entry.name}-approve` }),
        /receipt|actor|scope|plan|drift|context|binding/i,
      );
      assert.equal((await store.read(root, GOAL_REF)).status, "proposed");
      const persisted = await api.readReceipt(root, receipt.receipt_id);
      assert.equal(persisted.state, "invalidated");
      assert.equal(persisted.invalidated_reason, "authorization_context_drift");
    });
  }
});

receiptTest("consumed, expired, and wrong-intent Receipts cannot be reused across transitions", async (t) => {
  const api = combinedApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m6-receipt-reuse-");
  const { store, setNow } = createDeliveryTestStore(api);
  let delivery = await seedGoal(api, store, root, "m6-receipt-reuse");
  const approve = await issueDeliveryReceipt(api, root, delivery, "delivery.approve", {
    transaction_id: "m6-receipt-reuse-approve-issue",
  });
  delivery = await store.approve(root, approve, { id: "m6-receipt-reuse-approve" });
  assert.equal(delivery.status, "waiting_to_start");
  assert.equal((await api.readReceipt(root, approve.receipt_id)).state, "consumed");

  await assert.rejects(
    store.approve(root, approve, { id: "m6-receipt-replay-approve" }),
    /replay|consumed|state|receipt|unusable/i,
  );
  assert.equal((await store.read(root, GOAL_REF)).status, "waiting_to_start");

  const wrongIntent = await issueDeliveryReceipt(api, root, delivery, "delivery.start", {
    transaction_id: "m6-receipt-wrong-intent-issue",
    tool_use_id: "m6-receipt-wrong-intent-tool",
  });
  await assert.rejects(
    store.approve(root, wrongIntent, { id: "m6-receipt-start-as-approve" }),
    /intent|receipt|state|transition|context/i,
  );
  assert.equal((await store.read(root, GOAL_REF)).status, "waiting_to_start");

  const expiring = await issueDeliveryReceipt(api, root, delivery, "delivery.start", {
    issued_at: FIXED_NOW,
    expires_at: LATER_NOW,
    now: FIXED_NOW,
    transaction_id: "m6-receipt-expiring-start-issue",
    tool_use_id: "m6-receipt-expiring-start-tool",
  });
  setNow(EXPIRED_NOW);
  await assert.rejects(
    store.start(root, expiring, { id: "m6-receipt-expired-start" }),
    /expired|receipt|time/i,
  );
  assert.equal((await store.read(root, GOAL_REF)).status, "waiting_to_start");
  assert.equal((await api.readReceipt(root, expiring.receipt_id)).state, "invalidated");
});

receiptTest("state and plan drift after revision make a previously valid start Receipt stale", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m6-receipt-stale-plan-");
  const api = combinedApi();
  const { store, setNow } = createDeliveryTestStore(api);
  let delivery = await seedGoal(api, store, root, "m6-receipt-stale-plan");
  let receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.approve");
  delivery = await store.approve(root, receipt, { id: "m6-receipt-stale-plan-approve" });
  const staleStart = await issueDeliveryReceipt(api, root, delivery, "delivery.start", {
    transaction_id: "m6-receipt-stale-plan-start-issue",
    tool_use_id: "m6-receipt-stale-plan-start-tool",
  });

  setNow(LATER_NOW);
  const revised = api.compileGoalDesign(goalDesignInput({
    revision: 1,
    outcome: "A revised FIFO queue API is verified after a new explicit start.",
  }));
  delivery = await store.recordRevision(root, {
    object_ref: GOAL_REF,
    actor: USER_ACTOR,
    feedback: structuredFeedback({ context: "Direction changed before start." }),
    proposal: revised,
  }, { id: "m6-receipt-stale-plan-revision" });
  assert.equal(delivery.status, "needs_revision");

  await assert.rejects(
    store.start(root, staleStart, { id: "m6-receipt-stale-plan-use" }),
    /plan|state|revision|drift|context|receipt/i,
  );
  assert.equal((await store.read(root, GOAL_REF)).status, "needs_revision");
  assert.equal((await api.readReceipt(root, staleStart.receipt_id)).state, "invalidated");
});

receiptTest("a Receipt for one Delivery object cannot authorize another object", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m6-receipt-object-");
  const api = combinedApi();
  const { store } = createDeliveryTestStore(api);
  const delivery = await seedGoal(api, store, root, "m6-receipt-object");
  const receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.approve");
  await assert.rejects(
    store.approve(root, {
      ...receipt,
      object_ref: { kind: "delivery", id: "cycle-alpha" },
    }, { id: "m6-receipt-wrong-object" }),
    /object|active|mismatch|receipt|context|not found/i,
  );
  assert.equal((await store.read(root, GOAL_REF)).status, "proposed");
});

async function seedGoal(api, store, root, id) {
  const design = api.compileGoalDesign(goalDesignInput());
  const topology = api.selectExecutionTopology(strictTopologyInput());
  return store.proposeGoal(root, { design, topology }, { id });
}

function combinedApi() {
  return {
    ...ROOT_API,
    ...DELIVERY_PROBE.api,
    ...PLANNING_PROBE.api,
    ...TOPOLOGY_PROBE.api,
  };
}
