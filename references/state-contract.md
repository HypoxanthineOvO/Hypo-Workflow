# State Contract

## 中文主体说明

本契约定义 `.pipeline/state.yaml` 的结构、生命周期字段、Milestone 状态、step 记录、acceptance mirror、continuation 和 worker evidence。字段名、状态枚举、YAML 路径和 command literal 必须保持英文，不翻译成中文键名。

This file defines the full `state.yaml` contract used by the pipeline.

## Top-Level Structure

```yaml
pipeline:
  name: ""
  status: idle | running | blocked | aborted | stopped | completed
  prompts_total: 0
  prompts_completed: 0
  started: null
  finished: null
last_heartbeat: null
current:
  phase: idle | plan_discover | plan_decompose | plan_generate | plan_confirm | executing | lifecycle_init | lifecycle_check | lifecycle_audit | lifecycle_release | lifecycle_debug | lifecycle_cycle | lifecycle_patch | completed
  prompt_index: 0
  prompt_file: null
  prompt_name: null
  step: null
  step_index: 0
milestones: []
prompt_state:
  started_at: null
  updated_at: null
  finished_at: null
  result: running | pass | blocked | aborted | stopped | skipped
  diff_score: null
  code_quality: null
  analysis_summary: null
  steps: []
history:
  completed_prompts: []
chat: {}
acceptance: {}
continuation: {}
runtime_workers: {}
```

## Cycle Workflow Metadata

Cycle-level workflow truth lives in `.pipeline/cycle.yaml`, not in `state.yaml`.
`state.yaml` may mirror only the currently active continuation. The Cycle schema uses:

```yaml
cycle:
  workflow_kind: build | analysis | showcase
  analysis_kind: root_cause | metric | repo_system
  type: feature | analysis | showcase
  lifecycle_policy:
    reject:
      default_action: needs_revision
    accept:
      next: complete | auto_continue | follow_up_plan
    resume:
      default_action: continue_current | continue_revision
    gates:
      acceptance: auto | confirm | manual_qa
    auto_continue: true
  continuations:
    - id: C5-follow-up
      kind: follow_up_plan
      status: planned | active | done | blocked
      prompt_ref: .pipeline/plan-continuations/C5-follow-up.yaml
```

Rules:

- `workflow_kind` is Cycle-scoped and is the single source for Plan, Start, Status, Report, Acceptance, and platform boundary semantics inside one Cycle.
- `cycle.type` is a legacy/internal alias derived from `workflow_kind`; it must not become a second user-facing taxonomy.
- `execution.steps.preset` defaults from `workflow_kind`: `analysis -> analysis`, `showcase -> implement-only`, `build -> tdd`.
- `lifecycle_policy.reject.default_action` defaults to `needs_revision`.
- `cycle.continuations[]` is the authority for planned follow-up nodes. `state.yaml` only mirrors the active continuation.

Canonical user-facing phases are:

- `planning`
- `ready_to_start`
- `executing`
- `pending_acceptance`
- `needs_revision`
- `accepted`
- `follow_up_planning`
- `blocked`
- `completed`

Status surfaces should derive one canonical phase and one next action from Cycle metadata, state, acceptance, and continuation facts.

## Milestone Record Fields

Each `milestones[]` item may contain:

- `name`
- `status`
- `deferred_reason`

Allowed milestone status values:

- `done`
- `in_progress`
- `deferred`
- `failed`
- `skipped`

## Step Record Fields

Each `prompt_state.steps[]` item may contain:

- `name`
- `status`
- `executor`
- `subagent_tool`
- `subagent_result`
- `reason`
- `started_at`
- `finished_at`
- `duration_seconds`
- `notes`

## Runtime Worker Mirror

`runtime_workers:` is optional and stores a compact execution-time mirror of worker separation evidence derived from step execution. It exists so acceptance and status surfaces do not need to reconstruct the same facts repeatedly from raw step notes.

Suggested shape:

```yaml
runtime_workers:
  workers:
    - role: implement
      worker_id: self
    - role: test
      worker_id: codex
    - role: audit
      worker_id: self
  role_availability:
    audit:
      status: unavailable
      reason: command_unavailable
  updated_at: 2026-05-07T10:00:00+08:00
```

Rules:

