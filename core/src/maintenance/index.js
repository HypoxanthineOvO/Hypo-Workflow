import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseYaml, stringifyYaml } from "../config/index.js";
import { redactSecrets, validateSecretSafeEvidence } from "../evidence/index.js";
import {
  appendJsonlLedgerEntry,
  jsonlLedgerPathFor,
} from "../ledger/index.js";
export {
  CONSOLIDATION_SOURCE_KINDS,
  discoverConsolidationSources,
  canonicalSourceKinds,
  classifyAndRedactRecord,
  scrubConsolidationSecretMarkers,
} from "./session-sources.js";
export {
  planGlobalConsolidationRun,
  runMaintenanceScheduler,
  planHistoricalBackfillShards,
  buildConsolidationResumeState,
  generateGlobalConsolidationOutputs,
  projectConsolidationToNotionDryRun,
} from "./consolidation.js";
export {
  buildRootManagementDryRunBundle,
  applyApprovedNotionDryRunBundle,
  renderRootDryRunReviewReport,
} from "./root-dry-run.js";
export {
  resolveDailyProjectSummaryWindow,
  buildDailyProjectSummary,
  renderDailyProjectSummary,
  sendDailyProjectSummary,
  runDailyProjectSummaryScheduler,
} from "./daily-project-summary.js";
export {
  buildProjectLinkageE2EDryRunBundle,
} from "./project-linkage-e2e.js";

export const MAINTENANCE_QUEUE_STATUSES = Object.freeze([
  "queued",
  "planned",
  "approved",
  "running",
  "completed",
  "deferred",
  "skipped",
  "blocked",
]);

export const MAINTENANCE_SIDE_EFFECT_LEVELS = Object.freeze([
  "local_read",
  "remote_read",
  "local_derived_write",
  "local_authority_write",
  "local_document_write_with_backup",
  "remote_write",
  "destructive_remote_write",
  "external_action",
]);

export const MAINTENANCE_RUN_STATUSES = Object.freeze([
  "planned",
  "discovering_items",
  "in_progress",
  "waiting_review",
  "waiting_confirmation",
  "applying",
  "verifying",
  "completed",
  "paused",
  "failed",
]);

export const MAINTENANCE_TEMPLATE_CANDIDATE_STATUSES = Object.freeze([
  "pending_review",
  "approved",
  "rejected",
]);

const REQUIRED_QUEUE_FIELDS = Object.freeze([
  "id",
  "object_ref",
  "operation",
  "target_ref",
  "scope",
  "status",
  "priority",
  "side_effect",
  "confirmation_required",
  "dependencies",
  "policy_refs",
  "evidence_refs",
  "created_at",
  "updated_at",
]);

const FEATURE_QUEUE_FIELDS = Object.freeze([
  "feature_id",
  "cycle_id",
  "patch_id",
  "milestone_id",
  "milestones",
  "acceptance_criteria",
]);

const TRANSITIONS = Object.freeze({
  plan: { status: "planned", event_type: "queue_item_planned" },
  approve: { status: "approved", event_type: "queue_item_approved" },
  run: { status: "running", event_type: "queue_item_running" },
  complete: { status: "completed", event_type: "queue_item_completed" },
  defer: { status: "deferred", event_type: "queue_item_deferred" },
  skip: { status: "skipped", event_type: "queue_item_skipped" },
  block: { status: "blocked", event_type: "queue_item_blocked" },
});

const STATUS_ZH = Object.freeze({
  queued: "待处理",
  planned: "已计划",
  approved: "已批准",
  running: "运行中",
  completed: "已完成",
  deferred: "已延期",
  skipped: "已跳过",
  blocked: "阻塞",
});

const EVENT_ZH = Object.freeze({
  confirmation_required: "需要确认",
  queue_item_blocked: "队列项阻塞",
  queue_item_completed: "队列项完成",
  queue_item_planned: "队列项已计划",
  queue_item_approved: "队列项已批准",
  queue_item_running: "队列项运行中",
  scan_completed: "扫描完成",
  dry_run_created: "dry-run 已创建",
  verify_completed: "验证完成",
});

