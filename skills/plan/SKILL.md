---
name: plan
description: Enter Hypo-Workflow planning mode when the user wants to design milestones before execution starts.
---

# /hypo-workflow:plan
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

将此 skill 用于完整的 P1-P4 规划流程。

普通的 `/hw:plan` 命令保持完整的 P1-P4 规划流程。如果用户传递 `--deep`，在普通分解之前路由到 `/hw:plan:deep`。`--deep` 别名启动 Deep Plan 讨论包，不得跳过 P1-P4；在 Deep Plan `convert` 之后，普通的 `/hw:plan` 仍然运行 P0 Configure、P1 Discover、P2 Decompose、P3 Generate 和 P4 Confirm。

在 P1 Discover 之前，为新 Cycle 运行或确认 `P0 Configure`，除非当前 Cycle 已经有配置决策。`P0 Configure` 在 `cycle new` 之后、`P1 Discover` 之前运行；它询问自动化、Subagent 授权、验收模式、PR/MR 远程写入确认、完整回归、分析边界和 Worker Separation。用户可以重用先前的设置，按 `cycle_explicit -> previous_cycle_snapshot -> project_config -> global_config -> built_in_default` 顺序解析，重用必须留下可审计的注释或 `.plan-state/p0-configure.yaml`。

没有 `--batch` 时，保留现有的单 Feature P1-P4 流程。普通的 `/hw:plan` 命令仍然运行一次 Discover 访谈、一次 Decompose 检查点、一次 Generate 阶段和一次 Confirm 门控。

默认情况下启用 Progressive Discover 作为 P1 的结构。首先从大问题开始：

1. 任务类别
2. 期望效果
3. 验证方法

在 P1 开始之前，运行或显式重用 Cycle 级别的 `P0 Configure` 前置阶段。`P0 Configure` 在 `cycle new` 之后、`P1 Discover` 之前运行；它询问自动化、Subagent 授权、验收模式、PR/MR 远程写入策略、完整回归、分析边界和 Worker Separation。重用必须按以下顺序记录其来源：`cycle_explicit`、`previous_cycle_snapshot`、`project_config`、`global_config`、`built_in_default`。

当项目尚未声明 `execution.worker_separation.mode` 时，Discover 还应询问项目是否需要 `off`、`recommended` 或 `strict` 的 implement/test/audit 分离，并在 Generate 期间持久化该决策。

如果为 Worker Separation 选择了降级模式，则需要用户明确确认，并且必须记录非委托理由、缺失角色、降级原因、验证所有者和下游验收影响。

P1 Discover 在分解之前有一个强制的执行子工作器授权门控。即使项目已声明 `execution.worker_separation.mode=recommended` 或 `strict`，也要应用它。

- Codex：如果没有持久化的授权其范围显式包含 `/hw:start` 和 `/hw:resume` 或 execution/start-resume 角色，询问用户是否授权 `/hw:start` 和 `/hw:resume` 的执行子工作器；如果授权，选择 `recommended` 或 `strict`
- Codex：如果用户拒绝执行子工作器，要么阻止 start/resume 直到获得授权，要么显式确认最快的单代理通道，持久化为 `execution.worker_separation.mode=off`
- Claude Code：配置的子工作器不需要额外的授权门控；询问执行子工作器应该使用 `subcodex` 还是 `subclaude`，然后选择 `recommended` 或 `strict`
- OpenCode：配置的原生代理/子代理不需要额外的授权门控；选择 `recommended` 或 `strict`，或显式 `off`

该模式仍然管理 implement/test/audit 分离：`recommended` 在可能时分离 implement 和 test，而 `strict` 要求 implement/test/audit 是不同的。

仅限 Codex：不要将缺失授权视为 `recommended`，也不要静默降级为 `off`。`recommended` 和 `strict` 要求要么显式执行子工作器授权，要么显式阻止门控防止 `/hw:start` 和 `/hw:resume` 直到获得授权；`off` 要求用户显式确认快速单代理降级。此 Codex 授权门控不适用于 Claude Code 或 OpenCode。

