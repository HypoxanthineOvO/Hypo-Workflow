import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  containsForbiddenReasoning,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
} from "../runtime/internal.js";

export const WORKER_ROUTING_POLICY_VERSION = "worker-routing-v1";
export const WORKER_ROUTING_CLASSES = Object.freeze([
  "mechanical",
  "standard",
  "explore",
  "critical",
  "escalation",
]);

const ASSESSMENT_KEYS = Object.freeze([
  "schema_version",
  "complexity",
  "uncertainty",
  "oracle_strength",
  "blast_radius",
  "reversibility",
  "risk_flags",
  "summary",
]);
const ROUTING_INPUT_KEYS = Object.freeze([
  "role",
  "operation_kind",
  "task_kind",
  "change_size",
  "reversible",
  "risk_flags",
  "distinct_failed_routes",
  "assessment",
]);
const ROUTING_DECISION_KEYS = Object.freeze([
  "schema_version",
  "policy_version",
  "routing_class",
  "reason_codes",
  "source",
  "failure_state",
  "assessment",
]);
const FAILURE_STATE_KEYS = Object.freeze([
  "distinct_failed_route_ids",
  "distinct_failed_route_count",
  "escalation_threshold",
]);
const FAILURE_ATTEMPT_KEYS = Object.freeze(["route_id", "status", "failure_kind"]);
const ASSESSMENT_LEVELS = new Set(["low", "medium", "high"]);
const ORACLE_LEVELS = new Set(["strong", "mixed", "weak"]);
const REVERSIBILITY_LEVELS = new Set(["reversible", "guarded", "irreversible"]);
const ROUTING_MODES = new Set(["off", "advisory", "required"]);
const FAILURE_ESCALATION_THRESHOLD = 2;
const MAX_ROUTING_IDENTIFIER_BYTES = 128;
const MAX_FAILURE_ATTEMPTS = 256;
const MAX_DISTINCT_FAILED_ROUTE_IDS = 64;
const MECHANICAL_OPERATION_REASONS = new Map([
  ["status", "status_query"],
  ["format", "formatting"],
  ["read-only-summary", "read_only_summary"],
  ["deterministic-test-command", "deterministic_test_command"],
]);
const ROUTING_REASON_CLASSES = new Map([
  ["status_query", "mechanical"],
  ["formatting", "mechanical"],
  ["read_only_summary", "mechanical"],
  ["deterministic_test_command", "mechanical"],
  ["trivial_reversible_change", "mechanical"],
  ["nontrivial_change", "standard"],
  ["unknown_root", "explore"],
  ["candidate_comparison", "explore"],
  ["high_uncertainty", "explore"],
  ["exploratory_task", "explore"],
  ["weak_oracle", "critical"],
  ["independent_audit", "critical"],
  ["architecture", "critical"],
  ["recovery_conflict", "critical"],
  ["high_blast_radius", "critical"],
  ["risk_flags_present", "critical"],
  ["distinct_failed_routes_threshold_reached", "escalation"],
  ["security", "escalation"],
  ["migration", "escalation"],
  ["irreversible", "escalation"],
]);
const ROUTING_CLASS_RANK = new Map(WORKER_ROUTING_CLASSES.map((value, index) => [value, index]));

