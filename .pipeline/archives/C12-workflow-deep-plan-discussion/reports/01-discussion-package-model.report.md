# C12/M1 Report - Discussion Package 数据模型与持久化

## 结果

M1 已完成。Deep Plan 现在具备独立的 Discussion Package 持久化模型，可创建、读取、列出、更新和归档 `.pipeline/deep-plans/DPxxx-slug/` 包，并生成面向后续 Plan 的紧凑上下文草稿。

## 已完成

- 新增 `core/src/deep-plan/index.js`，提供 Deep Plan package 生命周期 helper。
- 从 `core/src/index.js` 导出 package API。
- Package 内写入 `deep-plan.yaml`、`architecture.yaml`、`tracks.yaml`、`summary.md`、`architecture.md`、`readiness.md`、`plan-context.md`。
- 紧凑 `plan-context.md` 会保留决策、开放问题和架构/轨道摘要，不携带原始长对话。

## 验证

- `uv run -- node --test core/test/deep-plan-package.test.js`：4/4 passing。
- `uv run -- node --test core/test/deep-plan-contract.test.js core/test/deep-plan-package.test.js`：8/8 passing。
- `git diff --check`：passing。

## Carry-Forward

- M5 需要明确 active package 被 archive 后的语义。
- M5 需要补上 `package_path` 边界校验，避免从 metadata 读取到 `.pipeline/deep-plans/` 之外的路径。
