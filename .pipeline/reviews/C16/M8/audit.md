# C16-M8 Audit Review

审计时间：2026-05-19T23:44:00+08:00

结论：FAIL

## 审计范围

- `core/src/maintenance/root-dry-run.js`
- `core/src/maintenance/index.js`
- `core/test/root-management-dry-run.test.js`
- `.pipeline/reviews/C16/M8/test-evidence.md`
- `.pipeline/reviews/C16/M8/implementation-evidence.md`
- `.pipeline/prompts/07-end-to-end-dry-run-review-pack.md`

## 关键发现

### Critical：raw Knowledge block 容器和正文可进入 dry-run bundle

`core/src/maintenance/root-dry-run.js:4` 的 forbidden key 列表覆盖了 `raw_records`、`raw_knowledge_records`、`messages` 和 secret 字段，但没有覆盖 `blocks`、`raw_blocks` 或等价 raw Knowledge block 容器。`sanitizeBundleValue` 在 `core/src/maintenance/root-dry-run.js:267` 会递归保留未禁止的对象键；因此只要 block 正文不是 secret-looking marker，就会被原样保留到 bundle。

只读 serialization probe 结果：

```text
has_blocks_key: true
has_raw_blocks_key: true
has_raw_block_text: true
```

这违反本次审计重点 4：raw Knowledge records/messages/blocks 不应进入 bundle/report。现有测试里的 raw block 文本使用 `RAW_*_SHOULD_NOT_PROJECT` marker，会被 `sanitizeScalar` 替换为 `[REDACTED]`，但没有断言 `blocks` / `raw_blocks` 容器本身被删除，因此未覆盖普通 raw block 正文泄漏。

### Warning：Notion operation 的 `action` 字段未被强制归一为 dry-run

`buildNotionMergePlan` 在 `core/src/maintenance/root-dry-run.js:153` 保留传入的 `operation.action`，只在缺失时填充 `"dry-run"`，同时强制 `dry_run: true` 和 `remote_writes_enabled: false`。no-write flag 是正确的，但如果上游传入 `action: "update"`，bundle 会保留该动作标签。

只读 probe 观察到：

```text
notion_operation_action: update
```

这不会直接调用写入 hook，也不会打开 remote writes，但 review report 和后续 apply gate 可能把 action 标签误读为可执行动作。建议后续将 dry-run bundle 内的 Notion operation action 统一为 `dry-run`，并把原动作放入 `planned_operation` / `operation` 之类字段。

### Warning：implement worker separation 证据不完整

`.pipeline/prompts/07-end-to-end-dry-run-review-pack.md:17` 标注 worker separation 为 recommended，且 test worker Dalton 在 `.pipeline/log.yaml` 中有 start/complete 记录；`.pipeline/PROGRESS.md` 也记录 Dalton 负责 M8 RED 测试。实现阶段记录为 `step_complete`，`.pipeline/reviews/C16/M8/implementation-evidence.md` 未写明 implement worker id/nickname。

因此 Dalton 与主实现分离的证据是合理的，但“implement subworker”身份证据不完整。该项不构成本次 FAIL 的直接原因。

## 审计结论对照

- deterministic dry-run bundle hash：PASS。hash 输入在 `core/src/maintenance/root-dry-run.js:57` 仅包含 kind/schema/no-write flags/sections/review，不包含 `generated_at` 或 `outputPath`；指定测试和 probe 均验证稳定。
- no-write boundary：PASS。builder 未调用 Notion/publication/external client；`client` / `clients` / function values 会被过滤；remote/apply/external flags 固定为 false。
- action separation：PASS with warning。`local_write_candidates`、`remote_write_candidates`、`external_action_candidates`、`conflicts`、`confirmation_requirements` 均存在，remote/external candidates 强制 `dry_run=true` 和 `remote_writes_enabled=false`；但 Notion operation action 标签未强制归一为 dry-run。
- redaction：FAIL。raw secret fields/values 和 metadata-only `local_secret:*` 行为基本正确，但 raw Knowledge `blocks` / `raw_blocks` 可进入 bundle。
- 中文 review report：PASS。报告包含 bundle hash、脱敏证据、No-Write Evidence、本地/远程/外部候选、冲突和确认门禁。
- worker separation/evidence：PASS with warning。Dalton test worker 证据充分；implement worker 身份证据不足。

