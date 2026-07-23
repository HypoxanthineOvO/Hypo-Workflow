import test from "node:test";
import assert from "node:assert/strict";
import * as CORE from "../src/index.js";
import {
  cyclePlanInput,
  goalDesignInput,
  issueDeliveryReceipt,
  soloTopologyInput,
  structuredFeedback,
  temporaryCurrentWorkspace,
  USER_ACTOR,
  writeWorkerEvidence,
} from "./fixtures/c21-m6/helpers.js";
import {
  expectZeroWriteRejection,
  snapshotTree,
} from "./fixtures/c21-m2/helpers.js";

const NOW = "2026-07-23T18:00:00+08:00";
const LATER = "2026-07-23T18:01:00+08:00";
const GIT_BASE = "a".repeat(40);
const REQUIRED_WORKSTREAM_API = ["createWorkstreamStore"];
const REQUIRED_HOST_API = [
  "compileVspiIntegrationContract",
  "parseVspiIntegrationContract",
];
const WORKSTREAM_METHODS = [
  "create",
  "read",
  "bindSession",
  "recordEvidence",
  "resume",
  "close",
];

const hasWorkstreamApi = REQUIRED_WORKSTREAM_API.every((name) => typeof CORE[name] === "function");
const hasHostApi = REQUIRED_HOST_API.every((name) => typeof CORE[name] === "function");
const workstreamTest = hasWorkstreamApi ? test : test.skip;
const hostTest = hasHostApi ? test : test.skip;

test("Core publishes the activity-backed Workstream and portable VSPi integration APIs", () => {
  for (const name of [...REQUIRED_WORKSTREAM_API, ...REQUIRED_HOST_API]) {
    assert.equal(typeof CORE[name], "function", `${name} must be exported from the Core root`);
  }
  const store = CORE.createWorkstreamStore?.({ clock: () => NOW });
  for (const method of WORKSTREAM_METHODS) {
    assert.equal(typeof store?.[method], "function", `Workstream store must expose ${method}`);
  }
  const delivery = CORE.createDeliveryStore({ clock: () => NOW });
  assert.equal(typeof delivery.claimMilestone, "function", "Delivery store must expose claimMilestone");
  assert.equal(typeof delivery.releaseMilestoneClaim, "function", "Delivery store must expose releaseMilestoneClaim");
});

test("multiple non-terminal Deliveries coexist while active.delivery remains a foreground pointer", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-vspi-multi-delivery-");
  const store = CORE.createDeliveryStore({ clock: () => NOW });
  const firstDesign = CORE.compileGoalDesign(goalDesignInput({ id: "parallel-goal-a", title: "Parallel goal A" }));
  const secondDesign = CORE.compileGoalDesign(goalDesignInput({ id: "parallel-goal-b", title: "Parallel goal B" }));
  let first = await store.proposeGoal(root, {
    design: firstDesign,
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: "parallel-goal-a-propose" });
  let second = await store.proposeGoal(root, {
    design: secondDesign,
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: "parallel-goal-b-propose" });

  assert.deepEqual((await CORE.readActivePointer(root)).active.delivery, second.object_ref);
  first = await startDelivery(root, store, first, "parallel-goal-a");
  second = await startDelivery(root, store, second, "parallel-goal-b");
  assert.equal(first.status, "executing");
  assert.equal(second.status, "executing");
  assert.deepEqual((await CORE.readActivePointer(root)).active.delivery, second.object_ref);
  assert.equal((await store.read(root, first.object_ref)).status, "executing");
  assert.equal((await store.read(root, second.object_ref)).status, "executing");
});

test("explicit Delivery resume is independent of the legacy foreground pointer", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-vspi-explicit-resume-");
  const store = CORE.createDeliveryStore({ clock: () => NOW });
  const first = await proposeGoal(root, store, "resume-goal-a");
  const second = await proposeGoal(root, store, "resume-goal-b");
  assert.deepEqual((await CORE.readActivePointer(root)).active.delivery, second.object_ref);

  const resumed = await store.resume(root, { object_ref: first.object_ref });
  assert.deepEqual(resumed.delivery.object_ref, first.object_ref);
  assert.equal(resumed.recovery.degraded, true);
  assert.deepEqual((await CORE.readActivePointer(root)).active.delivery, second.object_ref);
});

