# C17-M5 测试修订证据

## 修改范围

- 已更新 `core/test/project-events.test.js`：从读取 `project-events/ledger.yaml` 改为解析 `project-events/ledger.jsonl`，逐行 `JSON.parse` 断言 `artifact.ready`、`writer.issue.ready`、本地 append-only 行为、无外部动作和无敏感字段泄露；同时检查 `ledger.summary.yaml` 只含 `authority/event_count/latest_event_id/event_ids` 等摘要元数据，不含 `events` 写入 authority。
- 已更新 `core/test/project-notifications.test.js`：从 YAML 文本 regex 改为解析 `notifications/project-stop-pending.jsonl`，保留 queued/pending、confirmed dispatcher、sent、QQ message id、hook 不触发外部联系等行为断言；compact summary 断言为 JSONL summary。
- 已更新 `core/test/daily-project-summary.test.js`：scheduler ledger 改为读取 `maintenance/ledger.jsonl`，断言 `daily_project_summary_scheduled` 事件、`notification_status`、`remote_writes_enabled=false`、`external_contacted` 状态和 compact summary 元数据。
- 已更新 `core/test/maintenance-ledger.test.js`：maintenance ledger helper 改为读取 `maintenance/ledger.jsonl`，通过 `validateMaintenanceLedger({ events })` 继续验证事件结构，并保留 secret redaction、事件顺序、metadata 内容断言。
- 已更新 `core/test/global-consolidation.test.js`：consolidation scheduler 改为读取 `maintenance/ledger.jsonl`，断言 `global_consolidation_scheduled`、`remote_writes_enabled=false`、`apply_required=false`、scheduler completed 和 compact summary 元数据。
- 已更新 `core/test/workspace-module-split.test.js`：root barrel 断言从 `export * from "./workspace-authority/index.js"` 旧契约改为显式 named export block 与 public API import 双重断言，并明确禁止 root `export *` 和 workspace-authority broad export。
- 额外更新 `core/test/maintenance-backup-policy.test.js`：`npm test` 暴露该旧测试仍要求 `maintenance/ledger.yaml`。已改为断言用户传入 `ledgerFile` 不能覆盖默认 `maintenance/ledger.jsonl` authority，并解析 JSONL 事件确认 `maintenance_run_applying` 记录写入。

## 旧断言过时原因

C17-M5 已把相关 ledger 写入 authority 从 `ledger.yaml` 切到 append-only `.jsonl`。`*.summary.yaml` 只是人读 compact summary，不再承载完整事件数组，也不应作为写入 authority。旧测试用 YAML 文本 regex 查找事件类型或状态，会把 summary 和 authority 混在一起，并错误要求旧路径存在。

root `core/src/index.js` 已从 broad `export * from` 清理为显式 named exports。旧 M4 测试要求 root 保留 `export * from "./workspace-authority/index.js"`，与 C17-M5 的 explicit root exports 契约相冲突。

## 新断言覆盖

- JSONL authority 每行必须能独立 `JSON.parse`。
- 保留事件类型、事件顺序、metadata、状态、notification status、QQ message id、remote write 禁止、external contact 状态、CLI dry-run/no remote side effect 等行为断言。
- compact YAML summary 只验证 `authority: jsonl`、`authority_path`、`event_count`、`latest_event_id`，并明确 `events` 不存在，避免把 summary 当写入 authority。
- root public surface 通过显式 export block 断言导出模块 API，并通过实际 import `core/src/index.js` 断言 public API 可用；同时禁止 root broad barrel `export *`。

## 验证结果

- `node --test core/test/project-events.test.js core/test/project-notifications.test.js core/test/daily-project-summary.test.js core/test/maintenance-ledger.test.js core/test/global-consolidation.test.js core/test/workspace-module-split.test.js`：31/31 passing。
- `node --test core/test/ledger-jsonl-migration.test.js`：6/6 passing。
- `node --test core/test/maintenance-backup-policy.test.js`：4/4 passing。
- `node --test core/test/project-events.test.js core/test/project-notifications.test.js core/test/daily-project-summary.test.js core/test/maintenance-ledger.test.js core/test/global-consolidation.test.js core/test/workspace-module-split.test.js core/test/ledger-jsonl-migration.test.js`：37/37 passing。
- `npm test`：661/661 passing。
- `rg -n 'ledger.yaml|export \* from' core/src core/test docs README.md README.en.md` 已执行。剩余命中分类：
  - `core/src/analysis/index.js`、`core/test/analysis-*`、`core/test/claude-status-surface.test.js`、`core/test/opencode-status.test.js`：analysis lane 的独立 `analysis/.../ledger.yaml` 契约，非 C17-M5 maintenance/project-events/project-notifications JSONL authority。
  - `core/test/ledger-jsonl-migration.test.js`：迁移测试本身保留 `ledger.yaml` 源、禁止旧 authority 和 broad barrel 的断言。
  - `core/test/explain-contract.test.js`：临时 fixture 写入 `export * from './commands/index.js'` 用于 explain 扫描场景，不是生产 root。
  - `core/test/maintenance-backup-policy.test.js`：恶意 `attacker-controlled-ledger.yaml` 输入路径，用于验证不会被当作 authority。
  - `core/test/knowledge-ledger.test.js`：历史 evidence ref 字符串。
  - `core/src/audit-inventory/index.js`：审计扫描 pattern。
  - `core/src/batch-plan/index.js`：普通关键词 regex，不是路径 authority 或 export。

## 未改生产代码声明

本次 test revision worker 只修改测试文件和本证据文件；未修改 `core/src`、CLI、docs、package manifests、`.pipeline/state.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md` 或 `.pipeline/continuation.yaml`。