export function validateMaintenanceQueueItem(item = {}) {
  const errors = [];
  if (!isPlainObject(item)) {
    return {
      ok: false,
      errors: ["maintenance operation queue item must be an object"],
      normalized: null,
    };
  }

  if (item.kind && item.kind !== "maintenance_operation") {
    errors.push("queue item kind must be maintenance_operation");
  }
  const featureFields = FEATURE_QUEUE_FIELDS.filter((field) => Object.hasOwn(item, field));
  if (featureFields.length > 0 || !item.operation) {
    errors.push("maintenance operation queue item must not use Feature, Cycle, or Patch shape");
  }

  for (const field of REQUIRED_QUEUE_FIELDS) {
    if (!Object.hasOwn(item, field)) errors.push(`${field} is required for maintenance operation`);
  }
  if (item.status && !MAINTENANCE_QUEUE_STATUSES.includes(item.status)) {
    errors.push(`status must be one of: ${MAINTENANCE_QUEUE_STATUSES.join(", ")}`);
  }
  if (item.side_effect && !MAINTENANCE_SIDE_EFFECT_LEVELS.includes(item.side_effect)) {
    errors.push(`side_effect must be one of: ${MAINTENANCE_SIDE_EFFECT_LEVELS.join(", ")}`);
  }
  for (const field of ["dependencies", "policy_refs", "evidence_refs"]) {
    if (Object.hasOwn(item, field) && !Array.isArray(item[field])) {
      errors.push(`${field} must be an array`);
    }
  }
  if (Object.hasOwn(item, "scope") && !isPlainObject(item.scope)) {
    errors.push("scope must be an object");
  }
  for (const field of ["created_at", "updated_at"]) {
    if (item[field] && !Number.isFinite(Date.parse(item[field]))) {
      errors.push(`${field} must be ISO-8601`);
    }
  }

  const normalized = redactSecrets({
    ...item,
    kind: "maintenance_operation",
  });
  for (const field of FEATURE_QUEUE_FIELDS) {
    delete normalized[field];
  }

  return {
    ok: errors.length === 0,
    errors,
    normalized,
  };
}

export function validateMaintenanceRun(run = {}) {
  const errors = [];
  if (!isPlainObject(run)) {
    return {
      ok: false,
      errors: ["maintenance run must be an object"],
      normalized: null,
    };
  }

  if (run.kind && run.kind !== "maintenance_run") {
    errors.push("maintenance run kind must be maintenance_run");
  }
  const featureFields = FEATURE_QUEUE_FIELDS.filter((field) => Object.hasOwn(run, field));
  if (featureFields.length > 0) {
    errors.push("maintenance run must not use Feature, Cycle, or Patch shape");
  }

  for (const field of ["id", "title", "run_type", "object_ref", "status", "review_mode", "created_at", "updated_at"]) {
    if (!Object.hasOwn(run, field)) errors.push(`${field} is required for maintenance run`);
  }
  if (run.status && !MAINTENANCE_RUN_STATUSES.includes(run.status)) {
    errors.push(`status must be one of: ${MAINTENANCE_RUN_STATUSES.join(", ")}`);
  }
  if (run.review_mode && !["batch", "per_item"].includes(run.review_mode)) {
    errors.push("review_mode must be batch or per_item");
  }
  if (Object.hasOwn(run, "planned_items") && !Array.isArray(run.planned_items)) {
    errors.push("planned_items must be an array");
  }
  if (Object.hasOwn(run, "evidence_refs") && !Array.isArray(run.evidence_refs)) {
    errors.push("evidence_refs must be an array");
  }
  if (Object.hasOwn(run, "scope") && !isPlainObject(run.scope)) {
    errors.push("scope must be an object");
  }
  for (const field of ["created_at", "updated_at", "completed_at"]) {
    if (run[field] && !Number.isFinite(Date.parse(run[field]))) {
      errors.push(`${field} must be ISO-8601`);
    }
  }

  const normalized = redactSecrets({
    ...run,
    kind: "maintenance_run",
    evidence_refs: Array.isArray(run.evidence_refs) ? run.evidence_refs : [],
  });
  for (const field of FEATURE_QUEUE_FIELDS) {
    delete normalized[field];
  }

  return {
    ok: errors.length === 0,
    errors,
    normalized,
  };
}

export function planMaintenanceRun(run = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const validation = validateMaintenanceRun({
    ...run,
    status: run.status || "planned",
    created_at: run.created_at || now,
    updated_at: run.updated_at || now,
  });
  if (!validation.ok) {
    throw new Error(`Invalid maintenance run:\n${validation.errors.join("\n")}`);
  }

  const normalizedRun = redactSecrets({
    ...validation.normalized,
    status: "planned",
    updated_at: now,
  });
  const plannedItems = Array.isArray(normalizedRun.planned_items) ? normalizedRun.planned_items : [];
  const items = plannedItems.map((item, index) => normalizeRunQueueItem(normalizedRun, item, {
    index,
    now,
    status: item.status || "planned",
    review_group: reviewGroupFor(normalizedRun, item),
  }));

  return {
    run: normalizedRun,
    items,
  };
}

