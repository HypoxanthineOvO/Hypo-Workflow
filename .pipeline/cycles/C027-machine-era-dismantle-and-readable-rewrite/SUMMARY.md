---
kind: cycle-summary
cycle: C027-machine-era-dismantle-and-readable-rewrite
status: closed
started: 2026-08-14
finished: 2026-08-14
builds_on:
  - C026-workflow-intent-drift-audit-and-residue-cleanup
successors: []
---

# 机器时代拆除与人类可读重写总结

## 目的与边界

彻底拆除 C1–C21 机器时代：哈希/校验/恢复/规则引擎等机器与其测试全部删除，memory 与 .pipeline 改为人类可读命名与结构，AGENTS.md 生成做实，Kimi/zcode/DSH 最小适配落位。边界：不碰 git 历史（正常 commit 除外）、不碰 VSPi 仓库、文件清理按 S1 逐项勾选。

## 最终结果

- 哈希机制根除：memory 75 条记录可读命名 + 三约束级分层；receipts/recovery/runtime/records/capsules 等机器全删。
- 测试瘦身：179 个测试文件 → 8 个（33 断言）；catalog 三重分类与精确对账机制整体移除。
- .pipeline 收敛为 INDEX/cycles/memory/experiments/local 五块；120 份 evidence 与 architecture/audits 提取到 C027/extracted；顶层杂物按勾选清理，dist 只留最新。
- rules 引擎退役（活跃规则迁移为 memory/global/rules 人读记录）；删除保护门移除（hooks 6→4 事件）；反脚手架原则写入指令面。
- AGENTS.md 由原则源真实生成（scripts/generate-agents.mjs）；旧实验机器删除；Kimi/ZCode 最小适配落位。
- S2 两轮反馈修订：全部记录中文化（新增约束级规则 records-in-chinese）；知识沉淀（75+ → 46 条，合并为历史脉络与 VSPi 边界两条叙述，maintain 流程写入"梳理沉淀不堆积"）。

## 验证结果

- `npm test` 33/33；Scenario s70/s77 通过；`node scripts/codex-hook-smoke.mjs` PASS（4 事件 + fail-open）。
- AGENTS.md 生成后机器时代引用（Receipt/Recovery Pack/Work Placement）为 0；`.pipeline` 哈希目录/文件名残留为 0。
- `git diff --check` 干净；core/src 从 80+ 模块收敛为 14 个文件。
- 提交：77e8ebd（拆除）、e0ee865（中文化）、1b3d4ce（沉淀）。

## 重要决定与经验

- 测试只测机器、文件靠人读：机器删多少，测试塌缩多少——709 → 33 断言。
- worktree 隔离 + git 兜底足以替代崩溃恢复机器。
- 需求审计必须对账到执行面；生成面修改要同改生成源。
- 记录必须中文、知识必须沉淀：堆积是残留的另一种形态。
- 判断过度防御的分界线：用户明确要求的语义不算，纯仪式/重复/为不存在机制做的验证算。

## 后续候选

- E3：Claude 旧 Stop hook（阻断式 stop-check.sh）与 InstructionsLoaded 对齐为提醒式或删除。
- VSPi 0.6.2 只读适配器改读语义 Cycle 文件（target-owned，走 VSPi 本地 Cycle）。
- README/docs 发布面按新规则同步（docs/ 42M 内容仍描述机器时代）。
- 文件名 slug 目前保持英文；若需中文文件名另行决定。
- dist 只保留最新 ZIP 对；后续发布走 build-host-artifacts 时确认其与新结构兼容。

## 历史记录

- Plan：`PLAN.md`
- Progress：`PROGRESS.md`
- Execution：`EXECUTION.md`
- Discussion：`DISCUSSION-SUMMARY.md`
- 审计矩阵：`AUDIT-MATRIX.md`
- 提取保留：`extracted/`
