import test from "node:test";
import assert from "node:assert/strict";
import { appendFile } from "node:fs/promises";
import * as ROOT_API from "../src/index.js";
import {
  DELIVERY_API_URL,
  PLANNING_API_URL,
  TOPOLOGY_API_URL,
  createDeliveryTestStore,
  goalDesignInput,
  importProbe,
  issueDeliveryReceipt,
  migrationTopologyInput,
  soloTopologyInput,
  strictTopologyInput,
  temporaryCurrentWorkspace,
  writeWorkerEvidence,
} from "./fixtures/c21-m6/helpers.js";

const TOPOLOGY_PROBE = await importProbe(TOPOLOGY_API_URL);
const DELIVERY_PROBE = await importProbe(DELIVERY_API_URL);
const PLANNING_PROBE = await importProbe(PLANNING_API_URL);
const TOPOLOGY_API = ["selectExecutionTopology", "assessExecutionEvidence"];
const HAS_TOPOLOGY = !TOPOLOGY_PROBE.error
  && TOPOLOGY_API.every((name) => typeof TOPOLOGY_PROBE.api?.[name] === "function");
const HAS_INTEGRATION = HAS_TOPOLOGY
  && !DELIVERY_PROBE.error
  && !PLANNING_PROBE.error
  && typeof DELIVERY_PROBE.api?.createDeliveryStore === "function"
  && typeof PLANNING_PROBE.api?.compileGoalDesign === "function";
const topologyTest = HAS_TOPOLOGY ? test : test.skip;
const integrationTest = HAS_INTEGRATION ? test : test.skip;

test("M6 publishes focused execution-topology selection and evidence APIs", () => {
  if (TOPOLOGY_PROBE.error) {
    assert.fail(`core/src/execution-topology/index.js must import cleanly: ${TOPOLOGY_PROBE.error.code || TOPOLOGY_PROBE.error.message}`);
  }
  for (const name of TOPOLOGY_API) {
    assert.equal(typeof TOPOLOGY_PROBE.api[name], "function", `${name} must be exported by execution-topology`);
    assert.equal(typeof ROOT_API[name], "function", `${name} must be exported by Core root`);
  }
});

topologyTest("explicit trivial reversible policy selects solo-verified without requiring three workers", () => {
  const topology = TOPOLOGY_PROBE.api.selectExecutionTopology(soloTopologyInput());
  assert.equal(topology.profile, "solo-verified");
  assert.deepEqual(topology.required_roles, ["implement"]);
  assert.equal(topology.verification_required, true);
  assert.equal(topology.separation_required, false);

  const assessed = TOPOLOGY_PROBE.api.assessExecutionEvidence({
    topology,
    evidence: [{
      role: "implement",
      worker_id: "solo-worker",
      status: "completed",
      evidence_refs: [{ type: "file", path: ".pipeline/evidence/solo.txt", digest: `sha256:${"a".repeat(64)}` }],
    }],
  });
  assert.equal(assessed.ready, true);
  assert.deepEqual(assessed.missing_roles, []);
});

topologyTest("material engineering selects strict test/implement/audit separation", () => {
  const topology = TOPOLOGY_PROBE.api.selectExecutionTopology(strictTopologyInput());
  assert.equal(topology.profile, "strict");
  assert.deepEqual(topology.required_roles, ["test", "implement", "audit"]);
  assert.equal(topology.separation_required, true);
  assert.deepEqual(topology.identity_constraints, [
    ["test", "implement"],
    ["test", "audit"],
    ["implement", "audit"],
  ]);
});

topologyTest("material work stays solo when delegation has no demonstrated parallel or audit value", () => {
  const topology = TOPOLOGY_PROBE.api.selectExecutionTopology({
    task_kind: "engineering",
    change_size: "material",
    reversible: true,
    policy: { profile: "auto", allow_solo_verified: true },
    coupling: "high",
    parallelizable: false,
    independent_oracle: false,
  });
  assert.equal(topology.profile, "solo-verified");
  assert.deepEqual(topology.required_roles, ["implement"]);
  assert.equal(topology.separation_required, false);
});

topologyTest("auto topology uses independent workers only when the task evidence justifies them", () => {
  const audit = TOPOLOGY_PROBE.api.selectExecutionTopology({
    task_kind: "engineering",
    change_size: "material",
    reversible: true,
    policy: { profile: "auto", allow_solo_verified: true },
    coupling: "high",
    parallelizable: false,
    independent_oracle: true,
  });
  assert.equal(audit.profile, "independent-audit");
  assert.deepEqual(audit.required_roles, ["implement", "audit"]);

  const parallel = TOPOLOGY_PROBE.api.selectExecutionTopology({
    task_kind: "engineering",
    change_size: "material",
    reversible: true,
    policy: { profile: "auto", allow_solo_verified: true },
    coupling: "low",
    parallelizable: true,
    independent_oracle: true,
  });
  assert.equal(parallel.profile, "strict");
  assert.deepEqual(parallel.required_roles, ["test", "implement", "audit"]);
});