workstreamTest("Workstreams isolate VSPi Session bindings, routing signals, evidence, and recovery", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-vspi-workstream-isolation-");
  const deliveryStore = CORE.createDeliveryStore({ clock: () => NOW });
  const delivery = await proposeGoal(root, deliveryStore, "workstream-parent");
  const store = CORE.createWorkstreamStore({ clock: () => NOW });
  const first = await store.create(root, workstreamInput(delivery, {
    id: "workstream-a",
    session_id: "vspi-session-a",
    routing_class: "critical",
    paths: ["core/src/delivery/**"],
  }), { id: "workstream-a-create" });
  const second = await store.create(root, workstreamInput(delivery, {
    id: "workstream-b",
    session_id: "vspi-session-b",
    routing_class: "standard",
    paths: ["core/src/host-contract/**"],
  }), { id: "workstream-b-create" });

  assert.deepEqual(first.object_ref, { kind: "activity", id: "workstream-a" });
  assert.deepEqual(second.object_ref, { kind: "activity", id: "workstream-b" });
  assert.equal(first.session_binding.session_id, "vspi-session-a");
  assert.equal(second.session_binding.session_id, "vspi-session-b");
  assert.equal(first.routing.routing_class, "critical");
  assert.equal(second.routing.routing_class, "standard");
  assert.doesNotMatch(JSON.stringify([first, second]), /provider|model_id|api_key|token/i);

  const updated = await store.recordEvidence(root, {
    object_ref: first.object_ref,
    expected_generation: first.generation,
    evidence_refs: [{ type: "command", ref: "node-test-a", summary: "Focused tests passed." }],
  }, { id: "workstream-a-evidence" });
  assert.equal(updated.generation, first.generation + 1);
  assert.equal(updated.evidence_refs.length, 1);
  assert.deepEqual((await store.read(root, second.object_ref)).evidence_refs, []);

  const resumed = await store.resume(root, {
    host: "vspi",
    session_id: "vspi-session-a",
  });
  assert.deepEqual(resumed.workstream.object_ref, first.object_ref);
  assert.deepEqual(resumed.delivery.object_ref, delivery.object_ref);
  assert.equal(resumed.workstream.evidence_refs.length, 1);

  const rebound = await store.bindSession(root, {
    object_ref: second.object_ref,
    expected_generation: second.generation,
    session_binding: sessionBinding(delivery, "vspi-session-b-next"),
  }, { id: "workstream-b-rebind" });
  assert.equal(rebound.session_binding.session_id, "vspi-session-b-next");
  await assert.rejects(
    store.resume(root, { host: "vspi", session_id: "vspi-session-b" }),
    /session|workstream|not found|binding/i,
  );
  assert.deepEqual(
    (await store.resume(root, { host: "vspi", session_id: "vspi-session-b-next" })).workstream.object_ref,
    second.object_ref,
  );
});

workstreamTest("stale generations and overlapping active code scopes reject without workspace writes", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-vspi-workstream-conflict-");
  const deliveryStore = CORE.createDeliveryStore({ clock: () => NOW });
  const delivery = await proposeGoal(root, deliveryStore, "workstream-conflict-parent");
  const store = CORE.createWorkstreamStore({ clock: () => NOW });
  const first = await store.create(root, workstreamInput(delivery, {
    id: "workstream-conflict-a",
    session_id: "vspi-conflict-a",
    paths: ["core/src/**"],
  }), { id: "workstream-conflict-a-create" });

  await expectZeroWriteRejection(
    root,
    () => store.create(root, workstreamInput(delivery, {
      id: "workstream-conflict-b",
      session_id: "vspi-conflict-b",
      paths: ["core/src/delivery/**"],
    }), { id: "workstream-conflict-b-create" }),
    /scope|overlap|claim|conflict/i,
  );

  const advanced = await store.recordEvidence(root, {
    object_ref: first.object_ref,
    expected_generation: first.generation,
    evidence_refs: [{ type: "command", ref: "first-update", summary: "First update." }],
  }, { id: "workstream-conflict-advance" });
  const beforeStale = await snapshotTree(root);
  await assert.rejects(
    store.recordEvidence(root, {
      object_ref: first.object_ref,
      expected_generation: first.generation,
      evidence_refs: [{ type: "command", ref: "stale-update", summary: "Stale update." }],
    }, { id: "workstream-conflict-stale" }),
    /generation|stale|revision|conflict/i,
  );
  assert.deepEqual(await snapshotTree(root), beforeStale);
  assert.equal((await store.read(root, first.object_ref)).generation, advanced.generation);

  const closed = await store.close(root, {
    object_ref: first.object_ref,
    expected_generation: advanced.generation,
  }, { id: "workstream-conflict-close" });
  assert.equal(closed.status, "closed");
  const replacement = await store.create(root, workstreamInput(delivery, {
    id: "workstream-conflict-replacement",
    session_id: "vspi-conflict-replacement",
    paths: ["core/src/delivery/**"],
  }), { id: "workstream-conflict-replacement-create" });
  assert.equal(replacement.status, "active", "closing a Workstream must release its scope claim");
});

