---
kind: progress
cycle: C027-machine-era-dismantle-and-readable-rewrite
plan: PLAN.md
status: active
updated: 2026-08-14T19:20:00+08:00
current: S2
next: 等待用户审阅清理结果
---

# 机器时代拆除与人类可读重写进度

## 当前状态

M1–M6 全部完成，验证通过。停在 S2 等待用户审阅最终结果。

## 完整计划状态

| ID | 阶段 | 状态 | 当前结果 / 证据 | 下一步 |
| --- | --- | --- | --- | --- |
| `M1` | 产出审计矩阵与文件清理清单 | `completed` | `AUDIT-MATRIX.md` | S1 已接受 |
| `S1` | 审阅矩阵与勾选清理清单 | `completed` | 用户接受矩阵并勾选全部待定项（含受保护三文件删除） | 进入 M2 |
| `M2` | 哈希根除与 Memory 可读化 | `completed` | 75 条记录迁移为可读命名与 global 分层；index.yaml/capsules 删除；三约束级索引；收尾整理写入 cycle skill | 进入 M3 |
| `M3` | 测试瘦身与 catalog 简化 | `completed` | 179 个测试文件收敛为 8 个（33 断言）；catalog/runner 机制整体删除；`npm test` = `node --test core/test/*.test.js` | 进入 M4 |
| `M4` | .pipeline 重写与文件清理 | `completed` | .pipeline 收敛为 INDEX/cycles/memory/experiments/local；120 份 evidence 与 architecture/audits 提取到 C027/extracted；顶层按勾选全删；dist 只留最新 | 进入 M5 |
| `M5` | 规则引擎退役、删除保护移除、反脚手架、AGENTS.md 生成 | `completed` | rules 引擎/受保护文件删除；hooks 6→4 事件；反脚手架入指令面；`scripts/generate-agents.mjs` 从原则源生成 AGENTS.md | 进入 M6 |
| `M6` | 实验旧机器删除与适配器落位 | `completed` | `core/src/experiment` 删除；Kimi/ZCode 适配 README 落位（DSH = AGENTS.md） | 进入 S2 |
| `S2` | 审阅清理结果 | `rejected→revision×2` | 反馈1：记录用中文；反馈2：知识要梳理沉淀不堆积 | 修订后重新审阅 |

## 验证结果

- `npm test`：33/33 通过（8 个测试文件）；Scenario s70/s77 通过；`node scripts/codex-hook-smoke.mjs` PASS（4 事件 + fail-open）。
- `node scripts/generate-agents.mjs` 生成 AGENTS.md（10853 字符），机器时代引用（Work Placement/Recovery Pack/active.yaml/Receipt）grep 为 0。
- `.pipeline` 哈希目录/文件名残留：0（reviewed 历史条目已改可读名）。
- `git diff --check` 干净。
- core/src 模块从 80+ 收敛为 14 个文件。

## 阻塞

- 无。S2 已按反馈修订（记录中文化），待重新审阅。

## 计划变化

- S2 反馈修订1：75 条 memory 记录重写为中文；新增约束级规则 `records-in-chinese`。
- S2 反馈修订2（知识沉淀）：删除 5 条被替代重复、17 条机器时代碎片、4 条 VSPi 边界碎片与 cycle/ 全部 10 条；合并为 2 条叙述记录（机器时代交付史、VSPi 集成边界）；maintain skill 增加"梳理沉淀不堆积"；memory 从 75+ 收敛为 46 条。
- 矩阵内的 E3 Claude 旧 Stop hook 对齐、VSPi 适配器改读语义文件仍属后续候选，未在本轮执行）。

## 下一步

`S2`：用户接受后写 SUMMARY.md 并关闭 Cycle（含 Memory 收尾整理检查）。
