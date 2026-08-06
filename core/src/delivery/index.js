import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assessExecutionEvidence } from "../execution-topology/index.js";
import { renderRecordDocument } from "../records/frontmatter.js";
import { buildPersistedRecord, recordScopeDirectory } from "../records/schema.js";
import { createReceiptStore } from "../receipts/index.js";
import { selectLatestValidRecoveryPack } from "../recovery/index.js";
import {
  compileActivePointerDocument,
  compileRuntimeObjectDocuments,
  readActivePointer,
  readRuntimeObject,
  writeRuntimeObject,
} from "../runtime/index.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeAuthorityObjectRef,
  normalizeSafeIdentifier,
  normalizeTimestamp,
  readCurrentManifest,
  sameObjectRef,
  storedObjectRef,
} from "../runtime/internal.js";
import { canonicalHash, stringifyYaml } from "../serialization/index.js";
import { assertWorkspacePathAllowed, commitWorkspaceTransaction } from "../workspace-store/index.js";
import { inspectBootstrapAcceptanceGate } from "../workspace-store/bootstrap-acceptance.js";
import { inspectWorkItemCompletion } from "../work-placement/index.js";
import { validateWorkerRoutingDecision } from "../worker-routing/index.js";

const TRANSITIONS = Object.freeze({
  "delivery.approve": { action: "approve", states: ["proposed", "needs_revision"] },
  "delivery.approve_and_start": { action: "approve_and_start", states: ["proposed", "needs_revision"] },
  "delivery.start": { action: "start", states: ["waiting_to_start"] },
  "stone.accept": { action: "accept_stone", states: ["waiting_for_stone"] },
  "stone.reject": { action: "reject_stone", states: ["waiting_for_stone"] },
  "delivery.accept": { action: "accept", states: ["pending_acceptance"] },
  "delivery.reject": { action: "reject", states: ["pending_acceptance"] },
});

export function createDeliveryStore(input = {}) {
  assertPlainObject(input, "Delivery store options");
  assertExactKeys(input, ["clock"], "Delivery store options");
  if (typeof input.clock !== "function") throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Delivery store clock must be a zero-argument function");
  const clock = input.clock;
  const receipts = createReceiptStore({ clock });
  return Object.freeze({
    proposeGoal(root, proposal, options = {}) {
      return propose(root, "goal", proposal, options, clock);
    },
    proposeCycle(root, proposal, options = {}) {
      return propose(root, "cycle", proposal, options, clock);
    },
    proposePlan(root, proposal, options = {}) {
      if (proposal?.plan?.delivery_mode !== "plan") {
        throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Plan proposal requires a compiled Plan with at least one Stone");
      }
      return propose(root, "cycle", proposal, options, clock);
    },
    promoteBootstrapCycle(root, proposal, options = {}) {
      return promoteBootstrapCycle(root, proposal, options, clock);
    },
    read,
    approve(root, transition, options = {}) {
      return receiptTransition(root, transition, options, clock, receipts, "delivery.approve", (delivery) => ({
        ...withoutRevisionState(delivery),
        status: "waiting_to_start",
        updated_at: now(clock),
      }));
    },
    approveAndStart(root, transition, options = {}) {
      return receiptTransition(root, transition, options, clock, receipts, "delivery.approve_and_start", (delivery) => startApprovedDelivery({
        ...withoutRevisionState(delivery),
        updated_at: now(clock),
      }));
    },
    start(root, transition, options = {}) {
      return receiptTransition(root, transition, options, clock, receipts, "delivery.start", (delivery) => startApprovedDelivery({
        ...delivery,
        updated_at: now(clock),
      }));
    },
    acceptStone(root, transition, options = {}) {
      return receiptTransition(root, transition, options, clock, receipts, "stone.accept", (delivery) => acceptPendingStone({
        ...delivery,
        updated_at: now(clock),
      }));
    },
    rejectStone(root, request, options = {}) {
      return reject(root, request, options, clock, receipts, "stone.reject");
    },
    recordRevision(root, request, options = {}) {
      return recordRevision(root, request, options, clock);
    },
    verifyMilestone(root, request, options = {}) {
      return verifyMilestone(root, request, options, clock);
    },
    verify(root, request, options = {}) {
      return verify(root, request, options, clock);
    },
    requestAcceptance(root, request, options = {}) {
      return requestAcceptance(root, request, options, clock);
    },
    accept(root, transition, options = {}) {
      return receiptTransition(root, transition, options, clock, receipts, "delivery.accept", (delivery) => ({
        ...delivery,
        status: "accepted",
        updated_at: now(clock),
      }));
    },
    reject(root, request, options = {}) {
      return reject(root, request, options, clock, receipts, "delivery.reject");
    },
    claimMilestone(root, request, options = {}) {
      return claimMilestone(root, request, options, clock);
    },
    releaseMilestoneClaim(root, request, options = {}) {
      return releaseMilestoneClaim(root, request, options, clock);
    },
    resume,
  });
}

export function buildDeliveryReceiptContext(deliveryInput, input) {
  const delivery = normalizeView(deliveryInput);
  assertPlainObject(input, "Delivery Receipt context input");
  assertExactKeys(input, ["actor", "intent"], "Delivery Receipt context input");
  const definition = TRANSITIONS[input.intent];
  if (!definition || !definition.states.includes(delivery.status)) {
    throw deliveryError("ERR_DELIVERY_STATE_INVALID", `Receipt intent ${input.intent || "unknown"} is unsupported from Delivery state ${delivery.status}`);
  }
  if (["delivery.approve", "delivery.approve_and_start"].includes(input.intent) && delivery.status === "needs_revision" && delivery.revision_state !== "proposal_ready") {
    throw deliveryError("ERR_DELIVERY_STATE_INVALID", "Delivery feedback is pending a revised proposal before approval");
  }
  const actor = normalizeActor(input.actor);
  const scope = {
    action: definition.action,
    delivery_kind: delivery.delivery_kind,
    expected_state: delivery.status,
    revision: delivery.revision,
    state_hash: deliveryStateHash(delivery),
    ...(["stone.accept", "stone.reject"].includes(input.intent) ? pendingStoneScope(delivery) : {}),
  };
  return {
    actor,
    intent: input.intent,
    object_ref: delivery.object_ref,
    scope,
    plan_hash: delivery.plan_hash,
  };
}

