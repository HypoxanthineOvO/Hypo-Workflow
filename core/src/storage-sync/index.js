import { createHash } from "node:crypto";
import { hasText, isPlainObject } from "../utils/index.js";

const PROJECT_HOME_SLOT_DEFINITIONS = Object.freeze([
  { id: "overview", title: "Overview", authority: "derived", projections: ["summary", "overview"], kinds: ["project_overview"] },
  { id: "progress", title: "Progress", authority: "local_workflow", projections: ["timeline"], kinds: ["progress"] },
  { id: "architecture", title: "Architecture", authority: "local_workflow", projections: ["architecture"], kinds: ["architecture"] },
  { id: "knowledge", title: "Knowledge", authority: "local_workflow", projections: ["knowledge"], kinds: ["knowledge"] },
  { id: "docs", title: "Docs", authority: "local_workflow", projections: ["docs"], kinds: ["docs"] },
  { id: "prompts_index", title: "Prompts index", authority: "local_workflow", projections: ["prompt"], kinds: ["prompt"] },
  { id: "reports_index", title: "Reports index", authority: "local_workflow", projections: ["report"], kinds: ["report"] },
  { id: "legacy_links", title: "Legacy links", authority: "merge_input", projections: ["archive"], kinds: ["cycle_archive"] },
  { id: "sync_status", title: "Sync status", authority: "computed", projections: ["state"], kinds: ["current_state"] },
]);

const REQUIRED_SLOT_IDS = Object.freeze(PROJECT_HOME_SLOT_DEFINITIONS.map((slot) => slot.id));
const ALLOWED_SLOT_AUTHORITIES = Object.freeze([
  "local_workflow",
  "derived",
  "workspace_yaml",
  "merge_input",
  "computed",
]);
const FORBIDDEN_TEMPLATE_KEYS = /^(notion_.*|page_id|block_id|rich_text|property_id|database_id)$/i;
const SECRET_KEY_PATTERN = /(^|_|\b)(authorization|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|notion[_-]?token|token|password|passwd|secret|private[_-]?key|credential)s?($|_|\b)/i;
const SECRET_VALUE_PATTERN = /\b(?:bearer\s+[a-z0-9._~+/=-]+|api[_-]?key\s*=\s*[^,\s;]+|token\s*=\s*[^,\s;]+|password\s*=\s*[^,\s;]+|secret[_-]?[a-z0-9._~+/=-]{8,})/i;
const REDACTED = "[REDACTED]";

export function buildStorageSyncTemplate(input = {}, options = {}) {
  const workspace = input.workspace || {};
  const project = input.project || findProject(workspace, options);
  const objectId = String(project?.id || options.objectId || options.object_id || "unknown-project");
  const entries = toArray(input.artifactCatalog?.entries)
    .filter((entry) => String(entry?.object_id || objectId) === objectId);

  const slots = PROJECT_HOME_SLOT_DEFINITIONS.map((definition) => buildSlot(definition, entries, workspace, objectId));
  const template = {
    kind: "storage_sync_template",
    model: "backend-neutral-projection",
    schema_version: "1",
    object_id: objectId,
    generated_at: options.now || null,
    project_home: {
      title: String(project?.display_name || project?.name || objectId),
      slots,
    },
    authority: {
      workspace: workspace?.workspace?.authority || "workspace_yaml",
      project_home: "projection_only",
      conflict_policy: "merge_plan",
    },
    metadata: {
      project: sanitize(project?.metadata || {}),
      workspace: sanitize(workspace?.workspace || {}),
    },
  };

  return sanitize(removeBackendSpecificKeys(template));
}

