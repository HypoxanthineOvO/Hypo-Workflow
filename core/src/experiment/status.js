import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalHash, parseYaml, stringifyYaml } from "../serialization/index.js";
import {
  assertWorkspacePathAllowed,
  commitWorkspaceTransaction,
} from "../workspace-store/index.js";
import {
  AUTHORITY_SCHEMA_VERSION,
  assertExactKeys,
  assertNoRawSecrets,
  assertPlainObject,
  authorityError,
  containsForbiddenReasoning,
  normalizeCanonicalValue,
  normalizeSafeIdentifier,
  normalizeTimestamp,
  normalizeTransactionOptions,
  readCurrentManifest,
} from "../runtime/internal.js";

const EVENT_AUTHORITY_ROLE = "experiment_event";
const PROJECTION_AUTHORITY_ROLE = "derived";
const DEFAULT_ROW_LIMIT = 50;
const MAX_ROW_LIMIT = 200;
const MAX_EVENT_BYTES = 64 * 1024;
const MAX_STATUS_VIEW_BYTES = 64 * 1024;
const SUPPORTED_EVENT_TYPES = new Set([
  "baseline_declared",
  "machine_declared",
  "dataset_declared",
  "scan_declared",
  "attempt_recorded",
  "exception_recorded",
  "next_action_set",
  "experiment_lifecycle",
]);
const EVENT_INPUT_KEYS = Object.freeze([
  "schema_version",
  "project_id",
  "experiment_id",
  "event_type",
  "type",
  "event_key",
  "logical_key",
  "occurred_at",
  "recorded_at",
  "source_refs",
  "supersedes_event_id",
  "payload",
  "data",
]);
const PERSISTED_EVENT_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "event_id",
  "semantic_hash",
  "project_id",
  "experiment_id",
  "event_type",
  "event_key",
  "occurred_at",
  "source_refs",
  "supersedes_event_id",
  "payload",
]);
const STATUS_KEYS = Object.freeze([
  "schema_version",
  "authority_role",
  "project_id",
  "updated_at",
  "headline",
  "baselines",
  "machines",
  "datasets",
  "scans",
  "outcomes",
  "pending_confirmations",
  "exceptions",
  "next_actions",
  "retention",
  "table_model",
  "source",
  "detail_refs",
  "projection_hash",
]);
const STATUS_ENTRY_BASE_KEYS = Object.freeze([
  "event_id",
  "event_key",
  "occurred_at",
  "summary",
  "status",
  "source_refs",
]);
const COMMON_PAYLOAD_KEYS = Object.freeze([
  "id",
  "name",
  "title",
  "label",
  "description",
  "purpose",
  "summary",
  "status",
  "confirmation_required",
  "requires_confirmation",
  "review_status",
]);
const EVENT_PAYLOAD_KEYS = Object.freeze({
  baseline_declared: Object.freeze([
    ...COMMON_PAYLOAD_KEYS,
    "baseline_id",
    "role",
    "scope",
    "compared_to_baseline_id",
    "scientific_review",
  ]),
  machine_declared: Object.freeze([
    ...COMMON_PAYLOAD_KEYS,
    "machine_id",
    "gpu",
    "gpus",
    "driver_version",
    "cuda_version",
    "host_memory_gib",
    "os",
    "cpu",
    "uv_environment_id",
    "environment_ref",
    "scientific_review",
  ]),
  dataset_declared: Object.freeze([
    ...COMMON_PAYLOAD_KEYS,
    "dataset_id",
    "version",
    "location_ref",
    "preprocessing_ref",
    "units",
    "scientific_review",
  ]),
  scan_declared: Object.freeze([
    ...COMMON_PAYLOAD_KEYS,
    "scan_id",
    "baseline_id",
    "dataset_id",
    "axes",
    "fixed",
    "selected_cases",
    "resource_limits",
    "scientific_review",
  ]),
  attempt_recorded: Object.freeze([
    ...COMMON_PAYLOAD_KEYS,
    "attempt_id",
    "source_attempt_id",
    "rerun_of_attempt_id",
    "run_id",
    "identity_hash",
    "baseline_id",
    "dataset_id",
    "unit",
    "scene_id",
    "scan_id",
    "parameters",
    "metrics",
    "output_refs",
    "scientific_review",
    "failure",
    "retention_state",
  ]),
  exception_recorded: Object.freeze([
    ...COMMON_PAYLOAD_KEYS,
    "exception_id",
    "related_attempt_ids",
    "severity",
    "kind",
    "scientific_review",
  ]),
  next_action_set: Object.freeze([
    ...COMMON_PAYLOAD_KEYS,
    "action_id",
    "priority",
    "scientific_review",
  ]),
  experiment_lifecycle: Object.freeze([
    ...COMMON_PAYLOAD_KEYS,
    "subject_type",
    "subject_id",
    "lifecycle",
    "reason",
    "scientific_review",
  ]),
});
const REQUIRED_PAYLOAD_KEYS = Object.freeze({
  baseline_declared: Object.freeze(["baseline_id"]),
  machine_declared: Object.freeze(["machine_id"]),
  dataset_declared: Object.freeze(["dataset_id"]),
  scan_declared: Object.freeze(["scan_id"]),
  attempt_recorded: Object.freeze(["attempt_id"]),
  exception_recorded: Object.freeze(["exception_id"]),
  next_action_set: Object.freeze(["action_id"]),
  experiment_lifecycle: Object.freeze(["subject_type", "subject_id", "lifecycle"]),
});
const HEADLINE_KEYS = Object.freeze([
  "project_id",
  "default_baseline_id",
  "baseline_count",
  "dataset_count",
  "scan_count",
  "completed_count",
  "failed_or_interrupted_count",
  "pending_confirmation_count",
  "retention_risk_count",
]);
const RETENTION_RISK_KEYS = Object.freeze([
  "event_id",
  "kind",
  "event_key",
  "occurred_at",
  "event_ids",
  "status",
  "summary",
  "identity_hash",
  "output_refs",
  "related_attempt_ids",
  "experiment_id",
]);
const TABLE_COLUMNS = Object.freeze(["kind", "label", "status", "summary", "refs"]);

export function createExperimentStatusStore(input = {}) {
  assertPlainObject(input, "Experiment status store options");
  assertExactKeys(input, ["clock"], "Experiment status store options");
  if (typeof input.clock !== "function") {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", "Experiment status store clock must be a zero-argument function");
  }
  return Object.freeze({
    appendEvent(root, event, options = {}) {
      return appendEvent(root, event, options);
    },
    rebuild(root, request, options = {}) {
      return rebuild(root, request, options);
    },
    readStatus(root, request) {
      return readStatus(root, request);
    },
  });
}

