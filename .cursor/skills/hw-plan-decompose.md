---
name: hw-plan-decompose
description: "Hypo-Workflow Cursor skill for /hw-plan-decompose; use when the user invokes /hw-plan-decompose or canonical /hw:plan:decompose."
---

# /hw-plan-decompose

Canonical command: `/hw:plan:decompose`
Cursor command: `/hw-plan-decompose`
Route: `plan`
Embedded authority source: `skills/plan-decompose/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:plan:decompose` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Command Skill Authority

---
name: plan-decompose
description: Split discovered work into milestones when the user wants Hypo-Workflow to produce a serial, reviewable delivery plan.
---

# /hypo-workflow:plan-decompose
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

仅在 P2 Decompose 阶段使用此 skill。

对于 `/hw:plan --batch`，此阶段根据 `batch.decompose_mode` 拆解 Feature Queue 条目。

## 前置条件

- P1 Discover 已充分澄清项目，足以定义 Milestone

## 执行流程

1. 读取当前设计摘要和仓库上下文。
2. 将工作拆分为串行 Milestone。
3. 每个 Milestone 必须包含：
   - 目标
   - 实现范围
   - 测试规格
   - 预期产物
4. 每个实现 Milestone 必须包含技术路线字段：
   - `technical_solution`：架构选择、数据/接口/状态契约、关键实现策略
   - `technical_route`：有序实现路线，说明触达模块、边界、兼容/迁移处理和非目标
   - `research_required`：调研项状态、证据、阻塞问题或用户明确延后项
   - `risks_and_alternatives`：主要风险、替代方案和取舍理由
   - `validation_path`：闭环验证命令或可执行场景、通过/失败信号和验证负责人
   - `audit_focus`：审计工作器需要重点检查的行为、证据和风险
5. 每个实现 Milestone 必须定义闭环验证路径：
   - 精确的验证命令或可执行场景
   - 可观察的通过/失败证据
   - 当工作非平凡或已委托时，指定独立的验证负责人
6. 对于实现工作，优先使用可运行的垂直切片：一个仅跨越运行和验证所需层的窄行为。
7. 当数据库/API/UI/仅 schema 的 Milestone 不产生可运行行为或可信验证时，标记为水平拆分或开环拆分。
8. 当架构可能在后续 prompt 中变动时，优先使用窄 Milestone。
9. 保留 append 模式安全性：
   - 不要静默重新编号已执行的 prompt
   - 将新 prompt 追加到最高安全序号之后

## 技术路线与调研门禁

P2 不得以 goal-only checkpoint 进入 `proposed`。如果计划只列出目标、验收标准、功能队列、待办项或测试标题，而没有每个实现 Milestone 的技术方案、技术路线、调研状态、风险替代、验证路径和审计焦点，则 P2 必须保持 `in_progress` 或 `revision`。

以下情况必须创建硬性的 `research_required` 项：

- 未知工具或本地未确认的 CLI/API
- 外部服务、远程资源或需要账号/权限的集成
- 第三方库、框架、插件或版本相关能力
- 平台能力、Agent 平台差异或运行时权限边界
- 用户私有 schema、业务规则、专有数据格式或非公开接口

每个 `research_required` 项必须在 P2 确认/P3 之前处于以下状态之一：

- `resolved`：有本地代码、官方文档、用户说明或可运行探针作为证据
- `blocking_question`：已转成用户可回答的问题；P2 可展示为待答复检查点，但不得被确认或进入 P3，直到用户回答或明确接受延后
- `deferred_by_user`：用户明确接受延后，并说明延后到哪个 Milestone 或风险门控

如果用户挑战技术路线、指出调研不足或要求比较替代方案，立即把 P2 状态视为 `revision` 或 `in_progress`，记录被挑战的字段和原因，执行目标调研，然后重新展示修订后的 P2 检查点。不要在挑战未处理时继续 P3。

## 交互行为

- 在交互模式下，显示提议的 Milestone 拆分，并在依赖或范围边界仍不明确时提出后续问题
- P2 产出拆分后，在 P3 之前的检查点停下
- 检查点必须显示：
  - Milestone 编号和名称
  - 目标
  - 实现范围
  - 测试规格
  - 预期产物
  - `technical_solution`
  - `technical_route`
  - `research_required` 状态和证据/阻塞/延后说明
  - `risks_and_alternatives`
  - `validation_path`
  - `audit_focus`
  - 可运行垂直切片质量，包括涉及的层和真实验证证据
  - 闭环验证路径，包括通过/失败信号和验证负责人
  - 未解决的假设
- 在进入 P3 Generate 前等待用户明确确认
- 不要从 P2 直接生成 `.pipeline/` 文件、prompt 文件或架构文件
- 将机器可读拆解保存在 `.plan-state/decompose.yaml`，将人工审查稿保存在 `.plan-state/technical-route.md`
- 如果用户要求修改，调整拆分并重新展示检查点
- 在 auto 模式下，除非被阻塞，否则直接最终确定 Milestone 拆分

## P2 检查点门禁

交互式 P2 完成不等于允许写入文件。唯一有效的下一步是展示提议的拆解和技术路线并要求用户确认。只有在用户明确批准 Milestone 拆分、技术路线，并且硬性调研项已解决、已回答或已明确延后后，才能开始 P3。

P2 可标记为 `proposed` 的最低条件：

- 每个实现 Milestone 都有 `technical_solution`、`technical_route`、`research_required`、`risks_and_alternatives`、`validation_path` 和 `audit_focus`
- 没有 unresolved 的硬性 `research_required` 项；如果存在 `blocking_question`，检查点必须显示为等待用户答复，不能进入 P3
- 检查点不是仅由目标、验收标准、Feature Queue 或测试标题组成
- 用户最近没有未处理的技术路线挑战

## 批量拆解

当存在 `--batch` 时：

1. 读取 `.plan-state/batch-discover.yaml` 或当前 Feature 候选表。
2. 解析 `batch.decompose_mode`：项目配置 > 全局配置 > 默认 `upfront`。
3. 如果模式为 `upfront`，在 P3 前将每个 Feature 拆解为初始 Milestone。
4. 如果模式为 `just_in_time`，创建 Feature 级队列条目，Milestone 数组留空并标记 `JIT decomposition pending`。
5. 对于 upfront 模式，产出：
   - Feature Queue Markdown 表格
   - Mermaid 依赖图
   - Feature 级架构影响部分
6. 当不存在 `--batch` 时，保留单 Feature `/hw:plan` 行为。

## 参考文件

- `plan/PLAN-SKILL.md` — Decompose 阶段规则
- `references/commands-spec.md` — 命令路由
- `SKILL.md` — 更广泛的规划上下文

## Analysis 拆解说明

对于 `workflow_kind: analysis`，按问题而非实现切片拆解。每个分析 Milestone 应能定义问题、收集上下文、提出假设、实验、解释，并以 ledger 支持的报告得出结论。
