---
kind: project-index
name: hypodoc-renderer-example
updated: 2026-08-05
---

# HypoDoc Renderer 示例项目

这个示例同时展示：已经关闭的 Demo Cycle、只显式继承 Demo 有效成果的正式版 Cycle，以及与正式版并行推进的研究 Cycle。三个 Cycle 的任务列表相互独立。

## Active Cycles

| Cycle | 目的 | 状态 | 下一步 |
| --- | --- | --- | --- |
| [C002 Renderer 正式版](cycles/C002-renderer-production/PLAN.md) | 构建正式版 renderer | active | 实现 shared renderer slice |
| [C003 Editor 研究](cycles/C003-editor-research/PLAN.md) | 比较编辑器框架 | active | 运行源码保真探针 |

## Closed Cycles

| Cycle | 结果 | 总结 |
| --- | --- | --- |
| C001 Renderer Demo | 共享渲染可行；Demo 数据层不适合正式版 | [Summary](cycles/C001-renderer-demo/SUMMARY.md) |

## Experiments

- [Renderer 性能实验](experiments/renderer-performance.md)

