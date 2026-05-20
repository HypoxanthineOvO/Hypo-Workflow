# C16-M4 Maintenance Command Surface Queue Ledger And Evidence Store

## Goal

Add first-class `/hw:maintain` command entry plus maintenance queue, ledger, cache, evidence store, backups, and side-effect policy gates under `~/.hypo-workflow/maintenance/`.

## Technical Solution

Create the Maintenance substrate. Queue items represent maintenance operations, not implementation Features. The ledger is append-only and evidence is sanitized.

Files:

- `~/.hypo-workflow/maintenance/queue.yaml`
- `~/.hypo-workflow/maintenance/ledger.yaml`
- `~/.hypo-workflow/maintenance/cache/`
- `~/.hypo-workflow/maintenance/evidence/`
- `~/.hypo-workflow/maintenance/backups/`

Side-effect levels:

- `local_read`
- `remote_read`
- `local_derived_write`
- `local_authority_write`
- `local_document_write_with_backup`
- `remote_write`
- `destructive_remote_write`
- `external_action`

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns command-map tests, queue lifecycle tests, ledger redaction tests, and side-effect gate tests.
  - Evidence path: `.pipeline/reviews/C16/M4/test-evidence.md`.
- `implement`
  - Owns `/hw:maintain` skill/command registry/docs/adapter metadata plus queue, ledger, evidence, backup, and policy implementation.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M4/implementation-evidence.md`.
- `audit`
  - Reviews command namespace separation, queue authority, side-effect gates, ledger sanitization, and worker separation.
  - Evidence path: `.pipeline/reviews/C16/M4/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Register `/hw:maintain` and subcommands in command maps, docs, skills, and platform adapters.
2. Include `status`, `scan`, `plan`, `queue`, `run`, `apply`, `verify`, and `log`.
3. Implement queue item schema, state machine, approval/defer/skip decisions, and ledger append helpers.
4. Add evidence paths for scan, dry-run, apply, verify, and backup records.
5. Enforce side-effect policy before remote writes, publication, destructive operations, and local doc auto-updates.
6. Add status/log rendering in Chinese when `output.language` is `zh-CN`.

## Research Required

Status: resolved by user Discover and Deep Research.

Evidence:

- `.pipeline/deep-plans/DP001-root-project-management-mode/maintenance-queue-lifecycle.md`
- `.plan-state/discover.yaml`

## Risks And Alternatives

Risks:

- `/hw:maintain` could overlap with `/hw:sync`.
- Queue decisions could be mistaken for Cycle/Patch implementation work.

Rejected alternatives:

- Hiding maintenance inside `/hw:sync`; rejected by user.
- Using Feature Queue for maintenance operations; rejected because maintenance is long-term state upkeep, not Feature delivery.

## Validation

Run:

```bash
node --test core/test/maintenance-command-map.test.js core/test/commands-rules-artifacts.test.js
node --test core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js core/test/log-evidence.test.js
cd core && npm test
```

Pass signal: commands route correctly, queue lifecycle enforces gates, ledger redacts evidence, and local document write requires backup metadata.

## Audit Focus

- Command namespace separation.
- Queue item authority and side-effect gates.
- Sanitized append-only ledger.

## Completion Report Requirements

Include command map changes, queue/ledger schema, side-effect gate evidence, validation output, and residual command boundary risks.
