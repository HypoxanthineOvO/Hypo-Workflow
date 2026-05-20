const FORBIDDEN_PROJECTION_KEYS = new Set([
  "raw_value",
  "value",
  "token",
  "api_key",
  "password",
  "authorization",
  "access_token",
  "refresh_token",
  "client_secret",
  "secret",
]);

const RAW_CONTAINER_KEYS = new Set([
  "raw_records",
  "raw_knowledge_records",
  "raw_secret_store",
  "details",
  "messages",
  "endpoint",
]);

const ACCEPTED_STATUSES = new Set(["accepted", "approved", "authoritative"]);

export function buildGlobalKnowledgeProjection(input = {}) {
  const entries = [];

  for (const surface of asArray(input.project_surfaces)) {
    const objectId = safeString(surface.object_id || surface.project_id || surface.id || "project");
    if (surface.compact) {
      const compact = surface.compact;
      entries.push(projectedEntry({
        id: `${objectId}.compact`,
        type: "knowledge_compact",
        title: compact.title || `${objectId} Knowledge Compact`,
        summary: compact.summary,
        freshness: compact.freshness,
        authority: "project_compact_surface",
        source_ref: compact.path,
        evidence_refs: normalizeRefs(compact.evidence_refs || (compact.path ? [compact.path] : [])),
      }));
    }

    for (const index of asArray(surface.indexes)) {
      for (const entry of asArray(index.entries)) {
        entries.push(projectedEntry({
          id: `${objectId}.${entry.id || entry.record_id || stableEntryId(entry.title || entry.summary)}`,
          type: index.category || entry.category || "knowledge_index_entry",
          title: entry.title,
          summary: entry.summary,
          sensitivity: entry.sensitivity,
          freshness: entry.freshness || index.freshness,
          authority: entry.authority || "project_index_surface",
          source_ref: entry.source_ref || index.path,
          evidence_refs: entry.evidence_refs || index.evidence_refs || (index.path ? [index.path] : []),
        }));
      }
    }
  }

  for (const record of asArray(input.global_authored_records)) {
    entries.push(projectedEntry({
      id: record.id || `global.${stableEntryId(record.title || record.summary)}`,
      type: record.category || record.type || "global_authored_record",
      title: record.title,
      summary: record.summary,
      sensitivity: record.sensitivity,
      freshness: record.freshness,
      authority: record.authority || "global_authored_record",
      source_ref: record.source_ref || record.path,
      evidence_refs: record.evidence_refs || (record.path ? [record.path] : []),
    }));
  }

  for (const candidate of asArray(input.consolidation_candidates)) {
    if (!isAccepted(candidate)) continue;
    entries.push(projectedEntry({
      id: candidate.id || `gcc.${stableEntryId(candidate.title || candidate.summary)}`,
      type: candidate.type || "consolidation_candidate",
      title: candidate.title,
      summary: candidate.summary,
      sensitivity: candidate.sensitivity?.classification || candidate.sensitivity,
      freshness: candidate.freshness,
      status: candidate.status,
      authority: candidate.authority || "accepted_consolidation_candidate",
      source_ref: candidate.source_ref,
      evidence_refs: candidate.evidence_refs || candidate.source_record_refs || [],
    }));
  }

  return sanitizeProjection({
    projection: "global_knowledge",
    generated_at: input.generated_at || null,
    raw_project_records_copied: false,
    entries,
  });
}

export function buildInfrastructureFactProjection(input = {}) {
  return sanitizeProjection({
    projection: "infrastructure_facts",
    generated_at: input.generated_at || null,
    raw_details_projected: false,
    facts: asArray(input.facts).map((fact) => compactObject({
      id: fact.id,
      kind: fact.kind,
      title: fact.title,
      summary: fact.summary,
      sensitivity: fact.sensitivity,
      freshness: fact.freshness,
      authority: fact.authority,
      source_ref: fact.source_ref || fact.path,
      evidence_refs: normalizeRefs(fact.evidence_refs || fact.source_record_refs),
    })),
  });
}

