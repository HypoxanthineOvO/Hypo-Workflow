// LEGACY (C026, 2026-08-14): C12–C19 阶段制 Plan 机器。
// 日常语义 Cycle 不再调用本模块；仅旧宿主/迁移兼容保留，见 .pipeline/legacy/INDEX.md。
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

export function compilePlan(input) {
  return compileMilestonePlan(input, {
    field: "Plan",
    deliveryMode: "plan",
    requireStone: true,
  });
}

export function compileCyclePlan(input) {
  return compileMilestonePlan(input, {
    field: "Cycle Plan",
    deliveryMode: "cycle",
    requireStone: false,
  });
}

function compileMilestonePlan(input, options) {
  const { field, deliveryMode, requireStone } = options;
  const common = normalizePlanInput(input, [...COMMON_KEYS, "milestones"], field);
  if (!Array.isArray(input.milestones) || input.milestones.length === 0) {
    throw deliverySchemaError(`${field} milestones must be a non-empty array`);
  }
  const known = new Set();
  const milestones = input.milestones.map((value, index) => {
    const milestoneField = `${field} milestones[${index}]`;
    assertPlainObject(value, milestoneField);
    assertExactKeys(value, ["id", "title", "outcome", "verification_criteria", "depends_on", "stone"], milestoneField);
    const id = normalizeSafeIdentifier(value.id, `${milestoneField}.id`);
    if (known.has(id)) throw deliverySchemaError(`${field} milestone ${id} is duplicated`);
    const dependsOn = stringArray(value.depends_on, `${milestoneField}.depends_on`, { allowEmpty: true, identifiers: true });
    if (dependsOn.some((dependency) => !known.has(dependency))) {
      throw deliverySchemaError(`${field} milestone ${id} depends on a missing or later milestone`);
    }
    known.add(id);
    return {
      id,
      order: index + 1,
      title: text(value.title, `${milestoneField}.title`),
      outcome: text(value.outcome, `${milestoneField}.outcome`),
      verification_criteria: stringArray(value.verification_criteria, `${milestoneField}.verification_criteria`),
      depends_on: dependsOn,
      ...(value.stone === undefined ? {} : { stone: normalizeStone(value.stone, `${milestoneField}.stone`) }),
    };
  });
  const stoneCount = milestones.filter((milestone) => milestone.stone).length;
  if (requireStone && stoneCount === 0) {
    throw deliverySchemaError("Plan requires at least one Stone for manual inspection");
  }
  return finalizePlan({
    schema_version: "1",
    delivery_kind: "cycle",
    delivery_mode: deliveryMode,
    status: "draft",
    ...common,
    milestones,
    acceptance: {
      scope: deliveryMode,
      criteria: common.acceptance_criteria,
    },
  });
}

export function selectDeliveryMode(input) {
  assertPlainObject(input, "delivery mode input");
  assertExactKeys(input, ["stones"], "delivery mode input");
  if (!Array.isArray(input.stones)) throw deliverySchemaError("delivery mode stones must be an array");
  return {
    delivery_kind: input.stones.length === 0 ? "goal" : "plan",
    stone_count: input.stones.length,
    reason: input.stones.length === 0 ? "no_manual_intermediate_check" : "manual_intermediate_check_required",
  };
}

function normalizeStone(value, field) {
  assertPlainObject(value, field);
  assertExactKeys(value, ["id", "review", "acceptance_criteria"], field);
  return {
    id: normalizeSafeIdentifier(value.id, `${field}.id`),
    review: text(value.review, `${field}.review`),
    acceptance_criteria: stringArray(value.acceptance_criteria, `${field}.acceptance_criteria`),
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
