import { detectSecretLeaks } from "../evidence/index.js";
import { sha256Canonical } from "../storage-sync/index.js";

const FORBIDDEN_BUNDLE_KEYS = new Set([
  "raw_records",
  "raw_knowledge_records",
  "raw_secret_store",
  "messages",
  "blocks",
  "raw_blocks",
  "raw_blocks_payload",
  "raw_value",
  "value",
  "token",
  "api_key",
  "apikey",
  "password",
  "authorization",
  "access_token",
  "refresh_token",
  "client_secret",
  "private_key",
  "client",
  "clients",
]);

const SECRET_TEXT_PATTERNS = Object.freeze([
  /\bAuthorization\s*:\s*Bearer\s+[^\s,;]+/gi,
  /\b(api[_-]?key|token|password|secret|client[_-]?secret)\s*[:=]\s*("[^"]+"|'[^']+'|[^\s,;]+)/gi,
  /\bsk-[A-Za-z0-9._-]{8,}\b/g,
  /\bsecret_[A-Za-z0-9._-]+/gi,
  /\braw-[A-Za-z0-9._-]*(secret|token|password|api-key)[A-Za-z0-9._-]*/gi,
]);

export async function buildRootManagementDryRunBundle(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const evidenceRoot = options.evidenceRoot || "~/.hypo-workflow/maintenance/evidence/dry-runs/";
  const workspace = sanitizeBundleValue(input.workspace || {});
  const objectIds = asArray(workspace.objects).map((object) => String(object.id || "")).filter(Boolean).sort();
  const sections = sanitizeBundleValue({
    workspace_draft: {
      authority: workspace.workspace?.authority || "workspace_yaml",
      object_ids: objectIds,
      sync_target_ids: asArray(workspace.sync_targets).map((target) => target.id).filter(Boolean).sort(),
      policy_ids: asArray(workspace.policies).map((policy) => policy.id).filter(Boolean).sort(),
      secret_refs: asArray(workspace.secret_refs).map((ref) => metadataOnlySecretRef(ref)),
    },
    object_registry: input.object_registry || { objects: objectIds.map((id) => ({ object_id: id })) },
    artifact_catalog: input.artifact_catalog || { entries: [] },
    storage_sync_template: input.storage_sync_template || {},
    notion_merge_plan: buildNotionMergePlan(input.notion_dry_run),
    maintenance_queue: input.maintenance_queue || { items: [] },
    run_plans: asArray(input.run_plans),
    global_projections: input.global_projections || { entries: [] },
    backups_preview: input.backups_preview || { items: [] },
  });
  const review = sanitizeBundleValue(buildReview(input, sections, evidenceRoot));
  sections.redaction_scan = review.redaction_scan;

  const contentHash = `sha256:${sha256Canonical({
    kind: "root_management_dry_run_review_bundle",
    schema_version: "1",
    remote_writes_enabled: false,
    apply_enabled: false,
    external_actions_enabled: false,
    sections,
    review,
  })}`;
  const bundleId = `rmdrb-${safeId(primaryObjectId(input, objectIds))}-${contentHash.slice(7, 19)}`;
  const reviewReport = renderRootDryRunReviewReport({
    bundle_id: bundleId,
    bundle_hash: contentHash,
    generated_at: now,
    evidence_root: evidenceRoot,
    review,
  }, options);

  return sanitizeBundleValue({
    kind: "root_management_dry_run_review_bundle",
    schema_version: "1",
    command: input.command || "/hw:maintain plan",
    mode: "dry-run",
    bundle_id: bundleId,
    bundle_hash: contentHash,
    content_hash: contentHash,
    generated_at: now,
    evidence_root: evidenceRoot,
    remote_writes_enabled: false,
    apply_enabled: false,
    external_actions_enabled: false,
    sections,
    review,
    review_report: reviewReport,
  });
}

