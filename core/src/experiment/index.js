import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  compileRuntimeObjectDocuments,
  readRuntimeObject,
} from "../runtime/index.js";
import {
  assertWorkspacePathAllowed,
  commitWorkspaceTransaction,
  normalizeWorkspacePath,
  recoverWorkspaceTransaction,
} from "../workspace-store/index.js";
import {
  AUTHORITY_SCHEMA_VERSION,
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeAuthorityObjectRef,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
  normalizeSha256,
  normalizeTimestamp,
  normalizeTransactionOptions,
  readCurrentManifest,
  storedObjectRef,
} from "../runtime/internal.js";
import { canonicalHash, stringifyYaml } from "../serialization/index.js";
import { createReceiptStore, readReceipt } from "../receipts/index.js";
import { normalizeCompiledExperimentRunSpec } from "./runs.js";
import {
  applyScientificReviewResolution,
  assertExperimentSupervisionRerunBinding,
  normalizeExperimentScientificReview,
  normalizeExperimentSupervisionEvidence,
  normalizeScientificReviewResolutionTarget,
} from "./supervision.js";

const EXPERIMENT_ZONE = "runtime";
const EXPERIMENT_KIND = "experiment";
const EXPERIMENT_LIFECYCLES = new Set(["active", "superseded", "trashed"]);
const RECEIPT_TRANSITIONS = Object.freeze({
  "experiment.supersede": { action: "supersede", lifecycles: ["active"] },
  "experiment.trash": { action: "trash", lifecycles: ["active"] },
  "experiment.restore": { action: "restore", lifecycles: ["trashed"] },
  "experiment.baseline.change": { action: "baseline_change", lifecycles: ["active"] },
  "experiment.review.resolve": { action: "review_resolution", lifecycles: ["active"] },
});
const AUTHORITY_FIELDS = new Set([
  "object_ref",
  "schema_version",
  "lifecycle",
  "status",
  "attempts",
  "current_attempt_id",
  "baseline_history",
  "created_at",
  "updated_at",
  "superseded_by_experiment_id",
]);
const RECOVERY_TRANSACTION_STAGES = Object.freeze([
  "reserve",
  "authority",
  "consume",
  "invalidate",
  "recovery-consume",
  "recovery-receipt",
]);
const RECOVERY_NOT_ACTIVATED_REASON = "experiment_transition_recovery_authority_not_activated";
const RECOVERY_ACTIVATED_RECEIPT_REASON = "experiment_transition_recovery_authority_activated_receipt_compensation";

export function createExperimentStore(input = {}) {
  assertPlainObject(input, "Experiment store options");
  assertExactKeys(input, ["clock"], "Experiment store options");
  if (typeof input.clock !== "function") {
    throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", "Experiment store clock must be a zero-argument function");
  }
  const clock = input.clock;
  const receipts = createReceiptStore({ clock });
  return Object.freeze({
    create(root, experiment, options = {}) {
      return create(root, experiment, options, clock);
    },
    read,
    list,
    recordAttempt(root, request, options = {}) {
      return recordAttempt(root, request, options, clock);
    },
    rerun(root, request, options = {}) {
      return rerun(root, request, options, clock);
    },
    recordRun(root, request, options = {}) {
      return recordRun(root, request, options, clock);
    },
    recordSupervisedRun(root, request, options = {}) {
      return recordSupervisedRun(root, request, options, clock);
    },
    supersede(root, transition, options = {}) {
      return supersede(root, transition, options, clock, receipts);
    },
    trash(root, transition, options = {}) {
      return trash(root, transition, options, clock, receipts);
    },
    restore(root, transition, options = {}) {
      return restore(root, transition, options, clock, receipts);
    },
    changeBaseline(root, transition, options = {}) {
      return changeBaseline(root, transition, options, clock, receipts);
    },
    resolveScientificReview(root, transition, options = {}) {
      return resolveScientificReview(root, transition, options, clock, receipts);
    },
    recoverTransition(root, transition, options = {}) {
      return recoverTransition(root, transition, options, receipts);
    },
  });
}

export function buildExperimentReceiptContext(experimentInput, input) {
  const experiment = normalizeExperimentView(experimentInput);
  assertPlainObject(input, "Experiment Receipt context input");
  assertExactKeys(input, ["actor", "intent", "target"], "Experiment Receipt context input");
  const definition = RECEIPT_TRANSITIONS[input.intent];
  if (!definition || !definition.lifecycles.includes(experiment.lifecycle)) {
    throw experimentError(
      "ERR_EXPERIMENT_STATE_INVALID",
      `Receipt intent ${input.intent || "unknown"} is unsupported from Experiment lifecycle ${experiment.lifecycle}`,
    );
  }
  const hasTarget = Object.hasOwn(input, "target");
  let target;
  if (definition.action === "supersede" || definition.action === "baseline_change" || definition.action === "review_resolution") {
    if (!hasTarget) {
      throw experimentError(
        "ERR_EXPERIMENT_RECEIPT_TARGET_REQUIRED",
        `Receipt intent ${input.intent} requires a target`,
      );
    }
    target = normalizeExperimentReceiptTarget(experiment, definition.action, input.target);
  } else if (hasTarget) {
    throw experimentError(
      "ERR_EXPERIMENT_RECEIPT_TARGET_UNEXPECTED",
      `Receipt intent ${input.intent} does not accept a target`,
    );
  }
  const targetHash = target ? canonicalHash(target) : null;
  return {
    actor: normalizeActor(input.actor),
    intent: input.intent,
    object_ref: experiment.object_ref,
    scope: experimentReceiptScope(experiment, definition.action, targetHash),
    plan_hash: experimentReceiptPlanHash(experiment, definition.action, targetHash),
  };
}

async function create(root, input, options, clock) {
  const operation = normalizeTransactionOptions(options, "experiment-create", input);
  const definition = normalizeExperimentDefinition(input, "Experiment definition");
  const objectRef = { kind: EXPERIMENT_KIND, id: definition.id };
  if (await optionalRead(root, objectRef)) {
    throw experimentError("ERR_EXPERIMENT_OBJECT_EXISTS", `Experiment ${definition.id} already exists`);
  }
  const timestamp = now(clock);
  const experiment = buildExperiment(definition, timestamp);
  await persistExperiments(root, [experiment], operation, { missing: [objectRef] });
  return clone(experiment);
}

async function read(root, objectRefInput) {
  const objectRef = normalizeExperimentObjectRef(objectRefInput);
  let authority;
  try {
    authority = await readRuntimeObject(root, objectRef);
  } catch (error) {
    if (error?.code === "ERR_AUTHORITY_OBJECT_NOT_FOUND") {
      throw experimentError("ERR_EXPERIMENT_NOT_FOUND", `Experiment ${objectRef.id} was not found`);
    }
    throw error;
  }
  if (authority.object_ref.kind !== EXPERIMENT_KIND) {
    throw experimentError("ERR_EXPERIMENT_OBJECT_MISMATCH", "Object is not an Experiment");
  }
  return clone(normalizeExperimentView(authority.runtime));
}

