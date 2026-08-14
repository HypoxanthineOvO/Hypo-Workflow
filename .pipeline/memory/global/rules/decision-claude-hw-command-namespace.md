---
kind: decision
name: claude-hw-command-namespace
level: constraint
scope: project
status: active
updated: 2026-08-14
supersedes: []
sources: [chat 2026-05-12, .pipeline/rules/structured/project/claude-hw-command-namespace.yaml]
---

# Claude /hw 命令命名空间

Claude Code 集成必须通过 `hw` 插件命名空间暴露 Hypo-Workflow 命令（`/hw:*`），并保持 Claude 原生 `/resume` 与 Hypo `/hw:resume` 分离；不得回归为单个 `/hypo-workflow` 聚合命令。生成 Claude 命令文件时保持 `commands/resume.md`、`commands/patch.md` 与嵌套命令（如 `commands/plan/discover.md`）存在，`.claude-plugin/plugin.json` 的 `name: hw`。
