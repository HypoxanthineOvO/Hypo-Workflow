import { canonicalHash } from "../serialization/index.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
  normalizeSha256,
  normalizeTimestamp,
} from "../runtime/internal.js";
import { normalizeWorkspacePath } from "../workspace-store/index.js";
import { normalizeCompiledExperimentRunSpec } from "./runs.js";

const SUPERVISION_MODES = new Set(["foreground", "tmux"]);
const EVENT_STATES = new Set(["started", "heartbeat", "interrupted", "restarted", "completed", "failed"]);
const REVIEW_ASSESSMENTS = new Set(["reasonable", "suspicious", "inconsistent"]);
const REVIEW_DECISIONS = new Set(["confirm", "dismiss", "investigate"]);
const CAUSE_CATEGORIES = new Set([
  "dataset",
  "environment",
  "implementation",
  "measurement",
  "parameter",
  "resource",
  "stochasticity",
  "unknown",
  "version",
]);

export function compileExperimentSupervisionPlan(input) {
  assertPlainObject(input, "Experiment supervision plan input");
  assertNoRawSecrets(input, "Experiment supervision plan input");
  assertExactKeys(input, [
    "schema_version",
    "attempt_id",
    "run_spec",
    "mode",
    "poll_interval_seconds",
    "checkpoint",
  ], "Experiment supervision plan input");
  if (input.schema_version !== "1") {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Experiment supervision schema_version must be 1");
  }
  const runSpec = normalizeCompiledExperimentRunSpec(input.run_spec);
  const attemptId = normalizeSafeIdentifier(input.attempt_id, "Experiment supervision attempt_id");
  const mode = normalizeSafeIdentifier(input.mode, "Experiment supervision mode");
  if (!SUPERVISION_MODES.has(mode)) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Experiment supervision mode must be foreground or tmux");
  }
  const sessionName = mode === "tmux"
    ? buildTmuxSessionName(runSpec, attemptId)
    : undefined;
  const pollInterval = positiveInteger(input.poll_interval_seconds, "Experiment supervision poll_interval_seconds");
  const checkpoint = normalizeCheckpoint(input.checkpoint, runSpec);
  const recoveryStrategy = checkpoint.supported ? "resume_from_checkpoint" : "restart_from_scratch";
  const durable = {
    schema_version: "1",
    source: "deterministic_policy",
    attempt_id: attemptId,
    run_id: runSpec.run_id,
    identity_hash: runSpec.identity_hash,
    runner_authority: "host",
    workflow_is_runner: false,
    launch: {
      mode,
      cwd: runSpec.command.cwd,
      argv: [...runSpec.command.argv],
      env: clone(runSpec.command.env),
      ...(sessionName === undefined ? {} : { session_name: sessionName }),
    },
    observation: {
      poll_interval_seconds: pollInterval,
      log_path: runSpec.output.log_path,
      config_path: runSpec.output.config_path,
      metrics_path: runSpec.output.metrics_path,
    },
    checkpoint,
    interruption_policy: {
      evidence_required: true,
      recovery_strategy: recoveryStrategy,
      requires_rerun_parent: true,
    },
  };
  return { ...durable, plan_id: `plan-${canonicalHash(durable).slice(0, 32)}` };
}

export function compileExperimentScientificReview(input) {
  assertPlainObject(input, "Experiment scientific review input");
  assertNoRawSecrets(input, "Experiment scientific review input");
  assertExactKeys(input, [
    "schema_version",
    "attempt_id",
    "run_spec",
    "metrics",
    "output_refs",
    "finished_at",
    "assessment",
    "summary",
    "reviewed_at",
    "metric_checks",
    "references",
    "reason_codes",
    "candidate_causes",
  ], "Experiment scientific review input");
  if (input.schema_version !== "1") {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Experiment scientific review schema_version must be 1");
  }
  const runSpec = normalizeCompiledExperimentRunSpec(input.run_spec);
  const attemptId = normalizeSafeIdentifier(input.attempt_id, "Experiment scientific review attempt_id");
  const outputRefs = normalizeOutputRefs(input.output_refs, runSpec);
  const observedMetrics = normalizeObservedMetrics(input.metrics);
  const finishedAt = normalizeTimestamp(input.finished_at, "Experiment scientific review finished_at");
  const assessment = normalizeSafeIdentifier(input.assessment, "Experiment scientific review assessment");
  if (!REVIEW_ASSESSMENTS.has(assessment)) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific assessment must be reasonable, suspicious, or inconsistent");
  }
  const metricChecks = normalizeMetricChecks(input.metric_checks, runSpec, outputRefs, observedMetrics);
  const references = normalizeReferences(input.references);
  const reasonCodes = normalizeReasonCodes(input.reason_codes);
  const candidateCauses = normalizeCandidateCauses(input.candidate_causes);
  assertReviewSemantics(assessment, references, reasonCodes, candidateCauses);
  const confirmationRequired = assessment !== "reasonable";
  const durable = {
    schema_version: "1",
    attempt_id: attemptId,
    run_id: runSpec.run_id,
    identity_hash: runSpec.identity_hash,
    assessment,
    summary: normalizeText(input.summary, "Experiment scientific review summary"),
    reviewed_at: normalizeTimestamp(input.reviewed_at, "Experiment scientific review reviewed_at"),
    metric_checks: metricChecks,
    references,
    reason_codes: reasonCodes,
    candidate_causes: candidateCauses,
    confirmation: {
      required: confirmationRequired,
      status: confirmationRequired ? "pending" : "not_required",
    },
    status: confirmationRequired ? "pending_confirmation" : "recorded",
  };
  if (Date.parse(durable.reviewed_at) < Date.parse(finishedAt)) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review cannot precede operational completion");
  }
  const reviewHash = canonicalHash(durable);
  return {
    ...durable,
    review_id: `review-${reviewHash.slice(0, 32)}`,
    review_hash: reviewHash,
  };
}