export function validateStorageSyncTemplate(template, options = {}) {
  const errors = [];
  if (!isPlainObject(template)) {
    errors.push("storage sync template must be an object");
    return finishValidation(errors, options);
  }

  if (template.kind !== "storage_sync_template") {
    errors.push("kind must be storage_sync_template");
  }
  if (template.model !== "backend-neutral-projection") {
    errors.push("model must be backend-neutral-projection");
  }
  if (!hasText(template.object_id)) {
    errors.push("object_id is required");
  }
  if (!isPlainObject(template.project_home)) {
    errors.push("project_home is required");
  }

  const slots = toArray(template.project_home?.slots);
  const slotIds = slots.map((slot) => slot?.id);
  if (JSON.stringify(slotIds) !== JSON.stringify(REQUIRED_SLOT_IDS)) {
    errors.push(`project_home.slots must be ordered as ${REQUIRED_SLOT_IDS.join(", ")}`);
  }

  for (const slot of slots) {
    validateSlot(slot, errors);
  }

  const forbiddenPaths = [];
  collectForbiddenBackendFields(template, [], forbiddenPaths);
  for (const path of forbiddenPaths) {
    errors.push(`backend-specific field is not allowed: ${path}`);
  }

  return finishValidation(errors, options);
}

export async function planNotionProjectHomeDryRun(input = {}, options = {}) {
  const dryRun = options.dryRun !== false;
  const notion = input.notion || {};
  const capabilities = normalizeCapabilities(notion.capabilities || {});
  const targetRef = sanitize(notion.target_ref || {});
  const discovered = await discoverProjectHome(notion.client, notion.target_ref);
  const template = sanitize(input.template || {});
  const slots = sortedSlots(template?.project_home?.slots);
  const legacyContent = sortedLegacyContent([
    ...toArray(discovered?.blocks),
    ...toArray(input.existingContent),
  ]);

  const evidence = [];
  evidence.push({
    phase: "discover",
    target_ref: targetRef,
    title: sanitize(discovered?.title || template?.project_home?.title || null),
    block_count: legacyContent.length,
  });

  const classifications = legacyContent.map((block) => classifyLegacyBlock(block));
  for (const classification of classifications) {
    evidence.push({
      phase: "classify",
      source_ref: classification.source_ref,
      classification: "merge_input",
      slot_id: classification.slot_id,
      confidence: classification.confidence,
      summary: sanitize(classification.summary),
    });
  }

  const slotBindings = slots.map((slot) => ({
    phase: "bind",
    slot_id: slot.id,
    title: sanitize(slot.title),
    authority: sanitize(slot.authority),
    source_refs: toArray(slot.sources).map((source) => sanitize(source.ref || source.path_or_remote_ref || source)).sort(),
  }));
  evidence.push(...slotBindings);

  const mergePlans = slots.map((slot) => {
    const mergeInputs = classifications
      .filter((classification) => classification.slot_id === slot.id)
      .map((classification) => classification.source_ref)
      .sort();
    return {
      phase: "merge-plan",
      slot_id: slot.id,
      action: "plan_projection_merge",
      authority: sanitize(slot.authority),
      merge_inputs: mergeInputs,
      legacy_policy: "classify_then_merge",
    };
  });
  evidence.push(...mergePlans);

  const operations = mergePlans.map((plan) => buildDryRunOperation({
    plan,
    slot: slots.find((slot) => slot.id === plan.slot_id),
    template,
    targetRef,
    now: options.now || null,
  }));
  evidence.push(...operations.map((operation) => ({
    phase: "dry-run",
    operation_hash: operation.operation_hash,
    slot_id: operation.slot_id,
    action: operation.action,
    would_write: false,
  })));

  return sanitize({
    mode: dryRun ? "dry-run" : "dry-run",
    remote_writes_enabled: false,
    capabilities,
    target_ref: targetRef,
    evidence,
    operations,
  });
}

export function canonicalJson(value) {
  return JSON.stringify(sortForCanonical(value));
}

