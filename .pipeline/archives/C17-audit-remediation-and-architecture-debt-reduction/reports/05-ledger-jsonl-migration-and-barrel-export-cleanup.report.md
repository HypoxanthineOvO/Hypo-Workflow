# C17-M5 Ledger JSONL Migration And Barrel Export Cleanup Report

## 结论

状态：PASS。

C17-M5 已将高频 ledger authority 从完整 `ledger.yaml` 重写迁移为 append-only JSONL，并保留 metadata-only compact YAML 摘要供人读检查。root public barrel 已从 broad `export * from` 改为显式 named re-export，降低命名空间污染和隐式 API 面扩散。

## 完成内容

- 新增 `core/src/ledger/index.js`，提供 `appendJsonlLedgerEntry`、`readJsonlLedger`、`migrateYamlLedgerToJsonl`、`writeCompactLedgerSummary`、`jsonlLedgerPathFor`、`compactLedgerSummaryPathFor`。
- 迁移 project events、project notifications、maintenance ledger、daily summary、global consolidation 的长期写入路径到 `.jsonl` authority。
- 保留一次性 legacy YAML ledger 迁移能力；按事件 `id` 去重，重复迁移返回 `migrated_count: 0`。
- compact summary 仅包含 authority、authority path、schema version、event count、latest event id 和 event ids，不再承载完整事件 authority。
- `core/src/index.js` 和 `core/src/maintenance/index.js` 移除 broad `export * from`，改为显式导出。
- 更新旧测试契约，使其断言 JSONL authority 和显式 export surface。

## 验证

- `node --test core/test/project-events.test.js core/test/project-notifications.test.js core/test/daily-project-summary.test.js core/test/maintenance-ledger.test.js core/test/global-consolidation.test.js core/test/workspace-module-split.test.js core/test/ledger-jsonl-migration.test.js core/test/maintenance-backup-policy.test.js`：41/41 passing。
- `npm test`：661/661 passing。
- `git diff --check`：passing。
- `rg -n 'ledger.yaml|export \* from' core/src core/test docs README.md README.en.md`：剩余命中已分类为 analysis lane、migration/self-test、fixture、安全测试、audit scan 或普通关键词，不是 M5 writer 的长期 YAML authority 或 root broad barrel。

## 审计

- 审计工件：`.pipeline/reviews/C17/M5/audit.md`
- Verdict：PASS
- 主要检查点：JSONL authority、迁移幂等性、compact summary 非 authority、export cleanup、剩余扫描命中分类、worker separation。

## 残余风险

- `appendJsonlLedgerEntry` append 后会重读 JSONL 生成 compact summary；这不再是完整 YAML ledger authority 重写，但 summary 刷新仍随事件数线性增长。当前 summary 是 metadata-only，风险可接受。
- analysis lane 的 `.pipeline/analysis/.../ledger.yaml` 属于独立契约，不纳入 M5 runtime ledger authority 迁移范围；M6 会在最终 closure matrix 中继续分类。

## 下一步

进入 C17-M6，运行最终全量回归、审计清单前后对比、 stale path/import/parser/export 扫描，并生成 C17 audit closure report。
