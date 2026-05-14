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
4. 每个实现 Milestone 必须定义闭环验证路径：
   - 精确的验证命令或可执行场景
   - 可观察的通过/失败证据
   - 当工作非平凡或已委托时，指定独立的验证负责人
5. 对于实现工作，优先使用可运行的垂直切片：一个仅跨越运行和验证所需层的窄行为。
6. 当数据库/API/UI/仅 schema 的 Milestone 不产生可运行行为或可信验证时，标记为水平拆分或开环拆分。
7. 当架构可能在后续 prompt 中变动时，优先使用窄 Milestone。
8. 保留 append 模式安全性：
   - 不要静默重新编号已执行的 prompt
   - 将新 prompt 追加到最高安全序号之后

## 交互行为

- 在交互模式下，显示提议的 Milestone 拆分，并在依赖或范围边界仍不明确时提出后续问题
- P2 产出拆分后，在 P3 之前的检查点停下
- 检查点必须显示：
  - Milestone 编号和名称
  - 目标
  - 实现范围
  - 测试规格
  - 预期产物
  - 可运行垂直切片质量，包括涉及的层和真实验证证据
  - 闭环验证路径，包括通过/失败信号和验证负责人
  - 未解决的假设
- 在进入 P3 Generate 前等待用户明确确认
- 不要从 P2 直接生成 `.pipeline/` 文件、prompt 文件或架构文件
- 如果用户要求修改，调整拆分并重新展示检查点
- 在 auto 模式下，除非被阻塞，否则直接最终确定 Milestone 拆分

## P2 检查点门禁

交互式 P2 完成不等于允许写入文件。唯一有效的下一步是展示提议的拆解并要求用户确认。只有在用户明确批准 Milestone 拆分后才能开始 P3。

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
