import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  analysisLedgerPath,
  buildAnalysisStateSummary,
  legacyAnalysisLedgerPath,
  parseYaml,
  validateAnalysisLedger,
} from "../src/index.js";

test("analysis ledger fixture parses and satisfies the required evidence contract", async () => {
  const raw = await readFile("core/test/fixtures/analysis/M06-analysis-ledger.yaml", "utf8");
  const ledger = parseYaml(raw);
  const result = validateAnalysisLedger(ledger);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(ledger.question, "How should analysis milestones persist recoverable state and reviewable evidence?");
  assert.equal(ledger.hypotheses.length, 2);
  assert.equal(ledger.experiments.length, 2);
  assert.equal(ledger.observations.length, 2);
  assert.equal(ledger.environment_snapshot.branch_commit, "C3-fixture-commit");
  assert.equal(ledger.environment_snapshot.effective_config_summary, "execution.steps.preset=tdd; workflow_kind=analysis");
});

test("analysis state summary stays small and points to the external ledger", async () => {
  const raw = await readFile("core/test/fixtures/analysis/M06-analysis-ledger.yaml", "utf8");
  const ledger = parseYaml(raw);
  const summary = buildAnalysisStateSummary(ledger, {
    milestoneId: "M06",
    updatedAt: "2026-05-02T13:00:00+08:00",
  });

  assert.equal(analysisLedgerPath("M06"), ".pipeline/analysis/M06/ledger.yaml");
  assert.equal(legacyAnalysisLedgerPath("M06"), ".pipeline/analysis/M06-analysis-ledger.yaml");
  assert.equal(summary.milestone_id, "M06");
  assert.equal(summary.ledger_path, ".pipeline/analysis/M06/ledger.yaml");
  assert.equal(summary.question, ledger.question);
  assert.deepEqual(summary.hypothesis_counts, {
    total: 2,
    confirmed: 1,
    disproved: 1,
    partial: 0,
    pending: 0,
  });
  assert.deepEqual(summary.experiment_counts, {
    total: 2,
    completed: 2,
    blocked: 0,
    pending: 0,
  });
  assert.equal(summary.conclusion, "Keep state linear and store full analysis evidence in a dedicated ledger.");
  assert.equal(summary.confidence, "high");
  assert.equal(summary.updated_at, "2026-05-02T13:00:00+08:00");
  assert.equal(Object.hasOwn(summary, "hypotheses"), false);
  assert.equal(Object.hasOwn(summary, "experiments"), false);
  assert.equal(Object.hasOwn(summary, "observations"), false);
});

test("analysis state summary preserves an explicitly referenced legacy ledger", async () => {
  const raw = await readFile("core/test/fixtures/analysis/M06-analysis-ledger.yaml", "utf8");
  const ledger = parseYaml(raw);
  const summary = buildAnalysisStateSummary(ledger, {
    milestoneId: "M06",
    ledgerPath: legacyAnalysisLedgerPath("M06"),
  });

  assert.equal(summary.ledger_path, ".pipeline/analysis/M06-analysis-ledger.yaml");
});

test("analysis docs define state summary and ledger fields without expanding state.yaml", async () => {
  const stateContract = await readFile("references/state-contract.md", "utf8");
  const ledgerSpec = await readFile("references/analysis-ledger-spec.md", "utf8");
  const analysisSpec = await readFile("references/analysis-spec.md", "utf8");

  for (const phrase of [
    "prompt_state.analysis_summary",
    "ledger_path",
    "must not store full hypotheses",
    "must not store full experiments",
  ]) {
    assert.match(stateContract, new RegExp(escapeRegExp(phrase), "i"));
  }

  for (const field of [
    "question",
    "environment_snapshot",
    "hypotheses",
    "experiments",
    "observations",
    "metrics",
    "interpretation",
    "conclusion",
    "confidence",
    "next_actions",
    "code_change_refs",
    "threats_to_validity",
    "ruled_out_alternatives",
    "branch_commit",
    "effective_config_summary",
    "command_parameters",
    "data_log_sources",
    "time_window",
    "model_provider_parameters",
  ]) {
    assert.match(ledgerSpec, new RegExp(`\\b${escapeRegExp(field)}\\b`));
  }

  assert.match(analysisSpec, /analysis ledger/i);
  assert.match(analysisSpec, /\.pipeline\/analysis\/<cycle-or-milestone>\/ledger\.yaml/);
  assert.match(analysisSpec, /\.pipeline\/analysis\/<milestone-id>-analysis-ledger\.yaml/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