export function validateTaskAssessment(input) {
  assertPlainObject(input, "Task Assessment");
  assertExactKeys(input, ASSESSMENT_KEYS, "Task Assessment");
  assertNoRawSecrets(input, "Task Assessment");
  if (containsForbiddenReasoning(input)) {
    throw routingError("ERR_TASK_ASSESSMENT_INVALID", "Task Assessment must not contain hidden reasoning");
  }
  if (input.schema_version !== "1") {
    throw routingError("ERR_TASK_ASSESSMENT_INVALID", "Task Assessment schema_version must be 1");
  }
  for (const key of ["complexity", "uncertainty", "blast_radius"]) {
    const value = normalizeRoutingIdentifier(input[key], `Task Assessment ${key}`);
    if (!ASSESSMENT_LEVELS.has(value)) {
      throw routingError("ERR_TASK_ASSESSMENT_INVALID", `Task Assessment ${key} is unsupported`);
    }
  }
  const oracleStrength = normalizeRoutingIdentifier(input.oracle_strength, "Task Assessment oracle_strength");
  if (!ORACLE_LEVELS.has(oracleStrength)) {
    throw routingError("ERR_TASK_ASSESSMENT_INVALID", "Task Assessment oracle_strength is unsupported");
  }
  const reversibility = normalizeRoutingIdentifier(input.reversibility, "Task Assessment reversibility");
  if (!REVERSIBILITY_LEVELS.has(reversibility)) {
    throw routingError("ERR_TASK_ASSESSMENT_INVALID", "Task Assessment reversibility is unsupported");
  }
  const riskFlags = normalizeIdentifierList(input.risk_flags, "Task Assessment risk_flags", 16);
  if (
    typeof input.summary !== "string"
    || input.summary !== input.summary.trim()
    || !input.summary
    || /[\0\r]/.test(input.summary)
    || Buffer.byteLength(input.summary, "utf8") > 1024
  ) {
    throw routingError("ERR_TASK_ASSESSMENT_INVALID", "Task Assessment summary exceeds its bounded text schema");
  }
  if (/(?:api[_-]?key|credential|password|private[_-]?key|secret|token)[-:=][^\s,;]+/i.test(input.summary)) {
    throw routingError("ERR_TASK_ASSESSMENT_INVALID", "Task Assessment summary contains a secret-like value");
  }
  return normalizeCanonicalValue({
    schema_version: "1",
    complexity: input.complexity,
    uncertainty: input.uncertainty,
    oracle_strength: oracleStrength,
    blast_radius: input.blast_radius,
    reversibility,
    risk_flags: riskFlags,
    summary: input.summary,
  }, "Task Assessment");
}

export function selectWorkerRouting(input) {
  assertPlainObject(input, "Worker Routing input");
  assertExactKeys(input, ROUTING_INPUT_KEYS, "Worker Routing input");
  assertNoRawSecrets(input, "Worker Routing input");
  if (containsForbiddenReasoning(input)) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing input must not contain hidden reasoning");
  }
  const role = normalizeRoutingIdentifier(input.role, "Worker Routing role").toLowerCase();
  const operationKind = normalizeRoutingIdentifier(input.operation_kind, "Worker Routing operation_kind").toLowerCase();
  const taskKind = normalizeRoutingIdentifier(input.task_kind, "Worker Routing task_kind").toLowerCase();
  const changeSize = normalizeRoutingIdentifier(input.change_size, "Worker Routing change_size").toLowerCase();
  if (typeof input.reversible !== "boolean") {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing reversible must be boolean");
  }
  const riskFlags = normalizeIdentifierList(input.risk_flags, "Worker Routing risk_flags", 16);
  const assessment = input.assessment === undefined ? null : validateTaskAssessment(input.assessment);
  const failureState = normalizeFailureState(input.distinct_failed_routes);
  const classification = classifyRouting({
    role,
    operation_kind: operationKind,
    task_kind: taskKind,
    change_size: changeSize,
    reversible: input.reversible,
    risk_flags: [...new Set([...riskFlags, ...(assessment?.risk_flags ?? [])])],
    failure_state: failureState,
    assessment,
  });
  return {
    schema_version: "1",
    policy_version: WORKER_ROUTING_POLICY_VERSION,
    routing_class: classification.routing_class,
    reason_codes: classification.reason_codes,
    source: assessment ? "host_task_assessment" : "legacy_fields",
    failure_state: failureState,
    ...(assessment ? { assessment } : {}),
  };
}

export function resolveWorkerRoutingHandoff(input) {
  assertPlainObject(input, "Worker Routing handoff");
  assertExactKeys(input, ["mode", "host_capability", "decision"], "Worker Routing handoff");
  const mode = normalizeRoutingIdentifier(input.mode, "Worker Routing handoff mode").toLowerCase();
  if (!ROUTING_MODES.has(mode)) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing handoff mode is unsupported");
  }
  assertPlainObject(input.host_capability, "Worker Routing host_capability");
  assertExactKeys(input.host_capability, ["semantic_worker_routing"], "Worker Routing host_capability");
  if (typeof input.host_capability.semantic_worker_routing !== "boolean") {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing host capability must be boolean");
  }
  const decision = validateWorkerRoutingDecision(input.decision);
  const capabilitySupported = input.host_capability.semantic_worker_routing;
  if (mode === "off") {
    return {
      schema_version: "1",
      mode,
      capability_supported: capabilitySupported,
      status: "disabled",
      start_allowed: true,
      reason_code: "routing_off",
      fallback: false,
    };
  }
  if (!capabilitySupported && mode === "required") {
    return {
      schema_version: "1",
      mode,
      capability_supported: false,
      status: "blocked",
      start_allowed: false,
      reason_code: "host_capability_required",
      fallback: false,
      decision,
    };
  }
  if (!capabilitySupported) {
    return {
      schema_version: "1",
      mode,
      capability_supported: false,
      status: "fallback",
      start_allowed: true,
      reason_code: "host_capability_unavailable",
      fallback: true,
      decision,
    };
  }
  return {
    schema_version: "1",
    mode,
    capability_supported: true,
    status: "routed",
    start_allowed: true,
    reason_code: "host_capability_supported",
    fallback: false,
    decision,
  };
}

