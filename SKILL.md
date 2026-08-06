---
name: hypo-workflow
description: 用语义化 Cycle、Plan、Progress、Execution、Discussion、Experiment 和 Memory 帮助模型理解项目、执行工作、保存进度并恢复上下文。
---

# Hypo-Workflow

Hypo-Workflow 服务于项目工作。主模型负责理解、判断和执行；Workflow 负责留下人类可读记录，让用户随时知道当前计划、进度、历史和责任来源。

## 公共命令

| 命令 | 作用 |
| --- | --- |
| `/hw:guide` | [仅在用户不知道该用什么时推荐一条路径](skills/guide/SKILL.md) |
| `/hw:init` | [理解项目并初始化语义化工作区](skills/init/SKILL.md) |
| `/hw:goal` | [在 Cycle 内连续交付一个不含中间人工审阅点的结果](skills/goal/SKILL.md) |
| `/hw:plan` | [在 Cycle 内执行包含一个或多个人工审阅点的完整计划](skills/plan/SKILL.md) |
| `/hw:cycle` | [创建、列出、聚焦或关闭项目迭代](skills/cycle/SKILL.md) |
| `/hw:maintain` | [保存一条已确认的长期项目事实](skills/maintain/SKILL.md) |
| `/hw:experiment` | [创建、运行、追踪或审阅实验](skills/experiment/SKILL.md) |
| `/hw:resume` | [从当前 Cycle 的可读记录继续工作](skills/resume/SKILL.md) |
| `/hw:accept` | [接受当前人工审阅点或最终结果](skills/accept/SKILL.md) |
| `/hw:reject` | [拒绝当前结果并记录具体反馈](skills/reject/SKILL.md) |

只加载与当前命令对应的一个 Child Skill 文件。普通提问直接回答，不要求用户先选择命令。旧命令只返回只读说明和最接近的现有命令，不调用旧写入方式。

## 协商与授权

讨论、背景、想法、抱怨、问题和方案讨论默认不修改文件。先按“我的理解 → 问题原因 → 推荐方案”回答。

在选择 Goal 或 Plan 前，软件项目应展示需求综合、技术选择和架构关系；简单非技术任务按实际需要缩减。只有会改变 scope、安全、架构、远端副作用或验收标准的问题才需要询问。完整 Proposal 可见后，明确的“确认并开始”才授权执行；普通赞同只回答当时的问题。

## 语义文件

- 一个 Cycle 是一轮独立的项目迭代和归档边界。项目可以同时存在多个 active Cycle，一个 Session 只聚焦一个 Cycle。
- `PLAN.md` 用稳定的 `M1`、`S1` 等 ID 编码完整计划。
- `PROGRESS.md` 通过 `plan: PLAN.md` 指回计划，并完整列出所有计划项的当前状态。
- `EXECUTION.md` 追加有意义的 checkpoint，并引用对应计划 ID。
- `DISCUSSION-SUMMARY.md` 保存需求、决定、接受、拒绝、纠正和未决问题。
- 本地 Discussion Ledger 只追加用户与助手可见原文，默认不进入 Git；明显凭据使用 `[REDACTED]`。
- `SUMMARY.md` 在 Cycle 关闭时保存结果、验证、经验和后续候选。
- Experiment 与 Memory 使用普通 Markdown/YAML，通过语义路径和 `INDEX.md` 导航。

模型使用普通文件工具维护这些记录。可选校验或索引重建失败不能阻止清楚、无冲突的普通文件写入。

## 执行纪律

每个有意义的 checkpoint 后同步更新 Progress 与 Execution。创建 Plan 后长期不更新 Progress，属于 Workflow 失败。不要记录每次工具调用、文件读取或上下文压缩。

能力较强的主模型使用薄 Plan。只有委派 Worker 时，才按任务和能力生成详细 Handoff。不要从 Milestone 数量、文件数量或验收条目推导 Worker 数量。

并行源码修改使用隔离 worktree 和明确集成目标。GPU、端口、mutable cache 和输出目录冲突需要隔离或暂停；只读且 snapshot 兼容的工作可以共享。

## 恢复与 Hooks

恢复时读取项目索引、Session 聚焦的 Cycle、`PLAN.md`、`PROGRESS.md`、最近的 `EXECUTION.md`、`DISCUSSION-SUMMARY.md` 和必要的 Memory/Experiment。不要默认扫描全部历史。

Hooks 只用于捕获可见对话、提醒更新进度、压缩前检查可恢复性、Session 恢复提示和明确安全保护。Hooks 是优化，不是正确性来源；主模型在 Hooks 不可用时仍负责维护记录。

不要直接修改受保护的 `.pipeline/state.yaml`、`.pipeline/cycle.yaml` 或 `.pipeline/rules.yaml`。旧历史只读保留，除非用户审阅并接受明确的 History Refresh 预览。

## 完成报告

在聊天中说明结论、技术路线、修改模块、测试设计、验证结果、预期效果、遇到的问题和剩余风险。文件路径是证据，不替代解释。
