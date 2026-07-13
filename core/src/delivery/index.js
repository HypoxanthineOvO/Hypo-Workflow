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

const TRANSITIONS = Object.freeze({
  "delivery.approve": { action: "approve", states: ["proposed", "needs_revision"] },
  "delivery.start": { action: "start", states: ["waiting_to_start"] },
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
    read,
    approve(root, transition, options = {}) {
      return receiptTransition(root, transition, options, clock, receipts, "delivery.approve", (delivery) => ({
        ...withoutRevisionState(delivery),
        status: "waiting_to_start",
        updated_at: now(clock),
      }));
    },
    start(root, transition, options = {}) {
      return receiptTransition(root, transition, options, clock, receipts, "delivery.start", (delivery) => ({
        ...delivery,
        status: "executing",
        ...(delivery.delivery_kind === "cycle" ? { milestones: startFirstMilestone(delivery.milestones) } : {}),
        updated_at: now(clock),
      }));
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
      return reject(root, request, options, clock, receipts);
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
  if (input.intent === "delivery.approve" && delivery.status === "needs_revision" && delivery.revision_state !== "proposal_ready") {
    throw deliveryError("ERR_DELIVERY_STATE_INVALID", "Delivery feedback is pending a revised proposal before approval");
  }
  const actor = normalizeActor(input.actor);
  const scope = {
    action: definition.action,
    delivery_kind: delivery.delivery_kind,
    expected_state: delivery.status,
    revision: delivery.revision,
    state_hash: deliveryStateHash(delivery),
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
      { path, content: renderRecordDocument(planRecord.attributes, planRecord.body) },
      { path: docs.runtime_path, content: renderYaml(docs.runtime) },
      { path: docs.continuation_path, content: renderYaml(docs.continuation) },
      { path: ".pipeline/runtime/active.yaml", content: renderYaml(pointer) },
    ],
  });
  return clone(delivery);
}

async function assertProposalCreateAllowed(root, objectRef, pointer) {
  const existing = await optionalReadDelivery(root, objectRef);
  if (existing) {
    throw deliveryError("ERR_DELIVERY_OBJECT_EXISTS", `Delivery object ${objectRef.id} already exists; revisions must use recordRevision`);
  }

  const activeRef = pointer.active.delivery;
  if (!activeRef) return;
  if (sameObjectRef(activeRef, objectRef)) {
    throw deliveryError("ERR_DELIVERY_ACTIVE_EXISTS", `Active Delivery ${objectRef.id} cannot be replaced by a proposal`);
  }
  const active = await read(root, activeRef);
  if (active.status !== "accepted") {
    throw deliveryError("ERR_DELIVERY_ACTIVE_EXISTS", `Another Delivery is already active in non-terminal state ${active.status}`);
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
  if (!["proposed", "waiting_to_start", "needs_revision"].includes(current.status)) {
    throw deliveryError("ERR_DELIVERY_STATE_INVALID", `Delivery revision is not allowed from state ${current.status}`);
  }
  normalizeActor(request.actor);
  const feedback = normalizeFeedback(request.feedback);
  const proposal = request.proposal;
  validateCompiledPlan(proposal, current.delivery_kind);
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
    ...(current.delivery_kind === "cycle" ? { milestones: proposal.milestones.map((item) => ({ ...item, status: "pending" })) } : {}),
    updated_at: updatedAt,
  };
  await persistRecordsAndRuntime(root, [feedbackRecord, planRecord], next, options, "delivery-revision");
  return clone(next);
}

async function verifyMilestone(root, request, options, clock) {
  assertPlainObject(request, "Milestone verification request");
  assertExactKeys(request, ["object_ref", "milestone_id", "evidence"], "Milestone verification request");
  const current = await read(root, request.object_ref);
  if (current.delivery_kind !== "cycle" || current.status !== "executing") {
    throw deliveryError("ERR_DELIVERY_STATE_INVALID", "Milestone verification requires an executing Cycle");
  }
  const milestoneId = normalizeSafeIdentifier(request.milestone_id, "milestone_id");
  const activeIndex = current.milestones.findIndex((item) => item.status === "executing");
  if (activeIndex < 0 || current.milestones[activeIndex].id !== milestoneId) {
    const expected = current.milestones[activeIndex]?.id || "the next dependency-satisfied milestone";
    throw deliveryError("ERR_DELIVERY_MILESTONE_ORDER", `Milestone order requires ${expected} before ${milestoneId}`);
  }
  const verification = await validateEvidence(root, current.topology, request.evidence);
  const milestones = current.milestones.map((item, index) => {
    if (index === activeIndex) return { ...item, status: "verified", verification };
    if (index === activeIndex + 1) return { ...item, status: "executing" };
    return item;
  });
  const next = { ...current, milestones, updated_at: now(clock) };
  await persistRuntime(root, next, options);
  return clone(next);
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
  const next = { ...current, status: "pending_acceptance", updated_at: now(clock) };
  await persistRuntime(root, next, options);
  return clone(next);
}

async function reject(root, request, options, clock, receipts) {
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
    expected = buildDeliveryReceiptContext(current, { actor: envelope.actor, intent: "delivery.reject" });
    assertEnvelopeMatches(envelope, expected, "delivery.reject");
  } catch (error) {
    await invalidateReservedReceipt(receipts, root, envelope, operation);
    throw error;
  }
  const updatedAt = now(clock);
  const feedbackRecord = buildFeedbackRecord(current, feedback, envelope.actor, updatedAt, "reject");
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
  const pointer = await readActivePointer(root);
  if (!pointer.active.delivery) throw deliveryError("ERR_DELIVERY_NOT_FOUND", "No active Delivery is available to resume");
  const activeRef = pointer.active.delivery;
  if (input.object_ref && !sameObjectRef(input.object_ref, activeRef)) {
    throw deliveryError("ERR_DELIVERY_RESUME_OBJECT_MISMATCH", "Resume object does not match the active Delivery");
  }
  const authority = await readRuntimeObject(root, activeRef);
  const delivery = fromRuntime(authority.runtime);
  const selected = await selectLatestValidRecoveryPack(root, { object_ref: activeRef });
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
  return clone({ ...value, object_ref: objectRef });
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
  if (intent === "delivery.approve" && delivery.status === "needs_revision" && delivery.revision_state !== "proposal_ready") {
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

function nextAction(delivery) {
  const actions = {
    proposed: "request_delivery_approval",
    needs_revision: delivery.revision_state === "feedback_pending" ? "prepare_revised_proposal" : "review_revised_proposal",
    waiting_to_start: "request_explicit_start",
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deliveryError(code, message) {
  return authorityError(code, message);
}