- `runtime_workers` is a compact mirror, not the authority; step records remain the underlying evidence.
- `runtime_workers.workers` must not include Codex/OpenCode runtime-only subtask observations as acceptance evidence.
- `workers[*].role` should use `implement`, `test`, or `audit`.
- `role_availability.<role>.status` currently supports `unavailable` or omission.
- `reason` should be a machine-readable token such as `tool_unavailable`, `command_unavailable`, `platform_unsupported`, `capability_missing`, `permission_denied`, `spawn_failed`, or `exec_nonzero`.
- The mirror should be refreshed when a relevant execution step finishes or when fallback evidence changes.
- Entries marked with `evidence_scope: runtime_observation` or sources such as `opencode_active_subtask`, `codex_internal_subtask`, `codex_subcodex`, or `subtask_part` are UI/runtime observations only. They may be shown on status surfaces but must be ignored by acceptance and worker separation gates.

## Analysis State Summary

`prompt_state.analysis_summary` is optional and is used by analysis Milestones to keep resume/status/watchdog/report surfaces useful without turning `.pipeline/state.yaml` into an evidence database.

Suggested shape:

```yaml
prompt_state:
  analysis_summary:
    milestone_id: M06
    question: "Why did the metric change?"
    ledger_path: .pipeline/analysis/M06-analysis-ledger.yaml
    hypothesis_counts:
      total: 2
      confirmed: 1
      disproved: 1
      partial: 0
      pending: 0
    experiment_counts:
      total: 2
      completed: 2
      blocked: 0
      pending: 0
    conclusion: "Most likely explanation."
    confidence: high
    updated_at: 2026-05-02T13:00:00+08:00
```

Boundary rules:

- `prompt_state.analysis_summary` must include `ledger_path` when a ledger exists.
- `state.yaml` must not store full hypotheses.
- `state.yaml` must not store full experiments.
- `state.yaml` must not store full observations.
- Full evidence belongs in `.pipeline/analysis/<milestone-id>-analysis-ledger.yaml`.
- Hypothesis backtracking should update the ledger and summary counts; it must not require rolling back `current.step`.

## Read / Write Timing

Write `state.yaml` at these moments:

- pipeline initialization
- prompt start
- step start
- step finish
- any skip cascade update
- prompt skip
- graceful stop
- prompt finish
- prompt blocked
- abort or restart

Protected lifecycle writes must go through the workflow commit helper instead of direct ad hoc file writes. The helper contract is:

- prevalidate the next authoritative snapshot before writing `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/rules.yaml`
- write authority files with temp-file atomic replacement
- run post-write invariants for step pointers, rejected acceptance state, prompt completion counts, and follow-up continuation state
- refresh affected derived views such as `.pipeline/log.yaml`, `.pipeline/PROGRESS.md`, metrics mirrors, compact views, project summaries, and OpenCode status inputs as derived targets
- if authority commits but a derived refresh fails, keep authority committed, write `.pipeline/derived-refresh.yaml`, return a warning/failure status, and tell the user to repair with `/hw:sync --light` or rerun the lifecycle command after fixing the derived artifact

Read `state.yaml` at these moments:

- `start pipeline`
- `continue`
- `pipeline status`
- `/hw:resume`
- `/hw:status`
- `/hw:skip`
- `/hw:stop`
- `/hw:report`
- `skip step`
- `abort`
- `/hw:chat`
- `/hw:chat end`

## Field Dependencies

