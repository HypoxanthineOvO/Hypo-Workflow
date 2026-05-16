import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ANALYSIS_EVALUATION_CRITERIA,
  ANALYSIS_OUTCOMES,
  buildAnalysisFollowupProposal,
  buildAnalysisReportContract,
  determineAnalysisOutcome,
  evaluateAnalysisEvidence,
  normalizeMetricRecord,
  normalizeAnalysisExperimentResult,
  parseYaml,
  renderAnalysisPromptPlan,
  renderBatchPlanArtifacts,
} from "../src/index.js";

test("analysis experiments record real execution results and boundary decisions", () => {
  const result = normalizeAnalysisExperimentResult({
    id: "E3",
    hypothesis_refs: ["H2"],
    action: "run-command",
    status: "completed",
    command: "node --test core/test/analysis-runtime.test.js",
    inputs: { filter: "analysis" },
    output_summary: "analysis runtime checks passed",
    artifacts: ["core/test/analysis-runtime.test.js"],
    evidence_refs: ["O3"],
    metrics: { before: 1, after: 2, delta: 1 },
    boundary_decision: "confirm",
    code_change_refs: ["core/src/analysis/index.js"],
  });

  assert.equal(result.action, "run_command");
  assert.equal(result.status, "completed");
  assert.equal(result.boundary_decision, "confirm");
  assert.deepEqual(result.metrics, { before: 1, after: 2, delta: 1 });
  assert.deepEqual(result.code_change_refs, ["core/src/analysis/index.js"]);

  const blocked = normalizeAnalysisExperimentResult({
    id: "E4",
    action: "install-system-dependencies",
    status: "blocked",
    boundary_decision: "ask",
    blocked_reason: "system dependency install requires explicit user ask",
  });
  assert.equal(blocked.action, "read_source");
  assert.equal(blocked.status, "blocked");
  assert.match(blocked.blocked_reason, /requires explicit user ask/);
});

test("analysis outcomes and build follow-up proposals are stable", () => {
  assert.deepEqual(ANALYSIS_OUTCOMES, ["confirmed", "partial", "disproved", "inconclusive", "blocked"]);
  assert.equal(determineAnalysisOutcome({ hypotheses: [{ status: "confirmed" }] }), "confirmed");
  assert.equal(determineAnalysisOutcome({ hypotheses: [{ status: "disproved" }] }), "disproved");
  assert.equal(determineAnalysisOutcome({ hypotheses: [{ status: "confirmed" }, { status: "pending" }] }), "partial");
  assert.equal(determineAnalysisOutcome({ experiments: [{ status: "blocked" }] }), "blocked");

  const proposal = buildAnalysisFollowupProposal({
    source_analysis: ".pipeline/analysis/M08/ledger.yaml",
    title: "Patch cache normalization",
    problem: "Cache hit rate differs by provider.",
    recommended_change: "Normalize cache key provider parameters.",
    validation_plan: ["run before/after metric script"],
    evidence_refs: ["O7"],
  });
  assert.equal(proposal.workflow_kind, "build");
  assert.equal(proposal.mode_required, "hybrid");
  assert.deepEqual(proposal.validation_plan, ["run before/after metric script"]);
});

test("analysis evaluation is evidence-oriented and non-code analysis skips change validation", async () => {
  const ledger = parseYaml(await readFile("core/test/fixtures/analysis/M06-analysis-ledger.yaml", "utf8"));
  const evaluation = evaluateAnalysisEvidence(ledger);

  assert.deepEqual(ANALYSIS_EVALUATION_CRITERIA, [
    "question_addressed",
    "evidence_complete",
    "conclusion_traceable",
    "experiment_executed",
    "change_validated",
    "followup_recorded",
  ]);
  assert.equal(evaluation.preset, "analysis");
  assert.equal(evaluation.diff_score, 1);
  assert.equal(evaluation.criteria.find((item) => item.id === "change_validated").status, "not_applicable");
  assert.equal(evaluation.outcome, "confirmed");

  const weak = evaluateAnalysisEvidence({ question: "Why?", hypotheses: [], experiments: [], observations: [] });
  assert.ok(weak.failed_checks.includes("evidence_complete"));
  assert.ok(weak.failed_checks.includes("experiment_executed"));
});

