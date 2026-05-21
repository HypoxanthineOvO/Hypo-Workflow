# C16-M6 Completion Report — Scheduled Global Consolidation And Chat Backfill

## Result

Status: completed

C16-M6 added scheduled global consolidation primitives for local chat/session/Notion-export records, resumable historical backfill, redacted Chinese sedimentation outputs, and Notion dry-run projection.

Post-acceptance revision: the daily 04:00 model now has a real local scheduler entry, not only a planning helper. `hypo-workflow maintain-scheduler --dry-run` and `scripts/maintenance-scheduler.sh` create safe-local evidence and append a maintenance ledger event.

## What Changed

- Added `core/src/maintenance/session-sources.js`.
- Added `core/src/maintenance/consolidation.js`.
- Exported consolidation APIs through `core/src/maintenance/index.js` and the root core export path.
- Added `references/global-consolidation-spec.md`.
- Added M6 tests:
  - `core/test/global-consolidation.test.js`
  - `core/test/session-source-discovery.test.js`
  - `core/test/maintenance-backfill.test.js`
  - `core/test/fixtures/global-consolidation/*`

## Source Discovery

- `discoverConsolidationSources` supports `codex_sessions`, `opencode_sessions`, `claude_sessions`, and `notion_pages`.
- Discovery is safe-local-only: local file reads and directory traversal only, with `network_enabled:false` and `remote_writes_enabled:false`.
- Fixture/local probe readers support JSON, JSONL, Markdown, and Notion export JSON.
- Records are normalized with `source_kind`, `source_ref`, `created_at`, `format`, `safe_local_fixture`, `messages` or `blocks`, and sensitivity metadata.

## Backfill And Resume

- `planHistoricalBackfillShards` creates deterministic daily or weekly shards.
- Date ranges are start inclusive and end exclusive.
- Source kinds are canonicalized as `codex_sessions`, `opencode_sessions`, `claude_sessions`, `notion_pages`.
- `buildConsolidationResumeState` stores only run id, shard id, cursor, completed shard ids, and last record refs; it does not embed raw content, messages, or blocks.

## Chinese Outputs And Projection

- `planGlobalConsolidationRun` creates a system-initiated `maintenance_run` for `04:00 Asia/Shanghai`, not a pipeline runner.
- The planned run reports `pipeline_runner:false`, `service_restart_required:false`, and `remote_writes_enabled:false`.
- `generateGlobalConsolidationOutputs` emits Chinese `zh-CN` candidates for knowledge, rule/habit, template, project relation, and infrastructure.
- Candidates remain `authority:"non_authoritative"` and `status:"pending_review"`.
- `projectConsolidationToNotionDryRun` creates dry-run blocks and operations only; it does not call Notion client write/apply methods.

## Scheduler Entry

- CLI: `hypo-workflow maintain-scheduler --dry-run --schedule "04:00 Asia/Shanghai"`
- Shell wrapper: `scripts/maintenance-scheduler.sh <project_root>`
- Cron example: `0 4 * * * /home/heyx/Hypo-Workflow/scripts/maintenance-scheduler.sh /home/heyx/Hypo-Workflow`
- Evidence root: `~/.hypo-workflow/maintenance/evidence/global-consolidation/`
- Ledger event: `global_consolidation_scheduled`
- Boundary: `remote_writes_enabled=false`, `apply_required=false`, no Notion apply, no publication/external action, no service restart, no pipeline execution.

## Redaction

- Records and generated outputs use shared redaction before leaving discovery/projection surfaces.
- Consolidation-specific `scrubConsolidationSecretMarkers` collapses secret assignment markers such as `password=[REDACTED]` and `api_key=[REDACTED]` to plain `[REDACTED]`.
- Custom serialization leak probe passed with `secretLeak=false`.

## Worker Evidence

- Test evidence: `.pipeline/reviews/C16/M6/test-evidence.md`
- Implementation evidence: `.pipeline/reviews/C16/M6/implementation-evidence.md`
- Audit evidence: `.pipeline/reviews/C16/M6/audit.md`

## Validation

```bash
node --test core/test/global-consolidation.test.js core/test/session-source-discovery.test.js core/test/maintenance-backfill.test.js
```

Result: 11/11 passing after scheduler entry revision.

```bash
node cli/bin/hypo-workflow maintain-scheduler --home /tmp/hw-maintain-smoke --fixture-root core/test/fixtures/global-consolidation --now 2026-05-20T04:00:00+08:00 --dry-run
```

Result: created `global_consolidation` evidence and maintenance ledger event with `remote_writes_enabled=false`.

```bash
node --test core/test/knowledge-ledger.test.js
```

Result: 8/8 passing.

```bash
cd core && npm test
```

Result: 564/564 passing.

```bash
git diff --check
```

Result: passing.

## Audit Result

Audit status: PASS, no blockers.

## Residual Risks

- Current tests are fixture-driven and do not exhaustively cover every real-world Codex/OpenCode/Claude session variant, malformed transcript, symlinked tree, or unusual Notion export.
- Secret detection relies on shared regex redaction plus consolidation marker scrubbing; future uncommon secret formats may require pattern expansion.
- `planHistoricalBackfillShards` defaults `end_date` from host UTC date; scheduler integration should pass explicit local dates if Asia/Shanghai day-boundary behavior becomes visible.