workstreamTest("overlapping active scopes on different Git bases fail closed without writes", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-vspi-workstream-base-conflict-");
  const deliveryStore = CORE.createDeliveryStore({ clock: () => NOW });
  const delivery = await proposeGoal(root, deliveryStore, "workstream-base-conflict-parent");
  const store = CORE.createWorkstreamStore({ clock: () => NOW });
  await store.create(root, workstreamInput(delivery, {
    id: "workstream-base-conflict-a",
    session_id: "vspi-base-conflict-a",
    git_base: "a".repeat(40),
    paths: ["core/src/**"],
  }), { id: "workstream-base-conflict-a-create" });

  await expectZeroWriteRejection(
    root,
    () => store.create(root, workstreamInput(delivery, {
      id: "workstream-base-conflict-b",
      session_id: "vspi-base-conflict-b",
      git_base: "b".repeat(40),
      paths: ["core/src/delivery/**"],
    }), { id: "workstream-base-conflict-b-create" }),
    /base|scope|overlap|claim|conflict/i,
  );
});

workstreamTest("dependency-ready milestones can be claimed by different Workstreams in parallel", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-vspi-parallel-dag-");
  const deliveryStore = CORE.createDeliveryStore({ clock: () => NOW });
  const base = cyclePlanInput({ id: "parallel-dag" });
  const plan = CORE.compileCyclePlan({
    ...base,
    milestones: [
      { ...base.milestones[0], id: "M-A", title: "Independent A", depends_on: [] },
      { ...base.milestones[1], id: "M-B", title: "Independent B", depends_on: [] },
      {
        id: "M-C",
        title: "Join A and B",
        outcome: "Join both independently verified results.",
        verification_criteria: ["Both dependencies are verified."],
        depends_on: ["M-A", "M-B"],
      },
    ],
  });
  let delivery = await deliveryStore.proposeCycle(root, {
    plan,
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: "parallel-dag-propose" });
  delivery = await startDelivery(root, deliveryStore, delivery, "parallel-dag");
  const workstreams = CORE.createWorkstreamStore({ clock: () => NOW });
  const first = await workstreams.create(root, workstreamInput(delivery, {
    id: "parallel-dag-a",
    session_id: "parallel-dag-session-a",
    paths: ["packages/a/**"],
  }), { id: "parallel-dag-a-create" });
  const second = await workstreams.create(root, workstreamInput(delivery, {
    id: "parallel-dag-b",
    session_id: "parallel-dag-session-b",
    paths: ["packages/b/**"],
  }), { id: "parallel-dag-b-create" });

  const [claimedA, claimedB] = await Promise.all([
    deliveryStore.claimMilestone(root, {
      object_ref: delivery.object_ref,
      milestone_id: "M-A",
      workstream_ref: first.object_ref,
      expected_plan_hash: delivery.plan_hash,
    }, { id: "parallel-dag-claim-a" }),
    deliveryStore.claimMilestone(root, {
      object_ref: delivery.object_ref,
      milestone_id: "M-B",
      workstream_ref: second.object_ref,
      expected_plan_hash: delivery.plan_hash,
    }, { id: "parallel-dag-claim-b" }),
  ]);
  assert.equal(claimedA.milestones.find((item) => item.id === "M-A").status, "executing");
  assert.equal(claimedB.milestones.find((item) => item.id === "M-B").status, "executing");
  const current = await deliveryStore.read(root, delivery.object_ref);
  assert.deepEqual(
    current.milestones.filter((item) => item.status === "executing").map((item) => item.id).sort(),
    ["M-A", "M-B"],
  );
  assert.equal(current.milestones.find((item) => item.id === "M-C").status, "pending");
});

