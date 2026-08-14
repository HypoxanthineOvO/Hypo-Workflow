---
kind: plan
cycle: C024-v15-alpha2-distribution-preparation
mode: goal
status: closed
updated: 2026-08-09
progress: PROGRESS.md
execution: EXECUTION.md
---

# v15.0.0-alpha.2 本地分发准备

## 执行目的

把已接受的 C023 改动整理为版本一致、叙事完整、可复现验证的 `15.0.0-alpha.2` 本地分发候选，并提供 Codex plugin ZIP、portable ZIP、checksum 与可审阅报告。

## 执行边界

本 Cycle 覆盖版本源、package lock metadata、中英文 README/用户指南/平台与命令参考、CHANGELOG、中英文 release notes、Host installed/release descriptors、两个本地 ZIP 及其验证。不得执行 commit、tag、push、GitHub Release、npm publish、插件重装、marketplace/config 修改或 app-server 重启/kill；这些动作需要单独授权。

## 验证目标

所有发布面统一指向 `15.0.0-alpha.2`，Codex manifest 只带一个 `+codex.<timestamp>` cachebuster；maintained Core、Scenario 与 History Refresh focused 通过；两个 ZIP 内容、安全性、manifest/checksum、干净解压运行时与连续构建可复现性均通过。

## 完整计划

| ID | 阶段 | 期望结果 | 验证方式 |
| --- | --- | --- | --- |
| `M1` | 冻结发布范围与版本 inventory | 所有真实版本源、文档入口、构建输入和授权边界可机械对账 | `rg` inventory、manifest/schema 与 worktree 分类 |
| `M2` | 同步版本与发布叙事 | 版本源统一为 alpha.2，中英文说明准确覆盖 C023 的用户影响 | 版本扫描、链接检查、docs narrative/freshness checks |
| `M3` | 执行 current release gates | 已接受实现与测试治理在候选版本下保持全绿 | maintained Core、Scenario、History focused、catalog parity |
| `M4` | 构建并验证本地分发产物 | 两个 ZIP、installed descriptor 和 release manifest 互相绑定且可复现 | builder、schema、checksum、ZIP inventory、clean extraction、双构建比较 |
| `M5` | 交付本地分发报告 | 用户能审阅改动、产物、验证、问题、边界和后续发布动作 | `FINAL-REPORT.md` 与最终人工接受/拒绝 |

## 风险与处理

- 构建脚本要求所有打包输入与 `HEAD` 一致；当前 C023 源改动尚未提交。若无法在既有授权内满足该门禁，M4 必须明确报告为受阻，不得绕过或扩大提交范围。
- 工作树包含并行 runtime/memory 与旧 dist 改动；本 Cycle 不回滚、不清理，也不把它们误纳入发布候选。
- `installed-release.json` 与 `release-manifest.json` 是构建输出，不在版本同步阶段手工伪造最终 checksum。
