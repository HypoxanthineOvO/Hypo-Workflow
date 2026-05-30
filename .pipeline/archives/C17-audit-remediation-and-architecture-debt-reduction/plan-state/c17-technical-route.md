# C17 Technical Route — 审计修复与架构减债

## P2 结论

C17 进入 `proposed` 技术路线。范围为全修审计项，且用户确认以下 breaking cleanup：

- 根目录 `npm test` 必须直接运行。
- 配置 authority 采用分层读取，自动迁移必须通过显式命令触发；`sync/start` 只能提示，不能静默写用户级配置。
- `workspace/index.js` 不保留兼容 re-export shim，旧 import 一次切干净。
- YAML 统一采用 `js-yaml`。
- ledger 新写入采用 append-only JSONL，旧 YAML ledger 一次性迁移，compact YAML 只作为人读摘要。
- 文档/examples 同步改成显式模块 import。
- `core/src/index.js` 的 barrel export 尽量清理干净。

## 仓库证据

- 根目录没有 `package.json`；`core/package.json` 已有 `npm test`，实际命令为 `cd .. && node --test core/test/*.test.js`。
- `core/src/index.js` 当前包含 50+ 行 `export *`，包括 `export * from "./workspace/index.js"`。
- 当前直接依赖 `workspace/index.js` 的 runtime 模块包括：
  - `core/src/project-events/index.js`
  - `core/src/project-notifications/index.js`
  - `core/src/maintenance/daily-project-summary.js`
  - `core/src/maintenance/project-linkage-e2e.js`
  - `core/src/index.js`
- YAML parser 分裂点：
  - `core/src/config/index.js` 的 `parseYaml` / `stringifyYaml`
  - `core/src/knowledge/index.js` 的 `parseKnowledgeYaml`
- O(n) ledger 重写点：
  - `core/src/project-events/index.js`
  - `core/src/maintenance/index.js`
  - `core/src/project-notifications/index.js`
  - `core/src/maintenance/daily-project-summary.js`
  - `core/src/maintenance/consolidation.js`

## Milestone 顺序

1. **C17-M0 Audit Baseline And Root Test Entry**
   - 先让 `npm test` 在根目录成为硬门槛，并固化审计 inventory。
   - 这是后续 breaking refactor 的安全网。

2. **C17-M1 Shared Utils Layer Extraction**
   - 新增 `core/src/utils/index.js`，迁移重复 helper。
   - 先降噪，再做路径/YAML/workspace 大改。

3. **C17-M2 Layered Config And Integration Migration**
   - 将项目路径、Hypo-Claw、Hypo-Writer、timezone、project seed 移出 runtime 常量。
   - 新增显式迁移命令；`sync/start` 只提示。

4. **C17-M3 YAML Parser Unification With js-yaml**
   - 用 `js-yaml` 统一 config/knowledge YAML 行为。
   - 为复杂 YAML 和既有 records 增加兼容测试。

5. **C17-M4 Workspace Clean Module Split**
   - 拆成 `workspace-authority`、`project-linkage`、`project-stop-events`、`codex-capture`、`notification-sender`。
   - 删除旧公共 `workspace/index.js` 入口，更新所有 imports/tests/docs。

6. **C17-M5 Ledger JSONL Migration And Barrel Export Cleanup**
   - 新增 append-only JSONL ledger helper。
   - 对旧 YAML ledger 做一次性迁移。
   - 清理 `core/src/index.js` 平铺导出，更新 docs/examples。

7. **C17-M6 Full Audit Closure And Release Readiness**
   - 全量回归、扫描、审计 closure report。
   - 所有原审计项必须关闭或有明确后续理由。

## 验证总线

每个实现 Milestone 都必须至少运行：

- 对应 focused `node --test ...`
- `npm test`
- `git diff --check`

最终 C17 还必须运行：

- `rg -n '/home/heyx' core/src scripts`
- `rg -n 'workspace/index|from .*/workspace' core/src core/test docs README.md README.en.md`
- `rg -n 'function parseYaml|function parseKnowledgeYaml|export \\* from' core/src`

## 审计门槛

Audit worker 需要拒绝以下情况：

- 根目录 `npm test` 不可运行。
- `sync/start` 静默写入用户级配置。
- `workspace/index.js` 保留为兼容 re-export shim。
- 旧 YAML ledger 与 JSONL 长期双写。
- 文档/examples 保留旧 import 或旧 ledger authority。
- `core/src/index.js` 继续大面积 `export *` 且无清理说明。
