import {
  assertExactKeys,
  assertPlainObject,
  authorityError,
  normalizeSafeIdentifier,
} from "../runtime/internal.js";

export function selectExecutionTopology(input) {
  assertPlainObject(input, "execution topology input");
  assertExactKeys(input, [
    "task_kind",
    "change_size",
    "reversible",
    "policy",
    "custom_roles",
    "coupling",
    "parallelizable",
    "independent_oracle",
  ], "execution topology input");
  assertPlainObject(input.policy, "execution topology policy");
  assertExactKeys(input.policy, ["profile", "allow_solo_verified"], "execution topology policy");
  const taskKind = normalizeSafeIdentifier(input.task_kind, "execution topology task_kind");
  let profile;
  let roles;
  if (input.policy.profile === "custom") {
    profile = "custom";
    roles = normalizeRoles(input.custom_roles, "custom_roles");
  } else if (input.policy.profile === "strict") {
    profile = "strict";
    roles = ["test", "implement", "audit"];
  } else if (
    taskKind === "migration"
    && input.parallelizable === true
    && input.coupling !== "high"
  ) {
    profile = "migration";
    roles = ["extractor", "curator", "auditor", "deterministic-writer"];
  } else if (
    input.policy.profile === "solo-verified"
    && input.policy.allow_solo_verified === true
  ) {
    profile = "solo-verified";
    roles = ["implement"];
  } else if (
    input.parallelizable === true
    && input.coupling === "low"
    && input.independent_oracle === true
  ) {
    profile = "strict";
    roles = ["test", "implement", "audit"];
  } else if (input.independent_oracle === true) {
    profile = "independent-audit";
    roles = ["implement", "audit"];
  } else {
    profile = "solo-verified";
    roles = ["implement"];
  }
  const separation = profile !== "solo-verified";
  return {
    schema_version: "1",
    profile,
    required_roles: roles,
    verification_required: true,
    separation_required: separation,
    identity_constraints: separation ? rolePairs(roles) : [],
  };
}

export function assessExecutionEvidence({ topology, evidence }) {
  assertPlainObject(topology, "execution topology");
  if (!Array.isArray(topology.required_roles) || !Array.isArray(topology.identity_constraints)) {
    throw authorityError("ERR_DELIVERY_EVIDENCE_INCOMPLETE", "execution topology is missing required roles or identity constraints");
  }
  if (!Array.isArray(evidence)) throw authorityError("ERR_DELIVERY_EVIDENCE_INCOMPLETE", "worker evidence must be an array");
  const normalized = evidence.map((item, index) => normalizeWorkerEvidence(item, index));
  const completedByRole = new Map();
  for (const item of normalized) {
    if (item.status === "completed" && !completedByRole.has(item.role)) completedByRole.set(item.role, item);
  }
  const missingRoles = topology.required_roles.filter((role) => !completedByRole.has(role));
  const collisions = [];
  for (const pair of topology.identity_constraints) {
    const [leftRole, rightRole] = pair;
    const left = completedByRole.get(leftRole);
    const right = completedByRole.get(rightRole);
    if (left && right && left.worker_id === right.worker_id) collisions.push(`${leftRole} and ${rightRole} share worker identity ${left.worker_id}`);
  }
  const selected = topology.required_roles.map((role) => completedByRole.get(role)).filter(Boolean);
  return {
    ready: missingRoles.length === 0 && collisions.length === 0,
    missing_roles: missingRoles,
    identity_collisions: collisions,
    roles: selected.map((item) => item.role),
    evidence_refs: selected.flatMap((item) => item.evidence_refs),
    evidence: normalized,
  };
}

function normalizeRoles(value, field) {
  if (!Array.isArray(value) || value.length === 0) throw authorityError("ERR_DELIVERY_SCHEMA_INVALID", `${field} must be a non-empty array`);
  const roles = value.map((role, index) => normalizeSafeIdentifier(role, `${field}[${index}]`));
  if (new Set(roles).size !== roles.length) throw authorityError("ERR_DELIVERY_SCHEMA_INVALID", `${field} contains duplicate roles`);
  return roles;
}

function normalizeWorkerEvidence(value, index) {
  const field = `worker evidence[${index}]`;
  assertPlainObject(value, field);
  assertExactKeys(value, ["role", "worker_id", "status", "evidence_refs"], field);
  if (!Array.isArray(value.evidence_refs) || value.evidence_refs.length === 0) {
    throw authorityError("ERR_DELIVERY_EVIDENCE_INCOMPLETE", `${field}.evidence_refs must be non-empty`);
  }
  return {
    role: normalizeSafeIdentifier(value.role, `${field}.role`),
    worker_id: normalizeSafeIdentifier(value.worker_id, `${field}.worker_id`),
    status: normalizeSafeIdentifier(value.status, `${field}.status`),
    evidence_refs: value.evidence_refs.map((ref, refIndex) => {
      assertPlainObject(ref, `${field}.evidence_refs[${refIndex}]`);
      assertExactKeys(ref, ["type", "path", "digest"], `${field}.evidence_refs[${refIndex}]`);
      if (ref.type !== "file" || typeof ref.path !== "string" || !ref.path.startsWith(".pipeline/") || !/^sha256:[a-f0-9]{64}$/.test(ref.digest)) {
        throw authorityError("ERR_DELIVERY_EVIDENCE_INTEGRITY", `${field} contains an invalid file evidence binding`);
      }
      return { type: "file", path: ref.path, digest: ref.digest };
    }),
  };
}

function rolePairs(roles) {
  const pairs = [];
  for (let left = 0; left < roles.length; left += 1) {
    for (let right = left + 1; right < roles.length; right += 1) pairs.push([roles[left], roles[right]]);
  }
  return pairs;
}