export function discoverMaintenanceRunItems(run = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const validation = validateMaintenanceRun({
    ...run,
    status: run.status || "planned",
    created_at: run.created_at || now,
    updated_at: run.updated_at || now,
  });
  if (!validation.ok) {
    throw new Error(`Invalid maintenance run:\n${validation.errors.join("\n")}`);
  }

  const normalizedRun = redactSecrets({
    ...validation.normalized,
    status: "discovering_items",
    updated_at: now,
  });
  const subitems = flattenDiscoveryChildren(normalizedRun.discovery_input?.children || []);
  const items = subitems.map((subitem, index) => normalizeRunQueueItem(normalizedRun, {
    id: `mq-${safeId(normalizedRun.id)}-${safeId(subitem.ref)}-${index + 1}`,
    operation: operationForDiscoveredSubitem(normalizedRun, subitem),
    target_ref: subitem.ref,
    scope: {
      run_id: normalizedRun.id,
      subitem_ref: subitem.ref,
      title: subitem.title || null,
      checksum_sha256: subitem.checksum_sha256 || null,
      adapter: normalizedRun.discovery_input?.adapter || null,
    },
    side_effect: "local_read",
  }, {
    index,
    now,
    status: "planned",
    review_group: normalizedRun.review_mode === "per_item" ? subitem.ref : normalizedRun.id,
  }));

  return {
    run: {
      ...normalizedRun,
      subitems,
      planned_items: items,
    },
    subitems,
    items,
  };
}

export function transitionMaintenanceRun(run = {}, transition = {}) {
  const action = String(transition.action || "").trim().toLowerCase();
  const now = transition.now || new Date().toISOString();
  const statusByAction = {
    start: "in_progress",
    pause: "paused",
    resume: "waiting_review",
    review: "waiting_confirmation",
    approve: "applying",
    verify: "verifying",
    complete: "completed",
  };
  const nextStatus = statusByAction[action];
  if (!nextStatus) {
    throw new Error(`Unsupported maintenance run action: ${transition.action}`);
  }

  const validation = validateMaintenanceRun({
    ...run,
    updated_at: run.updated_at || now,
  });
  if (!validation.ok) {
    throw new Error(`Invalid maintenance run:\n${validation.errors.join("\n")}`);
  }

  const evidenceRefs = mergeRefs(validation.normalized.evidence_refs, transition.evidence_refs);
  const next = redactSecrets({
    ...validation.normalized,
    status: nextStatus,
    updated_at: now,
    evidence_refs: evidenceRefs,
    ...(action === "complete" ? { completed_at: now } : {}),
    ...(action === "pause"
      ? {
          resumable: {
            ...(isPlainObject(run.resumable) ? run.resumable : {}),
            resume_token: transition.resume_token || run.resumable?.resume_token || `resume:${run.id}`,
            cursor: isPlainObject(transition.cursor) ? transition.cursor : run.resumable?.cursor || null,
            paused_at: now,
            ...(transition.reason ? { reason: transition.reason } : {}),
          },
        }
      : {}),
    ...(action === "resume" && isPlainObject(run.resumable) ? { resumable: run.resumable } : {}),
    ...(action === "review" && transition.review ? { review: transition.review } : {}),
    ...(action === "approve"
      ? {
          approval: {
            confirmed: Boolean(transition.confirmed),
            confirmed_at: now,
            actor: transition.actor || "agent",
          },
        }
      : {}),
  });
  if (next.resumable && run.resumable?.resume_token) {
    next.resumable.resume_token = run.resumable.resume_token;
  }
  if (next.resumable && transition.resume_token) {
    next.resumable.resume_token = transition.resume_token;
  }

  const event = redactSecrets({
    id: `mr-${compactTimestamp(now)}-${safeId(run.id || "maintenance-run")}-${action}`,
    run_id: run.id || null,
    object_ref: run.object_ref || null,
    event_type: `run_${action}`,
    status: nextStatus,
    timestamp: now,
    actor: transition.actor || "agent",
    summary: `Maintenance run ${run.id || "unknown"} ${action}.`,
    evidence_refs: evidenceRefs,
    redaction: {
      raw_secret_seen: false,
      raw_secret_recorded: false,
    },
  });

  return { run: next, event };
}

