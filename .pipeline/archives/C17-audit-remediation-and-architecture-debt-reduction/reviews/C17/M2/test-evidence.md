# C17-M2 Test Evidence

## 新增/修改文件

- 新增 `core/test/layered-config-integration.test.js`
- 新增 `.pipeline/reviews/C17/M2/test-evidence.md`
- 未新增 `core/test/fixtures/**` 夹具。
- 未修改生产代码、CLI 代码、schema、docs、state/log/progress/continuation，也未修改任何既有测试文件。

## RED 结果

### `node --test core/test/layered-config-integration.test.js`

结果：RED，5/5 failing。

失败原因：

1. 缺少预期 C17-M2 公共接口导出：
   - `loadLayeredConfig`
   - `buildConfigMigrationPlan`
   - `renderConfigMigrationPrompt`
   - `writeUserConfigMigration`
2. runtime/source hardcoded path 扫描仍发现 `/home/heyx`：
   - `core/src/project-events/index.js:131`
   - `core/src/project-events/index.js:257`
   - `core/src/workspace/index.js:62`
   - `core/src/workspace/index.js:63`
   - `core/src/workspace/index.js:70`
   - `core/src/workspace/index.js:78`
   - `core/src/workspace/index.js:86`
   - `core/src/workspace/index.js:94`
   - `core/src/workspace/index.js:102`
   - `core/src/workspace/index.js:110`
   - `core/src/workspace/index.js:118`
   - `core/src/workspace/index.js:1062`
   - 以及后续 Hypo-Claw bridge 和 `scripts/*.sh` 命中。

### `npm test`

结果：RED，645 tests 中 640 pass、5 fail。

失败均来自新增 `core/test/layered-config-integration.test.js`，符合实现前 RED 预期。

## `rg -n '/home/heyx' core/src scripts` 摘要

当前命中：

- `scripts/project-notification-dispatcher.sh:5`
- `scripts/project-notification-dispatcher.sh:7`
- `scripts/news-noon-scheduler.sh:5`
- `scripts/news-noon-scheduler.sh:7`
- `scripts/news-noon-scheduler.sh:19`
- `scripts/news-noon-scheduler.sh:20`
- `scripts/news-noon-scheduler.sh:32`
- `scripts/news-noon-scheduler.sh:33`
- `scripts/news-noon-scheduler.sh:37`
- `scripts/news-noon-scheduler.sh:38`
- `scripts/daily-summary-scheduler.sh:4`
- `scripts/maintenance-scheduler.sh:5`
- `core/src/project-events/index.js:131`
- `core/src/project-events/index.js:257`
- `core/src/workspace/index.js:62`
- `core/src/workspace/index.js:63`
- `core/src/workspace/index.js:70`
- `core/src/workspace/index.js:78`
- `core/src/workspace/index.js:86`
- `core/src/workspace/index.js:94`
- `core/src/workspace/index.js:102`
- `core/src/workspace/index.js:110`
- `core/src/workspace/index.js:118`
- `core/src/workspace/index.js:1062`
- `core/src/workspace/index.js:1063`
- `core/src/workspace/index.js:1082`
- `core/src/workspace/index.js:1084`

## 覆盖的最低断言

新增测试覆盖：

1. project `.pipeline/config.yaml` 覆盖 user `~/.hypo-workflow/config.yaml`，user 覆盖 safe defaults，并要求返回来源追踪。
2. integration 配置包含 `integrations.hypo_claw`、`integrations.hypo_writer`、`projects[]`、`output.timezone`、`project_linkage.seeds`，并断言相关默认值不包含 `/home/heyx`。
3. migration plan 默认 dry-run，只生成 user config 内容与目标路径，不写入 `~/.hypo-workflow/config.yaml`。
4. 只有显式 `writeUserConfigMigration(..., { confirm: true })` 会写 user config；`hypo-workflow sync` 不允许静默写用户配置，并应提示显式 migration 命令。
5. 通过 `buildAuditInventory()` 扫描 `core/src` 与 `scripts`，断言 runtime source/scripts 不再包含 forbidden `/home/heyx` 路径。

## 预期实现接口

测试按现有导出风格从 `core/src/index.js` 读取公共接口。建议实现者在 `core/src/config/index.js` 实现并由 barrel 导出：

- `loadLayeredConfig({ projectRoot, homeDir })`
  - 合并顺序：safe defaults < user config < project config。
  - 返回 `{ config, sources }` 或等价结构；测试接受 `result.config || result`，但要求 `sources.authority_order` 和关键字段来源。
- `buildConfigMigrationPlan({ homeDir, legacyDefaults })`
  - 默认 dry-run。
  - 返回目标 user config 路径、将写入的 YAML/content、`dry_run: true`。
- `renderConfigMigrationPrompt(plan, { command })`
  - 用于 sync/start 缺失 user config 时提示显式迁移命令。
  - 文案需表达 sync/start 不会静默写用户配置。
- `writeUserConfigMigration(plan, { confirm: true })`
  - 仅显式确认时写入 `~/.hypo-workflow/config.yaml`。
  - 返回 `{ path, written: true }` 或等价可验证结构。

如果实现者选择不同函数名，需要同步更新本测试并在实现证据中说明命名依据。

## 验证命令

已运行：

```bash
node --test core/test/layered-config-integration.test.js
rg -n '/home/heyx' core/src scripts
npm test
```

## 边界声明

本轮只作为 C17-M2 test worker 编写 RED 测试与测试证据。未实现生产逻辑，未修复 CLI 或 runtime/source 路径，未修改 Workflow state/log/progress/continuation。