export function compileExperimentProjectStatus(eventsInput, request = {}) {
  if (!Array.isArray(eventsInput) || eventsInput.length === 0) {
    throw statusError("ERR_EXPERIMENT_STATUS_EMPTY", "Experiment status compilation requires at least one event");
  }
  assertPlainObject(request, "Experiment status compilation request");
  assertExactKeys(request, ["project_id", "limit"], "Experiment status compilation request");
  const projectId = normalizeSafeIdentifier(request.project_id, "Experiment status compilation request.project_id");
  const limit = normalizeLimit(request.limit);
  const events = eventsInput.map((event, index) => normalizeAnyEvent(event, `Experiment event[${index}]`));
  if (events.some((event) => event.project_id !== projectId)) {
    throw statusError("ERR_EXPERIMENT_STATUS_PROJECT_MISMATCH", "Experiment status events belong to another project");
  }
  const byId = new Map();
  for (const event of events) {
    const prior = byId.get(event.event_id);
    if (prior && prior.semantic_hash !== event.semantic_hash) {
      throw statusError("ERR_EXPERIMENT_EVENT_INTEGRITY", `Experiment event id collision: ${event.event_id}`);
    }
    byId.set(event.event_id, event);
  }
  const unique = [...byId.values()].sort(compareEvents);
  const active = activeLogicalEvents(unique);
  assertUniqueAttemptSources(unique);

  const buckets = {
    baselines: [],
    machines: [],
    datasets: [],
    scans: [],
    attempts: [],
    pending_confirmations: [],
    exceptions: [],
    next_actions: [],
    retention: [],
  };
  for (const event of active) {
    const entry = statusEntry(event);
    const bucket = bucketFor(event.event_type);
    if (bucket) buckets[bucket].push(entry);
    if (requiresConfirmation(event)) buckets.pending_confirmations.push(entry);
  }
  const retentionRisks = deriveRetentionRisks(unique);
  buckets.exceptions.push(...retentionRisks);

  for (const values of Object.values(buckets)) values.sort(compareEntries);
  const rows = active.map(tableRow);
  rows.push(...retentionRisks.map(retentionRiskRow));
  rows.sort(compareRows);
  const updatedAt = unique.map((event) => event.occurred_at).sort(compareInstants).at(-1);
  const status = {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    authority_role: PROJECTION_AUTHORITY_ROLE,
    project_id: projectId,
    updated_at: updatedAt,
    headline: compileHeadline(projectId, buckets, retentionRisks),
    baselines: buckets.baselines,
    machines: buckets.machines,
    datasets: buckets.datasets,
    scans: buckets.scans,
    outcomes: {
      counts: countOutcomes(buckets.attempts),
      attempts: buckets.attempts,
    },
    pending_confirmations: dedupeEntries(buckets.pending_confirmations),
    exceptions: dedupeEntries(buckets.exceptions),
    next_actions: buckets.next_actions,
    retention: buckets.retention,
    table_model: {
      columns: [...TABLE_COLUMNS],
      total_rows: rows.length,
      row_limit: limit,
      truncated: rows.length > limit,
      rows: rows.slice(-limit),
    },
    source: {
      event_count: unique.length,
      event_ids: unique.map((event) => event.event_id).sort(),
    },
    detail_refs: unique.map((event) => (
      `.pipeline/memory/experiment-events/${projectId}/${event.event_id}.yaml`
    )),
  };
  return normalizePersistedStatus({
    ...status,
    projection_hash: canonicalHash(status),
  }, "Compiled Experiment status projection");
}

async function appendEvent(root, eventInput, options) {
  const event = buildPersistedEvent(eventInput);
  const operation = normalizeTransactionOptions(options, "experiment-event-append", {
    event_id: event.event_id,
    semantic_hash: event.semantic_hash,
  });
  const manifest = await readCurrentManifest(root);
  assertManifestProject(manifest, event.project_id);
  const paths = statusPaths(manifest, event.project_id);
  const events = await readProjectEvents(root, paths.events_root);
  const sameId = events.find((candidate) => candidate.event_id === event.event_id);
  if (sameId && sameId.semantic_hash !== event.semantic_hash) {
    throw statusError("ERR_EXPERIMENT_EVENT_INTEGRITY", `Experiment event id collision: ${event.event_id}`);
  }
  const combined = sameId ? events : [...events, event];
  const persistedStatus = compileExperimentProjectStatus(combined, {
    project_id: event.project_id,
    limit: MAX_ROW_LIMIT,
  });
  const eventPath = `${paths.events_root}/${event.event_id}.yaml`;
  const projectionState = await readOptionalRegularFile(root, paths.projection_path);
  const writes = [
    ...(sameId ? [] : [{
      path: eventPath,
      content: renderYaml(event),
      expected_hash: null,
    }]),
    {
      path: paths.projection_path,
      content: renderYaml(persistedStatus),
      expected_hash: projectionState.hash,
    },
  ];
  if (writes.length) {
    await commitWorkspaceTransaction(root, {
      id: operation.id,
      faultInjector: operation.faultInjector,
      manifest,
      writes,
    });
  }
  return {
    event_id: event.event_id,
    path: eventPath,
    projection_path: paths.projection_path,
    deduplicated: Boolean(sameId),
    status: sliceStatusRows(persistedStatus, DEFAULT_ROW_LIMIT),
  };
}

async function rebuild(root, request, options) {
  assertPlainObject(request, "Experiment status rebuild request");
  assertExactKeys(request, ["project_id", "limit"], "Experiment status rebuild request");
  const projectId = normalizeSafeIdentifier(request.project_id, "Experiment status rebuild request.project_id");
  const limit = normalizeLimit(request.limit);
  const operation = normalizeTransactionOptions(options, "experiment-status-rebuild", { project_id: projectId, limit });
  const manifest = await readCurrentManifest(root);
  assertManifestProject(manifest, projectId);
  const paths = statusPaths(manifest, projectId);
  const events = await readProjectEvents(root, paths.events_root);
  const persistedStatus = compileExperimentProjectStatus(events, {
    project_id: projectId,
    limit: MAX_ROW_LIMIT,
  });
  const projectionState = await readOptionalRegularFile(root, paths.projection_path);
  await commitWorkspaceTransaction(root, {
    id: operation.id,
    faultInjector: operation.faultInjector,
    manifest,
    writes: [{
      path: paths.projection_path,
      content: renderYaml(persistedStatus),
      expected_hash: projectionState.hash,
    }],
  });
  return {
    project_id: projectId,
    event_count: events.length,
    projection_path: paths.projection_path,
    status: sliceStatusRows(persistedStatus, limit),
  };
}

async function readStatus(root, request) {
  assertPlainObject(request, "Experiment status read request");
  assertExactKeys(request, ["project_id", "limit"], "Experiment status read request");
  const projectId = normalizeSafeIdentifier(request.project_id, "Experiment status read request.project_id");
  const limit = normalizeLimit(request.limit);
  const manifest = await readCurrentManifest(root);
  assertManifestProject(manifest, projectId);
  const { projection_path: path } = statusPaths(manifest, projectId);
  const source = await readRequiredRegularFile(root, path, "ERR_EXPERIMENT_STATUS_NOT_FOUND");
  const persisted = normalizePersistedStatus(parseYaml(source.content), "Experiment status projection");
  if (persisted.project_id !== projectId) {
    throw statusError("ERR_EXPERIMENT_STATUS_PROJECT_MISMATCH", "Experiment status projection belongs to another project");
  }
  return sliceStatusRows(persisted, limit);
}

function buildPersistedEvent(input) {
  const normalized = normalizeEventInput(input, "Experiment event");
  const semanticHash = canonicalHash(normalized);
  return {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    authority_role: EVENT_AUTHORITY_ROLE,
    event_id: `event-${semanticHash.slice(0, 32)}`,
    semantic_hash: semanticHash,
    ...normalized,
  };
}

function normalizeAnyEvent(input, field) {
  if (input?.authority_role === EVENT_AUTHORITY_ROLE || Object.hasOwn(input || {}, "event_id")) {
    return normalizePersistedEvent(input, field);
  }
  return buildPersistedEvent(input);
}

