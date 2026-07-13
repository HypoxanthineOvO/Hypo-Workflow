import { canonicalHash } from "../serialization/index.js";
import { createRecordPatch } from "../records/index.js";
import {
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  containsForbiddenReasoning,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
  normalizeSha256,
} from "../runtime/internal.js";
import {
  hashBytes,
  normalizeSafeRepoPath,
  readContainedFile,
} from "../recovery/shared.js";

const BOOTSTRAP_SCHEMA_VERSION = "1";
const CANDIDATE_KEYS = Object.freeze([
  "key",
  "source_class",
  "future_decision_risk",
  "current",
  "reviewed",
  "support",
  "sources",
  "supersedes",
  "record_patch",
]);
const CURATED_RECORD_KEYS = Object.freeze([...CANDIDATE_KEYS, "active"]);
const ELIGIBLE_SOURCE_CLASSES = new Set([
  "active_requirement",
  "accepted_outcome",
  "architecture_decision",
  "cross_cycle_constraint",
  "important_feedback_failure",
  "current_cycle_context",
]);
const FORBIDDEN_SOURCE_CLASSES = new Set([
  "raw_chat",
  "full_tool_log",
  "duplicate_report",
  "obsolete_intermediate_state",
  "private_live_data",
]);
const EXTRACTION_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "proposal_kind",
  "bootstrap_job_ref",
  "worker",
  "included",
  "excluded",
  "semantic_hash",
]);
const MERGE_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "proposal_kind",
  "bootstrap_job_ref",
  "proposal_refs",
  "included",
  "excluded",
  "semantic_hash",
]);
const CURATION_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "proposal_kind",
  "bootstrap_job_ref",
  "worker",
  "merge_hash",
  "records",
  "active_by_dedupe_key",
  "semantic_hash",
]);
const AUDIT_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "proposal_kind",
  "bootstrap_job_ref",
  "worker",
  "curation_hash",
  "status",
  "findings",
  "semantic_hash",
]);

export function createBootstrapProposal(input) {
  const normalizedInput = canonicalMapping(input, "Bootstrap extraction input");
  assertExactKeys(normalizedInput, ["bootstrap_job_ref", "worker", "candidates"], "Bootstrap extraction input");
  const bootstrapJobRef = normalizeBootstrapJobRef(normalizedInput.bootstrap_job_ref);
  const worker = normalizeWorker(normalizedInput.worker, "extractor");
  if (!Array.isArray(normalizedInput.candidates)) {
    throw bootstrapError("ERR_BOOTSTRAP_PROPOSAL_INVALID", "Bootstrap candidates must be an array");
  }
  const rawCandidates = normalizedInput.candidates.map((candidate, index) => (
    normalizeCandidateEnvelope(candidate, `Bootstrap candidates[${index}]`)
  ));
  assertUnique(rawCandidates.map((candidate) => candidate.key), "Bootstrap candidate keys");
  const historyNeeded = new Set(rawCandidates.flatMap((candidate) => candidate.supersedes));
  const included = [];
  const excluded = [];
  for (const candidate of rawCandidates) {
    const exclusion = classifyCandidateExclusion(candidate, historyNeeded);
    if (exclusion) {
      excluded.push(sanitizedExclusion(candidate, exclusion));
      continue;
    }
    included.push(normalizeIncludedCandidate(candidate));
  }
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "proposal",
    proposal_kind: "bootstrap_extraction",
    bootstrap_job_ref: bootstrapJobRef,
    worker,
    included: included.sort(compareCandidates),
    excluded: sortExclusions(excluded),
  };
  return freezeProposal(durable);
}

export function mergeBootstrapProposals(proposals) {
  if (!Array.isArray(proposals) || proposals.length === 0) {
    throw bootstrapError("ERR_BOOTSTRAP_PROPOSAL_INVALID", "Bootstrap merge requires extraction proposals");
  }
  const byWorker = new Map();
  for (const proposalInput of proposals) {
    const proposal = normalizeExtractionProposal(proposalInput);
    const workerKey = proposal.worker.id;
    const existing = byWorker.get(workerKey);
    if (existing && existing.semantic_hash !== proposal.semantic_hash) {
      throw bootstrapError("ERR_BOOTSTRAP_PROPOSAL_CONFLICT", "One extractor delivered conflicting Bootstrap proposals");
    }
    byWorker.set(workerKey, proposal);
  }
  const deliveries = [...byWorker.values()].sort((left, right) => left.worker.id.localeCompare(right.worker.id));
  const bootstrapJobRef = deliveries[0].bootstrap_job_ref;
  if (deliveries.some((proposal) => !sameRef(proposal.bootstrap_job_ref, bootstrapJobRef))) {
    throw bootstrapError("ERR_BOOTSTRAP_PROPOSAL_CONFLICT", "Bootstrap proposals belong to different jobs");
  }

  const included = new Map();
  const excluded = new Map();
  for (const proposal of deliveries) {
    for (const candidate of proposal.included) {
      const existing = included.get(candidate.key);
      if (existing && canonicalHash(existing) !== canonicalHash(candidate)) {
        throw bootstrapError("ERR_BOOTSTRAP_PROPOSAL_CONFLICT", "Bootstrap candidate key has conflicting deliveries");
      }
      included.set(candidate.key, candidate);
    }
    for (const entry of proposal.excluded) {
      const key = `${entry.key}\0${entry.source_class}\0${entry.reason}`;
      excluded.set(key, entry);
    }
  }
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "proposal",
    proposal_kind: "bootstrap_merge",
    bootstrap_job_ref: bootstrapJobRef,
    proposal_refs: deliveries.map((proposal) => ({
      worker: proposal.worker,
      semantic_hash: proposal.semantic_hash,
    })),
    included: [...included.values()].sort(compareCandidates),
    excluded: sortExclusions([...excluded.values()]),
  };
  return freezeProposal(durable);
}