export async function applyApprovedNotionDryRunBundle(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const evidenceRefs = evidenceRefsFor(input, now);
  const waiting = (errors, extra = {}) => applyFailure(input, errors, {
    now,
    evidenceRefs,
    queueStatus: "waiting_confirmation",
    ledgerStatus: "blocked",
    eventType: "apply_preflight_blocked",
    ...extra,
  });

  const requiredErrors = requiredApplyInputErrors(input);
  if (requiredErrors.length) return waiting(requiredErrors);

  const bundle = input.bundle;
  const hashError = validateDryRunHash(bundle, input.dry_run_hash);
  if (hashError) return waiting([hashError], { applyResult: { status: "blocked", writes_attempted: 0 } });

  const payloadErrors = rawApplyPayloadErrors(bundle);
  if (payloadErrors.length) return waiting(payloadErrors);

  const safetyErrors = applySafetyErrors(bundle, input.reviewed_apply_plan);
  if (safetyErrors.length) return waiting(safetyErrors);

  const operationErrors = approvedOperationErrors(bundle, input.reviewed_apply_plan, input.target_page_ids);
  if (operationErrors.length) return waiting(operationErrors);

  const approvedIds = new Set(asArray(input.reviewed_apply_plan.approved_operation_ids));
  const operations = asArray(bundle.sections?.notion_merge_plan?.operations);
  const approvedOperations = operations.filter((operation) => approvedIds.has(operation.id));
  const skippedOperationIds = operations
    .filter((operation) => !approvedIds.has(operation.id))
    .map((operation) => operation.id)
    .filter(Boolean);
  const notion = input.notion || {};
  const appliedOperationIds = [];
  for (const operation of approvedOperations) {
    await applyNotionOperation(notion, operation, input.target_page_ids);
    appliedOperationIds.push(operation.id);
  }

  const verifyResult = await verifyAppliedOperations(notion, approvedOperations, input.target_page_ids);
  const applyResult = sanitizeBundleValue({
    status: "applied",
    applied_operation_ids: appliedOperationIds,
    skipped_operation_ids: skippedOperationIds,
    writes_attempted: appliedOperationIds.length,
  });
  if (!verifyResult.passed) {
    return applyFailure(input, ["verification failed for applied Notion operations"], {
      now,
      evidenceRefs,
      queueStatus: "verifying",
      ledgerStatus: "failed",
      eventType: "apply_verify_failed",
      applyResult,
      verifyResult,
    });
  }

  return sanitizeBundleValue({
    ok: true,
    errors: [],
    apply_result: applyResult,
    verify_result: verifyResult,
    queue_item: {
      ...(input.queue_item || {}),
      status: "completed",
      updated_at: now,
      evidence_refs: evidenceRefs,
    },
    ledger_event: ledgerEvent(input, {
      now,
      status: "completed",
      eventType: "apply_verify_completed",
      evidenceRefs,
      summary: "Approved Notion dry-run bundle applied and verified.",
      applyResult,
      verifyResult,
    }),
    evidence_refs: evidenceRefs,
  });
}

