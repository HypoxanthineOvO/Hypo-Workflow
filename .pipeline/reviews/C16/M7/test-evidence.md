# C16-M7 Test Evidence

生成时间：2026-05-19T15:45:00+08:00

## 写入文件

- `core/test/global-knowledge-index.test.js`
  - 新增 Global Knowledge projection RED 测试。
  - 覆盖 compact/index surfaces、global authored records、accepted consolidation candidates。
  - 审计修订后追加 evidence-only compact surface 回归断言，确保无 `path` 时仍保留 `evidence_refs`。
  - 覆盖 infrastructure facts 的 `sensitivity`、`freshness`、`authority`、`evidence_refs` 字段。
  - 覆盖 Notion-projectable summary 只接收 accepted/safe summaries 与 metadata-only secret refs。
  - 审计修订后追加 safe Notion `blocks` 回归断言，确保 summary block 与 secret_ref block 保留给后续 dry-run/apply payload。
  - 显式放入 `raw_records`、`details`、`messages`、`blocks`、raw secret markers，断言不会进入 projection。
- `core/test/secret-ref-projection.test.js`
  - 新增 Secret capability projection RED 测试。
  - 覆盖 `provider`、`allowed_for`、`health`、`redaction_policy`、`secret_ref` metadata-only。
  - 断言 projection 不包含 `raw_value`、`value`、`token`、`api_key`、`password`、`authorization` 等 raw secret 字段。
- `core/test/rules-authority.test.js`
  - 小幅追加 effective rules matrix 合约测试。
  - 断言 precedence 为 `cycle > project > global > builtin`。
  - 断言每个 override 都带 `source_path`、`source`、`evidence_refs`。

未新增 fixture；本轮使用纯内存 fixture，避免依赖真实外部环境和用户本地 secret store。

## RED 命令

```bash
node --test core/test/global-knowledge-index.test.js core/test/rules-authority.test.js core/test/secret-ref-projection.test.js
```

结果：RED，12 个测试中 6 pass / 6 fail。

失败点符合预期，均为缺少 M7 projection API/export：

- `buildGlobalKnowledgeProjection must be exported`
- `buildInfrastructureFactProjection must be exported`
- `buildNotionProjectableGlobalSummary must be exported`
- `buildEffectiveRulesMatrix must be exported`
- `buildSecretCapabilityProjection must be exported`

已有 rules authority 基础测试仍通过，说明新增 matrix 测试没有破坏现有规则测试加载。

## 邻近回归命令

```bash
node --test core/test/knowledge-ledger.test.js core/test/knowledge-hooks.test.js
```

结果：PASS，11 个测试全部通过。

`knowledge-hooks.test.js` 存在并已运行，无需替代邻近测试。

## 预期实现 API

实现 worker 可按以下名称导出，或提供等价清晰命名并同步测试：

- `buildGlobalKnowledgeProjection(input)`
  - 聚合 compact/index surfaces、authored global records、accepted consolidation candidates。
  - 不 bulk copy project raw records/details/messages/blocks。
  - pending/rejected consolidation candidates 不进入 authoritative projection。
- `buildInfrastructureFactProjection(input)`
  - 输出 infrastructure fact projection。
  - 每条 fact 保留 `sensitivity`、`freshness`、`authority`、`evidence_refs`。
  - 不输出 raw secret-bearing fields。
- `buildEffectiveRulesMatrix(input)`
  - 输出 precedence `cycle > project > global > builtin`。
  - effective winner 和 overrides 保留 source/evidence。
- `buildSecretCapabilityProjection(input)`
  - 输出 provider、allowed_for、health、redaction policy、secret_ref metadata-only。
  - 不输出 raw secret values 或 raw secret field names。
- `buildNotionProjectableGlobalSummary(input)`
  - 只输出 accepted summaries / safe projection records。
  - 不将 raw Knowledge、raw secret store 或 raw blocks/messages 投影到 Notion。

## Fixture Intent

测试中的 fixture 故意混入以下危险输入，作为泄漏哨兵：

- raw project Knowledge records: `raw_records`、`details`、`messages`、`blocks`
- raw consolidation candidates: `pending_review`、`rejected`
- raw secret fields: `value`、`token`、`api_key`、`password`、`authorization`
- raw marker strings: `RAW_*_SHOULD_NOT_PROJECT`、`sk-*-secret`、`raw-*-token`

期望实现从安全 projection surfaces 生成输出，而不是对输入整体深拷贝后简单脱敏。
