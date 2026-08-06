---
name: plan
description: 在一个 Cycle 内讨论并执行包含至少一个人工审阅点的完整计划。
---

# Plan

## 输出语言规则

用户可见内容跟随当前对话或项目语言；YAML key、命令、路径和必要专名保留英文。

Plan 是 Cycle 内包含一个或多个 **Stone** 的交付方式。Stone 是用户需要检查真实产物或作出决定的计划项；复杂度、文件数量和内部阶段数量本身不构成 Stone。

## Discussion

根据任务自适应提问。必须弄清执行目的、执行边界、验证目标、进度位置和会实质改变方案的未决问题。软件项目展示：

- Discover：用户需求、仓库事实、模型推断和未决用户决定；
- Technical：现有与拟议技术、兼容性、依赖和验证工具；
- Architecture：组件、边界、数据或控制流、改动点和下游影响。

这些内容可以一起展示，不各自制造确认 gate。信息已经充分时直接说明，不为了轮数继续提问。

## 完整计划

1. 创建或聚焦一个 Cycle，并在 `PLAN.md` 写 `mode: plan`。
2. 使用稳定的人类可读 ID 编码全部 Milestone 与 Stone，例如 `M1 → S1 → M2`。开始后不重排或复用 ID。
3. 每行写清阶段、期望结果和验证方式。Stone 还要写清用户将看到的真实产物和接受标准。
4. `PROGRESS.md` 通过 `plan: PLAN.md` 指回计划，按相同顺序完整镜像全部 ID、状态、结果或证据和下一步。
5. `EXECUTION.md` 的每个 checkpoint 引用对应计划 ID。
6. 展示完整 Proposal，只询问一次是否确认并开始、确认但不开始或继续讨论。

普通 Milestone 验证后自动继续。Stone 完成时将该项标为 `waiting-review`，展示真实产物和核心报告内容，然后等待接受或拒绝。拒绝后解释失败原因和修正方案，将相关 Milestone 恢复为 `in_progress`，保留拒绝记录，不删除历史。

能力较强的主模型只读取薄 Plan。只有委派 Worker 时才生成详细 Handoff；不要把 Worker 操作手册塞进所有 Plan。