export function renderRootDryRunReviewReport(bundle = {}, options = {}) {
  const review = bundle.review || {};
  const redaction = review.redaction_scan || {};
  const language = options.language || "zh-CN";
  if (language !== "zh-CN" && language !== "zh") {
    return [
      "# C16-M8 End-to-End Dry-Run Review Pack",
      "",
      `Bundle Hash: ${bundle.bundle_hash || ""}`,
      `Evidence Root: ${bundle.evidence_root || ""}`,
      "",
      "## Redaction Evidence",
      `raw_secret_seen: ${Boolean(redaction.raw_secret_seen)}`,
      `raw_secret_recorded: ${Boolean(redaction.raw_secret_recorded)}`,
      "",
      "## No-Write Evidence",
      "remote_writes_enabled=false; apply_enabled=false; external_actions_enabled=false.",
    ].join("\n");
  }

  return sanitizeReport([
    "# C16-M8 端到端 Dry-Run Review Pack",
    "",
    `Bundle Hash：${bundle.bundle_hash || ""}`,
    `Bundle ID：${bundle.bundle_id || ""}`,
    `证据根目录：${bundle.evidence_root || ""}`,
    "",
    "## 脱敏证据",
    `raw_secret_seen：${Boolean(redaction.raw_secret_seen)}`,
    `raw_secret_recorded：${Boolean(redaction.raw_secret_recorded)}`,
    `evidence_refs：${asArray(redaction.evidence_refs).join(", ") || "无"}`,
    `metadata-only secret refs：${metadataOnlySecretRefsForReport(review).join(", ") || "无"}`,
    "",
    "## No-Write Evidence",
    "remote_writes_enabled=false；apply_enabled=false；external_actions_enabled=false；Notion、发布和外部动作均保持 dry-run。",
    "",
    "## 本地写入候选",
    renderCandidateLines(review.local_write_candidates),
    "",
    "## 远程写入候选",
    renderCandidateLines(review.remote_write_candidates),
    "",
    "## 外部动作候选",
    renderCandidateLines(review.external_action_candidates),
    "",
    "## 冲突",
    renderConflictLines(review.conflicts),
    "",
    "## 用户确认 / 确认门禁",
    renderConfirmationLines(review.confirmation_requirements),
  ].join("\n"));
}

function buildNotionMergePlan(notionDryRun = {}) {
  return sanitizeBundleValue({
    mode: "dry-run",
    remote_writes_enabled: false,
    apply_required: false,
    evidence: notionDryRun.evidence || [],
    operations: asArray(notionDryRun.operations).map((operation) => ({
      ...operation,
      planned_operation: operation.operation || operation.operation_type || operation.action || null,
      action: "dry-run",
      dry_run: true,
      remote_writes_enabled: false,
    })),
    conflicts: notionDryRun.conflicts || [],
  });
}

function requiredApplyInputErrors(input = {}) {
  const errors = [];
  for (const field of ["explicit_user_confirmation", "dry_run_id", "dry_run_hash", "reviewed_apply_plan", "target_page_ids"]) {
    if (input[field] === undefined || input[field] === null || input[field] === "") {
      errors.push(`${field} is required for /hw:maintain apply`);
    }
  }
  if (input.explicit_user_confirmation !== undefined && input.explicit_user_confirmation !== null && input.explicit_user_confirmation !== "") {
    if (!isValidExplicitConfirmation(input.explicit_user_confirmation, input)) {
      errors.push("explicit_user_confirmation must exactly approve this dry-run id and hash");
    }
  }
  if (!isPlainObject(input.target_page_ids) || Object.keys(input.target_page_ids).length === 0) {
    errors.push("target_page_ids must provide explicit target bindings for approved Notion operations");
  }
  if (input.reviewed_apply_plan) {
    if (!input.reviewed_apply_plan.dry_run_id) {
      errors.push("reviewed_apply_plan.dry_run_id is required");
    } else if (input.reviewed_apply_plan.dry_run_id !== input.dry_run_id) {
      errors.push("reviewed_apply_plan.dry_run_id must match dry_run_id");
    }
    if (!input.reviewed_apply_plan.dry_run_hash) {
      errors.push("reviewed_apply_plan.dry_run_hash is required");
    } else if (input.reviewed_apply_plan.dry_run_hash !== input.dry_run_hash) {
      errors.push("reviewed_apply_plan.dry_run_hash must match dry_run_hash");
    }
  }
  if (!input.bundle) errors.push("bundle is required for /hw:maintain apply");
  return errors;
}

function isValidExplicitConfirmation(value, input = {}) {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  const expected = `I explicitly approve applying reviewed Notion dry-run bundle ${input.dry_run_id} with hash ${input.dry_run_hash}`;
  return value.trim() === expected;
}

function validateDryRunHash(bundle = {}, expectedHash) {
  if (!bundle || !expectedHash) return "dry_run_hash cannot be verified without bundle and expected hash";
  const actualHash = recomputeDryRunBundleHash(bundle);
  if (actualHash !== expectedHash || bundle.bundle_hash !== expectedHash) {
    return `dry_run_hash mismatch: stale or mutated bundle (${actualHash} != ${expectedHash})`;
  }
  return null;
}

