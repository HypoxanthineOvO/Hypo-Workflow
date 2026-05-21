# C16-M3 Storage Sync Template And Notion Merge Dry-Run

## Goal

Implement a backend-neutral Storage Sync Template and a Notion Project Home merge dry-run. This milestone must not perform remote writes.

## Technical Solution

Define Storage Sync Template as an adapter-neutral projection model. Notion is the first adapter and only produces discover, classify, bind, merge-plan, and dry-run evidence in this milestone.

Project Home slots:

- Overview
- Progress
- Architecture
- Knowledge
- Docs
- Prompts index
- Reports index
- Legacy links
- Sync status

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns tests/fixtures for storage projection schema, Notion dry-run operations, operation hash stability, and no-write behavior.
  - Evidence path: `.pipeline/reviews/C16/M3/test-evidence.md`.
- `implement`
  - Owns sync template implementation, Notion read/diff adapter boundary, merge-plan generation, docs, and dry-run evidence format.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M3/implementation-evidence.md`.
- `audit`
  - Reviews remote-write prevention, legacy-content classification, operation hashes, and worker separation.
  - Evidence path: `.pipeline/reviews/C16/M3/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Read Notion mapping and sync authority/conflict research.
2. Define projection schema, page tree slots, operation protocol, authority policy, and adapter capability flags.
3. Add Notion read/diff adapter using explicit page ids or workspace bindings.
4. Model existing Hypo-Workflow Notion content as legacy merge input, not append-only output.
5. Generate stable dry-run operation plans with hashes and redaction checks.
6. Keep all remote writes disabled.

## Research Required

Status: resolved by Deep Research, with final target selection deferred by user.

Evidence:

- `.pipeline/deep-plans/DP001-root-project-management-mode/notion-hypo-workflow-mapping.md`
- `.pipeline/deep-plans/DP001-root-project-management-mode/sync-authority-conflict-matrix.md`

Deferred by user: real Notion target set is confirmed only after dry-run output review.

## Risks And Alternatives

Risks:

- Merge plans could overwrite legacy content if authority/conflict states are incomplete.
- Blind Notion search could bind the wrong page.

Rejected alternative: creating a separate new sync page. The user requires existing content to be reconciled into one Project Home.

## Validation

Run:

```bash
node --test core/test/storage-sync-template.test.js core/test/notion-project-home-dry-run.test.js
python -m pytest tests/test_notion_integration.py tests/test_notion_output_adapter.py tests/test_notion_source_adapter.py
cd core && npm test
```

Pass signal: deterministic dry-run plans are generated without Notion writes and with stable operation hashes.

## Audit Focus

- No remote writes.
- Operation hashes are stable.
- Legacy content is classified before merge.

## Completion Report Requirements

Include projection contract, Notion adapter boundary, no-write evidence, validation output, and remaining final-apply assumptions.