export async function applyMaintenanceRun(run = {}, input = {}) {
  const now = input.now || new Date().toISOString();
  const validation = validateMaintenanceRun({
    ...run,
    updated_at: run.updated_at || now,
  });
  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors,
      run: validation.normalized || null,
      gates: [],
    };
  }

  const plannedItems = Array.isArray(validation.normalized.planned_items)
    ? validation.normalized.planned_items
    : [];
  const items = plannedItems.map((item, index) => normalizeRunQueueItem(validation.normalized, item, {
    index,
    now,
    status: item.status || "approved",
  }));
  const gates = items.map((item) => evaluateMaintenanceSideEffectGate({
    level: item.side_effect,
    operation: item.operation,
    confirmed: Boolean(input.confirmed || item.approval?.confirmed),
    backup: input.backups?.[item.id] || item.backup,
  }));
  const blocked = gates.filter((gate) => !gate.allowed);
  const evidenceRefs = mergeRefs(
    mergeRefs(validation.normalized.evidence_refs, input.evidence_refs),
    gates.flatMap((gate) => gate.backup?.path ? [gate.backup.path] : []),
  );
  if (evidenceRefs.length === 0) {
    evidenceRefs.push(`~/.hypo-workflow/maintenance/evidence/apply-results/${safeId(validation.normalized.id)}.yaml`);
  }

  if (blocked.length > 0) {
    return {
      ok: false,
      errors: blocked.map((gate) => `Maintenance side effect gate blocked ${gate.level}: ${gate.reason}`),
      run: redactSecrets({
        ...validation.normalized,
        status: "waiting_confirmation",
        updated_at: now,
        evidence_refs: evidenceRefs,
      }),
      gates,
    };
  }

  const nextRun = redactSecrets({
    ...validation.normalized,
    status: "applying",
    updated_at: now,
    planned_items: items,
    evidence_refs: evidenceRefs,
  });
  let ledgerPath = null;
  let ledgerEvent = null;
  if (input.root) {
    const appended = await appendMaintenanceLedgerEvent(input.root, {
      id: `ml-${compactTimestamp(now)}-${safeId(nextRun.id)}-run-applying`,
      queue_item_id: null,
      object_ref: nextRun.object_ref,
      event_type: "maintenance_run_applying",
      status: "applying",
      timestamp: now,
      actor: input.actor || "agent",
      summary: `Maintenance run ${nextRun.id} applying with ${items.length} item(s).`,
      evidence_refs: evidenceRefs,
      metadata: {
        run_id: nextRun.id,
        gate_levels: gates.map((gate) => gate.level),
      },
    });
    ledgerPath = appended.path;
    ledgerEvent = appended.event;
  }

  return {
    ok: true,
    errors: [],
    run: nextRun,
    gates,
    ledger_path: ledgerPath,
    event: ledgerEvent,
  };
}

export function transitionMaintenanceQueueItem(item = {}, transition = {}) {
  const action = String(transition.action || "").trim().toLowerCase();
  const spec = TRANSITIONS[action];
  if (!spec) {
    throw new Error(`Unsupported maintenance queue action: ${transition.action}`);
  }

  const now = transition.now || new Date().toISOString();
  const next = redactSecrets({
    ...item,
    kind: "maintenance_operation",
    status: spec.status,
    updated_at: now,
    ...(transition.evidence_refs
      ? { evidence_refs: mergeRefs(item.evidence_refs, transition.evidence_refs) }
      : {}),
    ...(action === "approve"
      ? {
          approval: {
            confirmed: Boolean(transition.confirmed),
            confirmed_at: now,
            ...(transition.actor ? { actor: transition.actor } : {}),
          },
        }
      : {}),
    ...(transition.reason ? { decision_reason: transition.reason } : {}),
  });

  const event = redactSecrets({
    id: `ml-${compactTimestamp(now)}-${safeId(item.id || "maintenance")}-${action}`,
    queue_item_id: item.id || null,
    object_ref: item.object_ref || null,
    event_type: spec.event_type,
    status: spec.status,
    timestamp: now,
    actor: transition.actor || "agent",
    summary: maintenanceTransitionSummary(action, next, transition),
    evidence_refs: next.evidence_refs || [],
    redaction: {
      raw_secret_seen: false,
      raw_secret_recorded: false,
    },
  });

  return { item: next, event };
}

