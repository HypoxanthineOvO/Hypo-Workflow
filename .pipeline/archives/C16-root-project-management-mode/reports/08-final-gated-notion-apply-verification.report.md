# C16-M9 Final Gated Notion Apply And Verification

## 结论

C16-M9 已完成并通过独立审计复核。

本 milestone 新增 `applyApprovedNotionDryRunBundle`，为 `/hw:maintain apply` 提供最终 gated Notion apply helper：只能消费已审核 dry-run bundle，必须验证 bundle hash、reviewed apply plan、显式确认和 target binding，写入后必须 re-read Notion target 并生成 sanitized ledger/evidence metadata。

## Apply Gate 行为

- 必填输入：`dry_run_id`、`dry_run_hash`、`reviewed_apply_plan`、`explicit_user_confirmation`、`target_page_ids`、`bundle`。
- 字符串确认必须精确匹配 `I explicitly approve applying reviewed Notion dry-run bundle <dry_run_id> with hash <dry_run_hash>`；否定句、随意片段和缺字段确认都会在写入前失败。
- `reviewed_apply_plan.dry_run_id` / `reviewed_apply_plan.dry_run_hash` 必填且必须匹配输入 bundle。
- `target_page_ids` 必须是非空显式映射，Notion 写入 target 只从 `target_page_ids[operation.target_ref]` 解析，不使用 operation 或 reviewed plan 自带 page id fallback。
- 未解决冲突、未确认 remote candidates、publication/external actions、raw secret/raw Knowledge payload、stale/mutated bundle、operation drift 都会在任何 write hook 前拒绝。

## Verification And Ledger Evidence

- Approved operation subset 会按 reviewed plan 的 operation id/hash 执行；未批准 operation 只进入 skipped list。
- Apply 后 re-read target pages/blocks；验证通过才将 queue item 标记为 `completed`。
- 验证失败时 queue item 停在 `verifying`，ledger event status 为 `failed`。
- 返回的 `apply_result`、`verify_result`、`ledger_event` 和 `evidence_refs` 经过 sanitizer，避免 raw secrets、raw Knowledge blocks/messages/raw_records 和 raw operation payload 进入 evidence。

## 审计结果

- Test worker：Tesla，证据 `.pipeline/reviews/C16/M9/test-evidence.md`。
- Audit worker：Mendel，证据 `.pipeline/reviews/C16/M9/audit.md`。
- 初次审计 FAIL：false confirmation、空 target map 和 reviewed plan id/hash mismatch 可绕过。
- 第一次修订关闭上述三项。
- 第二次审计 FAIL：否定确认字符串命中关键词正则；reviewed plan id/hash 缺失仍可写。
- 第二次修订改为精确 dry-run id/hash 确认短语，并要求 reviewed plan id/hash 必填。
- 最终审计复核 PASS，无 remaining blockers。

## 验证

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
PASS
```

## Manual Smoke

未执行真实 Notion 网络写入；本 milestone 的写入与 re-read 证据基于 fake Notion client。原因是本轮实现的是最终 apply gate helper 与验证契约，不应在无用户选择具体 dry-run bundle、operation subset 和 target pages 的情况下触发真实远端写入。

## Residual Risks

- `explicit_user_confirmation: true` 作为结构化确认入口保留，依赖命令层只在用户明确确认后设置。
- 本轮验证 helper 返回的 sanitized ledger event/evidence refs；真实 ledger append 持久化路径不在最终复核范围内。
- 未来命令层接入真实 Notion apply 时，必须保持本 helper 的 dry-run hash、reviewed plan、target binding、re-read verification 和 sanitized ledger 边界。

## Post-Completion Feedback Revision

用户指出每日 04:00 沉淀不能只有调度模型，必须有真实调度入口。已补充本地 scheduler：

- CLI：`hypo-workflow maintain-scheduler --dry-run --schedule "04:00 Asia/Shanghai"`
- Shell wrapper：`scripts/maintenance-scheduler.sh <project_root>`
- Cron 示例：`0 4 * * * /home/heyx/Hypo-Workflow/scripts/maintenance-scheduler.sh /home/heyx/Hypo-Workflow`
- Evidence：`~/.hypo-workflow/maintenance/evidence/global-consolidation/`
- Ledger event：`global_consolidation_scheduled`
- 边界：`remote_writes_enabled=false`、`apply_required=false`，不执行 Notion apply、发布、服务重启或 pipeline execution。

补充验证：

```text
node --test core/test/global-consolidation.test.js core/test/session-source-discovery.test.js core/test/maintenance-backfill.test.js core/test/maintenance-command-map.test.js core/test/skill-spec.test.js
PASS: 16/16
```

```text
scripts/maintenance-scheduler.sh /home/heyx/Hypo-Workflow --home /tmp/hw-maintain-smoke --fixture-root /home/heyx/Hypo-Workflow/core/test/fixtures/global-consolidation --now 2026-05-20T04:00:00+08:00 --dry-run
PASS: created global_consolidation evidence and maintenance ledger event
```

```text
cd core && npm test
PASS: 587/587
```
