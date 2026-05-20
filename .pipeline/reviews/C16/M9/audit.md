# C16-M9 Audit Report

结论：FAIL

审计时间：2026-05-20T01:20:00+08:00

审计 worker：C16-M9 audit worker。与 test worker 证据、implement 证据分离；本轮只审计并写入本文件，未修改生产代码、测试或受保护状态文件。

## Scope

- `core/src/maintenance/root-dry-run.js`
- `core/src/maintenance/index.js`
- `core/test/notion-apply-gate.test.js`
- `core/test/root-management-dry-run.test.js`
- `.pipeline/reviews/C16/M9/test-evidence.md`
- `.pipeline/reviews/C16/M9/implementation-evidence.md`
- `.pipeline/prompts/08-final-gated-notion-apply-verification.md`

## Findings

### Critical: `explicit_user_confirmation` 只检查存在性，`false` 也会触发真实 Notion write

证据：

- `core/src/maintenance/root-dry-run.js:252-260` 的 `requiredApplyInputErrors` 只拒绝 `undefined`、`null`、空字符串。
- `core/src/maintenance/root-dry-run.js:109-123` 在该存在性检查后即进入 hash/payload/safety/operation gate；没有要求 confirmation 为 `true`、特定确认文本，或与 `dry_run_id`/目标页绑定。
- 只读 probe 结果：

```text
explicit_user_confirmation_false {"ok":true,"errors":[],"queue_status":"completed","writes":1}
```

影响：

- 不满足审计重点 1：apply cannot run without explicit confirmation。
- 调用方传入 `explicit_user_confirmation: false` 仍会执行 `applyNotionOperation`，然后 queue item 标记 `completed`。

建议：

- 将确认门禁改为强类型确认，例如必须为 `true` 且由命令层只在用户明确确认后设置，或要求确认对象包含 `confirmed: true`、`dry_run_id`、`dry_run_hash`、目标页集合和时间戳。
- 增加测试覆盖 `false`、`0`、`[]`、`{}`、普通 `"yes"` 与不匹配 dry-run/target 的确认输入。

### Critical: `target_page_ids` 可为空对象，operation 自带 `target_page_id` 会绕过 required target binding

证据：

- `core/src/maintenance/root-dry-run.js:252-260` 只检查 `target_page_ids` 字段存在，不检查对象非空或是否覆盖所有目标。
- `core/src/maintenance/root-dry-run.js:347-348` 调用 `resolveTargetPageId` 判断 target binding。
- `core/src/maintenance/root-dry-run.js:455-456` 的解析顺序优先使用 `planOperation.target_page_id` 或 `operation.target_page_id`，最后才读 `targetPageIds[operation.target_ref]`。
- 只读 probe 结果：

```text
target_page_ids_empty_object {"ok":true,"errors":[],"queue_status":"completed","writes":1}
```

影响：

- 不满足审计重点 1：required `target_page_ids` 没有真正强制用户提供目标绑定。
- 审核后目标绑定可被 dry-run bundle 或 reviewed plan 内字段替代，降低最终 apply 时的人工目标页确认强度。

建议：

- 对 apply preflight 要求 `target_page_ids` 是非空 plain object，且每个 approved operation 的 `target_ref` 必须在该对象中有显式绑定。
- `resolveTargetPageId` 在 apply 阶段不应让 bundle 内 `operation.target_page_id` 替代用户提供的 `target_page_ids`；最多可作为 drift 比对字段。

### Warning: `reviewed_apply_plan.dry_run_id/dry_run_hash` 未绑定到输入 dry-run bundle

证据：

- `approvedOperationErrors` 只检查 approved operation id、operation hash、target 和 action；未检查 `reviewed_apply_plan.dry_run_id`/`dry_run_hash` 与 `input.dry_run_id`/`input.dry_run_hash`/`bundle.bundle_id` 一致。
- 只读 probe 结果：

```text
{"ok":true,"errors":[],"writes":1,"ledger_dry_run_hash":"sha256:9f4d733ba7c17aa0201af9ad170d6511c9cd2f9d0bddeec5fd5e33bf3bb84923"}
```

