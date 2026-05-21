# C17-M5 Test Evidence - Ledger JSONL Migration And Barrel Export Cleanup

## 测试 worker 范围声明

- 本轮身份：C17-M5 test worker，只编写 RED 测试/扫描和测试证据。
- 新增测试：`core/test/ledger-jsonl-migration.test.js`
- 新增证据：`.pipeline/reviews/C17/M5/test-evidence.md`
- 未修改生产代码、docs、package manifest、既有测试文件、`.pipeline/state.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md`、`.pipeline/continuation.yaml`。
- 工作树已有大量非本 worker 修改；本证据只声明上述新增文件。

## RED 覆盖目标

新增 `core/test/ledger-jsonl-migration.test.js` 覆盖 C17-M5 的 ledger 与 export 契约：

1. shared JSONL ledger helper API 必须存在并从 public core surface 导出：
   - `appendJsonlLedgerEntry`
   - `readJsonlLedger`
   - `migrateYamlLedgerToJsonl`
   - `writeCompactLedgerSummary`
2. append-only 行为：连续追加 3 条事件时，后续文件内容必须以旧快照为前缀；每行可独立 `JSON.parse`；读取顺序保持 `evt-001`、`evt-002`、`evt-003`。
3. 一次性 YAML -> JSONL migration 必须 idempotent：首次从 `ledger.yaml` 生成 `ledger.jsonl` 与 `ledger.summary.yaml`；第二次迁移不重复追加，`migrated_count` 为 0。
4. compact YAML summary 必须确定性生成，保留 `event_count`、`latest_event_id`、`event_ids`、`authority: jsonl`，且不保留完整 `events` 作为新写入 authority。
5. 受影响写入路径必须返回/写入 `.jsonl` authority：
   - maintenance ledger：`appendMaintenanceLedgerEvent`
   - project-events：`emitProjectEvent`
   - project-notifications：`enqueueProjectStopNotification`
   - daily-summary：`runDailyProjectSummaryScheduler`
   - consolidation ledger：`runMaintenanceScheduler`
6. 静态扫描必须失败直到生产代码清理：
   - `core/src` 不应保留长期 `ledger.yaml` 写入/路径 authority。
   - public root `core/src/index.js` 不应继续使用 broad `export * from`。

## 预期 API/路径说明

- 当前测试采用需求中建议的 helper 名称：`appendJsonlLedgerEntry`、`readJsonlLedger`、`migrateYamlLedgerToJsonl`、`writeCompactLedgerSummary`。
- 如实现者选择不同命名，需要在实现证据中说明映射，并同步测试到实际 public API。
- 预期默认 authority 文件为 `.jsonl`，compact YAML summary 仅为人读状态面，不参与长期 dual write。
- 旧 `ledger.yaml` 只允许作为一次性 migration input 或 legacy/migration 说明出现，不应继续被新写入路径重写。

## 验证命令与结果

### 新增 RED 测试

命令：

```bash
node --test core/test/ledger-jsonl-migration.test.js
```

结果：失败，符合 RED 预期。

摘要：

```text
tests 6
pass 0
fail 6
```

关键失败原因：

- `appendJsonlLedgerEntry` 未从 `core/src/index.js` 导出。
- `readJsonlLedger`、`migrateYamlLedgerToJsonl`、`writeCompactLedgerSummary` 也尚不存在/未导出。
- `appendMaintenanceLedgerEvent` 当前返回 `/tmp/.../maintenance/ledger.yaml`，不是 `.jsonl` authority。
- public root `core/src/index.js` 仍有 60 条 `export * from ...` broad barrel。
- 静态测试发现生产写入/路径 authority 仍指向 `ledger.yaml`：
  - `core/src/project-events/index.js:341`
  - `core/src/maintenance/index.js:596`
  - `core/src/maintenance/daily-project-summary.js:343`
  - `core/src/maintenance/consolidation.js:390`

### 既有相关测试基线

命令：

```bash
node --test core/test/project-events.test.js core/test/project-notifications.test.js core/test/daily-project-summary.test.js core/test/maintenance-ledger.test.js
```

结果：通过。

摘要：

```text
tests 21
pass 21
fail 0
```

补充命令：

```bash
node --test core/test/global-consolidation.test.js
```

结果：通过。

摘要：

```text
tests 5
pass 5
fail 0
```

说明：既有行为基线仍可运行，但仍基于 YAML ledger 路径；新增 RED 测试用于推动 authority 切换到 JSONL。

### 建议扫描

命令：

```bash
rg -n 'ledger.yaml|export \* from' core/src core/test docs README.md README.en.md
```

结果：失败，当前仍有匹配。

分类摘要：

- 必须处理的生产写入/路径 authority：
  - `core/src/project-events/index.js:341`
  - `core/src/maintenance/index.js:596`
  - `core/src/maintenance/daily-project-summary.js:343`
  - `core/src/maintenance/consolidation.js:390`
- public core export surface：
  - `core/src/index.js:1-60` 全部为 broad `export * from ...`。
- 生产代码中其他 `ledger.yaml` 匹配需实现/审计分类：
  - `core/src/analysis/index.js` 当前属于 analysis ledger 旧路径/提示文本，是否纳入 C17-M5 迁移范围需实现者与审计确认。
  - `core/src/audit-inventory/index.js` 是扫描规则自身匹配。
  - `core/src/batch-plan/index.js` 是关键词正则，不是 ledger 写入。
- `core/test` 中存在旧 YAML 断言和新增 migration 测试用例；这些应随实现更新或作为 legacy/migration fixture 分类。
- `docs README.md README.en.md` 本次扫描无匹配。

## 当前 RED 结论

C17-M5 尚未满足 append-only JSONL ledger 与 public core export cleanup 契约。实现者需要新增 shared JSONL ledger helper，完成一次性 YAML -> JSONL migration 与 compact YAML summary，迁移 project-events、maintenance ledger、project-notifications、daily-summary、consolidation 的新写入 authority，并清理 `core/src/index.js` 的 broad `export *` public surface。
