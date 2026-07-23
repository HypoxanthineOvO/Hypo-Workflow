---
name: plan-confirm
description: Legacy compatibility gate for existing generated artifacts; new planning uses in-phase Question Tool / Ask confirmation instead of a standalone user command.
---

# /hypo-workflow:plan-confirm
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

仅当旧生成产物仍显式引用 Confirm gate 时作为兼容说明使用。新 Plan 命令面不再暴露 `/hw:plan:confirm`；确认行为必须作为各阶段内 Question Tool / Ask gate 处理。

## 前置条件

- 规划产物已存在或刚刚生成

## 执行流程

1. 解析 plan mode：项目 `plan.mode` > 全局 `plan.default_mode` > `interactive`，并解析 `automation.gates.planning`：项目 > 全局 > 默认 `confirm`。
2. 摘要展示：
   - 项目名称
   - 技术栈
   - preset
   - Milestone 数量
   - 生成的文件
   - greenfield vs append 模式
3. 如果 `automation.gates.planning=confirm`，将 Confirm 视为硬门禁，即使 `plan.mode=auto` 也要等待明确批准后才能执行。
4. 如果 `automation.gates.planning=auto`，`plan.mode=auto` 可将 confirm 视为摘要检查点，无需批准即可继续。
5. 在此检查点激活期间设置 `current.phase=plan_confirm`。

## 交互硬门禁

交互式 Confirm 不得被压缩为被动摘要。Agent 必须停下来等待，直到用户明确说「确认」或无歧义的等效批准（如「确认，开始执行」）。模糊的确认、"再检查一遍"的请求或沉默都不构成批准。

当 `automation.gates.planning=confirm`，或当 `plan.interactive.require_explicit_confirm=true` 或交互模式中该字段缺失时，此门禁是强制性的。自动化级别不得静默降级规划确认门禁。

## 参考文件

- `plan/PLAN-SKILL.md` — Confirm 阶段规则
- `references/commands-spec.md`
- `references/config-spec.md`
- `SKILL.md`
