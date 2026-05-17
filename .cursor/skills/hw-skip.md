---
name: hw-skip
description: "Hypo-Workflow Cursor skill for /hw-skip; use when the user invokes /hw-skip or canonical /hw:skip."
---

# /hw-skip

Canonical command: `/hw:skip`
Cursor command: `/hw-skip`
Route: `pipeline`
Embedded authority source: `skills/skip/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:skip` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: skip
description: Skip the current prompt or step when the user explicitly wants to bypass work while keeping the pipeline state recoverable.
---

# /hypo-workflow:skip
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

使用此技能进行提示级别的跳过行为。对于步骤级别的跳过级联，应用根系统规则进行 `skip step`。

## 前置条件

- pipeline 处于活动状态
- 有当前提示可以跳过

## 执行流程

1. 读取 `.pipeline/state.yaml` 并确认存在活动的当前提示。
2. 将提示标记为已跳过，并附带机器可读的原因。
3. 将提示级别的跳过事件追加到 `.pipeline/log.yaml`。
4. 更新 `.pipeline/PROGRESS.md`，使里程碑摘要显示跳过结果。
5. 前进到下一个提示，而不递增 `pipeline.prompts_completed`。
6. 如果没有下一个提示存在，将 pipeline 标记为已完成。

## 安全规则

- 保持跳过的工作明确且可恢复
- 不要假装跳过的里程碑已通过
- 在状态和人类可读的进度输出中保留原因

## 参考文件

- `references/commands-spec.md` — 跳过语义
- `references/state-contract.md` — 状态变更
- `references/progress-spec.md` — 进度摘要更新
- `SKILL.md` — 更广泛的 pipeline 行为