export function normalizeExperimentSupervisionEvidence(input, context) {
  assertPlainObject(input, "Experiment supervision evidence");
  assertNoRawSecrets(input, "Experiment supervision evidence");
  assertExactKeys(input, ["plan", "events", "recovery", "operational_completion"], "Experiment supervision evidence");
  assertPlainObject(context, "Experiment supervision evidence context");
  const runSpec = normalizeCompiledExperimentRunSpec(context.run_spec);
  const status = normalizeSafeIdentifier(context.status, "Experiment supervision evidence context.status");
  const attemptId = normalizeSafeIdentifier(context.attempt_id, "Experiment supervision evidence context.attempt_id");
  const outputRefs = normalizeOutputRefs(context.output_refs, runSpec);
  const plan = normalizeCompiledSupervisionPlan(input.plan, runSpec, attemptId);
  const events = normalizeSupervisionEvents(input.events, runSpec, outputRefs);
  assertEventLifecycle(events, status, {
    started_at: context.started_at,
    finished_at: context.finished_at,
  });
  const recovery = normalizeRecovery(input.recovery, plan, events, status, {
    attempt_id: attemptId,
    rerun_of_attempt_id: context.rerun_of_attempt_id ?? null,
    output_refs: outputRefs,
  });
  const completion = normalizeOperationalCompletion(input.operational_completion, runSpec, outputRefs, status);
  return {
    plan,
    events,
    recovery,
    ...(completion === undefined ? {} : { operational_completion: completion }),
  };
}

export function assertExperimentSupervisionRerunBinding(attempt, parentAttempt) {
  const restartedEvents = (attempt.supervision?.events ?? []).filter(({ state }) => state === "restarted");
  if (parentAttempt?.status === "interrupted") {
    if (restartedEvents.length !== 1 || attempt.supervision.events[1]?.state !== "restarted") {
      throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "A rerun of an interrupted Attempt requires one immediate restarted event");
    }
  } else if (restartedEvents.length !== 0) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Only a rerun of an interrupted Attempt may claim restarted supervision");
  } else {
    return;
  }
  if (!parentAttempt || attempt.rerun_of_attempt_id !== parentAttempt.id) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Restarted supervision requires its explicit rerun parent Attempt");
  }
  const interrupted = parentAttempt.supervision?.events?.at(-1);
  if (parentAttempt.status !== "interrupted" || interrupted?.state !== "interrupted") {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Restarted supervision parent must be an interrupted Attempt");
  }
  const recovery = attempt.supervision.recovery;
  if (
    recovery.interrupted_attempt_id !== parentAttempt.id
    || recovery.interruption_event_sequence !== interrupted.sequence
    || recovery.strategy !== parentAttempt.supervision.recovery.strategy
    || canonicalHash(attempt.supervision.plan.checkpoint) !== canonicalHash(parentAttempt.supervision.plan.checkpoint)
    || (
      recovery.strategy === "resume_from_checkpoint"
      && recovery.checkpoint_ref !== parentAttempt.supervision.recovery.checkpoint_ref
    )
    || Date.parse(attempt.started_at) < Date.parse(parentAttempt.finished_at)
  ) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Restarted supervision recovery does not match its parent interruption evidence");
  }
}