workstreamTest("a later claimed ready milestone verifies first without advancing an unready dependency", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-vspi-parallel-verify-later-");
  const deliveryStore = CORE.createDeliveryStore({ clock: () => NOW });
  const base = cyclePlanInput({ id: "parallel-verify-later" });
  const plan = CORE.compileCyclePlan({
    ...base,
    milestones: [
      { ...base.milestones[0], id: "M-A", title: "Earlier independent work", depends_on: [] },
      { ...base.milestones[1], id: "M-B", title: "Later independent work", depends_on: [] },
      {
        id: "M-C",
        title: "Join unfinished A with verified B",
        outcome: "Start only after both independent milestones verify.",
        verification_criteria: ["Both dependencies are verified."],
        depends_on: ["M-A", "M-B"],
      },
    ],
  });
  let delivery = await deliveryStore.proposeCycle(root, {
    plan,
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: "parallel-verify-later-propose" });
  delivery = await startDelivery(root, deliveryStore, delivery, "parallel-verify-later");
  const workstreams = CORE.createWorkstreamStore({ clock: () => NOW });
  const later = await workstreams.create(root, workstreamInput(delivery, {
    id: "parallel-verify-later-b",
    session_id: "parallel-verify-later-session-b",
    paths: ["packages/b/**"],
  }), { id: "parallel-verify-later-b-create" });
  delivery = await deliveryStore.claimMilestone(root, {
    object_ref: delivery.object_ref,
    milestone_id: "M-B",
    workstream_ref: later.object_ref,
    expected_plan_hash: delivery.plan_hash,
  }, { id: "parallel-verify-later-claim-b" });
  assert.equal(delivery.milestones.find((item) => item.id === "M-A").status, "executing");
  assert.equal(delivery.milestones.find((item) => item.id === "M-B").status, "executing");

  const evidence = await writeWorkerEvidence(root, ["implement"], {
    object_id: delivery.object_ref.id,
    prefix: "parallel-verify-later-b",
  });
  delivery = await deliveryStore.verifyMilestone(root, {
    object_ref: delivery.object_ref,
    milestone_id: "M-B",
    evidence,
  }, { id: "parallel-verify-later-verify-b" });

  const earlier = delivery.milestones.find((item) => item.id === "M-A");
  const verifiedLater = delivery.milestones.find((item) => item.id === "M-B");
  const join = delivery.milestones.find((item) => item.id === "M-C");
  assert.equal(earlier.status, "executing");
  assert.equal(verifiedLater.status, "verified");
  assert.equal(Object.hasOwn(verifiedLater, "workstream_ref"), false, "verification releases the claim");
  assert.equal(join.status, "pending", "M-C must wait until M-A is verified too");
});

