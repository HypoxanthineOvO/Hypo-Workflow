import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as api from "../src/index.js";

test("maintenance ledger append helper is append-only and redacts raw secrets", async () => {
  const appendMaintenanceLedgerEvent = requireApi("appendMaintenanceLedgerEvent");
  const validateMaintenanceLedger = requireApi("validateMaintenanceLedger");
  const root = await mkdtemp(join(tmpdir(), "hw-maintenance-ledger-"));

  await appendMaintenanceLedgerEvent(root, ledgerEvent({
    id: "ml-20260519-scan",
    event_type: "scan_completed",
    summary: "Scan completed with Authorization: Bearer raw-maintenance-token",
    metadata: {
      api_key: "raw-maintenance-api-key",
      safe_count: 3,
    },
  }));
  await appendMaintenanceLedgerEvent(root, ledgerEvent({
    id: "ml-20260519-verify",
    event_type: "verify_completed",
    summary: "Verification completed password=hunter2",
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/verify/mq-001.yaml"],
  }));

  const ledgerSource = await readFile(join(root, "maintenance", "ledger.yaml"), "utf8");
  const validation = validateMaintenanceLedger(ledgerSource);

  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.equal(validation.events.length, 2);
  assert.deepEqual(validation.events.map((event) => event.id), [
    "ml-20260519-scan",
    "ml-20260519-verify",
  ]);
  assert.match(ledgerSource, /safe_count/);
  assert.doesNotMatch(ledgerSource, /raw-maintenance-token|raw-maintenance-api-key|hunter2/);
  assert.match(ledgerSource, /\[REDACTED\]/);
});

test("maintenance evidence paths cover scan, dry-run, apply, verify, and backup surfaces", () => {
  const resolveMaintenanceEvidencePaths = requireApi("resolveMaintenanceEvidencePaths");

  const paths = resolveMaintenanceEvidencePaths("/tmp/hw-maintenance-home", {
    queue_item_id: "mq-20260519-hypo-workflow-notion-apply",
    operation: "notion_apply",
    timestamp: "2026-05-19T22:10:00+08:00",
  });

  assert.deepEqual(Object.keys(paths).sort(), ["apply", "backup", "dry_run", "scan", "verify"]);
  assert.match(paths.scan, /maintenance\/evidence\/scan\/mq-20260519-hypo-workflow-notion-apply/);
  assert.match(paths.dry_run, /maintenance\/evidence\/dry-runs\/mq-20260519-hypo-workflow-notion-apply/);
  assert.match(paths.apply, /maintenance\/evidence\/apply-results\/mq-20260519-hypo-workflow-notion-apply/);
  assert.match(paths.verify, /maintenance\/evidence\/verify-results\/mq-20260519-hypo-workflow-notion-apply/);
  assert.match(paths.backup, /maintenance\/backups\/mq-20260519-hypo-workflow-notion-apply/);
});

test("maintenance status and log render Chinese user-visible summaries for zh-CN output", () => {
  const renderMaintenanceStatus = requireApi("renderMaintenanceStatus");
  const renderMaintenanceLog = requireApi("renderMaintenanceLog");
  const queue = {
    items: [
      {
        id: "mq-001",
        kind: "maintenance_operation",
        object_ref: "hypo-workflow",
        operation: "notion_project_home_dry_run",
        status: "queued",
        priority: "normal",
        side_effect: "remote_read",
        evidence_refs: [],
      },
      {
        id: "mq-002",
        kind: "maintenance_operation",
        object_ref: "hypo-info-v2",
        operation: "notion_apply",
        status: "blocked",
        priority: "high",
        side_effect: "remote_write",
        evidence_refs: ["~/.hypo-workflow/maintenance/evidence/dry-runs/mq-002.yaml"],
      },
    ],
  };
  const ledger = {
    events: [
      ledgerEvent({
        id: "ml-001",
        queue_item_id: "mq-002",
        event_type: "confirmation_required",
        status: "blocked",
        summary: "Remote apply blocked until confirmation. token=raw-status-token",
      }),
    ],
  };

  const status = renderMaintenanceStatus(queue, {
    output: { language: "zh-CN" },
  });
  const log = renderMaintenanceLog(ledger, {
    output: { language: "zh-CN" },
  });

  assert.equal(status.language, "zh-CN");
  assert.equal(log.language, "zh-CN");
  assert.match(status.summary, /\p{Script=Han}/u);
  assert.match(log.summary, /\p{Script=Han}/u);
  assert.match(status.summary, /维护|队列|阻塞|待处理/);
  assert.match(log.summary, /维护|日志|确认|阻塞/);
  assert.doesNotMatch(`${status.summary}\n${log.summary}`, /raw-status-token/);
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

function ledgerEvent(overrides = {}) {
  return {
    id: "ml-20260519-fixture",
    queue_item_id: "mq-20260519-hypo-workflow-notion-dry-run",
    object_ref: "hypo-workflow",
    event_type: "dry_run_created",
    status: "completed",
    timestamp: "2026-05-19T22:10:00+08:00",
    actor: "agent",
    summary: "Generated maintenance dry-run evidence.",
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/dry-runs/mq-001.yaml"],
    redaction: {
      raw_secret_seen: false,
      raw_secret_recorded: false,
    },
    ...overrides,
  };
}
