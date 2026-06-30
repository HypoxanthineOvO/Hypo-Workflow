# C19 Workflow 核心内容与 Plan 模式优化

- Cycle: C19
- 类型：refactor
- 状态：completed
- 开始时间：2026-06-08T15:31:09+08:00
- 结束时间：2026-06-08T23:23:16+08:00
- Preset：tdd

## 改动摘要

C19 完成了 Workflow 核心提示词和 Plan 模式重构：Plan 阶段从旧的 P1/P2/P3/P4 命名收敛为 Discover、Technical Stack、Architecture、Decompose、Generate；重大阶段 Gate 要先展示阶段摘要、决策表、开放问题和图表，再使用 Question Tool / Ask 确认；新增 `/hw:plan:technical-stack` 与 `/hw:plan:architecture`，移除用户态 `/hw:plan:confirm`；将四规则 discipline 和 Gate 可见性投影到 OpenCode/Claude/Codex surfaces；并完成两个目标仓库适配与发布。

## Milestones

| Milestone | 结果 |
|---|---|
| C19-M1 | Plan 命令合同完成：新增 technical-stack / architecture 阶段命令，移除用户态 confirm。 |
| C19-M2 | 结构化阶段产物和自适应 Gate 完成，新增 phase flow、milestone table、decision matrix、dependency map renderer。 |
| C19-M3 | 四规则 discipline、Plan Gate Visibility 和 platform adapter projection 完成。 |
| C19-M4 | Plan Skills、根 Skill、docs/references、core Discover guidance 和源端回归闭合完成。 |
| C19-M5 | Codex-VSP 与 VSP-Open-Code 目标仓库适配完成，并发布到远程 Release。 |

## 验证结果

- 源端 focused/regression：M1-M4 的 Node tests、scenario tests、`npm test` 和 `git diff --check` 均已按各 Milestone 记录通过。
- Codex-VSP：JSON parse、stale scan、`git diff --check`、Cargo release build、version check、release package、sha256 和 smoke 通过；`pnpm prettier --check` 因目标环境缺少 `prettier` 且 Node 不满足 `>=22` 未运行，该缺口已在 Gate 中接受。
- VSP-Open-Code：Bun focused tests 11/11、`bun typecheck`、`git diff --check`、build、release packaging、push hooks 和 publish 均通过。
- Workflow 状态文件：关闭前 `.pipeline/state.yaml`、`.pipeline/log.yaml`、`.pipeline/cycle.yaml` YAML 解析通过。

## 目标发布

- Codex-VSP: `af11d8a308`, `v0.134.0-vsp.7.2`, https://gitlab.vsplab.cn/heyx/Codex/-/releases/v0.134.0-vsp.7.2
- VSP-Open-Code: `4dc194e9639d0451885e16e2c7ec4548d299c865`, `v1.15.10-vsp.2.4`, https://gitlab.vsplab.cn/heyx/VSP-Open-Code/-/releases/v1.15.10-vsp.2.4

## 风险与后续

- 源仓库仍包含 C19 的大量未提交源码和文档改动；本次 Cycle close 只归档运行态，不替代源仓库正式 release/commit。
- VSP-Open-Code 本地保留 `.opencode/opencode.jsonc` 和 `.pipeline/chat*`/`.pipeline/inbox` dirty/untracked，这些已按 Gate 排除在目标 release commit 之外。
- VSP-Open-Code 保留备份分支 `c19-pre-release-dev-85537f9`，用于回查发布前旧本地 `dev` 指针。
