# C16-M14 Test Evidence

Role: test
Scope: RED tests only.
Allowed files changed:

- `core/test/daily-project-summary.test.js`
- `.pipeline/reviews/C16/M14/test-evidence.md`

## Coverage Added

- Asia/Shanghai `00:30` to `00:30` daily summary window with inclusive start and exclusive end.
- Multi-project aggregation across project stop events and progress records.
- Project stop event de-duplication by event id.
- Notification failures and retry-needed items required before normal project activity.
- Hypo-Claw segmentation reuse for long daily summary messages without truncation.
- `dry-run` and `test` modes must not spawn Hypo-Claw, contact QQ, or write Notion.

## Focused RED Result

Command:

```bash
node --test core/test/daily-project-summary.test.js
```

Result: failed as expected.

Observed:

- 4 tests run.
- 3 passed.
- 1 failed.

Expected RED failure:

- `rendered daily summary is Chinese and puts notification failures before project activity`
- Failure reason: rendered output includes notification failures but does not include the explicit retry-needed item reason `previous stop notification queued for retry`.

This is the intended remaining production gap for C16-M14 test ownership: retry-needed items must be aggregated and rendered in the priority section before project activity.

## Adjacent Tests

Command:

```bash
node --test core/test/project-stop-event.test.js core/test/hypo-claw-notification.test.js core/test/project-linkage-registry.test.js
```

Result: passed.

Observed:

- 16 tests run.
- 16 passed.
- 0 failed.

## Prompt Validation Bundle

Command:

```bash
node --test core/test/daily-project-summary.test.js core/test/global-consolidation.test.js core/test/maintenance-backfill.test.js
```

Result: failed as expected because the new daily summary RED case fails.

Observed:

- 12 tests run.
- 11 passed.
- 1 failed.

The adjacent `global-consolidation` and `maintenance-backfill` tests passed in this bundle.
