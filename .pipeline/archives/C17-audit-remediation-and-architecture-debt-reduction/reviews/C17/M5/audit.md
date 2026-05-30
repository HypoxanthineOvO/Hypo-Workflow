# C17-M5 Audit

verdict: PASS

reviewed_refs:
- `.pipeline/prompts/05-ledger-jsonl-migration-and-barrel-export-cleanup.md`
- `.pipeline/reviews/C17/M5/test-evidence.md`
- `.pipeline/reviews/C17/M5/implementation-evidence.md`
- `.pipeline/reviews/C17/M5/test-revision-evidence.md`
- `.pipeline/state.yaml`
- `.pipeline/log.yaml`
- `.pipeline/PROGRESS.md`
- `.pipeline/continuation.yaml`
- `core/src/ledger/index.js`
- `core/src/index.js`
- `core/src/project-events/index.js`
- `core/src/project-notifications/index.js`
- `core/src/maintenance/index.js`
- `core/src/maintenance/daily-project-summary.js`
- `core/src/maintenance/consolidation.js`
- `core/test/ledger-jsonl-migration.test.js`
- `core/test/project-events.test.js`
- `core/test/project-notifications.test.js`
- `core/test/daily-project-summary.test.js`
- `core/test/maintenance-ledger.test.js`
- `core/test/global-consolidation.test.js`
- `core/test/workspace-module-split.test.js`
- `core/test/maintenance-backup-policy.test.js`

checks:
- JSONL authority: PASS. `emitProjectEvent`、`enqueueProjectStopNotification` / dispatcher、`appendMaintenanceLedgerEvent`、`runDailyProjectSummaryScheduler`、`runMaintenanceScheduler` 的新写入路径均进入 `.jsonl` authority；未发现这些 M5 writer 长期重写 `ledger.yaml` 或 YAML/JSONL 双写。
- Migration: PASS. `migrateYamlLedgerToJsonl` 从 legacy YAML `events` 读取、按 `id` 跳过既有 JSONL 事件、重复执行返回 `migrated_count: 0`，并从 JSONL 重新写 compact summary。无 `id` legacy event 无法按 id 去重，但 M5 验收明确要求按 id 去重，当前实现与测试契约一致。
- Compact summary: PASS. `writeCompactLedgerSummary` 只写 `authority`、`authority_path`、`schema_version`、`event_count`、`latest_event_id`、`event_ids`，不保留完整 `events` authority；目标测试覆盖 summary 被篡改后可由 JSONL 确定性再生成。
- Export cleanup: PASS. `core/src/index.js` 已移除 broad `export * from`，改为显式 named re-export；`core/src/maintenance/index.js` 也改为显式 re-export。目标测试通过实际 root import 验证关键 public API 仍可用。
- Scan classification: PASS. `rg -n 'ledger.yaml|export \* from' core/src core/test docs README.md README.en.md` 的剩余命中可接受：analysis lane 的 `.pipeline/analysis/.../ledger.yaml` 契约、迁移/自测、fixture、安全测试、审计扫描 pattern、普通关键词 regex。生产 M5 writer 路径未继续指向 `ledger.yaml`。
- Worker separation: PASS. lifecycle 记录显示 McClintock 仅负责 RED 测试，Heisenberg 负责生产实现，Plato 负责旧测试修订；实现证据声明未改测试/生命周期，测试修订证据声明未改生产代码。当前审计仅写本报告。
- Scope: PASS. 未发现 C17-M5 引入 M6 full audit/release 工作；M4 workspace 测试修订仅限 root explicit export 新契约的必要更新。

findings:
- none

warnings:
- 工作树包含 C17 前序 milestone 和当前 milestone 的大量未提交变更，审计按 C17-M5 输入证据、生命周期记录和关键文件范围评估；未尝试归属或回滚其他 worker 的变更。
- `appendJsonlLedgerEntry` 每次 append 后会重新读取 JSONL 并重写 compact summary；这已经消除了完整 YAML ledger 的 O(n) authority rewrite，但 summary 生成仍随事件数线性增长。当前 summary 是 metadata-only，风险可接受。

validation:
- 本地复跑：`node --test core/test/project-events.test.js core/test/project-notifications.test.js core/test/daily-project-summary.test.js core/test/maintenance-ledger.test.js core/test/global-consolidation.test.js core/test/workspace-module-split.test.js core/test/ledger-jsonl-migration.test.js core/test/maintenance-backup-policy.test.js`：41/41 passing。
- 本地复跑：`git diff --check`：passing。
- 引用主线程 GREEN 证据：`npm test`：661/661 passing。
- 引用主线程 GREEN 证据：`rg -n 'ledger.yaml|export \* from' core/src core/test docs README.md README.en.md`：剩余命中已分类为非 M5 authority、migration/self-test、fixture、安全测试、audit scan 或 analysis lane。

recommendation:
- C17-M5 可以 PASS。下一步由主线程生成 M5 completion report，并按 Cycle 计划进入 C17-M6。
