---
name: hypo-workflow-resume
description: 从项目索引、当前 Cycle、完整 Progress、最近 Execution 和 Discussion Summary 恢复工作。
---

# Resume

## 输出语言规则

用户可见内容跟随当前对话或项目语言；YAML key、命令、路径和必要专名保留英文。

1. 读取项目与 Cycle 索引，确定当前 Session 聚焦的 Cycle。
2. 如果有多个可继续 Cycle 而 Session 未聚焦，展示名称、目的、状态、当前位置和下一步，让用户选择一个；不要静默选择最近项。
3. 如果选中的是 Experiment，转入 `/hw:experiment` 并读取该实验文件。
4. 读取当前 Cycle 的 `PLAN.md`、`PROGRESS.md`、最近 `EXECUTION.md`、`DISCUSSION-SUMMARY.md`，以及下一步真正需要的 Memory 或 Experiment。
5. 检查 Plan 与 Progress 的全部 ID 是否一致，`current` 是否存在，最近 Execution 是否支持当前状态。
6. 在聊天中说明：正在恢复哪个 Cycle、完整计划进度、上次完成内容、当前阻塞和下一步。
7. 从 `next` 对应的计划项继续，不重放已完成动作。

`waiting-review` 是真实停止点：展示对应 Stone 的产物、审阅范围、接受标准和核心报告。普通已验证 Milestone 自动继续。

旧格式工作区可以读取最小必要的恢复信息，但不得写回旧 `state.yaml`、`cycle.yaml`、`log.yaml` 或覆盖旧历史。缺少本地 Discussion 原文时使用 Git 中的 Discussion Summary，并明确说明证据范围。

如果恢复的 Cycle 拥有隔离 worktree 或资源，继续使用原有工作位置和集成目标；不能确认时先停止源码写入并解释冲突。