export function normalizeExperimentScientificReview(input, runSpecInput, options = {}) {
  assertPlainObject(input, "Experiment scientific review");
  assertNoRawSecrets(input, "Experiment scientific review");
  assertExactKeys(input, [
    "schema_version",
    "attempt_id",
    "run_id",
    "identity_hash",
    "assessment",
    "summary",
    "reviewed_at",
    "metric_checks",
    "references",
    "reason_codes",
    "candidate_causes",
    "confirmation",
    "status",
    "review_id",
    "review_hash",
    "resolution",
  ], "Experiment scientific review");
  const runSpec = normalizeCompiledExperimentRunSpec(runSpecInput);
  const attemptId = normalizeSafeIdentifier(options.attempt_id, "Experiment scientific review context.attempt_id");
  const outputRefs = normalizeOutputRefs(options.output_refs, runSpec);
  const observedMetrics = normalizeObservedMetrics(options.metrics);
  const finishedAt = normalizeTimestamp(options.finished_at, "Experiment scientific review context.finished_at");
  if (input.schema_version !== "1" || input.run_id !== runSpec.run_id) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review is not bound to the run specification");
  }
  const identityHash = normalizeSha256(input.identity_hash, "Experiment scientific review identity_hash");
  if (identityHash !== runSpec.identity_hash) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review identity_hash does not match the run specification");
  }
  const assessment = normalizeSafeIdentifier(input.assessment, "Experiment scientific review assessment");
  if (!REVIEW_ASSESSMENTS.has(assessment)) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review assessment is invalid");
  }
  const hasResolution = Object.hasOwn(input, "resolution");
  const confirmationRequired = assessment !== "reasonable";
  const baseStatus = confirmationRequired ? "pending_confirmation" : "recorded";
  if (hasResolution) {
    if (options.allow_resolution !== true || !confirmationRequired) {
      throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review resolution is not allowed here");
    }
    assertPlainObject(input.confirmation, "Experiment scientific review confirmation");
    assertExactKeys(input.confirmation, ["required", "status"], "Experiment scientific review confirmation");
    if (input.confirmation.required !== true || input.confirmation.status !== "resolved") {
      throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Resolved scientific review must retain resolved confirmation state");
    }
  }
  const durable = {
    schema_version: "1",
    attempt_id: normalizeSafeIdentifier(input.attempt_id, "Experiment scientific review attempt_id"),
    run_id: runSpec.run_id,
    identity_hash: identityHash,
    assessment,
    summary: normalizeText(input.summary, "Experiment scientific review summary"),
    reviewed_at: normalizeTimestamp(input.reviewed_at, "Experiment scientific review reviewed_at"),
    metric_checks: normalizeMetricChecks(input.metric_checks, runSpec, outputRefs, observedMetrics),
    references: normalizeReferences(input.references),
    reason_codes: normalizeReasonCodes(input.reason_codes),
    candidate_causes: normalizeCandidateCauses(input.candidate_causes),
    confirmation: confirmationRequired
      ? { required: true, status: "pending" }
      : normalizeConfirmation(input.confirmation, assessment),
    status: baseStatus,
  };
  assertReviewSemantics(
    durable.assessment,
    durable.references,
    durable.reason_codes,
    durable.candidate_causes,
  );
  if (Date.parse(durable.reviewed_at) < Date.parse(finishedAt)) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review cannot precede operational completion");
  }
  if (durable.attempt_id !== attemptId) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review is not bound to the run Attempt");
  }
  const suppliedStatus = normalizeSafeIdentifier(input.status, "Experiment scientific review status");
  const reviewHash = normalizeSha256(input.review_hash, "Experiment scientific review review_hash");
  if (reviewHash !== canonicalHash(durable)) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review hash does not match its durable evidence");
  }
  const reviewId = normalizeSafeIdentifier(input.review_id, "Experiment scientific review review_id");
  if (reviewId !== `review-${reviewHash.slice(0, 32)}`) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review id does not match its evidence hash");
  }
  const result = { ...durable, review_id: reviewId, review_hash: reviewHash };
  if (hasResolution) {
    result.resolution = normalizeReviewResolution(input.resolution, durable.reviewed_at);
    result.confirmation = { required: true, status: "resolved" };
    result.status = reviewResolutionStatus(result.resolution.decision);
    if (suppliedStatus !== result.status) {
      throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review status does not match its resolution");
    }
  } else {
    if (suppliedStatus !== baseStatus || (confirmationRequired && canonicalHash(input.confirmation) !== canonicalHash(durable.confirmation))) {
      throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review status does not match its assessment");
    }
  }
  return result;
}