影响：

- Operation hash 会挡住部分 drift，但 reviewed plan 可以声明不同 dry-run id/hash 而仍被接受。
- 这削弱“approved dry-run bundle”与“reviewed apply plan”的可审计绑定。

建议：

- preflight 显式拒绝 `reviewed_apply_plan.dry_run_id !== input.dry_run_id`、`reviewed_apply_plan.dry_run_hash !== input.dry_run_hash`、`input.dry_run_id !== bundle.bundle_id`。

## Positive Coverage

- stale/mutated bundle hash rejection 存在：`validateDryRunHash` 重新计算 content hash，并拒绝与输入 hash 或 `bundle.bundle_hash` 不一致的 bundle。
- raw secret/raw Knowledge gate 存在：`rawApplyPayloadErrors` 递归拒绝 forbidden keys，调用 `detectSecretLeaks`，并拒绝 `RAW_` marker。
- unresolved conflicts、未 approved remote candidates、publication/external candidates、approved external action operations 会在 write 前拒绝。
- approved operation subset gate 存在：只遍历 `reviewed_apply_plan.approved_operation_ids`，operation hash drift 会被拒绝，未批准 operations 会进入 `skipped_operation_ids`。
- verification gate 存在：apply 后 re-read page/block；verification 失败时 queue item 保持 `verifying`，ledger status 为 `failed`，不会标记 `completed`。
- ledger event 当前只包含 sanitized metadata、apply/verify evidence refs、redaction flags；未发现 raw secret 或 raw Knowledge payload 写入 ledger event。

## Commands Run

```text
node --test core/test/notion-apply-gate.test.js core/test/maintenance-ledger.test.js core/test/root-management-dry-run.test.js
PASS: 17/17
```

```text
node --test core/test/notion-project-home-dry-run.test.js core/test/maintenance-run.test.js
PASS: 8/8
```

```text
cd core && npm test
PASS: 584/584
```

```text
git diff --check
PASS: no whitespace errors
```

```text
python3 -m pytest tests/test_notion_integration.py tests/test_notion_output_adapter.py tests/test_notion_mixed_mode.py
exit 5: collected 0 items; no tests ran
```

只读 probe：

- `explicit_user_confirmation: false` -> `ok:true`, `writes:1`
- `target_page_ids: {}` -> `ok:true`, `writes:1`
- mismatched `reviewed_apply_plan.dry_run_id/dry_run_hash` -> `ok:true`, `writes:1`

## Audit Checklist

- Explicit confirmation and required `dry_run_id`/`dry_run_hash`/`reviewed_apply_plan`/`target_page_ids`: FAIL，字段存在性测试通过，但 false confirmation 与空 target map 可写入。
- Stale/mutated dry-run bundles and operation drift rejected before write: PASS with warning，bundle hash 和 operation hash drift 有覆盖；reviewed plan dry-run binding 缺失。
- Unresolved conflicts, unconfirmed remote candidates, publication/external actions rejected: PASS。
- Raw secret fields/values and raw Knowledge blocks/messages/raw_records rejected before write and absent from ledger evidence: PASS。
- Only approved Notion operation subset written; unapproved operations skipped: PASS。
- Re-read verification gates queue item completed; verification failure keeps queue item out of completed and ledger status failed: PASS。
- Sanitized ledger/evidence refs and worker separation evidence: PASS with warning，ledger event 脱敏通过；implementation evidence 说明实现由主线程完成、test worker 独立，audit worker 本轮独立审计。

## Residual Risk

- 当前 helper 是直接导出的 apply API，还未看到命令层二次确认或真实 ledger append 集成；若命令层直接透传该 helper，以上 Critical 会成为真实远程写入风险。
- 测试覆盖主要检查“缺字段”，未覆盖 falsey-but-present confirmation、空 target map、reviewed plan 与 bundle/hash 不一致。

---

# C16-M9 Audit Recheck

复核时间：2026-05-20T01:55:00+08:00

复核结论：FAIL

本次只复核 Final Gated Notion Apply And Verification 的修订；未修改生产代码、测试或受保护 Workflow state 文件。

