# C16-M7 Implementation Evidence

## 修改文件

- `core/src/knowledge/projections.js`
- `core/src/knowledge/index.js`
- `core/src/rules/index.js`
- `core/src/secrets/index.js`
- `core/src/index.js`
- `references/knowledge-spec.md`
- `references/rules-spec.md`
- `references/secret-store-spec.md`

## API

- `buildGlobalKnowledgeProjection`
  - 聚合 project compact、Knowledge index entries、global authored records、accepted consolidation candidates。
  - 不复制 `raw_records`、`details`、`messages`、`blocks`。
  - pending/rejected consolidation candidates 不进入 projection。
- `buildInfrastructureFactProjection`
  - 保留 `id`、`sensitivity`、`freshness`、`authority`、`evidence_refs` 等元数据。
  - 移除 raw detail payload 和 secret-bearing fields。
- `buildEffectiveRulesMatrix`
  - 输出 precedence: `cycle > project > global > builtin`。
  - winner 和 overrides 均保留 `source_path`、`source`、`evidence_refs`。
- `buildSecretCapabilityProjection`
  - 只输出 metadata-only secret refs: provider、allowed_for、health、redaction_policy、`secret_ref.store_ref`。
  - 不输出 `raw_value`、`value`、`token`、`api_key`、`password`、`authorization` 等字段名或值。
- `buildNotionProjectableGlobalSummary`
  - 只输出 accepted safe summaries 和 metadata-only secret refs。
  - 不投影 raw Knowledge、raw secret store、raw blocks/messages。

## Projection Sanitizer

新增 strict projection sanitizer：

- 删除 forbidden secret field names: `raw_value`、`value`、`token`、`api_key`、`password`、`authorization`、`access_token`、`refresh_token`、`client_secret`、`secret`。
- 删除 raw container fields: `raw_records`、`raw_knowledge_records`、`raw_secret_store`、`details`、`messages`、`endpoint`。
- 对明显 raw secret values 进行值级 redaction，同时保留合法 metadata refs，例如 `secret_refs` category 和 `local_secret:*` store refs。
- 审计 warning 修订：保留无 `path` compact surface 的 `evidence_refs`，并允许由 `buildNotionProjectableGlobalSummary` 构造的安全 Notion `blocks` 输出；raw blocks 仍通过 `raw_records` / `raw_knowledge_records` 容器过滤。

## 验证结果

```text
node --test core/test/global-knowledge-index.test.js core/test/rules-authority.test.js core/test/secret-ref-projection.test.js
pass: 12/12
```

```text
node --test core/test/knowledge-ledger.test.js core/test/knowledge-hooks.test.js
pass: 11/11
```

```text
cd core && npm test
pass: 570/570
```

```text
git diff --check
pass: no whitespace errors
```

审计 warning 修订后补充验证：

```text
custom projection serialization probe
pass: leak=false, evidenceRefs=["probe:evidence"], safeBlocks=true
```

## 边界说明

- 未修改 `core/test/**`。
- 未修改 package manifests。
- 未写入 `.pipeline/state.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md`、`.pipeline/cycle.yaml`、`.pipeline/rules.yaml`。
- `core/src/index.js` 已存在其他并行改动；本轮只追加 `./secrets/index.js` 导出以暴露 M7 API。
