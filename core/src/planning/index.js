import { canonicalHash } from "../serialization/index.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
} from "../runtime/internal.js";

const COMMON_KEYS = Object.freeze([
  "id",
  "title",
  "outcome",
  "acceptance_criteria",
  "constraints",
  "evidence",
  "revision",
]);

export function compileGoalDesign(input) {
  const common = normalizePlanInput(input, COMMON_KEYS, "Goal Design");
  return finalizePlan({
    schema_version: "1",
    delivery_kind: "goal",
    status: "draft",
    ...common,
    design: {
      outcome: common.outcome,
      acceptance_criteria: common.acceptance_criteria,
      constraints: common.constraints,
      evidence: common.evidence,
    },
  });
}

export function compileCyclePlan(input) {
  const common = normalizePlanInput(input, [...COMMON_KEYS, "milestones"], "Cycle Plan");
  if (!Array.isArray(input.milestones) || input.milestones.length === 0) {
    throw deliverySchemaError("Cycle Plan milestones must be a non-empty array");
  }
  const known = new Set();
  const milestones = input.milestones.map((value, index) => {
    assertPlainObject(value, `Cycle Plan milestones[${index}]`);
    assertExactKeys(value, ["id", "title", "outcome", "verification_criteria", "depends_on"], `Cycle Plan milestones[${index}]`);
    const id = normalizeSafeIdentifier(value.id, `Cycle Plan milestones[${index}].id`);
    if (known.has(id)) throw deliverySchemaError(`Cycle Plan milestone ${id} is duplicated`);
    const dependsOn = stringArray(value.depends_on, `Cycle Plan milestones[${index}].depends_on`, { allowEmpty: true, identifiers: true });
    if (dependsOn.some((dependency) => !known.has(dependency))) {
      throw deliverySchemaError(`Cycle Plan milestone ${id} depends on a missing or later milestone`);
    }
    known.add(id);
    return {
      id,
      order: index + 1,
      title: text(value.title, `Cycle Plan milestones[${index}].title`),
      outcome: text(value.outcome, `Cycle Plan milestones[${index}].outcome`),
      verification_criteria: stringArray(value.verification_criteria, `Cycle Plan milestones[${index}].verification_criteria`),
      depends_on: dependsOn,
    };
  });
  return finalizePlan({
    schema_version: "1",
    delivery_kind: "cycle",
    status: "draft",
    ...common,
    milestones,
    acceptance: {
      scope: "cycle",
      criteria: common.acceptance_criteria,
    },
  });
}

export function selectAdaptivePlan(input) {
  assertPlainObject(input, "adaptive plan input");
  assertExactKeys(input, ["delivery_kind", "model_capability", "complexity", "durable_research"], "adaptive plan input");
  if (input.delivery_kind === "goal") {
    return {
      mode: "goal_design",
      internal_phases: ["design"],
      discoverable_command: null,
    };
  }
  if (input.delivery_kind !== "cycle") throw deliverySchemaError("adaptive plan delivery_kind must be goal or cycle");
  if (input.durable_research === true) {
    return {
      mode: "cycle_deep",
      durable: true,
      internal_phases: ["deep_plan", "discover", "technical_stack", "architecture", "decompose", "generate"],
      discoverable_command: null,
    };
  }
  return {
    mode: "cycle_standard",
    durable: false,
    internal_phases: ["discover", "technical_stack", "architecture", "decompose", "generate"],
    discoverable_command: null,
  };
}