async function propose(root, deliveryKind, proposal, options, clock) {
  assertPlainObject(proposal, `${deliveryKind} proposal`);
  assertExactKeys(proposal, deliveryKind === "goal" ? ["design", "topology"] : ["plan", "topology"], `${deliveryKind} proposal`);
  const compiled = deliveryKind === "goal" ? proposal.design : proposal.plan;
  validateCompiledPlan(compiled, deliveryKind);
  validateTopology(proposal.topology);
  const objectRef = { kind: "delivery", id: compiled.id };
  const updatedAt = now(clock);
  const planRecord = buildPlanRecord(compiled, deliveryKind, updatedAt, []);
  const delivery = {
    schema_version: "1",
    object_ref: objectRef,
    delivery_kind: deliveryKind,
    status: "proposed",
    revision: compiled.revision,
    plan_hash: compiled.plan_hash,
    plan_record_ref: recordRef(planRecord),
    topology: proposal.topology,
    ...(compiled.delivery_mode === undefined ? {} : { delivery_mode: compiled.delivery_mode }),
    ...(deliveryKind === "cycle" ? { milestones: compiled.milestones.map((item) => ({ ...item, status: "pending" })) } : {}),
    updated_at: updatedAt,
  };
  const existingPointer = await readOptionalActivePointer(root);
  await assertProposalCreateAllowed(root, objectRef, existingPointer);
  const pointer = compileActivePointerDocument({
    schema_version: "1",
    active: { ...existingPointer.active, delivery: objectRef },
  });
  const docs = compileRuntimeObjectDocuments(toRuntimeDocuments(delivery));
  const manifest = await readCurrentManifest(root);
  const operation = transactionOptions(options, `delivery-propose-${compiled.id}`);
  const path = recordPath(planRecord);
  await assertActivePointerUnchanged(root, existingPointer);
  await commitWorkspaceTransaction(root, {
    id: operation.id,
    faultInjector: operation.faultInjector,
    manifest,
    writes: [
      { path, content: renderRecordDocument(planRecord.attributes, planRecord.body), expected_hash: null },
      { path: docs.runtime_path, content: renderYaml(docs.runtime), expected_hash: null },
      { path: docs.continuation_path, content: renderYaml(docs.continuation), expected_hash: null },
      { path: ".pipeline/runtime/active.yaml", content: renderYaml(pointer) },
    ],
  });
  return clone(delivery);
}

async function promoteBootstrapCycle(root, proposal, options, clock) {
  assertPlainObject(proposal, "Bootstrap Cycle promotion proposal");
  assertExactKeys(proposal, ["plan", "topology"], "Bootstrap Cycle promotion proposal");
  validateCompiledPlan(proposal.plan, "cycle");
  validateTopology(proposal.topology);

  const objectRef = { kind: "delivery", id: proposal.plan.id };
  const pointer = await readActivePointer(root);
  if (!pointer.active.delivery || !sameObjectRef(pointer.active.delivery, objectRef)) {
    throw deliveryError("ERR_DELIVERY_ACTIVE_EXISTS", "Bootstrap promotion requires the active Delivery pointer to match the compiled Cycle plan");
  }

  const acceptance = await inspectBootstrapAcceptanceGate(root);
  if (acceptance.state !== "accepted") {
    throw deliveryError("ERR_BOOTSTRAP_ACCEPTANCE_PENDING", "Bootstrap promotion requires accepted Bootstrap activation");
  }

  const authority = await readRuntimeObject(root, objectRef);
  const placeholder = authority.runtime;
  if (
    placeholder.status !== "planning"
    || placeholder.current_phase !== "bootstrap_adoption"
    || authority.continuation.blocked_on !== "bootstrap_acceptance"
  ) {
    throw deliveryError("ERR_DELIVERY_STATE_INVALID", "Bootstrap promotion requires the unpromoted Bootstrap Delivery placeholder");
  }

  const updatedAt = now(clock);
  const planRecord = buildPlanRecord(proposal.plan, "cycle", updatedAt, []);
  const delivery = {
    schema_version: "1",
    object_ref: objectRef,
    delivery_kind: "cycle",
    status: "proposed",
    revision: proposal.plan.revision,
    plan_hash: proposal.plan.plan_hash,
    plan_record_ref: recordRef(planRecord),
    topology: proposal.topology,
    milestones: proposal.plan.milestones.map((item) => ({ ...item, status: "pending" })),
    updated_at: updatedAt,
  };
  const docs = compileRuntimeObjectDocuments(toRuntimeDocuments(delivery));
  const manifest = await readCurrentManifest(root);
  const operation = transactionOptions(options, "delivery-bootstrap-promote");
  await assertActivePointerUnchanged(root, pointer);
  await commitWorkspaceTransaction(root, {
    id: operation.id,
    faultInjector: operation.faultInjector,
    manifest,
    writes: [
      { path: recordPath(planRecord), content: renderRecordDocument(planRecord.attributes, planRecord.body) },
      { path: docs.runtime_path, content: renderYaml(docs.runtime) },
      { path: docs.continuation_path, content: renderYaml(docs.continuation) },
      { path: ".pipeline/runtime/active.yaml", content: renderYaml(compileActivePointerDocument({
        schema_version: "1",
        active: { ...pointer.active, delivery: objectRef },
      })) },
    ],
  });
  return clone(delivery);
}