export function curateBootstrapProposals(mergedInput, options) {
  const merged = normalizeMergeProposal(mergedInput);
  const normalizedOptions = canonicalMapping(options, "Bootstrap curation options");
  assertExactKeys(normalizedOptions, ["worker"], "Bootstrap curation options");
  const worker = normalizeWorker(normalizedOptions.worker, "curator");
  const graph = validateCandidateGraph(merged.included);
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "proposal",
    proposal_kind: "bootstrap_curation",
    bootstrap_job_ref: merged.bootstrap_job_ref,
    worker,
    merge_hash: merged.semantic_hash,
    records: merged.included.map((candidate) => ({
      ...cloneCanonical(candidate),
      active: graph.active_by_candidate.get(candidate.key),
    })).sort(compareCandidates),
    active_by_dedupe_key: graph.active_by_dedupe_key,
  };
  return freezeProposal(durable);
}

export async function auditBootstrapProposal(root, curationInput, options) {
  const curation = normalizeCurationProposal(curationInput, { validateRecords: false });
  const normalizedOptions = canonicalMapping(options, "Bootstrap audit options");
  assertExactKeys(normalizedOptions, ["worker"], "Bootstrap audit options");
  const worker = normalizeWorker(normalizedOptions.worker, "auditor");
  const findings = [];

  try {
    validateCandidateGraph(curation.records);
  } catch (error) {
    findings.push({ code: sanitizeFindingCode(error, "BOOTSTRAP_GRAPH_INVALID") });
  }
  for (const candidate of curation.records) {
    const candidateFindings = await auditCandidate(root, candidate);
    findings.push(...candidateFindings);
  }
  const normalizedFindings = uniqueFindings(findings);
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "proposal",
    proposal_kind: "bootstrap_audit",
    bootstrap_job_ref: curation.bootstrap_job_ref,
    worker,
    curation_hash: curation.semantic_hash,
    status: normalizedFindings.length ? "rejected" : "approved",
    findings: normalizedFindings,
  };
  return freezeProposal(durable);
}

export function normalizeExtractionProposal(value) {
  const input = canonicalMapping(value, "Bootstrap extraction proposal");
  assertExactKeys(input, EXTRACTION_KEYS, "Bootstrap extraction proposal");
  assertProposalHeader(input, "bootstrap_extraction");
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "proposal",
    proposal_kind: "bootstrap_extraction",
    bootstrap_job_ref: normalizeBootstrapJobRef(input.bootstrap_job_ref),
    worker: normalizeWorker(input.worker, "extractor"),
    included: normalizeCandidateArray(input.included, "Bootstrap extraction included"),
    excluded: normalizeExclusionArray(input.excluded),
  };
  assertSemanticHash(input.semantic_hash, durable, "Bootstrap extraction proposal");
  return freezeProposal(durable);
}

export function normalizeMergeProposal(value) {
  const input = canonicalMapping(value, "Bootstrap merge proposal");
  assertExactKeys(input, MERGE_KEYS, "Bootstrap merge proposal");
  assertProposalHeader(input, "bootstrap_merge");
  if (!Array.isArray(input.proposal_refs) || input.proposal_refs.length === 0) {
    throw bootstrapError("ERR_BOOTSTRAP_PROPOSAL_INVALID", "Bootstrap merge proposal refs must be non-empty");
  }
  const proposalRefs = input.proposal_refs.map((entry, index) => {
    const normalized = canonicalMapping(entry, `Bootstrap merge proposal_refs[${index}]`);
    assertExactKeys(normalized, ["worker", "semantic_hash"], `Bootstrap merge proposal_refs[${index}]`);
    return {
      worker: normalizeWorker(normalized.worker, "extractor"),
      semantic_hash: normalizeSha256(normalized.semantic_hash, "Bootstrap extraction semantic_hash"),
    };
  }).sort((left, right) => left.worker.id.localeCompare(right.worker.id));
  assertUnique(proposalRefs.map((entry) => entry.worker.id), "Bootstrap merge worker refs");
  const included = normalizeCandidateArray(input.included, "Bootstrap merge included");
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "proposal",
    proposal_kind: "bootstrap_merge",
    bootstrap_job_ref: normalizeBootstrapJobRef(input.bootstrap_job_ref),
    proposal_refs: proposalRefs,
    included,
    excluded: normalizeExclusionArray(input.excluded),
  };
  assertSemanticHash(input.semantic_hash, durable, "Bootstrap merge proposal");
  return freezeProposal(durable);
}

