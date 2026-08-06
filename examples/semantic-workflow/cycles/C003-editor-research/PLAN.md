---
kind: plan
cycle: C003-editor-research
status: active
updated: 2026-08-05
builds_on:
  - C001-renderer-demo
progress: PROGRESS.md
execution: EXECUTION.md
---

# Editor Framework 研究 Plan

## 执行目的

判断哪个 editor framework 能在提供连续编辑体验的同时最好地保留 HypoDoc 源码。

## 执行边界

本 Cycle 只产出证据和推荐，不修改正式版 renderer Cycle，也不替它选择持久化方案。

## 验证目标

每个候选运行相同的源码保真探针，并在人类可读的对比中记录丢失内容和 fallback 行为。

## 完整计划

| ID | 阶段 | 期望结果 | 验证方式 |
| --- | --- | --- | --- |
| `M1` | 定义源码保真 fixtures | 候选使用同一套输入和比较规则 | Fixture parser baseline |
| `M2` | 运行候选探针 | 每个候选产生可比较结果 | Milkdown 与 MarkText 探针记录 |
| `M3` | 解释并推荐 | 明确推荐、限制和 fallback | 人类可读候选对比 |

## 未决问题

- 在探针证据产生前没有需要用户决定的问题。
