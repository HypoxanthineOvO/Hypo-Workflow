# Experiment Record Protocol

Experiments use ordinary YAML files by default. The Agent maintains them with normal file-reading and editing capabilities. A host capability named `BatchReport`, Experiment Core write APIs, content-addressed events, and status projections are never prerequisites.

## Paths

```text
.pipeline/memory/experiment-records/<project_id>/<experiment_id>/
├── experiment.yaml
└── attempts/
    ├── attempt-20260803-001.yaml
    └── attempt-20260803-002.yaml
```

`experiment.yaml` is the readable index and current plan. Each Attempt has its own file. A rerun gets a new readable `attempt_id` and references its predecessor through `rerun_of`; IDs are not derived from payload hashes.

## Required Content

The Experiment record states the purpose, hypothesis, baseline and scope, dataset and scene meaning, fixed parameters, scan axes, success evidence, resource boundary, state, `attempt_refs`, and next action.

Each Attempt records its status, optional rerun parent, timestamps, Git commit/tree and dirty-worktree evidence, `uv` lock context, machine/GPU/driver/CUDA facts, dataset and parameters, exact command, readable output directory, log/config references, metrics, failure evidence, scientific review, retention state, and next action.

Record only known facts. An important unknown may be represented as `unknown: <reason>` instead of being guessed. Commands, paths, and references must not contain credentials. Store safe references to authorized locations rather than copying keys, full transcripts, hidden reasoning, or paper PDFs.

## Lifecycle

Before launch, update `experiment.yaml` with the baseline, dataset, changed and fixed parameters, success evidence, resource boundary, and next action. At launch, create the Attempt file and capture code, environment, command, and output directory. On completion, failure, or interruption, update that Attempt with metrics, log references, failure evidence, scientific review, and the next action.

Hooks may remind the Agent about these checkpoints, but they do not replace semantic judgment or file writes. If a Hook, batch-report capability, validator, or projection is unavailable, the Agent continues the run and maintains the record directly.

## Compatibility

Legacy `.pipeline/memory/experiment-events/` and `.pipeline/memory/experiment-status/` data remains readable and may be synchronized by optional tooling. It is not the default write path for new records. Do not delete or rewrite legacy events unless the user explicitly requests a migration.

Work Placement remains available for repository, GPU, port, cache, and output-directory claims that require atomic coordination. An unbound Session does not block ordinary reads, diagnostics, command execution, or record maintenance under this protocol.