function recomputeDryRunBundleHash(bundle = {}) {
  return `sha256:${sha256Canonical({
    kind: bundle.kind,
    schema_version: bundle.schema_version,
    remote_writes_enabled: Boolean(bundle.remote_writes_enabled),
    apply_enabled: Boolean(bundle.apply_enabled),
    external_actions_enabled: Boolean(bundle.external_actions_enabled),
    sections: bundle.sections || {},
    review: bundle.review || {},
  })}`;
}

function rawApplyPayloadErrors(bundle = {}) {
  const errors = [];
  const forbidden = [];
  collectForbiddenApplyKeys(bundle, [], forbidden);
  if (forbidden.length) errors.push(`raw knowledge or secret payload fields are not allowed: ${forbidden.join(", ")}`);
  if (detectSecretLeaks(bundle).length > 0) errors.push("raw secret payload detected in dry-run bundle");
  const serialized = JSON.stringify(bundle);
  if (/RAW_[A-Z0-9_]+/.test(serialized)) errors.push("raw Knowledge marker detected in dry-run bundle");
  return errors;
}

function collectForbiddenApplyKeys(value, path, output) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenApplyKeys(item, [...path, String(index)], output));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = normalizeKey(key);
    if (FORBIDDEN_BUNDLE_KEYS.has(normalizedKey)) output.push([...path, key].join("."));
    collectForbiddenApplyKeys(child, [...path, key], output);
  }
}

function applySafetyErrors(bundle = {}, reviewedPlan = {}) {
  const review = bundle.review || {};
  const errors = [];
  if (asArray(review.conflicts).some((conflict) => conflict.status !== "resolved")) {
    errors.push("unresolved conflict blocks Notion apply");
  }
  if (asArray(review.remote_write_candidates).some((candidate) => candidate.status !== "approved")) {
    errors.push("remote write candidates require approved review confirmation");
  }
  const externalCandidates = asArray(review.external_action_candidates);
  if (externalCandidates.length > 0) {
    const hasPublication = externalCandidates.some((candidate) => String(candidate.id || candidate.target_ref || "").startsWith("publication:"));
    errors.push(hasPublication
      ? "publication and external action candidates are unsupported by this Notion apply gate"
      : "external action candidates are unsupported by this Notion apply gate");
  }
  const approvedIds = new Set(asArray(reviewedPlan.approved_operation_ids));
  const operations = asArray(bundle.sections?.notion_merge_plan?.operations);
  if (operations.some((operation) => approvedIds.has(operation.id) && operation.side_effect === "external_action")) {
    errors.push("external action operations are unsupported by this Notion apply gate");
  }
  return errors;
}

function approvedOperationErrors(bundle = {}, reviewedPlan = {}, targetPageIds = {}) {
  const operations = asArray(bundle.sections?.notion_merge_plan?.operations);
  const byId = new Map(operations.map((operation) => [operation.id, operation]));
  const planOperations = new Map(asArray(reviewedPlan.operations).map((operation) => [operation.id, operation]));
  const errors = [];
  for (const id of asArray(reviewedPlan.approved_operation_ids)) {
    const operation = byId.get(id);
    if (!operation) {
      errors.push(`approved operation missing from bundle: ${id}`);
      continue;
    }
    const planOperation = planOperations.get(id);
    if (!planOperation?.operation_hash || planOperation.operation_hash !== operation.operation_hash) {
      errors.push(`operation_hash drift for approved operation ${id}`);
    }
    const targetPageId = resolveTargetPageId(operation, targetPageIds);
    if (!targetPageId) errors.push(`target_page_ids missing binding for ${operation.target_ref || id}`);
    if (!["append_child_block", "update_block"].includes(String(operation.action))) {
      errors.push(`unsupported Notion operation action: ${operation.action || "missing"}`);
    }
  }
  return errors;
}

