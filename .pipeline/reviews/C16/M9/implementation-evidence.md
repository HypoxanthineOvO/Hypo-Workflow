# C16-M9 Implementation Evidence

## 修改文件

- `core/src/maintenance/root-dry-run.js`
- `core/test/notion-apply-gate.test.js`

## API

- `applyApprovedNotionDryRunBundle(input, options)`
  - 只消费 approved dry-run bundle。
  - 前置门禁拒绝缺少 `explicit_user_confirmation`、`dry_run_id`、`dry_run_hash`、`reviewed_apply_plan`、`target_page_ids` 或 bundle 的输入。
  - 重新计算 dry-run bundle content hash，拒绝 stale/mutated bundle。
  - 拒绝 unresolved conflicts、未确认 remote candidates、publication/external action candidates 和 external action operations。
  - 拒绝 raw secret fields/values、raw Knowledge `blocks/messages/raw_records` 和 raw operation payloads。
  - 只写入 reviewed apply plan 中批准且 operation hash 匹配的 Notion operation subset。
  - apply 后 re-read Notion target pages/blocks；验证通过后才将 queue item 标记为 `completed`。
  - 返回 sanitized `apply_result`、`verify_result`、`ledger_event` 和 apply/verify evidence refs。

## Safety Boundary

- 所有 preflight 失败都在任何 Notion write hook 前返回。
- `explicit_user_confirmation:false`、缺失/空 `target_page_ids`、以及 `reviewed_apply_plan.dry_run_id/dry_run_hash` 与输入 bundle 不一致都会在 preflight 阶段拒绝。
- Notion apply 的 target page id 只来自显式 `target_page_ids[target_ref]` 映射，不再从 operation 或 reviewed plan 的自带 page id fallback。
- Publication 和 generic external actions 在本 milestone 中一律拒绝。
- Operation drift 通过 operation id + operation hash 双重检查拒绝。
- Verification failed 时 queue item 停在 `verifying`，ledger status 为 `failed`，不会标记 completed。
- Ledger event 仅包含 sanitized metadata、apply/verify refs 和 redaction flags。

## Audit Revision

- 补充回归测试：`apply preflight rejects false confirmation, empty target maps, and reviewed plan bundle mismatch before writes`。
- 修复 false-but-present confirmation 被当作有效确认的问题。
- 修复空 `target_page_ids` 可通过 operation/reviewed plan 自带 `target_page_id` 绕过的问题。
- 修复 reviewed apply plan 未绑定输入 `dry_run_id` / `dry_run_hash` 的问题。
- 修复测试 fixture 中 unsafe/raw bundle 被默认 reviewed plan hash mismatch 遮蔽的问题，确保 raw payload / unsafe candidate 检查仍独立命中。

## Audit Recheck Revision

- Mendel 复核发现 `"not confirmed"` 和 `"I do not approve applying..."` 仍会被关键词正则误判为确认并写入。
- 字符串确认门禁已改为精确短语：`I explicitly approve applying reviewed Notion dry-run bundle <dry_run_id> with hash <dry_run_hash>`。
- 继续允许结构化调用方传入 boolean `true`，但任意自然语言关键词、否定确认、短语片段都不再通过字符串门禁。
- `reviewed_apply_plan.dry_run_id` 与 `reviewed_apply_plan.dry_run_hash` 已改为必填且必须匹配输入 bundle，关闭 “missing id/hash still writes” residual risk。
- 补充回归覆盖 `"not confirmed"`、`"I do not approve applying..."`、`"approve applying"` 和缺失 reviewed plan id/hash，均断言 `writes=0`。

## 验证结果

```text
node --test core/test/notion-apply-gate.test.js core/test/maintenance-ledger.test.js core/test/root-management-dry-run.test.js
pass: 18/18
```

```text
node --test core/test/notion-project-home-dry-run.test.js core/test/maintenance-run.test.js
pass: 8/8
```

```text
python -m pytest tests/test_notion_integration.py tests/test_notion_output_adapter.py tests/test_notion_mixed_mode.py
not run: python command unavailable
```

```text
python3 -m pytest tests/test_notion_integration.py tests/test_notion_output_adapter.py tests/test_notion_mixed_mode.py
exit 5: collected 0 tests
```

```text
cd core && npm test
pass: 585/585
```

```text
git diff --check
pass: no whitespace errors
```

```text
custom audit probes after revision
false_confirmation: ok=false, writes=0, error=explicit_user_confirmation
empty_targets: ok=false, writes=0, error=target_page_ids
plan_id_mismatch: ok=false, writes=0, error=reviewed_apply_plan.dry_run_id
```

```text
audit recheck revision coverage
negated_confirmed_string: rejected before write
negated_approval_string: rejected before write
casual_approve_string: rejected before write
reviewed_plan_missing_dry_run_id_hash: rejected before write
```

## 边界说明

- 未执行真实 Notion 网络写入；测试使用 fake Notion client 记录 write/read calls。
- 未写入真实 maintenance ledger 文件；helper 返回 sanitized ledger event，后续命令层可选择 append。
- 实现由主线程完成；test worker Tesla 独立提供 RED 测试。
