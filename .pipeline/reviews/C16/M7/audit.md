# C16-M7 Audit: Global Knowledge Rules And Secret Reference Projections

审计时间：2026-05-19T23:20:00+08:00

## 结论

PASS with warnings。

未发现 blocker。实现满足本轮核心安全边界：Global Knowledge projection 只从 compact/index surfaces、global authored records、accepted consolidation candidates 构造输出；pending/rejected candidates 未进入 projection；infrastructure facts 保留 review metadata 并去除 raw details；effective rules matrix 保留 `cycle > project > global > builtin` 及 winner/override evidence；secret capability projection 为 metadata-only；Notion-projectable summary 未投影 raw Knowledge、raw blocks/messages 或 raw secret store。

## Findings

### Warning 1: compact evidence_refs 在无 path 但有 evidence_refs 时被丢弃

- 位置：`core/src/knowledge/projections.js:41`
- 现象：`compact.evidence_refs || compact.path ? [compact.path].flat().filter(Boolean) : []` 受运算符优先级影响，当 compact 只有 `evidence_refs`、没有 `path` 时，输出为空；当同时有 `evidence_refs` 和 `path` 时，也只保留 `path`。
- 影响：不造成 raw 泄漏，但会削弱 Global Knowledge compact entry 的证据追踪，后续 M8/M9 构造 review pack 或 Notion projection 时可能缺少 authored evidence。
- 复现：

```bash
node --input-type=module <<'EOF'
import { buildGlobalKnowledgeProjection } from './core/src/index.js';
const projection = buildGlobalKnowledgeProjection({
  project_surfaces: [{
    object_id: 'evidence-only',
    compact: {
      title: 'Evidence-only compact',
      summary: 'Safe compact with evidence only.',
      evidence_refs: ['compact-evidence-ref'],
    },
  }],
});
console.log(JSON.stringify(projection.entries[0], null, 2));
EOF
```

实际输出没有 `evidence_refs`。建议后续改为显式合并 `compact.evidence_refs || (compact.path ? [compact.path] : [])`，或合并两者。

### Warning 2: Notion summary 中构造的 safe blocks 被 sanitizer 全量删除

- 位置：`core/src/knowledge/projections.js:149-172` 与 `core/src/knowledge/projections.js:14-22`
- 现象：`buildNotionProjectableGlobalSummary` 构造了安全 `blocks`，但 `sanitizeProjection` 将任意 key 为 `blocks` 的字段视为 raw container 并删除。因此实际 projection 只有 `summaries` 和 `secret_refs`，没有 `blocks`。
- 影响：不造成 raw 泄漏；当前测试允许 `blocks` 或 `summaries` 任一存在，因此通过。但如果 M8/M9 的 Notion dry-run/apply 期待 block-shaped payload，这会形成集成缺口或 false sense of coverage。
- 证据：serialization probe 输出 `notion_blocks_present: false`，同时 `notion_summaries` 和 `notion_secret_refs` 均存在。

## Evidence

- `references/knowledge-spec.md:121-132` 明确 Global Knowledge 只允许 compact summaries、Knowledge index entries、global authored records、accepted consolidation candidates，并禁止 raw records/details/messages/blocks。
- `core/src/knowledge/projections.js:26-97` 只遍历 `project_surfaces[].compact`、`project_surfaces[].indexes[].entries`、`global_authored_records`、accepted `consolidation_candidates`，返回 `raw_project_records_copied: false`。
- `core/src/knowledge/projections.js:76-89` 对 consolidation candidates 使用 `isAccepted` 过滤；pending/rejected 未进入 `entries`。
- `core/src/knowledge/projections.js:100-116` infrastructure fact projection 只保留 `id/kind/title/summary/sensitivity/freshness/authority/source_ref/evidence_refs`，不复制 `details`。
- `references/rules-spec.md:195-201` 要求 precedence 为 `cycle > project > global > builtin`，且 winner/override 保留 `source_path/source/evidence_refs`。
- `core/src/rules/index.js:154-197` 输出 `precedence: "cycle > project > global > builtin"`，并将 effective 与 overrides 都通过 `ruleProjectionRef` 保留 source/evidence。
- `references/secret-store-spec.md:5-23` 要求 secret capability projection 只暴露 metadata，并禁止 raw credential 字段名或值。
- `core/src/secrets/index.js:3-36` 只输出 `provider/kind/scope/capabilities/allowed_for/dependent_projects/health/redaction_policy/secret_ref/evidence_refs`，并设置 `raw_values_projected: false`。
- `core/src/knowledge/projections.js:175-194` 通用 sanitizer 删除 forbidden secret keys 和 raw container keys；`core/src/knowledge/projections.js:223-237` 对明显 secret-like string 做值级 redaction。
- `core/src/index.js` 已导出 `knowledge` 与 `secrets` API，测试通过确认 projection helpers 可从包入口访问。

