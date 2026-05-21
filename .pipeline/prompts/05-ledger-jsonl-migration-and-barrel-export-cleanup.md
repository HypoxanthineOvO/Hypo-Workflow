# C17-M5 Ledger JSONL Migration And Barrel Export Cleanup

## Goal

Fix O(n) ledger rewrites and reduce namespace pollution across public core exports.

## Technical Solution

- Introduce append-only JSONL ledger helpers and one-time migration from known YAML ledger files.
- Generate compact YAML summaries from JSONL for human-readable status surfaces.
- Convert project-events, maintenance ledger, project-notifications, daily-summary, and consolidation ledger write paths.
- Replace broad `core/src/index.js` `export *` surface with explicit or namespace exports where feasible.
- Update docs/examples to the new import and ledger authority model.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns JSONL append/read/migration/idempotency tests and updated ledger expectations for affected subsystems.
  - Evidence path: `.pipeline/reviews/C17/M5/test-evidence.md`.
- `implement`
  - Owns JSONL utilities, one-time migration, ledger writer refactors, compact summary generation, barrel export cleanup, and docs/examples.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C17/M5/implementation-evidence.md`.
- `audit`
  - Reviews authority switch, no long-term dual write, compact summary determinism, export surface reduction, and worker separation.
  - Evidence path: `.pipeline/reviews/C17/M5/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Add JSONL utility tests for append, read, corruption handling, and migration idempotency.
2. Implement JSONL helpers and compact YAML summary generation.
3. Migrate project-events, maintenance, project-notifications, daily-summary, and consolidation ledger write paths.
4. Update tests that expect `ledger.yaml` content to use JSONL or compact summary paths.
5. Clean `core/src/index.js` broad exports and update docs/examples.
6. Run import/docs/export scans.

## Research Required

Status: none.

Evidence:

- Audit identifies O(n) rewrites in project-events, maintenance, project-notifications, and daily-project-summary.

## Risks And Alternatives

Risks:

- Existing status surfaces may rely on YAML ledger paths.
- Broad export cleanup can break external imports.

Rejected alternative: long-term YAML/JSONL dual write. User approved one-time migration only.

## Validation

Run:

```bash
node --test core/test/project-events.test.js core/test/project-notifications.test.js core/test/daily-project-summary.test.js core/test/maintenance-ledger.test.js
rg -n 'ledger.yaml|export \\* from' core/src core/test docs README.md README.en.md
npm test
git diff --check
```

Pass signal: JSONL ledgers are authoritative for new writes, old YAML migrates once, root tests pass, and broad export surface is reduced.

## Audit Focus

- No long-term YAML/JSONL dual writes.
- Compaction is deterministic and does not drop evidence.
- Docs/examples do not show stale import or ledger authority.
- Export cleanup is intentional and documented.

## Completion Report Requirements

Include ledger migration behavior, affected paths, export cleanup summary, scan results, validation output, expected behavior, and residual risks.
