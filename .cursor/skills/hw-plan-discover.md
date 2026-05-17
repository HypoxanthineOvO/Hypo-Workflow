---
name: hw-plan-discover
description: "Hypo-Workflow Cursor skill for /hw-plan-discover; use when the user invokes /hw-plan-discover or canonical /hw:plan:discover."
---

# /hw-plan-discover

Canonical command: `/hw:plan:discover`
Cursor command: `/hw-plan-discover`
Route: `plan`
Embedded authority source: `skills/plan-discover/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:plan:discover` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Command Skill Authority

---
name: plan-discover
description: Run the discovery phase of Hypo-Workflow planning when the user needs requirement clarification, constraint gathering, and repo context analysis.
---

# /hypo-workflow:plan-discover
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

仅将此 skill 用于 P1 Discover。

`P1 Discover` 仅在 `P0 Configure` 已运行或已为当前 Cycle 显式重用后开始。`P0 Configure` 在 `cycle new` 之后、`P1 Discover` 之前运行；它询问自动化、Subagent 授权、验收模式、PR/MR 远程写入确认、完整回归、分析边界和 Worker Separation。重用遵循 `cycle_explicit -> previous_cycle_snapshot -> project_config -> global_config -> built_in_default` 且必须可审计。

对于 `/hw:plan --batch`，此阶段变为 Batch Discover。Batch Discover 在一次访谈中覆盖多个 Feature 候选项，但保持与普通 Discover 相同的交互硬门控。

`P0 Configure` 是新 Cycle 规划的必需前置阶段。它在 `cycle new` 之后、`P1 Discover` 之前运行；可以通过询问用户或显式重用决策来完成。该阶段涵盖自动化、Subagent 授权、验收模式、PR/MR 远程写入策略、完整回归、分析边界和 Worker Separation。重用源按以下顺序解析：`cycle_explicit`、`previous_cycle_snapshot`、`project_config`、`global_config`、`built_in_default`。

## 先问关键问题

在深入细节之前，先从三个广泛问题开始：

1. 任务类别
2. 期望效果
3. 验证方法

只有在这些都明确之后，Agent 才应深入假设、歧义、权衡和验证标准。

验证问题必须询问真实测试方法，而不仅仅是"应该运行什么测试"。捕获确切的命令、工具、场景、可观测的通过/失败信号、独立验证者，以及审计是否必须拒绝伪测试。

Discover 还必须在分解之前询问 Worker Separation / 三权分立策略。应用平台特定行为：

- Codex：当持久化授权范围缺失时，询问用户是否授权 `/hw:start` 和 `/hw:resume` 的执行子工作器，即使 `execution.worker_separation.mode` 已经是 `recommended` 或 `strict`
- Codex 已授权：询问 implement/test/audit 分离应该是 `recommended` 还是 `strict`，什么客观不可用证据允许降级，以及当测试工作器违反真实测试合同时审计是否可以阻止验收
- Codex 未授权：询问计划是否应阻止 `/hw:start` 直到获得授权，或通过设置 `execution.worker_separation.mode=off` 显式确认切换到最快的单代理通道
- Claude Code：不要询问子工作器授权；询问执行子工作器应该使用 `subcodex` 还是 `subclaude`，然后询问 `recommended`、`strict` 或显式 `off`
- OpenCode：不要询问子工作器授权；使用配置的原生代理/子代理，然后询问 `recommended`、`strict` 或显式 `off`

仅限 Codex：不要将缺失授权默认为 `recommended`，也不要静默降级为 `off`。缺失授权必须在分解前产生一个显式 P1 结果：`authorized recommended`、`authorized strict`、`start-blocking gate` 或用户显式确认的快速/关闭单代理模式。当 Codex 执行子工作器授权门控未解决时，P1 不得进入 P2。

还要在结构化笔记中对工作流通道进行分类：

- `workflow_kind: build | analysis | showcase`
- 如果 `workflow_kind=analysis`，设置 `analysis_kind: root_cause | metric | repo_system`