function normalizeEventInput(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, EVENT_INPUT_KEYS, field);
  assertNoRawSecrets(input, field);
  if (containsForbiddenReasoning(input)) {
    throw statusError("ERR_HIDDEN_REASONING_FORBIDDEN", `${field} must not contain hidden reasoning`);
  }
  if (input.schema_version !== undefined && input.schema_version !== AUTHORITY_SCHEMA_VERSION) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.schema_version must be 1`);
  }
  const eventType = selectAlias(input, "event_type", "type", field);
  const eventKey = selectAlias(input, "event_key", "logical_key", field);
  const occurredAt = selectAlias(input, "occurred_at", "recorded_at", field);
  const payload = selectAlias(input, "payload", "data", field);
  const normalizedEventType = normalizeSafeIdentifier(eventType, `${field}.event_type`);
  if (!SUPPORTED_EVENT_TYPES.has(normalizedEventType)) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.event_type is unsupported`);
  }
  const normalized = {
    project_id: normalizeSafeIdentifier(input.project_id, `${field}.project_id`),
    ...(input.experiment_id === undefined ? {} : {
      experiment_id: normalizeSafeIdentifier(input.experiment_id, `${field}.experiment_id`),
    }),
    event_type: normalizedEventType,
    event_key: normalizeLogicalKey(eventKey, `${field}.event_key`),
    occurred_at: normalizeTimestamp(occurredAt, `${field}.occurred_at`),
    source_refs: normalizeSourceRefs(input.source_refs, `${field}.source_refs`),
    ...(input.supersedes_event_id === undefined ? {} : {
      supersedes_event_id: normalizeEventId(input.supersedes_event_id, `${field}.supersedes_event_id`),
    }),
    payload: normalizeCanonicalValue(payload, `${field}.payload`),
  };
  assertPlainObject(normalized.payload, `${field}.payload`);
  validateEventPayload(normalizedEventType, normalized.payload, `${field}.payload`);
  if (Buffer.byteLength(renderYaml(normalized)) > MAX_EVENT_BYTES) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field} exceeds the bounded event size`);
  }
  return normalized;
}

function normalizePersistedEvent(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, PERSISTED_EVENT_KEYS, field);
  if (input.schema_version !== AUTHORITY_SCHEMA_VERSION || input.authority_role !== EVENT_AUTHORITY_ROLE) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field} schema or authority role is invalid`);
  }
  const normalizedInput = {
    schema_version: input.schema_version,
    project_id: input.project_id,
    ...(input.experiment_id === undefined ? {} : { experiment_id: input.experiment_id }),
    event_type: input.event_type,
    event_key: input.event_key,
    occurred_at: input.occurred_at,
    source_refs: input.source_refs,
    ...(input.supersedes_event_id === undefined ? {} : { supersedes_event_id: input.supersedes_event_id }),
    payload: input.payload,
  };
  const expected = buildPersistedEvent(normalizedInput);
  if (input.event_id !== expected.event_id || input.semantic_hash !== expected.semantic_hash) {
    throw statusError("ERR_EXPERIMENT_EVENT_INTEGRITY", `${field} id or semantic hash does not match its content`);
  }
  return expected;
}

