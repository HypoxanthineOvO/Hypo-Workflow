# C12/M5 Report - Drill、Readiness Depth 与 Convert Gate

## 结果

M5 已完成。Deep Plan 现在支持 scoped drill、depth-aware readiness、explicit convert gate，以及 archived/package-path boundary protection。

## 已完成

- 新增 `drillDeepPlanTopic`，只更新唯一目标 track/module card，并拒绝 ambiguous title/topic。
- 新增 `assessDeepPlanReadiness`，区分 `directional`、`architecture-ready`、`implementation-ready`。
- 新增 `convertDeepPlanToPlanContext`，通过 boundary、archived 和 readiness gate 后生成 compact ordinary Plan context。
- 新增 `validateDeepPlanPackageBoundary`，拒绝 `package_path` 逃逸。
- 修复审计发现：directional package 不再能默认 convert；ambiguous drill 不再 fan-out 到多个 sibling。

## 验证

- `uv run -- node --test core/test/deep-plan-convert.test.js`：8/8 passing。
- `uv run -- node --test core/test/deep-plan-package.test.js core/test/deep-plan-ask.test.js core/test/deep-plan-research.test.js core/test/deep-plan-architecture.test.js core/test/deep-plan-convert.test.js`：35/35 passing。
- `git diff --check`：passing。

## Carry-Forward

- M7 将把 compact Plan context 接入 ordinary Plan / Feature Queue handoff。
