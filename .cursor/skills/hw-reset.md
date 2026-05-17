---
name: hw-reset
description: "Hypo-Workflow Cursor skill for /hw-reset; use when the user invokes /hw-reset or canonical /hw:reset."
---

# /hw-reset

Canonical command: `/hw:reset`
Cursor command: `/hw-reset`
Route: `lifecycle`
Embedded authority source: `skills/reset/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:reset` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: reset
description: Reset Hypo-Workflow runtime artifacts when the user wants to clear state safely without deleting core project instructions by mistake.
---

# /hypo-workflow:reset
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for safe, full, or hard reset behavior.

## Prerequisites

- 在删除前清楚地标识将被删除的内容

## Execution Flow

1. `/hypo-workflow:reset`
   - 重新初始化 `state.yaml`
   - 保留配置、提示、架构和日志
2. `/hypo-workflow:reset --full`
   - 删除状态、报告和生命周期日志
   - 保留配置、提示和架构
3. `/hypo-workflow:reset --hard`
   - 显示删除列表
   - 需要明确的 `YES`
   - 删除整个 `.pipeline/` 工作区

## Safety Rules

- 切勿跳过删除预览
- 切勿在没有明确确认的情况下运行硬重置

## Reference Files

- `references/commands-spec.md`
- `references/log-spec.md`
- `SKILL.md`
