# C18 指令质量审查与集成同步方案

> 最后更新：14:11 | 状态：completed / accepted / release prepared | 进度：6/6 Milestone

## 当前状态

- Cycle：C18
- 状态：completed / accepted
- 类型：refactor
- Preset：tdd
- 开始时间：2026-05-29T18:05:08+08:00
- 上下文源：用户待提供文章原文、集成同步研究

## 目标摘要

本 Cycle 聚焦四件事：先根据文章原文讨论指令优化方向；增强 `/hw:audit` 的工程审计方法论并决定 `/hw:quality` 边界；制定 Hypo-Workflow 指令功能向 `~/VSP-Open-Code` 和 `~/Codex-VSP` 集成版本同步的明确机制；最后建立从两个集成仓库普通对话/Journal 记录回流到 Workflow 的候选 inbox 机制，并基于确认后的方案优化代码。

## 候选工作流

| Workstream | 主题 | 当前状态 | 预期产出 |
|---|---|---|---|
| C18-W1 | Instruction Quality Direction | Audit + Quality + Optimize 方案确认 | 已确认 `/hw:audit` 增强、`/hw:quality` 一等命令和 `/hw:optimize` 自动优化闭环 |
| C18-W2 | Integration Sync Plan | 方案确认 | 已确认同步不是用户命令，而是功能更新后的集成适配开发流程和 release gate，需要读取目标仓库状态、因地制宜适配并在目标仓库记录 |
| C18-W3 | Workflow Code Optimization | 待规划 | 根据 W1/W2 修改 Workflow 代码、文档、集成适配器和测试 |
| C18-W4 | Integration Feedback Import | 草案完成 | 读取两个集成仓库普通对话/Journal 记录机制，回流为候选 inbox，再由用户确认升级为 Knowledge/规则/指令源头 |

## 时间线

| 时间 | 类型 | 事件 | 结果 |
|---|---|---|---|
| 14:11 | Release Prep | v13.1.0-alpha.1 prepared | Sync/doc repair、版本更新、release notes、docs governance、version consistency、`npm test` 665/665、`sync --check-only` fresh、`git diff --check` 均通过；`git add/commit/tag/push` 仍等待用户显式确认 |
| 13:38 | Acceptance | C18 accepted | 用户确认进入 Sync Doc Release 准备；C18 已标记为 completed/accepted，后续发布动作按独立门禁处理 |
| 13:04 | Execution | C18-M6 completed | Codex-VSP 与 VSP-Open-Code 目标适配完成；目标侧记录已写入，源 matrix 已回链；Codex-VSP focused Cargo tests + `git diff --check` 通过，VSP-Open-Code focused Bun tests + `bun typecheck` + `git diff --check` 通过 |
| 12:38 | Execution | C18-M6 started | 用户已确认两个目标仓库路径、硬边界、文件清单、验证策略、失败处理和记录回链；已重新读取目标 dirty status，开始 scoped adaptation |
| 01:22 | Gate | C18-M5 completed; stopped before M6 target writes | Source-side closure complete: focused tests、docs governance、`npm test` 665/665、`git diff --check` 均通过；两个目标仓库只读检查均为 dirty，已生成适配计划并停在用户确认 Gate |
| 01:09 | Execution | C18-M1-M4 source contracts completed | Audit/Quality/Optimize/Integration Sync 源侧命令、Skill、spec、adapter/docs 合同已实现；focused contract tests 已通过，进入 M5 源侧闭合和目标仓库只读适配计划 |
| 00:55 | Execution | C18-M1 started | 已进入 `/hw:start` 连续执行；启动 test worker 编写 C18 指令质量合同测试，主代理并行处理命令/spec/adapter 实现 |
| 00:29 | Planning | P3 Generate completed | 已根据确认的 P2 拆解生成 6 个执行 prompt、C18 架构基线、design spec、confirm summary 和 generate 记录；下一步等待确认后 `/hw:start` |
| 00:15 | Planning | P2 Decompose proposed | 已生成 C18 六个串行 Milestone 拆解和技术路线检查点，见 `.plan-state/c18-decompose.yaml` 与 `.plan-state/c18-technical-route.md`；等待用户确认后进入 P3 |
| 00:00 | Planning | 集成同步开发流程确认 | 已通过 Request Tool 明确同步不是新增命令，而是本仓库功能更新后的目标仓库适配流程；本轮最小范围包括命令/Skill/Docs、Hooks/Journal、Dashboard/Status、状态读写和目标测试，见 `.plan-state/c18-integration-sync-workflow-decisions.md` |
| 21:05 | Planning | `/hw:quality` 与 `/hw:optimize` 方案确认 | 已通过 Request Tool 细化 Quality 主任务、rubric、gate、compare 模式和报告结构，并补充 `/hw:optimize` 的 Audit+Quality -> Implement/Test -> Audit+Quality 自动优化闭环，见 `.plan-state/c18-quality-command-decisions.md` |
| 21:05 | Planning | `/hw:audit` 增强方案确认 | 已通过 Request Tool 细化 Audit 目的、方法论、Intake、报告维度、Critical 阈值和 Action Queue，见 `.plan-state/c18-audit-enhancement-decisions.md` |
| 21:05 | Planning | C18 Round 2 讨论稿 | 已根据用户新增要求形成 Audit 增强、指令下发同步、记录回流机制草案，见 `.plan-state/c18-round2-audit-sync-discussion.md` |
| 18:35 | Planning | C18-W2 同步方案草案 | 已形成集成同步方案，明确不复制 `.pipeline` 运行态，先做 staging/dry-run，再确认 apply |
| 18:25 | Planning | C18-W1 指令方向草案 | 已从 `tmp.md` 提炼九维质量 rubric，并建议新增 `/hw:quality`，草案见 `.plan-state/c18-instruction-quality-direction.md` |
| 18:15 | Discovery | 集成路径预检 | `~/VSP-OpenCode` 未发现；候选为 `~/VSP-Open-Code`。`~/Codex-VSP` 存在；两个集成仓库均有未提交改动，后续同步必须保护脏工作树 |
| 18:05 | Cycle | C17 accepted and archived | C17 completed artifacts archived to `.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/` |
| 18:05 | Cycle | C18 created | 等待用户提供文章原文后进入方案整理 |

## Deferred 项

- 无。