export function normalizeCurationProposal(value, { validateRecords = true } = {}) {
  const input = canonicalMapping(value, "Bootstrap curation proposal");
  assertExactKeys(input, CURATION_KEYS, "Bootstrap curation proposal");
  assertProposalHeader(input, "bootstrap_curation");
  const records = normalizeCuratedRecordArray(input.records, "Bootstrap curation records", { validateRecords });
  const activeByDedupeKey = normalizeActiveMap(input.active_by_dedupe_key);
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "proposal",
    proposal_kind: "bootstrap_curation",
    bootstrap_job_ref: normalizeBootstrapJobRef(input.bootstrap_job_ref),
    worker: normalizeWorker(input.worker, "curator"),
    merge_hash: normalizeSha256(input.merge_hash, "Bootstrap curation merge_hash"),
    records,
    active_by_dedupe_key: activeByDedupeKey,
  };
  assertSemanticHash(input.semantic_hash, durable, "Bootstrap curation proposal");
  const expected = validateCandidateGraph(records);
  if (canonicalHash(expected.active_by_dedupe_key) !== canonicalHash(activeByDedupeKey)) {
    throw bootstrapError("ERR_BOOTSTRAP_CURATION_INVALID", "Bootstrap curation active map does not match its supersedes graph");
  }
  for (const record of records) {
    if (record.active !== expected.active_by_candidate.get(record.key)) {
      throw bootstrapError("ERR_BOOTSTRAP_CURATION_INVALID", "Bootstrap curation Record active flag does not match its supersedes graph");
    }
  }
  return freezeProposal(durable);
}

export function normalizeAuditProposal(value) {
  const input = canonicalMapping(value, "Bootstrap audit proposal");
  assertExactKeys(input, AUDIT_KEYS, "Bootstrap audit proposal");
  assertProposalHeader(input, "bootstrap_audit");
  if (!new Set(["approved", "rejected"]).has(input.status)) {
    throw bootstrapError("ERR_BOOTSTRAP_AUDIT_INVALID", "Bootstrap audit status is invalid");
  }
  const findings = normalizeFindings(input.findings);
  if ((input.status === "approved") !== (findings.length === 0)) {
    throw bootstrapError("ERR_BOOTSTRAP_AUDIT_INVALID", "Bootstrap audit status conflicts with its findings");
  }
  const durable = {
    schema_version: BOOTSTRAP_SCHEMA_VERSION,
    authority_role: "proposal",
    proposal_kind: "bootstrap_audit",
    bootstrap_job_ref: normalizeBootstrapJobRef(input.bootstrap_job_ref),
    worker: normalizeWorker(input.worker, "auditor"),
    curation_hash: normalizeSha256(input.curation_hash, "Bootstrap audit curation_hash"),
    status: input.status,
    findings,
  };
  assertSemanticHash(input.semantic_hash, durable, "Bootstrap audit proposal");
  return freezeProposal(durable);
}

export function normalizeBootstrapJobRef(value) {
  const input = canonicalMapping(value, "bootstrap_job_ref");
  assertExactKeys(input, ["kind", "id"], "bootstrap_job_ref");
  if (input.kind !== "bootstrap_job") {
    throw bootstrapError("ERR_BOOTSTRAP_JOB_REF_INVALID", "Bootstrap job ref kind must be bootstrap_job");
  }
  const id = normalizeSafeIdentifier(input.id, "bootstrap_job_ref.id");
  assertNoRawSecrets(id, "bootstrap_job_ref.id");
  return { kind: "bootstrap_job", id };
}

export async function verifyCurationSources(root, curationInput) {
  const curation = normalizeCurationProposal(curationInput);
  const findings = [];
  for (const candidate of curation.records) {
    for (const source of candidate.sources) {
      try {
        const file = await readContainedFile(root, source.locator, "Bootstrap source locator");
        if (`sha256:${hashBytes(file.content)}` !== source.digest) {
          findings.push({ code: "BOOTSTRAP_SOURCE_DRIFT", candidate_key: candidate.key });
        }
      } catch (error) {
        findings.push({ code: sourceFindingCode(error), candidate_key: candidate.key });
      }
    }
  }
  const normalized = uniqueFindings(findings);
  if (normalized.length) {
    throw bootstrapError("ERR_BOOTSTRAP_SOURCE_DRIFT", "Bootstrap source evidence no longer matches the audited proposal", {
      findings: normalized,
    });
  }
  return curation;
}

function normalizeCandidateEnvelope(value, field, { validateRecords = false } = {}) {
  const input = canonicalMapping(value, field);
  assertExactKeys(input, CANDIDATE_KEYS, field);
  const key = normalizeCandidateKey(input.key, `${field}.key`);
  const sourceClass = normalizeSafeIdentifier(input.source_class, `${field}.source_class`);
  const futureDecisionRisk = normalizeSafeIdentifier(input.future_decision_risk, `${field}.future_decision_risk`);
  const current = normalizeCurrentMarker(input.current, `${field}.current`);
  if (typeof input.reviewed !== "boolean") {
    throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", "Bootstrap candidate reviewed must be boolean");
  }
  const support = normalizeCanonicalValue(input.support, `${field}.support`);
  assertNoRawSecrets({ key, source_class: sourceClass, future_decision_risk: futureDecisionRisk, support }, field);
  if (containsForbiddenReasoning(support)) {
    throw bootstrapError("ERR_HIDDEN_REASONING_FORBIDDEN", "Bootstrap candidate support contains hidden reasoning fields");
  }
  if (input.record_patch && (Object.hasOwn(input.record_patch, "id") || Object.hasOwn(input.record_patch, "record_id"))) {
    throw authorityError("ERR_RECORD_CALLER_ID_FORBIDDEN", "Bootstrap Record Patch must not contain a caller-supplied id or record_id");
  }
  const sources = normalizeSources(input.sources, field, {
    allowEmpty: FORBIDDEN_SOURCE_CLASSES.has(sourceClass) && input.record_patch === null,
  });
  const supersedes = normalizeCandidateEdges(input.supersedes, field);
  if (input.record_patch !== null && (!input.record_patch || typeof input.record_patch !== "object" || Array.isArray(input.record_patch))) {
    throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", "Bootstrap candidate record_patch must be a mapping or null");
  }
  const recordPatch = input.record_patch === null
    ? null
    : normalizeCanonicalValue(input.record_patch, `${field}.record_patch`);
  const candidate = {
    key,
    source_class: sourceClass,
    future_decision_risk: futureDecisionRisk,
    current,
    reviewed: input.reviewed,
    support,
    sources,
    supersedes,
    record_patch: recordPatch,
  };
  return validateRecords && recordPatch !== null ? normalizeIncludedCandidate(candidate) : candidate;
}