topologyTest("migration selects extractor/curator/auditor/deterministic-writer roles", () => {
  const topology = TOPOLOGY_PROBE.api.selectExecutionTopology(migrationTopologyInput());
  assert.equal(topology.profile, "migration");
  assert.deepEqual(topology.required_roles, [
    "extractor",
    "curator",
    "auditor",
    "deterministic-writer",
  ]);
  assert.equal(topology.separation_required, true);
});

topologyTest("custom topology preserves explicit roles and separation instead of coercing strict", () => {
  const topology = TOPOLOGY_PROBE.api.selectExecutionTopology({
    task_kind: "research-prototype",
    change_size: "material",
    reversible: true,
    policy: { profile: "custom", allow_solo_verified: false },
    custom_roles: ["research", "prototype", "evaluate"],
  });
  assert.equal(topology.profile, "custom");
  assert.deepEqual(topology.required_roles, ["research", "prototype", "evaluate"]);
  assert.equal(topology.separation_required, true);
});

topologyTest("missing roles and shared identities block evidence readiness", () => {
  const topology = TOPOLOGY_PROBE.api.selectExecutionTopology(strictTopologyInput());
  const missing = TOPOLOGY_PROBE.api.assessExecutionEvidence({
    topology,
    evidence: [worker("test", "worker-test"), worker("implement", "worker-implement")],
  });
  assert.equal(missing.ready, false);
  assert.deepEqual(missing.missing_roles, ["audit"]);

  const collision = TOPOLOGY_PROBE.api.assessExecutionEvidence({
    topology,
    evidence: [worker("test", "shared"), worker("implement", "shared"), worker("audit", "worker-audit")],
  });
  assert.equal(collision.ready, false);
  assert.deepEqual(collision.missing_roles, []);
  assert.ok(collision.identity_collisions.some((item) => item.includes("test") && item.includes("implement")));
});

topologyTest("incomplete or failed worker evidence never counts as a required completed role", () => {
  const topology = TOPOLOGY_PROBE.api.selectExecutionTopology(strictTopologyInput());
  const result = TOPOLOGY_PROBE.api.assessExecutionEvidence({
    topology,
    evidence: [
      worker("test", "worker-test", "completed"),
      worker("implement", "worker-implement", "running"),
      worker("audit", "worker-audit", "failed"),
    ],
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing_roles, ["implement", "audit"]);
});

integrationTest("Delivery verification stays executing until strict role evidence is complete and byte-valid", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-m6-topology-delivery-");
  const api = { ...ROOT_API, ...TOPOLOGY_PROBE.api, ...PLANNING_PROBE.api, ...DELIVERY_PROBE.api };
  const { store, setNow } = createDeliveryTestStore(api);
  const design = api.compileGoalDesign(goalDesignInput());
  const topology = api.selectExecutionTopology(strictTopologyInput());
  let delivery = await store.proposeGoal(root, { design, topology }, { id: "m6-topology-propose" });
  let receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.approve");
  delivery = await store.approve(root, receipt, { id: "m6-topology-approve" });
  setNow("2026-07-12T12:05:00+08:00");
  receipt = await issueDeliveryReceipt(api, root, delivery, "delivery.start", {
    now: "2026-07-12T12:05:00+08:00",
  });
  delivery = await store.start(root, receipt, { id: "m6-topology-start" });
  assert.equal(delivery.status, "executing");

  const incomplete = await writeWorkerEvidence(root, ["test", "implement"], {
    object_id: delivery.object_ref.id,
    prefix: "incomplete",
  });
  await assert.rejects(
    store.verify(root, { object_ref: delivery.object_ref, evidence: incomplete }, { id: "m6-topology-missing-audit" }),
    /audit|missing|required|evidence|topology/i,
  );
  assert.equal((await store.read(root, delivery.object_ref)).status, "executing");

  const complete = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: delivery.object_ref.id,
    prefix: "complete",
  });
  await appendFile(complete[0].evidence_refs[0].path.replace(/^/, `${root}/`), "tampered\n", "utf8");
  await assert.rejects(
    store.verify(root, { object_ref: delivery.object_ref, evidence: complete }, { id: "m6-topology-tampered-evidence" }),
    /digest|evidence|hash|drift|integrity/i,
  );
  assert.equal((await store.read(root, delivery.object_ref)).status, "executing");

  const valid = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: delivery.object_ref.id,
    prefix: "valid",
  });
  delivery = await store.verify(root, { object_ref: delivery.object_ref, evidence: valid }, { id: "m6-topology-verified" });
  assert.equal(delivery.status, "verified");
  assert.deepEqual(delivery.verification.roles, ["test", "implement", "audit"]);
  assert.equal(delivery.verification.evidence_refs.length, 3);
});

function worker(role, workerId, status = "completed") {
  return {
    role,
    worker_id: workerId,
    status,
    evidence_refs: [{
      type: "file",
      path: `.pipeline/evidence/${role}.txt`,
      digest: `sha256:${"a".repeat(64)}`,
    }],
  };
}