## 修订复核结果

原始三项 FAIL 已按修订关闭：

- `explicit_user_confirmation:false`：当前返回 `ok=false`、`writes=0`，错误包含 `explicit_user_confirmation`。
- `target_page_ids:{}`：当前返回 `ok=false`、`writes=0`，错误包含 `target_page_ids`。
- `reviewed_apply_plan.dry_run_id/dry_run_hash` mismatch：当前返回 `ok=false`、`writes=0`，错误包含 `reviewed_apply_plan.dry_run_id` 或 `reviewed_apply_plan.dry_run_hash`。

代码证据：

- `core/src/maintenance/root-dry-run.js:259-265` 增加 explicit confirmation 类型和文本检查。
- `core/src/maintenance/root-dry-run.js:267-269` 要求 `target_page_ids` 是非空 plain object。
- `core/src/maintenance/root-dry-run.js:270-277` 拒绝 reviewed plan 中 present-but-mismatched `dry_run_id` / `dry_run_hash`。
- `core/src/maintenance/root-dry-run.js:474-475` 的 `resolveTargetPageId` 只从 `target_page_ids[operation.target_ref]` 取值，不再 fallback 到 operation 或 reviewed plan。
- `core/test/notion-apply-gate.test.js:40-64` 增加 false confirmation、empty target map、reviewed plan mismatch regression。

## Remaining Blocker

### Critical: 否定确认文本仍会被关键词正则当作有效 explicit confirmation 并执行写入

证据：

- `core/src/maintenance/root-dry-run.js:263-265` 对字符串确认只做 `/explicitly approve|approve applying|confirmed/i` 关键词匹配。
- 只读 probe 结果：

```text
"not confirmed": ok=true writes=1 errors=
"I do not approve applying this reviewed Notion dry-run bundle": ok=true writes=1 errors=
```

影响：

- 仍不满足审计重点 1：apply cannot run without explicit confirmation。
- 调用方或上层命令如果把用户否定文本原样作为 `explicit_user_confirmation` 传入，当前 helper 会调用 Notion write hook 并完成验证。

建议：

- 避免自然语言关键词正则作为最终安全门禁。改为结构化确认，例如 `explicit_user_confirmation: { confirmed: true, dry_run_id, dry_run_hash, target_page_ids_hash, reviewed_at }`，或只接受布尔 `true` 且由命令层在用户确认后设置。
- 如果必须接受字符串，应使用精确、不可否定的确认短语，并拒绝 `not`、`do not`、`no`、`cancel` 等否定上下文；但结构化确认更可靠。
- 增加 regression 覆盖 `"not confirmed"`、`"I do not approve applying..."`、`"do not apply"`，并断言 `writes=0`。

## Residual Risks

- `reviewed_apply_plan.dry_run_id` / `dry_run_hash` 只有 present-but-mismatched 时会拒绝；若 reviewed plan 完全省略这两个字段，当前仍可写入。只读 probe：

```text
plan_missing_id_hash: ok=true writes=1 errors=
```

  该行为与修订说明“mismatch is rejected when present”一致，未作为本次 blocker；但从“approved dry-run bundle”可审计绑定角度，建议后续将 reviewed plan 的 id/hash 设为必填。
- 真实 Notion 网络写入和真实 ledger append 未执行；当前证据仍基于 fake Notion client 与 helper 返回的 ledger event。

## Commands Run

```text
node --test core/test/notion-apply-gate.test.js core/test/maintenance-ledger.test.js core/test/root-management-dry-run.test.js
PASS: 18/18
```

```text
node --test core/test/notion-project-home-dry-run.test.js core/test/maintenance-run.test.js
PASS: 8/8
```

```text
python3 -m pytest tests/test_notion_integration.py tests/test_notion_output_adapter.py tests/test_notion_mixed_mode.py
exit 5: collected 0 items; no tests ran
```

```text
cd core && npm test
PASS: 585/585
```

```text
git diff --check
PASS: no whitespace errors
```

只读 probes：