async function assertProposalCreateAllowed(root, objectRef, pointer) {
  const existing = await optionalReadDelivery(root, objectRef);
  if (existing) {
    throw deliveryError("ERR_DELIVERY_OBJECT_EXISTS", `Delivery object ${objectRef.id} already exists; revisions must use recordRevision`);
  }

  const foregroundRef = pointer.active.delivery;
  if (foregroundRef && sameObjectRef(foregroundRef, objectRef)) {
    throw deliveryError("ERR_DELIVERY_ACTIVE_EXISTS", `Active Delivery ${objectRef.id} cannot be replaced by a proposal`);
  }
}

async function optionalReadDelivery(root, objectRef) {
  try {
    return await read(root, objectRef);
  } catch (error) {
    if (error?.code === "ERR_DELIVERY_NOT_FOUND") return null;
    throw error;
  }
}

async function assertActivePointerUnchanged(root, expected) {
  const current = await readOptionalActivePointer(root);
  if (canonicalHash(current) !== canonicalHash(expected)) {
    throw deliveryError("ERR_DELIVERY_ACTIVE_EXISTS", "Active Delivery changed while preparing the proposal");
  }
}

async function readOptionalActivePointer(root) {
  try {
    return await readActivePointer(root);
  } catch (error) {
    if (error?.code === "ERR_AUTHORITY_OBJECT_NOT_FOUND") {
      return { schema_version: "1", active: {} };
    }
    throw error;
  }
}

async function read(root, objectRefInput) {
  let authority;
  try {
    authority = await readRuntimeObject(root, objectRefInput);
  } catch (error) {
    if (error?.code === "ERR_AUTHORITY_OBJECT_NOT_FOUND") throw deliveryError("ERR_DELIVERY_NOT_FOUND", "Delivery object was not found");
    throw error;
  }
  if (authority.object_ref.kind !== "delivery") throw deliveryError("ERR_DELIVERY_OBJECT_MISMATCH", "Object is not a Delivery");
  return fromRuntime(authority.runtime);
}

async function receiptTransition(root, transition, options, clock, receipts, intent, mutate) {
  const envelope = normalizeTransitionEnvelope(transition);
  const delivery = await read(root, envelope.object_ref);
  assertTransitionPreflight(delivery, intent);
  const operation = transactionOptions(options, `delivery-${intent.split(".")[1]}`);
  const suppliedContext = transitionContext(envelope);
  await receipts.reserveReceipt(root, envelope.receipt_id, suppliedContext, {
    id: `${operation.id}-reserve`,
    faultInjector: operation.faultInjector,
    tool_use_id: envelope.tool_use_id,
  });
  let expected;
  try {
    expected = buildDeliveryReceiptContext(delivery, { actor: envelope.actor, intent });
    assertEnvelopeMatches(envelope, expected, intent);
  } catch (error) {
    await invalidateReservedReceipt(receipts, root, envelope, operation);
    throw error;
  }
  const next = normalizeView(mutate(delivery));
  await persistRuntime(root, next, { id: `${operation.id}-runtime`, faultInjector: operation.faultInjector });
  await receipts.consumeReceipt(root, envelope.receipt_id, expected, {
    id: `${operation.id}-consume`,
    faultInjector: operation.faultInjector,
    tool_use_id: envelope.tool_use_id,
  });
  return next;
}

async function recordRevision(root, request, options, clock) {
  assertPlainObject(request, "Delivery revision request");
  assertExactKeys(request, ["object_ref", "actor", "feedback", "proposal"], "Delivery revision request");
  const objectRef = storedObjectRef(normalizeAuthorityObjectRef(request.object_ref));
  const current = await read(root, objectRef);
  if (!["proposed", "waiting_to_start", "executing", "waiting_for_stone", "needs_revision"].includes(current.status)) {
    throw deliveryError("ERR_DELIVERY_STATE_INVALID", `Delivery revision is not allowed from state ${current.status}`);
  }
  normalizeActor(request.actor);
  const feedback = normalizeFeedback(request.feedback);
  const proposal = request.proposal;
  validateCompiledPlan(proposal, current.delivery_kind);
  if (current.delivery_mode === "plan" && proposal.delivery_mode !== "plan") {
    throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "A Plan revision must retain at least one Stone");
  }
  if (proposal.id !== current.object_ref.id) throw deliveryError("ERR_DELIVERY_OBJECT_MISMATCH", "Revised proposal targets a different Delivery");
  if (proposal.revision !== current.revision + 1 || proposal.plan_hash === current.plan_hash) {
    throw deliveryError("ERR_DELIVERY_PLAN_STALE", "Revised proposal must increment revision and change plan_hash");
  }
  const updatedAt = now(clock);
  const feedbackRecord = buildFeedbackRecord(current, feedback, request.actor, updatedAt, "revision");
  const planRecord = buildPlanRecord(proposal, current.delivery_kind, updatedAt, [current.plan_record_ref.id]);
  const { verification: _staleVerification, ...revisionBase } = current;
  const next = {
    ...revisionBase,
    status: "needs_revision",
    revision_state: "proposal_ready",
    revision: proposal.revision,
    plan_hash: proposal.plan_hash,
    plan_record_ref: recordRef(planRecord),
    feedback_record_ref: recordRef(feedbackRecord),
    ...(proposal.delivery_mode === undefined ? {} : { delivery_mode: proposal.delivery_mode }),
    ...(current.delivery_kind === "cycle" ? { milestones: proposal.milestones.map((item) => ({ ...item, status: "pending" })) } : {}),
    updated_at: updatedAt,
  };
  await persistRecordsAndRuntime(root, [feedbackRecord, planRecord], next, options, "delivery-revision");
  return clone(next);
}

