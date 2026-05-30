# C17 审计修复与架构减债

- Cycle：C17
- 名称：审计修复与架构减债
- 类型：refactor
- 状态：completed
- 开始时间：2026-05-21T16:32:54+08:00
- 结束时间：2026-05-29T18:05:08+08:00
- Preset：tdd

## Milestone 摘要

- C17-M0：建立根目录 `npm test` 入口与 audit inventory baseline。
- C17-M1：新增共享 `utils` 层并迁移低风险重复 helper。
- C17-M2：迁移硬编码用户路径、Hypo-Claw/Hypo-Writer 集成和项目 seed 到分层配置。
- C17-M3：统一 config/knowledge/rules YAML 行为到 `js-yaml`。
- C17-M4：删除旧 `workspace/index.js`，拆分 workspace authority、linkage、stop event、codex capture 和 notification sender。
- C17-M5：将长期 ledger 写入迁移到 append-only JSONL，并清理 broad barrel export。
- C17-M6：完成最终回归、审计闭环报告和 release readiness 复核。

## 关键结果

- 3 个 Critical 已关闭：硬编码路径、重复工具函数、workspace God Module。
- 6 个可追踪 Warning 中 5 个关闭，`ARCH-05` 作为后续架构减债候选保留。
- 6 个 Info 中 5 个关闭，`QUAL-06` deep-plan 单文件拆分作为后续候选保留。
- C17 在 2026-05-29T18:05:08+08:00 被用户确认接受，并以 completed 状态归档。

## 验证结果

- `npm test`：661/661 PASS。
- `node --test core/test/docs-governance.test.js`：8/8 PASS。
- `git diff --check`：PASS。
- `rg -n '/home/heyx' core/src scripts`：无命中。
- workspace/parser/export/ledger 分类扫描：PASS with classified residual。
- 最终 audit worker Pauli：PASS，无 blocker。

## 完成说明

- 改动摘要：C17 将上一轮审计报告中的结构性风险转化为可回归的代码边界、配置 authority、数据 authority 和发布就绪证据。
- 技术思路：先固化 baseline，再按风险拆分为 shared utils、分层配置、统一 YAML、workspace clean split、JSONL ledger 与 final closure。
- 修改文件/模块：详见本归档内 `PROGRESS.md`、`state.yaml`、`reports/`、`reviews/C17/` 和 `plan-state/`。
- 测试设计：每个 Milestone 使用 test/implement/audit 分离证据；最终 M6 做全量回归和专项扫描。
- 验证结果：核心回归与最终审计均通过；C17 closure report 位于 `reports/C17-audit-closure.report.md`。
- 预期结果：项目具备可移植根目录测试入口、更清晰模块边界、统一 YAML 行为、JSONL ledger authority 和显式 public export surface。
- 遇到的问题：acceptance helper 需要当前 worker separation 合同下的授权与历史结果规范化，归档前已补齐 C17 P0 授权事实并将历史 result 规范为 `pass`。
- 风险/后续：`ARCH-05` broader module boundary refactor、`QUAL-06` deep-plan split、audit inventory v2 和 ledger compact 性能优化仍适合后续 Cycle。