function normalizePersistedStatus(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, STATUS_KEYS, field);
  assertNoRawSecrets(input, field);
  if (containsForbiddenReasoning(input)) {
    throw statusError("ERR_HIDDEN_REASONING_FORBIDDEN", `${field} must not contain hidden reasoning`);
  }
  if (input.schema_version !== AUTHORITY_SCHEMA_VERSION || input.authority_role !== PROJECTION_AUTHORITY_ROLE) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field} schema or authority role is invalid`);
  }
  const withoutHash = { ...normalizeCanonicalValue(input, field) };
  const projectionHash = withoutHash.projection_hash;
  delete withoutHash.projection_hash;
  if (projectionHash !== canonicalHash(withoutHash)) {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field} projection hash does not match its content`);
  }
  const projectId = normalizeSafeIdentifier(withoutHash.project_id, `${field}.project_id`);
  normalizeTimestamp(withoutHash.updated_at, `${field}.updated_at`);

  const buckets = {
    baselines: validateStatusBucket(withoutHash.baselines, "baseline_declared", `${field}.baselines`),
    machines: validateStatusBucket(withoutHash.machines, "machine_declared", `${field}.machines`),
    datasets: validateStatusBucket(withoutHash.datasets, "dataset_declared", `${field}.datasets`),
    scans: validateStatusBucket(withoutHash.scans, "scan_declared", `${field}.scans`),
    next_actions: validateStatusBucket(withoutHash.next_actions, "next_action_set", `${field}.next_actions`),
    retention: validateStatusBucket(withoutHash.retention, "experiment_lifecycle", `${field}.retention`),
  };
  assertPlainObject(withoutHash.outcomes, `${field}.outcomes`);
  assertExactKeys(withoutHash.outcomes, ["counts", "attempts"], `${field}.outcomes`);
  buckets.attempts = validateStatusBucket(
    withoutHash.outcomes.attempts,
    "attempt_recorded",
    `${field}.outcomes.attempts`,
  );
  const exceptionParts = validateExceptions(withoutHash.exceptions, `${field}.exceptions`);
  buckets.exceptions = exceptionParts.entries;
  buckets.retention_risks = exceptionParts.risks;

  assertPlainObject(withoutHash.outcomes.counts, `${field}.outcomes.counts`);
  assertExactKeys(withoutHash.outcomes.counts, ["completed", "failed", "interrupted"], `${field}.outcomes.counts`);
  for (const key of ["completed", "failed", "interrupted"]) {
    assertNonnegativeInteger(withoutHash.outcomes.counts[key], `${field}.outcomes.counts.${key}`);
  }
  if (!sameCanonical(withoutHash.outcomes.counts, countOutcomes(buckets.attempts))) {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field}.outcomes.counts do not match Attempt entries`);
  }

  const primaryEntries = [
    ...buckets.baselines.map((entry) => ({ entry, event_type: "baseline_declared" })),
    ...buckets.machines.map((entry) => ({ entry, event_type: "machine_declared" })),
    ...buckets.datasets.map((entry) => ({ entry, event_type: "dataset_declared" })),
    ...buckets.scans.map((entry) => ({ entry, event_type: "scan_declared" })),
    ...buckets.attempts.map((entry) => ({ entry, event_type: "attempt_recorded" })),
    ...buckets.exceptions.map((entry) => ({ entry, event_type: "exception_recorded" })),
    ...buckets.next_actions.map((entry) => ({ entry, event_type: "next_action_set" })),
    ...buckets.retention.map((entry) => ({ entry, event_type: "experiment_lifecycle" })),
  ];
  const primaryById = new Map();
  for (const value of primaryEntries) {
    if (primaryById.has(value.entry.event_id)) {
      throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field} repeats an active event across semantic buckets`);
    }
    primaryById.set(value.entry.event_id, value);
  }

  const pendingConfirmations = validatePendingConfirmations(
    withoutHash.pending_confirmations,
    `${field}.pending_confirmations`,
  );
  const expectedPending = dedupeEntries(primaryEntries
    .map(({ entry }) => entry)
    .filter(requiresConfirmationEntry));
  if (!sameCanonical(pendingConfirmations, expectedPending)) {
    throw statusError(
      "ERR_EXPERIMENT_STATUS_INTEGRITY",
      `${field}.pending_confirmations do not match confirmation-gated entries`,
    );
  }

  validateHeadline(withoutHash.headline, {
    project_id: projectId,
    baselines: buckets.baselines,
    datasets: buckets.datasets,
    scans: buckets.scans,
    attempts: buckets.attempts,
    pending_confirmations: pendingConfirmations,
    retention_risks: buckets.retention_risks,
  }, `${field}.headline`);

  assertPlainObject(withoutHash.table_model, `${field}.table_model`);
  assertExactKeys(
    withoutHash.table_model,
    ["columns", "total_rows", "row_limit", "truncated", "rows"],
    `${field}.table_model`,
  );
  if (
    !Array.isArray(withoutHash.table_model.columns)
    || !Array.isArray(withoutHash.table_model.rows)
    || !Number.isSafeInteger(withoutHash.table_model.total_rows)
    || withoutHash.table_model.total_rows < 0
    || !Number.isSafeInteger(withoutHash.table_model.row_limit)
    || withoutHash.table_model.row_limit < 1
    || withoutHash.table_model.row_limit > MAX_ROW_LIMIT
    || withoutHash.table_model.rows.length > withoutHash.table_model.row_limit
    || withoutHash.table_model.rows.length > MAX_ROW_LIMIT
    || withoutHash.table_model.total_rows < withoutHash.table_model.rows.length
    || withoutHash.table_model.truncated !== (withoutHash.table_model.total_rows > withoutHash.table_model.rows.length)
  ) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field}.table_model is invalid`);
  }
  if (!sameCanonical(withoutHash.table_model.columns, TABLE_COLUMNS)) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field}.table_model.columns are invalid`);
  }

  assertPlainObject(withoutHash.source, `${field}.source`);
  assertExactKeys(withoutHash.source, ["event_count", "event_ids"], `${field}.source`);
  if (
    !Number.isSafeInteger(withoutHash.source.event_count)
    || withoutHash.source.event_count < 0
    || !Array.isArray(withoutHash.source.event_ids)
    || withoutHash.source.event_count !== withoutHash.source.event_ids.length
  ) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field}.source event index is invalid`);
  }
  withoutHash.source.event_ids.forEach((id, index) => normalizeEventId(id, `${field}.source.event_ids[${index}]`));
  const sortedEventIds = [...new Set(withoutHash.source.event_ids)].sort();
  if (!sameCanonical(withoutHash.source.event_ids, sortedEventIds)) {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field}.source.event_ids must be unique and sorted`);
  }
  for (const eventId of primaryById.keys()) {
    if (!sortedEventIds.includes(eventId)) {
      throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field}.source is missing an active event id`);
    }
  }
  for (const risk of buckets.retention_risks) {
    if (risk.event_ids.some((eventId) => !sortedEventIds.includes(eventId))) {
      throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field} retention risk references an unknown event`);
    }
  }
  if (!Array.isArray(withoutHash.detail_refs)) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field}.detail_refs must be an array`);
  }
  const detailEventIds = withoutHash.detail_refs.map((ref, index) => (
    validateDetailRef(ref, projectId, `${field}.detail_refs[${index}]`)
  ));
  if (
    detailEventIds.length !== sortedEventIds.length
    || new Set(detailEventIds).size !== detailEventIds.length
    || !sameCanonical([...detailEventIds].sort(), sortedEventIds)
  ) {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field}.detail_refs do not bind the source event index`);
  }

  const expectedRows = [
    ...primaryEntries.map(({ entry, event_type: eventType }) => statusTableRow(entry, eventType)),
    ...buckets.retention_risks.map(retentionRiskRow),
  ].sort(compareRows);
  const expectedMaterializedRows = expectedRows.slice(-withoutHash.table_model.row_limit);
  if (
    withoutHash.table_model.total_rows !== expectedRows.length
    || withoutHash.table_model.truncated !== (expectedRows.length > expectedMaterializedRows.length)
    || !sameCanonical(withoutHash.table_model.rows, expectedMaterializedRows)
  ) {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field}.table_model does not match semantic status entries`);
  }

  return { ...withoutHash, projection_hash: projectionHash };
}

function validateEventPayload(eventType, payload, field) {
  const allowedKeys = EVENT_PAYLOAD_KEYS[eventType];
  const requiredKeys = REQUIRED_PAYLOAD_KEYS[eventType];
  if (!allowedKeys || !requiredKeys) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field} belongs to an unsupported event type`);
  }
  assertPlainObject(payload, field);
  assertExactKeys(payload, allowedKeys, field);
  for (const key of requiredKeys) {
    if (!Object.hasOwn(payload, key)) {
      throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.${key} is required`);
    }
  }

  const identifierKeys = [
    "id",
    "baseline_id",
    "compared_to_baseline_id",
    "machine_id",
    "uv_environment_id",
    "dataset_id",
    "scan_id",
    "attempt_id",
    "source_attempt_id",
    "rerun_of_attempt_id",
    "run_id",
    "scene_id",
    "exception_id",
    "action_id",
    "subject_type",
    "subject_id",
    "role",
    "priority",
    "severity",
    "kind",
    "lifecycle",
    "retention_state",
    "review_status",
  ];
  for (const key of identifierKeys) {
    if (Object.hasOwn(payload, key)) normalizeSafeIdentifier(payload[key], `${field}.${key}`);
  }
  for (const key of [
    "name",
    "title",
    "label",
    "description",
    "purpose",
    "summary",
    "status",
    "reason",
    "gpu",
    "driver_version",
    "cuda_version",
    "os",
    "cpu",
  ]) {
    if (Object.hasOwn(payload, key)) assertSafeText(payload[key], `${field}.${key}`);
  }
  for (const key of ["confirmation_required", "requires_confirmation"]) {
    if (Object.hasOwn(payload, key) && typeof payload[key] !== "boolean") {
      throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.${key} must be a boolean`);
    }
  }
  for (const key of [
    "scope",
    "axes",
    "fixed",
    "resource_limits",
    "parameters",
    "metrics",
  ]) {
    if (Object.hasOwn(payload, key)) assertPlainObject(payload[key], `${field}.${key}`);
  }
  if (Object.hasOwn(payload, "axes")) {
    for (const [axis, values] of Object.entries(payload.axes)) {
      normalizeSafeIdentifier(axis, `${field}.axes key`);
      if (!Array.isArray(values) || values.length === 0) {
        throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.axes.${axis} must be a non-empty array`);
      }
    }
  }
  if (Object.hasOwn(payload, "selected_cases") && !Array.isArray(payload.selected_cases)) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.selected_cases must be an array`);
  }
  if (Object.hasOwn(payload, "gpus") && !Array.isArray(payload.gpus)) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.gpus must be an array`);
  }
  if (Object.hasOwn(payload, "host_memory_gib")) {
    assertNonnegativeFinite(payload.host_memory_gib, `${field}.host_memory_gib`);
  }
  for (const key of ["location_ref", "preprocessing_ref", "environment_ref"]) {
    if (!Object.hasOwn(payload, key)) continue;
    assertSafeText(payload[key], `${field}.${key}`);
    assertSafeReference(payload[key], `${field}.${key}`);
  }
  if (Object.hasOwn(payload, "units")) validateUnits(payload.units, `${field}.units`);
  if (Object.hasOwn(payload, "unit")) validateUnit(payload.unit, `${field}.unit`, false);
  if (Object.hasOwn(payload, "output_refs")) validateReferenceArray(payload.output_refs, `${field}.output_refs`);
  if (Object.hasOwn(payload, "related_attempt_ids")) {
    validateIdentifierArray(payload.related_attempt_ids, `${field}.related_attempt_ids`);
  }
  if (Object.hasOwn(payload, "identity_hash") && !/^[a-f0-9]{64}$/.test(payload.identity_hash)) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.identity_hash must be a SHA-256 digest`);
  }
  if (Object.hasOwn(payload, "scientific_review")) {
    validateScientificReview(payload.scientific_review, `${field}.scientific_review`);
  }
  if (Object.hasOwn(payload, "failure")) validateFailure(payload.failure, `${field}.failure`);
  if (
    eventType === "attempt_recorded"
    && Object.hasOwn(payload, "source_attempt_id")
    && payload.source_attempt_id !== payload.attempt_id
  ) {
    throw statusError(
      "ERR_EXPERIMENT_EVENT_SCHEMA_INVALID",
      `${field}.source_attempt_id must match the authoritative attempt_id`,
    );
  }
}

function validateStatusBucket(input, eventType, field) {
  if (!Array.isArray(input)) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field} must be an array`);
  }
  const values = input.map((entry, index) => validateStatusEntry(entry, eventType, `${field}[${index}]`));
  if (!sameCanonical(values, [...values].sort(compareEntries))) {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field} must be deterministically ordered`);
  }
  return values;
}

