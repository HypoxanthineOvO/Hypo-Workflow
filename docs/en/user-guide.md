# User Guide

[中文](../user-guide.md) | English

Hypo-Workflow is a project-work protocol for the current Codex host. `.pipeline/manifest.yaml` selects the current workspace format, while Runtime, Continuation, Records, Receipts, Recovery, and Experiment events preserve restart-safe authority. The host Agent still performs implementation, tests, command execution, and experiment supervision; Workflow is not a runner.

## Current Routes

The v14.0.0-alpha.2 Official Codex release exposes ten focused routes. Each route loads exactly one Child Skill:

| Route | Purpose |
| --- | --- |
| `/hw:guide` | inspect the repository and recommend one Workflow path |
| `/hw:init` | initialize or inspect a manifest-based workspace |
| `/hw:goal` | deliver one outcome with a clear acceptance target |
| `/hw:plan` | design work that needs clarification, architecture choices, or decomposition |
| `/hw:cycle` | deliver Milestones with real dependency order |
| `/hw:maintain` | persist one focused requirement, preference, decision, or feedback item |
| `/hw:experiment` | manage nonlinear experiments, baselines, environments, scans, Attempts, review, and instant status |
| `/hw:resume` | restore the current Delivery after restart or compaction |
| `/hw:accept` | accept a verified Delivery at its manual gate |
| `/hw:reject` | reject pending results with structured feedback |

Ordinary conversation does not require a route choice. Status, reports, explanation, consistency checks, debugging, knowledge lookup, and compaction are semantic Agent behaviors rather than additional public commands.

## Goal, Cycle, Maintain, And Experiment

- Goal fits one bounded result with one final acceptance.
- Cycle is reserved for stages with real dependency order. A Milestone is an independently verifiable stage outcome, not a mechanical task list.
- Maintain records day-to-day project facts without opening a Delivery.
- Experiment is a durable nonlinear lane for project knowledge, environments, code snapshots, machines, datasets, baselines, scans, Attempts, metrics, exceptions, trash/restore history, and next actions.

When the user asks for experiment status, the Agent reads the project's bounded materialized status projection first. It summarizes default and contextual baselines, hardware and environment context, dataset meaning, scan purpose, outcomes, suspicious results, resource boundaries, and next actions. It follows detail references only for drill-down; an ordinary status answer does not rescan the repository, result directories, or every immutable event.

## Experiment Working Model

### Project Knowledge And Reproducible Context

Experiment knowledge preserves purpose, safe references to papers and documentation, metric semantics, dataset units, major modules, optimization locations, and concept-to-code mappings. It can map a name such as “RE acceleration” to the sampling or occupancy functionality that actually implements it. After code changes, the Agent checks whether those references became stale and either updates them or reports the unresolved difference.

Before a run, record:

- the Git commit/tree snapshot and any relevant worktree variation;
- the `uv` environment, lockfile digest, and required versions, without introducing Conda by default;
- machine, GPU, driver, CUDA, resource limits, and server-specific external data locations;
- dataset, scene, parameters, random seeds, the complete command, log/config/metric references, and a readable output directory.

Experiment events never store raw credentials, Keys, hidden reasoning, full transcripts, or paper PDFs. They store only safe references to authorized locations.

### Experiments, Attempts, Scans, And Baselines

One logical Experiment may have many Attempts. An explicit “rerun this experiment” retains logical identity and creates another Attempt while keeping its code snapshot and failure evidence traceable. A different dataset or scene has a different experiment identity, preventing unrelated NeRF scenes or simulator traces from being mixed.

A scan declares:

- changed axes, fixed parameters, and selected ranges;
- one-axis frequency sweeps, L1/L2 cross sweeps, or other parameter combinations;
- why a screening case should expand to all data;
- memory, GPU memory, disk, and time feasibility boundaries, including OOM or infeasible regions.

Baselines are scoped. A project may have a global default baseline and contextual baselines for a temperature, dataset, method family, or optimization stage. Every change records its rationale and scope.

### Long Runs, Scientific Review, And Retention

The host Agent may wait in the foreground or use a uniquely named tmux session that does not interfere with unrelated work. When asked to watch a run, the Agent polls and updates facts. An interruption preserves evidence; a real checkpoint is resumed, otherwise the record says that execution restarts from scratch.

Operational completion means only that the program ended. Scientific review also considers metric meaning, baselines, paper expectations, neighboring runs, configuration, preprocessing, randomness, and resource limits. A mismatch with a paper produces a cause analysis rather than an immediate “implementation bug” conclusion. Suspicious AI judgments become pending confirmations for the user.