test("analysis report contract carries ledger evidence and telemetry unavailable metrics", async () => {
  const ledger = parseYaml(await readFile("core/test/fixtures/analysis/M06-analysis-ledger.yaml", "utf8"));
  ledger.metrics = normalizeMetricRecord({
    id: "M06",
    started_at: "2026-05-03T10:00:00+08:00",
    finished_at: "2026-05-03T10:02:30+08:00",
  });

  const contract = buildAnalysisReportContract(ledger, {
    milestoneId: "M06",
    reportFile: ".pipeline/reports/M06-analysis.report.md",
  });

  assert.equal(contract.preset, "analysis");
  assert.equal(contract.report_type, "analysis");
  assert.equal(contract.ledger_path, ".pipeline/analysis/M06/ledger.yaml");
  assert.equal(contract.metrics.duration_ms, 150000);
  assert.equal(contract.metrics.token_count, "telemetry_unavailable");
  assert.equal(contract.metrics.cost, "telemetry_unavailable");
  assert.equal(contract.evaluation.diff_score, 1);
  assert.equal(contract.evaluation.failed_checks.length, 0);
  assert.ok(contract.evidence_refs.includes(".pipeline/analysis/M06/ledger.yaml"));
  assert.equal(contract.report_file, ".pipeline/reports/M06-analysis.report.md");
});

test("analysis templates and planning guidance are discoverable without polluting build reports", async () => {
  const files = [
    "templates/analysis/step-define-question.md",
    "templates/analysis/step-gather-context.md",
    "templates/analysis/step-hypothesize.md",
    "templates/analysis/step-experiment.md",
    "templates/analysis/step-interpret.md",
    "templates/analysis/step-conclude.md",
    "templates/analysis/ledger.yaml",
    "templates/analysis/report.md",
    "templates/zh/analysis-report.md",
    "templates/en/analysis-report.md",
  ];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    assert.match(content, /analysis|分析|Evidence|证据/i, file);
  }

  const buildReport = await readFile("templates/report.md", "utf8");
  assert.doesNotMatch(buildReport, /ruled_out_alternatives|threats_to_validity|environment_snapshot/);

  const plan = renderAnalysisPromptPlan({ analysis_kind: "repo_system" });
  assert.match(plan, /workflow_kind: analysis/);
  assert.match(plan, /define_question/);
  assert.match(plan, /conclude/);
  assert.match(plan, /\.pipeline\/analysis\/<cycle-or-milestone>\/ledger\.yaml/);
});

test("batch plan keeps analysis fields and C3 queue policy has no confirm gates", async () => {
  const artifacts = renderBatchPlanArtifacts(
    {
      cycle_id: "C3",
      features: [
        {
          id: "F900",
          title: "Investigate metric drift",
          workflow_kind: "analysis",
          analysis_kind: "metric",
          desired_effect: "Explain before/after metric drift.",
          verification: { method: "run metric script", evidence: ["ledger", "report"] },
        },
      ],
    },
    { decompose_mode: "upfront", default_gate: "auto", auto_chain: true },
  );
  assert.equal(artifacts.queue.defaults.default_gate, "auto");
  assert.equal(artifacts.queue.features[0].workflow_kind, "analysis");
  assert.equal(artifacts.queue.features[0].analysis_kind, "metric");
  assert.match(artifacts.markdown, /Analysis Kind/);

  const queueText = await readFile(
    ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/feature-queue.yaml",
    "utf8",
  );
  const queue = parseYaml(queueText);
  assert.equal(queue.defaults.default_gate, "auto");
  assert.equal(queue.defaults.auto_chain, true);
  assert.equal((queue.features || []).some((feature) => feature.gate === "confirm"), false);
});
