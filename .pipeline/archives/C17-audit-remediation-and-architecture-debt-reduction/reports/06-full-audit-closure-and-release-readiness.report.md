# C17-M6 全量审计闭环与发布就绪报告

生成时间：2026-05-21（Asia/Shanghai）

## 结论

C17-M6 文档收口已完成。M0-M5 均已有 PASS 审计证据，M6 final regression evidence 显示根目录测试、diff whitespace、硬编码路径、workspace import、YAML parser、ledger authority 和 barrel export 扫描均达到发布就绪要求。当前未发现 blocker；本报告不代表 Cycle 已被 accepted。

## Changed Modules

- Root test entry：新增根目录 `package.json`，使 `npm test` 从仓库根目录直接运行。
- Audit inventory：新增 `core/src/audit-inventory/index.js`，记录 C17 baseline 与最终计数。
- Shared utils：新增 `core/src/utils/index.js`，迁移重复 helper。
- Layered config：扩展 `core/src/config/index.js` 与 CLI/config docs，提供 project > user > defaults 读取与显式迁移。
- YAML authority：`core/src/config/index.js`、`core/src/knowledge/index.js`、`core/src/rules/index.js` 统一到 `js-yaml`。
- Workspace split：删除旧 `core/src/workspace/index.js`，新增 `workspace-authority`、`project-linkage`、`project-stop-events`、`codex-capture`、`notification-sender`。
- Ledger authority：新增 `core/src/ledger/index.js`，project events、notifications、maintenance、daily summary、global consolidation 的长期写入迁移到 JSONL。
- Public exports：`core/src/index.js` 与 `core/src/maintenance/index.js` 清理 broad `export *`，改为显式 public surface。
- Reports/status：本 M6 仅更新 closure/report/summary/evidence 文档。

## Technical Reasoning

C17 的主线不是功能扩张，而是把审计发现变成可验证的工程边界：

- 先用 M0 固化测试入口和 inventory baseline，避免后续重构只能靠叙述证明。
- 再按风险分层推进：硬编码路径和 workspace God Module 属于 Critical，优先迁移到配置 authority 和清晰模块边界。
- YAML parser 和 ledger authority 是数据一致性风险，分别用 `js-yaml` 和 append-only JSONL 收敛。
- root public export cleanup 与 workspace clean split 同步，避免旧 shim 或 broad barrel 把已删除边界重新暴露出去。
- M6 不再改生产代码，只用最终测试、扫描和 closure matrix 证明哪些项已 fixed，哪些是诚实保留的 follow-up candidate。

## Validation Output

最终 M6 证据文件：`.pipeline/reviews/C17/M6/test-evidence.md`。

| 命令/检查 | 结果 | 摘要 |
| --- | --- | --- |
| `npm test` | PASS | `tests 661`、`pass 661`、`fail 0`、`duration_ms 3448.590384`。 |
| `git diff --check` | PASS | exit 0，无输出。 |
| `rg -n '/home/heyx' core/src scripts` | PASS | exit 1，无输出，runtime/source 无 `/home/heyx` 命中。 |
| workspace stale import scan | PASS with classified residual | 仅 `workspace-authority` 新模块路径触发宽松正则，不是旧 `workspace/index`。 |
| YAML/parser/export scan | PASS with classified residual | 仅剩统一 `parseYaml` public wrapper；无 `parseKnowledgeYaml`；无真实 `export * from`。 |
| ledger/export scan | PASS with classified residual | 26 条命中均分类为 analysis lane、migration/self-test、fixture、安全测试、audit scan 或普通关键词。 |
| audit inventory | PASS | 当前：`0/15/0/1/129/0`；M0 baseline：`31/14/9/2/137/55`。 |

Inventory 对比：

| 类别 | M0 baseline | 当前 | 结论 |
| --- | ---: | ---: | --- |
| `hardcoded_paths` | 31 | 0 | 清零。 |
| `duplicate_helpers` | 14 | 15 | 宽松 detector 残留；不作为 M6 gate blocker。 |
| `workspace_imports` | 9 | 0 | 清零。 |
| `yaml_parsers` | 2 | 1 | 剩余为统一 `js-yaml` wrapper。 |
| `ledger_rewrites` | 137 | 129 | 宽松 detector 仍命中 write/stringify/analysis 关键词；长期 YAML authority 已分类关闭。 |
| `barrel_exports` | 55 | 0 | 清零。 |

## Expected Behavior

- 新开发者可在仓库根目录直接运行 `npm test`。
- runtime/source 不再依赖 `/home/heyx` 绝对路径；用户级配置写入必须通过显式迁移命令。
- 旧 `workspace/index.js` public entry 不存在；消费者使用拆分后的领域模块。
- config 与 knowledge YAML 使用统一 parser/dumper，复杂 YAML round-trip 行为由测试覆盖。
- 高频 ledger 写入追加到 JSONL authority；compact YAML 只作为 metadata summary。
- root public export surface 更显式，避免 broad barrel 隐式暴露所有模块。

## Residual Risks

- `ARCH-05` 模块膨胀未完全关闭：C17 已处理 workspace God Module 和 root barrel，但没有全面合并 platform adapters、project event/notification 管道或 maintenance 子系统。
- `QUAL-06` deep-plan 单文件未拆分：当前仍是后续可维护性债务，但未触发 C17 强制 gate。
- `duplicate_helpers=15` 与 `ledger_rewrites=129` 来自宽松 detector，仍建议后续将 detector 从文本匹配升级为语义分类，降低误报。
- `appendJsonlLedgerEntry` append 后仍会重读 JSONL 生成 metadata compact summary；不是 YAML authority 重写，但在超大 ledger 下仍有优化空间。

## Follow-up Cycle Candidates

- `C18` 或后续：`ARCH-05` 模块边界二期，重点处理 `platform-adapters/`、project events/notifications 管道、maintenance 子系统拆分。
- Deep Plan 模块拆分：按 new/ask/research/map/drill/readiness/convert 子命令拆分 `core/src/deep-plan/index.js`，增加 focused tests。
- Audit inventory v2：把 `duplicate_helpers`、`ledger_rewrites` detector 改为 AST/语义分类，减少宽松正则误报。
- Ledger compact 性能优化：在保持 JSONL authority 的前提下，增量维护 metadata summary 或增加截断策略。

## Release Readiness

M6 结论：release readiness PASS for documented C17 scope。未发现 blocker；等待最终 audit worker 和主线程验收流程继续判断。