function validateStatusEntry(input, eventType, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, [...STATUS_ENTRY_BASE_KEYS, ...EVENT_PAYLOAD_KEYS[eventType]], field);
  normalizeEventId(input.event_id, `${field}.event_id`);
  normalizeLogicalKey(input.event_key, `${field}.event_key`);
  normalizeTimestamp(input.occurred_at, `${field}.occurred_at`);
  assertSafeText(input.summary, `${field}.summary`);
  assertSafeText(input.status, `${field}.status`);
  const normalizedRefs = normalizeSourceRefs(input.source_refs, `${field}.source_refs`);
  if (!sameCanonical(input.source_refs, normalizedRefs)) {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field}.source_refs are not canonical`);
  }
  const payload = {};
  for (const key of EVENT_PAYLOAD_KEYS[eventType]) {
    if (Object.hasOwn(input, key)) payload[key] = input[key];
  }
  validateEventPayload(eventType, payload, `${field} payload`);
  return input;
}

function validateExceptions(input, field) {
  if (!Array.isArray(input)) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field} must be an array`);
  }
  const entries = [];
  const risks = [];
  for (const [index, value] of input.entries()) {
    if (typeof value?.event_id === "string" && value.event_id.startsWith("retention-risk-")) {
      risks.push(validateRetentionRisk(value, `${field}[${index}]`));
    } else {
      entries.push(validateStatusEntry(value, "exception_recorded", `${field}[${index}]`));
    }
  }
  if (!sameCanonical(input, [...input].sort(compareEntries))) {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field} must be deterministically ordered`);
  }
  return { entries, risks };
}

function validateRetentionRisk(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, RETENTION_RISK_KEYS, field);
  if (!/^retention-risk-[a-f0-9]{24}$/.test(input.event_id)) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field}.event_id is invalid`);
  }
  normalizeLogicalKey(input.event_key, `${field}.event_key`);
  normalizeTimestamp(input.occurred_at, `${field}.occurred_at`);
  if (!Array.isArray(input.event_ids) || input.event_ids.length === 0) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field}.event_ids must be a non-empty array`);
  }
  input.event_ids.forEach((eventId, index) => normalizeEventId(eventId, `${field}.event_ids[${index}]`));
  if (!sameCanonical(input.event_ids, [...new Set(input.event_ids)].sort())) {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field}.event_ids must be unique and sorted`);
  }
  if (input.status !== "needs_attention") {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field}.status must be needs_attention`);
  }
  assertSafeText(input.summary, `${field}.summary`);

  let sourceKind;
  let details;
  let expectedSummary;
  if (input.kind === "same_identity_output_overlap") {
    const required = ["identity_hash", "output_refs", "related_attempt_ids"];
    for (const key of required) {
      if (!Object.hasOwn(input, key)) {
        throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field}.${key} is required`);
      }
    }
    if (Object.hasOwn(input, "experiment_id")) {
      throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field}.experiment_id is not valid for this risk`);
    }
    if (!/^[a-f0-9]{64}$/.test(input.identity_hash)) {
      throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field}.identity_hash must be a SHA-256 digest`);
    }
    validateReferenceArray(input.output_refs, `${field}.output_refs`);
    validateIdentifierArray(input.related_attempt_ids, `${field}.related_attempt_ids`);
    if (!sameCanonical(input.output_refs, [...new Set(input.output_refs)].sort())) {
      throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field}.output_refs must be unique and sorted`);
    }
    if (!sameCanonical(input.related_attempt_ids, [...input.related_attempt_ids].sort())) {
      throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field}.related_attempt_ids must be sorted`);
    }
    sourceKind = "shared_output_refs";
    details = { identity_hash: input.identity_hash, output_refs: input.output_refs };
    expectedSummary = "Same-identity attempts share output references; preserve or trash old bytes before rerun.";
  } else if (input.kind === "trash_restore_lineage") {
    if (!Object.hasOwn(input, "experiment_id")) {
      throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field}.experiment_id is required`);
    }
    for (const key of ["identity_hash", "output_refs", "related_attempt_ids"]) {
      if (Object.hasOwn(input, key)) {
        throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field}.${key} is not valid for this risk`);
      }
    }
    normalizeSafeIdentifier(input.experiment_id, `${field}.experiment_id`);
    sourceKind = "trash_restore_lineage";
    details = { experiment_id: input.experiment_id };
    expectedSummary = "This Experiment has trash and restore lineage; retain both immutable history and restored output provenance.";
  } else {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field}.kind is unsupported`);
  }
  const semantic = { kind: sourceKind, event_ids: input.event_ids, details };
  if (
    input.event_id !== `retention-risk-${canonicalHash(semantic).slice(0, 24)}`
    || input.event_key !== `retention:${sourceKind}:${canonicalHash(details).slice(0, 16)}`
    || input.summary !== expectedSummary
  ) {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field} does not match its derived retention semantics`);
  }
  return input;
}

function validatePendingConfirmations(input, field) {
  if (!Array.isArray(input)) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field} must be an array`);
  }
  return input.map((entry, index) => {
    const eventType = statusEntryEventType(entry, `${field}[${index}]`);
    return validateStatusEntry(entry, eventType, `${field}[${index}]`);
  });
}

function statusEntryEventType(entry, field) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field} must be a status entry`);
  }
  if (Object.hasOwn(entry, "attempt_id")) return "attempt_recorded";
  if (Object.hasOwn(entry, "machine_id")) return "machine_declared";
  if (Object.hasOwn(entry, "dataset_id") && !Object.hasOwn(entry, "scan_id")) return "dataset_declared";
  if (Object.hasOwn(entry, "scan_id")) return "scan_declared";
  if (Object.hasOwn(entry, "exception_id")) return "exception_recorded";
  if (Object.hasOwn(entry, "action_id")) return "next_action_set";
  if (Object.hasOwn(entry, "subject_id") && Object.hasOwn(entry, "lifecycle")) return "experiment_lifecycle";
  if (Object.hasOwn(entry, "baseline_id")) return "baseline_declared";
  throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field} has no supported semantic identity`);
}

function validateHeadline(input, buckets, field) {
  assertPlainObject(input, field);
  assertExactKeys(input, HEADLINE_KEYS, field);
  if (input.project_id !== buckets.project_id) {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field}.project_id does not match the projection`);
  }
  const counts = countOutcomes(buckets.attempts);
  const expected = {
    project_id: buckets.project_id,
    default_baseline_id: buckets.baselines.find((entry) => entry.role === "default")?.baseline_id ?? null,
    baseline_count: buckets.baselines.length,
    dataset_count: buckets.datasets.length,
    scan_count: buckets.scans.length,
    completed_count: counts.completed,
    failed_or_interrupted_count: counts.failed + counts.interrupted,
    pending_confirmation_count: buckets.pending_confirmations.length,
    retention_risk_count: buckets.retention_risks.length,
  };
  if (!sameCanonical(input, expected)) {
    throw statusError("ERR_EXPERIMENT_STATUS_INTEGRITY", `${field} does not match the semantic buckets`);
  }
}

function statusTableRow(entry, eventType) {
  return {
    id: entry.event_id,
    kind: eventType,
    label: firstText(entry.label, entry.name, entry.title, entry.id, entry.event_key),
    status: entry.status,
    summary: entry.summary,
    refs: entry.source_refs,
    occurred_at: entry.occurred_at,
  };
}

function validateDetailRef(value, projectId, field) {
  if (typeof value !== "string") {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field} must be a string reference`);
  }
  assertSafeReference(value, field);
  const prefix = `.pipeline/memory/experiment-events/${projectId}/`;
  if (!value.startsWith(prefix) || !value.endsWith(".yaml")) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field} is outside the project event index`);
  }
  const eventId = value.slice(prefix.length, -5);
  normalizeEventId(eventId, field);
  if (value !== `${prefix}${eventId}.yaml`) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field} is not canonical`);
  }
  return eventId;
}

function validateUnits(input, field) {
  if (!Array.isArray(input) || input.length === 0) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field} must be a non-empty array`);
  }
  input.forEach((unit, index) => validateUnit(unit, `${field}[${index}]`, true));
}

function validateUnit(input, field, requireMeaning) {
  assertPlainObject(input, field);
  assertExactKeys(input, ["kind", "id", "label", "meaning", "scene"], field);
  for (const key of ["kind", "id"]) {
    if (!Object.hasOwn(input, key)) {
      throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.${key} is required`);
    }
    normalizeSafeIdentifier(input[key], `${field}.${key}`);
  }
  if (requireMeaning && !Object.hasOwn(input, "meaning")) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.meaning is required`);
  }
  for (const key of ["label", "meaning", "scene"]) {
    if (Object.hasOwn(input, key)) assertSafeText(input[key], `${field}.${key}`);
  }
}