function normalizeIncludedCandidate(candidate) {
  if (isInvalidRecordPatch(candidate.record_patch)) {
    return {
      ...candidate,
      sources: canonicalizeUnboundSources(candidate.sources),
      record_patch: normalizeInvalidRecordPatch(candidate.record_patch),
    };
  }
  try {
    if (containsForbiddenReasoning(candidate.record_patch) || containsBootstrapHiddenContext(candidate.record_patch)) {
      throw authorityError("ERR_HIDDEN_REASONING_FORBIDDEN", "Bootstrap Record Patch contains hidden-context fields");
    }
    assertNoRawSecrets(candidate.record_patch, "Bootstrap Record Patch", { allowSecretRefs: true });
    const patch = createRecordPatch({ ...candidate.record_patch, supersedes: [] });
    const sources = bindSourcesToRecordPatch(candidate.sources, patch.source_refs);
    return {
      ...candidate,
      sources,
      record_patch: patch,
    };
  } catch (error) {
    if (error?.code === "ERR_RECORD_CALLER_ID_FORBIDDEN") throw error;
    return {
      ...candidate,
      sources: canonicalizeUnboundSources(candidate.sources),
      record_patch: invalidRecordPatchMarker(candidate, error),
    };
  }
}

function invalidRecordPatchMarker(candidate, error) {
  return {
    authority_role: "invalid_candidate",
    invalid_reason: invalidReasonForError(error),
    dedupe_key: sanitizeInvalidDedupeKey(candidate.record_patch?.dedupe_key, candidate.key),
  };
}

function normalizeInvalidRecordPatch(value) {
  const input = canonicalMapping(value, "Bootstrap invalid Record Patch marker");
  assertExactKeys(input, ["authority_role", "invalid_reason", "dedupe_key"], "Bootstrap invalid Record Patch marker");
  if (input.authority_role !== "invalid_candidate") {
    throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", "Bootstrap invalid Record Patch marker authority role is invalid");
  }
  if (!new Set(["secret", "hidden_reasoning", "schema_invalid"]).has(input.invalid_reason)) {
    throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", "Bootstrap invalid Record Patch marker reason is invalid");
  }
  return {
    authority_role: "invalid_candidate",
    invalid_reason: input.invalid_reason,
    dedupe_key: normalizeDedupeKey(input.dedupe_key, "Bootstrap invalid Record Patch marker.dedupe_key"),
  };
}

function isInvalidRecordPatch(value) {
  return Boolean(value) && typeof value === "object" && value.authority_role === "invalid_candidate";
}

function invalidReasonForError(error) {
  if (error?.code === "ERR_RAW_SECRET_FORBIDDEN") return "secret";
  if (error?.code === "ERR_HIDDEN_REASONING_FORBIDDEN") return "hidden_reasoning";
  return "schema_invalid";
}

function containsBootstrapHiddenContext(value, seen = new Set()) {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return true;
  seen.add(value);
  if (Array.isArray(value)) {
    const found = value.some((entry) => containsBootstrapHiddenContext(entry, seen));
    seen.delete(value);
    return found;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeMetadataLabel(key);
    if (new Set([
      "chain_of_thought",
      "hidden_reasoning",
      "private_reasoning",
      "rationale_dump",
      "scratchpad",
    ]).has(normalized)) {
      seen.delete(value);
      return true;
    }
    if (containsBootstrapHiddenContext(nested, seen)) {
      seen.delete(value);
      return true;
    }
  }
  seen.delete(value);
  return false;
}

function invalidMarkerFindingCode(marker) {
  if (marker.invalid_reason === "secret") return "BOOTSTRAP_RECORD_SECRET";
  if (marker.invalid_reason === "hidden_reasoning") return "BOOTSTRAP_RECORD_HIDDEN_CONTEXT";
  return "BOOTSTRAP_RECORD_SCHEMA_INVALID";
}

function sanitizeInvalidDedupeKey(value, candidateKey) {
  try {
    return normalizeDedupeKey(value, "Bootstrap invalid Record Patch dedupe_key");
  } catch {
    return `invalid_candidate:${canonicalHash(candidateKey).slice(0, 16)}`;
  }
}

function canonicalizeUnboundSources(sources) {
  return sources.map((source) => ({
    type: source.type ?? "legacy_file",
    ref: source.ref ?? normalizeSourceProvenanceRef(source.locator, "Bootstrap inferred invalid source.ref"),
    locator: source.locator,
    digest: source.digest,
  })).sort(compareSources);
}

