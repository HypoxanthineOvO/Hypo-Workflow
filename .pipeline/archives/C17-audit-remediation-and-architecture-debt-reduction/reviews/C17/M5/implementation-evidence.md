# C17-M5 Implementation Evidence

## Helper API

- 新增 `core/src/ledger/index.js`，公开 `appendJsonlLedgerEntry`、`readJsonlLedger`、`migrateYamlLedgerToJsonl`、`writeCompactLedgerSummary`、`jsonlLedgerPathFor`、`compactLedgerSummaryPathFor`。
- `appendJsonlLedgerEntry` 使用 append-only JSONL，每一行都是独立 `JSON.parse` 可解析对象，读取顺序保持文件顺序。
- `writeCompactLedgerSummary` 从 JSONL authority 重新生成 compact YAML summary，summary 仅包含 `authority: jsonl`、`authority_path`、`schema_version`、`event_count`、`latest_event_id`、`event_ids`，不写入完整 `events` authority。

## Migration Behavior

- `migrateYamlLedgerToJsonl` 支持 legacy YAML `events` 一次性迁移到同名 JSONL，并写出同名 `.summary.yaml`。
- 迁移按 `id` 去重，重复执行不会重复追加已有事件。
- 新写入不做 YAML/JSONL 双写；旧 `.yaml` 只作为迁移输入读取，JSONL 是写入 authority。

## Affected Paths

- `core/src/project-events/index.js`：`emitProjectEvent` 和路由追加改为 `.jsonl` ledger authority。
- `core/src/project-notifications/index.js`：pending queue 改为 JSONL authority；读模型按 `dedupe_key`/`id` 折叠为当前队列视图。
- `core/src/maintenance/index.js`：`appendMaintenanceLedgerEvent` 改为 JSONL authority。
- `core/src/maintenance/daily-project-summary.js`：daily scheduler ledger 改为 `.jsonl`。
- `core/src/maintenance/consolidation.js`：global consolidation scheduler ledger 改为 `.jsonl`。

## Export Cleanup Strategy

- `core/src/index.js` 已移除所有 root `export * from`，改为显式 named re-export。
- `core/src/maintenance/index.js` 也从 broad re-export 改为显式 re-export，以便 root 导出面可机械审计。
- 新 helper API 已从 root 显式导出。

## Scan Results

- `core/src` 中 M5 写入面不再保留长期 `ledger.yaml` authority writer。
- `core/src/index.js` 无 `export * from`。
- `rg -n 'ledger.yaml|export \* from' core/src core/test docs README.md README.en.md` 仍命中旧测试、analysis ledger 文档/测试、`audit-inventory` 扫描规则文本；analysis ledger 明确不在 C17-M5 范围。

## Validation Results

- `node --test core/test/ledger-jsonl-migration.test.js`: 6/6 passing。
- `git diff --check`: passing。
- `node --test core/test/project-events.test.js core/test/project-notifications.test.js core/test/daily-project-summary.test.js core/test/maintenance-ledger.test.js core/test/global-consolidation.test.js`: 17/26 passing，9 failures。
  - 失败包含旧测试仍直接读取 `ledger.yaml`。
  - 失败还包含旧测试对 JSON/YAML 文本格式的正则断言，例如期望 `status: pending` 或 `notification_status: sent`，但 JSONL authority 行为输出 JSON。
- `npm test`: 650/661 passing，11 failures。
  - 其中 ledger/notification/daily/global 相关失败与旧 YAML authority 或 YAML 文本断言冲突。
  - 另有 `workspace-module-split.test.js` 旧静态断言要求 root 中存在 `export * from "./workspace-authority/index.js"` 等 broad export；这与 C17-M5 明确要求 root 无 `export * from` 直接冲突，未恢复 broad export。

## Scope Declaration

- 未读取或修改 `core/test/ledger-jsonl-migration.test.js` 源码。
- 未修改 `core/test/**`。
- 未修改 `.pipeline/state.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md`、`.pipeline/continuation.yaml`、`.pipeline/.lock`、`.pipeline/reports/**`。
