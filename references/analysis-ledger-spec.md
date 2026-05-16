# Analysis Ledger Spec

Use this reference for analysis Milestones that need a durable, reviewable evidence record.

## Location

Canonical ledger path for the user-facing Analysis lane:

```text
.pipeline/analysis/<cycle-or-milestone>/ledger.yaml
```

Legacy compatible ledger path:

```text
.pipeline/analysis/<milestone-id>-analysis-ledger.yaml
```

One analysis Cycle, Milestone, or focused investigation question should normally write one ledger. The ledger is the evidence store; `.pipeline/state.yaml` remains the execution pointer and recovery summary. If state already points to a legacy ledger, continue using that path. If no path exists, initialize the canonical directory form.

## Required Fields

```yaml
question: ""
environment_snapshot:
  branch_commit: ""
  effective_config_summary: ""
  command_parameters: {}
  data_log_sources: []
  time_window: ""
  model_provider_parameters: {}
hypotheses: []
experiments: []
observations: []
metrics: {}
interpretation: ""
outcome: inconclusive
conclusion: ""
confidence: low | medium | high
next_actions: []
followup_proposal: null
code_change_refs: []
threats_to_validity: []
ruled_out_alternatives: []
```

Field intent:

- `question`: the investigation question and scope.
- `environment_snapshot`: facts needed to reproduce the analysis context.
- `hypotheses`: candidate explanations, each with an id, statement, status, and evidence references.
- `experiments`: concrete checks, scripts, comparisons, log queries, or controlled changes.
- `observations`: evidence records that support or contradict hypotheses.
- `metrics`: measured values or `telemetry_unavailable` when token/cost telemetry is unavailable.
- `interpretation`: how observations connect to hypotheses.
- `outcome`: milestone-level result using `confirmed`, `partial`, `disproved`, `inconclusive`, or `blocked`.
- `conclusion`: the current answer or root-cause statement.
- `confidence`: confidence in the conclusion.
- `next_actions`: follow-up implementation, validation, or research work.
- `followup_proposal`: optional build workflow proposal derived from the analysis.
- `code_change_refs`: files, commits, or patches created during the investigation.
- `threats_to_validity`: limits that may weaken the conclusion.
- `ruled_out_alternatives`: explanations checked and rejected.

## Environment Snapshot

`environment_snapshot` must include at least:

- `branch_commit`: branch and commit, or a documented equivalent when git metadata is unavailable.
- `effective_config_summary`: resolved project/global settings relevant to the analysis.
- `command_parameters`: command, prompt, flags, filters, and other execution inputs.
- `data_log_sources`: files, logs, reports, metrics, datasets, or external resources inspected.
- `time_window`: time range covered by logs, metrics, or reproduction attempts.
- `model_provider_parameters`: platform, provider, model, agent role, or `n/a` when not applicable.

## State Summary Boundary

The ledger may contain full hypotheses, experiments, observations, and interpretation details. `prompt_state.analysis_summary` in `.pipeline/state.yaml` must stay compact and point back to the ledger.

Recommended state summary fields:

```yaml
prompt_state:
  analysis_summary:
    milestone_id: M06
    question: ""
    ledger_path: .pipeline/analysis/M06/ledger.yaml
    hypothesis_counts:
      total: 0
      confirmed: 0
      disproved: 0
      partial: 0
      pending: 0
    experiment_counts:
      total: 0
      completed: 0
      blocked: 0
      pending: 0
    conclusion: ""
    confidence: medium
    updated_at: ""
```

Rules:

- `state.yaml` must not store full hypotheses.
- `state.yaml` must not store full experiments.
- `state.yaml` must not store full observations.
- `state.yaml` must not become the evidence ledger.
- `ledger_path` is the durable handoff from resume/status/watchdog/report surfaces to the full evidence record.

## Status Values

Suggested hypothesis status values:

- `confirmed`
- `disproved`
- `partial`
- `pending`

Suggested experiment status values:

- `completed`
- `blocked`
- `pending`

Disproving a hypothesis is progress. It should be represented in the ledger and should not require rolling back `current.step`.

## Experiment Result Contract

Experiment records should support real execution evidence:

```yaml
experiments:
  - id: E1
    hypothesis_refs:
      - H1
    action: run_command
    status: completed
    command: "node --test core/test/analysis-runtime.test.js"
    inputs: {}
    output_summary: "Targeted analysis runtime checks passed."
    artifacts:
      - core/test/analysis-runtime.test.js
    evidence_refs:
      - O1
    metrics:
      before: telemetry_unavailable
      after: telemetry_unavailable
      delta: telemetry_unavailable
    boundary_decision: allow
    blocked_reason: null
    code_change_refs: []
```

Supported action families include command/script/test/benchmark execution, log/config/source reading, metric collection, temporary instrumentation, and code modification when permitted. If a boundary blocks execution, set `status: blocked`, record `boundary_decision`, and explain `blocked_reason`.

## Follow-Up Proposal

When the conclusion implies implementation work, use:

```yaml
followup_proposal:
  workflow_kind: build
  source_analysis: .pipeline/analysis/M08/ledger.yaml
  title: ""
  problem: ""
  recommended_change: ""
  validation_plan: []
  evidence_refs: []
  mode_required: hybrid
```