function normalizeCandidateArray(value, field, options = {}) {
  if (!Array.isArray(value)) throw bootstrapError("ERR_BOOTSTRAP_PROPOSAL_INVALID", `${field} must be an array`);
  const candidates = value.map((candidate, index) => (
    normalizeCandidateEnvelope(candidate, `${field}[${index}]`, { validateRecords: options.validateRecords !== false })
  )).sort(compareCandidates);
  assertUnique(candidates.map((candidate) => candidate.key), `${field} keys`);
  return candidates;
}

function normalizeCuratedRecordArray(value, field, options = {}) {
  if (!Array.isArray(value)) throw bootstrapError("ERR_BOOTSTRAP_PROPOSAL_INVALID", `${field} must be an array`);
  const records = value.map((record, index) => {
    const input = canonicalMapping(record, `${field}[${index}]`);
    assertExactKeys(input, CURATED_RECORD_KEYS, `${field}[${index}]`);
    if (typeof input.active !== "boolean") {
      throw bootstrapError("ERR_BOOTSTRAP_CURATION_INVALID", "Bootstrap curated Record active must be boolean");
    }
    const candidateInput = Object.fromEntries(CANDIDATE_KEYS.map((key) => [key, input[key]]));
    const candidate = normalizeCandidateEnvelope(candidateInput, `${field}[${index}]`, {
      validateRecords: options.validateRecords !== false,
    });
    return { ...candidate, active: input.active };
  }).sort(compareCandidates);
  assertUnique(records.map((record) => record.key), `${field} keys`);
  return records;
}

function classifyCandidateExclusion(candidate, historyNeeded) {
  if (FORBIDDEN_SOURCE_CLASSES.has(candidate.source_class)) return forbiddenSourceReason(candidate.source_class);
  if (!ELIGIBLE_SOURCE_CLASSES.has(candidate.source_class)) return "unsupported_source_class";
  if (!candidate.reviewed) return "not_reviewed";
  if (candidate.future_decision_risk !== "material") return "non_material_future_risk";
  if (!isCurrent(candidate.current) && !isHistoryMarker(candidate.current) && !historyNeeded.has(candidate.key)) {
    return "not_current_or_history_needed";
  }
  if (!isSupportSufficient(candidate.support)) return "insufficient_support";
  if (candidate.record_patch === null) return "missing_record_patch";
  return null;
}

function forbiddenSourceReason(sourceClass) {
  return `${sourceClass}_not_imported`;
}

function validateCandidateGraph(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw bootstrapError("ERR_BOOTSTRAP_CURATION_INVALID", "Bootstrap curation requires at least one Record proposal");
  }
  const byKey = new Map(candidates.map((candidate) => [candidate.key, candidate]));
  if (byKey.size !== candidates.length) {
    throw bootstrapError("ERR_BOOTSTRAP_CURATION_INVALID", "Bootstrap curation contains duplicate candidate keys");
  }
  const superseded = new Set();
  for (const candidate of candidates) {
    if (!candidate.record_patch) {
      throw bootstrapError("ERR_BOOTSTRAP_CURATION_INVALID", "Bootstrap curation Record proposal is missing record_patch");
    }
    for (const targetKey of candidate.supersedes) {
      const target = byKey.get(targetKey);
      if (!target) throw bootstrapError("ERR_BOOTSTRAP_CURATION_BROKEN_EDGE", "Bootstrap curation supersedes edge is broken");
      if (candidateDedupeKey(target) !== candidateDedupeKey(candidate)) {
        throw bootstrapError("ERR_BOOTSTRAP_CURATION_BROKEN_EDGE", "Bootstrap curation supersedes crosses dedupe keys");
      }
      superseded.add(targetKey);
    }
    assertCandidateAcyclic(candidate.key, byKey, new Set());
  }
  const groups = new Map();
  for (const candidate of candidates) {
    const dedupeKey = candidateDedupeKey(candidate);
    if (!groups.has(dedupeKey)) groups.set(dedupeKey, []);
    groups.get(dedupeKey).push(candidate);
  }
  const active = [];
  const activeByCandidate = new Map(candidates.map((candidate) => [candidate.key, false]));
  for (const [dedupeKey, entries] of groups) {
    const leaves = entries.filter((candidate) => !superseded.has(candidate.key));
    if (leaves.length !== 1 || !isCurrent(leaves[0].current)) {
      throw bootstrapError("ERR_BOOTSTRAP_CURATION_ACTIVE_CONFLICT", "Each Bootstrap dedupe key must have exactly one current active leaf");
    }
    activeByCandidate.set(leaves[0].key, true);
    active.push([dedupeKey, leaves[0].key]);
  }
  return {
    active_by_dedupe_key: Object.fromEntries(active.sort(([left], [right]) => left.localeCompare(right))),
    active_by_candidate: activeByCandidate,
  };
}

function candidateDedupeKey(candidate) {
  if (isInvalidRecordPatch(candidate.record_patch)) {
    return normalizeInvalidRecordPatch(candidate.record_patch).dedupe_key;
  }
  return candidate.record_patch.dedupe_key;
}

function assertCandidateAcyclic(key, byKey, ancestors) {
  if (ancestors.has(key)) throw bootstrapError("ERR_BOOTSTRAP_CURATION_CYCLE", "Bootstrap curation supersedes graph contains a cycle");
  const candidate = byKey.get(key);
  if (!candidate) return;
  const next = new Set(ancestors).add(key);
  for (const target of candidate.supersedes) assertCandidateAcyclic(target, byKey, next);
}

