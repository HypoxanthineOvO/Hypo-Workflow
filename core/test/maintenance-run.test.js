import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as api from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const RUN_STATUSES = Object.freeze([
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

test("maintenance run schema supports run lifecycle states without impersonating Cycle/Patch/Feature", async () => {
  const validateMaintenanceRun = requireApi("validateMaintenanceRun");
  const baseRun = await fixture("daily-ai-noon-report.json");

  for (const status of RUN_STATUSES) {
    const result = validateMaintenanceRun({
      ...baseRun,
      status,
      updated_at: "2026-05-19T12:10:00+08:00",
    });

    assert.equal(result.ok, true, `${status}: ${result.errors.join("\n")}`);
    assert.equal(result.normalized.kind, "maintenance_run");
    assert.equal(result.normalized.status, status);
    assert.equal(Object.hasOwn(result.normalized, "cycle_id"), false);
    assert.equal(Object.hasOwn(result.normalized, "patch_id"), false);
    assert.equal(Object.hasOwn(result.normalized, "feature_id"), false);
    assert.equal(Object.hasOwn(result.normalized, "milestones"), false);
  }

  const featureLike = validateMaintenanceRun({
    id: "F-001",
    kind: "feature",
    title: "Add run engine",
    status: "planned",
    milestones: [{ id: "M5", status: "planned" }],
    acceptance_criteria: ["ship implementation"],
  });
  assert.equal(featureLike.ok, false);
  assert.match(featureLike.errors.join("\n"), /maintenance run/i);
});

test("orchestration run planning creates multiple queue items without hard-coding the noon report template", async () => {
  const planMaintenanceRun = requireApi("planMaintenanceRun");
  const validateMaintenanceQueueItem = requireApi("validateMaintenanceQueueItem");
  const noonReport = await fixture("daily-ai-noon-report.json");

  const planned = planMaintenanceRun(noonReport, {
    now: "2026-05-19T12:15:00+08:00",
  });

  assert.equal(planned.run.run_type, "orchestration");
  assert.equal(planned.run.status, "planned");
  assert.equal(planned.run.review_mode, "batch");
  assert.ok(planned.items.length >= 3, "daily report orchestration should plan multiple queue items");
  assert.deepEqual(new Set(planned.items.map((item) => item.kind)), new Set(["maintenance_operation"]));
  for (const item of planned.items) {
    const validation = validateMaintenanceQueueItem(item);
    assert.equal(validation.ok, true, `${item.id}: ${validation.errors.join("\n")}`);
  }

  const genericRun = planMaintenanceRun({
    ...noonReport,
    id: "mr-20260519-relation-drift-cleanup",
    title: "Project relation drift cleanup",
    template_ref: "candidate:project-relation-drift-cleanup",
    scope: {
      relation: "project-to-artifacts",
      artifacts: ["project-registry", "artifact-catalog"],
    },
    planned_items: [
      {
        id: "mq-20260519-drift-scan-registry",
        operation: "scan_project_registry",
        target_ref: "workspace:projects",
        side_effect: "local_read",
      },
      {
        id: "mq-20260519-drift-dry-run",
        operation: "relation_drift_dry_run",
        target_ref: "maintenance:evidence/dry-runs/relation-drift.yaml",
        side_effect: "local_derived_write",
      },
    ],
  });

  assert.equal(genericRun.run.template_ref, "candidate:project-relation-drift-cleanup");
  assert.ok(genericRun.items.length >= 2, "planner must accept non-noon orchestration shapes");
  assert.notDeepEqual(
    genericRun.items.map((item) => item.operation),
    planned.items.map((item) => item.operation),
    "planner must not hard-code daily AI noon report as the only orchestration template",
  );
});

test("partitioned run discovery supports docs folders and Notion child-page trees with per-item or batch review", async () => {
  const discoverMaintenanceRunItems = requireApi("discoverMaintenanceRunItems");
  const validateMaintenanceQueueItem = requireApi("validateMaintenanceQueueItem");

  const docsRun = await fixture("docs-folder-partition.json");
  const docs = discoverMaintenanceRunItems(docsRun, {
    now: "2026-05-19T13:10:00+08:00",
  });
  assert.equal(docs.run.status, "discovering_items");
  assert.equal(docs.run.review_mode, "per_item");
  assert.equal(docs.subitems.length, 2);
  assert.deepEqual(docs.items.map((item) => item.review_group), [
    "file:docs/reference/commands.md",
    "file:docs/en/reference/commands.md",
  ]);

  const notionRun = await fixture("notion-child-page-tree.json");
  const notion = discoverMaintenanceRunItems(notionRun, {
    now: "2026-05-19T13:12:00+08:00",
  });
  assert.equal(notion.run.status, "discovering_items");
  assert.equal(notion.run.review_mode, "batch");
  assert.ok(notion.subitems.some((item) => item.ref === "notion:page/alpha/tasks"));
  assert.ok(notion.items.length >= 3, "child page tree should flatten nested subitems into queue operations");

  for (const item of [...docs.items, ...notion.items]) {
    const validation = validateMaintenanceQueueItem(item);
    assert.equal(validation.ok, true, `${item.id}: ${validation.errors.join("\n")}`);
  }
});

test("pause, resume, review, approve, and complete transitions preserve resumable state and evidence", async () => {
  const transitionMaintenanceRun = requireApi("transitionMaintenanceRun");
  const run = await fixture("daily-ai-noon-report.json");

  const inProgress = transitionMaintenanceRun(run, {
    action: "start",
    now: "2026-05-19T14:00:00+08:00",
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/runs/start.yaml"],
  });
  assert.equal(inProgress.run.status, "in_progress");

  const paused = transitionMaintenanceRun(inProgress.run, {
    action: "pause",
    reason: "user requested review before apply",
    resume_token: "resume:mr-20260519-daily-ai-noon-report:apply",
    cursor: { queue_item_id: "mq-20260519-noon-render-report", step: "before_apply" },
    now: "2026-05-19T14:05:00+08:00",
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/runs/pause.yaml"],
  });
  assert.equal(paused.run.status, "paused");
  assert.equal(paused.run.resumable.resume_token, "resume:mr-20260519-daily-ai-noon-report:apply");
  assert.deepEqual(paused.run.resumable.cursor, {
    queue_item_id: "mq-20260519-noon-render-report",
    step: "before_apply",
  });
  assert.ok(paused.event.evidence_refs.includes("~/.hypo-workflow/maintenance/evidence/runs/pause.yaml"));

  const waitingReview = transitionMaintenanceRun(paused.run, {
    action: "resume",
    now: "2026-05-19T14:10:00+08:00",
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/runs/resume.yaml"],
  });
  assert.equal(waitingReview.run.status, "waiting_review");
  assert.equal(waitingReview.run.resumable.resume_token, "resume:mr-20260519-daily-ai-noon-report:apply");

  const waitingConfirmation = transitionMaintenanceRun(waitingReview.run, {
    action: "review",
    review: { decision: "approve_pending_confirmation", actor: "user" },
    now: "2026-05-19T14:12:00+08:00",
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/runs/review.yaml"],
  });
  assert.equal(waitingConfirmation.run.status, "waiting_confirmation");

  const applying = transitionMaintenanceRun(waitingConfirmation.run, {
    action: "approve",
    confirmed: true,
    actor: "user",
    now: "2026-05-19T14:15:00+08:00",
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/runs/approve.yaml"],
  });
  assert.equal(applying.run.status, "applying");
  assert.equal(applying.run.approval.confirmed, true);

  const verifying = transitionMaintenanceRun(applying.run, {
    action: "verify",
    now: "2026-05-19T14:18:00+08:00",
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/runs/verify.yaml"],
  });
  assert.equal(verifying.run.status, "verifying");

  const completed = transitionMaintenanceRun(verifying.run, {
    action: "complete",
    now: "2026-05-19T14:20:00+08:00",
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/runs/complete.yaml"],
  });
  assert.equal(completed.run.status, "completed");
  assert.ok(completed.run.evidence_refs.includes("~/.hypo-workflow/maintenance/evidence/runs/complete.yaml"));
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

async function fixture(name) {
  return JSON.parse(await readFile(join(__dirname, "fixtures", "maintenance-run", name), "utf8"));
}