export function validateWorkerRoutingDecision(input) {
  assertPlainObject(input, "Worker Routing decision");
  assertExactKeys(input, ROUTING_DECISION_KEYS, "Worker Routing decision");
  assertNoRawSecrets(input, "Worker Routing decision");
  if (containsForbiddenReasoning(input)) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing decision must not contain hidden reasoning");
  }
  if (input.schema_version !== "1" || input.policy_version !== WORKER_ROUTING_POLICY_VERSION) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing decision schema or policy version is invalid");
  }
  const routingClass = normalizeRoutingIdentifier(input.routing_class, "Worker Routing decision class");
  if (!WORKER_ROUTING_CLASSES.includes(routingClass)) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing decision class is unsupported");
  }
  const reasonCodes = normalizeIdentifierList(input.reason_codes, "Worker Routing reason_codes", 16, { nonEmpty: true });
  if (reasonCodes.some((reason) => ROUTING_REASON_CLASSES.get(reason) !== routingClass)) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing reason codes do not match the routing class");
  }
  const source = normalizeRoutingIdentifier(input.source, "Worker Routing decision source");
  if (!new Set(["legacy_fields", "host_task_assessment"]).has(source)) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing decision source is unsupported");
  }
  const failureState = validatePersistedFailureState(input.failure_state);
  const assessment = input.assessment === undefined ? null : validateTaskAssessment(input.assessment);
  if ((source === "host_task_assessment") !== Boolean(assessment)) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing decision source and assessment do not match");
  }
  if (
    failureState.distinct_failed_route_count >= FAILURE_ESCALATION_THRESHOLD
    && !reasonCodes.includes("distinct_failed_routes_threshold_reached")
  ) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing failure escalation reason is missing");
  }
  const minimumClass = minimumPersistedRoutingClass(failureState, assessment);
  if (
    minimumClass
    && ROUTING_CLASS_RANK.get(routingClass) < ROUTING_CLASS_RANK.get(minimumClass)
  ) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing decision is below its persisted mandatory signals");
  }
  return {
    schema_version: "1",
    policy_version: WORKER_ROUTING_POLICY_VERSION,
    routing_class: routingClass,
    reason_codes: reasonCodes,
    source,
    failure_state: failureState,
    ...(assessment ? { assessment } : {}),
  };
}

function minimumPersistedRoutingClass(failureState, assessment) {
  if (failureState.distinct_failed_route_count >= FAILURE_ESCALATION_THRESHOLD) return "escalation";
  if (!assessment) return null;
  if (
    assessment.reversibility === "irreversible"
    || assessment.risk_flags.includes("security")
    || assessment.risk_flags.includes("migration")
  ) return "escalation";
  if (
    assessment.oracle_strength === "weak"
    || assessment.blast_radius === "high"
    || assessment.risk_flags.length > 0
  ) return "critical";
  if (assessment.uncertainty === "high") return "explore";
  return null;
}

function classifyRouting(input) {
  if (input.failure_state.distinct_failed_route_count >= FAILURE_ESCALATION_THRESHOLD) {
    return route("escalation", "distinct_failed_routes_threshold_reached");
  }
  if (input.task_kind === "security" || input.risk_flags.includes("security")) {
    return route("escalation", "security");
  }
  if (input.task_kind === "migration" || input.risk_flags.includes("migration")) {
    return route("escalation", "migration");
  }
  if (!input.reversible || input.assessment?.reversibility === "irreversible") {
    return route("escalation", "irreversible");
  }

  if (input.assessment?.oracle_strength === "weak") return route("critical", "weak_oracle");
  if (input.role === "audit" || input.operation_kind === "independent-audit" || input.task_kind === "audit") {
    return route("critical", "independent_audit");
  }
  if (input.task_kind === "architecture") return route("critical", "architecture");
  if (input.risk_flags.includes("recovery_conflict")) return route("critical", "recovery_conflict");
  if (input.assessment?.blast_radius === "high") return route("critical", "high_blast_radius");
  if (input.risk_flags.length) return route("critical", "risk_flags_present");

  if (input.task_kind === "unknown-root") return route("explore", "unknown_root");
  if (input.task_kind === "candidate-comparison" || input.operation_kind === "compare") {
    return route("explore", "candidate_comparison");
  }
  if (input.assessment?.uncertainty === "high") return route("explore", "high_uncertainty");
  if (input.task_kind === "exploration" || input.operation_kind === "investigate") {
    return route("explore", "exploratory_task");
  }

  const mechanicalOperationReason = MECHANICAL_OPERATION_REASONS.get(input.operation_kind);
  if (mechanicalOperationReason && input.reversible) {
    return route("mechanical", mechanicalOperationReason);
  }
  if (input.change_size === "trivial" && input.reversible) {
    return route("mechanical", "trivial_reversible_change");
  }
  return route("standard", "nontrivial_change");
}

