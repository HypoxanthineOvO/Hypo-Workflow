---
name: hw-accept
description: "Hypo-Workflow Cursor skill for /hw-accept; use when the user invokes /hw-accept or canonical /hw:accept."
---

# /hw-accept

Canonical command: `/hw:accept`
Cursor command: `/hw-accept`
Route: `lifecycle`
Embedded authority source: `skills/accept/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:accept` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

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

当用户调用 `/hw:accept` 时使用此技能。

## Semantics

- 读取 `.pipeline/cycle.yaml` 和 `.pipeline/state.yaml`。
- 要求 Cycle 验收状态为 `pending_acceptance` 或 `acceptance.state: pending`。
- 在最终验收前评估 worker separation 准备情况：
  - 读取 `state.runtime_workers`、prompt 步骤证据、审查产物以及生命周期日志指针（如果存在）
  - `recommended` 策略要求不同的 `test` 和 `implement` 证据，除非记录了客观不可用性加上明确允许的降级
  - `strict` 策略要求不同的 `test`、`implement` 和 `audit` 证据
  - 每个必需的 worker 必须具有 requested、started、terminal `completed` 和 closed/released 状态的生命周期证据
  - 任何缺失的 worker、失败/阻塞的 worker、`close_failed`、仅运行时的子任务观察，或缺失的 Codex `/hw:start` + `/hw:resume` 授权范围都会阻止验收
- 如果项目 worker separation 策略要求 audit 支持的验收，请确保 audit 在最终验收前未将测试覆盖率标记为不足。
- 标记 `cycle.status: completed`。
- 标记 `cycle.acceptance.state: accepted` 并存储 `accepted_at`。
- 如果 `cycle.lifecycle_policy.accept.next=follow_up_plan` 或存在计划的 `cycle.continuations[]` 后续计划：
  - 标记 `cycle.status: follow_up_planning`
  - 标记该 continuation `status: active`
  - 设置 `pipeline.status: stopped`
  - 设置 `current.phase: follow_up_planning`
  - 仅在 `state.yaml` 中镜像活跃的 continuation
  - 状态下一步操作为 `start_follow_up_plan`
- 仅在 `state.yaml` 中镜像紧凑的验收状态：
  - `acceptance.scope: cycle`
  - `acceptance.state: accepted`
  - `acceptance.cycle_id`
  - `acceptance.updated_at`
- 没有后续 continuation 时，设置 `pipeline.status: completed` 和 `current.phase: completed`。
- 使用工作流提交助手，确保权威事实原子性写入后再进行派生刷新。
- 通过派生刷新路径将 `cycle_accept` 条目追加到 `.pipeline/log.yaml`。
- 通过派生刷新路径更新 `.pipeline/PROGRESS.md` 的紧凑看板行。
- 如果派生刷新在权威提交后失败，保留已验收的 Cycle 事实，写入 `.pipeline/derived-refresh.yaml`，并显示带有修复指导的警告。
- 仅在明确请求或配置 Cycle 关闭/归档流程时才进行归档；验收 gate 本身不是独立的 runner。

不要在 `state.yaml` 中存储完整的审查笔记。

`audit` 可以要求重新测试或重新实现，默认情况下不会阻止整个执行，但当项目策略要求时仍可能阻止验收。