async function auditCandidate(root, candidate) {
  const findings = [];
  if (!candidate.reviewed || candidate.future_decision_risk !== "material" || !isSupportSufficient(candidate.support)) {
    findings.push({ code: "BOOTSTRAP_SUPPORT_INSUFFICIENT", candidate_key: candidate.key });
  }
  if (candidate.support === "inferred") {
    findings.push({ code: "BOOTSTRAP_UNSUPPORTED_INFERENCE", candidate_key: candidate.key });
  }
  if (!ELIGIBLE_SOURCE_CLASSES.has(candidate.source_class) || FORBIDDEN_SOURCE_CLASSES.has(candidate.source_class)) {
    findings.push({ code: "BOOTSTRAP_SOURCE_CLASS_FORBIDDEN", candidate_key: candidate.key });
  }
  if (isInvalidRecordPatch(candidate.record_patch)) {
    findings.push({ code: invalidMarkerFindingCode(candidate.record_patch), candidate_key: candidate.key });
  } else {
    try {
      const normalized = normalizeIncludedCandidate(candidate);
      if (
        normalized.record_patch.confidence === "low"
        || normalized.record_patch.confidence === 0
      ) {
        findings.push({ code: "BOOTSTRAP_UNSUPPORTED_INFERENCE", candidate_key: candidate.key });
      }
    } catch (error) {
      findings.push({ code: recordFindingCode(error), candidate_key: candidate.key });
    }
    if (!hasCompleteSourceCoverage(candidate.sources, candidate.record_patch?.source_refs)) {
      findings.push({ code: "BOOTSTRAP_SOURCE_COVERAGE_INCOMPLETE", candidate_key: candidate.key });
    }
  }
  for (const source of candidate.sources) {
    try {
      const file = await readContainedFile(root, source.locator, "Bootstrap source locator");
      if (`sha256:${hashBytes(file.content)}` !== source.digest) {
        findings.push({ code: "BOOTSTRAP_SOURCE_DRIFT", candidate_key: candidate.key });
      }
    } catch (error) {
      findings.push({ code: sourceFindingCode(error), candidate_key: candidate.key });
    }
  }
  return findings;
}

function normalizeSources(value, field, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", "Bootstrap candidate sources must be non-empty");
  }
  const sources = value.map((entry, index) => {
    const normalized = canonicalMapping(entry, `${field}.sources[${index}]`);
    const keys = Object.keys(normalized).sort();
    const canonicalShape = sameKeys(keys, ["digest", "locator", "ref", "type"]);
    const sha256Shape = sameKeys(keys, ["locator", "ref", "sha256", "type"]);
    const legacySha256Shape = sameKeys(keys, ["locator", "sha256"]);
    if (!canonicalShape && !sha256Shape && !legacySha256Shape) {
      throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", "Bootstrap source contains unsupported fields");
    }
    const digestInput = canonicalShape
      ? normalizeDigestValue(normalized.digest, `${field}.sources[${index}].digest`)
      : `sha256:${normalizeSha256(normalized.sha256, `${field}.sources[${index}].sha256`)}`;
    const explicitProvenance = !legacySha256Shape;
    return {
      type: explicitProvenance
        ? normalizeSourceType(normalized.type, `${field}.sources[${index}].type`)
        : null,
      ref: explicitProvenance
        ? normalizeSourceProvenanceRef(normalized.ref, `${field}.sources[${index}].ref`)
        : null,
      locator: normalizeSafeRepoPath(normalized.locator, `${field}.sources[${index}].locator`),
      digest: digestInput,
    };
  }).sort(compareSources);
  assertUnique(sources.map(sourceIdentity), "Bootstrap sources");
  const digestsByLocator = new Map();
  for (const source of sources) {
    const existing = digestsByLocator.get(source.locator);
    if (existing && existing !== source.digest) {
      throw bootstrapError("ERR_BOOTSTRAP_SOURCE_CONFLICT", "Bootstrap source locator has conflicting digests");
    }
    digestsByLocator.set(source.locator, source.digest);
  }
  return sources;
}

function bindSourcesToRecordPatch(sources, sourceRefs) {
  const bound = sources.map((source) => {
    if (source.type !== null && source.ref !== null) return source;
    const matches = sourceRefs.filter((sourceRef) => sourceRef.locator === source.locator);
    if (matches.length !== 1) {
      throw bootstrapError("ERR_BOOTSTRAP_SOURCE_COVERAGE", "Legacy SHA-256 source must resolve to exactly one Record provenance ref");
    }
    return {
      type: normalizeSourceType(matches[0].type, "Bootstrap inferred source.type"),
      ref: normalizeSourceProvenanceRef(matches[0].ref, "Bootstrap inferred source.ref"),
      locator: source.locator,
      digest: source.digest,
    };
  }).sort(compareSources);
  if (!hasCompleteSourceCoverage(bound, sourceRefs)) {
    throw bootstrapError("ERR_BOOTSTRAP_SOURCE_COVERAGE", "Bootstrap Record Patch provenance is not fully bound to audited sources");
  }
  return bound;
}

function hasCompleteSourceCoverage(sources, sourceRefs) {
  if (!Array.isArray(sourceRefs) || sourceRefs.length === 0) return false;
  const sourceKeys = new Set(sources.map(sourceIdentity));
  const refKeys = new Set(sourceRefs.map((sourceRef) => sourceIdentity({
    type: sourceRef.type,
    ref: sourceRef.ref,
    locator: sourceRef.locator,
  })));
  return sourceKeys.size === refKeys.size
    && [...sourceKeys].every((key) => refKeys.has(key))
    && [...refKeys].every((key) => sourceKeys.has(key));
}

