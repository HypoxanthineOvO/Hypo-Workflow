# C16-M15 Test Evidence

## Scope

Test subtask only. Modified paths:

- `core/test/project-linkage-e2e.test.js`
- `core/test/fixtures/project-linkage-e2e/`
- `.pipeline/reviews/C16/M15/test-evidence.md`

No production code was changed.

## RED Contract Added

Added an end-to-end dry-run contract for `buildProjectLinkageE2EDryRunBundle`.

The fixture covers two projects:

- `hypo-workflow`: reaches `waiting_acceptance`, captures exact final assistant output, and must generate stop notification dry-run segments.
- `hypo-claw`: reaches terminal `failed` state but has no final assistant output, so stop notification must be blocked, capture failure must be recorded, and the failure must appear in the daily summary failure section.

Bundle assertions require:

- `registry`
- `stop_events`
- `capture_results`
- `notification_dry_run`
- `daily_summary`
- `no_external_side_effects`

No-side-effect assertions require:

- no QQ send
- no Notion write
- no publish
- no Hypo-Claw spawn in dry-run
- `remote_writes_enabled=false`
- `external_actions_enabled=false`

## Validation

Command:

```bash
node --test core/test/project-linkage-e2e.test.js
```

Result: expected RED failure.

- Tests: 2
- Pass: 0
- Fail: 2
- Failure reason: `buildProjectLinkageE2EDryRunBundle` is not exported from `../src/index.js`.

Command:

```bash
node --test core/test/project-stop-event.test.js core/test/final-assistant-output.test.js core/test/hypo-claw-notification.test.js core/test/daily-project-summary.test.js
```

Result: adjacent tests pass.

- Tests: 23
- Pass: 23
- Fail: 0

Command:

```bash
node --test core/test/project-linkage-e2e.test.js core/test/project-stop-event.test.js core/test/final-assistant-output.test.js core/test/hypo-claw-notification.test.js core/test/daily-project-summary.test.js
```

Result: expected RED failure isolated to the new E2E contract.

- Tests: 25
- Pass: 23
- Fail: 2
- Failure reason: missing `buildProjectLinkageE2EDryRunBundle` export.

Command:

```bash
git diff --check -- core/test/project-linkage-e2e.test.js core/test/fixtures/project-linkage-e2e .pipeline/reviews/C16/M15/test-evidence.md
```

Result: pass.

## Notes

Per worker-scope instruction, this test subtask did not implement production orchestration code.
Per explicit path restriction, this subtask did not update `.pipeline/state.yaml`, `.pipeline/log.yaml`, or `.pipeline/PROGRESS.md`.
