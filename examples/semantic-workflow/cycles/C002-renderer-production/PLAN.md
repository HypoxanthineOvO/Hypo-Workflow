---
kind: plan
cycle: C002-renderer-production
status: active
updated: 2026-08-05
builds_on:
  - C001-renderer-demo
progress: PROGRESS.md
execution: EXECUTION.md
---

# Renderer 正式版 Plan

## 执行目的

交付具有可靠数据边界和可重复宿主集成测试的正式版共享 renderer。

## 执行边界

只继承 Demo 中已经接受的 renderer contract 和 UX 结论。不继承 Demo Milestone，也不复用临时数据 adapter。本 Cycle 不包含 release 发布。

## 验证目标

两个宿主通过同一套 conformance suite，正式存储能够跨重启工作，不支持的输入会明确失败。

## 完整计划

| ID | 阶段 | 期望结果 | 验证方式 |
| --- | --- | --- | --- |
| `M1` | 建立正式版数据边界 | 选定可跨重启工作的持久化方案 | 持久化对比与重启探针 |
| `M2` | 实现 shared renderer slice | 两个宿主使用同一 renderer contract | 共享 conformance fixtures |
| `M3` | 验证宿主与失败行为 | 正常与不支持输入均有稳定行为 | 双宿主集成测试与失败用例 |

## 未决问题

- 在 focused comparison 后选择正式版持久化实现。
