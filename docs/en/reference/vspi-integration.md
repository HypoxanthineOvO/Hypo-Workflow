# VSPi 0.2.0 integration contract

VSPi hosts Hypo-Workflow project facts; it is not a process manager. VSPi and Pi own sessions, model calls, tool execution, and the TUI. Hypo-Workflow owns Plans, Deliveries, Workstreams, evidence, Continuation, Recovery, and auditable records.

## Authority boundary

- Hypo-Workflow is the sole project Plan authority. VSPi `/plan` projects and edits that Plan; it does not keep a long-lived Local Plan fallback or dual-write another Plan.
- An uninitialized project requires explicit `/hw:init`.
- `active.delivery` is a legacy foreground pointer, not a workspace-wide exclusivity lock.
- Each Session explicitly selects one Delivery or Experiment through Work Placement. Delivery-internal workers still use Workstreams, and multiple candidates never silently inherit `active.delivery`.
- One Project authority root may register multiple Repository Targets with stable identities, mutable locators, one primary integration target, and forward-compatible alternate targets.
- Hypo-Workflow never starts, stops, or supervises project processes and never holds a writer lock for an entire Agent turn.

## Concurrency and recovery

A workspace may contain multiple non-terminal Deliveries. Dependency-ready milestones may be claimed by separate Workstreams. Generation CAS, unique Session bindings, Git base, and path scopes reject stale or overlapping work.

Delivery and Experiment repository/resource claims are assessed and leased in one short transaction. Placement is `shared`, `isolated_worktree`, `isolated_resources`, or `blocked`. Core returns bounded `argv[]` Host descriptors but does not run Git, create worktrees, allocate devices, or merge. Source-changing Delivery claims block final completion until a digest-verified Git ancestry proof matches the claim and integration target.

Mutations acquire a short writer lease only for a transaction commit. Owner tokens and fencing allow a successor to recover an abandoned pending transaction after lease expiry. Reads do not acquire this lease, and users never need to delete a lock after `SIGTERM`, `SIGKILL`, or terminal loss.

## Model groups

Hypo-Workflow emits only a routing tier (`mechanical`, `standard`, `explore`, `critical`, or `escalation`) and capability requirements (`vision`, `tool_use`, and `context_window`). VSPi owns Explicit Auto Group resolution at turn or Worker boundaries. A manually pinned model remains selected until the user switches back to Auto. Provider names, model IDs, credentials, and model-specific prompt tuning never enter Hypo-Workflow Core evidence.

## Context experiment

Bounded capsules and typed on-demand reads are an opt-in experiment. Pi native compaction remains the stable fallback. The experiment records `input_tokens`, `latency_ms`, and `miss_rate` and cannot silently replace native compaction.

VSPi loads the version-matched Core bundle and uses `createDeliveryStore`, `createWorkstreamStore`, `createRepositoryTargetStore`, `createWorkPlacementStore`, `resolveWorkItemSession`, `compileVspiIntegrationContract`, and `parseVspiIntegrationContract` with the project root, an explicit zero-argument Clock, and a unique mutation ID.
