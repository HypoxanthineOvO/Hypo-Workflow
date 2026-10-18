---
kind: progress
cycle: C028-stop-that-shit-skill-assessment
plan: PLAN.md
status: approved
updated: 2026-08-21T17:45:00+08:00
current: approved-not-started
next: explicit-start-authorization
---

# Stop That Shit 集成与 Plan P0 进度

## 当前状态

Discussion 已由用户确认充分，正式 Proposal 已批准但明确不开始。M1–M3 与 S1 均保持 `pending`，尚未授权产品实现。

## 完整计划状态

| ID | 阶段 | 状态 | 当前结果 / 证据 | 下一步 |
| --- | --- | --- | --- | --- |
| `M1` | 通用原则与文字版 P0 | `pending` | Proposal 已定义范围 | 等待开始授权 |
| `M2` | Codex 窄 Hash Guard | `pending` | Proposal 已定义覆盖和边界 | 等待 M1 |
| `M3` | 同步、回归与交付整理 | `pending` | Proposal 已定义验证目标 | 等待 M2 |
| `S1` | 用户审阅真实集成结果 | `pending` | 尚无执行产物 | 等待 M3 |

## 已有研究证据

- 原始仓库 `lennney/stop-that-shit` 为公开非 fork 项目，最新 release `0.1.0`。
- 上游 `npm test` 182 项中 181 项通过；唯一 OpenCode smoke 失败与当前环境 OpenCode `1.14.30` 低于要求 `>=1.18.18` 及本地 tgz 解析有关。
- 当前 Hypo-Workflow 注册四个提醒 Hook，未注册 `PreToolUse`；Plan 源码与已安装 Skill 存在文案漂移。

## 下一步

等待用户后续明确开始；批准本身不授权执行。