## 验证命令

```text
node --test core/test/root-management-dry-run.test.js core/test/sync-derived-map.test.js core/test/response-contract.test.js
结果：PASS，13/13
```

```text
node --test core/test/global-knowledge-index.test.js core/test/storage-sync-template.test.js core/test/notion-project-home-dry-run.test.js core/test/maintenance-run.test.js
结果：PASS，13/13
```

```text
cd core && npm test
结果：PASS，576/576
```

```text
git diff --check
结果：PASS，无 whitespace error 输出
```

```text
只读 serialization probe
结果：FAIL，确认 blocks/raw_blocks 和普通 raw block 正文进入 bundle；同时确认 hash 稳定、client/function 未进入 bundle、remote/external candidates dry_run=true 且 remote_writes_enabled=false。
```

## 建议修复

1. 在 dry-run bundle sanitizer 的 forbidden key 中加入 raw Knowledge block 容器，例如 `blocks`、`raw_blocks`，或更精确地在 Knowledge/raw container 上下文中删除 block payload，只保留 metadata/evidence refs。
2. 增加回归测试：输入普通非 secret raw Knowledge block 文本，断言 bundle/report 不包含 `blocks`、`raw_blocks` 和原始正文，同时保留 metadata-only secret refs。
3. 将 Notion dry-run bundle operation 的 `action` 统一输出为 `dry-run`，原始意图保留为非执行字段，避免 M9 apply gate 误读。
4. 补充 implement worker 身份证据，或明确记录本阶段实现由主 agent 完成且与 Dalton test worker 分离。

## Audit Recheck

复审时间：2026-05-19T23:50:54+08:00

复审结论：PASS

### 复审范围

- `core/src/maintenance/root-dry-run.js`
- `core/test/root-management-dry-run.test.js`
- `.pipeline/reviews/C16/M8/implementation-evidence.md`
- 原审计 blocker 和 warning 对应的 dry-run bundle serialization / action separation 行为

### 复审结果

- 原 Critical 已修复：`FORBIDDEN_BUNDLE_KEYS` 已包含 `blocks`、`raw_blocks`、`raw_blocks_payload`；只读 probe 确认 bundle/report 不再包含 block 容器或普通 raw block 正文。
- 原 Notion action warning 已修复：Notion operation `action` 统一输出为 `dry-run`，上游写入意图保留为 `planned_operation`。
- no-write 边界保持通过：client/function 未进入 bundle，remote/external candidates 保持 `dry_run=true` 和 `remote_writes_enabled=false`。
- redaction 复核通过：raw secret fields/values 未进入 bundle/report，metadata-only `local_secret:*` refs 保留。
- worker separation 证据补强：implementation evidence 说明实现由主线程完成，test worker Dalton 与 audit worker Dirac 独立；recommended 模式下可接受。

### 复审命令

```text
node --test core/test/root-management-dry-run.test.js core/test/sync-derived-map.test.js core/test/response-contract.test.js
结果：PASS，14/14
```

```text
node --test core/test/global-knowledge-index.test.js core/test/storage-sync-template.test.js core/test/notion-project-home-dry-run.test.js core/test/maintenance-run.test.js
结果：PASS，13/13
```

```text
cd core && npm test
结果：PASS，577/577
```

```text
git diff --check
结果：PASS，无 whitespace error 输出
```

```text
只读 serialization probe
结果：PASS，has_blocks_key=false，has_raw_block_text=false，has_client_key=false，has_function_result=false，has_raw_secret=false，notion_action=dry-run，planned_operation=update_remote_block，remote_writes_enabled=false
```

### 残余风险

未发现阻断项。M9 apply gate 仍需独立验证真实 apply 路径只接受已审阅 bundle，并重新检查外部/远程写入确认门禁。