export function evaluateMaintenanceSideEffectGate(input = {}) {
  const level = String(input.level || input.side_effect || "").trim();
  const base = {
    level,
    operation: input.operation || null,
    allowed: false,
    requires_confirmation: false,
    backup_required: false,
    reason: "",
  };

  if (!MAINTENANCE_SIDE_EFFECT_LEVELS.includes(level)) {
    return {
      ...base,
      reason: `Unsupported maintenance side-effect level: ${level || "missing"}`,
    };
  }

  if (["local_read", "remote_read", "local_derived_write"].includes(level)) {
    return {
      ...base,
      allowed: true,
      reason: "Allowed by default maintenance read/derived-write policy.",
    };
  }

  if (level === "local_authority_write") {
    return {
      ...base,
      allowed: Boolean(input.confirmed),
      requires_confirmation: true,
      reason: input.confirmed
        ? "Local authority write confirmed."
        : "Local authority write requires explicit confirmation.",
    };
  }

  if (level === "local_document_write_with_backup") {
    const backup = normalizeBackup(input.backup);
    const backupOk = Boolean(backup);
    return {
      ...base,
      allowed: backupOk,
      backup_required: true,
      ...(backup ? { backup } : {}),
      reason: backupOk
        ? "Local document write is allowed because backup metadata is present."
        : "Local document write requires backup metadata before applying changes.",
    };
  }

  if (["remote_write", "destructive_remote_write", "external_action"].includes(level)) {
    const confirmed = Boolean(input.confirmed);
    const needsBackup = level === "destructive_remote_write";
    const backup = normalizeBackup(input.backup);
    return {
      ...base,
      allowed: confirmed && (!needsBackup || Boolean(backup)),
      requires_confirmation: true,
      backup_required: needsBackup,
      ...(backup ? { backup } : {}),
      reason: confirmed
        ? needsBackup && !backup
          ? "Destructive remote write requires backup metadata."
          : "High-risk maintenance side effect confirmed."
        : "Remote, destructive, and external maintenance side effects require explicit confirmation.",
    };
  }

  return base;
}

export async function appendMaintenanceLedgerEvent(root, event = {}, options = {}) {
  const normalized = normalizeLedgerEvent(event);
  const ledgerFile = jsonlLedgerPathFor(options.ledgerFile || join(root, "maintenance", "ledger.jsonl"));
  const appended = await appendJsonlLedgerEntry(ledgerFile, normalized, {
    legacy_path: options.legacyLedgerFile,
  });
  const validation = validateMaintenanceLedger(appended.ledger);
  if (!validation.ok) {
    throw new Error(`Invalid maintenance ledger:\n${validation.errors.join("\n")}`);
  }
  return { event: normalized, ledger: appended.ledger, path: appended.path };
}

export function validateMaintenanceLedger(input = {}) {
  const ledger = typeof input === "string" ? parseYaml(input) : input;
  const errors = [];
  const events = Array.isArray(ledger?.events) ? ledger.events : [];
  if (!Array.isArray(ledger?.events)) errors.push("events must be an array");

  for (const [index, event] of events.entries()) {
    const prefix = `events[${index}]`;
    for (const field of ["id", "queue_item_id", "object_ref", "event_type", "status", "timestamp", "actor", "summary"]) {
      if (!Object.hasOwn(event, field)) errors.push(`${prefix}.${field} is required`);
    }
    if (
      event.status &&
      !MAINTENANCE_QUEUE_STATUSES.includes(event.status) &&
      !MAINTENANCE_RUN_STATUSES.includes(event.status) &&
      event.status !== "warning"
    ) {
      errors.push(`${prefix}.status unsupported: ${event.status}`);
    }
    if (event.timestamp && !Number.isFinite(Date.parse(event.timestamp))) {
      errors.push(`${prefix}.timestamp must be ISO-8601`);
    }
    const secretCheck = validateSecretSafeEvidence({
      surface: "maintenance-ledger",
      status: event.status,
      content: event,
    });
    if (!secretCheck.ok) errors.push(`${prefix} contains unredacted secret evidence`);
  }

  return {
    ok: errors.length === 0,
    errors,
    events,
  };
}

