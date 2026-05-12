const AUDIT_MEMORY_DIR = ".pipeline/audit-memory";
const SUMMARY_FIELDS = Object.freeze([
  "user_special_requirements",
  "project_rules_summary",
  "cycle_decisions",
  "local_special_requirements",
]);
const DEFAULT_SCOPED_FIELDS = Object.freeze([
  "local_special_requirements",
  "user_special_requirements",
  "project_rules_summary",
  "cycle_decisions",
  "source_refs",
]);

export function auditMemoryPath(cycleId) {
  const id = normalizeId(cycleId, "cycle");
  return `${AUDIT_MEMORY_DIR}/${id}-audit-memory.yaml`;
}

export function auditDeltaPath(milestoneId) {
  const id = normalizeId(milestoneId, "milestone");
  return `${AUDIT_MEMORY_DIR}/${id}-audit-delta.yaml`;
}

export function validateAuditMemory(memory = {}) {
  const errors = [];
  if (memory.schema_version !== 1) errors.push("schema_version must be 1");
  if (!memory.cycle_id) errors.push("cycle_id is required");

  requireStringArray(memory.source_authority, "source_authority", errors);
  for (const field of ["user_special_requirements", "project_rules_summary", "cycle_decisions"]) {
    requireArray(memory[field], field, errors);
  }

  const authority = new Set(memory.source_authority || []);
  for (const field of ["user_special_requirements", "project_rules_summary", "cycle_decisions"]) {
    if (!authority.has(field)) errors.push(`source_authority must include ${field}`);
  }

  if (memory.raw_conversation?.authority !== false) {
    errors.push("raw_conversation.authority must be false");
  }

  return { ok: errors.length === 0, errors };
}

export function mergeAuditMemoryForMilestone(cycleMemory = {}, milestoneDelta = {}) {
  return {
    schema_version: 1,
    cycle_id: cycleMemory.cycle_id || milestoneDelta.cycle_id || null,
    milestone_id: milestoneDelta.milestone_id || null,
    user_special_requirements: normalizeArray(cycleMemory.user_special_requirements),
    project_rules_summary: normalizeArray(cycleMemory.project_rules_summary),
    cycle_decisions: normalizeArray(cycleMemory.cycle_decisions),
    local_special_requirements: normalizeArray(milestoneDelta.local_special_requirements),
    scoped_visibility: milestoneDelta.scoped_visibility || {},
    authority: {
      inherits_cycle_memory: milestoneDelta.authority?.inherits_cycle_memory !== false,
      raw_freeform_is_authority: false,
    },
    raw_conversation: {
      ...(cycleMemory.raw_conversation || {}),
      authority: false,
    },
    source_refs: [
      milestoneDelta.cycle_memory_ref || auditMemoryPath(cycleMemory.cycle_id || milestoneDelta.cycle_id),
      auditDeltaPath(milestoneDelta.milestone_id),
    ].filter(Boolean),
  };
}

export function buildScopedAuditSummary(mergedMemory = {}, options = {}) {
  const role = String(options.role || "implement").trim() || "implement";
  const visibility = mergedMemory.scoped_visibility?.[role] || {};
  const include = new Set(visibility.include || DEFAULT_SCOPED_FIELDS);
  include.add("source_refs");

  const summary = {};
  for (const field of SUMMARY_FIELDS) {
    if (include.has(field)) summary[field] = normalizeArray(mergedMemory[field]).map(summaryText);
  }
  if (include.has("source_refs")) summary.source_refs = normalizeArray(mergedMemory.source_refs);

  return summary;
}

function requireStringArray(value, field, errors) {
  requireArray(value, field, errors);
  if (Array.isArray(value) && value.some((item) => typeof item !== "string")) {
    errors.push(`${field} must contain only strings`);
  }
}

function requireArray(value, field, errors) {
  if (!Array.isArray(value)) errors.push(`${field} must be an array`);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : [];
}

function summaryText(value) {
  if (typeof value === "string") return value;
  return value?.summary || value?.text || JSON.stringify(value);
}

function normalizeId(value, fallback) {
  const id = String(value || fallback).trim();
  return id || fallback;
}