workstreamTest("concurrent verification preserves every successfully verified claimed milestone", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-vspi-concurrent-verify-");
  const deliveryStore = CORE.createDeliveryStore({ clock: () => NOW });
  const base = cyclePlanInput({ id: "concurrent-verify" });
  const plan = CORE.compileCyclePlan({
    ...base,
    milestones: [
      { ...base.milestones[0], id: "M-A", title: "Concurrent verification A", depends_on: [] },
      { ...base.milestones[1], id: "M-B", title: "Concurrent verification B", depends_on: [] },
    ],
  });
  let delivery = await deliveryStore.proposeCycle(root, {
    plan,
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: "concurrent-verify-propose" });
  delivery = await startDelivery(root, deliveryStore, delivery, "concurrent-verify");
  const workstreams = CORE.createWorkstreamStore({ clock: () => NOW });
  const first = await workstreams.create(root, workstreamInput(delivery, {
    id: "concurrent-verify-a",
    session_id: "concurrent-verify-session-a",
    paths: ["packages/a/**"],
  }), { id: "concurrent-verify-a-create" });
  const second = await workstreams.create(root, workstreamInput(delivery, {
    id: "concurrent-verify-b",
    session_id: "concurrent-verify-session-b",
    paths: ["packages/b/**"],
  }), { id: "concurrent-verify-b-create" });
  await Promise.all([
    deliveryStore.claimMilestone(root, {
      object_ref: delivery.object_ref,
      milestone_id: "M-A",
      workstream_ref: first.object_ref,
      expected_plan_hash: delivery.plan_hash,
    }, { id: "concurrent-verify-claim-a" }),
    deliveryStore.claimMilestone(root, {
      object_ref: delivery.object_ref,
      milestone_id: "M-B",
      workstream_ref: second.object_ref,
      expected_plan_hash: delivery.plan_hash,
    }, { id: "concurrent-verify-claim-b" }),
  ]);
  const [evidenceA, evidenceB] = await Promise.all([
    writeWorkerEvidence(root, ["implement"], {
      object_id: delivery.object_ref.id,
      prefix: "concurrent-verify-a",
    }),
    writeWorkerEvidence(root, ["implement"], {
      object_id: delivery.object_ref.id,
      prefix: "concurrent-verify-b",
    }),
  ]);

  const settled = await Promise.allSettled([
    deliveryStore.verifyMilestone(root, {
      object_ref: delivery.object_ref,
      milestone_id: "M-A",
      evidence: evidenceA,
    }, { id: "concurrent-verify-a" }),
    deliveryStore.verifyMilestone(root, {
      object_ref: delivery.object_ref,
      milestone_id: "M-B",
      evidence: evidenceB,
    }, { id: "concurrent-verify-b" }),
  ]);
  assert.equal(
    settled.filter((result) => result.status === "fulfilled").length,
    2,
    "both verification calls must either persist or explicitly reject; successful results cannot be lost",
  );
  const current = await deliveryStore.read(root, delivery.object_ref);
  for (const milestoneId of ["M-A", "M-B"]) {
    const milestone = current.milestones.find((item) => item.id === milestoneId);
    assert.equal(milestone.status, "verified", `${milestoneId} must remain verified`);
    assert.equal(Object.hasOwn(milestone, "workstream_ref"), false, `${milestoneId} must release its claim`);
  }
});

workstreamTest("a Workstream bound to an old Plan revision cannot claim revised milestones", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-vspi-stale-workstream-binding-");
  const deliveryStore = CORE.createDeliveryStore({ clock: () => NOW });
  const initialInput = cyclePlanInput({
    id: "stale-workstream-binding",
    milestones: [{
      id: "M-OLD",
      title: "Original revision work",
      outcome: "Represent the original Plan revision.",
      verification_criteria: ["Original work is verified."],
      depends_on: [],
    }],
  });
  let delivery = await deliveryStore.proposeCycle(root, {
    plan: CORE.compileCyclePlan(initialInput),
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: "stale-workstream-binding-propose" });
  delivery = await startDelivery(root, deliveryStore, delivery, "stale-workstream-binding-initial");
  const workstreams = CORE.createWorkstreamStore({ clock: () => NOW });
  const staleWorkstream = await workstreams.create(root, workstreamInput(delivery, {
    id: "stale-workstream-binding-worker",
    session_id: "stale-workstream-binding-session",
    paths: ["packages/revised/**"],
  }), { id: "stale-workstream-binding-create" });

  const revisedPlan = CORE.compileCyclePlan({
    ...initialInput,
    title: "Revised concurrent work",
    outcome: "Only Workstreams rebound to revision one may claim the new Milestone.",
    revision: 1,
    milestones: [{
      id: "M-NEW",
      title: "New revision work",
      outcome: "Represent the revised Plan authority.",
      verification_criteria: ["Revised work is verified."],
      depends_on: [],
    }],
  });
  delivery = await deliveryStore.recordRevision(root, {
    object_ref: delivery.object_ref,
    actor: USER_ACTOR,
    feedback: structuredFeedback({
      problem: "The original Milestone no longer represents the required work.",
      expected: "Revision one exposes only the new Milestone.",
      actual: "Revision zero still exposes the original Milestone.",
      context: "Concurrent Workstream binding revision audit.",
    }),
    proposal: revisedPlan,
  }, { id: "stale-workstream-binding-revise" });
  delivery = await startDelivery(root, deliveryStore, delivery, "stale-workstream-binding-revised");

  await expectZeroWriteRejection(
    root,
    () => deliveryStore.claimMilestone(root, {
      object_ref: delivery.object_ref,
      milestone_id: "M-NEW",
      workstream_ref: staleWorkstream.object_ref,
      expected_plan_hash: delivery.plan_hash,
    }, { id: "stale-workstream-binding-claim" }),
    /binding|plan|revision|stale|workstream|conflict/i,
  );
});