export function learnMaintenanceTemplateCandidates(runs = [], options = {}) {
  const now = options.now || new Date().toISOString();
  const minOccurrences = Number.isFinite(options.min_occurrences) ? options.min_occurrences : 2;
  const groups = new Map();

  for (const run of Array.isArray(runs) ? runs : []) {
    const validation = validateMaintenanceRun(run);
    if (!validation.ok || validation.normalized.status !== "completed") continue;
    const shape = templateShapeFromRun(validation.normalized);
    const key = JSON.stringify(shape);
    if (!groups.has(key)) groups.set(key, { shape, runs: [] });
    groups.get(key).runs.push(validation.normalized);
  }

  return [...groups.values()]
    .filter((group) => group.runs.length >= minOccurrences)
    .map((group) => {
      const source = group.runs[0];
      return redactSecrets({
        id: `mtc-${safeId(source.template_ref || source.title || source.id)}`,
        kind: "maintenance_template_candidate",
        title: source.title,
        status: "pending_review",
        authority: "non_authoritative",
        authoritative: false,
        source: "learned_from_recurring_runs",
        shape: group.shape,
        provenance: {
          run_ids: group.runs.map((run) => run.id),
          learned_at: now,
        },
        review_required_reason: "Learned candidates are non-authoritative and require explicit user review before use.",
        evidence_refs: mergeRefs([], group.runs.flatMap((run) => run.evidence_refs || [])),
      });
    });
}

export function validateMaintenanceTemplateCandidate(candidate = {}) {
  const errors = [];
  if (!isPlainObject(candidate)) {
    return {
      ok: false,
      errors: ["maintenance template candidate must be an object"],
      normalized: null,
    };
  }
  if (candidate.kind && candidate.kind !== "maintenance_template_candidate") {
    errors.push("template candidate kind must be maintenance_template_candidate");
  }
  for (const field of ["id", "title", "status", "authority", "source", "shape", "provenance"]) {
    if (!Object.hasOwn(candidate, field)) errors.push(`${field} is required for maintenance template candidate`);
  }
  if (candidate.status && !MAINTENANCE_TEMPLATE_CANDIDATE_STATUSES.includes(candidate.status)) {
    errors.push(`status must be one of: ${MAINTENANCE_TEMPLATE_CANDIDATE_STATUSES.join(", ")}`);
  }
  if (candidate.authority && !["non_authoritative", "authoritative"].includes(candidate.authority)) {
    errors.push("authority must be non_authoritative or authoritative");
  }
  if (candidate.authority === "authoritative" && candidate.status !== "approved") {
    errors.push("authoritative template candidates must be approved");
  }
  if (candidate.authoritative === true && candidate.authority !== "authoritative") {
    errors.push("authoritative boolean requires authority=authoritative");
  }
  if (!isPlainObject(candidate.shape)) errors.push("shape must be an object");
  if (!isPlainObject(candidate.provenance)) {
    errors.push("provenance must be an object");
  } else if (!Array.isArray(candidate.provenance.run_ids)) {
    errors.push("provenance.run_ids must be an array");
  }

  const normalized = redactSecrets({
    ...candidate,
    kind: "maintenance_template_candidate",
    status: candidate.status || "pending_review",
    authority: candidate.authority || "non_authoritative",
    authoritative: candidate.authority === "authoritative" && candidate.status === "approved",
    evidence_refs: Array.isArray(candidate.evidence_refs) ? candidate.evidence_refs : [],
  });
  if (normalized.status !== "approved" || normalized.authority !== "authoritative") {
    normalized.status = "pending_review";
    normalized.authority = "non_authoritative";
    normalized.authoritative = false;
  }

  return {
    ok: errors.length === 0,
    errors,
    normalized,
  };
}

export function reviewMaintenanceTemplateCandidate(candidate = {}, review = {}) {
  const validation = validateMaintenanceTemplateCandidate(candidate);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors, template: validation.normalized };
  }
  const action = String(review.action || "").trim().toLowerCase();
  const confirmed = Boolean(review.confirmed);
  const actor = String(review.actor || "agent");
  if (["approve", "promote"].includes(action) && (!confirmed || actor !== "user")) {
    return {
      ok: false,
      errors: ["Template approval or promotion requires explicit user review confirmation."],
      template: validation.normalized,
    };
  }
  if (!["approve", "promote", "reject"].includes(action)) {
    return {
      ok: false,
      errors: [`Unsupported maintenance template review action: ${review.action}`],
      template: validation.normalized,
    };
  }

  const now = review.now || new Date().toISOString();
  const approved = ["approve", "promote"].includes(action);
  const template = redactSecrets({
    ...validation.normalized,
    status: approved ? "approved" : "rejected",
    authority: approved ? "authoritative" : "non_authoritative",
    authoritative: approved,
    reviewed_at: now,
    reviewed_by: actor,
    evidence_refs: mergeRefs(validation.normalized.evidence_refs, review.evidence_refs),
  });
  return {
    ok: true,
    errors: [],
    template,
  };
}