计划时的 Subagent、审查者、挑战者和验证者与执行工作器具有相同的生命周期契约：

- 主代理只能在授权、角色、范围和预期证据明确后才能打开它们
- 每个工作器必须记录为 `requested`、`started`、`completed|failed|blocked` 和 `closed|close_failed`
- 主代理必须等待角色证据才能使用它通过检查点，然后在不再需要时关闭/释放工作器
- 计划审查者/挑战者工作器不得成为后续执行 `test`、`implement` 或 `audit` 工作器，除非新的授权和范围显式分配该角色
- 如果生命周期关闭缺失或失败，P4 Confirm 必须将其作为阻止或降级证据项呈现，而不是将工作器视为干净完成

P1 在 Codex 授权门控有一个显式结果之前不得进入 P2：

- authorized `recommended`
- authorized `strict`
- not authorized 且 start/resume 必须被阻止直到获得授权
- not authorized 且显式降级为最快的单代理 `off`

如果用户已完成正常的需求访谈但此授权决策仍然缺失，请留在 P1 并接下来仅询问此门控问题。在门控解决之前不要生成 Milestone、提示或架构产物。

验证答案必须被捕获为真实测试方法契约：确切命令或场景、可观测的通过/失败信号、独立验证者，以及审计是否必须拒绝伪测试。例如：对于 Heaticy 风格的 agent-service 项目，真实方法可能是"使用 NapCat 模拟主账户向代理发送消息"；如果测试工作器仅运行单元模拟或假消息路径，审计工作器必须拒绝它。

然后根据需要继续假设陈述、歧义解决、权衡审查和验证标准。保持此结构强大，但不要将其变成僵化的问卷。

Test Profiles 位于 preset 之上。保持 `preset` 用于步骤顺序，但通过 `execution.test_profiles` 或推断的 Discover 上下文收集特定类别的验证策略。

对于可测试的交付，计划必须在分解之前设计闭环验证路径和独立验证所有权。不要接受仅描述代码编写或"稍后运行某些东西"行为的开环计划。

当 `execution.worker_separation.mode` 为 `recommended` 或 `strict`，或功能非平凡到需要独立实现和验证时，P3 Generate 必须始终在生成的提示中分配子工作器任务。此分配是提示契约，而不是可选的运行时即兴创作：

- 在每个生成的实现提示中包含 `Subworker Assignment Plan` 部分
- 预先分配恰好三个工作器角色：`test`、`implement` 和 `audit`，每个角色的范围、禁止重叠、预期证据和交接产物路径
- 将 `test` 绑定到 P1 中收集的真实测试方法契约，包括命令/场景、通过/失败信号和伪测试拒绝规则
- 声明 `test` 拥有红色测试/复现/测试夹具/断言/快照编辑，`implement` 不得创建、编辑或重写这些测试资产
- 声明 `implement` 不得生成、模拟或满足 `test` 或 `audit`；只有主代理编排工作器创建和生命周期
- 要求 `audit` 工作器检查最终差异、测试证据、工作器身份分离和验收风险；`review_code` 是审查步骤/产物阶段，而不是工作器角色
- 声明主代理编排和集成但不得同时满足实现和验证角色
- 包含工作器生命周期证据要求：在完成可以声称 Worker Separation 证据之前，每个角色的 requested、started、completed/failed/blocked 和 closed/close_failed
- 在 Codex 上，如果执行子工作器尚未授权，仍然生成 `Subworker Assignment Plan`，但标记为 `blocked_until_authorized` 并编写启动/恢复门控；`hw:start` 必须在角色敏感工作之前询问授权而不是删除子工作器分配
- 在 Claude Code 和 OpenCode 上，根据配置的原生子工作器/代理生成分配，无需额外的授权门控

仅当用户希望在一次对话中规划多个 Feature 并创建 Feature Queue 时，才使用 `/hw:plan --batch`。