function normalizeSourceType(value, field) {
  if (value !== "legacy_file") {
    throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", `${field} must be legacy_file`);
  }
  return "legacy_file";
}

function normalizeSourceProvenanceRef(value, field) {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !value
    || value.length > 1024
    || /[\0\r\n\\]/.test(value)
    || value.startsWith("/")
    || /^[A-Za-z]:[\\/]/.test(value)
    || value.split("/").some((part) => part === "." || part === "..")
  ) {
    throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", `${field} must be a safe logical provenance reference`);
  }
  assertNoRawSecrets(value, field);
  const normalized = normalizeMetadataLabel(value);
  if (containsHiddenOrSensitiveMetadata(normalized)) {
    throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", `${field} contains secret or hidden-context metadata`);
  }
  return value;
}

function normalizeDigestValue(value, field) {
  if (typeof value !== "string" || !value.startsWith("sha256:")) {
    throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", `${field} must use sha256:<64hex>`);
  }
  return `sha256:${normalizeSha256(value.slice(7), field)}`;
}

function containsHiddenOrSensitiveMetadata(value) {
  const padded = `_${value}_`;
  return [
    "chain_of_thought",
    "hidden_reasoning",
    "private_reasoning",
    "scratchpad",
    "api_key",
    "access_key",
    "credential",
    "credentials",
    "password",
    "passwd",
    "private_key",
    "raw_secret",
    "secret",
    "session_token",
    "token",
  ].some((label) => padded.includes(`_${label}_`));
}

