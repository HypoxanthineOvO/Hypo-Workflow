# C16-M8 Test Evidence

## Scope

Worker: test

Step: `write_tests`

只新增 RED 测试和测试证据；未修改生产代码，未修改受保护的 `.pipeline/state.yaml`、`.pipeline/cycle.yaml`、`.pipeline/rules.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md`、`.pipeline/continuation.yaml` 或 `.pipeline/.lock`。

## 新增测试

- `core/test/root-management-dry-run.test.js`

覆盖合约：

- `/hw:maintain plan` 端到端 dry-run review bundle 从 workspace/object registry、artifact catalog、storage sync template、Notion dry-run、maintenance queue/run planner、global projections、backups preview 组装。
- bundle 输出包含 `kind`、`schema_version`、`bundle_id`、`bundle_hash`、`generated_at`、`evidence_root`、`sections`、`review_report`。
- `bundle_hash` 对同一内容稳定，`generated_at` 和输出路径不破坏内容 hash；允许以 `instance_id` 区分实例。
- unchanged/conflict/stale/secret-containing fixture 被分入 `local_write_candidates`、`remote_write_candidates`、`external_action_candidates`、`conflicts`、`confirmation_requirements`、`redaction_scan`。
- bundle/report 序列化不包含 raw secret 字段和值，不包含 raw Knowledge `raw_records` / `messages`；允许 `local_secret:*` 和 metadata-only secret refs。
- Notion、publication、external actions 全部 dry-run/no-write：`remote_writes_enabled=false`，operation `dry_run`，throwing fake client 的 write/apply/publish hook 不应被调用。
- 中文 review report 包含 bundle hash、脱敏证据、no-write evidence、本地/远程/外部候选、冲突和用户确认门禁。

## RED 命令

```bash
node --test core/test/root-management-dry-run.test.js core/test/sync-derived-map.test.js core/test/response-contract.test.js
```

结果：RED，符合预期。

摘要：

- 总计 13 tests。
- 通过 7：`core/test/sync-derived-map.test.js` 和 `core/test/response-contract.test.js` 均通过。
- 失败 6：全部来自新增 `core/test/root-management-dry-run.test.js`。

预期失败点：

```text
expected buildRootManagementDryRunBundle to be exported from ../src/index.js
actual: undefined
expected: function
```

解释：C16-M8 生产编排 API 尚未实现/导出，新增测试当前作为 RED 契约锁定后续实现目标。

## 邻近回归命令

```bash
node --test core/test/global-knowledge-index.test.js core/test/storage-sync-template.test.js core/test/notion-project-home-dry-run.test.js core/test/maintenance-run.test.js
```

结果：PASS。

摘要：

- 总计 13 tests。
- 通过 13。
- 失败 0。

邻近覆盖面：

- M3 storage sync template 和 Notion Project Home dry-run。
- M5 maintenance run planner/lifecycle。
- M6/M7 global knowledge projection、secret refs 和 Notion-projectable safe summary。

## 后续实现提示

生产实现需要从 `core/src/index.js` 导出 `buildRootManagementDryRunBundle(input, options)`，并满足新增测试中的 bundle schema、稳定 hash、redaction scan、candidate bucket、no-write fake client 和中文报告合约。