async function list(root) {
  const manifest = await readCurrentManifest(root);
  const runtimeZone = manifest.zones[EXPERIMENT_ZONE];
  const experimentsRoot = `${runtimeZone}/objects/${EXPERIMENT_KIND}`;
  const guarded = await assertWorkspacePathAllowed(resolve(root || "."), experimentsRoot, { allowRoot: true });
  let entries;
  try {
    entries = await readdir(guarded.path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return [];
    throw error;
  }
  const experiments = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isSymbolicLink()) {
      throw experimentError("ERR_WORKSPACE_PATH_FORBIDDEN", "Experiment Store must not contain symbolic links");
    }
    if (!entry.isDirectory()) continue;
    const experiment = await read(root, { kind: EXPERIMENT_KIND, id: entry.name });
    if (experiment.lifecycle === "active") experiments.push(experiment);
  }
  return experiments.map(clone);
}

async function recordAttempt(root, request, options, clock) {
  assertPlainObject(request, "Experiment attempt request");
  assertExactKeys(request, ["experiment_id", "attempt"], "Experiment attempt request");
  assertGenericAttemptHasNoRunAuthority(request.attempt);
  if (Object.hasOwn(request.attempt || {}, "rerun_of_attempt_id")) {
    throw experimentError(
      "ERR_EXPERIMENT_RERUN_PARENT_REQUIRED",
      "Rerun attempts must use rerun and provide rerun_of_attempt_id explicitly",
    );
  }
  return appendAttempt(root, request.experiment_id, request.attempt, null, options, clock);
}

async function rerun(root, request, options, clock) {
  assertPlainObject(request, "Experiment rerun request");
  assertExactKeys(request, ["experiment_id", "rerun_of_attempt_id", "attempt"], "Experiment rerun request");
  assertGenericAttemptHasNoRunAuthority(request.attempt);
  const parentId = normalizeSafeIdentifier(request.rerun_of_attempt_id, "rerun_of_attempt_id");
  return appendAttempt(root, request.experiment_id, request.attempt, parentId, options, clock);
}

async function recordRun(root, request, options, clock) {
  assertPlainObject(request, "Experiment run recording request");
  assertNoRawSecrets(request, "Experiment run recording request");
  assertExactKeys(
    request,
    ["experiment_id", "run_spec", "outcome", "rerun_of_attempt_id"],
    "Experiment run recording request",
  );
  const experimentId = normalizeSafeIdentifier(request.experiment_id, "Experiment run recording request.experiment_id");
  const current = await read(root, { kind: EXPERIMENT_KIND, id: experimentId });
  if (current.lifecycle !== "active") {
    throw experimentError("ERR_EXPERIMENT_STATE_INVALID", "Runs can only be recorded for an active Experiment");
  }
  const runSpec = normalizeCompiledExperimentRunSpec(request.run_spec);
  if (runSpec.experiment_id !== experimentId) {
    throw experimentError("ERR_EXPERIMENT_RUN_IDENTITY_INVALID", "Run specification belongs to another Experiment");
  }
  if (current.project_ref?.id && current.project_ref.id !== runSpec.project_id) {
    throw experimentError("ERR_EXPERIMENT_RUN_IDENTITY_INVALID", "Run specification belongs to another project");
  }
  const aliasedRun = current.attempts.find((attempt) => (
    attempt.run_id === runSpec.run_id && attempt.identity_hash !== runSpec.identity_hash
  ));
  if (aliasedRun) {
    throw experimentError(
      "ERR_EXPERIMENT_RUN_ID_COLLISION",
      "A readable run_id cannot identify two different run identities in one Experiment",
    );
  }
  const matching = current.attempts.filter((attempt) => attempt.identity_hash === runSpec.identity_hash);
  let parentId = null;
  let parent = null;
  if (Object.hasOwn(request, "rerun_of_attempt_id")) {
    parentId = normalizeSafeIdentifier(
      request.rerun_of_attempt_id,
      "Experiment run recording request.rerun_of_attempt_id",
    );
    parent = current.attempts.find((attempt) => attempt.id === parentId);
    if (!parent || parent.identity_hash !== runSpec.identity_hash) {
      throw experimentError(
        "ERR_EXPERIMENT_RUN_RERUN_PARENT_INVALID",
        "Run rerun parent must be an earlier Attempt with the same identity in this Experiment",
      );
    }
  } else if (matching.length) {
    throw experimentError(
      "ERR_EXPERIMENT_RUN_RERUN_PARENT_REQUIRED",
      "A repeated run identity requires an explicit rerun parent",
    );
  }
  const outcome = normalizeRunOutcome(request.outcome, runSpec, {
    rerun_of_attempt_id: parentId,
  });
  const attempt = {
    id: outcome.attempt_id,
    status: outcome.status,
    started_at: outcome.started_at,
    finished_at: outcome.finished_at,
    baseline_id: outcome.baseline_id,
    run_id: runSpec.run_id,
    identity_hash: runSpec.identity_hash,
    run_spec: runSpec,
    ...(outcome.metrics === undefined ? {} : { metrics: outcome.metrics }),
    output_refs: outcome.output_refs,
    ...(outcome.failure === undefined ? {} : { failure: outcome.failure }),
    ...(outcome.supervision === undefined ? {} : { supervision: outcome.supervision }),
    ...(outcome.scientific_review === undefined ? {} : { scientific_review: outcome.scientific_review }),
  };
  if (attempt.supervision?.events.some(({ state }) => state === "restarted")) {
    assertExperimentSupervisionRerunBinding(
      parentId === null ? attempt : { ...attempt, rerun_of_attempt_id: parentId },
      parent,
    );
  }
  return appendAttempt(root, experimentId, attempt, parentId, options, clock);
}

async function recordSupervisedRun(root, request, options, clock) {
  assertPlainObject(request, "Supervised Experiment run recording request");
  assertPlainObject(request.outcome, "Supervised Experiment run outcome");
  if (request.outcome.supervision === undefined) {
    throw experimentError("ERR_EXPERIMENT_SUPERVISION_INVALID", "A supervised Experiment run requires supervision evidence");
  }
  if (request.outcome.status === "completed" && request.outcome.scientific_review === undefined) {
    throw experimentError("ERR_EXPERIMENT_REVIEW_INVALID", "A supervised completed run requires scientific reasonableness review");
  }
  return recordRun(root, request, options, clock);
}

async function appendAttempt(root, experimentIdInput, attemptInput, rerunOfAttemptId, options, clock) {
  const experimentId = normalizeSafeIdentifier(experimentIdInput, "experiment_id");
  const current = await read(root, { kind: EXPERIMENT_KIND, id: experimentId });
  if (current.lifecycle !== "active") {
    throw experimentError("ERR_EXPERIMENT_STATE_INVALID", "Attempts can only be recorded for an active Experiment");
  }
  const attempt = normalizeAttempt(
    rerunOfAttemptId === null
      ? attemptInput
      : { ...attemptInput, rerun_of_attempt_id: rerunOfAttemptId },
    "Experiment attempt",
    rerunOfAttemptId !== null,
  );
  if (current.attempts.some((entry) => entry.id === attempt.id)) {
    throw experimentError("ERR_EXPERIMENT_ATTEMPT_EXISTS", `Attempt ${attempt.id} already exists`);
  }
  if (rerunOfAttemptId !== null) {
    if (!current.attempts.some((entry) => entry.id === rerunOfAttemptId)) {
      throw experimentError("ERR_EXPERIMENT_RERUN_PARENT_NOT_FOUND", `Rerun parent attempt ${rerunOfAttemptId} was not found`);
    }
  }
  const operation = normalizeTransactionOptions(options, "experiment-attempt", {
    experiment_id: experimentId,
    attempt_id: attempt.id,
  });
  const next = deriveCurrentState({
    ...current,
    attempts: [...current.attempts, attempt],
    updated_at: now(clock),
  });
  await persistExperiments(root, [next], operation, { existing: [current] });
  return clone(next);
}

