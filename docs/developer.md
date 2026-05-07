# 开发者指南

核心 helper 位于 `core/src/`，由 CLI、skills、OpenCode artifacts 和测试共用。开发时优先修改这些源头，再通过 docs/sync 刷新派生文档和平台适配器。

## 合同

- `.pipeline/` 是状态、Cycle、Rules、PROGRESS、logs、prompts 和 reports 的 source of truth。
- Generated adapters 是派生产物，不能反向作为 authority。
- 修改 `.pipeline/state.yaml`、`.pipeline/cycle.yaml`、`.pipeline/rules.yaml` 这类 protected authority 文件时，必须走生命周期命令或 workflow commit helper。
- 命令、配置键、文件名和平台专有词保留英文；面向人的说明保持中文主体。