async function verifyMilestone(root, request, options, clock) {
  assertPlainObject(request, "Milestone verification request");
  assertExactKeys(request, ["object_ref", "milestone_id", "evidence"], "Milestone verification request");
  const milestoneId = normalizeSafeIdentifier(request.milestone_id, "milestone_id");
  const objectRef = storedObjectRef(normalizeAuthorityObjectRef(request.object_ref));
  const operation = transactionOptions(options, "delivery-verify-milestone");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await read(root, objectRef);
    if (current.delivery_kind !== "cycle" || current.status !== "executing") {
      throw deliveryError("ERR_DELIVERY_STATE_INVALID", "Milestone verification requires an executing Cycle");
    }
    const activeIndex = current.milestones.findIndex((item) => item.id === milestoneId && item.status === "executing");
    if (activeIndex < 0) {
      throw deliveryError("ERR_DELIVERY_MILESTONE_ORDER", `Milestone ${milestoneId} is not currently executing`);
    }
    const verification = await validateEvidence(root, current.topology, request.evidence);
    const activeMilestone = current.milestones[activeIndex];
    const requiresStone = Boolean(activeMilestone.stone);
    const claimed = Boolean(activeMilestone.workstream_ref);
    let milestones = current.milestones.map((item, index) => {
      if (index !== activeIndex) return item;
      if (requiresStone) return { ...item, status: "pending_stone", verification };
      const { workstream_ref: _released, ...verified } = item;
      return { ...verified, status: "verified", verification };
    });
    if (!requiresStone && !claimed) milestones = startNextDependencyReadyMilestone(milestones);
    const next = normalizeView({
      ...current,
      status: requiresStone ? "waiting_for_stone" : "executing",
      milestones,
      updated_at: now(clock),
    });
    try {
      await persistRuntimeCas(root, current, next, {
        id: `${operation.id}-${attempt + 1}`,
        faultInjector: operation.faultInjector,
      });
      return clone(next);
    } catch (error) {
      if (error?.code !== "ERR_WORKSPACE_TRANSACTION_CONFLICT" || attempt === 4) throw error;
    }
  }
  throw deliveryError("ERR_DELIVERY_MILESTONE_CLAIM_CONFLICT", "Milestone verification retry budget was exhausted");
}

async function verify(root, request, options, clock) {
  assertPlainObject(request, "Delivery verification request");
  assertExactKeys(request, ["object_ref", "evidence"], "Delivery verification request");
  const current = await read(root, request.object_ref);
  if (current.status !== "executing") throw deliveryError("ERR_DELIVERY_STATE_INVALID", "Delivery must start and be executing before verification");
  if (current.delivery_kind === "cycle" && !current.milestones.every((item) => item.status === "verified")) {
    throw deliveryError("ERR_DELIVERY_STATE_INVALID", "Every Cycle milestone must be verified before aggregate verification");
  }
  const verification = await validateEvidence(root, current.topology, request.evidence);
  const next = { ...current, status: "verified", verification, updated_at: now(clock) };
  await persistRuntime(root, next, options);
  return clone(next);
}

async function requestAcceptance(root, request, options, clock) {
  assertPlainObject(request, "acceptance request");
  assertExactKeys(request, ["object_ref"], "acceptance request");
  const current = await read(root, request.object_ref);
  if (current.status !== "verified") throw deliveryError("ERR_DELIVERY_STATE_INVALID", "Only a verified Delivery can request acceptance");
  const integration = await inspectWorkItemCompletion(root, current.object_ref);
  if (!integration.allowed) {
    throw deliveryError(
      "ERR_DELIVERY_INTEGRATION_REQUIRED",
      "Source-changing Work Placement requires integration evidence before Delivery acceptance",
    );
  }
  const next = { ...current, status: "pending_acceptance", updated_at: now(clock) };
  await persistRuntime(root, next, options);
  return clone(next);
}

async function reject(root, request, options, clock, receipts, intent) {
  assertPlainObject(request, "Delivery rejection request");
  assertExactKeys(request, ["receipt_id", "actor", "intent", "object_ref", "scope", "plan_hash", "tool_use_id", "feedback"], "Delivery rejection request");
  const feedback = normalizeFeedback(request.feedback);
  const envelope = normalizeTransitionEnvelope(request);
  const current = await read(root, envelope.object_ref);
  const operation = transactionOptions(options, "delivery-reject");
  const suppliedContext = transitionContext(envelope);
  await receipts.reserveReceipt(root, envelope.receipt_id, suppliedContext, {
    id: `${operation.id}-reserve`, faultInjector: operation.faultInjector, tool_use_id: envelope.tool_use_id,
  });
  let expected;
  try {
    expected = buildDeliveryReceiptContext(current, { actor: envelope.actor, intent });
    assertEnvelopeMatches(envelope, expected, intent);
  } catch (error) {
    await invalidateReservedReceipt(receipts, root, envelope, operation);
    throw error;
  }
  const updatedAt = now(clock);
  const feedbackRecord = buildFeedbackRecord(current, feedback, envelope.actor, updatedAt, intent);
  const { verification: _staleVerification, ...rejectionBase } = current;
  const next = {
    ...rejectionBase,
    status: "needs_revision",
    revision_state: "feedback_pending",
    feedback_record_ref: recordRef(feedbackRecord),
    updated_at: updatedAt,
  };
  await persistRecordsAndRuntime(root, [feedbackRecord], next, { id: `${operation.id}-authority`, faultInjector: operation.faultInjector }, "delivery-reject");
  await receipts.consumeReceipt(root, envelope.receipt_id, expected, {
    id: `${operation.id}-consume`, faultInjector: operation.faultInjector, tool_use_id: envelope.tool_use_id,
  });
  return clone(next);
}

