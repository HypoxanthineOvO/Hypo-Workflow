# C16-M6 Scheduled Global Consolidation And Chat Backfill

## Goal

Add scheduled daily 04:00 global consolidation and resumable historical backfill over Codex, OpenCode, Claude, and Notion records, producing Chinese sedimentation outputs.

## Technical Solution

Implement global consolidation as a system-initiated Maintenance Run class. It reads configured session sources, partitions history into resumable shards, redacts sensitive content, and emits Chinese knowledge, rule/habit, template, project-relation, and infrastructure candidates.

Defaults:

- schedule: `04:00 Asia/Shanghai`
- initial backfill start: `2026-03-01`
- sources: `codex_sessions`, `opencode_sessions`, `claude_sessions`, `notion_pages`

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns source discovery fixtures, shard planner tests, resumable backfill tests, redaction tests, and Chinese-output assertions.
  - Evidence path: `.pipeline/reviews/C16/M6/test-evidence.md`.
- `implement`
  - Owns consolidation run class, session source interfaces, shard metadata, redaction/output generation, and scheduler boundary docs.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M6/implementation-evidence.md`.
- `audit`
  - Reviews privacy/redaction, background side-effect boundaries, service restart avoidance, deterministic resume state, and worker separation.
  - Evidence path: `.pipeline/reviews/C16/M6/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Add source discovery interfaces and fixture readers for Codex/OpenCode/Claude/Notion sessions.
2. Add shard planner for daily/weekly historical backfill with resume metadata.
3. Add redaction and sensitivity classification before generated outputs.
4. Generate Chinese consolidation reports and candidate records.
5. Expose outputs to Notion projection as dry-run content, not automatic remote writes.
6. Do not restart services or install system dependencies without explicit confirmation.

## Research Required

Status: resolved for contract, deferred for exact paths.

Evidence:

- `.plan-state/discover.yaml`

Deferred by user:

- Exact local session paths/APIs are resolved during implementation via safe local probes and fixtures.
- Scheduler backend choice may use existing watchdog/cron boundary if available, but service restart requires confirmation.

## Risks And Alternatives

Risks:

- Chat records can contain sensitive content.
- Scheduler integration could create unwanted background side effects.
- Session storage paths may vary by platform.

Rejected alternative: manual-only consolidation. The user requested daily 04:00 system-initiated maintenance.

## Validation

Run:

```bash
node --test core/test/global-consolidation.test.js core/test/session-source-discovery.test.js core/test/maintenance-backfill.test.js
node --test core/test/secret-ref-projection.test.js core/test/knowledge-ledger.test.js
cd core && npm test
```

Pass signal: daily and historical shards are resumable, outputs are Chinese, raw secrets are redacted, and Notion projection remains dry-run.

## Audit Focus

- Redaction before outputs.
- No background service restart without confirmation.
- Backfill resume state is deterministic.

## Completion Report Requirements

Include source discovery behavior, shard/resume evidence, redaction evidence, Chinese output examples, validation output, and scheduler boundary risks.
