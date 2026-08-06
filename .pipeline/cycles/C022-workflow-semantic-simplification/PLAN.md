---
kind: plan
cycle: C022-workflow-semantic-simplification
status: closed
updated: 2026-08-06
progress: PROGRESS.md
execution: EXECUTION.md
---

# Workflow 语义简化

## 执行目的

用语义化对话、人类可读模板、可见进度、有边界的 Cycle 归档和安全的一次性 History Refresh，替代协议负担过重的 Workflow 提示词与记录。

## 执行边界

本 Cycle 修改源端 Workflow Skills、模板、Hooks、Core 辅助能力、文档、测试和迁移支持。旧历史保持只读。本轮不执行远端 release、不写目标仓库，也不自动激活历史迁移。

## 验证目标

有能力的模型无需日常写 API 或模型可见的完整性机制，就能完成规划、执行、进度记录、恢复、并行 Cycle、Experiment、Memory 和讨论追溯。当前旧历史能在激活前生成幂等、可审阅的迁移预览。

## 完整计划

| ID | 阶段 | 期望结果 | 验证方式 |
| --- | --- | --- | --- |
| `M1` | 定义语义合同、模板和真实样例 | 语义记录方式足够自然、完整且可执行 | Focused test 与真实目录人工阅读 |
| `S1` | 审阅语义模型 | 用户确认合同、模板和样例可作为真实实现基础 | 明确接受或带反馈拒绝 |
| `M2` | 简化命令提示词和 Hooks | Router、Skills 与 Hooks 只表达产品语义和必要边界 | Prompt audit 与行为回放 |
| `M3` | 实现语义化普通文件工作方式 | Cycle、Progress、Discussion、Experiment、Maintain 与 Resume 可直接工作 | 生命周期和恢复场景测试 |
| `M4` | 生成 History Refresh 预览 | 当前旧历史得到可审阅、幂等、旁路的新结构 | 覆盖、冲突、幂等与零旧文件修改检查 |
| `S2` | 审阅真实迁移预览 | 用户决定是否激活新结构 | 明确接受或带反馈拒绝 |
| `M5` | 激活、兼容与完整验证 | 经 S2 后激活语义索引，Manifest 与 Legacy 原位保留 | 全量测试、源快照与幂等检查 |

ID 在本 Cycle 内保持稳定。拒绝会让对应 Milestone 返回修订，但不会删除 Stone 或重新编号。