- `current.step` must always point to the next runnable or currently running step.
- `current.step_index` must match the index of `current.step` inside `prompt_state.steps`.
- `current.phase` should reflect whether the system is in planning, execution, lifecycle, or completion state.
- `last_heartbeat` should be updated with an ISO-8601 timestamp whenever execution state is persisted during `/hw:start` or `/hw:resume`.
- `.pipeline/.lock` is a structured execution lease, not a bare sentinel file.
- Execution leases include `schema_version`, `platform`, `session_id`, `owner`, `command`, `phase`, `created_at`, `heartbeat_at`, `expires_at`, `workflow_kind`, `cycle_id`, and `handoff_allowed`.
- Fresh foreign leases block resume. Expired leases may be taken over and must log `lease_takeover` evidence.
- Platform-reported failures should be recorded as `reported_failure`; timeout-only recovery is `inferred_stall`.
- Malformed leases require repair guidance instead of silent deletion.
- `pipeline.prompts_completed` must equal the number of successful prompt entries in `history.completed_prompts`.
- `prompt_state.diff_score` drives the final decision gate.
- `prompt_state.code_quality` informs the `code_quality` evaluation check.
- `executor=subagent` implies `subagent_tool` is not null and `subagent_result` should exist unless parsing failed.
- `status=skipped` should carry a `reason`.
- `milestones[].status=deferred` should carry `deferred_reason`.
- `pipeline.status=stopped` means the run is intentionally paused and resumable.
- `prompt_state.result=stopped` means the current prompt was paused mid-flight and should resume from `current.step`.
- prompt-level `result=skipped` should not increment `pipeline.prompts_completed`.
- `history.completed_prompts` is a legacy field name and may contain non-pass entries such as `blocked`, `aborted`, or `skipped`.
- optional `chat.*` state must never replace Cycle / Milestone / Patch state; it only annotates an append conversation lane.
- optional `prompt_state.analysis_summary` must stay compact and must never replace the analysis ledger.
- Knowledge Ledger records must stay outside `state.yaml`; if a future status, resume, or SessionStart surface needs recovery context, store only compact/index pointers such as `.pipeline/knowledge/knowledge.compact.md` and `.pipeline/knowledge/index/*.yaml`.
- optional `acceptance.*` state is a compact mirror for status and TUI surfaces; Cycle-level truth stays in `.pipeline/cycle.yaml`.
- `acceptance.feedback_ref` may point to structured rejection feedback under `.pipeline/acceptance/`.
- `state.yaml` must not store full acceptance or rejection feedback text.
- `current.phase=needs_revision` means `/hw:resume` should continue the revision path using `acceptance.feedback_ref` as input instead of resuming a completed step.
- `current.phase=follow_up_planning` means accepted work is waiting to start the active `continuation` record.

## Acceptance State

`acceptance:` is optional and mirrors minimal acceptance status for resume, status, and OpenCode TUI surfaces.

Suggested fields:

```yaml
acceptance:
  scope: cycle
  state: pending | accepted | rejected
  mode: manual | auto | timeout
  cycle_id: C4
  requested_at: 2026-05-03T00:10:00+08:00
  feedback_ref: .pipeline/acceptance/cycle-C4-rejection-20260503T001200+0800.yaml
  updated_at: 2026-05-03T00:12:00+08:00
```

Notes:

- Cycle acceptance authority is `.pipeline/cycle.yaml`.
- Patch acceptance authority belongs to Patch metadata.
- Full feedback belongs in `feedback_ref`, not in `state.yaml`.
- Timeout acceptance is a deterministic status/check decision. Status surfaces may display `accepted`, `timed_out: true`, and `automatic: true` after the configured timeout, but no background runner should rewrite `state.yaml`.
- Rejection feedback files should be structured with `problem`, `reproduce_steps`, `expected`, `actual`, `context`, `iteration`, and `created_at`. A compatibility `feedback` field may exist for older Patch fix readers.

## Continuation Mirror

`continuation:` is optional and mirrors only the active Cycle continuation for status and resume surfaces.

Suggested fields:

```yaml
continuation:
  id: C5-follow-up
  kind: follow_up_plan
  status: active
  title: Plan build follow-up
  prompt_ref: .pipeline/plan-continuations/C5-follow-up.yaml
  updated_at: 2026-05-03T10:00:00+08:00
```

Notes:

- The authoritative planned list is `cycle.continuations[]`.
- Do not mirror inactive or historical continuations into `state.yaml`.
- A follow-up planning continuation should surface canonical phase `follow_up_planning` and next action `start_follow_up_plan`.

## Chat State

`chat:` is optional and is used for lightweight append conversation state.

Suggested fields:

```yaml
chat:
  active: false
  session_id: null
  started_at: null
  last_activity_at: null
  summary_policy: minimal | full | auto
  related_cycle: C2
  related_milestone: null
  recent_files: []
```

Notes:

- `chat.active` indicates whether append conversation mode is live or should be recovered.
- `summary_policy` distinguishes full chat summary from minimal log-only persistence.
- `related_cycle` and `related_milestone` are references, not ownership transfer.
- `recent_files` is a lightweight recovery aid for context restoration.
- chat mode does not replace Cycle / Milestone / Patch semantics.

## Version History

### V0

Introduced:

- pipeline/current/prompt_state/history structure
- step status and timing
- `diff_score`
- notes-based logging model

### V0.5

Added:

