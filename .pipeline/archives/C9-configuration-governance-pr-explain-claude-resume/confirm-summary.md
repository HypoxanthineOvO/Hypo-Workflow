# C9 Plan Confirm Summary

## 项目

- Cycle: C9
- 名称: Hypo-Workflow 配置治理、PR 管理、Explain 命令与 Claude Resume 修复
- Workflow kind: build
- Preset: tdd
- Feature 数: 6
- Milestone 数: 12

## 生成文件

- `.pipeline/state.yaml`
- `.pipeline/feature-queue.yaml`
- `.pipeline/design-spec.md`
- `.pipeline/architecture.md`
- `.pipeline/PROGRESS.md`
- `.pipeline/metrics.yaml`
- `.pipeline/prompts/00-*.md` through `.pipeline/prompts/11-*.md`
- `.plan-state/batch-discover.yaml`
- `.plan-state/batch-decompose.yaml`
- `.plan-state/batch-architecture.md`
- `.plan-state/generate.yaml`

## 关键确认点

- 配置治理要覆盖自动程度、严格程度、确认边界和平台差异，并提供 `solo-auto`、`manual-review`、`team-strict`、`analysis-hybrid`。
- `/hw:pr` 第一版处理已有 GitHub PR / GitLab MR；远端写操作始终高风险手动确认。
- `.pipeline/pr/` 是本地 PR/MR 处理归档，不替代 GitHub/GitLab。
- `/hw:explain` 是证据优先、只读问答命令；`--subagent` 用独立 Subagent 取证。
- Claude Code 原生 `/resume` 与 Hypo `/hw:resume` 必须分离。
- 给人看的 README 引用链、`docs/**` 和主要 `references/**` 要中文主体。
- P3 生成后需要 Subagent 审计计划产物，然后进入 P4 确认。
- Subagent 审计初始 verdict 为 `needs_changes`；P4 前已修复 high-risk gate、C9 config name、通用 plan-state 残留和 PR/MR remote-readonly 文案。

## P4 Gate

等待 Subagent 审计结果和用户确认后，C9 才进入执行。确认后从 M01 开始。
