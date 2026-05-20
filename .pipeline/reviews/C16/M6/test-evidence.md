# C16-M6 Test Evidence - Scheduled Global Consolidation And Chat Backfill

## 新增测试文件

- `core/test/session-source-discovery.test.js`
  - 覆盖 `codex_sessions`、`opencode_sessions`、`claude_sessions`、`notion_pages` 四类 source discovery 接口。
  - 要求使用 safe local probes / fixture readers，不依赖真实环境路径，不启用网络，不触发 Notion 写入。
  - 要求 discovery 阶段先做 sensitivity classification 和 redaction。
- `core/test/maintenance-backfill.test.js`
  - 覆盖从 `2026-03-01` 开始的 historical backfill shard planning。
  - 覆盖 daily / weekly shards、稳定 inclusive/exclusive 边界、deterministic resume metadata/cursor。
  - 要求 resume state 只包含 cursor、shard id、record refs，不嵌入 raw content/messages/blocks。
- `core/test/global-consolidation.test.js`
  - 覆盖每日 `04:00 Asia/Shanghai` 的 system-initiated Maintenance Run contract。
  - 明确不是 pipeline runner，不要求 service restart，不启用 remote writes。
  - 覆盖中文沉淀输出：知识、规则/习惯、模板、项目关系、基础设施 candidate records/summary。
  - 覆盖 Notion projection 仅生成 dry-run payload，不自动 remote write/apply。

## 新增 fixture

- `core/test/fixtures/global-consolidation/codex_sessions/2026-05-18-session.json`
- `core/test/fixtures/global-consolidation/opencode_sessions/2026-05-18-session.jsonl`
- `core/test/fixtures/global-consolidation/claude_sessions/2026-05-19-transcript.md`
- `core/test/fixtures/global-consolidation/notion_pages/project-home-export.json`

Fixture intent:

- 覆盖四类会话/页面输入格式：JSON、JSONL、Markdown、Notion export JSON。
- Fixture 只做本地读取，不需要真实 Codex/OpenCode/Claude/Notion 目录。
- 每类 fixture 都包含一个 raw secret/token/password/authorization 风险样例，用于验证生成任何候选输出和 Notion dry-run payload 前必须先脱敏。

## 预期 API

测试期望 `../src/index.js` 导出以下 API：

- `discoverConsolidationSources`
- `planGlobalConsolidationRun`
- `planHistoricalBackfillShards`
- `buildConsolidationResumeState`
- `generateGlobalConsolidationOutputs`
- `projectConsolidationToNotionDryRun`

实现可以选择不同内部模块名，但导出 API 需要满足测试表达的合同，或者由 implement worker 同步调整测试中的清晰 API 名称。

## RED 命令与结果

命令：

```bash
node --test core/test/global-consolidation.test.js core/test/session-source-discovery.test.js core/test/maintenance-backfill.test.js
```

结果：RED，9 个测试全部失败，失败点均为缺少预期 API/export，不是环境或 fixture 缺失。

失败摘要：

- `planGlobalConsolidationRun` 未从 `../src/index.js` 导出。
- `discoverConsolidationSources` 未从 `../src/index.js` 导出。
- `projectConsolidationToNotionDryRun` 未从 `../src/index.js` 导出。
- `planHistoricalBackfillShards` 未从 `../src/index.js` 导出。
- `buildConsolidationResumeState` 由于 backfill planner API 缺失尚未执行到断言。
- `generateGlobalConsolidationOutputs` 由于 discovery API 缺失尚未执行到断言。

TAP 汇总：

```text
1..9
# tests 9
# pass 0
# fail 9
```

邻近验证：

```bash
node --test core/test/secret-ref-projection.test.js core/test/knowledge-ledger.test.js
```

结果：`core/test/secret-ref-projection.test.js` 不存在，命令失败于文件缺失。

单独运行：

```bash
node --test core/test/knowledge-ledger.test.js
```

结果：通过。

```text
1..8
# tests 8
# pass 8
# fail 0
```

## RED 覆盖意图

- Source discovery 必须是 safe local read，不能做真实网络写入或 Notion remote write。
- Daily run 必须是 system-initiated `maintenance_run`，不是 Cycle/Patch/Feature，也不是 pipeline runner。
- Scheduler contract 只声明 `04:00 Asia/Shanghai` 计划，不要求当前实现重启服务。
- Historical backfill 必须从 `2026-03-01` 开始，并支持 daily/weekly shard 与稳定 resume cursor。
- 所有 raw secrets/token/password/authorization 必须先 redaction/classification，再进入 knowledge/rule/template/relation/infrastructure candidates 或 Notion dry-run payload。
- 中文沉淀输出必须面向用户可读，命令名、字段名、source kind 可保留英文。
- Notion projection 必须保持 dry-run content only，不能自动 remote write/apply。
