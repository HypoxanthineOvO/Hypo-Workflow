# C16-M14 Implementation Evidence - Daily Project Summary At 00:30

## Scope

Implemented daily project summary helpers in `core/src/maintenance/daily-project-summary.js` and exported them from `core/src/maintenance/index.js`.

## Added APIs

- `resolveDailyProjectSummaryWindow(input)`
- `buildDailyProjectSummary(input)`
- `renderDailyProjectSummary(summary, options)`
- `sendDailyProjectSummary(summary, options)`

## Behavior

- Uses `00:30` `Asia/Shanghai` daily boundaries.
- Window semantics are start inclusive and end exclusive.
- Aggregates project stop events, progress records, notification failures, and retry-needed items.
- Deduplicates stop events by event id.
- Renders Chinese user-visible output with failure/retry items before ordinary project activity.
- Reuses the Hypo-Claw segmentation helper for dry-run/test notification evidence.
- Keeps Notion and QQ side effects disabled in dry-run/test validation.

## Validation

```bash
node --test core/test/daily-project-summary.test.js core/test/global-consolidation.test.js core/test/maintenance-backfill.test.js
```

Result: PASS.

- Tests: 12
- Pass: 12
- Fail: 0

```bash
git diff --check -- core/src/maintenance/daily-project-summary.js core/src/maintenance/index.js core/test/daily-project-summary.test.js .pipeline/reviews/C16/M14/test-evidence.md
```

Result: PASS.

## External Side-Effect Boundary

No QQ notification, Notion write, remote write, service restart, or scheduler installation was performed. Validation used dry-run/test behavior only.

## Audit Revision

Audit found two blockers:

- Default window resolution parsed UTC `new Date().toISOString()` as if it were already Shanghai local time.
- M14 lacked a scheduled dry-run/CLI integration path for the `00:30 Asia/Shanghai` daily summary.

Revision:

- Added UTC-equivalent regression for `2026-05-20T16:30:00.000Z`, which must resolve to `2026-05-20T00:30:00+08:00` through `2026-05-21T00:30:00+08:00`.
- Normalized offset/Z timestamps to Shanghai local fields before resolving the window.
- Added `runDailyProjectSummaryScheduler()` to create safe-local summary, message, notification, and ledger evidence.
- Added `hypo-workflow daily-summary-scheduler --dry-run` CLI path and `scripts/daily-summary-scheduler.sh` wrapper.

Revision validation:

```bash
node --test core/test/daily-project-summary.test.js core/test/global-consolidation.test.js core/test/maintenance-backfill.test.js
```

Result: PASS.

- Tests: 14
- Pass: 14
- Fail: 0
