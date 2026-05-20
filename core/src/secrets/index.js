import { sanitizeProjection } from "../knowledge/projections.js";

export function buildSecretCapabilityProjection(input = {}) {
  const sourceRefs = Array.isArray(input.secret_refs) ? input.secret_refs : asArray(input.secrets);
  const secret_refs = sourceRefs.map((secret) => {
    const id = safeString(secret.id || secret.name);
    return {
      id,
      provider: secret.provider || null,
      kind: secret.kind || null,
      scope: secret.scope || null,
      capabilities: normalizeList(secret.capabilities),
      allowed_for: normalizeList(secret.allowed_for || secret.usage?.allowed_for),
      dependent_projects: normalizeList(secret.dependent_projects || secret.usage?.dependent_projects),
      health: {
        status: secret.health?.status || "unknown",
        checked_at: secret.health?.checked_at ?? null,
      },
      redaction_policy: {
        raw_projected: false,
        mode: "metadata_only",
      },
      secret_ref: {
        store_ref: secret.secret_ref?.store_ref || `local_secret:${id}`,
        metadata_only: true,
      },
      evidence_refs: normalizeList(secret.evidence_refs),
    };
  });

  return sanitizeProjection({
    projection: "secret_capabilities",
    generated_at: input.generated_at || null,
    raw_values_projected: false,
    secret_refs,
  });
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => safeString(item)).filter(Boolean);
  if (!value) return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeString(value) {
  return String(value || "").trim();
}