export function normalizeScientificReviewResolutionTarget(experiment, input) {
  assertPlainObject(input, "Experiment scientific review resolution target");
  assertNoRawSecrets(input, "Experiment scientific review resolution target");
  assertExactKeys(input, ["attempt_id", "review_id", "review_hash", "decision", "rationale"], "Experiment scientific review resolution target");
  const attemptId = normalizeSafeIdentifier(input.attempt_id, "Experiment scientific review resolution target.attempt_id");
  const reviewHash = normalizeSha256(input.review_hash, "Experiment scientific review resolution target.review_hash");
  const reviewId = normalizeSafeIdentifier(input.review_id, "Experiment scientific review resolution target.review_id");
  const decision = normalizeSafeIdentifier(input.decision, "Experiment scientific review resolution target.decision");
  if (!REVIEW_DECISIONS.has(decision)) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review decision must be confirm, dismiss, or investigate");
  }
  if (experiment !== undefined) {
    const attempt = experiment.attempts.find(({ id }) => id === attemptId);
    if (!attempt?.scientific_review || attempt.scientific_review.status !== "pending_confirmation") {
      throw supervisionError("ERR_EXPERIMENT_REVIEW_STATE_INVALID", "Scientific review is not pending confirmation");
    }
    if (attempt.scientific_review.review_hash !== reviewHash || attempt.scientific_review.review_id !== reviewId) {
      throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review resolution target is stale");
    }
  }
  return {
    attempt_id: attemptId,
    review_id: reviewId,
    review_hash: reviewHash,
    decision,
    rationale: normalizeText(input.rationale, "Experiment scientific review resolution target.rationale"),
  };
}

export function applyScientificReviewResolution(attemptInput, target, actor, resolvedAt) {
  const attempt = clone(attemptInput);
  const normalizedTarget = normalizeScientificReviewResolutionTarget({ attempts: [attempt] }, target);
  const normalizedResolvedAt = normalizeTimestamp(resolvedAt, "Experiment scientific review resolution resolved_at");
  if (Date.parse(normalizedResolvedAt) < Date.parse(attempt.scientific_review.reviewed_at)) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review resolution cannot precede the review");
  }
  attempt.scientific_review = {
    ...attempt.scientific_review,
    confirmation: { required: true, status: "resolved" },
    status: reviewResolutionStatus(normalizedTarget.decision),
    resolution: {
      decision: normalizedTarget.decision,
      rationale: normalizedTarget.rationale,
      resolved_at: normalizedResolvedAt,
      actor: normalizeReviewActor(actor),
    },
  };
  return attempt;
}

function normalizeCompiledSupervisionPlan(input, runSpec, attemptId) {
  assertPlainObject(input, "Compiled Experiment supervision plan");
  assertExactKeys(input, [
    "schema_version",
    "plan_id",
    "source",
    "attempt_id",
    "run_id",
    "identity_hash",
    "runner_authority",
    "workflow_is_runner",
    "launch",
    "observation",
    "checkpoint",
    "interruption_policy",
  ], "Compiled Experiment supervision plan");
  if (
    input.schema_version !== "1"
    || input.source !== "deterministic_policy"
    || input.runner_authority !== "host"
    || input.workflow_is_runner !== false
    || input.attempt_id !== attemptId
    || input.run_id !== runSpec.run_id
    || normalizeSha256(input.identity_hash, "Compiled Experiment supervision identity_hash") !== runSpec.identity_hash
  ) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision plan does not match its run or host-owned runner boundary");
  }
  const planId = normalizeSafeIdentifier(input.plan_id, "Compiled Experiment supervision plan_id");
  const planDurable = clone(input);
  delete planDurable.plan_id;
  if (planId !== `plan-${canonicalHash(planDurable).slice(0, 32)}`) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision plan_id does not match its durable content");
  }
  assertPlainObject(input.launch, "Compiled Experiment supervision launch");
  assertExactKeys(input.launch, ["mode", "cwd", "argv", "env", "session_name"], "Compiled Experiment supervision launch");
  const mode = normalizeSafeIdentifier(input.launch.mode, "Compiled Experiment supervision launch.mode");
  if (!SUPERVISION_MODES.has(mode)) throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision launch mode is invalid");
  const expectedLaunch = {
    mode,
    cwd: runSpec.command.cwd,
    argv: [...runSpec.command.argv],
    env: clone(runSpec.command.env),
    ...(mode === "tmux" ? { session_name: buildTmuxSessionName(runSpec, attemptId) } : {}),
  };
  if (mode !== "tmux" && Object.hasOwn(input.launch, "session_name")) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Foreground plan must not contain a tmux session");
  }
  if (canonicalHash(input.launch) !== canonicalHash(expectedLaunch)) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision launch differs from the compiled run command");
  }
  assertPlainObject(input.observation, "Compiled Experiment supervision observation");
  assertExactKeys(input.observation, ["poll_interval_seconds", "log_path", "config_path", "metrics_path"], "Compiled Experiment supervision observation");
  const observation = {
    poll_interval_seconds: positiveInteger(input.observation.poll_interval_seconds, "Compiled Experiment supervision poll interval"),
    log_path: normalizeRunArtifact(input.observation.log_path, runSpec, "Compiled Experiment supervision log_path"),
    config_path: normalizeRunArtifact(input.observation.config_path, runSpec, "Compiled Experiment supervision config_path"),
    metrics_path: normalizeRunArtifact(input.observation.metrics_path, runSpec, "Compiled Experiment supervision metrics_path"),
  };
  if (
    observation.log_path !== runSpec.output.log_path
    || observation.config_path !== runSpec.output.config_path
    || observation.metrics_path !== runSpec.output.metrics_path
  ) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision observation paths differ from run outputs");
  }
  const checkpoint = normalizeCheckpoint(input.checkpoint, runSpec);
  assertPlainObject(input.interruption_policy, "Compiled Experiment supervision interruption_policy");
  assertExactKeys(input.interruption_policy, ["evidence_required", "recovery_strategy", "requires_rerun_parent"], "Compiled Experiment supervision interruption_policy");
  const expectedStrategy = checkpoint.supported ? "resume_from_checkpoint" : "restart_from_scratch";
  if (
    input.interruption_policy.evidence_required !== true
    || input.interruption_policy.requires_rerun_parent !== true
    || input.interruption_policy.recovery_strategy !== expectedStrategy
  ) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision interruption policy is invalid");
  }
  return clone(input);
}

