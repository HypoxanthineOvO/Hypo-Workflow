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

此技能已弃用，仅保留用于兼容性说明。

## 前置条件

- 无

## 执行流程

1. 通知用户 `/hw:dashboard` 已从活跃命令表面移除。
2. 引导用户使用 `/hw:start`、`/hw:resume` 或 `/hw:status` 进行当前工作流控制。
3. 如果用户稍后需要基于浏览器的状态显示，请推迟到计划中的 Claude Code 插件/Web 界面。

## 参考文件

- `SKILL.md` — 需要时的更广泛 Pipeline 上下文