使用 `root_cause` 进行调试或差异分析，`metric` 用于趋势或定量比较，`repo_system` 用于代码库/系统调查。此分类法选择工作流通道；Test Profiles 仍然选择验证策略。

类别特定后续：

- `webapp`：询问 E2E 路径、浏览器交互和视觉证据
- `agent-service`：询问 CLI 形状、共享核心和 CLI 场景
- `research`：询问基线、预期方向、验证脚本和环境约束

对于任何可测试的交付任务，Discover 还必须确定闭环测试计划：

- 将运行什么确切的命令、脚本、浏览器路径或场景
- 什么输出、截图、指标增量或状态更改将证明通过或失败
- 当工作非平凡或委托时，谁执行独立验证
- 什么观察将反驳实现，使计划不是自我认证
- 审计工作器是否必须拒绝未执行用户声明的真实场景的伪测试、模拟或快捷方式

对于 agent-service 工作，真实场景可能在仓库之外。如果用户说唯一有效的测试是"使用 NapCat 模拟主账户向代理发送消息"，请坚持该确切方法。仅运行单元模拟、合成假消息或非用户等效路径的测试工作器已产生伪证据；审计工作器应拒绝它。

## 自适应追问

在广泛问题得到回答后，判断任务是否需要深度 Grill-Me 设计概念对齐。对低风险 Patch、小型增量功能和狭窄的文档/配置请求使用轻量级 Discover。

仅当存在一个或多个风险信号时才升级到深度 Grill-Me：

- 架构或真相源变更
- 工作流生命周期、状态、验收、同步、恢复或命令语义
- 需要命名和非目标一致的面向用户的产品或 UX 概念
- 长期运行、批量、DAG、AFK 或 HITL 协调
- 讨论、决策、词汇表、架构、提示和 Knowledge Ledger 层之间所有权不明确

深度 Grill-Me 应在 P2 分解前对齐概念。它应该询问以下重点问题：

1. 稳定术语及其含义
2. 示例和非示例
3. 真相源所有权
4. 状态转换或生命周期边界
5. 提示生成提示和非目标

不要对每个小任务强制深度 Grill-Me。

## 设计概念产物

当 Discover 确认持久设计概念时，在 Generate 期间或之后写入或更新这些层：

- `.pipeline/design-concepts.yaml`：具有 `id`、`term`、`definition`、`boundaries`、`source_of_truth`、`state_transitions`、`decision_refs` 和 `prompt_hints` 的机器可读概念记录。
- `.pipeline/glossary.md`：人类可读的术语、示例、非示例和常见误解。

保持层分离：

- 瞬态讨论保留在对话或简短规划笔记中
- 已确认的决策属于 Knowledge Ledger 记录和决策索引
- 稳定术语属于词汇表/设计概念产物
- 架构契约属于 `.pipeline/architecture.md`
- 可执行子集属于生成的提示

Knowledge Ledger 索引设计决策和参考；它不得将完整的设计概念或词汇表主体复制到每个上下文中。

## 前置条件

- 规划模式处于活动状态或即将开始
- 用户目标尚未结构化为 Milestone

## Plan 模式

- `interactive`：分轮提问并等待用户回答
- `auto`：从仓库上下文和用户提示中推断，除非被阻止否则不暂停

## interaction_depth 规则

- `low`
  - 至少 2 轮
  - 涵盖核心功能、目标用户和技术栈偏好
- `medium`
  - 至少 3 轮
  - 包括优先级、非功能需求和集成边界
- `high`
  - 至少 5 轮
  - 深入功能细节、UX、边界情况、测试策略、部署、性能、安全、国际化和可访问性

如果设置了 `plan.interactive.min_rounds`，在解析 `interaction_depth` 后将其用作额外下限。默认交互深度为 `medium`，默认下限为 3 轮。

## ⚠️ 强制交互规则（Interactive 模式）