- `code_quality`
- explicit skip reasons
- inline validation fallback notes
- consistent next-prompt advance semantics

### V1

Added:

- `executor`
- `subagent_tool`
- `subagent_result`

### V4.5

Added:

- slash-command-aware resumable stop state through `pipeline.status=stopped`
- prompt-level `result=stopped`
- prompt-level `result=skipped`
- prompt skip / graceful stop write timing

### V6.2

Added:

- `current.phase`
- milestone-level tracking through `milestones[]`
- `milestones[].status=deferred`
- `milestones[].deferred_reason`
- explicit separation between machine-readable `log.yaml` and human-readable `PROGRESS.md`

### V8

Added:

- optional `last_heartbeat` for Auto Resume watchdog detection
- Cycle and Patch lifecycle phases
- Cycle-local milestone numbering semantics through `.pipeline/cycle.yaml`

### V9.1

Added:

- optional `chat:` append conversation state
- chat recovery hints for SessionStart / Stop Hook integration
- explicit note that chat mode does not replace Cycle / Milestone / Patch

### V10 Analysis

Added:

- optional `prompt_state.analysis_summary`
- analysis ledger pointer through `analysis_summary.ledger_path`
- explicit boundary keeping full hypotheses, experiments, and observations out of `state.yaml`

## V4 新增字段

### history[].evaluation

每个 Prompt 完成后写入：

```yaml
evaluation:
  diff_score: 1-5
  code_quality: 1-5
  test_coverage: 1-5 | null
  complexity: 1-5
  architecture_drift: 1-5
  overall: 1-5
  adaptive_threshold: 2-5
  warnings:
    - "..."
```

说明：

- `test_coverage` 在非 TDD 模式为 `null`
- `overall` 是加权综合结果
- `warnings` 保存本轮触发的 WARN 条件

### pipeline.adaptive_threshold

仅当 `evaluation.adaptive_threshold=true` 时存在：

- 类型：`integer (2-5)`
- 初始值：`evaluation.base_max_diff_score`
- 更新时机：每轮 Prompt 评估完成后

### prompt_state.evaluation

当前 Prompt 在内存和 state 中应保留当前评估块：

```yaml
evaluation:
  diff_score: 1-5
  code_quality: 1-5
  test_coverage: 1-5 | null
  complexity: 1-5
  architecture_drift: 1-5
  overall: 1-5
  adaptive_threshold: 2-5
  warnings:
    - "..."
```

该块适合在 prompt 完成时复制到 `history[].evaluation`。

## Full Example

```yaml
pipeline:
  name: Hypo-TODO
  status: running
  prompts_total: 4
  prompts_completed: 1
  started: 2026-04-22T10:00:00Z
  finished: null
current:
  phase: executing
  prompt_index: 1
  prompt_file: 01-core-crud.md
  prompt_name: core-crud
  step: review_code
  step_index: 5
milestones:
  - name: 00-scaffold
    status: done
    deferred_reason: null
  - name: 01-core-crud
    status: in_progress
    deferred_reason: null
prompt_state:
  started_at: 2026-04-22T10:10:00Z
  updated_at: 2026-04-22T10:18:00Z
  finished_at: null
  result: running
  diff_score: null
  code_quality: null
  steps:
    - name: write_tests
      status: done
      executor: self
      subagent_tool: null
      subagent_result: null
      reason: null
      started_at: 2026-04-22T10:10:00Z
      finished_at: 2026-04-22T10:11:00Z
      duration_seconds: 60
      notes: wrote 8 tests
    - name: review_tests
      status: done
      executor: subagent
      subagent_tool: codex
      subagent_result:
        verdict: pass
        issues: []
        coverage_assessment: sufficient
        suggestions: []
      reason: null
      started_at: 2026-04-22T10:11:00Z
      finished_at: 2026-04-22T10:12:00Z
      duration_seconds: 60
      notes: executor=subagent tool=codex verdict=pass
    - name: run_tests_red
      status: done
      executor: self
      subagent_tool: null
      subagent_result: null
      reason: null
      started_at: 2026-04-22T10:12:00Z
      finished_at: 2026-04-22T10:13:00Z
      duration_seconds: 60
      notes: expected failures observed
history:
  completed_prompts:
    - prompt_file: 00-scaffold.md
      result: pass
      diff_score: 1
      code_quality: 4
      report_file: .pipeline/reports/00-scaffold.report.md
```
