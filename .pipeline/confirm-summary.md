# C12 Plan Confirm Summary

C12 将实现 Hypo-Workflow 的深度计划/讨论能力：在普通 `/hw:plan` 前提供长期 discussion package，通过第一性原理追问、只读调研、架构映射、模块 drilldown、readiness 检查和显式 convert，把模糊需求逐步收敛成可进入 Feature Queue 的计划上下文。

## Entry

- Canonical: `/hw:plan:deep`
- Alias: `/hw:plan --deep`
- Core operations: `new`, `ask`, `research`, `map`, `drill`, `readiness`, `convert`

## Milestones

1. M0 - Deep Plan 合同、命令入口与生命周期
2. M1 - Discussion Package 数据模型与持久化
3. M2 - First-Principles Ask Engine 与浅层计划拒绝
4. M3 - Research 只读证据流
5. M4 - Requirement Tracks、Architecture Map 与人读渲染
6. M5 - Drill、Readiness Depth 与 Convert Gate
7. M6 - Skills、Commands、Adapters 与状态面集成
8. M7 - Feature Queue Handoff 与普通 Plan 集成
9. M8 - 真实场景验收、回归与发布准备

## Validation

- `uv run -- node --test core/test/deep-plan*.test.js core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/commands-rules-artifacts.test.js`
- `uv run python tests/run_regression.py`
- `uv run -- bash scripts/validate-config.sh .pipeline/config.yaml`
- `uv run -- node cli/bin/hypo-workflow sync --platform opencode --project /home/heyx/Hypo-Workflow --check-only`
- `uv run -- git diff --check`
- Manual: use deep planning to plan Hypo-Agent again and confirm Feature Queue order plus acceptance depth are clear before ordinary Plan.
- Manual: research a referenced external project with explicit remote/network confirmation and verify downloaded source code evidence is inspected, not only README summaries.