## Tests

已运行：

```bash
node --test core/test/global-knowledge-index.test.js core/test/rules-authority.test.js core/test/secret-ref-projection.test.js
```

结果：12/12 passing。

```bash
node --test core/test/knowledge-ledger.test.js core/test/knowledge-hooks.test.js
```

结果：11/11 passing。

```bash
cd core && npm test
```

结果：570/570 passing。

```bash
git diff --check
```

结果：passing，无 whitespace errors。

额外只读 serialization probe：

- 混入 `raw_records`、`details`、`messages`、`blocks`、pending/rejected candidates、raw secret field names 和 raw secret marker values。
- 检查 projection JSON 中没有 `raw_value/value/token/api_key/password/authorization/access_token/refresh_token/client_secret` 等 forbidden key。
- 检查 raw marker values 未出现在输出。
- 注意 `raw_values_projected:false`、`raw_project_records_copied:false`、`raw_knowledge_projected:false`、`raw_secret_store_projected:false` 作为安全边界声明，不判为泄漏。
- 结果：

```json
{
  "status": "PASS",
  "global_entries": 4,
  "infra_facts": 1,
  "secret_refs": 1,
  "notion_summaries": 4,
  "notion_secret_refs": 1,
  "notion_blocks_present": false,
  "forbidden_key_hits": 0,
  "matrix_precedence": "cycle > project > global > builtin"
}
```

## Residual Risks

- Sanitizer 以字段名全局删除 `details/messages/blocks/endpoint`，安全上保守，但会删除任何同名的已安全归纳字段。当前对 M7 安全边界是正向的，对 M8/M9 的 Notion payload 形状可能需要显式字段名或上下文敏感 sanitizer。
- `isAccepted` 默认缺失 status 为 accepted。当前 global authored records 和 compact/index entries 不依赖 status；对 consolidation candidates 如果上游遗漏 status，候选会被接纳。若候选来源未来不保证 status，总线层应要求 consolidation candidate status 必填。
- 测试主要覆盖 helper-level in-memory fixtures，尚未覆盖真实 artifact catalog/workspace authority 到 projection 的端到端装配。M8 应补 dry-run review pack 级别的 projection serialization check。

## Post-Audit Resolution

更新时间：2026-05-19T23:26:05+08:00

审计 warning 已在主线程修订中解决：

- Warning 1 已修复：`compact.evidence_refs` 在无 `path` 时保留，并新增回归断言覆盖 evidence-only compact surface。
- Warning 2 已修复：由 `buildNotionProjectableGlobalSummary` 构造的 safe `blocks` 现在保留，并新增回归断言覆盖 summary block 与 secret_ref block。raw blocks 仍通过 `raw_records` / `raw_knowledge_records` 容器过滤。

修订后验证：

- `node --test core/test/global-knowledge-index.test.js core/test/rules-authority.test.js core/test/secret-ref-projection.test.js`：12/12 passing。
- `node --test core/test/knowledge-ledger.test.js core/test/knowledge-hooks.test.js`：11/11 passing。
- 自定义 projection serialization probe：`leak=false`，`evidenceRefs=["probe:evidence"]`，`safeBlocks=true`。
- `cd core && npm test`：570/570 passing。
- `git diff --check`：passing。

## Reviewed Scope

- `core/src/knowledge/projections.js`
- `core/src/knowledge/index.js`
- `core/src/secrets/index.js`
- `core/src/rules/index.js`
- `core/src/index.js`
- `references/knowledge-spec.md`
- `references/rules-spec.md`
- `references/secret-store-spec.md`
- `core/test/global-knowledge-index.test.js`
- `core/test/secret-ref-projection.test.js`
- `core/test/rules-authority.test.js`
- `.pipeline/reviews/C16/M7/test-evidence.md`
- `.pipeline/reviews/C16/M7/implementation-evidence.md`
