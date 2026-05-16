# M1 — Workflow 语义与状态机审查

## 目标

审查 plan/start/resume/stop/skip/cycle/accept/reject 等核心生命周期语义是否一致，状态迁移和文件更新覆盖是否完整。

## 审查问题

- 每个命令在什么状态下可运行？会更新哪些字段？
- `.pipeline/state.yaml`、`.pipeline/cycle.yaml`、`.pipeline/PROGRESS.md`、`.pipeline/log.yaml`、prompts、reports 的更新是否覆盖完整？
- Worker Separation / Subworker lifecycle 是否有状态记录和验收门控？
- Feature Queue / batch plan / auto chain / deferred 的状态流是否与普通 Cycle 兼容？
- 是否存在过时状态、重复状态或状态名不一致？

## 工作要求

1. 只读审查，不修复代码。
2. 以 evidence-first 方式引用本地文件路径和行号。
3. 对每个发现使用 P0-P4 严重度。
4. 对 P0/P1 给出影响范围和建议修复方向。

## 输出

写入 `.pipeline/reports/C14-M1-workflow-state-audit.md`，至少包含：

- Lifecycle transition matrix
- File coverage matrix
- Worker state/lifecycle matrix
- Feature Queue compatibility notes
- Findings table
- Pending hypotheses

## 验收

- 每个正式 finding 必须有证据路径。
- 无证据项进入 Pending hypotheses。