async function resume(root, input = {}) {
  assertPlainObject(input, "Delivery resume input");
  assertExactKeys(input, ["object_ref"], "Delivery resume input");
  const selectedRef = input.object_ref
    ? storedObjectRef(normalizeAuthorityObjectRef(input.object_ref))
    : (await readActivePointer(root)).active.delivery;
  if (!selectedRef) throw deliveryError("ERR_DELIVERY_NOT_FOUND", "No Delivery is available to resume");
  if (selectedRef.kind !== "delivery") throw deliveryError("ERR_DELIVERY_OBJECT_MISMATCH", "Resume object is not a Delivery");
  const authority = await readRuntimeObject(root, selectedRef);
  const delivery = fromRuntime(authority.runtime);
  const selected = await selectLatestValidRecoveryPack(root, { object_ref: selectedRef });
  if (!selected.pack_ref) {
    return {
      delivery,
      continuation: authority.continuation,
      recovery: {
        pack_ref: null,
        pack_status: "missing",
        replay_required: false,
        degraded: true,
        rejected_packs: selected.rejected_packs,
      },
    };
  }
  const current = canonicalHash(selected.pack.continuation) === canonicalHash(authority.continuation);
  return {
    delivery,
    continuation: authority.continuation,
    recovery: {
      pack_ref: selected.pack_ref,
      pack_status: current ? "current" : "stale",
      replay_required: !current,
      rejected_packs: selected.rejected_packs,
    },
  };
}

async function claimMilestone(root, request, options, clock) {
  return mutateMilestoneClaim(root, request, options, clock, "claim");
}

async function releaseMilestoneClaim(root, request, options, clock) {
  return mutateMilestoneClaim(root, request, options, clock, "release");
}

async function mutateMilestoneClaim(root, request, options, clock, action) {
  assertPlainObject(request, `Milestone ${action} request`);
  assertExactKeys(
    request,
    ["object_ref", "milestone_id", "workstream_ref", "expected_plan_hash"],
    `Milestone ${action} request`,
  );
  const objectRef = storedObjectRef(normalizeAuthorityObjectRef(request.object_ref));
  const milestoneId = normalizeSafeIdentifier(request.milestone_id, "milestone_id");
  const workstreamRef = storedObjectRef(normalizeAuthorityObjectRef(request.workstream_ref));
  if (objectRef.kind !== "delivery" || workstreamRef.kind !== "activity") {
    throw deliveryError("ERR_DELIVERY_OBJECT_MISMATCH", "Milestone claims require Delivery and Workstream references");
  }
  if (typeof request.expected_plan_hash !== "string" || !/^[a-f0-9]{64}$/.test(request.expected_plan_hash)) {
    throw deliveryError("ERR_DELIVERY_PLAN_STALE", "Milestone claim expected_plan_hash is invalid");
  }
  const operation = transactionOptions(options, `delivery-milestone-${action}`);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await read(root, objectRef);
    if (current.delivery_kind !== "cycle" || current.status !== "executing") {
      throw deliveryError("ERR_DELIVERY_STATE_INVALID", "Milestone claims require an executing Cycle");
    }
    if (current.plan_hash !== request.expected_plan_hash) {
      throw deliveryError("ERR_DELIVERY_PLAN_STALE", "Milestone claim Plan hash is stale");
    }
    const workstream = await readRuntimeObject(root, workstreamRef);
    const binding = workstream.runtime.session_binding;
    if (
      workstream.runtime.activity_kind !== "workstream"
      || workstream.runtime.status !== "active"
      || !sameObjectRef(workstream.runtime.delivery_ref, objectRef)
      || !binding
      || !sameObjectRef(binding.delivery_ref, objectRef)
      || binding.plan_hash !== current.plan_hash
      || binding.revision !== current.revision
    ) {
      throw deliveryError("ERR_DELIVERY_WORKSTREAM_INVALID", "Milestone claim requires an active Workstream bound to this Delivery");
    }
    const index = current.milestones.findIndex((item) => item.id === milestoneId);
    if (index < 0) throw deliveryError("ERR_DELIVERY_MILESTONE_NOT_FOUND", `Milestone ${milestoneId} was not found`);
    const milestone = current.milestones[index];
    let replacement;
    if (action === "claim") {
      const dependenciesReady = (milestone.depends_on || []).every((dependencyId) => (
        current.milestones.some((candidate) => candidate.id === dependencyId && candidate.status === "verified")
      ));
      if (!dependenciesReady) throw deliveryError("ERR_DELIVERY_MILESTONE_ORDER", `Milestone ${milestoneId} dependencies are not verified`);
      if (!["pending", "executing"].includes(milestone.status)) throw deliveryError("ERR_DELIVERY_MILESTONE_CLAIM_CONFLICT", `Milestone ${milestoneId} cannot be claimed from ${milestone.status}`);
      if (milestone.workstream_ref && !sameObjectRef(milestone.workstream_ref, workstreamRef)) {
        throw deliveryError("ERR_DELIVERY_MILESTONE_CLAIM_CONFLICT", `Milestone ${milestoneId} is claimed by another Workstream`);
      }
      replacement = { ...milestone, status: "executing", workstream_ref: workstreamRef };
    } else {
      if (!milestone.workstream_ref || !sameObjectRef(milestone.workstream_ref, workstreamRef)) {
        throw deliveryError("ERR_DELIVERY_MILESTONE_CLAIM_CONFLICT", `Milestone ${milestoneId} is not claimed by this Workstream`);
      }
      const { workstream_ref: _released, ...unclaimed } = milestone;
      replacement = { ...unclaimed, status: "pending" };
    }
    const next = normalizeView({
      ...current,
      milestones: current.milestones.map((item, itemIndex) => itemIndex === index ? replacement : item),
      updated_at: now(clock),
    });
    try {
      await persistRuntimeCas(root, current, next, {
        id: `${operation.id}-${attempt + 1}`,
        faultInjector: operation.faultInjector,
      });
      return clone(next);
    } catch (error) {
      if (error?.code !== "ERR_WORKSPACE_TRANSACTION_CONFLICT" || attempt === 4) throw error;
    }
  }
  throw deliveryError("ERR_DELIVERY_MILESTONE_CLAIM_CONFLICT", "Milestone claim retry budget was exhausted");
}