export function resolveMaintenanceEvidencePaths(root, options = {}) {
  const itemId = safeId(options.queue_item_id || options.id || "maintenance-item");
  const stamp = compactTimestamp(options.timestamp || new Date().toISOString());
  const baseName = `${itemId}-${stamp}.yaml`;
  return {
    scan: join(root, "maintenance", "evidence", "scan", baseName),
    dry_run: join(root, "maintenance", "evidence", "dry-runs", baseName),
    apply: join(root, "maintenance", "evidence", "apply-results", baseName),
    verify: join(root, "maintenance", "evidence", "verify-results", baseName),
    backup: join(root, "maintenance", "backups", baseName),
  };
}

export function renderMaintenanceStatus(queue = {}, options = {}) {
  const language = normalizeLanguage(options);
  const items = Array.isArray(queue?.items) ? queue.items.map((item) => redactSecrets(item)) : [];
  if (language === "zh-CN") {
    const counts = countBy(items, "status");
    const blocked = counts.blocked || 0;
    const pending = counts.queued || 0;
    const summary = [
      `维护队列摘要：共 ${items.length} 项，待处理 ${pending} 项，阻塞 ${blocked} 项。`,
      ...items.map((item) => {
        const status = STATUS_ZH[item.status] || item.status || "未知";
        return `- ${item.id}: ${item.object_ref || "未知对象"} / ${item.operation || "未知操作"}，状态 ${status}，优先级 ${item.priority || "normal"}。`;
      }),
    ].join("\n");
    return { language, summary: redactSecrets(summary), counts };
  }

  const summary = [
    `Maintenance queue: ${items.length} item(s).`,
    ...items.map((item) => `- ${item.id}: ${item.operation || "unknown"} is ${item.status || "unknown"}.`),
  ].join("\n");
  return { language, summary: redactSecrets(summary), counts: countBy(items, "status") };
}

export function renderMaintenanceLog(ledger = {}, options = {}) {
  const language = normalizeLanguage(options);
  const events = Array.isArray(ledger?.events) ? ledger.events.map((event) => redactSecrets(event)) : [];
  if (language === "zh-CN") {
    const blocked = events.filter((event) => event.status === "blocked").length;
    const summary = [
      `维护日志摘要：共 ${events.length} 条事件，阻塞 ${blocked} 条。`,
      ...events.map((event) => {
        const type = EVENT_ZH[event.event_type] || event.event_type || "事件";
        const status = STATUS_ZH[event.status] || event.status || "未知";
        return `- ${event.timestamp || "未知时间"} ${type}：${status}。${event.summary || ""}`;
      }),
    ].join("\n");
    return { language, summary: redactSecrets(summary), events };
  }

  const summary = [
    `Maintenance log: ${events.length} event(s).`,
    ...events.map((event) => `- ${event.timestamp || "unknown"} ${event.event_type || "event"}: ${event.status || "unknown"}. ${event.summary || ""}`),
  ].join("\n");
  return { language, summary: redactSecrets(summary), events };
}

function normalizeLedgerEvent(event = {}) {
  const timestamp = event.timestamp || new Date().toISOString();
  const redacted = redactSecrets({
    id: event.id || `ml-${compactTimestamp(timestamp)}`,
    queue_item_id: event.queue_item_id || null,
    object_ref: event.object_ref || null,
    event_type: event.event_type || "maintenance_event",
    status: event.status || "completed",
    timestamp,
    actor: event.actor || "agent",
    summary: event.summary || "",
    evidence_refs: Array.isArray(event.evidence_refs) ? event.evidence_refs : [],
    ...(event.metadata ? { metadata: event.metadata } : {}),
    redaction: {
      ...(isPlainObject(event.redaction) ? redactSecrets(event.redaction) : {}),
      raw_secret_seen: validateSecretSafeEvidence({ content: event }).leak_count > 0,
      raw_secret_recorded: false,
    },
  });
  redacted.redaction.raw_secret_recorded = false;
  return redacted;
}