Feature DAG 概念仅属于长期运行、批量、多 Feature、AFK 或 HITL 协调。普通的单 Feature `/hw:plan` 必须保持简单，不应要求或显示 Feature DAG 字段。

使用 `/hw:plan --insert <自然语言>` 编辑现有 Feature Queue。首先将自然语言请求转换为结构化队列操作，显示队列差异，然后在写入 `.pipeline/feature-queue.yaml` 之前等待显式确认。

## 前置条件

- 规划应在正常执行开始之前进行
- 如果 `.pipeline/` 已存在，则将规划视为修订或附加，不一定是全新项目

## Plan 模式

- `plan.mode=interactive`（默认）
  - 用户在每个检查点参与
  - P1 Discover 询问有针对性的问题，直到用户表示需求访谈足够
  - P4 Confirm 必须等待用户明确确认
  - 读取 `plan.interaction_depth` 并将其转换为最小问题轮次：
    - `low` -> 2 轮
    - `medium` -> 3 轮
    - `high` -> 5 轮
  - 如果存在 `plan.interactive.min_rounds`，将其用作额外下限
  - 如果 `plan.interactive.require_explicit_confirm` 缺失，将其视为 `true`
- `plan.mode=auto`
  - Claude 在不暂停等待用户回答的情况下完成 P1-P4，除非被缺失的关键信息阻止
  - 仅当 `automation.gates.planning=auto` 时，P4 Confirm 才变为仅摘要通过；默认的 `confirm` 门控即使在自动计划模式下仍然是硬停止

## 批量 Plan 模式

`/hw:plan --batch` 将规划目标从一个 Feature 更改为 Feature Queue。

批量行为：

1. 对所有请求的 Feature 运行一次 Batch Discover。
2. 询问一轮统一的讨论轮次，然后总结所有 Feature 候选项。
3. 在用户确认队列后生成 `.pipeline/feature-queue.yaml`。
4. 从项目配置 > 全局配置 > 默认 `upfront` 读取 `batch.decompose_mode`。
5. 如果 `batch.decompose_mode=upfront`，立即将每个 Feature 分解为初始 Milestone。
6. 如果 `batch.decompose_mode=just_in_time`，首先创建队列条目，并延迟 Milestone 分解直到每个 Feature 成为当前。
7. 为队列顺序、依赖项和架构影响生成 Feature 级别的 Markdown 表格和 Mermaid 图。
8. 除非 `plan.mode=auto` 且配置允许无人值守规划，否则保持 P1 交互硬门控。
9. 当存在依赖项时，包含 Feature DAG 字段，如 `depends_on`、`blocked_by`、`execution_hint`、`handoff_hint` 和 ready/blocked 状态。不要创建 Milestone 级别的 DAG 调度。

批量产物：

- `.pipeline/feature-queue.yaml`
- `.pipeline/metrics.yaml` 缺失时浅初始化
- `.plan-state/batch-discover.yaml`
- `.plan-state/batch-decompose.yaml`
- `.plan-state/batch-architecture.md`

## 队列插入模式

`/hw:plan --insert` 是队列编辑界面，而不是新的规划周期。

支持的自然语言意图：

- 将 Feature 附加到队列
- 在另一个排队的 Feature 之前或之后插入 Feature
- 重新优先级或移动排队的 Feature
- 通过设置 `gate: confirm` 暂停 Feature
- 更新排队 Feature 的标题、摘要或 `decompose_mode`

安全规则：

- 首先生成结构化队列操作和前后差异
- 在用户确认差异之前不要修改 `.pipeline/feature-queue.yaml`
- 除非用户显式要求修复手术，否则不要重新排序活动、完成、阻止或延迟的 Feature
- 在 `.pipeline/log.yaml` 中记录应用的操作

## 强制交互规则（Interactive 模式）

交互式规划是硬对话门控，而不是建议。

❓ 最少提问轮数：
- `interaction_depth: low` -> 至少 2 轮提问
- `interaction_depth: medium` -> 至少 3 轮提问（默认）
- `interaction_depth: high` -> 至少 5 轮提问