async function persistRuntimeCas(root, current, next, options) {
  const currentDocs = compileRuntimeObjectDocuments(toRuntimeDocuments(current));
  const nextDocs = compileRuntimeObjectDocuments(toRuntimeDocuments(next));
  const manifest = await readCurrentManifest(root);
  await commitWorkspaceTransaction(root, {
    id: options.id,
    faultInjector: options.faultInjector,
    manifest,
    writes: [
      {
        path: nextDocs.runtime_path,
        content: renderYaml(nextDocs.runtime),
        expected_hash: sha256(renderYaml(currentDocs.runtime)),
      },
      {
        path: nextDocs.continuation_path,
        content: renderYaml(nextDocs.continuation),
        expected_hash: sha256(renderYaml(currentDocs.continuation)),
      },
    ],
  });
}

async function persistRuntime(root, delivery, options) {
  const operation = transactionOptions(options, "delivery-runtime");
  await writeRuntimeObject(root, toRuntimeDocuments(normalizeView(delivery)), operation);
}

async function persistRecordsAndRuntime(root, records, delivery, options, operationName) {
  const normalized = normalizeView(delivery);
  const docs = compileRuntimeObjectDocuments(toRuntimeDocuments(normalized));
  const manifest = await readCurrentManifest(root);
  const operation = transactionOptions(options, operationName);
  await commitWorkspaceTransaction(root, {
    id: operation.id,
    faultInjector: operation.faultInjector,
    manifest,
    writes: [
      ...records.map((record) => ({ path: recordPath(record), content: renderRecordDocument(record.attributes, record.body) })),
      { path: docs.runtime_path, content: renderYaml(docs.runtime) },
      { path: docs.continuation_path, content: renderYaml(docs.continuation) },
    ],
  });
}

function toRuntimeDocuments(delivery) {
  const runtime = clone(delivery);
  const continuation = {
    schema_version: "1",
    object_ref: delivery.object_ref,
    next_action: nextAction(delivery),
    plan_hash: delivery.plan_hash,
    revision: delivery.revision,
    ...(delivery.worker_routing === undefined ? {} : {
      worker_routing: validateWorkerRoutingDecision(delivery.worker_routing),
    }),
    updated_at: delivery.updated_at,
  };
  return { object_ref: delivery.object_ref, runtime, continuation };
}

function fromRuntime(runtime) {
  return normalizeView(runtime);
}

function normalizeView(value) {
  assertPlainObject(value, "Delivery view");
  const objectRef = storedObjectRef(normalizeAuthorityObjectRef(value.object_ref));
  if (objectRef.kind !== "delivery") throw deliveryError("ERR_DELIVERY_OBJECT_MISMATCH", "Delivery view must reference kind delivery");
  if (!["goal", "cycle"].includes(value.delivery_kind)) throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Delivery kind must be goal or cycle");
  if (typeof value.status !== "string" || !value.status) throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Delivery status is required");
  if (value.status === "needs_revision" && !["feedback_pending", "proposal_ready"].includes(value.revision_state)) {
    throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "needs_revision Delivery requires a valid revision_state");
  }
  if (value.status !== "needs_revision" && Object.hasOwn(value, "revision_state")) {
    throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "revision_state is valid only while Delivery needs revision");
  }
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Delivery revision is invalid");
  if (!/^[a-f0-9]{64}$/.test(value.plan_hash)) throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Delivery plan_hash is invalid");
  if (value.delivery_kind === "goal" && Object.hasOwn(value, "milestones")) throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Goal must not expose milestones");
  if (value.delivery_kind === "cycle" && !Array.isArray(value.milestones)) throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Cycle milestones are required");
  if (value.delivery_mode !== undefined && !["cycle", "plan"].includes(value.delivery_mode)) {
    throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Delivery mode must be cycle or plan");
  }
  if (value.delivery_mode === "plan" && !value.milestones.some((milestone) => milestone.stone)) {
    throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Plan Delivery requires at least one Stone");
  }
  const workerRouting = value.worker_routing === undefined
    ? undefined
    : validateWorkerRoutingDecision(value.worker_routing);
  return clone({
    ...value,
    object_ref: objectRef,
    ...(workerRouting === undefined ? {} : { worker_routing: workerRouting }),
  });
}

function validateCompiledPlan(value, kind) {
  assertPlainObject(value, `compiled ${kind} plan`);
  if (value.schema_version !== "1" || value.delivery_kind !== kind || value.status !== "draft") {
    throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", `compiled ${kind} plan is invalid`);
  }
  normalizeSafeIdentifier(value.id, `compiled ${kind} plan id`);
  if (!Number.isSafeInteger(value.revision) || value.revision < 0 || !/^[a-f0-9]{64}$/.test(value.plan_hash)) {
    throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", `compiled ${kind} plan revision or hash is invalid`);
  }
  if (kind === "goal" && Object.hasOwn(value, "milestones")) throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Goal plan must not contain milestones");
  if (kind === "cycle" && (!Array.isArray(value.milestones) || value.milestones.length === 0)) {
    throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Cycle plan requires milestones");
  }
  if (value.delivery_mode === "plan" && !value.milestones.some((milestone) => milestone.stone)) {
    throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Plan requires at least one Stone");
  }
  const withoutHash = { ...value };
  delete withoutHash.plan_hash;
  if (canonicalHash(withoutHash) !== value.plan_hash) throw deliveryError("ERR_DELIVERY_PLAN_STALE", "compiled plan_hash does not match plan content");
}