function normalizeCheckpoint(input, runSpec) {
  assertPlainObject(input, "Experiment supervision checkpoint");
  assertExactKeys(input, ["supported", "artifact_ref", "resume_argv"], "Experiment supervision checkpoint");
  if (typeof input.supported !== "boolean") {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "checkpoint.supported must be boolean");
  }
  const hasArtifact = Object.hasOwn(input, "artifact_ref");
  const hasResume = Object.hasOwn(input, "resume_argv");
  if (!input.supported) {
    if (hasArtifact || hasResume) {
      throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Unsupported checkpoint must not claim resume data");
    }
    return { supported: false };
  }
  if (!hasArtifact || !hasResume) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supported checkpoint requires artifact_ref and resume_argv");
  }
  if (!Array.isArray(input.resume_argv) || input.resume_argv.length < 4 || input.resume_argv.some((entry) => typeof entry !== "string" || !entry)) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "checkpoint.resume_argv must be a structured command");
  }
  if (canonicalHash(input.resume_argv.slice(0, 3)) !== canonicalHash(["uv", "run", "--frozen"])) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "checkpoint resume must use exact uv run --frozen");
  }
  if (canonicalHash(input.resume_argv.slice(0, runSpec.command.argv.length)) !== canonicalHash(runSpec.command.argv)) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "checkpoint resume_argv must extend the original run command");
  }
  const artifactRef = normalizeRunArtifact(input.artifact_ref, runSpec, "Experiment supervision checkpoint artifact_ref");
  if (!input.resume_argv.some((argument) => argument === artifactRef || argument.endsWith(`=${artifactRef}`))) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "checkpoint resume_argv must bind the declared checkpoint artifact_ref");
  }
  return {
    supported: true,
    artifact_ref: artifactRef,
    resume_argv: [...input.resume_argv],
  };
}

function normalizeSupervisionEvents(input, runSpec, outputRefs) {
  if (!Array.isArray(input) || input.length < 2) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision evidence requires at least start and terminal events");
  }
  let previousTime = Number.NEGATIVE_INFINITY;
  const events = input.map((entry, index) => {
    const field = `Experiment supervision events[${index}]`;
    assertPlainObject(entry, field);
    assertExactKeys(entry, ["sequence", "state", "observed_at", "evidence_ref", "reason_code", "signal"], field);
    if (entry.sequence !== index + 1) {
      throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision event sequences must be contiguous from one");
    }
    const state = normalizeSafeIdentifier(entry.state, `${field}.state`);
    if (!EVENT_STATES.has(state)) throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", `${field}.state is invalid`);
    const observedAt = normalizeTimestamp(entry.observed_at, `${field}.observed_at`);
    if (Date.parse(observedAt) < previousTime) {
      throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision events must be chronological");
    }
    previousTime = Date.parse(observedAt);
    const evidenceRef = normalizeRunArtifact(entry.evidence_ref, runSpec, `${field}.evidence_ref`);
    if (!outputRefs.includes(evidenceRef)) {
      throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision event evidence_ref must be retained as output evidence");
    }
    const hasReason = Object.hasOwn(entry, "reason_code");
    const hasSignal = Object.hasOwn(entry, "signal");
    if (state === "interrupted" && !hasReason) {
      throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Interrupted supervision requires a reason_code");
    }
    if (state !== "interrupted" && (hasReason || hasSignal)) {
      throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Only an interrupted supervision event may contain interruption details");
    }
    return {
      sequence: entry.sequence,
      state,
      observed_at: observedAt,
      evidence_ref: evidenceRef,
      ...(hasReason ? { reason_code: normalizeSafeIdentifier(entry.reason_code, `${field}.reason_code`) } : {}),
      ...(hasSignal ? { signal: normalizeSafeIdentifier(entry.signal, `${field}.signal`) } : {}),
    };
  });
  if (events[0].state !== "started") {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision evidence must begin with started");
  }
  return events;
}

