---
name: hw-reject
description: "Hypo-Workflow Cursor skill for /hw-reject; use when the user invokes /hw-reject or canonical /hw:reject."
---

# /hw-reject

Canonical command: `/hw:reject`
Cursor command: `/hw-reject`
Route: `lifecycle`
Embedded authority source: `skills/reject/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:reject` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Command Skill Authority

---
name: reject
description: Reject pending Hypo-Workflow Cycle work with structured feedback and reopen the Cycle.
---

# /hw:reject
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill when the user invokes `/hw:reject`.

## Semantics

- 读取 `.pipeline/cycle.yaml` 和 `.pipeline/state.yaml`。
- 要求 Cycle 验收状态为 `pending_acceptance` 或 `acceptance.state: pending`。
- 除非提供结构化文件，否则将用户反馈解析为纯文本。
- 将完整反馈写入 `.pipeline/acceptance/cycle-C{N}-rejection-<timestamp>.yaml`。
- 标记 `cycle.status: active`。
- 标记 `cycle.acceptance.state: rejected`、`rejected_at` 和 `feedback_ref`。
- 在 `state.yaml` 中仅镜像紧凑的验收状态：
  - `acceptance.scope: cycle`
  - `acceptance.state: rejected`
  - `acceptance.cycle_id`
  - `acceptance.feedback_ref`
  - `acceptance.updated_at`
- 设置 `pipeline.status: running`。
- 默认情况下，通过 `cycle.lifecycle_policy.reject.default_action=needs_revision` 路由拒绝：
  - 设置 `current.phase: needs_revision`
  - 设置 `current.step: revise`
  - 保留 `acceptance.feedback_ref` 作为修订输入
  - 状态下一个动作是 `resume_revision`
- 仅当 Cycle 策略明确选择非修订拒绝操作时，才使用 `current.phase: executing`。
- 使用工作流提交助手，以便权威拒绝事实在派生刷新之前原子提交。
- 通过派生刷新路径将 `cycle_reject` 条目追加到 `.pipeline/log.yaml`。
- 通过派生刷新路径用紧凑的板行更新 `.pipeline/PROGRESS.md`。
- 如果权威提交后派生刷新失败，请保留拒绝事实，写入 `.pipeline/derived-refresh.yaml`，并显示带有修复指导的警告。

切勿在 `state.yaml` 中存储完整的拒绝反馈；使用 `feedback_ref`。