function validateTopology(value) {
  assertPlainObject(value, "Delivery topology");
  if (!Array.isArray(value.required_roles) || value.required_roles.length === 0) {
    throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Delivery topology requires worker roles");
  }
}

async function validateEvidence(root, topology, evidence) {
  let assessed;
  try {
    assessed = assessExecutionEvidence({ topology, evidence });
  } catch (error) {
    if (error.code) throw error;
    throw deliveryError("ERR_DELIVERY_EVIDENCE_INCOMPLETE", "Worker evidence is invalid");
  }
  if (!assessed.ready) {
    throw deliveryError("ERR_DELIVERY_EVIDENCE_INCOMPLETE", `Worker evidence is incomplete: ${[...assessed.missing_roles, ...assessed.identity_collisions].join(", ")}`);
  }
  for (const ref of assessed.evidence_refs) await validateEvidenceFile(root, ref);
  return { roles: assessed.roles, evidence_refs: assessed.evidence_refs };
}

async function validateEvidenceFile(root, ref) {
  let guarded;
  try {
    guarded = await assertWorkspacePathAllowed(resolve(root || "."), ref.path);
    const stats = await lstat(guarded.path);
    if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("not regular");
    const digest = `sha256:${createHash("sha256").update(await readFile(guarded.path)).digest("hex")}`;
    if (digest !== ref.digest) throw new Error("digest mismatch");
  } catch {
    throw deliveryError("ERR_DELIVERY_EVIDENCE_INTEGRITY", `Evidence file digest or path integrity failed for ${ref.path}`);
  }
}

function buildPlanRecord(plan, deliveryKind, timestamp, supersedes) {
  return buildPersistedRecord({
    scope: { type: deliveryKind, ref: plan.id },
    kind: "decision",
    source_refs: [{ type: "delivery_plan", ref: `${deliveryKind}:${plan.id}:revision:${plan.revision}`, locator: "compiled-plan" }],
    confidence: "confirmed",
    dedupe_key: `${deliveryKind}.${plan.id}.plan`,
    created_at: timestamp,
    updated_at: timestamp,
    supersedes,
    body: `# ${plan.title}\n\n${plan.outcome}\n\n\`\`\`json\n${JSON.stringify(plan, null, 2)}\n\`\`\``,
  });
}

function buildFeedbackRecord(delivery, feedback, actor, timestamp, action) {
  const fingerprint = canonicalHash({ feedback, actor, timestamp, action }).slice(0, 16);
  return buildPersistedRecord({
    scope: { type: delivery.delivery_kind, ref: delivery.object_ref.id },
    kind: "feedback",
    source_refs: [{ type: "user_feedback", ref: `actor:${actor.type}:${actor.id}`, locator: action }],
    confidence: "confirmed",
    dedupe_key: `${delivery.delivery_kind}.${delivery.object_ref.id}.feedback.${fingerprint}`,
    created_at: timestamp,
    updated_at: timestamp,
    supersedes: [],
    body: [
      "# Delivery feedback",
      "",
      `Problem: ${feedback.problem}`,
      `Reproduce: ${feedback.reproduce_steps.join(" ")}`,
      `Expected: ${feedback.expected}`,
      `Actual: ${feedback.actual}`,
      `Context: ${feedback.context}`,
    ].join("\n"),
  });
}

function recordPath(record) {
  return `.pipeline/memory/records/${recordScopeDirectory(record.attributes.scope)}/${record.attributes.kind}/${record.id}.md`;
}

function recordRef(record) {
  return { id: record.id, semantic_hash: record.semantic_hash };
}

function normalizeFeedback(value) {
  assertPlainObject(value, "Delivery feedback");
  assertExactKeys(value, ["problem", "reproduce_steps", "expected", "actual", "context"], "Delivery feedback");
  assertNoRawSecrets(value, "Delivery feedback");
  const result = {};
  for (const key of ["problem", "expected", "actual", "context"]) {
    if (typeof value[key] !== "string" || value[key] !== value[key].trim() || !value[key]) {
      throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", `Delivery feedback.${key} is required`);
    }
    result[key] = value[key];
  }
  if (!Array.isArray(value.reproduce_steps) || value.reproduce_steps.length === 0 || value.reproduce_steps.some((step) => typeof step !== "string" || !step.trim())) {
    throw deliveryError("ERR_DELIVERY_SCHEMA_INVALID", "Delivery feedback.reproduce_steps must be a non-empty text array");
  }
  result.reproduce_steps = [...value.reproduce_steps];
  return result;
}

function normalizeActor(value) {
  assertPlainObject(value, "Delivery actor");
  assertExactKeys(value, ["type", "id"], "Delivery actor");
  return {
    type: normalizeSafeIdentifier(value.type, "Delivery actor.type"),
    id: normalizeSafeIdentifier(value.id, "Delivery actor.id"),
  };
}