async function applyNotionOperation(notion, operation, targetPageIds) {
  if (operation.action === "update_block") {
    return notion.updateBlock({
      operation_id: operation.id,
      block_id: operation.target_block_id,
      block: operation.block,
      text: operation.expected?.text,
    });
  }
  return notion.appendBlock({
    operation_id: operation.id,
    page_id: resolveTargetPageId(operation, targetPageIds),
    block: operation.block,
  });
}

async function verifyAppliedOperations(notion, operations, targetPageIds) {
  const verifiedTargetPageIds = new Set();
  const failures = [];
  for (const operation of operations) {
    const expectedText = String(operation.expected?.text || operation.block?.text || "");
    if (operation.action === "update_block") {
      const read = await notion.readBlock({ block_id: operation.target_block_id });
      if (!String(read?.text || "").includes(expectedText)) failures.push(operation.id);
    } else {
      const pageId = resolveTargetPageId(operation, targetPageIds);
      verifiedTargetPageIds.add(pageId);
      const read = await notion.readPage({ page_id: pageId });
      if (!String(read?.text || "").includes(expectedText)) failures.push(operation.id);
    }
  }
  return sanitizeBundleValue({
    passed: failures.length === 0,
    failed_operation_ids: failures,
    verified_target_page_ids: [...verifiedTargetPageIds].filter(Boolean).sort(),
  });
}

function applyFailure(input, errors, options = {}) {
  const evidenceRefs = options.evidenceRefs || evidenceRefsFor(input, options.now);
  const applyResult = options.applyResult || { status: "blocked", writes_attempted: 0 };
  const verifyResult = options.verifyResult || { passed: false, verified_target_page_ids: [] };
  return sanitizeBundleValue({
    ok: false,
    errors,
    apply_result: applyResult,
    verify_result: verifyResult,
    queue_item: {
      ...(input.queue_item || {}),
      status: options.queueStatus || "waiting_confirmation",
      updated_at: options.now || null,
      evidence_refs: evidenceRefs,
    },
    ledger_event: ledgerEvent(input, {
      now: options.now,
      status: options.ledgerStatus || "blocked",
      eventType: options.eventType || "apply_blocked",
      evidenceRefs,
      summary: errors.join("; "),
      applyResult,
      verifyResult,
    }),
    evidence_refs: evidenceRefs,
  });
}

function ledgerEvent(input, options = {}) {
  return sanitizeBundleValue({
    id: `ml-${compactTimestamp(options.now)}-${safeId(input.queue_item?.id || input.dry_run_id || "notion-apply")}`,
    queue_item_id: input.queue_item?.id || null,
    object_ref: input.queue_item?.object_ref || null,
    event_type: options.eventType,
    status: options.status,
    timestamp: options.now || null,
    actor: "agent",
    summary: options.summary || "",
    evidence_refs: options.evidenceRefs || [],
    metadata: {
      dry_run_id: input.dry_run_id || null,
      dry_run_hash: input.dry_run_hash || null,
      apply_status: options.applyResult?.status || null,
      verify_passed: Boolean(options.verifyResult?.passed),
    },
    redaction: {
      raw_secret_seen: false,
      raw_secret_recorded: false,
    },
  });
}

function evidenceRefsFor(input = {}, now) {
  const base = safeId(input.queue_item?.id || input.dry_run_id || "notion-apply");
  const stamp = compactTimestamp(now);
  return [
    `~/.hypo-workflow/maintenance/evidence/apply-results/${base}-${stamp}.yaml`,
    `~/.hypo-workflow/maintenance/evidence/verify-results/${base}-${stamp}.yaml`,
  ];
}