hostTest("VSPi integration contract keeps Plan authority singular and model resolution host-owned", () => {
  const contract = CORE.compileVspiIntegrationContract({ generated_at: NOW });
  assert.deepEqual(CORE.parseVspiIntegrationContract(contract), contract);
  assert.equal(contract.plan.authority, "hypo-workflow");
  assert.equal(contract.plan.uninitialized_behavior, "require_explicit_init");
  assert.equal(contract.plan.local_plan_fallback, false);
  assert.deepEqual(contract.plan.session_binding_fields, [
    "workspace_id",
    "delivery_ref",
    "plan_hash",
    "revision",
  ]);
  assert.equal(contract.model_routing.signal_owner, "hypo-workflow");
  assert.equal(contract.model_routing.resolver_owner, "vspi");
  assert.equal(contract.model_routing.mode, "explicit_auto_group");
  assert.equal(contract.model_routing.manual_override, "pinned_until_auto");
  assert.equal(contract.model_routing.switch_boundary, "turn_or_worker");
  assert.deepEqual(contract.model_routing.tiers, [
    "mechanical",
    "standard",
    "explore",
    "critical",
    "escalation",
  ]);
  assert.deepEqual(contract.model_routing.capability_filters, [
    "vision",
    "tool_use",
    "context_window",
  ]);
  assert.doesNotMatch(JSON.stringify(contract), /provider|model_id|api_key|credential|secret/i);
});

hostTest("context retrieval remains an opt-in experiment with measurable fallback", () => {
  const contract = CORE.compileVspiIntegrationContract({ generated_at: LATER });
  assert.deepEqual(contract.context_retrieval, {
    status: "experimental",
    enabled_by_default: false,
    source: "bounded_capsule_and_typed_reads",
    fallback: "pi_native_compaction",
    metrics: ["input_tokens", "latency_ms", "miss_rate"],
  });

  assert.throws(
    () => CORE.parseVspiIntegrationContract({
      ...contract,
      context_retrieval: { ...contract.context_retrieval, enabled_by_default: true },
    }),
    /context|experimental|default|disabled/i,
  );
  assert.throws(
    () => CORE.parseVspiIntegrationContract({ ...contract, model_id: "provider/model" }),
    /model|provider|unknown|additional|contract/i,
  );
});

async function proposeGoal(root, store, id) {
  return store.proposeGoal(root, {
    design: CORE.compileGoalDesign(goalDesignInput({ id, title: `Goal ${id}` })),
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: `${id}-propose` });
}

async function startDelivery(root, store, delivery, id) {
  const receipt = await issueDeliveryReceipt(CORE, root, delivery, "delivery.approve_and_start", {
    transaction_id: `${id}-receipt`,
    tool_use_id: `${id}-tool`,
  });
  return store.approveAndStart(root, receipt, { id: `${id}-start` });
}

function workstreamInput(delivery, overrides = {}) {
  return {
    id: overrides.id,
    delivery_ref: delivery.object_ref,
    session_binding: sessionBinding(delivery, overrides.session_id),
    routing: {
      selection_mode: "auto_group",
      routing_class: overrides.routing_class ?? "standard",
      capability_requirements: ["tool_use"],
    },
    code_scope: {
      git_base: overrides.git_base ?? GIT_BASE,
      paths: overrides.paths,
    },
  };
}

function sessionBinding(delivery, sessionId) {
  return {
    host: "vspi",
    session_id: sessionId,
    workspace_id: "m2-fixture-workspace",
    delivery_ref: delivery.object_ref,
    plan_hash: delivery.plan_hash,
    revision: delivery.revision,
  };
}