function normalizeTransitionEnvelope(value) {
  assertPlainObject(value, "Delivery transition");
  const envelope = { ...value };
  delete envelope.feedback;
  assertExactKeys(envelope, ["receipt_id", "actor", "intent", "object_ref", "scope", "plan_hash", "tool_use_id"], "Delivery transition");
  return {
    receipt_id: normalizeSafeIdentifier(envelope.receipt_id, "Delivery transition.receipt_id"),
    actor: normalizeActor(envelope.actor),
    intent: envelope.intent,
    object_ref: storedObjectRef(normalizeAuthorityObjectRef(envelope.object_ref)),
    scope: clone(envelope.scope),
    plan_hash: envelope.plan_hash,
    tool_use_id: normalizeSafeIdentifier(envelope.tool_use_id, "Delivery transition.tool_use_id"),
  };
}

function assertEnvelopeMatches(envelope, expected, intent) {
  if (
    envelope.intent !== intent
    || canonicalHash(envelope.actor) !== canonicalHash(expected.actor)
    || !sameObjectRef(envelope.object_ref, expected.object_ref)
    || canonicalHash(envelope.scope) !== canonicalHash(expected.scope)
    || envelope.plan_hash !== expected.plan_hash
  ) {
    throw deliveryError("ERR_RECEIPT_CONTEXT_DRIFT", "Receipt transition context does not match current Delivery authority");
  }
}

function assertTransitionPreflight(delivery, intent) {
  if (["delivery.approve", "delivery.approve_and_start"].includes(intent) && delivery.status === "needs_revision" && delivery.revision_state !== "proposal_ready") {
    throw deliveryError("ERR_DELIVERY_STATE_INVALID", "Delivery feedback is pending a revised proposal before approval");
  }
}

function withoutRevisionState(delivery) {
  const { revision_state: _revisionState, ...rest } = delivery;
  return rest;
}

function transitionContext(envelope) {
  return {
    actor: envelope.actor,
    intent: envelope.intent,
    object_ref: envelope.object_ref,
    scope: envelope.scope,
    plan_hash: envelope.plan_hash,
  };
}

async function invalidateReservedReceipt(receipts, root, envelope, operation) {
  await receipts.invalidateReceipt(root, envelope.receipt_id, {
    reason: "authorization_context_drift",
  }, {
    id: `${operation.id}-invalidate`,
    faultInjector: operation.faultInjector,
  });
}

function startFirstMilestone(milestones) {
  const next = milestones.findIndex((item) => item.status === "pending");
  if (next < 0) throw deliveryError("ERR_DELIVERY_MILESTONE_ORDER", "Cycle has no runnable milestone");
  return milestones.map((item, index) => index === next ? { ...item, status: "executing" } : item);
}

function startApprovedDelivery(delivery) {
  return {
    ...delivery,
    status: "executing",
    ...(delivery.delivery_kind === "cycle" ? { milestones: startFirstMilestone(delivery.milestones) } : {}),
  };
}

function pendingStoneScope(delivery) {
  const milestone = delivery.milestones?.find((item) => item.status === "pending_stone");
  if (!milestone?.stone) throw deliveryError("ERR_DELIVERY_STATE_INVALID", "No pending Stone is available for acceptance");
  return { milestone_id: milestone.id, stone_id: milestone.stone.id };
}

function acceptPendingStone(delivery) {
  const activeIndex = delivery.milestones?.findIndex((item) => item.status === "pending_stone") ?? -1;
  if (activeIndex < 0) throw deliveryError("ERR_DELIVERY_STATE_INVALID", "No pending Stone is available for acceptance");
  const claimed = Boolean(delivery.milestones[activeIndex].workstream_ref);
  let milestones = delivery.milestones.map((item, index) => {
    if (index !== activeIndex) return item;
    const { workstream_ref: _released, ...verified } = item;
    return { ...verified, status: "verified" };
  });
  if (!claimed) milestones = startNextDependencyReadyMilestone(milestones);
  return { ...delivery, status: "executing", milestones };
}

function startNextDependencyReadyMilestone(milestones) {
  const next = milestones.findIndex((item) => (
    item.status === "pending"
    && (item.depends_on || []).every((dependencyId) => (
      milestones.some((candidate) => candidate.id === dependencyId && candidate.status === "verified")
    ))
  ));
  return next < 0
    ? milestones
    : milestones.map((item, index) => index === next ? { ...item, status: "executing" } : item);
}

function nextAction(delivery) {
  const actions = {
    proposed: "request_delivery_approval",
    needs_revision: delivery.revision_state === "feedback_pending" ? "prepare_revised_proposal" : "review_revised_proposal",
    waiting_to_start: "request_explicit_start",
    waiting_for_stone: "await_stone_acceptance",
    executing: delivery.delivery_kind === "cycle" ? "continue_active_milestone" : "complete_and_verify_goal",
    verified: "request_manual_acceptance",
    pending_acceptance: "await_manual_acceptance",
    accepted: "delivery_complete",
  };
  return actions[delivery.status] || "inspect_delivery_state";
}

function deliveryStateHash(delivery) {
  return canonicalHash({
    object_ref: delivery.object_ref,
    delivery_kind: delivery.delivery_kind,
    status: delivery.status,
    revision: delivery.revision,
    plan_hash: delivery.plan_hash,
    updated_at: delivery.updated_at,
    ...(delivery.revision_state === undefined ? {} : { revision_state: delivery.revision_state }),
  });
}

function transactionOptions(options, operation) {
  assertPlainObject(options, `${operation} options`);
  assertExactKeys(options, ["id", "faultInjector"], `${operation} options`);
  return {
    id: normalizeSafeIdentifier(options.id, `${operation} options.id`),
    ...(options.faultInjector === undefined ? {} : { faultInjector: options.faultInjector }),
  };
}

function now(clock) {
  return normalizeTimestamp(clock(), "Delivery clock value");
}

function renderYaml(value) {
  return `${stringifyYaml(value).trimEnd()}\n`;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deliveryError(code, message) {
  return authorityError(code, message);
}