function resolveTargetPageId(operation = {}, targetPageIds = {}, planOperation = {}) {
  return targetPageIds[operation.target_ref];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildReview(input, sections, evidenceRoot) {
  const queueItems = asArray(sections.maintenance_queue?.items);
  const notionOperations = asArray(sections.notion_merge_plan?.operations);
  const publicationCandidates = asArray(input.publication?.candidates);
  const externalCandidates = asArray(input.external_actions?.candidates);
  const localWriteCandidates = queueItems
    .filter((item) => isLocalWriteSideEffect(item.side_effect))
    .map((item) => reviewCandidate(item, { dry_run: true, remote_writes_enabled: false }));
  const remoteWriteCandidates = [
    ...queueItems.filter((item) => isRemoteWriteSideEffect(item.side_effect)),
    ...notionOperations,
  ].map((item) => reviewCandidate(item, {
    side_effect: "remote_write",
    dry_run: true,
    remote_writes_enabled: false,
  }));
  const externalActionCandidates = [
    ...queueItems.filter((item) => item.side_effect === "external_action"),
    ...publicationCandidates,
    ...externalCandidates,
  ].map((item) => reviewCandidate(item, {
    side_effect: "external_action",
    dry_run: true,
    remote_writes_enabled: false,
  }));
  const conflicts = [
    ...asArray(sections.notion_merge_plan?.conflicts),
    ...asArray(input.scenarios).filter((scenario) => scenario.status === "conflict"),
  ].map((conflict) => sanitizeBundleValue({
    id: conflict.id,
    target_ref: conflict.target_ref,
    slot_id: conflict.slot_id,
    status: "conflict",
    reason: conflict.reason || "Dry-run conflict requires review.",
  }));
  const confirmationRequirements = [
    ...remoteWriteCandidates,
    ...externalActionCandidates,
    ...queueItems.filter((item) => item.confirmation_required),
  ]
    .filter((item) => item.confirmation_required !== false || isHighRiskSideEffect(item.side_effect))
    .map((item) => sanitizeBundleValue({
      id: `confirm-${safeId(item.id || item.target_ref)}`,
      target_ref: item.target_ref || item.id,
      side_effect: item.side_effect,
      required: true,
      dry_run: true,
      remote_writes_enabled: false,
      evidence_refs: item.evidence_refs || [],
    }));

  return {
    local_write_candidates: dedupeCandidates(localWriteCandidates),
    remote_write_candidates: dedupeCandidates(remoteWriteCandidates),
    external_action_candidates: dedupeCandidates(externalActionCandidates),
    conflicts: dedupeCandidates(conflicts),
    confirmation_requirements: dedupeCandidates(confirmationRequirements),
    redaction_scan: redactionScan(input, evidenceRoot),
  };
}

function reviewCandidate(item = {}, defaults = {}) {
  return sanitizeBundleValue({
    id: item.id || item.target_ref,
    target_ref: item.target_ref || item.id,
    operation: item.operation || item.operation_type || item.action,
    status: item.review_status || item.status || defaults.status || "planned",
    side_effect: item.side_effect || defaults.side_effect || "local_read",
    dry_run: defaults.dry_run ?? item.dry_run ?? true,
    remote_writes_enabled: defaults.remote_writes_enabled ?? item.remote_writes_enabled ?? false,
    confirmation_required: Boolean(item.confirmation_required || defaults.confirmation_required),
    evidence_refs: item.evidence_refs || [],
  });
}

function redactionScan(input, evidenceRoot) {
  const leaks = detectSecretLeaks(input);
  const serialized = JSON.stringify(input);
  const rawMarkerSeen = /raw[_-]|RAW_|secret_|sk-[A-Za-z0-9._-]{8,}|Authorization\s*:\s*Bearer/i.test(serialized);
  return {
    raw_secret_seen: leaks.length > 0 || rawMarkerSeen,
    raw_secret_recorded: false,
    leak_count: leaks.length,
    metadata_secret_refs: collectMetadataSecretRefs(sanitizeBundleValue(input)),
    evidence_refs: [
      `${evidenceRoot.replace(/\/?$/, "/")}redaction-scan.yaml`,
      "bundle:redaction_scan",
    ],
  };
}

function collectMetadataSecretRefs(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectMetadataSecretRefs(item, output);
    return [...new Set(output)].sort();
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && value.startsWith("local_secret:")) output.push(value);
    return [...new Set(output)].sort();
  }
  for (const child of Object.values(value)) collectMetadataSecretRefs(child, output);
  return [...new Set(output)].sort();
}

function sanitizeBundleValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeBundleValue(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "function") return undefined;
  if (!value || typeof value !== "object") return sanitizeScalar(value);
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = normalizeKey(key);
    if (FORBIDDEN_BUNDLE_KEYS.has(normalizedKey)) continue;
    const sanitized = sanitizeBundleValue(child);
    if (sanitized === undefined) continue;
    result[key] = sanitized;
  }
  return compactObject(result);
}

function sanitizeScalar(value) {
  if (typeof value !== "string") return value;
  let result = value;
  for (const pattern of SECRET_TEXT_PATTERNS) {
    result = result.replace(pattern, (match, prefix) => {
      if (typeof prefix === "string" && /api|token|password|secret/i.test(prefix)) return `${prefix}=[REDACTED]`;
      return "[REDACTED]";
    });
  }
  if (/RAW_[A-Z0-9_]+_SHOULD_NOT_PROJECT/.test(result)) return "[REDACTED]";
  return result;
}

function sanitizeReport(value) {
  return sanitizeScalar(String(value));
}

function metadataOnlySecretRef(ref = {}) {
  return sanitizeBundleValue({
    id: ref.id,
    provider: ref.provider,
    purpose: ref.purpose,
    sensitivity: "secret_ref",
    secret_ref: {
      store_ref: ref.store_ref || `local_secret:${ref.id}`,
      metadata_only: true,
    },
    redaction_policy: {
      mode: "metadata_only",
      raw_projected: false,
    },
  });
}

function primaryObjectId(input, objectIds) {
  return input.storage_sync_template?.object_id || objectIds[0] || "workspace";
}

function renderCandidateLines(candidates = []) {
  const items = asArray(candidates);
  if (!items.length) return "- 无";
  return items.map((item) => `- ${item.target_ref || item.id}：${item.status || "planned"}，${item.side_effect || "unknown"}，dry-run。`).join("\n");
}

function renderConflictLines(conflicts = []) {
  const items = asArray(conflicts);
  if (!items.length) return "- 无";
  return items.map((item) => `- ${item.target_ref || item.id}：slot=${item.slot_id || "unknown"}，${item.reason || "需要复核"}`).join("\n");
}

function renderConfirmationLines(requirements = []) {
  const items = asArray(requirements);
  if (!items.length) return "- 无";
  return items.map((item) => `- ${item.target_ref || item.id}：required=${Boolean(item.required)}，${item.side_effect || "unknown"}`).join("\n");
}

function metadataOnlySecretRefsForReport(review = {}) {
  return asArray(review.redaction_scan?.metadata_secret_refs);
}

function dedupeCandidates(candidates = []) {
  const byKey = new Map();
  for (const candidate of candidates) {
    const key = candidate.target_ref || candidate.id || JSON.stringify(candidate);
    if (!byKey.has(key)) byKey.set(key, candidate);
  }
  return [...byKey.values()];
}

function isLocalWriteSideEffect(value) {
  return ["local_derived_write", "local_authority_write", "local_document_write_with_backup"].includes(String(value));
}

function isRemoteWriteSideEffect(value) {
  return ["remote_write", "destructive_remote_write"].includes(String(value));
}

function isHighRiskSideEffect(value) {
  return isRemoteWriteSideEffect(value) || String(value) === "external_action";
}

function compactObject(value) {
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined) continue;
    if (Array.isArray(child) && child.length === 0) {
      result[key] = child;
      continue;
    }
    if (child && typeof child === "object" && !Array.isArray(child) && Object.keys(child).length === 0) continue;
    result[key] = child;
  }
  return result;
}

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/[-\s]+/g, "_");
}

function safeId(value) {
  return String(value || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function compactTimestamp(value) {
  return String(value || new Date().toISOString()).replace(/[-:]/g, "").replace(/\..+$/, "").replace(/\+/g, "+");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}
