# C16-M6 Implementation Evidence

## Modified Files

- `core/src/maintenance/session-sources.js`
- `core/src/maintenance/consolidation.js`
- `core/src/maintenance/index.js`
- `references/global-consolidation-spec.md`
- `.pipeline/reviews/C16/M6/implementation-evidence.md`

## Exported APIs

- `discoverConsolidationSources`
- `planGlobalConsolidationRun`
- `planHistoricalBackfillShards`
- `buildConsolidationResumeState`
- `generateGlobalConsolidationOutputs`
- `projectConsolidationToNotionDryRun`

## Implementation Notes

- Source discovery is local-only and fixture/local-probe based. It reads JSON, JSONL, Markdown, and Notion export JSON without network access or remote writes.
- Records are normalized with `source_kind`, `source_ref`, `created_at`, `format`, `safe_local_fixture`, and either `messages` or `blocks`.
- Raw content is redacted before returning records to consolidation. Consolidation-specific scrubbing also collapses secret assignment markers such as `password=[REDACTED]` to `[REDACTED]`, so raw secret values and secret-key assignment shapes are not stored. Sensitivity metadata records only whether raw secrets were seen.
- Global consolidation is planned as a system `maintenance_run` with `pipeline_runner:false`, `service_restart_required:false`, and `remote_writes_enabled:false`.
- Backfill shards are deterministic for daily and weekly ranges. Boundaries are start inclusive and end exclusive.
- Resume state stores only run/shard/cursor/completed IDs and last record refs, without raw messages or blocks.
- Generated outputs are Chinese `zh-CN` non-authoritative `pending_review` candidates for knowledge, rule/habit, template, project relation, and infrastructure.
- Notion projection returns dry-run payloads and operations only; it does not call any client write/apply method.

## Boundary Statement

- No service restart was implemented or invoked.
- No system dependency installation was performed.
- No package manifest was modified.
- No network access or remote-resource write is used by these APIs.
- Test worker files and fixtures under `core/test/**` were not modified.

## Validation Results

- `node --test core/test/global-consolidation.test.js core/test/session-source-discovery.test.js core/test/maintenance-backfill.test.js`: PASS, 9 tests passed.
- `node --test core/test/knowledge-ledger.test.js`: PASS, 8 tests passed.
- `cd core && npm test`: PASS, 564 tests passed.
- `git diff --check`: PASS.