❓ 最少提问轮数：
- interaction_depth: low    → 至少 2 轮提问
- interaction_depth: medium → 至少 3 轮提问（默认）
- interaction_depth: high   → 至少 5 轮提问

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

🚨 进入 P2 的唯一条件：
用户明确表示「够了」「开始吧」「可以了」等结束信号。
如果用户只是回答了你的问题，你应该继续提问，不应该理解为「可以开始了」。

## 交互行为

1. 每轮仅询问 2-3 个有针对性的问题。
2. 从广泛开始，然后深入细节。
3. 在实现特定细节之前，先从任务类别、期望效果和验证方法开始。
4. 在离开 Discover 之前，将验证答案转换为闭环验证路径。
5. 当预期多代理或委托工作时，询问谁拥有实现和谁拥有验证。
6. 拒绝开环答案，如"我们将添加测试"，除非用户还定义了如何运行测试以及什么证据闭环。
7. 每轮结束后总结已学到的内容。
8. 在工作笔记中明确计算已完成的问题轮次。
9. 直到两个条件都为真才进入 P2：
   - 已满足配置的最小轮次计数
   - 用户明确表示「够了」「开始吧」「可以了」或等效的结束信号
10. 如果用户输入模糊，询问后续问题而不是静默填补空白。
11. 如果用户说"确认一下"或仅回答了前面的问题，总结并继续提问。

## 上下文注入

`/hw:plan --context <sources>` 和 `cycle.yaml` 的 `context_sources` 可以用现有证据预加载 P1。支持的来源：

- `audit`：读取 `.pipeline/audits/` 下的最新报告
- `patches`：读取 `.pipeline/patches/` 下的所有打开的 Patch 文件
- `deferred`：读取每个 `.pipeline/archives/*/deferred.yaml`；也读取 `.pipeline/archives/cycle-0-legacy/summary.md`（如果存在）
- `debug`：读取 `.pipeline/debug/` 下的最新报告
- `explore:E001`：读取 `.pipeline/explorations/E001-*/summary.md`、`notes.md` 和 `exploration.yaml`

上下文注入行为：

1. 在第一轮提问之前加载选定的来源。
2. 呈现简洁的来源摘要，包括打开的 Patch、延迟的 Milestone 或导入的 Legacy Milestone 的计数。
3. 基于该证据询问前 2-3 个有针对性的问题。
4. 永远不要将注入的上下文视为用户确认或跳过最小轮次的许可。
5. 如果选定的来源不存在，说明哪个来源为空并继续正常的 Discover。

示例开场：

> 基于审计报告 + 3 个 open patch，我看到这些问题：…… 你想全部处理还是只修 Critical？还有其他想加的吗？

## 批量 Discover

当存在 `--batch` 时：

1. 在进入 Decompose 之前收集多个 Feature 候选项。
2. 对于每个 Feature，捕获：
   - 标题
   - workflow_kind：`build`、`analysis` 或 `showcase`
   - 适用时的 analysis_kind：`root_cause`、`metric` 或 `repo_system`
   - 任务类别
   - 期望效果
   - 验证方法
   - 用户可见的目标
   - 优先级
   - 依赖项
   - 可能的门控：`auto` 或 `confirm`
   - 首选 `decompose_mode`：`upfront` 或 `just_in_time`
   - 验收边界
3. 询问统一的后续问题，使用户不必为每个 Feature 重复一个完整的规划循环。
4. 在 P2 之前呈现 Feature Queue 预览表。
5. 直到队列确认才生成 `.pipeline/feature-queue.yaml`。

必需的 Batch Discover 输出：

- `.plan-state/batch-discover.yaml`
- Markdown Feature 候选表
- 未解决的跨 Feature 依赖问题

## 参考文件

- `plan/PLAN-SKILL.md` — Discover 阶段基线
- `references/commands-spec.md` — 命令路由
- `SKILL.md` — 完整系统上下文