async function supersede(root, transition, options, clock, receipts) {
  const envelope = normalizeTransitionEnvelope(transition, "experiment.supersede", ["replacement"]);
  const current = await read(root, envelope.object_ref);
  const replacementDefinition = normalizeExperimentDefinition(transition.replacement, "Experiment replacement");
  if (replacementDefinition.id === current.object_ref.id) {
    throw experimentError("ERR_EXPERIMENT_OBJECT_MISMATCH", "Experiment replacement must have a new logical id");
  }
  if (replacementDefinition.supersedes_experiment_id !== current.object_ref.id) {
    throw experimentError("ERR_EXPERIMENT_SUPERSEDES_REQUIRED", "Replacement must explicitly identify the superseded Experiment");
  }
  if (await optionalRead(root, { kind: EXPERIMENT_KIND, id: replacementDefinition.id })) {
    throw experimentError("ERR_EXPERIMENT_OBJECT_EXISTS", `Replacement Experiment ${replacementDefinition.id} already exists`);
  }
  return receiptTransition(root, envelope, current, options, clock, receipts, (experiment) => {
    const timestamp = now(clock);
    const superseded = deriveCurrentState({
      ...experiment,
      lifecycle: "superseded",
      superseded_by_experiment_id: replacementDefinition.id,
      updated_at: timestamp,
    });
    const replacement = buildExperiment(replacementDefinition, timestamp);
    return {
      result: replacement,
      experiments: [superseded, replacement],
    };
  }, replacementDefinition);
}

async function trash(root, transition, options, clock, receipts) {
  const envelope = normalizeTransitionEnvelope(transition, "experiment.trash");
  const current = await read(root, envelope.object_ref);
  return receiptTransition(root, envelope, current, options, clock, receipts, (experiment) => {
    const next = deriveCurrentState({ ...experiment, lifecycle: "trashed", updated_at: now(clock) });
    return { result: next, experiments: [next] };
  });
}

async function restore(root, transition, options, clock, receipts) {
  const envelope = normalizeTransitionEnvelope(transition, "experiment.restore");
  const current = await read(root, envelope.object_ref);
  return receiptTransition(root, envelope, current, options, clock, receipts, (experiment) => {
    const next = deriveCurrentState({ ...experiment, lifecycle: "active", updated_at: now(clock) });
    return { result: next, experiments: [next] };
  });
}

async function changeBaseline(root, transition, options, clock, receipts) {
  const envelope = normalizeTransitionEnvelope(transition, "experiment.baseline.change", ["baseline"]);
  const current = await read(root, envelope.object_ref);
  const baseline = normalizeBaseline(transition.baseline, "Experiment baseline");
  assertBaselineChangeAllowed(current, baseline);
  return receiptTransition(root, envelope, current, options, clock, receipts, (experiment) => {
    const next = deriveCurrentState({
      ...experiment,
      baseline,
      baseline_history: [...experiment.baseline_history, baseline],
      updated_at: now(clock),
    });
    return { result: next, experiments: [next] };
  }, baseline);
}

async function resolveScientificReview(root, transition, options, clock, receipts) {
  const envelope = normalizeTransitionEnvelope(transition, "experiment.review.resolve", ["resolution"]);
  const current = await read(root, envelope.object_ref);
  const target = normalizeScientificReviewResolutionTarget(current, transition.resolution);
  const resolvedAt = now(clock);
  const currentAttempt = current.attempts.find(({ id }) => id === target.attempt_id);
  const resolvedAttempt = applyScientificReviewResolution(currentAttempt, target, envelope.actor, resolvedAt);
  return receiptTransition(root, envelope, current, options, clock, receipts, (experiment) => {
    const attempts = experiment.attempts.map((attempt) => (
      attempt.id === target.attempt_id
        ? resolvedAttempt
        : attempt
    ));
    const next = deriveCurrentState({ ...experiment, attempts, updated_at: resolvedAt });
    return { result: next, experiments: [next] };
  }, target);
}

async function recoverTransition(root, transition, options, receipts) {
  const envelope = normalizeRecoveryTransition(transition);
  const operation = normalizeTransactionOptions(options, "experiment-recovery", {
    object_ref: envelope.object_ref,
    intent: envelope.intent,
    receipt_id: envelope.receipt_id,
  });
  const initialReceipt = await readReceipt(root, envelope.receipt_id);
  assertRecoveryReceiptBinding(envelope, initialReceipt);

  await recoverTransitionTransactions(root, operation.id);

  const current = await read(root, envelope.object_ref);
  const authorityActivated = await transitionAuthorityActivated(root, envelope, current);
  await reconcileTransitionReceipt(root, envelope, authorityActivated, operation, receipts);
  const finalReceipt = await readReceipt(root, envelope.receipt_id);
  return {
    id: operation.id,
    action: authorityActivated ? "finalized" : "compensated",
    object_ref: clone(envelope.object_ref),
    lifecycle: current.lifecycle,
    receipt_id: finalReceipt.receipt_id,
    receipt_state: finalReceipt.state,
  };
}

async function reconcileTransitionReceipt(root, envelope, authorityActivated, operation, receipts) {
  const receipt = await readReceipt(root, envelope.receipt_id);
  if (authorityActivated) {
    if (receipt.state === "reserved") {
      await receipts.consumeReceipt(root, envelope.receipt_id, transitionContext(envelope), {
        id: `${operation.id}-recovery-consume`,
        faultInjector: operation.faultInjector,
        tool_use_id: envelope.tool_use_id,
      });
    } else if (receipt.state === "issued") {
      await receipts.invalidateReceipt(root, envelope.receipt_id, {
        reason: RECOVERY_ACTIVATED_RECEIPT_REASON,
      }, {
        id: `${operation.id}-recovery-receipt`,
        faultInjector: operation.faultInjector,
      });
    }
    return;
  }

  if (receipt.state === "issued" || receipt.state === "reserved") {
    await receipts.invalidateReceipt(root, envelope.receipt_id, {
      reason: RECOVERY_NOT_ACTIVATED_REASON,
    }, {
      id: `${operation.id}-recovery-receipt`,
      faultInjector: operation.faultInjector,
    });
  }
}

