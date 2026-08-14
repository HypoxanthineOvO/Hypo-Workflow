---
name: cycle
description: 创建、列出、聚焦或关闭一轮有明确边界的项目迭代，并支持多个并行 active Cycle。
---

# Cycle

## 输出语言规则

用户可见内容跟随当前对话或项目语言；YAML key、命令、路径和必要专名保留英文。

Cycle 是项目迭代和归档边界，不是 Goal 或 Plan 的竞争选项。Goal 与 Plan 都在 Cycle 内交付。

- **创建：** 使用新的语义名称和目录，写清本轮目的、边界和验证目标。新 Cycle 拥有全新任务列表。
- **继承：** 通过 `builds_on` 显式引用历史 Cycle，只选择性继承决定、产物、风险、经验或后续候选。绝不自动继承旧任务。
- **列出：** 从项目索引展示 active/closed Cycle 的名称、目的、状态、当前位置和下一步。
- **聚焦：** 一个 Session 只聚焦一个 Cycle。将 `cycle` 和 `updated` 写入本地 `.pipeline/local/sessions/<host>/<session>.yaml`。切换前确认当前 Cycle 的 Progress、Execution 和 Discussion Summary 已更新。
- **并行：** 多个 active Cycle 可以同时存在。源码修改需要隔离 worktree 和明确集成目标；资源冲突需要隔离或暂停。
- **关闭：** 验证完成后，先整理 Memory：本轮新记忆可读命名、`level` 已标、`memory/INDEX.md` 已更新、无哈希残留。然后写 `SUMMARY.md`，保存目的、边界、结果、证据、重要决定、经验和后续候选。将状态改为 `closed`，但不移动目录或破坏引用。

如果用户要求关闭但结果未验证，清楚说明缺口；不要把“停止继续做”伪装成成功。放弃的 Cycle 也应保留可读原因和已有证据。

旧格式 Cycle 只读保留。未经审阅的 History Refresh 不得修改或删除旧历史。