function route(routingClass, reasonCode) {
  return { routing_class: routingClass, reason_codes: [reasonCode] };
}

function normalizeFailureState(input) {
  if (Number.isSafeInteger(input) && input >= 0) {
    return {
      distinct_failed_route_ids: [],
      distinct_failed_route_count: input,
      escalation_threshold: FAILURE_ESCALATION_THRESHOLD,
    };
  }
  if (!Array.isArray(input)) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing distinct_failed_routes must be a count or attempt array");
  }
  if (input.length > MAX_FAILURE_ATTEMPTS) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing distinct_failed_routes exceeds its bounded array schema");
  }
  const routeIds = [];
  for (const [index, attempt] of input.entries()) {
    const field = `Worker Routing distinct_failed_routes[${index}]`;
    assertPlainObject(attempt, field);
    assertExactKeys(attempt, FAILURE_ATTEMPT_KEYS, field);
    const routeId = normalizeRoutingIdentifier(attempt.route_id, `${field}.route_id`);
    const status = normalizeRoutingIdentifier(attempt.status, `${field}.status`);
    const failureKind = normalizeRoutingIdentifier(attempt.failure_kind, `${field}.failure_kind`);
    if (status === "failed" && failureKind === "route") routeIds.push(routeId);
  }
  const distinct = [...new Set(routeIds)].sort();
  if (distinct.length > MAX_DISTINCT_FAILED_ROUTE_IDS) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing distinct failed route ids exceed their bounded array schema");
  }
  return {
    distinct_failed_route_ids: distinct,
    distinct_failed_route_count: distinct.length,
    escalation_threshold: FAILURE_ESCALATION_THRESHOLD,
  };
}

function validatePersistedFailureState(input) {
  assertPlainObject(input, "Worker Routing failure_state");
  assertExactKeys(input, FAILURE_STATE_KEYS, "Worker Routing failure_state");
  const routeIds = normalizeIdentifierList(
    input.distinct_failed_route_ids,
    "Worker Routing failure_state.distinct_failed_route_ids",
    MAX_DISTINCT_FAILED_ROUTE_IDS,
  );
  if (
    !Number.isSafeInteger(input.distinct_failed_route_count)
    || input.distinct_failed_route_count < routeIds.length
    || input.distinct_failed_route_count < 0
    || input.escalation_threshold !== FAILURE_ESCALATION_THRESHOLD
  ) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing failure_state is invalid");
  }
  if (routeIds.length && routeIds.length !== input.distinct_failed_route_count) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", "Worker Routing failure_state route ids and count differ");
  }
  return {
    distinct_failed_route_ids: routeIds,
    distinct_failed_route_count: input.distinct_failed_route_count,
    escalation_threshold: FAILURE_ESCALATION_THRESHOLD,
  };
}

function normalizeIdentifierList(input, field, maxItems, options = {}) {
  if (!Array.isArray(input) || input.length > maxItems || (options.nonEmpty && input.length === 0)) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", `${field} exceeds its bounded array schema`);
  }
  const values = input.map((value, index) => normalizeRoutingIdentifier(value, `${field}[${index}]`));
  if (new Set(values).size !== values.length) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", `${field} contains duplicate identifiers`);
  }
  return values;
}

function normalizeRoutingIdentifier(value, field) {
  if (typeof value === "string" && Buffer.byteLength(value, "utf8") > MAX_ROUTING_IDENTIFIER_BYTES) {
    throw routingError("ERR_WORKER_ROUTING_INVALID", `${field} exceeds its bounded identifier schema`);
  }
  return normalizeSafeIdentifier(value, field);
}

function routingError(code, message) {
  return authorityError(code, message);
}
