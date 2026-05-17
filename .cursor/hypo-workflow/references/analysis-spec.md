# Analysis Preset Spec

Use this reference when the active workflow is investigative rather than build-first.

## Preset Boundary

`analysis` is a preset. In plain terms: analysis is a preset. Preset controls step order.

It is not a Test Profile. Test Profiles continue to control validation evidence for build work, for example `webapp`, `agent-service`, or `research`. Analysis can still produce validation evidence, but its primary output is a traceable conclusion, not necessarily a patch.

One analysis Milestone normally represents one investigation question. The Milestone may contain multiple hypotheses and experiments. A disproved hypothesis is progress, not a Milestone failure.

Analysis evidence is stored in an analysis ledger. The command-facing canonical path is `.pipeline/analysis/<cycle-or-milestone>/ledger.yaml`; existing `.pipeline/analysis/<milestone-id>-analysis-ledger.yaml` files remain valid legacy ledgers. The active `state.yaml` record should keep only a compact `prompt_state.analysis_summary` with counts, conclusion, confidence, and `ledger_path`.

## Step Chain

`analysis` expands to:

1. `define_question`
2. `gather_context`
3. `hypothesize`
4. `experiment`
5. `interpret`
6. `conclude`

Step intent:

- `define_question`: define the investigation question, scope, success criteria, and required environment snapshot.
- `gather_context`: collect logs, code, config, metrics, prior reports, and reproduction facts.
- `hypothesize`: state candidate explanations or investigation directions.
- `experiment`: run concrete checks, scripts, comparisons, log queries, or controlled code changes according to the interaction mode.
- `interpret`: connect observations to hypotheses and mark each hypothesis as confirmed, disproved, partial, or still pending.
- `conclude`: summarize root cause or current conclusion, confidence, ruled-out alternatives, and follow-up actions.

## Experiment Execution Contract

The `experiment` step must record actual execution evidence, not just a proposed test plan.

Allowed experiment actions include:

- run commands, scripts, tests, or benchmarks
- read logs, config, source, reports, metrics, or datasets
- collect before/after/delta measurements
- add temporary instrumentation
- modify code for fix or validation when the active interaction mode permits it

Experiment records should include command/script details, inputs, output summary, artifacts, evidence refs, metrics before/after/delta, boundary decision, blocked reason, and code change refs. Boundary-controlled actions must honor `manual`, `hybrid`, and `auto` interaction mode. A blocked experiment is valid analysis evidence; it is not automatically a failed Milestone.

## Outcome And Follow-Up

Hypothesis statuses are `pending`, `confirmed`, `disproved`, and `partial`.

Analysis Milestone outcomes are `confirmed`, `partial`, `disproved`, `inconclusive`, and `blocked`.

`confirmed`, `partial`, `disproved`, and `inconclusive` are valid completed analysis outcomes. Only `blocked` means the Milestone needs to pause for an external condition or user decision. A disproved hypothesis is progress and must not trigger batch failure policy by itself.

When analysis should turn into implementation work, the report or ledger should include a build follow-up proposal with `workflow_kind: build`, `source_analysis`, `recommended_change`, `validation_plan`, `evidence_refs`, and `mode_required`.

Same-Milestone fix and validation follows the interaction mode:

- `manual`: report and proposal only
- `hybrid`: propose the fix, then confirm before editing
- `auto`: may patch and validate directly inside configured boundaries

## User-Facing Analysis Lane

`/hw:analysis` exposes Analysis as an interactive investigation lane with `enter`, `continue`, `end`, and `report` semantics. The lane should recover from `prompt_state.analysis_summary.ledger_path`, initialize the canonical ledger when entering a new question, and write continuation hints for unfinished investigations.

Status, report, progress, and resume surfaces should show the question, ledger path, outcome/confidence, compact hypothesis and experiment counts, and next action. They should not dump the full hypotheses, experiments, observations, or validity discussion unless the user explicitly asks to inspect the ledger.

## Workflow Taxonomy

Planning artifacts may classify work with:

```yaml
workflow_kind: build | analysis | showcase
analysis_kind: root_cause | metric | repo_system
```

`workflow_kind` chooses the lane:

- `build`: implementation, refactor, bugfix, documentation, or delivery work.
- `analysis`: investigation, root-cause analysis, metric exploration, or system/repository analysis.
- `showcase`: generated project introduction, slides, poster, or demonstration material.

`analysis_kind` is meaningful when `workflow_kind=analysis`:

- `root_cause`: debug an unexpected behavior or explain a difference.
- `metric`: analyze trends, before/after measurements, or research-style quantitative evidence.
- `repo_system`: inspect architecture, code paths, ownership boundaries, or system behavior.

Aliases such as `root-cause`, `debug`, `trend`, `repo-system`, and `architecture` should normalize into these stable enum values.

## Interaction Model

Analysis uses `manual`, `hybrid`, and `auto` as the user-facing interaction modes:

- `manual`: the Agent gathers evidence and proposes conclusions, but does not make code changes.
- `hybrid`: the Agent may propose a fix or experiment that changes code, but must confirm before editing.
- `auto`: the Agent may make code changes inside the configured boundaries.

The published/project default is `hybrid`. Owner/global config may override to `auto` for private unattended work.

Default boundaries:

```yaml
execution:
  analysis:
    interaction_mode: hybrid
    boundaries:
      code_changes:
        manual: deny
        hybrid: confirm
        auto: allow
      restart_services: confirm
      install_system_dependencies: ask
      network_remote_resources:
        manual: ask
        hybrid: ask
        auto: allow
      destructive_or_external_side_effects: ask
```

System-level dependency installation requires an ask. Service restarts require confirmation. Any destructive or external side effect must follow the configured boundary even when the mode is `auto`.

## Compatibility

Legacy presets stay unchanged:

- `tdd`
- `implement-only`
- `custom`

`analysis` must not be treated as an alias for `implement-only`. It has a separate chain, separate report expectations, and later Milestones will add interaction boundaries and evidence ledgers.

See `references/analysis-ledger-spec.md` for the required analysis ledger fields and the state summary boundary.