function normalizeMetadataLabel(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sourceIdentity(source) {
  return `${source.type ?? ""}\0${source.ref ?? ""}\0${source.locator}`;
}

function compareSources(left, right) {
  return sourceIdentity(left).localeCompare(sourceIdentity(right));
}

function sameKeys(actual, expected) {
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function normalizeCandidateEdges(value, field) {
  if (!Array.isArray(value)) throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", "Bootstrap candidate supersedes must be an array");
  const edges = value.map((entry, index) => normalizeCandidateKey(entry, `${field}.supersedes[${index}]`)).sort();
  assertUnique(edges, "Bootstrap candidate supersedes");
  return edges;
}

function normalizeCurrentMarker(value, field) {
  if (typeof value === "boolean") return value;
  if (new Set(["current", "history_needed", "obsolete"]).has(value)) return value;
  throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", `${field} must be boolean or a supported current-state marker`);
}

function normalizeCandidateKey(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !/^[A-Za-z0-9][A-Za-z0-9._:@+-]*$/.test(value) || value.length > 256) {
    throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", `${field} must be a safe logical key`);
  }
  return value;
}

function normalizeDedupeKey(value, field) {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !/^[A-Za-z0-9][A-Za-z0-9._:/#@+-]*$/.test(value)
    || value.length > 256
    || value.startsWith("/")
    || value.includes("\\")
    || value.split("/").some((part) => part === "..")
  ) {
    throw bootstrapError("ERR_BOOTSTRAP_CANDIDATE_INVALID", `${field} must be a safe dedupe key`);
  }
  assertNoRawSecrets(value, field);
  return value;
}

function normalizeWorker(value, expectedRole) {
  const input = canonicalMapping(value, `Bootstrap ${expectedRole} worker`);
  assertExactKeys(input, ["role", "id"], `Bootstrap ${expectedRole} worker`);
  if (input.role !== expectedRole) {
    throw bootstrapError("ERR_BOOTSTRAP_WORKER_ROLE", `Bootstrap worker role must be ${expectedRole}`);
  }
  const id = normalizeSafeIdentifier(input.id, `Bootstrap ${expectedRole} worker.id`);
  assertNoRawSecrets(id, `Bootstrap ${expectedRole} worker.id`);
  return { role: expectedRole, id };
}

function normalizeExclusionArray(value) {
  if (!Array.isArray(value)) throw bootstrapError("ERR_BOOTSTRAP_PROPOSAL_INVALID", "Bootstrap exclusions must be an array");
  return sortExclusions(value.map((entry, index) => {
    const normalized = canonicalMapping(entry, `Bootstrap exclusions[${index}]`);
    assertExactKeys(normalized, ["key", "source_class", "reason"], `Bootstrap exclusions[${index}]`);
    return {
      key: normalizeCandidateKey(normalized.key, `Bootstrap exclusions[${index}].key`),
      source_class: normalizeSafeIdentifier(normalized.source_class, `Bootstrap exclusions[${index}].source_class`),
      reason: normalizeSafeIdentifier(normalized.reason, `Bootstrap exclusions[${index}].reason`),
    };
  }));
}

function normalizeActiveMap(value) {
  const input = canonicalMapping(value, "Bootstrap active_by_dedupe_key");
  const entries = Object.entries(input).map(([key, candidateKey]) => [
    normalizeDedupeKey(key, "Bootstrap active_by_dedupe_key key"),
    normalizeCandidateKey(candidateKey, "Bootstrap active_by_dedupe_key value"),
  ]).sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(entries);
}

function normalizeFindings(value) {
  if (!Array.isArray(value)) throw bootstrapError("ERR_BOOTSTRAP_AUDIT_INVALID", "Bootstrap audit findings must be an array");
  return uniqueFindings(value.map((entry, index) => {
    const normalized = canonicalMapping(entry, `Bootstrap audit findings[${index}]`);
    assertExactKeys(normalized, ["code", "candidate_key"], `Bootstrap audit findings[${index}]`);
    if (typeof normalized.code !== "string" || !/^BOOTSTRAP_[A-Z0-9_]+$/.test(normalized.code)) {
      throw bootstrapError("ERR_BOOTSTRAP_AUDIT_INVALID", "Bootstrap audit finding code is invalid");
    }
    return {
      code: normalized.code,
      ...(normalized.candidate_key === undefined ? {} : {
        candidate_key: normalizeCandidateKey(normalized.candidate_key, "Bootstrap audit finding candidate_key"),
      }),
    };
  }));
}

function normalizeActiveStatus(value) {
  return value === true || value === "current";
}

function isCurrent(value) {
  return normalizeActiveStatus(value);
}

function isHistoryMarker(value) {
  return value === "history_needed";
}

function isSupportSufficient(value) {
  if (value === true) return true;
  if (typeof value === "number") return Number.isFinite(value) && value >= 0.7;
  if (typeof value === "string") {
    return new Set([
      "sufficient",
      "direct",
      "observed",
      "inferred",
      "corroborated",
      "confirmed",
      "high",
    ]).has(value);
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const marker = value.status ?? value.level ?? value.confidence ?? value.kind;
    return isSupportSufficient(marker) || value.sufficient === true;
  }
  return false;
}

function sanitizedExclusion(candidate, reason) {
  return { key: candidate.key, source_class: candidate.source_class, reason };
}

function sortExclusions(entries) {
  return [...entries].sort((left, right) => (
    `${left.key}\0${left.source_class}\0${left.reason}`.localeCompare(`${right.key}\0${right.source_class}\0${right.reason}`)
  ));
}

function uniqueFindings(findings) {
  const unique = new Map();
  for (const finding of findings) {
    const normalized = {
      code: finding.code,
      ...(finding.candidate_key === undefined ? {} : { candidate_key: finding.candidate_key }),
    };
    unique.set(`${normalized.code}\0${normalized.candidate_key ?? ""}`, normalized);
  }
  return [...unique.values()].sort((left, right) => (
    `${left.code}\0${left.candidate_key ?? ""}`.localeCompare(`${right.code}\0${right.candidate_key ?? ""}`)
  ));
}

function sourceFindingCode(error) {
  if (error?.code === "ERR_RECOVERY_REFERENCE_MISSING") return "BOOTSTRAP_SOURCE_MISSING";
  if (error?.code === "ERR_RECOVERY_PATH_FORBIDDEN") return "BOOTSTRAP_SOURCE_PATH_FORBIDDEN";
  return "BOOTSTRAP_SOURCE_UNREADABLE";
}

function recordFindingCode(error) {
  if (error?.code === "ERR_RAW_SECRET_FORBIDDEN") return "BOOTSTRAP_RECORD_SECRET";
  if (error?.code === "ERR_HIDDEN_REASONING_FORBIDDEN") return "BOOTSTRAP_RECORD_HIDDEN_CONTEXT";
  if (error?.code === "ERR_BOOTSTRAP_SOURCE_COVERAGE") return "BOOTSTRAP_SOURCE_COVERAGE_INCOMPLETE";
  return "BOOTSTRAP_RECORD_SCHEMA_INVALID";
}

function sanitizeFindingCode(error, fallback) {
  if (typeof error?.code === "string" && /^ERR_BOOTSTRAP_CURATION_(?:BROKEN_EDGE|CYCLE|ACTIVE_CONFLICT)$/.test(error.code)) {
    return error.code.replace(/^ERR_/, "");
  }
  return fallback;
}

function assertProposalHeader(value, kind) {
  if (
    value.schema_version !== BOOTSTRAP_SCHEMA_VERSION
    || value.authority_role !== "proposal"
    || value.proposal_kind !== kind
  ) {
    throw bootstrapError("ERR_BOOTSTRAP_PROPOSAL_INVALID", "Bootstrap proposal header is invalid");
  }
}

function assertSemanticHash(actual, durable, field) {
  const digest = normalizeSha256(actual, `${field}.semantic_hash`);
  if (digest !== canonicalHash(durable)) {
    throw bootstrapError("ERR_BOOTSTRAP_PROPOSAL_INTEGRITY", `${field} semantic hash does not match its content`);
  }
}

function freezeProposal(durable) {
  return deepFreeze({ ...cloneCanonical(durable), semantic_hash: canonicalHash(durable) });
}

function canonicalMapping(value, field) {
  assertPlainObject(value, field);
  return normalizeCanonicalValue(value, field);
}

function cloneCanonical(value) {
  return normalizeCanonicalValue(value, "Bootstrap canonical value");
}

function compareCandidates(left, right) {
  return left.key.localeCompare(right.key);
}

function sameRef(left, right) {
  return left.kind === right.kind && left.id === right.id;
}

function assertUnique(values, field) {
  if (new Set(values).size !== values.length) {
    throw bootstrapError("ERR_BOOTSTRAP_PROPOSAL_CONFLICT", `${field} must be unique`);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function bootstrapError(code, message, details) {
  const error = authorityError(code, message);
  if (details !== undefined) error.details = deepFreeze(cloneCanonical(details));
  return error;
}
