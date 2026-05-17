# Feature Queue Spec

Feature Queue is the contract for `/hw:plan --batch`. It stores ordered feature intent and lightweight progress pointers. It does not replace the normal single-feature `/hw:plan` flow.

## Entity Model

Canonical hierarchy:

```text
Project > Cycle > Feature > Milestone > Step
```

Definitions:

- Project: the repository or workspace using Hypo-Workflow.
- Cycle: a delivery lane with its own milestone sequence, lifecycle log, reports, and archive summary.
- Feature: a user-facing requirement or capability inside a Cycle. Batch plan queues Features before execution.
- Milestone: a serial delivery unit generated from one Feature. A Feature may decompose into one or more Milestones.
- Step: the TDD execution state inside a Milestone, such as write_tests, run_tests_red, implement, run_tests_green, and review_code.
- Report: the completion summary for one Milestone.
- Patch is a side track for small fixes. Patch work may reference a Cycle or Feature, but it is not a child of the Feature Queue and does not change queue ordering.

Relationship rules:

- A Project may have multiple archived Cycles and one active Cycle.
- A Cycle may have one Feature Queue.
- A Feature belongs to exactly one Cycle.
- A Milestone belongs to exactly one Feature in batch mode.
- A Step belongs to exactly one Milestone.
- Patch is a side track and should stay in `.pipeline/patches/`.

## Queue File

Canonical path:

```text
.pipeline/feature-queue.yaml
```

The queue file stores:

- active Cycle ID
- queue defaults
- current_feature pointer
- ordered Feature list
- per-Feature status, priority, gate, decomposition mode, and milestone summary
- shallow metric_summary copied from `.pipeline/metrics.yaml`
- optional Feature-level DAG fields for long-running, batch, AFK, and HITL work

The queue stores summaries only. Detailed timing, token, and cost records belong in `.pipeline/metrics.yaml`.

## Queue Item Fields

Recommended shape:

```yaml
version: 1
cycle_id: C2
current_feature: F004
defaults:
  decompose_mode: upfront
  failure_policy: skip_defer
  auto_chain: true
  default_gate: auto
features:
  - id: F004
    title: Batch planning mode
    priority: 10
    status: active
    gate: auto
    decompose_mode: upfront
    depends_on: []
    unlocks: []
    blocked_by: []
    execution_hint: afk
    handoff_hint: HITL review
    ready_reason: dependencies_satisfied
    source: user
    summary: Add /hw:plan --batch and queue execution.
    milestones:
      - id: M05
        status: in_progress
        prompt_file: .pipeline/prompts/04-feature-queue-and-metrics-contracts.md
    metric_summary:
      duration_ms: n/a
      token_count: n/a
      cost: n/a
```

Status values:

- `queued`: waiting for its turn
- `active`: current Feature
- `decomposed`: Milestones generated but not yet completed
- `done`: all Feature Milestones passed
- `deferred`: skipped by failure policy or explicit user decision
- `blocked`: cannot proceed without user or environment action

## Feature DAG Board

Feature DAG is optional and appears only for long-running, batch, multi-Feature, AFK, or HITL coordination. Ordinary single-feature `/hw:plan` must not require or display DAG concepts.

The first DAG design is Feature-level only:

- `depends_on`: Feature IDs that must be `done` before this Feature is ready.
- `unlocks`: derived reverse dependency IDs; helpers may compute it from `depends_on`.
- `blocked_by`: derived unmet dependency IDs.
- `gate`: `auto` or `confirm`; confirm is a HITL pause, not a scheduler.
- `execution_hint`: optional `afk`, `hitl`, `parallel`, or `serial` hint.
- `handoff_hint`: short human-readable note for handoff or review expectations.
- `ready_reason`: derived reason such as `dependencies_satisfied`, `waiting_on_dependencies`, `active`, or `done`.

Helper behavior:

- compute ready Features when all dependencies are `done`
- compute blocked Features when dependencies are missing or not done
- report dependency cycles with a clear planning error
- expose parallel candidates as ready Features that can be considered together
- render a concise Feature table and Mermaid dependency graph when DAG fields are present

Milestones remain serial inside each Feature in this version. Feature DAG must not become an automatic runner.

## Decomposition Modes

Supported values:

- `upfront`: Discover all Features, then decompose every Feature into Milestones before execution starts. This is the default.
- `just_in_time`: Discover all Features first, but decompose a Feature only when it becomes current.

Mode selection:

- project config `batch.decompose_mode`
- global config `batch.decompose_mode`
- built-in default `upfront`
- per-Feature `decompose_mode` override

Both `upfront` and `just_in_time` must remain supported because some projects need full roadmap visibility while others need lower initial planning cost.

## Gates and Failure Policy

Gate values:

- `auto`: proceed automatically when tests/review pass
- `confirm`: pause before starting this Feature or before auto-chain advances into it

Failure policy values:

- `stop`: stop the batch lane on failure
- `skip_defer`: mark the failed Feature `deferred`, write a report, then advance to the next queued Feature
- `retry`: retry the failed Milestone when the agent can identify a concrete fix

Default policy:

```yaml
batch:
  failure_policy: skip_defer
```

`gate: confirm` is the explicit pause mechanism. It should not be simulated by disabling auto_chain globally.

Analysis preset does not imply any special gate. A Cycle may choose a no-gate policy with `defaults.auto_chain=true`, `defaults.default_gate=auto`, and per-Feature `gate: auto`. That policy belongs to the queue/Cycle, not to the analysis preset itself.

## Insert and Reorder

`/hw:plan --insert` may update `.pipeline/feature-queue.yaml` while preserving historical feature IDs.

The command accepts natural language from the user, but the Agent must first convert it to a structured queue operation before any file write:

```yaml
type: append | insert | move | reprioritize | pause | update
feature_id: F003
target_id: F002
position: before | after
feature:
  id: F006
  title: New Feature
  summary: User-facing intent
```

The first result of an edit is `confirmation_required`. The Agent must show the operation summary and queue diff, then wait for explicit user confirmation before applying the write.

Allowed operations:

- append a new Feature
- insert before or after an existing Feature
- update priority
- move queued Features
- set `gate: confirm`
- change `decompose_mode` for queued Features

Safety rules:

- do not reorder active, done, blocked, or deferred Features unless the user explicitly requests repair surgery
- do not silently reuse a completed Feature ID
- record insertion/reorder events in `.pipeline/log.yaml`
- keep `.pipeline/state.yaml` focused on the active Milestone execution state

Auto-chain behavior:

- after a Feature passes, mark it `done` and advance to the next queued Feature when `auto_chain=true`
- if the next Feature has `gate: confirm`, pause with no active `current_feature` until the user approves
- if a Feature fails and `failure_policy=skip_defer`, mark it `deferred`, keep its report and metrics, then advance to the next queued Feature
- if a Feature is `just_in_time`, generate its Milestones only when it becomes current

## State Boundaries

Feature Queue is a scheduling layer and summary file.

- It may point to the current Feature and planned Milestones.
- It may mirror a shallow status summary.
- It should say, explicitly: do not replace state.yaml.
- It must not replace state.yaml.
- It must not replace `.pipeline/cycle.yaml`.
- It must not replace `.pipeline/log.yaml`.
- It must not store detailed cost or token ledgers.

Use `.pipeline/state.yaml` for the active execution pointer, `.pipeline/cycle.yaml` for Cycle lifecycle metadata, `.pipeline/log.yaml` for events, and `.pipeline/metrics.yaml` for measurement details.