function assertEventLifecycle(events, status, context) {
  const terminal = events.at(-1).state;
  const expected = { completed: "completed", failed: "failed", interrupted: "interrupted" }[status];
  if (!expected || terminal !== expected) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision terminal event does not match the run outcome");
  }
  const terminalStates = new Set(["completed", "failed", "interrupted"]);
  if (events.slice(0, -1).some(({ state }) => terminalStates.has(state))) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision evidence contains a non-final terminal event");
  }
  const startedAt = normalizeTimestamp(context.started_at, "Experiment supervision started_at");
  const finishedAt = normalizeTimestamp(context.finished_at, "Experiment supervision finished_at");
  if (events[0].observed_at !== startedAt || events.at(-1).observed_at !== finishedAt) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision boundary events must match Attempt timestamps");
  }
}

function normalizeRecovery(input, plan, events, status, context) {
  assertPlainObject(input, "Experiment supervision recovery");
  assertExactKeys(input, [
    "strategy",
    "interrupted_attempt_id",
    "interruption_event_sequence",
    "checkpoint_ref",
  ], "Experiment supervision recovery");
  const strategy = normalizeSafeIdentifier(input.strategy, "Experiment supervision recovery.strategy");
  if (!new Set(["none", "resume_from_checkpoint", "restart_from_scratch"]).has(strategy)) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Supervision recovery strategy is invalid");
  }
  const interrupted = events.find(({ state }) => state === "interrupted");
  const restarted = events.some(({ state }) => state === "restarted");
  if (status === "interrupted") {
    const expected = plan.interruption_policy.recovery_strategy;
    if (
      strategy !== expected
      || input.interrupted_attempt_id !== context.attempt_id
      || input.interruption_event_sequence !== interrupted?.sequence
    ) {
      throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Interrupted supervision must retain its deterministic recovery plan");
    }
  } else if (restarted) {
    if (
      strategy !== plan.interruption_policy.recovery_strategy
      || context.rerun_of_attempt_id === null
      || input.interrupted_attempt_id !== context.rerun_of_attempt_id
      || !Number.isSafeInteger(input.interruption_event_sequence)
      || input.interruption_event_sequence <= 0
    ) {
      throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Restarted supervision must identify its interruption strategy");
    }
  } else if (
    strategy !== "none"
    || Object.hasOwn(input, "interrupted_attempt_id")
    || Object.hasOwn(input, "interruption_event_sequence")
  ) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Uninterrupted supervision must use recovery strategy none");
  }
  const checkpointRef = Object.hasOwn(input, "checkpoint_ref")
    ? normalizeRunArtifact(input.checkpoint_ref, { output: { directory: plan.observation.log_path.split("/").slice(0, -1).join("/") } }, "Experiment supervision recovery.checkpoint_ref")
    : undefined;
  if (strategy === "resume_from_checkpoint") {
    if (
      !plan.checkpoint.supported
      || checkpointRef !== plan.checkpoint.artifact_ref
      || !context.output_refs.includes(checkpointRef)
    ) {
      throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Checkpoint recovery must bind the declared checkpoint artifact");
    }
  } else if (checkpointRef !== undefined) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Non-checkpoint recovery must not claim a checkpoint artifact");
  }
  return {
    strategy,
    ...(Object.hasOwn(input, "interrupted_attempt_id") ? {
      interrupted_attempt_id: normalizeSafeIdentifier(input.interrupted_attempt_id, "Experiment supervision recovery.interrupted_attempt_id"),
    } : {}),
    ...(Object.hasOwn(input, "interruption_event_sequence") ? { interruption_event_sequence: input.interruption_event_sequence } : {}),
    ...(checkpointRef === undefined ? {} : { checkpoint_ref: checkpointRef }),
  };
}

function normalizeOperationalCompletion(input, runSpec, outputRefs, status) {
  if (status !== "completed") {
    if (input !== undefined) {
      throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Only completed runs may claim operational completion");
    }
    return undefined;
  }
  assertPlainObject(input, "Experiment operational completion");
  assertExactKeys(input, ["exit_code", "verified_output_refs"], "Experiment operational completion");
  if (input.exit_code !== 0) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Operational completion requires exit_code zero");
  }
  const verified = normalizeOutputRefs(input.verified_output_refs, runSpec);
  const required = [runSpec.output.log_path, runSpec.output.config_path, runSpec.output.metrics_path];
  if (
    verified.some((path) => !outputRefs.includes(path))
    || required.some((path) => !verified.includes(path) || !outputRefs.includes(path))
  ) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Operational completion must verify log, config, and metrics outputs");
  }
  return { exit_code: 0, verified_output_refs: verified };
}

