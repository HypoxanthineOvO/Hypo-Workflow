# C16-M14 Daily Project Summary At 00:30

## Goal

Send a daily project summary at `00:30 Asia/Shanghai` through Hypo-Claw QQ, covering all first-batch project activity in the previous `00:30` to current `00:30` window.

## Technical Solution

Extend scheduled maintenance with a daily project summary run. The run aggregates project stop events, progress records, notification failures, and retry-needed items. Notification failures must appear at the top of the summary.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns timezone/window tests, multi-project aggregation fixtures, failure-first rendering tests, and segmentation tests.
  - Evidence path: `.pipeline/reviews/C16/M14/test-evidence.md`.
- `implement`
  - Owns summary planner, renderer, scheduler hook boundary, aggregation helpers, and Hypo-Claw adapter integration.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M14/implementation-evidence.md`.
- `audit`
  - Reviews timezone correctness, duplicate suppression, no-Notion boundary, and side-effect mode handling.
  - Evidence path: `.pipeline/reviews/C16/M14/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Add summary window calculation for `Asia/Shanghai` using `00:30` as the daily boundary.
2. Aggregate first-batch project events and progress records into Chinese summary sections.
3. Put send failures and retry-needed items first.
4. Reuse the Hypo-Claw segmentation and mode handling.
5. Keep Notion sync and publishing out of v1.

## Research Required

Status: resolved.

Evidence:

- User confirmed `00:30 Asia/Shanghai`, QQ-only v1, and failure-first daily reporting.
- Existing maintenance scheduler can create scheduled local evidence.

## Risks And Alternatives

Risks:

- Natural-day summaries would miss late-night work.
- Summary may duplicate stop messages unless deduplicated by event id.

Rejected alternative: use natural day `00:00-24:00`. User confirmed `00:30-to-00:30`.

## Validation

Run:

```bash
node --test core/test/daily-project-summary.test.js core/test/global-consolidation.test.js core/test/maintenance-backfill.test.js
cd core && npm test
```

Pass signal: multiple project events aggregate into the correct `00:30` window, failures appear first, duplicate events are suppressed, and output is segmented without truncation.

## Audit Focus

- Timezone/window correctness.
- Deduplication.
- No Notion writes.
- No real QQ send in dry-run/test validation.

## Completion Report Requirements

Include summary window examples, rendered summary sample, failure-first evidence, validation output, and scheduler boundary risks.
