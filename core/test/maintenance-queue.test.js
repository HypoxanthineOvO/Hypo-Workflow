import test from "node:test";
import assert from "node:assert/strict";
import * as api from "../src/index.js";

const MAINTENANCE_STATUSES = Object.freeze([
  "queued",
  "planned",
  "approved",
  "running",
  "completed",
  "deferred",
  "skipped",
  "blocked",
]);

const SIDE_EFFECT_LEVELS = Object.freeze([
  "local_read",
  "remote_read",
  "local_derived_write",
  "local_authority_write",
  "local_document_write_with_backup",
  "remote_write",
  "destructive_remote_write",
  "external_action",
]);

test("maintenance queue item schema represents operations, not Feature/Cycle/Patch work", () => {
  const validateMaintenanceQueueItem = requireApi("validateMaintenanceQueueItem");

  const item = maintenanceItem();
  const result = validateMaintenanceQueueItem(item);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.deepEqual(result.normalized.status, "queued");
  assert.equal(result.normalized.operation, "notion_project_home_dry_run");
  assert.equal(result.normalized.object_ref, "hypo-workflow");
  assert.equal(result.normalized.kind, "maintenance_operation");
  assert.equal(Object.hasOwn(result.normalized, "feature_id"), false);
  assert.equal(Object.hasOwn(result.normalized, "cycle_id"), false);
  assert.equal(Object.hasOwn(result.normalized, "patch_id"), false);

  const featureLike = validateMaintenanceQueueItem({
    id: "F001",
    title: "Implement dashboard",
    status: "queued",
    milestones: [{ id: "M01", status: "planned" }],
  });
  assert.equal(featureLike.ok, false);
  assert.match(featureLike.errors.join("\n"), /maintenance operation/i);
});

test("maintenance queue lifecycle supports planned, approval, execution, and terminal decisions", () => {
  const transitionMaintenanceQueueItem = requireApi("transitionMaintenanceQueueItem");
  const validateMaintenanceQueueItem = requireApi("validateMaintenanceQueueItem");

  for (const status of MAINTENANCE_STATUSES) {
    const result = validateMaintenanceQueueItem(maintenanceItem({ status }));
    assert.equal(result.ok, true, `${status}: ${result.errors.join("\n")}`);
  }

  const planned = transitionMaintenanceQueueItem(maintenanceItem(), {
    action: "plan",
    now: "2026-05-19T22:05:00+08:00",
  });
  assert.equal(planned.item.status, "planned");
  assert.equal(planned.event.event_type, "queue_item_planned");

  const approved = transitionMaintenanceQueueItem(planned.item, {
    action: "approve",
    confirmed: true,
    now: "2026-05-19T22:06:00+08:00",
  });
  assert.equal(approved.item.status, "approved");
  assert.equal(approved.item.approval.confirmed, true);

  const running = transitionMaintenanceQueueItem(approved.item, {
    action: "run",
    now: "2026-05-19T22:07:00+08:00",
  });
  assert.equal(running.item.status, "running");

  const completed = transitionMaintenanceQueueItem(running.item, {
    action: "complete",
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/verify/mq-001.yaml"],
    now: "2026-05-19T22:08:00+08:00",
  });
  assert.equal(completed.item.status, "completed");
  assert.deepEqual(completed.item.evidence_refs, ["~/.hypo-workflow/maintenance/evidence/verify/mq-001.yaml"]);

  for (const action of ["defer", "skip", "block"]) {
    const result = transitionMaintenanceQueueItem(maintenanceItem(), {
      action,
      reason: `${action} fixture`,
      now: "2026-05-19T22:09:00+08:00",
    });
    assert.ok(["deferred", "skipped", "blocked"].includes(result.item.status));
    assert.match(result.event.summary, new RegExp(action, "i"));
  }
});

test("maintenance side-effect gates require confirmation for high-risk levels and backup metadata for document writes", () => {
  const evaluateMaintenanceSideEffectGate = requireApi("evaluateMaintenanceSideEffectGate");

  for (const level of SIDE_EFFECT_LEVELS) {
    const gate = evaluateMaintenanceSideEffectGate({ level, operation: "fixture" });
    assert.equal(gate.level, level);
    assert.equal(typeof gate.requires_confirmation, "boolean");
  }

  for (const level of ["remote_write", "destructive_remote_write", "external_action"]) {
    const gate = evaluateMaintenanceSideEffectGate({ level, operation: "fixture" });
    assert.equal(gate.requires_confirmation, true, `${level} must require explicit confirmation`);
    assert.equal(gate.allowed, false, `${level} must not be allowed without confirmation`);
  }

  const missingBackup = evaluateMaintenanceSideEffectGate({
    level: "local_document_write_with_backup",
    operation: "project_summary_refresh",
  });
  assert.equal(missingBackup.allowed, false);
  assert.equal(missingBackup.backup_required, true);
  assert.match(missingBackup.reason, /backup/i);

  const withBackup = evaluateMaintenanceSideEffectGate({
    level: "local_document_write_with_backup",
    operation: "project_summary_refresh",
    backup: {
      path: "~/.hypo-workflow/maintenance/backups/PROJECT-SUMMARY.md.20260519T220000.bak",
      checksum_sha256: "a".repeat(64),
      created_at: "2026-05-19T22:00:00+08:00",
    },
  });
  assert.equal(withBackup.allowed, true);
  assert.equal(withBackup.backup_required, true);
  assert.equal(withBackup.backup.path.endsWith(".bak"), true);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

function maintenanceItem(overrides = {}) {
  return {
    id: "mq-20260519-hypo-workflow-notion-dry-run",
    kind: "maintenance_operation",
    object_ref: "hypo-workflow",
    operation: "notion_project_home_dry_run",
    target_ref: "notion:hypo-projects/hypo-workflow",
    scope: {
      artifacts: ["overview", "progress", "architecture", "prompts_index", "reports_index"],
    },
    status: "queued",
    priority: "normal",
    side_effect: "remote_read",
    confirmation_required: false,
    dependencies: [],
    policy_refs: ["sync-authority-conflict-matrix"],
    evidence_refs: [],
    created_at: "2026-05-19T22:00:00+08:00",
    updated_at: "2026-05-19T22:00:00+08:00",
    ...overrides,
  };
}