async function transitionAuthorityActivated(root, envelope, current) {
  const definition = RECEIPT_TRANSITIONS[envelope.intent];
  if (!definition || !definition.lifecycles.includes(envelope.scope.expected_lifecycle)) {
    throw experimentError(
      "ERR_EXPERIMENT_RECOVERY_CONFLICT",
      "Recovery Receipt scope does not identify a supported source lifecycle",
    );
  }

  if (definition.action === "trash") {
    if (current.lifecycle === "trashed") return true;
    if (current.lifecycle === "active") return false;
  } else if (definition.action === "restore") {
    if (current.lifecycle === "active") return true;
    if (current.lifecycle === "trashed") return false;
  } else if (definition.action === "baseline_change") {
    if (current.lifecycle !== "active") {
      throw experimentError("ERR_EXPERIMENT_RECOVERY_CONFLICT", "Baseline recovery found a non-active Experiment authority");
    }
    if (current.baseline.id === envelope.target.id) {
      if (canonicalHash(current.baseline) !== canonicalHash(envelope.target)) {
        throw experimentError("ERR_EXPERIMENT_RECOVERY_CONFLICT", "Baseline authority does not match the Receipt target");
      }
      return true;
    }
    return false;
  } else if (definition.action === "supersede") {
    const replacement = await optionalRead(root, { kind: EXPERIMENT_KIND, id: envelope.target.id });
    const linked = current.lifecycle === "superseded"
      && current.superseded_by_experiment_id === envelope.target.id;
    if (linked) {
      if (!replacement || !sameExperimentDefinition(replacement, envelope.target)) {
        throw experimentError("ERR_EXPERIMENT_RECOVERY_CONFLICT", "Supersede authority does not match the Receipt target");
      }
      return true;
    }
    if (current.lifecycle === "active" && !replacement) return false;
  } else if (definition.action === "review_resolution") {
    if (current.lifecycle !== "active") {
      throw experimentError("ERR_EXPERIMENT_RECOVERY_CONFLICT", "Scientific review recovery found a non-active Experiment");
    }
    const attempt = current.attempts.find(({ id }) => id === envelope.target.attempt_id);
    if (!attempt?.scientific_review) {
      throw experimentError("ERR_EXPERIMENT_RECOVERY_CONFLICT", "Scientific review recovery cannot find its Attempt");
    }
    if (
      attempt.scientific_review.review_id !== envelope.target.review_id
      || attempt.scientific_review.review_hash !== envelope.target.review_hash
    ) {
      throw experimentError("ERR_EXPERIMENT_RECOVERY_CONFLICT", "Scientific review authority does not match the Receipt target");
    }
    const expectedStatus = {
      confirm: "confirmed",
      dismiss: "dismissed",
      investigate: "investigation_required",
    }[envelope.target.decision];
    if (attempt.scientific_review.status === expectedStatus) {
      if (
        attempt.scientific_review.resolution?.decision !== envelope.target.decision
        || attempt.scientific_review.resolution?.rationale !== envelope.target.rationale
        || canonicalHash(attempt.scientific_review.resolution?.actor) !== canonicalHash(envelope.actor)
      ) {
        throw experimentError("ERR_EXPERIMENT_RECOVERY_CONFLICT", "Scientific review resolution does not match the Receipt target");
      }
      return true;
    }
    if (attempt.scientific_review.status === "pending_confirmation") return false;
  }

  throw experimentError(
    "ERR_EXPERIMENT_RECOVERY_CONFLICT",
    "Experiment authority is neither the original nor the requested transition outcome",
  );
}

async function recoverTransitionTransactions(root, operationId) {
  for (const stage of RECOVERY_TRANSACTION_STAGES) {
    await recoverWorkspaceTransaction(root, { id: `${operationId}-${stage}` });
  }
}

async function receiptTransition(root, envelope, current, options, clock, receipts, mutate, target) {
  const operation = normalizeTransactionOptions(options, `experiment-${envelope.intent}`, {
    object_ref: current.object_ref,
    intent: envelope.intent,
  });
  const suppliedContext = transitionContext(envelope);
  await receipts.reserveReceipt(root, envelope.receipt_id, suppliedContext, {
    id: `${operation.id}-reserve`,
    faultInjector: operation.faultInjector,
    tool_use_id: envelope.tool_use_id,
  });
  let expected;
  try {
    const authoritative = await read(root, current.object_ref);
    const contextInput = { actor: envelope.actor, intent: envelope.intent };
    if (target !== undefined) contextInput.target = target;
    expected = buildExperimentReceiptContext(authoritative, contextInput);
    assertEnvelopeMatches(envelope, expected, envelope.intent);
    const prepared = mutate(authoritative);
    const missing = prepared.experiments
      .map(({ object_ref }) => object_ref)
      .filter((objectRef) => (
        objectRef.kind !== authoritative.object_ref.kind || objectRef.id !== authoritative.object_ref.id
      ));
    await persistExperiments(root, prepared.experiments, {
      id: `${operation.id}-authority`,
      faultInjector: operation.faultInjector,
    }, { existing: [authoritative], missing });
    await receipts.consumeReceipt(root, envelope.receipt_id, expected, {
      id: `${operation.id}-consume`,
      faultInjector: operation.faultInjector,
      tool_use_id: envelope.tool_use_id,
    });
    return clone(prepared.result);
  } catch (error) {
    if (error?.code === "ERR_RECEIPT_CONTEXT_DRIFT" && await receiptIsReserved(root, envelope.receipt_id)) {
      await receipts.invalidateReceipt(root, envelope.receipt_id, { reason: "authorization_context_drift" }, {
        id: `${operation.id}-invalidate`,
        faultInjector: operation.faultInjector,
      });
    }
    throw error;
  }
}

async function receiptIsReserved(root, receiptId) {
  try {
    return (await readReceipt(root, receiptId)).state === "reserved";
  } catch {
    return false;
  }
}

