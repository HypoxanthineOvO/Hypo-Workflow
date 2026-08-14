---
kind: execution
cycle: C027-machine-era-dismantle-and-readable-rewrite
updated: 2026-08-14T18:05:00+08:00
---

# 执行记录

## Checkpoint: M1 产出审计矩阵（2026-08-14）

### 做了什么

- 盘点测试：从 `tests/regression-catalog.json` 取出全部 maintained/excluded 条目，逐组归类（存活约 12、死亡约 55、excluded 180 批量删除）。
- 盘点实验：核对 C23 实验管理讨论史（`decision-861cb235`、`feedback-542a04ff`）与语义实验协议现状。
- 盘点适配器：检查 Kimi Code 安装（`/home/heyx/.kimi-code`，全局 skills 为 SKILL.md 格式）、zcode（未安装）、DSH（读根 AGENTS.md）。
- 盘点 .pipeline：30+ 目录逐项定处置（保留/重写/提取后删/直接删）。
- 盘点顶层：目录 du 大小 + 文件清单，生成 I 节勾选清单。
- 盘点 VSPi：确认 0.6.2 只读适配器仅 `createDeliveryStore().resume()` 投影，有 uninitialized 兜底分支。
- 盘点 Memory：75 条哈希名记录 + `index.yaml` 映射层，定重命名规则与三约束级方案。

### 关键事实

- maintained 67 中约 55 个是机器测试，机器删除后自然塌缩为约 12 个。
- Kimi Code 已装且 skill 格式兼容；zcode（智谱）未装。
- archives 与 cycles/C1–C20 是同批历史的机器副本/语义副本，可核对后删原件。
- VSPi 0.6.2 不依赖并发/恢复/路由机器，删除安全（其投影改读语义文件记入 VSPi 侧候选）。

### 产物

- `.pipeline/cycles/C027-machine-era-dismantle-and-readable-rewrite/AUDIT-MATRIX.md`

### 验证

- 矩阵中每项处置均有 du/grep/read 证据；本 checkpoint 未修改任何被审计文件。

## Checkpoint: M2–M6 执行（2026-08-14）

- M2：75 条 memory 记录按 dedupe_key 迁移为可读命名，分入 global/{rules,requirements,knowledge} 与 cycle/；index.yaml、capsules、HISTORY-REFRESH-INDEX 删除；新 INDEX.md 按 constraint/guideline/reference 三组生成；maintain/cycle skill 与 memory 模板更新（可读命名 + level + 收尾整理）。
- M3：删除全部 excluded 测试与机器测试；core/src 机器模块整体删除（60+ 目录）；codex-hooks、init、config、serialization、runtime/internal 精简重写；index.js 重写为 10 个存活导出；catalog/runner 机制删除；npm test 退化为直接跑 core/test/*.test.js（33 断言全绿）。
- M4：.pipeline 机器目录与权威文件全部删除；120 份 delivery evidence、architecture.md、audits 提取到 C027/extracted/；顶层文件按 S1 勾选删除；dist 只留 15.0.0-alpha.2 最新 ZIP 对。
- M5：rules 引擎（builtin/presets/rules-spec/HABITS/rules.yaml 及 .pipeline/rules）删除；项目规则迁移为 memory/global 人读记录；hooks.json 6→4 事件、codex-hooks 删除 deny 逻辑；反脚手架写入 AGENTS.md 与生成源；scripts/generate-agents.mjs + agents-template.js 实现 AGENTS.md 真实生成（生成后机器时代引用为 0）。
- M6：core/src/experiment 删除；adapters/kimi、adapters/zcode 最小适配 README 落位。
- 验证：npm test 33/33；s70/s77 PASS；codex-hook-smoke PASS；git diff --check 干净；.pipeline 哈希残留 0。

## Checkpoint: S2 拒绝修订——记录中文化（2026-08-14）

- 反馈：记录必须用中文，只有少数明确术语保留英文。
- 修订：75 条 memory 记录全部重写为中文标题+中文正文（术语保留英文）；memory/INDEX.md 重新生成（全中文分组）；新增约束级规则 `requirement-records-in-chinese.md`；maintain skill 与 memory 模板写死中文正文要求。
- 验证：npm test 全绿；generate-agents 无变化；diff-check 干净。
