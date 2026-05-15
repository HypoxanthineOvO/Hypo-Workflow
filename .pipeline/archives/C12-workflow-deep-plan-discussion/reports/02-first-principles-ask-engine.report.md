# C12/M2 Report - First-Principles Ask Engine 与浅层计划拒绝

## 结果

M2 已完成。Deep Plan 现在具备第一性原理追问 helper、ask round 持久化，以及阻止浅层讨论直接进入 `convert` / milestone decomposition 的 gate。

## 已完成

- 新增 `generateDeepPlanAskQuestions`，覆盖 necessity、minimum viable loop、falsifying evidence、essential-vs-habitual 四类追问。
- 默认首问不会使用 `who is the user` / `用户是谁`；该问题只在上下文明确需要时作为非默认 contextual question 出现。
- 新增 `recordDeepPlanAskRound`，追加轮次并持久化 decisions、open questions、readiness gaps 和 next recommended question。
- 新增 `assessDeepPlanShallowPlanGate`，在目标 readiness depth 不满足、challenge 缺失、架构/决策不足时拒绝 `convert` / `decompose`。
- 审计发现的重复首问风险已修复：generator 会根据已有 `ask_rounds` 和 persisted `next_recommended_question` 推进到下一轮问题。

## 验证

- `uv run -- node --test core/test/deep-plan-ask.test.js`：8/8 passing。
- `uv run -- node --test core/test/deep-plan-package.test.js core/test/deep-plan-ask.test.js`：12/12 passing。
- `git diff --check`：passing。

## Carry-Forward

- M5 需要把 readiness gate 进一步绑定到 evidence quality、`readiness_gaps`、open questions 和 intentional blanks，避免结构上“填满字段”但内容仍空泛的 pseudo-deep package。
