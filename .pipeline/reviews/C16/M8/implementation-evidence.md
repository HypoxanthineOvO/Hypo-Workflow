# C16-M8 Implementation Evidence

## 修改文件

- `core/src/maintenance/root-dry-run.js`
- `core/src/maintenance/index.js`
- `core/test/root-management-dry-run.test.js`

## API

- `buildRootManagementDryRunBundle(input, options)`
  - 生成 `kind: root_management_dry_run_review_bundle` 的端到端 dry-run review bundle。
  - 组合 workspace draft、object registry、artifact catalog、storage sync template、Notion merge dry-run、maintenance queue、run plans、global projections、backups preview 和 redaction scan。
  - 输出 stable `bundle_hash` / `content_hash`，hash 排除 `generated_at` 和输出路径。
  - 设置 `remote_writes_enabled:false`、`apply_enabled:false`、`external_actions_enabled:false`。
- `renderRootDryRunReviewReport(bundle, options)`
  - 渲染中文 review report。
  - 包含 bundle hash、脱敏证据、metadata-only secret refs、no-write evidence、本地/远程/外部候选、冲突和用户确认门禁。

## No-Write And Redaction

- `client` / `clients` / function values 不进入 bundle 序列化。
- Notion、publication、external action 只作为 dry-run candidates / operations 出现。
- raw Knowledge containers、raw secret fields 和 secret-looking marker values 会被移除或 redacted。
- `local_secret:*`、`metadata_only`、`secret_ref` 等 metadata-only secret references 保留。

## Audit Revision

Dirac audit failed the first implementation because raw Knowledge `blocks` / `raw_blocks` containers and ordinary raw block text could enter the bundle. The revision:

- Adds regression coverage for ordinary non-secret raw block text in `blocks` and `raw_blocks`.
- Removes `blocks`, `raw_blocks`, and `raw_blocks_payload` in the bundle sanitizer.
- Normalizes Notion dry-run operation `action` to `dry-run`.
- Preserves the upstream write-looking intent only as `planned_operation` metadata.

## 验证结果

```text
node --test core/test/root-management-dry-run.test.js core/test/sync-derived-map.test.js core/test/response-contract.test.js
pass: 14/14
```

```text
node --test core/test/global-knowledge-index.test.js core/test/storage-sync-template.test.js core/test/notion-project-home-dry-run.test.js core/test/maintenance-run.test.js
pass: 13/13
```

```text
cd core && npm test
pass: 577/577
```

```text
git diff --check
pass: no whitespace errors
```

Audit revision probe:

```text
raw block leak probe
pass: hasBlocksKey=false, hasRawText=false, action=dry-run, planned_operation=update_remote_block
```

## 边界说明

- 未执行 Notion、publication 或 external write hooks。
- 未写入真实 dry-run bundle 文件；当前实现返回可序列化 bundle，后续 M9 apply gate 可选择写入 evidence root。
- 未修改 package manifests。
- 实现由主线程完成；test worker Dalton 与 audit worker Dirac 为独立 worker。
