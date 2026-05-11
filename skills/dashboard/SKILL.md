---
name: dashboard
description: Internal legacy dashboard launcher removed from the active command surface.
---

# /hypo-workflow:dashboard
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

This Skill is deprecated and kept only for compatibility notes.

## 前置条件

- none

## 执行流程

1. Inform the user that `/hw:dashboard` has been removed from the active command surface.
2. Direct the user to `/hw:start`, `/hw:resume`, or `/hw:status` for current workflow control.
3. If the user needs browser-based status later, defer to the planned Claude Code plugin/Web surface.

## 参考文件

- `SKILL.md` — broader pipeline context if needed
