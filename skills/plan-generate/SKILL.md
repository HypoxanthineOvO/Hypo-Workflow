---
name: plan-generate
description: Generate Hypo-Workflow artifacts from the approved milestone plan when the user wants prompts, config, and architecture outputs.
---

# /hypo-workflow:plan-generate
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

仅将此 skill 用于 P3 Generate。

## 前置条件

- Milestone 已定义得足够好以产生 `.pipeline/` 产物

## 执行流程

1. 读取 `~/.hypo-workflow/config.yaml`（如果存在）。
2. 生成 `.pipeline/config.yaml`，包含项目特定值和仅应覆盖全局默认值的覆盖项，包括 `output.*`、`plan.interactive.*` 和 `watchdog.*`（仅当项目需要显式覆盖时）。
3. 生成 `.pipeline/prompts/*.md`。
4. 生成架构基线文件。
5. 当创建 Cycle 时生成或更新 `.pipeline/cycle.yaml` 元数据：
   - `workflow_kind: build | analysis | showcase`
   - 当工作流为 analysis 时的 `analysis_kind`
   - `lifecycle_policy.reject.default_action`，默认为 `needs_revision`
   - `lifecycle_policy.accept.next`，当存在计划的后续时使用 `follow_up_plan`
   - 计划后续节点的 `continuations[]`
6. 在写入每个提示之前，创建一个详细的实现计划，包含：
   - 有序步骤
   - 依赖项
   - 验证点
   - 测试规范
   - 约束
   - 闭环验证命令或场景
   - 可观测证据和独立验证所有者（如适用）
   - 一个 `Subworker Assignment Plan`，在实现开始前预先分配 Worker Separation 角色
7. 将该实现计划转换为最终提示文件。
8. 检测附加模式并保留已执行的编号。
9. 对于任何触及受保护生命周期状态的项目周期写入，使用工作流提交助手，以便权威事实在派生刷新之前原子提交。

当 Cycle 或 Feature 具有 `workflow_kind: analysis` 时，生成的提示应包括分析步骤链，生成的配置/周期元数据应使用 `analysis` preset：

- `define_question`
- `gather_context`
- `hypothesize`
- `experiment`
- `interpret`
- `conclude`

生成的分析提示应指向 `templates/analysis/*`、`references/analysis-spec.md` 和 `references/analysis-ledger-spec.md`，并且应要求外部账本而不是扩展 `state.yaml`。

生成的实现提示不得将测试降级为开环散文。当计划要求时，携带确切的验证命令或可执行场景、可观测的通过/失败证据以及实现与验证所有权分离。

当 Worker Separation 为 `recommended` 或 `strict`，或计划工作非平凡到需要独立验证时，生成的实现提示必须包含 `Subworker Assignment Plan`。将此部分放在任何实现步骤之前。该部分必须足够具体，以便 `/hw:start` 可以在不虚构角色边界的情况下执行：

- `test`：拥有 `write_tests` 和 `review_tests`；独立验证真实测试契约，记录命令/场景证据，在适用时检查失败/绿色证据，并拒绝伪测试
- `implement`：拥有范围内的实现编辑并生成简洁的变更摘要
- `audit`：检查最终差异、测试证据、假设、风险和工作器身份分离
- 主代理：编排、集成返回的产物、更新生命周期/进度/日志文件并做出最终决策；在 `test` 和 `implement` 工作器被授权或分配之前，它不得在本地编写红色测试或实现
- 不重叠：同一工作器身份不得同时满足 `test` 和 `implement`；`strict` 还必须保持审计分离
- 产物：在 `.pipeline/reviews/` 或提示特定报告路径下命名预期的审查/测试/审计产物路径

在 Codex 上，缺失的执行子工作器授权不会移除分配。相反，生成相同的 `Subworker Assignment Plan`，但带有 `status: blocked_until_authorized`，并包含一个启动/恢复门控，要求 `/hw:start` 或 `/hw:resume` 在角色敏感工作之前询问。只有用户显式确认的最快单代理降级才能生成没有子工作器分配的提示，并且这些提示必须声明 Worker Separation 门控被有意禁用。

如果派生的生命周期产物在成功的权威提交后未能刷新，生成的提示应指导操作员修复派生产物或运行 `/hw:sync --light`，而不是将权威写入视为失败。

## 交互行为

- 在交互模式下，在最终确定之前呈现任何主要的附加模式冲突或架构不确定性
- 在自动模式下，除非被将重写历史的结构冲突阻止，否则继续

## 参考文件

- `plan/PLAN-SKILL.md` — Generate 阶段行为
- `references/commands-spec.md` — 命令语义
- `references/config-spec.md` — 项目/全局配置分离
- `SKILL.md` — 完整系统上下文
