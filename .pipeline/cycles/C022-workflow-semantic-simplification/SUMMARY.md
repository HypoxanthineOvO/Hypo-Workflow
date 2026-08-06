---
kind: cycle-summary
cycle: C022-workflow-semantic-simplification
status: closed
started: 2026-08-05
finished: 2026-08-06
builds_on:
  - C21
successors: []
---

# Workflow 语义简化总结

## 目的与边界

将协议负担较重的 Workflow 提示词和记录方式简化为中文优先、语义清楚、可直接维护的 Cycle、Plan、Progress、Execution、Discussion、Experiment 和 Memory 文件。本 Cycle 同时提供一次性 History Refresh，但不删除旧历史，也不自动处理旧 live Delivery。

## 最终结果

- Root Router、10 个 Child Skills、Claude/OpenCode 命令和 Codex Hooks 已改为薄语义接口。
- Codex 只注册 SessionStart、UserPromptSubmit、PreToolUse、PermissionRequest、PreCompact 和 Stop 六类 Hooks。
- Plan/Progress 完整计划 ID 校验、语义 Resume、Session 聚焦和本地 Discussion Ledger 已可用。
- 20 个历史 Cycle 已正式映射到 `.pipeline/cycles/`；旧 archives、Knowledge、Chats、Manifest 和 7 个 live Delivery 原位保留。
- `.pipeline/INDEX.md` 成为语义入口；重复激活返回 `unchanged`。

## 验证结果

- Hypo-Workflow maintained 回归：704/704 通过。
- History Refresh 场景：7/7 通过。
- 20/20 历史 Cycle 的 Plan/Progress ID 对齐。
- VSP-Codex 跨仓库契约：Host Contract 7/7、semantic/legacy routing 7/7、TUI command routing 11/11。
- archives 与 Manifest 的写前写后 SHA-256 保持不变。

## 重要决定与经验

- 用户可见内容以中文为主，只保留 YAML key、命令、路径和必要专名。
- Cycle 是迭代与归档边界；Goal 和 Plan 是 Cycle 内的交付方式。
- Progress 必须反向引用 Plan，并镜像全部稳定计划 ID。
- VSP-Codex 只提供 Host UX，Workflow 语义和写入继续由安装插件拥有。
- Host Contract v1 仅保留 legacy compatibility；语义 workspace 不依赖旧投影恢复。
- History Refresh 只建立摘要和索引层，低置信旧资料继续引用原始 Legacy 文件。

## 后续候选

- 发布 `15.0.0-alpha.1`，在本机和 Nod 服务器安装并完成 dogfood。
- 在真实使用中观察六 Hook 的提示密度、Discussion Ledger 质量和多 Cycle Session 聚焦体验。
- 分别处理仍为 non-terminal 的旧 live Delivery，不在本 Cycle 中自动接受或转换。
