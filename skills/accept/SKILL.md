---
name: accept
description: Accept pending Hypo-Workflow Cycle work and complete the manual acceptance gate.
---

# /hw:accept
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill when the user invokes `/hw:accept`.

## 语义

- Read `.pipeline/cycle.yaml` and `.pipeline/state.yaml`.
- Require Cycle acceptance state `pending_acceptance` or `acceptance.state: pending`.
- Evaluate worker separation readiness before final acceptance:
  - read `state.runtime_workers`, prompt step evidence, review artifacts, and lifecycle log pointers when present
  - `recommended` requires distinct `test` and `implement` evidence unless objective unavailability plus an explicit allowed degradation is recorded
  - `strict` requires distinct `test`, `implement`, and `audit` evidence
  - each required worker must have lifecycle evidence for requested, started, terminal `completed`, and closed/released state
  - any missing worker, failed/blocked worker, `close_failed`, runtime-only subtask observation, or missing Codex `/hw:start` + `/hw:resume` authorization scope blocks acceptance
- If project worker separation policy requires audit-backed acceptance, ensure audit did not mark test coverage as insufficient before final acceptance.
- Mark `cycle.status: completed`.
- Mark `cycle.acceptance.state: accepted` and store `accepted_at`.
- If `cycle.lifecycle_policy.accept.next=follow_up_plan` or a planned `cycle.continuations[]` follow-up plan exists:
  - mark `cycle.status: follow_up_planning`
  - mark that continuation `status: active`
  - set `pipeline.status: stopped`
  - set `current.phase: follow_up_planning`
  - mirror only the active continuation in `state.yaml`
  - status next action is `start_follow_up_plan`
- Mirror only compact acceptance state in `state.yaml`:
  - `acceptance.scope: cycle`
  - `acceptance.state: accepted`
  - `acceptance.cycle_id`
  - `acceptance.updated_at`
- Without a follow-up continuation, set `pipeline.status: completed` and `current.phase: completed`.
- Use the workflow commit helper so authority facts are written atomically before derived refreshes.
- Append a `cycle_accept` entry to `.pipeline/log.yaml` through the derived refresh path.
- Update `.pipeline/PROGRESS.md` with a compact board row through the derived refresh path.
- If a derived refresh fails after authority commits, keep the accepted cycle facts, write `.pipeline/derived-refresh.yaml`, and surface a warning with repair guidance.
- Archive only when the Cycle close/archive flow is explicitly requested or configured; accepting the gate itself is not a separate runner.

Do not store full review notes in `state.yaml`.

`audit` may ask for re-test or re-implementation without blocking the whole execution by default, but it may still block acceptance when project policy requires it.
