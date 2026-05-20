# Global Consolidation Spec

## Scope

Global consolidation is a system-initiated `maintenance_run` that reads local Codex, OpenCode, Claude, and Notion export records, redacts sensitive content, plans resumable historical backfill shards, and emits Chinese non-authoritative candidates for review.

Default schedule:

- Local time: `04:00`
- Timezone: `Asia/Shanghai`
- Initial backfill start: `2026-03-01`
- Source kinds: `codex_sessions`, `opencode_sessions`, `claude_sessions`, `notion_pages`

The run is not a pipeline runner. It must report `pipeline_runner:false`, `service_restart_required:false`, and `remote_writes_enabled:false`.

## Scheduler Entry

Daily global consolidation must have a real local scheduling entry, not only an in-memory plan.

Supported entrypoints:

- `hypo-workflow maintain-scheduler --dry-run --schedule "04:00 Asia/Shanghai"`
- `scripts/maintenance-scheduler.sh <project_root>`, intended for cron:

```text
0 4 * * * /path/to/Hypo-Workflow/scripts/maintenance-scheduler.sh /path/to/Hypo-Workflow
```

The scheduler creates local evidence under `~/.hypo-workflow/maintenance/evidence/global-consolidation/` and appends a sanitized `global_consolidation_scheduled` event to `~/.hypo-workflow/maintenance/ledger.yaml`.

The scheduler is safe-local-only in this version:

- `remote_writes_enabled:false`
- `apply_required:false`
- no Notion apply
- no publication/external action
- no service restart
- no pipeline execution

## Source Discovery

`discoverConsolidationSources` only performs safe local reads. With `safe_local_only:true`, it must not use network access, remote writes, service restarts, or live Notion writes. Supported local formats are JSON, JSONL, Markdown, and Notion export JSON fixtures.

Every normalized record includes:

- `source_kind`
- `source_ref`
- `created_at`
- `format`
- `safe_local_fixture`
- `messages` or `blocks`
- `sensitivity`

Records are redacted and classified before they are returned. Raw secrets are not recorded; metadata keeps only `raw_secret_seen`, `raw_secret_recorded:false`, and a classification such as `redacted_internal`.

## Backfill

`planHistoricalBackfillShards` creates deterministic daily or weekly shards. Date ranges are start inclusive and end exclusive. Source kinds are ordered canonically as:

1. `codex_sessions`
2. `opencode_sessions`
3. `claude_sessions`
4. `notion_pages`

Shard cursors follow:

```text
<granularity>:<start-date>:codex_sessions,opencode_sessions,claude_sessions,notion_pages
```

`buildConsolidationResumeState` stores only run IDs, shard IDs, cursor, completed shard IDs, and last record refs. It must not embed raw content, messages, blocks, tokens, passwords, authorization headers, or API keys.

## Outputs

`generateGlobalConsolidationOutputs` emits Chinese `zh-CN` summary text and five pending-review candidate arrays:

- `knowledge_candidates`
- `rule_habit_candidates`
- `template_candidates`
- `project_relation_candidates`
- `infrastructure_candidates`

All candidates are `authority:"non_authoritative"` and `status:"pending_review"`. They are redacted and include sensitivity metadata:

```json
{
  "raw_secret_seen": true,
  "raw_secret_recorded": false,
  "classification": "redacted_internal"
}
```

## Notion Projection

`projectConsolidationToNotionDryRun` produces dry-run blocks and operations only. It must not call client write methods such as append, update, create, apply, or delete. Projection output is redacted and reports `remote_writes_enabled:false` and `apply_required:false`.
