# 语义化 Workflow 合同

Hypo-Workflow 帮助有能力的模型理解用户意图、保存有用记录、展示进度、恢复上下文，并保留边界清楚的项目历史。Workflow 服务于工作，而不是让工作服务于 Workflow。

## 产品语义

- **Guide** 只在用户不知道该使用哪条路径时出现。
- **Init** 负责理解项目并创建语义化工作区。
- **Plan** 负责弄清用户想要什么，并记录明确的执行目的、执行边界、验证目标、进度位置和未决问题。提问方式应适应软件、研究、实验、写作或运维任务。
- **Cycle** 是一轮有明确边界的项目迭代和归档单位。一个项目可以同时存在多个 active Cycle，但一个 Session 只专注一个 Cycle。
- **Experiment** 是可以跨 Cycle 延续的人类可读实验记录。
- **Maintain** 在项目、Cycle 或 Experiment 范围内记录已确认的长期事实；它不是独立工作轨道。
- **Resume** 读取语义索引、当前 Cycle、当前进度、最近执行记录和讨论摘要。
- **Accept** 与 **Reject** 保存用户判断，不重复询问同一个决定。

## 记录方式

模型通过普通文件操作编写带有简短 YAML frontmatter 的 Markdown。路径和名称本身应具有语义，不需要日常的模型可见写入 API。

标准记录包括：

| 记录 | 用途 |
| --- | --- |
| `PLAN.md` | 执行目的、边界、验证、进度位置和未决问题 |
| `PROGRESS.md` | 当前状态、已完成工作、阻塞、验证和下一步 |
| `EXECUTION.md` | 追加式记录有意义的执行 checkpoint |
| `DISCUSSION-SUMMARY.md` | 已确认需求、决定、争议、授权和纠正 |
| `SUMMARY.md` | 已关闭 Cycle 的结果、证据、经验和后续候选 |
| Memory 文件 | 项目、Cycle 或 Experiment 的长期事实 |
| Experiment 文件 | 目的、方案、数据、Attempts、指标、结果和解释 |

用户和助手的可见消息保存在本地、只追加的讨论文件中，默认不进入 Git。不要记录 system/developer prompt、隐藏推理和原始工具输出。Git 中的讨论摘要引用相关本地条目，但普通上下文不会加载完整原文。

## 进度纪律

`PLAN.md` 必须用一张完整计划表编码本 Cycle 的所有阶段和人工审阅点。每一行拥有稳定、可读的 ID，例如 `M1` 或 `S1`；开始执行后不要重新编号。Plan 通过 `progress: PROGRESS.md` 指向进度，Progress 通过 `plan: PLAN.md` 反向指回计划。

`PROGRESS.md` 必须完整列出 Plan 的每个 ID，而不是只写当前任务。每行记录当前状态、结果或证据和下一步。允许的基础状态是 `pending`、`in_progress`、`waiting-review`、`completed`、`blocked` 和 `cancelled`。`EXECUTION.md` 的 checkpoint 必须引用导致状态变化的计划 ID。

创建 Plan 后不持续更新完整 Progress 表，属于 Workflow 失败。每个有意义的 checkpoint 之后，模型应更新 `PROGRESS.md`，并向 `EXECUTION.md` 追加一条记录。有意义的 checkpoint 包括：

- Plan 或 scope 发生变化；
- 一个工作阶段开始或完成；
- 实现、研究或实验得出经过验证的结果；
- 出现新阻塞或阻塞被解决；
- 用户作出决定、接受、拒绝或纠正；
- Worker Handoff 完成；
- Session 恢复后重新确定下一步。

不要记录每次工具调用、文件读取、Hook 边界或上下文压缩。证据必须带有人类可读的说明；孤立的 UUID、hash 或数字没有意义。

## Cycle 与归档纪律

每个 Cycle 从创建到关闭始终使用稳定的语义目录。关闭 Cycle 时冻结其 Plan、Progress、Execution、讨论摘要、证据、产物和最终 Summary。归档只改变生命周期状态，不移动文件，也不破坏引用。

Session 聚焦保存在本地 `.pipeline/local/sessions/<host>/<session>.yaml`，内容只需 `cycle` 和 `updated`。该文件默认不进入 Git。存在多个 active Cycle 且没有聚焦文件时，不得猜测目标 Cycle，也不得追加 Discussion 或修改 Workflow 记录。

新 Cycle 拥有全新的目的和任务列表。它可以显式声明 `builds_on` 关系，并选择性继承决定、产物、风险、经验或后续候选。上一 Cycle 的任务绝不自动带入。

普通上下文只加载已关闭 Cycle 的 `SUMMARY.md` 和被提升的长期事实。只有需要追溯时才读取完整历史。

## 主模型与 Worker 的详细程度

有能力的主模型只需要薄 Plan：目的、边界、验证、进度位置和重要未决问题。委派给能力较弱的 Worker 时，主模型再生成任务专用 Handoff，补充该 Worker 所需的上下文、输入、输出、约束、必要步骤和验证方式。详细 Worker 指令不属于每一份 Plan。

## 可选辅助能力

Core 可以校验 YAML、重建语义化 `INDEX.md`、检测并行编辑冲突，并执行一次性 History Refresh。这些辅助能力不接管日常内容写入。内部 hash 或 transaction metadata 即使保留，也不能出现在普通命令提示和人类导航中。

History Refresh 只读分析旧 `.pipeline`，提出语义映射，展示不确定归类和覆盖情况；经用户确认后旁路写入新结构，验证完成后再切换，同时保持旧历史不变。
