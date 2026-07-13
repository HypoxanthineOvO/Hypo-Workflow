export const WORKSPACE_MANIFEST_PATH = ".pipeline/manifest.yaml";
export const WORKSPACE_MANIFEST_SCHEMA_VERSION = "1";
export const WORKSPACE_FORMAT = "hypo-workflow";
export const WORKSPACE_ZONES = Object.freeze({
  runtime: ".pipeline/runtime",
  memory: ".pipeline/memory",
  snapshots: ".pipeline/snapshots",
});

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ISO_WITH_TIMEZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function createWorkspaceManifest(input = {}) {
  const workspaceId = validateSafeId(input.workspace_id, "workspace_id");
  const projectId = validateSafeId(input.project_id, "project_id");
  const createdAt = normalizeCreatedAt(input.created_at ?? new Date().toISOString());

  return {
    schema_version: WORKSPACE_MANIFEST_SCHEMA_VERSION,
    format: WORKSPACE_FORMAT,
    workspace_id: workspaceId,
    project_id: projectId,
    created_at: createdAt,
    zones: { ...WORKSPACE_ZONES },
  };
}

export function validateWorkspaceManifest(value) {
  if (!isPlainObject(value)) throw manifestError("manifest must be a mapping");
  if (value.schema_version !== WORKSPACE_MANIFEST_SCHEMA_VERSION) {
    throw manifestError(`schema_version must be ${WORKSPACE_MANIFEST_SCHEMA_VERSION}`);
  }
  if (value.format !== WORKSPACE_FORMAT) {
    throw manifestError(`format must be ${WORKSPACE_FORMAT}`);
  }

  const normalized = createWorkspaceManifest({
    workspace_id: value.workspace_id,
    project_id: value.project_id,
    created_at: value.created_at,
  });
  if (!isPlainObject(value.zones)) throw manifestError("zones must be a mapping");
  const zoneNames = Object.keys(value.zones).sort();
  const expectedZoneNames = Object.keys(WORKSPACE_ZONES).sort();
  if (zoneNames.length !== expectedZoneNames.length || zoneNames.some((name, index) => name !== expectedZoneNames[index])) {
    throw manifestError(`zones must contain exactly: ${expectedZoneNames.join(", ")}`);
  }
  for (const [zone, expected] of Object.entries(WORKSPACE_ZONES)) {
    if (value.zones[zone] !== expected) {
      throw manifestError(`zones.${zone} must be ${expected}`);
    }
  }

  return {
    ...value,
    ...normalized,
    zones: { ...WORKSPACE_ZONES },
  };
}

export function isSafeWorkspaceComponent(value) {
  return typeof value === "string" && SAFE_ID.test(value);
}

function validateSafeId(value, field) {
  if (!isSafeWorkspaceComponent(value)) {
    throw manifestError(`${field} must be a safe single-component identifier`);
  }
  return value;
}

function normalizeCreatedAt(value) {
  const rendered = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (!ISO_WITH_TIMEZONE.test(rendered) || !Number.isFinite(Date.parse(rendered))) {
    throw manifestError("created_at must be a timezone-bearing ISO-8601 timestamp");
  }
  return rendered;
}

function manifestError(message) {
  const error = new Error(`Invalid workspace manifest: ${message}`);
  error.code = "ERR_WORKSPACE_MANIFEST_INVALID";
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