function normalizeRunQueueItem(run, item, options = {}) {
  const now = options.now || new Date().toISOString();
  const base = redactSecrets({
    ...item,
    id: item.id || `mq-${safeId(run.id)}-${options.index + 1 || 1}`,
    kind: "maintenance_operation",
    object_ref: item.object_ref || run.object_ref,
    operation: item.operation || "maintenance_operation",
    target_ref: item.target_ref || run.object_ref,
    scope: isPlainObject(item.scope)
      ? item.scope
      : {
          run_id: run.id,
          ...(isPlainObject(run.scope) ? run.scope : {}),
        },
    status: options.status || item.status || "planned",
    priority: item.priority || run.priority || "normal",
    side_effect: item.side_effect || "local_read",
    confirmation_required: Boolean(
      item.confirmation_required ||
        ["local_authority_write", "remote_write", "destructive_remote_write", "external_action"].includes(item.side_effect),
    ),
    dependencies: Array.isArray(item.dependencies) ? item.dependencies : [],
    policy_refs: Array.isArray(item.policy_refs) ? item.policy_refs : ["maintenance-side-effect-gate"],
    evidence_refs: Array.isArray(item.evidence_refs) ? item.evidence_refs : [],
    review_group: options.review_group || item.review_group || reviewGroupFor(run, item),
    created_at: item.created_at || run.created_at || now,
    updated_at: now,
  });
  for (const field of FEATURE_QUEUE_FIELDS) {
    delete base[field];
  }
  return base;
}

function reviewGroupFor(run, item) {
  if (item.review_group) return item.review_group;
  if (run.review_mode === "per_item") return item.target_ref || item.id;
  return run.id;
}

function flattenDiscoveryChildren(children = [], output = []) {
  for (const child of Array.isArray(children) ? children : []) {
    if (!isPlainObject(child)) continue;
    const current = redactSecrets({
      ref: child.ref || child.id || child.title || "unknown",
      ...(child.title ? { title: child.title } : {}),
      ...(child.checksum_sha256 ? { checksum_sha256: child.checksum_sha256 } : {}),
    });
    output.push(current);
    flattenDiscoveryChildren(child.children, output);
  }
  return output;
}

function operationForDiscoveredSubitem(run, subitem) {
  const strategy = run.scope?.partition_strategy || run.discovery_input?.adapter || "partition";
  if (strategy === "child_page_tree" || run.discovery_input?.adapter === "notion_child_page_tree") {
    return "inspect_notion_child_page";
  }
  if (strategy === "document" || run.discovery_input?.adapter === "local_docs_folder") {
    return "inspect_document";
  }
  return `inspect_${safeId(strategy)}`;
}

function templateShapeFromRun(run) {
  const plannedItems = Array.isArray(run.planned_items) ? run.planned_items : [];
  return redactSecrets({
    run_type: run.run_type,
    review_mode: run.review_mode,
    object_ref: run.object_ref,
    template_ref: run.template_ref || null,
    operations: plannedItems.map((item) => item.operation),
    side_effects: plannedItems.map((item) => item.side_effect || "local_read"),
  });
}

function normalizeBackup(backup) {
  if (!isPlainObject(backup)) return null;
  if (!backup.path || !backup.checksum_sha256 || !backup.created_at) return null;
  if (!/^[a-f0-9]{64}$/i.test(String(backup.checksum_sha256))) return null;
  if (!Number.isFinite(Date.parse(backup.created_at))) return null;
  return redactSecrets({
    path: String(backup.path),
    checksum_sha256: String(backup.checksum_sha256),
    created_at: backup.created_at,
  });
}

function maintenanceTransitionSummary(action, item, transition) {
  const reason = transition.reason ? ` Reason: ${transition.reason}` : "";
  return `Maintenance queue item ${item.id || "unknown"} ${action}.${reason}`;
}

function mergeRefs(existing = [], incoming = []) {
  return [...new Set([...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])])];
}

function normalizeLanguage(options = {}) {
  const language = options.output?.language || options.language || "en";
  return ["zh", "zh-CN"].includes(language) ? "zh-CN" : "en";
}

function countBy(items, field) {
  const counts = {};
  for (const item of items) {
    const key = item[field] || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function compactTimestamp(value) {
  return String(value)
    .replace(/[-:]/g, "")
    .replace(/\.\d+/, "")
    .replace(/\+/, "+")
    .replace(/Z$/, "Z");
}

function safeId(value) {
  return String(value || "item")
    .trim()
    .replace(/[^A-Za-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
