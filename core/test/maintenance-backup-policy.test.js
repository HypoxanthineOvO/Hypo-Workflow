import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as api from "../src/index.js";

test("system-initiated local document updates require backup metadata before run apply", async () => {
  const applyMaintenanceRun = requireApi("applyMaintenanceRun");

  const blocked = await applyMaintenanceRun(systemDocumentRun(), {
    actor: "system",
    now: "2026-05-19T16:00:00+08:00",
    confirmed: true,
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.run.status, "waiting_confirmation");
  assert.match(blocked.errors.join("\n"), /backup/i);
  assert.ok(blocked.gates.some((gate) => gate.level === "local_document_write_with_backup" && gate.allowed === false));

  const allowed = await applyMaintenanceRun(systemDocumentRun(), {
    actor: "system",
    now: "2026-05-19T16:05:00+08:00",
    confirmed: true,
    backups: {
      "mq-20260519-refresh-project-summary": {
        path: "~/.hypo-workflow/maintenance/backups/PROJECT-SUMMARY.md.20260519T160400.bak",
        checksum_sha256: "b".repeat(64),
        created_at: "2026-05-19T16:04:00+08:00",
      },
    },
  });

  assert.equal(allowed.ok, true, allowed.errors?.join("\n"));
  assert.equal(allowed.run.status, "applying");
  assert.equal(allowed.gates[0].backup_required, true);
  assert.equal(allowed.gates[0].backup.path.endsWith(".bak"), true);
  assert.ok(allowed.run.evidence_refs.some((ref) => /backup|apply/.test(ref)));
});

test("notification and external actions must pass the side-effect gate before run apply advances", async () => {
  const applyMaintenanceRun = requireApi("applyMaintenanceRun");

  const blocked = await applyMaintenanceRun(notificationRun(), {
    actor: "system",
    now: "2026-05-19T16:15:00+08:00",
    confirmed: false,
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.run.status, "waiting_confirmation");
  assert.ok(blocked.gates.some((gate) => gate.level === "external_action" && gate.requires_confirmation));
  assert.ok(blocked.gates.some((gate) => gate.level === "external_action" && gate.allowed === false));

  const allowed = await applyMaintenanceRun(notificationRun(), {
    actor: "user",
    now: "2026-05-19T16:18:00+08:00",
    confirmed: true,
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/apply-results/notify-user.yaml"],
  });
  assert.equal(allowed.ok, true, allowed.errors?.join("\n"));
  assert.equal(allowed.run.status, "applying");
  assert.ok(allowed.gates.every((gate) => gate.allowed));
});

test("run/apply orchestration binds evaluateMaintenanceSideEffectGate for remote, destructive, and external side effects", async () => {
  const applyMaintenanceRun = requireApi("applyMaintenanceRun");

  for (const sideEffect of ["remote_write", "destructive_remote_write", "external_action"]) {
    const result = await applyMaintenanceRun(highRiskRun(sideEffect), {
      actor: "agent",
      now: "2026-05-19T16:25:00+08:00",
      confirmed: false,
      backups: sideEffect === "destructive_remote_write"
        ? {
            "mq-20260519-high-risk": {
              path: "~/.hypo-workflow/maintenance/backups/high-risk.20260519T162400.bak",
              checksum_sha256: "c".repeat(64),
              created_at: "2026-05-19T16:24:00+08:00",
            },
          }
        : {},
    });

    assert.equal(result.ok, false, `${sideEffect} must be blocked without confirmation`);
    assert.equal(result.run.status, "waiting_confirmation");
    assert.ok(
      result.gates.some((gate) => gate.level === sideEffect && gate.requires_confirmation && !gate.allowed),
      `${sideEffect} should expose a blocked side-effect gate`,
    );
    assert.match(result.errors.join("\n"), /confirmation|side effect|gate/i);
  }
});

test("run engine does not expose ledgerFile override from user-controlled apply input", async () => {
  const applyMaintenanceRun = requireApi("applyMaintenanceRun");
  const root = await mkdtemp(join(tmpdir(), "hw-maintenance-run-ledger-"));
  const maliciousLedger = join(root, "attacker-controlled-ledger.yaml");

  const result = await applyMaintenanceRun(localReadRun(), {
    root,
    actor: "user",
    now: "2026-05-19T16:35:00+08:00",
    confirmed: true,
    ledgerFile: maliciousLedger,
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/apply-results/local-read.yaml"],
  });

  assert.equal(result.ok, true, result.errors?.join("\n"));
  assert.match(result.ledger_path, /maintenance\/ledger\.yaml$/);
  assert.notEqual(result.ledger_path, maliciousLedger);
  await assert.rejects(() => readFile(maliciousLedger, "utf8"), /ENOENT/);

  const defaultLedger = await readFile(join(root, "maintenance", "ledger.yaml"), "utf8");
  assert.match(defaultLedger, /mr-20260519-local-read/);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

function systemDocumentRun() {
  return runWithItem({
    id: "mr-20260519-refresh-project-summary",
    actor: "system",
    item: {
      id: "mq-20260519-refresh-project-summary",
      operation: "refresh_project_summary",
      target_ref: "file:PROJECT-SUMMARY.md",
      side_effect: "local_document_write_with_backup",
    },
  });
}

function notificationRun() {
  return runWithItem({
    id: "mr-20260519-notify-noon-report",
    actor: "system",
    item: {
      id: "mq-20260519-notify-user",
      operation: "notify_user",
      target_ref: "notification:local-desktop",
      side_effect: "external_action",
    },
  });
}

function highRiskRun(sideEffect) {
  return runWithItem({
    id: `mr-20260519-${sideEffect}`,
    actor: "agent",
    item: {
      id: "mq-20260519-high-risk",
      operation: `${sideEffect}_fixture`,
      target_ref: `${sideEffect}:fixture`,
      side_effect: sideEffect,
    },
  });
}

function localReadRun() {
  return runWithItem({
    id: "mr-20260519-local-read",
    actor: "user",
    item: {
      id: "mq-20260519-local-read",
      operation: "scan_maintenance_ledger",
      target_ref: "maintenance:ledger",
      side_effect: "local_read",
    },
  });
}

function runWithItem({ id, actor, item }) {
  return {
    id,
    kind: "maintenance_run",
    title: id,
    run_type: "orchestration",
    object_ref: "workspace:hypo-workflow",
    status: "waiting_confirmation",
    review_mode: "batch",
    initiated_by: actor,
    planned_items: [
      {
        id: item.id,
        kind: "maintenance_operation",
        object_ref: "workspace:hypo-workflow",
        operation: item.operation,
        target_ref: item.target_ref,
        scope: {},
        status: "approved",
        priority: "normal",
        side_effect: item.side_effect,
        confirmation_required: ["remote_write", "destructive_remote_write", "external_action"].includes(item.side_effect),
        dependencies: [],
        policy_refs: ["maintenance-side-effect-gate"],
        evidence_refs: [],
        created_at: "2026-05-19T16:00:00+08:00",
        updated_at: "2026-05-19T16:00:00+08:00",
      },
    ],
    evidence_refs: [],
    created_at: "2026-05-19T16:00:00+08:00",
    updated_at: "2026-05-19T16:00:00+08:00",
  };
}
