import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as api from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("template candidate learning creates non-authoritative pending-review candidates from recurring run shapes", async () => {
  const learnMaintenanceTemplateCandidates = requireApi("learnMaintenanceTemplateCandidates");
  const validateMaintenanceTemplateCandidate = requireApi("validateMaintenanceTemplateCandidate");
  const baseRun = await fixture("daily-ai-noon-report.json");

  const candidates = learnMaintenanceTemplateCandidates([
    completedRun(baseRun, "2026-05-17T12:00:00+08:00", "mr-20260517-daily-ai-noon-report"),
    completedRun(baseRun, "2026-05-18T12:00:00+08:00", "mr-20260518-daily-ai-noon-report"),
    completedRun(baseRun, "2026-05-19T12:00:00+08:00", "mr-20260519-daily-ai-noon-report"),
  ], {
    now: "2026-05-19T15:00:00+08:00",
    min_occurrences: 3,
  });

  assert.equal(candidates.length, 1);
  const candidate = candidates[0];
  const validation = validateMaintenanceTemplateCandidate(candidate);
  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.equal(candidate.kind, "maintenance_template_candidate");
  assert.equal(candidate.authority, "non_authoritative");
  assert.equal(candidate.status, "pending_review");
  assert.equal(candidate.authoritative, false);
  assert.equal(candidate.source, "learned_from_recurring_runs");
  assert.deepEqual(candidate.provenance.run_ids, [
    "mr-20260517-daily-ai-noon-report",
    "mr-20260518-daily-ai-noon-report",
    "mr-20260519-daily-ai-noon-report",
  ]);
  assert.match(candidate.review_required_reason, /user review|pending review|non-authoritative/i);
});

test("learned template candidates do not silently become authoritative during validation or promotion checks", async () => {
  const validateMaintenanceTemplateCandidate = requireApi("validateMaintenanceTemplateCandidate");
  const reviewMaintenanceTemplateCandidate = requireApi("reviewMaintenanceTemplateCandidate");
  const run = await fixture("daily-ai-noon-report.json");

  const candidate = {
    id: "mtc-daily-ai-noon-report",
    kind: "maintenance_template_candidate",
    title: "Daily AI noon report",
    status: "pending_review",
    authority: "non_authoritative",
    authoritative: false,
    source: "learned_from_recurring_runs",
    shape: {
      run_type: run.run_type,
      review_mode: run.review_mode,
      operations: run.planned_items.map((item) => item.operation),
    },
    provenance: {
      run_ids: ["mr-20260517-daily-ai-noon-report", "mr-20260518-daily-ai-noon-report"],
      learned_at: "2026-05-19T15:05:00+08:00",
    },
    review_required_reason: "Learned candidates remain non-authoritative until explicit user review.",
  };

  const validation = validateMaintenanceTemplateCandidate(candidate);
  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.equal(validation.normalized.authority, "non_authoritative");
  assert.equal(validation.normalized.status, "pending_review");
  assert.equal(validation.normalized.authoritative, false);

  const rejectedImplicitPromotion = reviewMaintenanceTemplateCandidate(candidate, {
    action: "promote",
    actor: "agent",
    confirmed: false,
    now: "2026-05-19T15:10:00+08:00",
  });
  assert.equal(rejectedImplicitPromotion.ok, false);
  assert.match(rejectedImplicitPromotion.errors.join("\n"), /explicit|user|review|confirmation/i);

  const approved = reviewMaintenanceTemplateCandidate(candidate, {
    action: "approve",
    actor: "user",
    confirmed: true,
    now: "2026-05-19T15:12:00+08:00",
    evidence_refs: ["~/.hypo-workflow/maintenance/evidence/templates/mtc-daily-ai-noon-report-review.yaml"],
  });
  assert.equal(approved.ok, true, approved.errors?.join("\n"));
  assert.equal(approved.template.status, "approved");
  assert.equal(approved.template.authority, "authoritative");
  assert.equal(approved.template.authoritative, true);
  assert.ok(approved.template.evidence_refs.includes("~/.hypo-workflow/maintenance/evidence/templates/mtc-daily-ai-noon-report-review.yaml"));
});

function requireApi(name) {
  assert.equal(typeof api[name], "function", `expected ${name} to be exported from ../src/index.js`);
  return api[name];
}

async function fixture(name) {
  return JSON.parse(await readFile(join(__dirname, "fixtures", "maintenance-run", name), "utf8"));
}

function completedRun(run, timestamp, id) {
  return {
    ...run,
    id,
    status: "completed",
    created_at: timestamp,
    updated_at: timestamp,
    completed_at: timestamp,
    evidence_refs: [
      `~/.hypo-workflow/maintenance/evidence/runs/${id}.yaml`,
    ],
  };
}