export function sha256Canonical(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function buildSlot(definition, entries, workspace, objectId) {
  const matchingEntries = entries
    .filter((entry) => slotMatchesEntry(definition, entry))
    .sort((left, right) => sourceRef(left).localeCompare(sourceRef(right)));
  const sources = matchingEntries.map((entry) => sanitize({
    ref: sourceRef(entry),
    kind: entry.kind,
    authority: normalizeAuthority(entry.authority, definition.authority),
    projection: entry.projection,
    freshness: entry.freshness,
    parseability: entry.parseability,
    sensitivity: entry.sensitivity,
    evidence_refs: toArray(entry.evidence_refs).map(String).sort(),
  }));

  if (!sources.length) {
    sources.push(fallbackSource(definition, workspace, objectId));
  }

  return sanitize({
    id: definition.id,
    title: definition.title,
    authority: definition.authority,
    sources,
  });
}

function fallbackSource(definition, workspace, objectId) {
  const relationRefs = toArray(workspace?.relations)
    .filter((relation) => relation?.from === objectId || relation?.to === objectId)
    .map((relation) => `workspace:relations.${relation.id || relation.type || "relation"}`)
    .sort();
  if (definition.id === "legacy_links" && relationRefs.length) {
    return { ref: relationRefs[0], projection: "legacy_links", authority: "workspace_yaml" };
  }
  if (definition.id === "sync_status") {
    return { ref: "computed:sync-status", projection: "sync_status", authority: "computed" };
  }
  return { ref: `workspace:objects.${objectId}.${definition.id}`, projection: definition.id, authority: definition.authority };
}

function slotMatchesEntry(definition, entry) {
  return definition.kinds.includes(String(entry?.kind || ""))
    || definition.projections.includes(String(entry?.projection || ""));
}

function sourceRef(entry) {
  return String(entry?.path_or_remote_ref || entry?.artifact_id || entry?.kind || "unknown");
}

function validateSlot(slot, errors) {
  if (!isPlainObject(slot)) {
    errors.push("slot must be an object");
    return;
  }
  if (!hasText(slot.id)) errors.push("slot.id is required");
  if (!hasText(slot.title)) errors.push(`slot ${slot.id || "<unknown>"} title is required`);
  if (!ALLOWED_SLOT_AUTHORITIES.includes(slot.authority)) {
    errors.push(`slot ${slot.id || "<unknown>"} has invalid authority: ${slot.authority}`);
  }
  if (!Array.isArray(slot.sources) || slot.sources.length === 0) {
    errors.push(`slot ${slot.id || "<unknown>"} must have at least one source`);
  }
}

async function discoverProjectHome(client, targetRef) {
  if (!client || typeof client.discoverProjectHome !== "function") {
    return { title: null, blocks: [] };
  }
  return sanitize(await client.discoverProjectHome(sanitize(targetRef || {})));
}

function normalizeCapabilities(capabilities) {
  return {
    read: Boolean(capabilities.read),
    write: Boolean(capabilities.write),
    create: Boolean(capabilities.create),
    update: Boolean(capabilities.update),
    delete: Boolean(capabilities.delete),
  };
}

function sortedSlots(slots) {
  const byId = new Map(toArray(slots).map((slot) => [String(slot?.id || ""), sanitize(slot)]));
  return [...REQUIRED_SLOT_IDS]
    .filter((id) => byId.has(id))
    .map((id) => byId.get(id));
}

function sortedLegacyContent(blocks) {
  const byId = new Map();
  for (const block of blocks) {
    if (!block?.id) continue;
    byId.set(String(block.id), sanitize(block));
  }
  return [...byId.values()].sort((left, right) => String(left.id).localeCompare(String(right.id)));
}

function classifyLegacyBlock(block) {
  const text = String(block?.text || block?.title || "");
  const lower = text.toLowerCase();
  let slotId = "legacy_links";
  let confidence = "low";
  if (/progress|status|cycle|active|release|current/.test(lower)) {
    slotId = "progress";
    confidence = "high";
  } else if (/architecture|design|schema|adapter|pipeline|state|config/.test(lower)) {
    slotId = "architecture";
    confidence = "high";
  } else if (/knowledge|lesson|rule|reference/.test(lower)) {
    slotId = "knowledge";
    confidence = "medium";
  } else if (/doc|guide|readme|spec/.test(lower)) {
    slotId = "docs";
    confidence = "medium";
  } else if (/prompt/.test(lower)) {
    slotId = "prompts_index";
    confidence = "medium";
  } else if (/report/.test(lower)) {
    slotId = "reports_index";
    confidence = "medium";
  } else if (/overview|intro|summary/.test(lower)) {
    slotId = "overview";
    confidence = "medium";
  }

  return {
    source_ref: `notion:block:${block.id}`,
    slot_id: slotId,
    confidence,
    summary: redactString(text).slice(0, 160),
  };
}

function buildDryRunOperation({ plan, slot, template, targetRef, now }) {
  const payload = sanitize({
    target_ref: targetRef,
    object_id: template.object_id,
    slot_id: plan.slot_id,
    slot_title: slot?.title,
    authority: plan.authority,
    source_refs: toArray(slot?.sources).map((source) => source.ref || source.path_or_remote_ref || source).sort(),
    merge_inputs: plan.merge_inputs,
    legacy_policy: plan.legacy_policy,
    would_write: false,
  });
  const operation = {
    action: "dry-run",
    operation_type: "merge_project_home_slot",
    slot_id: plan.slot_id,
    legacy_policy: plan.legacy_policy,
    remote_write: false,
    generated_at: now,
    payload,
  };
  operation.operation_hash = sha256Canonical({
    action: operation.action,
    operation_type: operation.operation_type,
    slot_id: operation.slot_id,
    legacy_policy: operation.legacy_policy,
    payload,
  });
  return operation;
}

function findProject(workspace, options) {
  const requestedId = options.objectId || options.object_id;
  const objects = toArray(workspace?.objects);
  if (requestedId) {
    return objects.find((object) => String(object?.id) === String(requestedId)) || null;
  }
  return objects.find((object) => object?.type === "project") || objects[0] || null;
}

function normalizeAuthority(authority, fallback) {
  const normalized = String(authority || fallback || "derived");
  if (normalized === "state_authority" || normalized === "legacy_workflow") return "local_workflow";
  if (ALLOWED_SLOT_AUTHORITIES.includes(normalized)) return normalized;
  return fallback;
}

function finishValidation(errors, options) {
  const result = { valid: errors.length === 0, errors };
  if (!result.valid && options.throwOnError) {
    throw new Error(errors.join("; "));
  }
  return result;
}

function collectForbiddenBackendFields(value, path, output) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenBackendFields(item, [...path, String(index)], output));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];
    if (FORBIDDEN_TEMPLATE_KEYS.test(key)) output.push(childPath.join("."));
    collectForbiddenBackendFields(child, childPath, output);
  }
}

function removeBackendSpecificKeys(value) {
  if (Array.isArray(value)) return value.map((item) => removeBackendSpecificKeys(item));
  if (!isPlainObject(value)) return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_TEMPLATE_KEYS.test(key)) continue;
    result[key] = removeBackendSpecificKeys(child);
  }
  return result;
}

function sanitize(value, parentKey = "") {
  if (Array.isArray(value)) return value.map((item) => sanitize(item, parentKey));
  if (isPlainObject(value)) {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      if (isSecretKey(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = sanitize(child, key);
      }
    }
    return result;
  }
  if (typeof value === "string") {
    if (isSecretKey(parentKey) || SECRET_VALUE_PATTERN.test(value)) return REDACTED;
    return redactString(value);
  }
  return value;
}

function redactString(value) {
  return String(value).replace(SECRET_VALUE_PATTERN, REDACTED);
}

function isSecretKey(key) {
  return SECRET_KEY_PATTERN.test(String(key || ""));
}

function sortForCanonical(value) {
  if (Array.isArray(value)) return value.map(sortForCanonical);
  if (!isPlainObject(value)) return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = sortForCanonical(value[key]);
    return result;
  }, {});
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}
