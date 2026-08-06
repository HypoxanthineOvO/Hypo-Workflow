---
kind: experiment
name: renderer-performance
status: active
updated: 2026-08-05
cycles:
  - C001-renderer-demo
  - C002-renderer-production
---

# Renderer 性能实验

## 目的与假设

测量共享 renderer 在代表性大型文档中能否保持响应速度。假设是正式版 cache 能改善重复渲染，同时不改变语义输出。

## 实验方案

每个 Attempt 使用同一文档 corpus、机器、warm-up 和语义比较。记录 cold render、warm render、内存和 semantic diff。

## Baseline

Demo Attempt 是 baseline，因为它在生产 cache 引入前使用了已经接受的共享 renderer。

## Attempts

### Attempt 1 - 2026-07-13 - C001-renderer-demo

- 参数：禁用 cache；100 页代表性文档。
- 数据与环境：fixture corpus v1；Linux 开发机。
- 结果：cold 840 ms；warm 810 ms；semantic diff 为空。
- 证据：`cycles/C001-renderer-demo/evidence/performance.md`。
- 解释：足以支持 Demo，但重复渲染需要优化。
- 下一步：在 C002 中比较正式版 cache。

### Attempt 2 - 2026-08-05 - C002-renderer-production

- 参数：启用正式版 cache；使用相同文档和 warm-up。
- 数据与环境：fixture corpus v1；相同 Linux 开发机。
- 结果：cold 860 ms；warm 210 ms；semantic diff 为空。
- 证据：`cycles/C002-renderer-production/evidence/performance.md`。
- 解释：cache 明显改善重复渲染，没有引入语义漂移。
- 下一步：在 release planning 前补充 Windows 与 macOS 重复实验。

