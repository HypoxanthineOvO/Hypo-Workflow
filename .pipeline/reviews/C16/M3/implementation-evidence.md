# C16-M3 Implementation Evidence

## 修改文件

- `core/src/storage-sync/index.js`
  - 新增 backend-neutral Storage Sync Template builder/validator。
  - 新增 Notion Project Home read-only dry-run planner。
  - 新增 canonical JSON、sha256 operation hash、递归脱敏和 Notion-specific field 移除逻辑。
- `core/src/index.js`
  - 添加 `./storage-sync/index.js` root export。

## API

- `buildStorageSyncTemplate(input, options)`
  - 输出 `kind=storage_sync_template`、`model=backend-neutral-projection`。
  - Project Home slots 固定为 `overview/progress/architecture/knowledge/docs/prompts_index/reports_index/legacy_links/sync_status`。
  - 模板递归移除 Notion-specific fields：`page_id`、`block_id`、`rich_text`、`property_id`、`database_id`、`notion_*`。
- `validateStorageSyncTemplate(template, options)`
  - 校验 backend-neutral model、slot 顺序、slot authority/source 和 Notion-specific fields。
- `planNotionProjectHomeDryRun(input, options)`
  - 只调用 read-capable `client.discoverProjectHome`。
  - 输出 evidence phases：`discover`、`classify`、`bind`、`merge-plan`、`dry-run`。
  - legacy blocks 先分类为 `merge_input`，再生成 `merge-plan` 和 `dry-run` operations。
  - operations 使用 stable canonical JSON + sha256 生成 `operation_hash`。

## No-write / Redaction

- Notion dry-run 强制 `remote_writes_enabled=false`，operation `action` 固定为 `dry-run`，不调用 `appendBlock`、`updateBlock`、`createPage`、`deleteBlock` 等 write-capable client methods。
- Template、evidence、operations 对 secret-looking keys/values 递归脱敏，覆盖 `token`、`api_key`、`password`、`authorization`、`notion_token` 等 raw 值。

## 验证结果

```bash
node --test core/test/storage-sync-template.test.js core/test/notion-project-home-dry-run.test.js
```

结果：6 tests passed。

```bash
node --test core/test/artifact-catalog.test.js core/test/workspace-authority.test.js
```

结果：11 tests passed。