Incorrect or obsolete Attempts go to trash instead of being deleted and remain restorable. Permanent cleanup requires fresh explicit authorization. Before a rerun can overwrite an existing output reference, the Agent must surface the retention risk.

### Events, Git Synchronization, And Instant Status

Baseline, dataset, scan, Attempt, exception, lifecycle, and next-action facts are appended as content-addressed immutable events. Events from multiple clones can be unioned through Git. If the same `event_key` has incompatible meanings, Workflow summarizes the conflict and stops before choosing unless the user delegates that decision.

Materialized status is a bounded, validated project view. It leads with baselines, hardware and environment, dataset semantics, scans and their purpose, outcome counts, suspicious or resource-limited results, trash/retention state, and concrete next actions. Raw JSON and immutable events are read only for drill-down.

### Experiment Boundaries

Workflow is not a runner, queue, or resident scanner and does not create a fleet of background processes that only mutate status. The host Agent executes commands, tmux, SCP, retries, and analysis; Workflow validates and preserves the facts.

Real NeRF, AceSim, GPU, paper reproduction, GitLab remote, SSH/SCP, large-trace, and multi-week behavior still need a real-project Pilot. Environment records are experiment-specific machine snapshots, not whole-computer management for proxies, subscriptions, ports, services, tools, Key locations, SSH, symlinks, or binaries.

## Task Assessment And Worker Routing

These decisions remain separate:

```text
Workflow shape -> Worker topology -> Task Assessment -> semantic routing class -> host model mapping
```

Topology decides whether the main thread can finish the work or whether independent test, implement, audit, or other identities are needed. The host AI generates and shows a Task Assessment from repository evidence before Worker start:

| Field | Meaning | Mandatory current signal |
| --- | --- | --- |
| `complexity` | comprehension, implementation, and coordination difficulty | visible only; does not upgrade by itself |
| `uncertainty` | how unclear the root cause, route, or inputs remain | `high` is at least `explore` |
| `oracle_strength` | reliability of tests, specifications, or metrics as a correctness judge | `weak` is at least `critical` |
| `blast_radius` | potentially affected modules, users, or authority surfaces | `high` is at least `critical` |
| `reversibility` | direct rollback, guarded rollback, or materially irreversible work | `irreversible` is `escalation` |
| `risk_flags` | special risks such as security, migration, or recovery conflict | any non-empty set is at least `critical` |

Core calls no classification model. It deterministically applies `escalation > critical > explore > standard > mechanical` and emits one class plus a reason code:

| Class | Typical trigger |
| --- | --- |
| `mechanical` | status, formatting, read-only summaries, deterministic test commands, trivial reversible changes |
| `standard` | ordinary implementation, routine test design, or documentation |
| `explore` | unknown roots, candidate comparison, high uncertainty, exploratory implementation |
| `critical` | weak oracle, independent audit, architecture, recovery conflict, or high blast radius |
| `escalation` | security, migration, irreversible work, or two distinct failed execution routes |

Same-route retries, user cancellation, Worker startup failure, and network failure do not increase the distinct failed route count. `off` emits no hint; `advisory` records fallback when the host lacks support; `required` blocks an unsupported semantic handoff. Resume reuses the persisted decision instead of reclassifying.

Workflow does not emit Luna/Sol, providers, credentials, reasoning effort, token limits, or prices. Host mapping cannot change role independence, acceptance evidence, or user authority.

## Execution And Acceptance

Material delivery is driven by verifiable effects. Topology determines whether test, implement, audit, or other independent identities are required; role separation and acceptance evidence do not depend on a concrete model. Starting after approval is a contextual transition rather than another public route.

Runtime owns lifecycle authority, Continuation owns the next action, and a Recovery Pack only supplies bounded recovery context. If no Pack exists, Runtime and Continuation still permit a degraded resume. Legacy `.pipeline` lifecycle files are never fallback authority.

Final delivery explains the conclusion, technical approach, modified modules, test design, validation results, expected behavior, problems encountered, and remaining risks in the conversation. Artifact paths support that explanation but do not replace it.

## Release Boundary

The v14.0.0-alpha.2 Host Contract v1, Codex plugin ZIP, and portable ZIP all publish ten routes and include `/hw:experiment`. Official Codex is the only current support surface; other platforms and concrete VSP-Codex model mapping require separate target-repository adaptation and validation.