function validateScientificReview(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(
    input,
    ["assessment", "status", "summary", "comparison_ref", "requires_confirmation", "plausible_causes", "evidence_refs"],
    field,
  );
  if (!Object.hasOwn(input, "status")) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.status is required`);
  }
  for (const key of ["assessment", "status", "summary"]) {
    if (Object.hasOwn(input, key)) assertSafeText(input[key], `${field}.${key}`);
  }
  if (Object.hasOwn(input, "comparison_ref")) {
    assertSafeText(input.comparison_ref, `${field}.comparison_ref`);
    assertSafeReference(input.comparison_ref, `${field}.comparison_ref`);
  }
  if (Object.hasOwn(input, "requires_confirmation") && typeof input.requires_confirmation !== "boolean") {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.requires_confirmation must be a boolean`);
  }
  if (Object.hasOwn(input, "plausible_causes") && !Array.isArray(input.plausible_causes)) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.plausible_causes must be an array`);
  }
  if (Object.hasOwn(input, "evidence_refs")) {
    validateReferenceArray(input.evidence_refs, `${field}.evidence_refs`);
  }
}

function validateFailure(input, field) {
  assertPlainObject(input, field);
  assertExactKeys(
    input,
    ["kind", "resource", "required_gib", "available_gib", "summary", "error_ref", "exit_code", "signal", "details"],
    field,
  );
  if (!Object.hasOwn(input, "kind")) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.kind is required`);
  }
  for (const key of ["kind", "resource", "signal"]) {
    if (Object.hasOwn(input, key)) normalizeSafeIdentifier(input[key], `${field}.${key}`);
  }
  if (Object.hasOwn(input, "summary")) assertSafeText(input.summary, `${field}.summary`);
  if (Object.hasOwn(input, "error_ref")) {
    assertSafeText(input.error_ref, `${field}.error_ref`);
    assertSafeReference(input.error_ref, `${field}.error_ref`);
  }
  for (const key of ["required_gib", "available_gib"]) {
    if (Object.hasOwn(input, key)) assertNonnegativeFinite(input[key], `${field}.${key}`);
  }
  if (Object.hasOwn(input, "exit_code") && !Number.isSafeInteger(input.exit_code)) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}.exit_code must be an integer`);
  }
  if (Object.hasOwn(input, "details")) assertPlainObject(input.details, `${field}.details`);
}

function validateReferenceArray(input, field) {
  if (!Array.isArray(input)) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field} must be an array`);
  }
  input.forEach((value, index) => {
    assertSafeText(value, `${field}[${index}]`);
    assertSafeReference(value, `${field}[${index}]`);
  });
}

function validateIdentifierArray(input, field) {
  if (!Array.isArray(input)) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field} must be an array`);
  }
  input.forEach((value, index) => normalizeSafeIdentifier(value, `${field}[${index}]`));
}

function assertSafeText(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || /[\0\r]/.test(value)) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field} must be non-empty text`);
  }
}

function assertNonnegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field} must be a non-negative integer`);
  }
}

function assertNonnegativeFinite(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `${field} must be a non-negative finite number`);
  }
}

function requiresConfirmationEntry(entry) {
  return entry.confirmation_required === true
    || entry.requires_confirmation === true
    || entry.review_status === "pending_confirmation"
    || entry.status === "pending_confirmation"
    || entry.scientific_review?.status === "pending_confirmation";
}

function sameCanonical(left, right) {
  return canonicalHash(left) === canonicalHash(right);
}

function activeLogicalEvents(events) {
  const byId = new Map(events.map((event) => [event.event_id, event]));
  const successor = new Map();
  for (const event of events) {
    if (!event.supersedes_event_id) continue;
    const target = byId.get(event.supersedes_event_id);
    if (!target || target.event_key !== event.event_key || target.project_id !== event.project_id) {
      throw statusError("ERR_EXPERIMENT_EVENT_CONFLICT", `Invalid supersedes target for ${event.event_id}`);
    }
    if (successor.has(target.event_id) && successor.get(target.event_id) !== event.event_id) {
      throw statusError("ERR_EXPERIMENT_EVENT_CONFLICT", `Experiment event history forks at ${target.event_id}`);
    }
    successor.set(target.event_id, event.event_id);
  }
  for (const event of events) assertAcyclicEvent(event.event_id, byId, new Set());
  const byKey = new Map();
  for (const event of events) {
    const values = byKey.get(event.event_key) || [];
    values.push(event);
    byKey.set(event.event_key, values);
  }
  const active = [];
  for (const [key, values] of byKey) {
    const leaves = values.filter((event) => !successor.has(event.event_id));
    if (leaves.length !== 1) {
      throw statusError("ERR_EXPERIMENT_EVENT_CONFLICT", `Experiment logical key ${key} has divergent active events`);
    }
    if (values.length > 1) {
      const seen = new Set();
      let cursor = leaves[0];
      while (cursor) {
        seen.add(cursor.event_id);
        cursor = cursor.supersedes_event_id ? byId.get(cursor.supersedes_event_id) : null;
      }
      if (seen.size !== values.length) {
        throw statusError("ERR_EXPERIMENT_EVENT_CONFLICT", `Experiment logical key ${key} is not one linear history`);
      }
    }
    active.push(leaves[0]);
  }
  return active.sort(compareEvents);
}

function assertAcyclicEvent(eventId, byId, ancestors) {
  if (ancestors.has(eventId)) {
    throw statusError("ERR_EXPERIMENT_EVENT_CONFLICT", "Experiment event supersedes graph contains a cycle");
  }
  const event = byId.get(eventId);
  if (!event?.supersedes_event_id) return;
  assertAcyclicEvent(event.supersedes_event_id, byId, new Set(ancestors).add(eventId));
}

function assertUniqueAttemptSources(events) {
  const sources = new Map();
  for (const event of events.filter((candidate) => candidate.event_type === "attempt_recorded")) {
    const attemptId = sourceAttemptId(event);
    if (!attemptId || !event.experiment_id) {
      throw statusError(
        "ERR_EXPERIMENT_EVENT_SCHEMA_INVALID",
        "Attempt events require both experiment_id and payload.attempt_id",
      );
    }
    const sourceKey = `${event.experiment_id}:${attemptId}`;
    const prior = sources.get(sourceKey);
    if (prior && prior !== event.event_id) {
      throw statusError(
        "ERR_EXPERIMENT_EVENT_CONFLICT",
        `Attempt ${attemptId} in Experiment ${event.experiment_id} is recorded by multiple immutable events`,
      );
    }
    sources.set(sourceKey, event.event_id);
  }
}

function deriveRetentionRisks(events) {
  const attempts = events.filter((event) => event.event_type === "attempt_recorded");
  const risks = [];
  for (let leftIndex = 0; leftIndex < attempts.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < attempts.length; rightIndex += 1) {
      const left = attempts[leftIndex];
      const right = attempts[rightIndex];
      const identity = left.payload.identity_hash;
      if (!identity || identity !== right.payload.identity_hash) continue;
      const overlap = intersectStrings(outputRefs(left), outputRefs(right));
      if (!overlap.length) continue;
      risks.push(buildRetentionRisk("shared_output_refs", [left, right], {
        identity_hash: identity,
        output_refs: overlap,
      }));
    }
  }
  const lifecycle = events.filter((event) => event.event_type === "experiment_lifecycle");
  const lifecycleByExperiment = new Map();
  for (const event of lifecycle) {
    const experimentId = event.experiment_id || String(event.payload.experiment_id || "");
    if (!experimentId) continue;
    const values = lifecycleByExperiment.get(experimentId) || [];
    values.push(event);
    lifecycleByExperiment.set(experimentId, values);
  }
  for (const [experimentId, values] of lifecycleByExperiment) {
    const states = new Set(values.map((event) => event.payload.lifecycle || event.payload.state));
    if (states.has("trashed") && states.has("restored")) {
      risks.push(buildRetentionRisk("trash_restore_lineage", values, { experiment_id: experimentId }));
    }
  }
  return risks.sort((left, right) => left.event_id.localeCompare(right.event_id));
}

function buildRetentionRisk(kind, events, details) {
  const eventIds = events.map((event) => event.event_id).sort();
  const detectedAt = events.map((event) => event.occurred_at).sort(compareInstants).at(-1);
  const semantic = { kind, event_ids: eventIds, details };
  return {
    event_id: `retention-risk-${canonicalHash(semantic).slice(0, 24)}`,
    kind: kind === "shared_output_refs" ? "same_identity_output_overlap" : kind,
    event_key: `retention:${kind}:${canonicalHash(details).slice(0, 16)}`,
    occurred_at: detectedAt,
    event_ids: eventIds,
    status: "needs_attention",
    summary: kind === "shared_output_refs"
      ? "Same-identity attempts share output references; preserve or trash old bytes before rerun."
      : "This Experiment has trash and restore lineage; retain both immutable history and restored output provenance.",
    ...(kind === "shared_output_refs" ? {
      identity_hash: details.identity_hash,
      output_refs: details.output_refs,
      related_attempt_ids: events.map(sourceAttemptId).filter(Boolean).sort(),
    } : {
      experiment_id: details.experiment_id,
    }),
  };
}

async function readProjectEvents(root, eventsRoot) {
  const guarded = await assertWorkspacePathAllowed(resolve(root || "."), eventsRoot, { allowRoot: true });
  let entries;
  try {
    entries = await readdir(guarded.path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return [];
    throw error;
  }
  const events = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isSymbolicLink()) {
      throw statusError("ERR_WORKSPACE_PATH_FORBIDDEN", "Experiment event directory must not contain symlinks");
    }
    if (!entry.isFile() || !entry.name.endsWith(".yaml")) {
      throw statusError("ERR_EXPERIMENT_EVENT_INTEGRITY", "Experiment event directory may contain only YAML event files");
    }
    const expectedId = entry.name.slice(0, -5);
    const path = `${eventsRoot}/${entry.name}`;
    const source = await readRequiredRegularFile(root, path, "ERR_EXPERIMENT_EVENT_INTEGRITY");
    const event = normalizePersistedEvent(parseYaml(source.content), `Experiment event ${entry.name}`);
    if (event.event_id !== expectedId) {
      throw statusError("ERR_EXPERIMENT_EVENT_INTEGRITY", `Experiment event path does not match ${event.event_id}`);
    }
    events.push(event);
  }
  return events;
}

async function readRequiredRegularFile(root, path, notFoundCode) {
  const guarded = await assertWorkspacePathAllowed(resolve(root || "."), path);
  let stats;
  try {
    stats = await lstat(guarded.path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw statusError(notFoundCode, `Experiment status file was not found: ${path}`);
    }
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw statusError("ERR_WORKSPACE_PATH_FORBIDDEN", `Experiment status path is not a regular file: ${path}`);
  }
  return { content: await readFile(guarded.path, "utf8") };
}

async function readOptionalRegularFile(root, path) {
  const guarded = await assertWorkspacePathAllowed(resolve(root || "."), path);
  try {
    const stats = await lstat(guarded.path);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw statusError("ERR_WORKSPACE_PATH_FORBIDDEN", `Experiment status path is not a regular file: ${path}`);
    }
    const content = await readFile(guarded.path);
    return { content, hash: createHash("sha256").update(content).digest("hex") };
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return { content: null, hash: null };
    throw error;
  }
}

function statusPaths(manifest, projectId) {
  return {
    events_root: `${manifest.zones.memory}/experiment-events/${projectId}`,
    projection_path: `${manifest.zones.memory}/experiment-status/${projectId}/status.yaml`,
  };
}

function assertManifestProject(manifest, projectId) {
  if (manifest.project_id !== projectId) {
    throw statusError(
      "ERR_EXPERIMENT_STATUS_PROJECT_MISMATCH",
      `Experiment status project ${projectId} does not match manifest project ${manifest.project_id}`,
    );
  }
}

function sliceStatusRows(status, limit) {
  let effectiveLimit = limit;
  let compact = false;
  while (true) {
    const view = buildStatusView(status, limit, effectiveLimit, compact);
    const finalized = finalizeStatusView(view);
    if (finalized) return finalized;
    if (!compact) {
      compact = true;
      continue;
    }
    if (effectiveLimit > 1) {
      effectiveLimit = Math.max(1, Math.floor(effectiveLimit / 2));
      continue;
    }
    const aggregate = buildStatusView(status, limit, 0, true);
    const finalizedAggregate = finalizeStatusView(aggregate);
    if (finalizedAggregate) return finalizedAggregate;
    throw statusError(
      "ERR_EXPERIMENT_STATUS_BOUNDED",
      "Experiment status cannot be represented within the bounded view budget",
    );
  }
}

function finalizeStatusView(view) {
  const finalized = { ...view, projection_hash: canonicalHash(view) };
  return Buffer.byteLength(JSON.stringify(finalized)) < MAX_STATUS_VIEW_BYTES ? finalized : null;
}

function buildStatusView(statusInput, requestedLimit, effectiveLimit, compact) {
  const status = clone(statusInput);
  delete status.projection_hash;
  const full = {
    baselines: status.baselines,
    machines: status.machines,
    datasets: status.datasets,
    scans: status.scans,
    attempts: status.outcomes.attempts,
    pending_confirmations: status.pending_confirmations,
    exceptions: status.exceptions,
    next_actions: status.next_actions,
    retention: status.retention,
    rows: status.table_model.rows,
    event_ids: status.source.event_ids,
    detail_refs: status.detail_refs,
  };
  const bound = (values, mode = "recent") => {
    if (effectiveLimit === 0) return [];
    const selected = mode === "first"
      ? values.slice(0, effectiveLimit)
      : values.slice(-effectiveLimit);
    return compact ? selected.map(compactStatusEntry) : clone(selected);
  };
  const sourceEventIds = effectiveLimit === 0 ? [] : full.event_ids.slice(-effectiveLimit);
  const detailRefs = effectiveLimit === 0 ? [] : full.detail_refs.slice(-effectiveLimit);
  const rows = bound(full.rows);
  const totals = {
    baselines: full.baselines.length,
    machines: full.machines.length,
    datasets: full.datasets.length,
    scans: full.scans.length,
    attempts: full.attempts.length,
    pending_confirmations: full.pending_confirmations.length,
    exceptions: full.exceptions.length,
    next_actions: full.next_actions.length,
    retention: full.retention.length,
    detail_refs: full.detail_refs.length,
    source_event_ids: status.source.event_count,
    table_rows: status.table_model.total_rows,
  };
  const sizes = {
    baselines: Math.min(full.baselines.length, effectiveLimit),
    machines: Math.min(full.machines.length, effectiveLimit),
    datasets: Math.min(full.datasets.length, effectiveLimit),
    scans: Math.min(full.scans.length, effectiveLimit),
    attempts: Math.min(full.attempts.length, effectiveLimit),
    pending_confirmations: Math.min(full.pending_confirmations.length, effectiveLimit),
    exceptions: Math.min(full.exceptions.length, effectiveLimit),
    next_actions: Math.min(full.next_actions.length, effectiveLimit),
    retention: Math.min(full.retention.length, effectiveLimit),
    detail_refs: detailRefs.length,
    source_event_ids: sourceEventIds.length,
    table_rows: rows.length,
  };
  const truncatedFields = Object.keys(sizes)
    .filter((key) => sizes[key] < totals[key])
    .sort();

  return {
    ...status,
    baselines: bound(full.baselines, "first"),
    machines: bound(full.machines),
    datasets: bound(full.datasets),
    scans: bound(full.scans),
    outcomes: {
      ...status.outcomes,
      attempts: bound(full.attempts),
    },
    pending_confirmations: bound(full.pending_confirmations),
    exceptions: bound(full.exceptions),
    next_actions: bound(full.next_actions),
    retention: bound(full.retention),
    table_model: {
      ...status.table_model,
      row_limit: requestedLimit,
      truncated: status.table_model.total_rows > rows.length,
      rows,
    },
    source: {
      ...status.source,
      event_ids: sourceEventIds,
      event_ids_digest: `sha256:${canonicalHash(full.event_ids)}`,
      event_ids_truncated: sourceEventIds.length < status.source.event_count,
    },
    detail_refs: detailRefs,
    view: {
      limit: requestedLimit,
      totals,
      truncated_fields: truncatedFields,
    },
  };
}

function compactStatusEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
  const keys = [
    "id",
    "event_id",
    "event_key",
    "occurred_at",
    "kind",
    "label",
    "status",
    "summary",
    "baseline_id",
    "dataset_id",
    "scan_id",
    "attempt_id",
    "action_id",
    "exception_id",
    "subject_id",
    "lifecycle",
    "role",
    "priority",
    "severity",
  ];
  const compacted = {};
  for (const key of keys) {
    if (!Object.hasOwn(entry, key)) continue;
    compacted[key] = typeof entry[key] === "string" && entry[key].length > 1024
      ? `${entry[key].slice(0, 1021)}...`
      : clone(entry[key]);
  }
  for (const key of ["related_attempt_ids", "refs", "source_refs"]) {
    if (Array.isArray(entry[key])) compacted[key] = clone(entry[key].slice(0, 8));
  }
  return compacted;
}

function statusEntry(event) {
  return {
    ...clone(event.payload),
    event_id: event.event_id,
    event_key: event.event_key,
    occurred_at: event.occurred_at,
    summary: eventSummary(event),
    status: eventStatus(event),
    source_refs: clone(event.source_refs),
  };
}

function tableRow(event) {
  return {
    id: event.event_id,
    kind: event.event_type,
    label: eventLabel(event),
    status: eventStatus(event),
    summary: eventSummary(event),
    refs: event.source_refs,
    occurred_at: event.occurred_at,
  };
}

function retentionRiskRow(risk) {
  return {
    id: risk.event_id,
    kind: "retention_risk",
    label: risk.kind,
    status: "needs_attention",
    summary: risk.summary,
    refs: risk.event_ids,
    occurred_at: risk.occurred_at,
  };
}

function compileHeadline(projectId, buckets, retentionRisks) {
  const counts = countOutcomes(buckets.attempts);
  return {
    project_id: projectId,
    default_baseline_id: buckets.baselines.find((entry) => entry.role === "default")?.baseline_id ?? null,
    baseline_count: buckets.baselines.length,
    dataset_count: buckets.datasets.length,
    scan_count: buckets.scans.length,
    completed_count: counts.completed,
    failed_or_interrupted_count: counts.failed + counts.interrupted,
    pending_confirmation_count: buckets.pending_confirmations.length,
    retention_risk_count: retentionRisks.length,
  };
}

function bucketFor(eventType) {
  return ({
    baseline_declared: "baselines",
    machine_declared: "machines",
    dataset_declared: "datasets",
    scan_declared: "scans",
    attempt_recorded: "attempts",
    exception_recorded: "exceptions",
    next_action_set: "next_actions",
    experiment_lifecycle: "retention",
  })[eventType] || null;
}

function requiresConfirmation(event) {
  return event.payload.confirmation_required === true
    || event.payload.requires_confirmation === true
    || event.payload.review_status === "pending_confirmation"
    || event.payload.status === "pending_confirmation"
    || event.payload.scientific_review?.status === "pending_confirmation";
}

function countOutcomes(attempts) {
  const counts = { completed: 0, failed: 0, interrupted: 0 };
  for (const attempt of attempts) {
    if (Object.hasOwn(counts, attempt.status)) counts[attempt.status] += 1;
  }
  return counts;
}

function eventLabel(event) {
  return firstText(event.payload.label, event.payload.name, event.payload.title, event.payload.id, event.event_key);
}

function eventSummary(event) {
  return firstText(event.payload.summary, event.payload.description, event.payload.purpose, eventLabel(event));
}

function eventStatus(event) {
  return firstText(event.payload.status, event.payload.lifecycle, event.payload.review_status, "recorded");
}

function sourceAttemptId(event) {
  const value = event.payload.attempt_id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function outputRefs(event) {
  const value = event.payload.output_refs;
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}

function normalizeSourceRefs(input, field) {
  if (!Array.isArray(input) || input.length === 0) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field} must be a non-empty array`);
  }
  const normalized = input.map((entry, index) => {
    if (typeof entry === "string") {
      if (entry !== entry.trim() || !entry || /[\0\r\n]/.test(entry)) {
        throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}[${index}] must be a safe reference`);
      }
      assertSafeReference(entry, `${field}[${index}]`);
      return entry;
    }
    assertPlainObject(entry, `${field}[${index}]`);
    assertExactKeys(entry, ["type", "ref", "locator"], `${field}[${index}]`);
    const value = normalizeCanonicalValue(entry, `${field}[${index}]`);
    for (const key of ["type", "ref", "locator"]) {
      if (typeof value[key] !== "string" || value[key] !== value[key].trim() || !value[key] || /[\0\r\n]/.test(value[key])) {
        throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field}[${index}].${key} must be a safe reference`);
      }
      assertSafeReference(value[key], `${field}[${index}].${key}`);
    }
    return value;
  });
  const keyed = new Map(normalized.map((entry) => [canonicalHash(entry), entry]));
  return [...keyed.values()].sort((left, right) => canonicalHash(left).localeCompare(canonicalHash(right)));
}

