---
name: reject
description: Reject pending Hypo-Workflow Cycle work with structured feedback and reopen the Cycle.
---

# /hw:reject
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill when the user invokes `/hw:reject`.

## 语义

- Read `.pipeline/cycle.yaml` and `.pipeline/state.yaml`.
- Require Cycle acceptance state `pending_acceptance` or `acceptance.state: pending`.
- Parse the user feedback as plain text unless a structured file is supplied.
- Write full feedback to `.pipeline/acceptance/cycle-C{N}-rejection-<timestamp>.yaml`.
- Mark `cycle.status: active`.
- Mark `cycle.acceptance.state: rejected`, `rejected_at`, and `feedback_ref`.
- Mirror only compact acceptance state in `state.yaml`:
  - `acceptance.scope: cycle`
  - `acceptance.state: rejected`
  - `acceptance.cycle_id`
  - `acceptance.feedback_ref`
  - `acceptance.updated_at`
- Set `pipeline.status: running`.
- By default, route rejection through `cycle.lifecycle_policy.reject.default_action=needs_revision`:
  - set `current.phase: needs_revision`
  - set `current.step: revise`
  - preserve `acceptance.feedback_ref` as revision input
  - status next action is `resume_revision`
- Only use `current.phase: executing` when the Cycle policy explicitly chooses a non-revision reject action.
- Use the workflow commit helper so authoritative rejection facts commit atomically before derived refreshes.
- Append a `cycle_reject` entry to `.pipeline/log.yaml` through the derived refresh path.
- Update `.pipeline/PROGRESS.md` with a compact board row through the derived refresh path.
- If a derived refresh fails after authority commits, keep the rejection facts, write `.pipeline/derived-refresh.yaml`, and surface a warning with repair guidance.

Never store full rejection feedback in `state.yaml`; use `feedback_ref`.