❌ 绝对禁止：
1. 用户只说了一句话就直接开始拆 Milestone
2. 自己填补用户没说过的需求细节
3. 在用户没说「够了」「开始吧」「可以了」之前进入 P2
4. 一次性列出 10 个问题然后自己回答
5. 把「确认一下」当作「够了」的信号

✅ 必须做到：
1. 每轮问 2-3 个有针对性的问题，等用户回答
2. 根据用户回答追问细节，不要假设
3. 每轮结束时总结已收集的信息，让用户确认
4. 主动发现用户没想到的维度并提出
5. 像资深 PM 做需求访谈，循序渐进

🚨 P1 -> P2 的唯一过渡条件：
用户明确表示「够了」「开始吧」「可以了」等结束信号。用户只是回答问题、补充信息、或说「确认一下」时，继续 P1 追问，不得进入 P2。

Codex 执行子工作器授权也是 P1 -> P2 门控的一部分。如果当前平台是 Codex 且 `/hw:start` + `/hw:resume` 执行子工作器授权未被显式授权、显式阻止或显式降级为最快的单代理 `off`，即使用户说"可以了"，P1 也未完成。在 P2 之前询问授权门控。

当存在 `--context` 时，注入的上下文可以锐化第一个问题，但不得跳过所需的交互轮次。

## Plan 工具纪律

除非在 `.pipeline/rules.yaml` 中禁用，否则 `plan-tool-required` 内置规则对 Plan Mode 处于活动状态。

- OpenCode：使用原生 `todowrite` 作为可见的规划状态，使用原生 `question` / Ask 处理每个交互硬门控。
- Codex：当存在时使用可用的 plan/update 工具；否则在对话中保持可见的检查列表。
- Claude Code：在对话或配置的规划界面中维护显式的计划/检查点列表。
- 每个 P1/P2/P3/P4 检查点必须在继续之前同步计划状态。

## 执行流程

1. 读取 `~/.hypo-workflow/config.yaml`（如果存在）。
2. 当存在时从 `.pipeline/config.yaml` 读取 `plan.mode` 和 `plan.interaction_depth`。
3. 当存在时解析 `--context <sources>`。拆分逗号分隔的值，仅允许 `audit`、`patches`、`deferred`、`debug` 和 `explore:E001` 风格的探索上下文引用。
4. 当存在时解析 `--batch` 和 `--insert`。没有 `--batch` 或 `--insert` 时，保留现有的单 Feature P1-P4 流程。
5. 如果存在 `--insert`，读取 `.pipeline/feature-queue.yaml`，将用户请求转换为结构化队列操作，显示队列差异，等待确认，然后应用并记录队列编辑。
6. 如果没有给出 `--context` 标志，读取 `cycle.yaml` 并在存在时使用 `cycle.context_sources`。
7. 将计划模式解析为项目 `plan.mode` > 全局 `plan.default_mode` > `interactive`。
8. 在交互模式下，从 `plan.interaction_depth` 解析最小轮次，然后应用 `plan.interactive.min_rounds` 作为下限。
9. 运行 P1 Discover：
   - 收集目标、约束、技术栈、用户和架构期望
   - 从询问任务类别、期望效果和验证方法开始
   - 当平台是 Codex 时，检查持久化的执行子工作器授权范围是否显式包含 `/hw:start` 和 `/hw:resume` 或 execution/start-resume 角色
   - 当平台是 Codex 且该授权缺失时，在 P2 之前询问硬门控：`authorized recommended`、`authorized strict`、`not authorized block start/resume` 或 `not authorized explicit fastest single-agent off`
   - 当平台是 Codex 且门控未解决时，不进入 P2，不生成 Milestone，不生成提示
   - 当平台是 Claude Code 时，询问执行子工作器应该使用 `subcodex` 还是 `subclaude`；不需要单独的授权门控
   - 当平台是 OpenCode 时，使用配置的原生代理/子代理，不需要单独的授权门控
   - 将验证转换为闭环真实测试契约：确切命令或场景、可观测的通过/失败信号、独立验证者所有权和伪测试拒绝策略
   - 在大问题之后，根据需要驱动假设陈述、歧义解决、权衡审查和验证标准
   - 如果解析了上下文源，首先加载它们，向用户呈现注入的发现，然后开始交互式提问
   - 当存在 `--batch` 时，在离开 Discover 之前收集多个 Feature 候选项、优先级、门控、依赖项、验收边界、类别和验证要求