function normalizeMetricChecks(input, runSpec, retainedOutputRefs, observedMetrics) {
  if (!Array.isArray(input) || input.length === 0) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review requires metric checks");
  }
  const names = new Set();
  return input.map((entry, index) => {
    const field = `Experiment scientific review metric_checks[${index}]`;
    assertPlainObject(entry, field);
    assertExactKeys(entry, ["metric", "observed", "comparison", "expected", "evidence_refs"], field);
    const metric = normalizeSafeIdentifier(entry.metric, `${field}.metric`);
    if (names.has(metric)) throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review metric checks contain duplicates");
    names.add(metric);
    if (!Array.isArray(entry.evidence_refs) || entry.evidence_refs.length === 0) {
      throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", `${field}.evidence_refs must be non-empty`);
    }
    if (!Object.hasOwn(observedMetrics, metric)) {
      throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", `Scientific review metric ${metric} is absent from the Attempt outcome`);
    }
    const observed = normalizeCanonicalValue(entry.observed, `${field}.observed`);
    if (canonicalHash(observed) !== canonicalHash(observedMetrics[metric])) {
      throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", `Scientific review metric ${metric} does not match the Attempt outcome`);
    }
    const evidenceRefs = entry.evidence_refs.map((value, refIndex) => normalizeRunArtifact(value, runSpec, `${field}.evidence_refs[${refIndex}]`));
    if (retainedOutputRefs && evidenceRefs.some((value) => !retainedOutputRefs.includes(value))) {
      throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific metric evidence must be retained in run output_refs");
    }
    return {
      metric,
      observed,
      comparison: normalizeText(entry.comparison, `${field}.comparison`),
      expected: normalizeCanonicalValue(entry.expected, `${field}.expected`),
      evidence_refs: evidenceRefs,
    };
  });
}

function normalizeObservedMetrics(input) {
  assertPlainObject(input, "Experiment scientific review metrics");
  return normalizeCanonicalValue(input, "Experiment scientific review metrics");
}

function normalizeReferences(input) {
  if (!Array.isArray(input)) throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review references must be an array");
  return input.map((entry, index) => {
    const field = `Experiment scientific review references[${index}]`;
    assertPlainObject(entry, field);
    assertExactKeys(entry, ["type", "ref", "locator"], field);
    return {
      type: normalizeSafeIdentifier(entry.type, `${field}.type`),
      ref: normalizeReferenceText(entry.ref, `${field}.ref`),
      locator: normalizeReferenceText(entry.locator, `${field}.locator`),
    };
  });
}

function normalizeReasonCodes(input) {
  if (!Array.isArray(input) || input.length === 0) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review reason_codes must be non-empty");
  }
  const codes = input.map((value, index) => normalizeSafeIdentifier(value, `Experiment scientific review reason_codes[${index}]`));
  if (new Set(codes).size !== codes.length) throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review reason_codes contain duplicates");
  return codes.sort();
}

function normalizeCandidateCauses(input) {
  if (!Array.isArray(input)) throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review candidate_causes must be an array");
  return input.map((entry, index) => {
    const field = `Experiment scientific review candidate_causes[${index}]`;
    assertPlainObject(entry, field);
    assertExactKeys(entry, ["category", "summary", "evidence_refs", "hypothesis"], field);
    const category = normalizeSafeIdentifier(entry.category, `${field}.category`);
    if (!CAUSE_CATEGORIES.has(category)) throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", `${field}.category is invalid`);
    if (Object.hasOwn(entry, "hypothesis") && entry.hypothesis !== true) {
      throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Candidate scientific causes must remain hypotheses");
    }
    if (!Array.isArray(entry.evidence_refs)) throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", `${field}.evidence_refs must be an array`);
    return {
      category,
      summary: normalizeText(entry.summary, `${field}.summary`),
      evidence_refs: entry.evidence_refs.map((value, refIndex) => normalizeReferenceText(value, `${field}.evidence_refs[${refIndex}]`)),
      hypothesis: true,
    };
  });
}

function assertReviewSemantics(assessment, references, reasonCodes, candidateCauses) {
  if (assessment === "suspicious" && candidateCauses.length === 0) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "A suspicious result requires at least one candidate cause");
  }
  if (assessment === "inconsistent") {
    if (!references.some(({ type }) => type === "paper")) {
      throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "A paper-inconsistent result requires paper reference evidence");
    }
    if (new Set(candidateCauses.map(({ category }) => category)).size < 2) {
      throw supervisionError(
        "ERR_EXPERIMENT_REVIEW_INVALID",
        "An inconsistent result requires multiple distinct candidate causes before implementation blame",
      );
    }
  }
  if (reasonCodes.includes("implementation_error_confirmed")) {
    throw supervisionError(
      "ERR_EXPERIMENT_REVIEW_INVALID",
      "AI review may propose implementation as a hypothesis but cannot confirm it silently",
    );
  }
}