```text
false_confirmation: ok=false writes=0 errors=explicit_user_confirmation must be a true explicit approval string or boolean true
empty_targets: ok=false writes=0 errors=target_page_ids must provide explicit target bindings for approved Notion operations
plan_id_mismatch: ok=false writes=0 errors=reviewed_apply_plan.dry_run_id must match dry_run_id
"not confirmed": ok=true writes=1 errors=
"I do not approve applying this reviewed Notion dry-run bundle": ok=true writes=1 errors=
```

---

# C16-M9 Second Audit Recheck

复核时间：2026-05-20T02:10:00+08:00

复核结论：PASS

本次只复核 Final Gated Notion Apply And Verification 的最新修订；未修改生产代码、测试或受保护 Workflow state 文件。

## 修订复核结果

最新修订关闭了上一轮 FAIL 和残余风险：

- 字符串 `explicit_user_confirmation` 不再使用关键词正则，必须精确等于 `I explicitly approve applying reviewed Notion dry-run bundle <dry_run_id> with hash <dry_run_hash>`。
- `explicit_user_confirmation: true` 仍作为结构化命令层确认路径保留。
- `reviewed_apply_plan.dry_run_id` 与 `reviewed_apply_plan.dry_run_hash` 现在必填，并且必须匹配输入 dry-run id/hash。
- Notion target page 授权仍只来自 `target_page_ids[operation.target_ref]`；operation/reviewed plan 自带 page id 不再作为 fallback。

代码证据：

- `core/src/maintenance/root-dry-run.js:259-263` 将 explicit confirmation 交给 `isValidExplicitConfirmation`。
- `core/src/maintenance/root-dry-run.js:283-288` 只接受 boolean `true` 或精确匹配 dry-run id/hash 的确认字符串。
- `core/src/maintenance/root-dry-run.js:267-277` 要求 reviewed plan id/hash 必填且匹配。
- `core/src/maintenance/root-dry-run.js:482-483` 只从显式 `target_page_ids` map 解析 Notion target。
- `core/test/notion-apply-gate.test.js:39-69` 覆盖 false、否定确认、随意确认、空 target map、reviewed plan 缺失/不匹配 id/hash，且断言 write calls 为 0。

## Blockers

无。

## Residual Risks

- 未执行真实 Notion 网络写入；验证仍基于 fake Notion client 记录 write/read calls。
- 当前 helper 返回 sanitized ledger event/evidence refs，但本次范围未验证真实 ledger append 的持久化路径。
- `explicit_user_confirmation: true` 依赖上层命令层只在用户明确确认后设置；该布尔路径本身是有意保留的结构化确认入口。

## Commands Run

```text
node --test core/test/notion-apply-gate.test.js core/test/maintenance-ledger.test.js core/test/root-management-dry-run.test.js
PASS: 18/18
```

```text
node --test core/test/notion-project-home-dry-run.test.js core/test/maintenance-run.test.js
PASS: 8/8
```

```text
cd core && npm test
PASS: 585/585
```

```text
python3 -m pytest tests/test_notion_integration.py tests/test_notion_output_adapter.py tests/test_notion_mixed_mode.py
exit 5: collected 0 items; no tests ran
```

```text
git diff --check
PASS: no whitespace errors
```

只读 probes：

```text
negated_not_confirmed: ok=false writes=0 write_targets=none errors=explicit_user_confirmation must exactly approve this dry-run id and hash
negated_do_not_approve: ok=false writes=0 write_targets=none errors=explicit_user_confirmation must exactly approve this dry-run id and hash
casual_approve: ok=false writes=0 write_targets=none errors=explicit_user_confirmation must exactly approve this dry-run id and hash
missing_plan_id_hash: ok=false writes=0 write_targets=none errors=reviewed_apply_plan.dry_run_id is required|reviewed_apply_plan.dry_run_hash is required
exact_confirmation: ok=true writes=1 write_targets=page-explicit-map errors=
boolean_true_confirmation: ok=true writes=1 write_targets=page-explicit-map errors=
missing_explicit_target_binding_but_operation_and_plan_have_page_ids: ok=false writes=0 write_targets=none errors=target_page_ids missing binding for notion:page/hypo-workflow
```