function assertSafeReference(value, field) {
  if (
    value.startsWith("/")
    || /^[A-Za-z]:[\\/]/.test(value)
    || value.includes("\\")
    || value.split("/").some((part) => part === "." || part === "..")
  ) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field} must not be absolute or contain traversal`);
  }
}

function normalizeLogicalKey(value, field) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > 512 || /[\0\r\n\\]/.test(value)) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field} must be a safe logical reference`);
  }
  if (value.startsWith("/") || value.split("/").some((part) => part === "." || part === "..")) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field} must not contain traversal`);
  }
  return value;
}

function normalizeEventId(value, field) {
  const id = normalizeSafeIdentifier(value, field);
  if (!/^event-[a-f0-9]{32}$/.test(id)) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field} must be a content-addressed Experiment event id`);
  }
  return id;
}

function normalizeLimit(value) {
  if (value === undefined) return DEFAULT_ROW_LIMIT;
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_ROW_LIMIT) {
    throw statusError("ERR_EXPERIMENT_STATUS_SCHEMA_INVALID", `Experiment status limit must be an integer from 1 to ${MAX_ROW_LIMIT}`);
  }
  return value;
}

function selectAlias(input, primary, alias, field) {
  const hasPrimary = Object.hasOwn(input, primary);
  const hasAlias = Object.hasOwn(input, alias);
  if (hasPrimary === hasAlias) {
    throw statusError("ERR_EXPERIMENT_EVENT_SCHEMA_INVALID", `${field} must contain exactly one of ${primary} or ${alias}`);
  }
  return hasPrimary ? input[primary] : input[alias];
}

function renderYaml(value) {
  return `${stringifyYaml(value).trimEnd()}\n`;
}

function compareEvents(left, right) {
  return compareInstants(left.occurred_at, right.occurred_at) || left.event_id.localeCompare(right.event_id);
}

function compareEntries(left, right) {
  return compareInstants(left.occurred_at, right.occurred_at) || left.event_id.localeCompare(right.event_id);
}

function compareRows(left, right) {
  return compareInstants(left.occurred_at, right.occurred_at) || left.id.localeCompare(right.id);
}

function compareInstants(left, right) {
  return Date.parse(left) - Date.parse(right) || String(left).localeCompare(String(right));
}

function dedupeEntries(entries) {
  return [...new Map(entries.map((entry) => [entry.event_id, entry])).values()].sort(compareEntries);
}

function intersectStrings(left, right) {
  const rightSet = new Set(right);
  return [...new Set(left.filter((entry) => rightSet.has(entry)))].sort();
}

function firstText(...values) {
  const value = values.find((entry) => typeof entry === "string" && entry.trim());
  return value ? value.trim() : "recorded";
}

function clone(value) {
  return structuredClone(value);
}

function statusError(code, message) {
  return authorityError(code, message);
}
