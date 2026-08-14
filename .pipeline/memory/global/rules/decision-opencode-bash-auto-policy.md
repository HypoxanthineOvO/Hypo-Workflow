---
kind: decision
name: opencode-bash-auto-policy
level: constraint
scope: project
status: active
updated: 2026-08-14
supersedes: []
sources: [chat 2026-05-14, .pipeline/rules/structured/project/opencode-bash-auto-policy.yaml]
---

# OpenCode bash 自动放行策略

OpenCode 执行使用 native schema 兼容的 YOLO 权限：生成的 `opencode.json` 与 OpenCode agent frontmatter 用 `allow`，不用 `ask` 或不受支持的 `bypass`。本机 OpenCode 策略为无任务拦截。