10. 运行 P2 Decompose：
    - 将工作拆分为具有验证点的可审查 Milestone
    - 拒绝只有开环实现操作和没有可信闭环验证路径的 Milestone 拆分
    - 在交互模式下，在显示提议的拆分后停止，等待用户确认后再进行 P3
    - 当 `--batch` 且 `batch.decompose_mode=upfront` 时，分解所有 Feature；当 `just_in_time` 时，仅创建 Feature 脚手架
11. 运行 P3 Generate：
    - 生成 `.pipeline/` 产物和架构基线
    - 在生成的提示中保留闭环验证命令、真实测试方法、证据期望、验证者分离和审计伪测试拒绝规则
    - 在实现步骤之前在每个提示内生成 `Subworker Assignment Plan`，至少分配：
      - `test`：拥有 `write_tests` 和 `review_tests`；独立验证计划的真实测试方法、失败证据、最终测试运行和伪测试拒绝规则
      - `implement`：拥有 Milestone 范围内的实现编辑
      - `audit`：审查最终差异、证据质量、工作器身份分离和验收风险
    - 定义每个子工作器角色的输入上下文、输出产物、允许的文件或范围以及显式不重叠规则
    - 使主代理负责编排、集成、生命周期写入和最终决策，但在独立的 `test` 和 `implement` 工作器被授权或分配之前绝不本地编写测试或实现，并且绝不自身满足三个工作器角色中的任何一个
    - 持久化执行子工作器授权决策：
      - Codex 已授权：记录 `/hw:start` 和 `/hw:resume` 的范围、角色和 Worker Separation 模式
      - Codex 未授权 + 显式确认最快通道：设置 `execution.worker_separation.mode=off` 并记录用户的显式降级确认加上单代理理由
      - Codex 未授权 + 需要分离：保留生成的 `Subworker Assignment Plan`，标记为 `blocked_until_authorized`，并编写启动阻止授权门控，以便 `/hw:start` 和 `/hw:resume` 在角色敏感工作之前询问或停止
      - Claude Code：记录选定的执行子工作器后端为 `subcodex` 或 `subclaude`
      - OpenCode：记录配置的原生代理/子代理执行路径
    - 当 `--batch` 时，生成 Feature Queue、Markdown 表格、Mermaid 图和批量架构笔记
12. 运行 P4 Confirm：
    - 交互模式等待用户确认
    - 自动模式总结并继续
13. 在每个阶段期间设置 `current.phase` 为匹配的规划阶段。

## 交互检查点

- Discover、Decompose、Generate 和 Confirm 都可以呈现后续问题
- 在交互模式下，钩子行为应允许在规划检查点期间结束回合
- 在交互模式下，P2 可能不会开始，直到用户已满足配置的最小轮次并显式结束发现
- 在交互模式下，P3 可能不会开始，直到用户确认 P2 Milestone 拆分
- 在交互模式下，P4 是硬门控，必须等待显式确认
- 在自动模式下，规划应无人值守继续

## 参考文件

- `plan/PLAN-SKILL.md` — 详细的 P1-P4 规划系统
- `references/commands-spec.md` — 命令路由语义
- `references/config-spec.md` — 计划模式回退规则
- `SKILL.md` — 整体管道上下文

## Analysis Planning Notes

当请求是调查性的、根因导向的、指标导向的或仓库/系统分析时，使用 `workflow_kind: analysis` 对其进行分类，并选择 `analysis_kind: root_cause | metric | repo_system`。

分析规划应将一个 Milestone 视为一个调查问题。Milestone 可能包含多个假设和实验，被反驳的假设是进展而不是失败。
