# C16-M5 Maintenance Run Engine And Template Learning

## Goal

Support orchestration runs, partitioned runs, user-directed runs, system-initiated runs, review granularity, backups, notifications, and reusable template candidates.

## Technical Solution

Add Maintenance Run as a higher-level operation over queue items. Runs may orchestrate multiple objects, partition one object into subitems, or execute system-initiated upkeep. Runs own pause/resume/review/approve/complete state; queue items own concrete side-effect operations.

Run examples:

- daily AI noon report
- partitioned docs maintenance
- project relation drift cleanup

Run states:

- `planned`
- `discovering_items`
- `in_progress`
- `waiting_review`
- `waiting_confirmation`
- `applying`
- `verifying`
- `completed`
- `paused`
- `failed`

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns run schema tests, orchestration fixtures, partitioned subitem discovery fixtures, review-mode tests, backup-policy tests, and template-candidate tests.
  - Evidence path: `.pipeline/reviews/C16/M5/test-evidence.md`.
- `implement`
  - Owns run engine, template learning, backup/notification hooks, `/hw:maintain run` behavior, and maintenance-run docs.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M5/implementation-evidence.md`.
- `audit`
  - Reviews Run versus Cycle/Patch boundary, backup/notification evidence, template authority, and worker separation.
  - Evidence path: `.pipeline/reviews/C16/M5/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Define run schema, run item schema, subitem discovery contract, review modes, and pause/resume semantics.
2. Implement orchestration-run planning for AI noon report without hard-coding it as the only template.
3. Implement partitioned-run planning over docs folders and Notion child-page trees via adapter contracts.
4. Add backup and notification hooks for system-initiated local document updates.
5. Add candidate template generation from recurring run shapes with provenance and user-review status.

## Research Required

Status: resolved by user Discover.

Evidence:

- `.plan-state/discover.yaml`

Deferred by user:

- Exact user-directed template library is intentionally learned from real runs rather than predeclared in v1.
- Real WeChat publishing implementation remains behind explicit confirmation and can be handled by a later run-specific integration.

## Risks And Alternatives

Risks:

- Run engine could duplicate Cycle behavior.
- Template learning could make unreviewed patterns authoritative too early.
- Notifications and local writes could surprise the user if gates are loose.

Rejected alternatives:

- Model every run as a Cycle; rejected because maintenance is long-term upkeep across or within objects.
- Predefine a closed template set; rejected by user.

## Validation

Run:

```bash
node --test core/test/maintenance-run.test.js core/test/maintenance-template-learning.test.js core/test/maintenance-backup-policy.test.js
node --test core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js
cd core && npm test
```

Pass signal: orchestration and partitioned fixtures produce resumable runs, per-item/batch review modes work, local doc updates require backups, and template candidates remain non-authoritative until reviewed.

## Audit Focus

- Clear Run versus Cycle/Patch boundary.
- Backup and notification evidence before local document writes.
- Template candidate status cannot silently become authoritative.

## Completion Report Requirements

Include run lifecycle behavior, command behavior, template-learning safeguards, backup/notification evidence, validation output, and residual run-boundary risks.