export function assessPlanReadiness(input) {
  assertPlainObject(input, "plan readiness input");
  if (Object.hasOwn(input, "min_rounds")) {
    throw deliverySchemaError("min_rounds is unsupported; readiness is evidence-based rather than round-based");
  }
  assertExactKeys(input, ["delivery_kind", "evidence", "ambiguities"], "plan readiness input");
  if (!["goal", "cycle"].includes(input.delivery_kind)) throw deliverySchemaError("plan readiness delivery_kind must be goal or cycle");
  if (!Array.isArray(input.evidence)) throw deliverySchemaError("plan readiness evidence must be an array");
  if (!Array.isArray(input.ambiguities)) throw deliverySchemaError("plan readiness ambiguities must be an array");
  const unresolved = input.ambiguities.map((value, index) => {
    assertPlainObject(value, `ambiguities[${index}]`);
    assertExactKeys(value, ["id", "prompt", "material", "resolved", "challenge"], `ambiguities[${index}]`);
    return {
      id: normalizeSafeIdentifier(value.id, `ambiguities[${index}].id`),
      prompt: text(value.prompt, `ambiguities[${index}].prompt`),
      material: value.material === true,
      resolved: value.resolved === true,
      challenge: text(value.challenge, `ambiguities[${index}].challenge`),
    };
  }).filter((item) => item.material && !item.resolved);
  return {
    status: unresolved.length ? "ask" : "ready",
    unresolved_material: unresolved.map((item) => item.id),
    questions: unresolved.map((item) => item.prompt),
    challenge_questions: unresolved.map((item) => item.challenge),
  };
}

function normalizePlanInput(input, allowed, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, allowed, field);
  assertNoRawSecrets(input, field);
  const revision = input.revision;
  if (!Number.isSafeInteger(revision) || revision < 0) throw deliverySchemaError(`${field} revision must be a non-negative integer`);
  if (!Array.isArray(input.acceptance_criteria) || input.acceptance_criteria.length === 0) {
    throw deliverySchemaError(`${field} acceptance_criteria must be a non-empty array`);
  }
  const acceptanceCriteria = input.acceptance_criteria.map((value, index) => {
    assertPlainObject(value, `${field} acceptance_criteria[${index}]`);
    assertExactKeys(value, ["id", "statement", "verification"], `${field} acceptance_criteria[${index}]`);
    return {
      id: normalizeSafeIdentifier(value.id, `${field} acceptance_criteria[${index}].id`),
      statement: text(value.statement, `${field} acceptance_criteria[${index}].statement`),
      verification: text(value.verification, `${field} acceptance_criteria[${index}].verification`),
    };
  });
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) throw deliverySchemaError(`${field} evidence must be a non-empty array`);
  const evidence = input.evidence.map((value, index) => {
    assertPlainObject(value, `${field} evidence[${index}]`);
    assertExactKeys(value, ["type", "ref", "summary"], `${field} evidence[${index}]`);
    return {
      type: normalizeSafeIdentifier(value.type, `${field} evidence[${index}].type`),
      ref: text(value.ref, `${field} evidence[${index}].ref`),
      summary: text(value.summary, `${field} evidence[${index}].summary`),
    };
  });
  return normalizeCanonicalValue({
    id: normalizeSafeIdentifier(input.id, `${field}.id`),
    title: text(input.title, `${field}.title`),
    outcome: text(input.outcome, `${field}.outcome`),
    acceptance_criteria: acceptanceCriteria,
    constraints: stringArray(input.constraints, `${field}.constraints`, { allowEmpty: true }),
    evidence,
    revision,
  }, field);
}

function finalizePlan(value) {
  const canonical = normalizeCanonicalValue(value, "compiled plan");
  return { ...canonical, plan_hash: canonicalHash(canonical) };
}

function stringArray(value, field, options = {}) {
  if (!Array.isArray(value) || (!options.allowEmpty && value.length === 0)) throw deliverySchemaError(`${field} must be ${options.allowEmpty ? "an" : "a non-empty"} array`);
  return value.map((entry, index) => options.identifiers
    ? normalizeSafeIdentifier(entry, `${field}[${index}]`)
    : text(entry, `${field}[${index}]`));
}

function text(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value) throw deliverySchemaError(`${field} must be non-empty text`);
  return value;
}

function deliverySchemaError(message) {
  return authorityError("ERR_DELIVERY_SCHEMA_INVALID", message);
}
