---
kind: decision
name: vspi-integration-boundaries
level: guideline
scope: project
status: active
updated: 2026-08-14
supersedes:
  - model-group-tier-capability-contract
  - plan-binding-version-boundary
  - explicit-auto-group-switching
  - uninitialized-plan-requires-explicit-init
sources: [VSPi 0.2.0 合同期决定]
---

# VSPi 集成边界

VSPi 只读集成 Workflow 的计划与状态，不做 Workflow 的 runner。集成边界：Core 只输出 routing class 与能力要求，具体模型解析由宿主负责；Plan 绑定按版本显式迁移；模型组切换必须显式且可审计；项目未初始化时 Plan 不得静默创建结构，必须先显式 init。VSPi 侧改动属目标自有面，走其本地 Cycle。
