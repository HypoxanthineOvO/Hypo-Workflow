import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as CORE from "../src/index.js";
import {
  approvedBootstrapInputs,
  BOOTSTRAP_JOB_REF,
  bootstrapStageInput,
  copyReferenceWorkspace,
  DELIVERY_REF,
  legacyAuthoritySnapshot,
  PLAN_HASH,
  sha256,
  snapshotTree,
  temporaryDirectory,
} from "./fixtures/c21-m5/helpers.js";

const FILE_EVIDENCE_PATH = ".pipeline/bootstrap-sources/accepted-outcome.md";
const FIXED_NOW = "2026-07-15T12:00:00+08:00";

function cyclePlan() {
  return CORE.compileCyclePlan({
    id: DELIVERY_REF.id,
    title: "Promote the Bootstrap Cycle",
    outcome: "The promoted Cycle is ready for explicit approval and start.",
    acceptance_criteria: [{
      id: "AC1",
      statement: "The Cycle can be approved after promotion.",
      verification: "node --test core/test/delivery-bootstrap-promotion.test.js",
    }],
    constraints: ["Promotion must preserve the accepted Bootstrap boundary."],
    evidence: [{
      type: "test",
      ref: "core/test/delivery-bootstrap-promotion.test.js",
      summary: "The promotion contract is covered by an integration fixture.",
    }],
    revision: 1,
    milestones: [{
      id: "M1",
      title: "Promoted Cycle",
      outcome: "The Bootstrap placeholder becomes a formal proposed Cycle.",
      verification_criteria: ["Formal Delivery reads with one pending Milestone."],
      depends_on: [],
    }],
  });
}

function topology() {
  return CORE.selectExecutionTopology({
    task_kind: "research",
    change_size: "material",
    reversible: true,
    policy: { profile: "custom", allow_solo_verified: false },
    custom_roles: ["product_strategist", "independent_auditor"],
  });
}

async function preparePlaceholder(t, { accepted }) {
  const root = await temporaryDirectory(t, accepted ? "hw-promotion-accepted-" : "hw-promotion-pending-");
  await copyReferenceWorkspace(root);
  const { curation, audit } = await approvedBootstrapInputs(CORE, root);
  const base = bootstrapStageInput(curation, audit);
  const input = {
    ...base,
    delivery: {
      ...base.delivery,
      runtime: {
        schema_version: "1",
        object_ref: DELIVERY_REF,
        delivery_kind: "cycle",
        status: "planning",
        current_phase: "bootstrap_adoption",
        plan_hash: PLAN_HASH,
        plan_id: DELIVERY_REF.id,
        revision: 0,
      },
      continuation: {
        schema_version: "1",
        object_ref: DELIVERY_REF,
        blocked_on: "bootstrap_acceptance",
        draft_plan_hash: PLAN_HASH,
        draft_plan_id: DELIVERY_REF.id,
        next_action: "Review and accept Bootstrap Adoption before promoting the Cycle.",
      },
    },
  };
  const stage = await CORE.stageBootstrapWorkspace(root, input, {
    id: accepted ? "promotion-accepted-stage" : "promotion-pending-stage",
  });
  const activated = await CORE.activateBootstrapWorkspace(root, stage, {
    id: accepted ? "promotion-accepted-activate" : "promotion-pending-activate",
  });
  if (accepted) {
    await CORE.acceptBootstrapActivation(root, {
      bootstrap_job_ref: BOOTSTRAP_JOB_REF,
      checkpoint_ref: activated.rollback_checkpoint_ref,
      mode: "strict",
      evidence_refs: [
        {
          type: "snapshot",
          path: activated.checkpoint.path,
          semantic_hash: activated.checkpoint.semantic_hash,
        },
        {
          type: "file",
          path: FILE_EVIDENCE_PATH,
          sha256: sha256(await readFile(join(root, FILE_EVIDENCE_PATH))),
        },
      ],
    }, { id: "promotion-accepted-accept" });
  }
  return { root, activated };
}

test("Bootstrap promotion atomically creates a formal proposed Cycle", async (t) => {
  const { root } = await preparePlaceholder(t, { accepted: true });
  const legacyBefore = await legacyAuthoritySnapshot(root);
  const store = CORE.createDeliveryStore({ clock: () => FIXED_NOW });
  const plan = cyclePlan();
  const promoted = await store.promoteBootstrapCycle(root, { plan, topology: topology() }, {
    id: "promotion-formal-cycle",
  });

  assert.equal(promoted.status, "proposed");
  assert.equal(promoted.revision, 1);
  assert.equal(promoted.plan_hash, plan.plan_hash);
  assert.deepEqual(promoted.milestones.map(({ id, status }) => [id, status]), [["M1", "pending"]]);
  assert.deepEqual(await store.read(root, DELIVERY_REF), promoted);

  const runtime = await CORE.readRuntimeObject(root, DELIVERY_REF);
  assert.equal(runtime.runtime.status, "proposed");
  assert.equal(runtime.continuation.next_action, "request_delivery_approval");
  assert.equal(runtime.continuation.plan_hash, plan.plan_hash);
  const record = await CORE.readRecord(root, promoted.plan_record_ref.id);
  assert.equal(record.attributes.scope.type, "cycle");
  assert.equal(record.attributes.scope.ref, DELIVERY_REF.id);
  assert.equal(record.attributes.dedupe_key, "cycle.c21.plan");
  assert.deepEqual(await legacyAuthoritySnapshot(root), legacyBefore);
});

test("Bootstrap promotion refuses an unaccepted workspace without writing", async (t) => {
  const { root } = await preparePlaceholder(t, { accepted: false });
  const before = await snapshotTree(root);
  const store = CORE.createDeliveryStore({ clock: () => FIXED_NOW });

  await assert.rejects(
    store.promoteBootstrapCycle(root, { plan: cyclePlan(), topology: topology() }, {
      id: "promotion-pending-reject",
    }),
    (error) => error.code === "ERR_BOOTSTRAP_ACCEPTANCE_PENDING",
  );
  assert.deepEqual(await snapshotTree(root), before);
});

test("Bootstrap promotion rejects a placeholder that was already promoted", async (t) => {
  const { root } = await preparePlaceholder(t, { accepted: true });
  const store = CORE.createDeliveryStore({ clock: () => FIXED_NOW });
  const proposal = { plan: cyclePlan(), topology: topology() };
  await store.promoteBootstrapCycle(root, proposal, { id: "promotion-once" });
  const before = await snapshotTree(root);

  await assert.rejects(
    store.promoteBootstrapCycle(root, proposal, { id: "promotion-twice" }),
    (error) => error.code === "ERR_DELIVERY_STATE_INVALID",
  );
  assert.deepEqual(await snapshotTree(root), before);
});