export function buildNotionProjectableGlobalSummary(input = {}) {
  const knowledgeEntries = asArray(input.global_knowledge_projection?.entries)
    .filter((entry) => isAcceptedForNotion(entry))
    .map((entry) => compactObject({
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      sensitivity: entry.sensitivity,
      evidence_refs: normalizeRefs(entry.evidence_refs),
    }));

  const secretRefs = asArray(input.secret_capability_projection?.secret_refs)
    .map((ref) => compactObject({
      id: ref.id,
      provider: ref.provider,
      allowed_for: normalizeRefs(ref.allowed_for),
      health: compactObject({
        status: ref.health?.status || "unknown",
        checked_at: ref.health?.checked_at ?? null,
      }),
      redaction_policy: {
        raw_projected: false,
        mode: "metadata_only",
      },
      secret_ref: {
        store_ref: ref.secret_ref?.store_ref || `local_secret:${ref.id}`,
        metadata_only: true,
      },
    }));

  const blocks = [
    ...knowledgeEntries.map((entry) => compactObject({
      type: "summary",
      id: entry.id,
      text: [entry.title, entry.summary].filter(Boolean).join(": "),
      evidence_refs: entry.evidence_refs,
    })),
    ...secretRefs.map((ref) => compactObject({
      type: "secret_ref",
      id: ref.id,
      text: `${ref.id || ref.provider}: metadata-only ${ref.secret_ref.store_ref}`,
    })),
  ];

  return sanitizeProjection({
    projection: "notion_global_summary",
    generated_at: input.generated_at || null,
    remote_writes_enabled: false,
    raw_knowledge_projected: false,
    raw_secret_store_projected: false,
    summaries: knowledgeEntries,
    secret_refs: secretRefs,
    blocks,
  });
}

export function sanitizeProjection(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeProjection(item))
      .filter((item) => item !== undefined);
  }
  if (!value || typeof value !== "object") {
    return sanitizeScalar(value);
  }

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = normalizeKey(key);
    if (FORBIDDEN_PROJECTION_KEYS.has(normalizedKey)) continue;
    if (RAW_CONTAINER_KEYS.has(normalizedKey)) continue;
    const sanitized = sanitizeProjection(child);
    if (sanitized === undefined) continue;
    result[key] = sanitized;
  }
  return compactObject(result);
}

function projectedEntry(entry) {
  return compactObject({
    id: entry.id,
    type: entry.type,
    title: entry.title,
    summary: entry.summary,
    sensitivity: entry.sensitivity,
    freshness: entry.freshness,
    status: entry.status,
    authority: entry.authority,
    source_ref: entry.source_ref,
    evidence_refs: normalizeRefs(entry.evidence_refs),
  });
}

function isAccepted(candidate) {
  return ACCEPTED_STATUSES.has(safeString(candidate.status || "accepted").toLowerCase());
}

function isAcceptedForNotion(entry) {
  if (!entry || entry.projection === "raw_record" || entry.status === "raw") return false;
  if (entry.authority === "project_raw_record") return false;
  if (entry.status && !isAccepted(entry)) return false;
  return true;
}

function sanitizeScalar(value) {
  if (typeof value !== "string") return value;
  if (looksLikeSecretValue(value)) return "[REDACTED]";
  return value;
}

function looksLikeSecretValue(value) {
  const text = String(value || "");
  return [
    /\bBearer\s+[A-Za-z0-9._~+/=-]+/i,
    /\bsk-[A-Za-z0-9._-]{8,}/i,
    /\bsecret_[A-Za-z0-9._-]*(token|key|password|secret)[A-Za-z0-9._-]*/i,
    /\b(raw|provider)-[A-Za-z0-9._-]*(token|secret|password)[A-Za-z0-9._-]*/i,
  ].some((pattern) => pattern.test(text));
}

function normalizeRefs(value) {
  return asArray(value).map((item) => safeString(item)).filter(Boolean);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactObject(object) {
  const result = {};
  for (const [key, value] of Object.entries(object || {})) {
    if (value === undefined) continue;
    if (value === null) {
      result[key] = value;
      continue;
    }
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;
    result[key] = value;
  }
  return result;
}

function stableEntryId(value) {
  const slug = safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "entry";
}

function normalizeKey(key) {
  return safeString(key).trim().toLowerCase();
}

function safeString(value) {
  return String(value || "").trim();
}