function normalizeConfirmation(input, assessment) {
  assertPlainObject(input, "Experiment scientific review confirmation");
  assertExactKeys(input, ["required", "status"], "Experiment scientific review confirmation");
  const required = assessment !== "reasonable";
  const status = required ? "pending" : "not_required";
  if (input.required !== required || input.status !== status) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review confirmation does not match its assessment");
  }
  return { required, status };
}

function normalizeReviewResolution(input, reviewedAt) {
  assertPlainObject(input, "Experiment scientific review resolution");
  assertExactKeys(input, ["decision", "rationale", "resolved_at", "actor"], "Experiment scientific review resolution");
  const decision = normalizeSafeIdentifier(input.decision, "Experiment scientific review resolution.decision");
  if (!REVIEW_DECISIONS.has(decision)) throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review resolution decision is invalid");
  const resolvedAt = normalizeTimestamp(input.resolved_at, "Experiment scientific review resolution.resolved_at");
  if (Date.parse(resolvedAt) < Date.parse(reviewedAt)) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", "Scientific review resolution cannot precede the review");
  }
  return {
    decision,
    rationale: normalizeText(input.rationale, "Experiment scientific review resolution.rationale"),
    resolved_at: resolvedAt,
    actor: normalizeReviewActor(input.actor),
  };
}

function normalizeReviewActor(input) {
  assertPlainObject(input, "Experiment scientific review actor");
  assertExactKeys(input, ["type", "id"], "Experiment scientific review actor");
  return {
    type: normalizeSafeIdentifier(input.type, "Experiment scientific review actor.type"),
    id: normalizeSafeIdentifier(input.id, "Experiment scientific review actor.id"),
  };
}

function reviewResolutionStatus(decision) {
  return {
    confirm: "confirmed",
    dismiss: "dismissed",
    investigate: "investigation_required",
  }[decision];
}

function normalizeOutputRefs(input, runSpec) {
  if (!Array.isArray(input) || input.length === 0) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Experiment output refs must be non-empty");
  }
  const refs = input.map((value, index) => normalizeRunArtifact(value, runSpec, `Experiment output refs[${index}]`));
  if (new Set(refs).size !== refs.length) throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "Experiment output refs contain duplicates");
  return refs;
}

function normalizeRunArtifact(value, runSpec, field) {
  let path;
  try {
    path = normalizeWorkspacePath(value);
  } catch {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", `${field} must be a safe relative path`);
  }
  if (!path.startsWith(`${runSpec.output.directory}/`)) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", `${field} must stay inside the run output directory`);
  }
  return path;
}

function normalizeTmuxSessionName(value) {
  const name = normalizeSafeIdentifier(value, "Experiment supervision tmux session_name");
  if (!name.startsWith("hw-exp-") || Buffer.byteLength(name, "utf8") > 128) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "tmux session_name must use the isolated hw-exp- namespace and fit 128 bytes");
  }
  return name;
}

function buildTmuxSessionName(runSpec, attemptId) {
  const binding = {
    project_id: runSpec.project_id,
    experiment_id: runSpec.experiment_id,
    attempt_id: attemptId,
  };
  const suffix = canonicalHash(binding).slice(0, 12);
  let readable = `hw-exp-${runSpec.project_id}-${runSpec.experiment_id}-${attemptId}`;
  while (readable && Buffer.byteLength(`${readable}-${suffix}`, "utf8") > 128) {
    readable = readable.slice(0, -1);
  }
  readable = readable.replace(/[-._]+$/g, "");
  if (!readable || readable === "hw-exp") {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", "tmux session binding cannot fit the portable limit");
  }
  return normalizeTmuxSessionName(`${readable}-${suffix}`);
}

function normalizeText(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 4096 || /[\0\r]/.test(value)) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", `${field} must be concise non-empty text`);
  }
  return value;
}

function normalizeReferenceText(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 1024 || /[\0\r\n]/.test(value)) {
    throw supervisionError("ERR_EXPERIMENT_REVIEW_INVALID", `${field} must be a safe non-empty reference`);
  }
  return value;
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw supervisionError("ERR_EXPERIMENT_SUPERVISION_INVALID", `${field} must be a positive safe integer`);
  }
  return value;
}

function clone(value) {
  return structuredClone(value);
}

function supervisionError(code, message) {
  return authorityError(code, message);
}
