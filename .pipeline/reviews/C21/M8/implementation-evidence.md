# C21-M8 Consolidated Implementation Evidence

## 结论

M8 已把 C21 的 Codex 产品面收敛为 Root + 9 Child Skills，并关闭旧生成器复活路径；删除操作通过 exact Manifest/Receipt 单独授权；默认回归入口改为显式 maintained catalog，历史失败保留在 quarantine 中。实现没有触碰 `/home/heyx/Codex-VSP`，也没有把延期的 OpenCode、Claude、Docs/PR/Release 等能力伪装为当前功能。

## 实现分层

### Surface 与路由

- Root `SKILL.md` 只链接 9 个真实 Child Skills。
- Init 不再依赖 Setup；Goal 与 Cycle 为平级 Main Delivery；Plan 内部吸收 adaptive phases；Maintain 支持 focused Record 与 ambient capture；Accept/Reject 只在最终状态下出现。
- Chat、Explain、Status、Report、Debug、Start 与 Plan phases 成为内部自然行为，不再占用公开命令。
- deferred/removed 显式调用只返回 zero-write 兼容诊断。
- Plugin metadata、README、命令参考、Codex 指南和 Hook 指南同步到 manifest/Records/Receipts/Recovery 架构。

### Core 与非复活约束

- Registry/Router 的 Codex discovery 精确投影 9 条路由，并在 Skill 缺失或 symlink 时 fail closed。
- legacy sync/artifact/docs/readme/TUI/rules 等直接 writer 从当前公开入口退休或在 mutation 前拒绝，不能重新生成已删除表面。
- Skill quality 以 Root + 9 为当前 inventory，不再把历史物理 Skill 当作正常兼容面。

### 删除门禁

- 删除前生成并展示 37 项 exact Manifest，绑定内容 hash 与 Git baseline。
- 用户批准后通过 single-use `deletion.execute` Receipt 执行。
- 执行报告与 Receipt 均证明 `applied / consumed`；恢复后的旧批准没有被重放。

### 回归目录

- `tests/regression-catalog.json` 精确覆盖 164 个 Core test files 与 76 个 registered scenarios。
- Core: `48 maintained / 116 quarantined`。
- Scenarios: `8 maintained / 68 quarantined`。
- 默认 `npm test` 与 `tests/run_regression.py` 只执行 maintained lane；`test:quarantine` 与 `--set quarantined` 保留真实诊断和非零退出。
- 新测试或 scenario 若未分类、重复、重叠、缺 reason 或缺 maintained replacement，runner 在执行前 fail closed。

## 主要修改模块

- Root 与公开 Skills: `SKILL.md`, `skills/{guide,init,goal,plan,cycle,maintain,resume,accept,reject}/`
- Command/Skill/Core exports: `core/src/commands/`, `core/src/skills/`, `core/src/index.js`
- Retired writer entrypoints: `core/src/artifacts/`, `core/src/sync/`, `core/src/docs/`, `core/src/readme/`, `core/src/tui/` 及相关 compatibility modules
- Plugin 与 Hooks: `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, `hooks/`
- 当前文档: `README.md`, `README.en.md`, `docs/reference/commands.md`, `docs/en/reference/commands.md`, `docs/platforms/codex.md`, `docs/en/platforms/codex.md`
- 回归与场景: `tests/regression-catalog.json`, `tests/run_core_tests.mjs`, `tests/run_regression.py`, `tests/scenarios/c21/s70-*` 至 `s77-*`
- M8 contracts: `core/test/c21-m8-surface-cleanup.test.js`, `core/test/c21-m8-regression-contract.test.js`

## 验证结果

- Surface/deletion M8 contracts: `32/32 PASS`
- Regression catalog contract: `12/12 PASS`
- Maintained Core: `479/479 PASS`
- Maintained scenarios: `8/8 PASS`
- Plugin validator: PASS
- Root + 9 Skill Creator quick validation: `10/10 PASS`
- Production Skill quality: `0 issues`
- Synthetic Codex Hook smoke: PASS
- Official Codex real-host: `SKIP` on `/usr/local/bin/codex 0.128.0`
- Config validation and `git diff --check`: PASS

详细证据：

- `.pipeline/reviews/C21/M8/surface-implementation-evidence.md`
- `.pipeline/reviews/C21/M8/core-implementation-evidence.md`
- `.pipeline/reviews/C21/M8/regression-catalog-implementation-evidence.md`
- `.pipeline/reviews/C21/M8/deletion-execution.md`

## 问题与剩余风险

- 旧 test/scenario corpus 混合了当前行为、legacy authority、removed surface 和 deferred adapters，因此不能按当前 PASS/FAIL 自动分类；M8 采用显式 catalog 和 replacement evidence，而没有删除历史证据。
- Official Codex 真机 Hook trust/discovery 尚未在兼容宿主上验证。
- 更广泛的旧仓库整理不在这次 exact deletion Receipt 内，不能把 Phase A 描述为完整历史清仓。