async function persistExperiments(root, experiments, options, expectations = {}) {
  const compiled = experiments.map((experiment) => compileRuntimeObjectDocuments(toRuntimeDocuments(experiment)));
  const expectedHashes = new Map();
  for (const experiment of expectations.existing ?? []) {
    const documents = compileRuntimeObjectDocuments(toRuntimeDocuments(experiment));
    expectedHashes.set(documents.runtime_path, sha256(renderYaml(documents.runtime)));
    expectedHashes.set(documents.continuation_path, sha256(renderYaml(documents.continuation)));
  }
  for (const objectRef of expectations.missing ?? []) {
    const normalizedRef = normalizeAuthorityObjectRef(objectRef);
    if (normalizedRef.kind !== EXPERIMENT_KIND) {
      throw experimentError("ERR_EXPERIMENT_OBJECT_MISMATCH", "Experiment persistence precondition must reference an Experiment");
    }
    expectedHashes.set(`${normalizedRef.directory}/runtime.yaml`, null);
    expectedHashes.set(`${normalizedRef.directory}/continuation.yaml`, null);
  }
  const manifest = await readCurrentManifest(root);
  const writes = compiled.flatMap((documents) => [
    {
      path: documents.runtime_path,
      content: renderYaml(documents.runtime),
      ...(expectedHashes.has(documents.runtime_path) ? { expected_hash: expectedHashes.get(documents.runtime_path) } : {}),
    },
    {
      path: documents.continuation_path,
      content: renderYaml(documents.continuation),
      ...(expectedHashes.has(documents.continuation_path) ? { expected_hash: expectedHashes.get(documents.continuation_path) } : {}),
    },
  ]);
  await commitWorkspaceTransaction(root, {
    id: options.id,
    faultInjector: options.faultInjector,
    manifest,
    writes,
  });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function buildExperiment(definition, timestamp) {
  return deriveCurrentState({
    schema_version: AUTHORITY_SCHEMA_VERSION,
    object_ref: { kind: EXPERIMENT_KIND, id: definition.id },
    ...definition,
    lifecycle: "active",
    status: "pending",
    attempts: [],
    baseline_history: [clone(definition.baseline)],
    created_at: timestamp,
    updated_at: timestamp,
  });
}

function normalizeExperimentDefinition(input, field) {
  assertPlainObject(input, field);
  assertNoRawSecrets(input, field);
  const normalized = normalizeCanonicalValue(input, field);
  for (const key of AUTHORITY_FIELDS) {
    if (Object.hasOwn(normalized, key)) {
      throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", `${field}.${key} is owned by the Experiment store`);
    }
  }
  const id = normalizeSafeIdentifier(normalized.id, `${field}.id`);
  const baseline = normalizeBaseline(normalized.baseline, `${field}.baseline`);
  if (Object.hasOwn(normalized, "supersedes_experiment_id")) {
    normalized.supersedes_experiment_id = normalizeSafeIdentifier(
      normalized.supersedes_experiment_id,
      `${field}.supersedes_experiment_id`,
    );
  }
  return { ...normalized, id, baseline };
}

function sameExperimentDefinition(experiment, definition) {
  const persistedDefinition = Object.fromEntries(
    Object.entries(experiment).filter(([key]) => !AUTHORITY_FIELDS.has(key)),
  );
  return canonicalHash(normalizeExperimentDefinition(
    persistedDefinition,
    "Experiment recovery replacement",
  )) === canonicalHash(definition);
}

function normalizeExperimentView(input) {
  assertPlainObject(input, "Experiment view");
  const normalized = normalizeCanonicalValue(input, "Experiment view");
  const objectRef = storedObjectRef(normalizeAuthorityObjectRef(normalized.object_ref));
  if (objectRef.kind !== EXPERIMENT_KIND) {
    throw experimentError("ERR_EXPERIMENT_OBJECT_MISMATCH", "Experiment view must reference kind experiment");
  }
  if (normalized.schema_version !== AUTHORITY_SCHEMA_VERSION) {
    throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", "Experiment schema_version is invalid");
  }
  normalizeTimestamp(normalized.created_at, "Experiment created_at");
  normalizeTimestamp(normalized.updated_at, "Experiment updated_at");
  if (!EXPERIMENT_LIFECYCLES.has(normalized.lifecycle)) {
    throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", "Experiment lifecycle is invalid");
  }
  if (typeof normalized.status !== "string" || !normalized.status.trim()) {
    throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", "Experiment status is required");
  }
  if (!Array.isArray(normalized.attempts)) {
    throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", "Experiment attempts must be an array");
  }
  const attempts = normalized.attempts.map((attempt, index) => normalizeAttempt(attempt, `Experiment attempts[${index}]`, true));
  const attemptIds = new Set();
  const attemptsById = new Map();
  const identities = new Set();
  const runIds = new Map();
  for (const [index, attempt] of attempts.entries()) {
    if (attemptIds.has(attempt.id)) {
      throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", `Experiment attempts contains duplicate id ${attempt.id}`);
    }
    if (Object.hasOwn(attempt, "rerun_of_attempt_id")) {
      if (attempt.rerun_of_attempt_id === attempt.id) {
        throw experimentError(
          "ERR_EXPERIMENT_SCHEMA_INVALID",
          `Experiment attempts[${index}].rerun_of_attempt_id must not reference itself`,
        );
      }
      if (!attemptIds.has(attempt.rerun_of_attempt_id)) {
        throw experimentError(
          "ERR_EXPERIMENT_SCHEMA_INVALID",
          `Experiment attempts[${index}].rerun_of_attempt_id must reference an earlier attempt`,
        );
      }
    }
    if (Object.hasOwn(attempt, "identity_hash")) {
      if (attempt.run_spec.experiment_id !== objectRef.id) {
        throw experimentError(
          "ERR_EXPERIMENT_SCHEMA_INVALID",
          `Experiment attempts[${index}] run_spec belongs to another Experiment`,
        );
      }
      if (normalized.project_ref?.id && attempt.run_spec.project_id !== normalized.project_ref.id) {
        throw experimentError(
          "ERR_EXPERIMENT_SCHEMA_INVALID",
          `Experiment attempts[${index}] run_spec belongs to another project`,
        );
      }
      if (
        !Object.hasOwn(attempt, "rerun_of_attempt_id")
        && attempt.supervision?.events.some(({ state }) => state === "restarted")
      ) {
        assertExperimentSupervisionRerunBinding(attempt, null);
      }
      if (Object.hasOwn(attempt, "rerun_of_attempt_id")) {
        const parent = attemptsById.get(attempt.rerun_of_attempt_id);
        if (!parent || parent.identity_hash !== attempt.identity_hash) {
          throw experimentError(
            "ERR_EXPERIMENT_SCHEMA_INVALID",
            `Experiment attempts[${index}] run rerun parent must have the same identity_hash`,
          );
        }
        assertExperimentSupervisionRerunBinding(attempt, parent);
      } else if (identities.has(attempt.identity_hash)) {
        throw experimentError(
          "ERR_EXPERIMENT_SCHEMA_INVALID",
          `Experiment attempts[${index}] repeats a run identity without an explicit rerun parent`,
        );
      }
      const priorIdentity = runIds.get(attempt.run_id);
      if (priorIdentity !== undefined && priorIdentity !== attempt.identity_hash) {
        throw experimentError(
          "ERR_EXPERIMENT_SCHEMA_INVALID",
          `Experiment attempts[${index}] reuses run_id for a different identity`,
        );
      }
      runIds.set(attempt.run_id, attempt.identity_hash);
      identities.add(attempt.identity_hash);
    }
    attemptIds.add(attempt.id);
    attemptsById.set(attempt.id, attempt);
  }
  const baseline = normalizeBaseline(normalized.baseline, "Experiment baseline");
  if (!Array.isArray(normalized.baseline_history) || normalized.baseline_history.length === 0) {
    throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", "Experiment baseline_history must be non-empty");
  }
  const baselineHistory = normalized.baseline_history.map((entry, index) => normalizeBaseline(entry, `Experiment baseline_history[${index}]`));
  const baselineIds = new Set();
  for (const historicalBaseline of baselineHistory) {
    if (baselineIds.has(historicalBaseline.id)) {
      throw experimentError(
        "ERR_EXPERIMENT_SCHEMA_INVALID",
        `Experiment baseline_history contains duplicate id ${historicalBaseline.id}`,
      );
    }
    baselineIds.add(historicalBaseline.id);
  }
  if (!baselineIds.has(baseline.id)) {
    throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", "Experiment baseline must resolve in baseline_history");
  }
  for (const [index, attempt] of attempts.entries()) {
    if (!baselineIds.has(attempt.baseline_id)) {
      throw experimentError(
        "ERR_EXPERIMENT_SCHEMA_INVALID",
        `Experiment attempts[${index}].baseline_id must resolve in baseline_history`,
      );
    }
  }
  const result = {
    ...normalized,
    object_ref: objectRef,
    attempts,
    baseline,
    baseline_history: baselineHistory,
  };
  if (Object.hasOwn(result, "current_attempt_id")) {
    result.current_attempt_id = normalizeSafeIdentifier(result.current_attempt_id, "Experiment current_attempt_id");
  }
  if (Object.hasOwn(result, "superseded_by_experiment_id")) {
    result.superseded_by_experiment_id = normalizeSafeIdentifier(
      result.superseded_by_experiment_id,
      "Experiment superseded_by_experiment_id",
    );
  }
  return deriveCurrentState(result);
}

function normalizeAttempt(input, field, allowRerun = false) {
  assertPlainObject(input, field);
  assertNoRawSecrets(input, field);
  const normalized = normalizeCanonicalValue(input, field);
  const id = normalizeSafeIdentifier(normalized.id, `${field}.id`);
  if (typeof normalized.status !== "string" || !normalized.status.trim()) {
    throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", `${field}.status is required`);
  }
  normalized.status = normalizeSafeIdentifier(normalized.status, `${field}.status`);
  normalized.baseline_id = normalizeSafeIdentifier(normalized.baseline_id, `${field}.baseline_id`);
  if (Object.hasOwn(normalized, "rerun_of_attempt_id")) {
    if (!allowRerun) {
      throw experimentError("ERR_EXPERIMENT_RERUN_PARENT_REQUIRED", "Rerun attempts must use rerun and provide a parent attempt");
    }
    normalized.rerun_of_attempt_id = normalizeSafeIdentifier(
      normalized.rerun_of_attempt_id,
      `${field}.rerun_of_attempt_id`,
    );
  }
  for (const key of ["started_at", "finished_at"]) {
    if (!Object.hasOwn(normalized, key)) {
      throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", `${field}.${key} is required`);
    }
    normalized[key] = normalizeTimestamp(normalized[key], `${field}.${key}`);
  }
  if (Date.parse(normalized.finished_at) < Date.parse(normalized.started_at)) {
    throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", `${field}.finished_at must not precede started_at`);
  }
  const runFields = ["run_spec", "run_id", "identity_hash"].filter((key) => Object.hasOwn(normalized, key));
  const supervisedFields = ["supervision", "scientific_review"].filter((key) => Object.hasOwn(normalized, key));
  if (supervisedFields.length && runFields.length === 0) {
    throw experimentError("ERR_EXPERIMENT_RUN_STORE_REQUIRED", `${field} supervision and scientific review require complete run authority`);
  }
  if (runFields.length) {
    if (runFields.length !== 3) {
      throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", `${field} must contain complete run identity fields`);
    }
    const runSpec = normalizeCompiledExperimentRunSpec(normalized.run_spec, `${field}.run_spec`);
    const runId = normalizeSafeIdentifier(normalized.run_id, `${field}.run_id`);
    const identityHash = normalizeSha256(normalized.identity_hash, `${field}.identity_hash`);
    if (runId !== runSpec.run_id || identityHash !== runSpec.identity_hash) {
      throw experimentError("ERR_EXPERIMENT_RUN_IDENTITY_INVALID", `${field} run identity does not match run_spec`);
    }
    normalized.run_spec = runSpec;
    normalized.run_id = runId;
    normalized.identity_hash = identityHash;
    const outcome = normalizeRunOutcome({
      attempt_id: id,
      status: normalized.status,
      started_at: normalized.started_at,
      finished_at: normalized.finished_at,
      baseline_id: normalized.baseline_id,
      ...(normalized.metrics === undefined ? {} : { metrics: normalized.metrics }),
      output_refs: normalized.output_refs,
      ...(normalized.failure === undefined ? {} : { failure: normalized.failure }),
      ...(normalized.supervision === undefined ? {} : { supervision: normalized.supervision }),
      ...(normalized.scientific_review === undefined ? {} : { scientific_review: normalized.scientific_review }),
    }, runSpec, {
      allow_scientific_review_resolution: true,
      rerun_of_attempt_id: normalized.rerun_of_attempt_id ?? null,
    });
    normalized.metrics = outcome.metrics;
    if (outcome.metrics === undefined) delete normalized.metrics;
    normalized.output_refs = outcome.output_refs;
    if (outcome.failure === undefined) delete normalized.failure;
    else normalized.failure = outcome.failure;
    if (outcome.supervision === undefined) delete normalized.supervision;
    else normalized.supervision = outcome.supervision;
    if (outcome.scientific_review === undefined) delete normalized.scientific_review;
    else normalized.scientific_review = outcome.scientific_review;
  }
  return { ...normalized, id };
}

function normalizeRunOutcome(input, runSpec, options = {}) {
  assertPlainObject(input, "Experiment run outcome");
  assertNoRawSecrets(input, "Experiment run outcome");
  assertExactKeys(input, [
    "attempt_id",
    "status",
    "started_at",
    "finished_at",
    "baseline_id",
    "metrics",
    "output_refs",
    "failure",
    "supervision",
    "scientific_review",
  ], "Experiment run outcome");
  const status = normalizeSafeIdentifier(input.status, "Experiment run outcome.status");
  if (!new Set(["completed", "failed", "interrupted"]).has(status)) {
    throw experimentError("ERR_EXPERIMENT_RUN_FAILURE_INVALID", "Experiment run outcome status must be completed, failed, or interrupted");
  }
  if (!Array.isArray(input.output_refs) || input.output_refs.length === 0) {
    throw experimentError("ERR_EXPERIMENT_RUN_OUTPUT_INVALID", "Experiment run outcome.output_refs must be non-empty");
  }
  const outputRefs = input.output_refs.map((value, index) => {
    const path = normalizeExperimentArtifactPath(value, `Experiment run outcome.output_refs[${index}]`);
    if (!path.startsWith(`${runSpec.output.directory}/`)) {
      throw experimentError("ERR_EXPERIMENT_RUN_OUTPUT_INVALID", "Experiment run output evidence must stay inside its run directory");
    }
    return path;
  });
  if (new Set(outputRefs).size !== outputRefs.length) {
    throw experimentError("ERR_EXPERIMENT_RUN_OUTPUT_INVALID", "Experiment run outcome.output_refs contains duplicates");
  }
  if (input.metrics !== undefined) {
    assertPlainObject(input.metrics, "Experiment run outcome.metrics");
  }
  const normalized = {
    attempt_id: normalizeSafeIdentifier(input.attempt_id, "Experiment run outcome.attempt_id"),
    status,
    started_at: normalizeTimestamp(input.started_at, "Experiment run outcome.started_at"),
    finished_at: normalizeTimestamp(input.finished_at, "Experiment run outcome.finished_at"),
    baseline_id: normalizeSafeIdentifier(input.baseline_id, "Experiment run outcome.baseline_id"),
    ...(input.metrics === undefined ? {} : {
      metrics: normalizeCanonicalValue(input.metrics, "Experiment run outcome.metrics"),
    }),
    output_refs: outputRefs,
  };
  if (input.failure !== undefined) {
    normalized.failure = normalizeResourceFailure(input.failure, runSpec, outputRefs);
  }
  if (status === "failed" && normalized.failure === undefined) {
    throw experimentError("ERR_EXPERIMENT_RUN_FAILURE_INVALID", "A failed Experiment run requires structured failure evidence");
  }
  if (status !== "failed" && normalized.failure !== undefined) {
    throw experimentError("ERR_EXPERIMENT_RUN_FAILURE_INVALID", "Only a failed Experiment run may contain failure evidence");
  }
  if (status === "completed") {
    const required = [runSpec.output.log_path, runSpec.output.config_path, runSpec.output.metrics_path];
    if (required.some((path) => !outputRefs.includes(path))) {
      throw experimentError(
        "ERR_EXPERIMENT_RUN_OUTPUT_INVALID",
        "A completed Experiment run must retain its declared log, config, and metrics outputs",
      );
    }
  }
  if (input.supervision !== undefined) {
    normalized.supervision = normalizeExperimentSupervisionEvidence(input.supervision, {
      run_spec: runSpec,
      attempt_id: normalized.attempt_id,
      status,
      started_at: normalized.started_at,
      finished_at: normalized.finished_at,
      output_refs: normalized.output_refs,
      rerun_of_attempt_id: options.rerun_of_attempt_id ?? null,
    });
  }
  if (status === "interrupted" && normalized.supervision === undefined) {
    throw experimentError("ERR_EXPERIMENT_SUPERVISION_INVALID", "An interrupted Experiment run requires supervision evidence");
  }
  if (input.scientific_review !== undefined) {
    if (status !== "completed") {
      throw experimentError("ERR_EXPERIMENT_REVIEW_INVALID", "Only an operationally completed run may have scientific review evidence");
    }
    normalized.scientific_review = normalizeExperimentScientificReview(input.scientific_review, runSpec, {
      attempt_id: normalized.attempt_id,
      metrics: normalized.metrics,
      finished_at: normalized.finished_at,
      output_refs: normalized.output_refs,
      allow_resolution: options.allow_scientific_review_resolution === true,
    });
  }
  if (status === "completed" && normalized.supervision !== undefined && normalized.scientific_review === undefined) {
    throw experimentError("ERR_EXPERIMENT_REVIEW_INVALID", "A supervised completed run requires scientific reasonableness review");
  }
  return normalized;
}

function normalizeResourceFailure(input, runSpec, outputRefs) {
  assertPlainObject(input, "Experiment run failure");
  assertExactKeys(input, [
    "reason_code",
    "resource",
    "limit_bytes",
    "observed_peak_bytes",
    "evidence_ref",
  ], "Experiment run failure");
  if (input.reason_code !== "resource_exhausted" || input.resource !== "host_memory") {
    throw experimentError(
      "ERR_EXPERIMENT_RUN_FAILURE_INVALID",
      "M3 resource failure must identify resource_exhausted host_memory",
    );
  }
  if (!Number.isSafeInteger(input.limit_bytes) || input.limit_bytes <= 0) {
    throw experimentError("ERR_EXPERIMENT_RUN_FAILURE_INVALID", "Experiment run failure limit_bytes is invalid");
  }
  if (input.limit_bytes !== runSpec.resource_limits.host_memory_bytes) {
    throw experimentError("ERR_EXPERIMENT_RUN_FAILURE_INVALID", "Experiment run failure limit does not match run_spec");
  }
  if (!Number.isSafeInteger(input.observed_peak_bytes) || input.observed_peak_bytes <= input.limit_bytes) {
    throw experimentError("ERR_EXPERIMENT_RUN_FAILURE_INVALID", "Experiment run failure observed peak must exceed its limit");
  }
  const evidenceRef = normalizeExperimentArtifactPath(input.evidence_ref, "Experiment run failure.evidence_ref");
  if (!outputRefs.includes(evidenceRef)) {
    throw experimentError("ERR_EXPERIMENT_RUN_FAILURE_INVALID", "Experiment run failure evidence_ref must be an output_ref");
  }
  return {
    reason_code: "resource_exhausted",
    resource: "host_memory",
    limit_bytes: input.limit_bytes,
    observed_peak_bytes: input.observed_peak_bytes,
    evidence_ref: evidenceRef,
  };
}

function normalizeExperimentArtifactPath(value, field) {
  let path;
  try {
    path = normalizeWorkspacePath(value);
  } catch {
    throw experimentError("ERR_EXPERIMENT_RUN_OUTPUT_INVALID", `${field} must be a safe relative path`);
  }
  if (path === ".pipeline" || path.startsWith(".pipeline/") || path === ".git" || path.startsWith(".git/")) {
    throw experimentError("ERR_EXPERIMENT_RUN_OUTPUT_INVALID", `${field} targets private authority storage`);
  }
  return path;
}

function assertGenericAttemptHasNoRunAuthority(input) {
  if (
    input
    && typeof input === "object"
    && ["run_spec", "run_id", "identity_hash", "supervision", "scientific_review"].some((key) => Object.hasOwn(input, key))
  ) {
    throw experimentError("ERR_EXPERIMENT_RUN_STORE_REQUIRED", "Run attempts must use recordRun");
  }
}

function normalizeBaseline(input, field) {
  assertPlainObject(input, field);
  assertNoRawSecrets(input, field);
  const normalized = normalizeCanonicalValue(input, field);
  normalized.id = normalizeSafeIdentifier(normalized.id, `${field}.id`);
  return normalized;
}

function normalizeExperimentReceiptTarget(experiment, action, input) {
  if (action === "supersede") {
    const replacement = normalizeExperimentDefinition(input, "Experiment Receipt target");
    if (replacement.id === experiment.object_ref.id) {
      throw experimentError("ERR_EXPERIMENT_OBJECT_MISMATCH", "Experiment replacement must have a new logical id");
    }
    if (replacement.supersedes_experiment_id !== experiment.object_ref.id) {
      throw experimentError("ERR_EXPERIMENT_SUPERSEDES_REQUIRED", "Replacement must explicitly identify the superseded Experiment");
    }
    return replacement;
  }
  if (action === "review_resolution") {
    return normalizeScientificReviewResolutionTarget(experiment, input);
  }
  const baseline = normalizeBaseline(input, "Experiment Receipt target");
  assertBaselineChangeAllowed(experiment, baseline);
  return baseline;
}

function assertBaselineChangeAllowed(experiment, baseline) {
  if (baseline.id === experiment.baseline.id) {
    throw experimentError("ERR_EXPERIMENT_BASELINE_UNCHANGED", "Baseline change must use a new baseline id");
  }
  if (experiment.baseline_history.some((entry) => entry.id === baseline.id)) {
    throw experimentError(
      "ERR_EXPERIMENT_BASELINE_EXISTS",
      `Baseline ${baseline.id} already exists in baseline_history`,
    );
  }
}

function deriveCurrentState(experimentInput) {
  const experiment = clone(experimentInput);
  const current = selectCurrentAttempt(experiment.attempts || []);
  if (!current) {
    delete experiment.current_attempt_id;
    experiment.status = "pending";
  } else {
    experiment.current_attempt_id = current.id;
    experiment.status = current.status;
  }
  return experiment;
}

function selectCurrentAttempt(attempts) {
  let selected = null;
  let selectedIndex = -1;
  for (const [index, attempt] of attempts.entries()) {
    if (!selected) {
      selected = attempt;
      selectedIndex = index;
      continue;
    }
    const selectedTime = attemptTime(selected);
    const candidateTime = attemptTime(attempt);
    if (candidateTime > selectedTime || (candidateTime === selectedTime && index > selectedIndex)) {
      selected = attempt;
      selectedIndex = index;
    }
  }
  return selected;
}

function attemptTime(attempt) {
  const value = attempt.finished_at || attempt.started_at;
  return value ? Date.parse(value) : Number.NEGATIVE_INFINITY;
}

function normalizeTransitionEnvelope(input, intent, extraKeys = []) {
  assertPlainObject(input, "Experiment Receipt transition");
  const envelope = { ...input };
  for (const key of extraKeys) delete envelope[key];
  assertExactKeys(
    envelope,
    ["receipt_id", "actor", "intent", "object_ref", "scope", "plan_hash", "tool_use_id"],
    "Experiment Receipt transition",
  );
  const normalized = {
    receipt_id: normalizeSafeIdentifier(envelope.receipt_id, "Experiment Receipt transition.receipt_id"),
    actor: normalizeActor(envelope.actor),
    intent: envelope.intent,
    object_ref: normalizeExperimentObjectRef(envelope.object_ref),
    scope: normalizeCanonicalValue(envelope.scope, "Experiment Receipt transition.scope"),
    plan_hash: normalizeSha256(envelope.plan_hash, "Experiment Receipt transition.plan_hash"),
    tool_use_id: normalizeSafeIdentifier(envelope.tool_use_id, "Experiment Receipt transition.tool_use_id"),
  };
  if (normalized.intent !== intent) {
    throw experimentError("ERR_EXPERIMENT_RECEIPT_INTENT", `Expected Receipt intent ${intent}`);
  }
  return normalized;
}

function normalizeRecoveryTransition(input) {
  assertPlainObject(input, "Experiment recovery transition");
  assertNoRawSecrets(input, "Experiment recovery transition");
  const definition = RECEIPT_TRANSITIONS[input.intent];
  if (!definition) {
    throw experimentError("ERR_EXPERIMENT_RECEIPT_INTENT", `Unsupported Experiment Receipt intent ${input.intent || "unknown"}`);
  }
  const targetKey = definition.action === "supersede"
    ? "replacement"
    : definition.action === "baseline_change"
      ? "baseline"
      : definition.action === "review_resolution" ? "resolution" : null;
  const envelope = normalizeTransitionEnvelope(input, input.intent, targetKey ? [targetKey] : []);
  const target = targetKey === "replacement"
    ? normalizeExperimentDefinition(input.replacement, "Experiment recovery replacement")
    : targetKey === "baseline"
      ? normalizeBaseline(input.baseline, "Experiment recovery baseline")
      : targetKey === "resolution" ? normalizeScientificReviewResolutionTarget(undefined, input.resolution) : undefined;
  assertRecoveryScopeBinding(envelope, definition, target);
  return target === undefined ? envelope : { ...envelope, target };
}

function assertRecoveryScopeBinding(envelope, definition, target) {
  if (
    !envelope.scope
    || envelope.scope.action !== definition.action
    || !definition.lifecycles.includes(envelope.scope.expected_lifecycle)
  ) {
    throw experimentError("ERR_EXPERIMENT_RECOVERY_CONFLICT", "Recovery Receipt scope is not bound to the Experiment transition");
  }
  const hasTargetHash = Object.hasOwn(envelope.scope, "target_hash");
  if (target === undefined) {
    if (hasTargetHash) {
      throw experimentError("ERR_EXPERIMENT_RECOVERY_CONFLICT", "Recovery Receipt unexpectedly contains a transition target");
    }
    return;
  }
  if (!hasTargetHash || envelope.scope.target_hash !== canonicalHash(target)) {
    throw experimentError("ERR_EXPERIMENT_RECEIPT_CONTEXT_DRIFT", "Recovery transition target does not match its Receipt scope");
  }
  if (
    definition.action === "supersede"
    && (target.id === envelope.object_ref.id || target.supersedes_experiment_id !== envelope.object_ref.id)
  ) {
    throw experimentError("ERR_EXPERIMENT_OBJECT_MISMATCH", "Recovery replacement is not bound to the original Experiment");
  }
  if (definition.action === "baseline_change" && target.id === envelope.scope.baseline_id) {
    throw experimentError("ERR_EXPERIMENT_BASELINE_UNCHANGED", "Recovery baseline target does not change the bound baseline");
  }
}

function assertRecoveryReceiptBinding(envelope, receipt) {
  const matches = receipt.intent === envelope.intent
    && canonicalHash(receipt.actor) === canonicalHash(envelope.actor)
    && canonicalHash(receipt.object_ref) === canonicalHash(envelope.object_ref)
    && receipt.scope_hash === canonicalHash(envelope.scope)
    && receipt.plan_hash === envelope.plan_hash;
  if (!matches) {
    throw experimentError("ERR_EXPERIMENT_RECEIPT_CONTEXT_DRIFT", "Recovery transition does not match the Receipt authorization binding");
  }
  if (["reserved", "consumed"].includes(receipt.state) && receipt.reserved_by !== envelope.tool_use_id) {
    throw experimentError("ERR_EXPERIMENT_RECEIPT_OWNER_MISMATCH", "Recovery transition is not bound to the Receipt reservation owner");
  }
}

function assertEnvelopeMatches(envelope, expected, intent) {
  if (
    envelope.intent !== intent
    || canonicalHash(envelope.actor) !== canonicalHash(expected.actor)
    || canonicalHash(envelope.object_ref) !== canonicalHash(expected.object_ref)
    || canonicalHash(envelope.scope) !== canonicalHash(expected.scope)
    || envelope.plan_hash !== expected.plan_hash
  ) {
    throw experimentError("ERR_RECEIPT_CONTEXT_DRIFT", "Receipt transition context does not match current Experiment authority");
  }
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

function experimentReceiptScope(experiment, action, targetHash) {
  const supersede = action === "supersede";
  const binding = supersede
    ? { object_ref: experiment.object_ref, lifecycle: experiment.lifecycle }
    : experiment;
  const scope = {
    action,
    expected_lifecycle: experiment.lifecycle,
    expected_status: supersede ? null : experiment.status,
    current_attempt_id: supersede ? null : (experiment.current_attempt_id ?? null),
    baseline_id: supersede ? null : (experiment.baseline?.id ?? null),
    state_hash: canonicalHash(binding),
  };
  if (targetHash) scope.target_hash = targetHash;
  return scope;
}

function experimentReceiptPlanHash(experiment, action, targetHash) {
  const binding = action === "supersede"
    ? { object_ref: experiment.object_ref, lifecycle: experiment.lifecycle }
    : experiment;
  return targetHash
    ? canonicalHash({ binding, target_hash: targetHash })
    : canonicalHash(binding);
}

function normalizeExperimentObjectRef(input) {
  const objectRef = storedObjectRef(normalizeAuthorityObjectRef(input));
  if (objectRef.kind !== EXPERIMENT_KIND) {
    throw experimentError("ERR_EXPERIMENT_OBJECT_MISMATCH", "object_ref must reference an Experiment");
  }
  return objectRef;
}

function normalizeActor(value) {
  assertPlainObject(value, "Experiment actor");
  assertExactKeys(value, ["type", "id"], "Experiment actor");
  return {
    type: normalizeSafeIdentifier(value.type, "Experiment actor.type"),
    id: normalizeSafeIdentifier(value.id, "Experiment actor.id"),
  };
}

function toRuntimeDocuments(experiment) {
  const normalized = normalizeExperimentView(experiment);
  return {
    object_ref: normalized.object_ref,
    runtime: normalized,
    continuation: {
      schema_version: AUTHORITY_SCHEMA_VERSION,
      object_ref: normalized.object_ref,
      next_action: nextAction(normalized),
      updated_at: normalized.updated_at,
    },
  };
}

function nextAction(experiment) {
  if (experiment.lifecycle === "trashed") return "restore_experiment";
  if (experiment.lifecycle === "superseded") return "inspect_replacement_experiment";
  if (experiment.attempts.some((attempt) => attempt.scientific_review?.status === "pending_confirmation")) {
    return "resolve_scientific_review";
  }
  if (experiment.status === "pending") return "record_experiment_attempt";
  return "record_or_rerun_experiment_attempt";
}

async function optionalRead(root, objectRef) {
  try {
    return await read(root, objectRef);
  } catch (error) {
    if (error?.code === "ERR_EXPERIMENT_NOT_FOUND") return null;
    throw error;
  }
}

function now(clock) {
  if (clock.length !== 0) {
    throw experimentError("ERR_EXPERIMENT_SCHEMA_INVALID", "Experiment store clock must be zero-argument");
  }
  return normalizeTimestamp(clock(), "Experiment clock value");
}

function renderYaml(value) {
  return `${stringifyYaml(value).trimEnd()}\n`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function experimentError(code, message) {
  return authorityError(code, message);
}
