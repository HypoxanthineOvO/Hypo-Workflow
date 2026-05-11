---
name: reset
description: Reset Hypo-Workflow runtime artifacts when the user wants to clear state safely without deleting core project instructions by mistake.
---

# /hypo-workflow:reset
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for safe, full, or hard reset behavior.

## 前置条件

- clearly identify what will be removed before deletion

## 执行流程

1. `/hypo-workflow:reset`
   - reinitialize `state.yaml`
   - preserve config, prompts, architecture, and logs
2. `/hypo-workflow:reset --full`
   - remove state, reports, and lifecycle logs
   - preserve config, prompts, and architecture
3. `/hypo-workflow:reset --hard`
   - show the delete list
   - require explicit `YES`
   - remove the whole `.pipeline/` workspace

## 安全规则

- never skip the delete preview
- never run hard reset without explicit confirmation

## 参考文件

- `references/commands-spec.md`
- `references/log-spec.md`
- `SKILL.md`
