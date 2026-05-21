# C16-M15 Project Linkage End To End Dry-Run

## Goal

Wire the project linkage registry, stop event detection, final assistant output capture, Hypo-Claw notification adapter, retry queue, and daily summary into one no-side-effect dry-run before enabling real QQ notifications.

## Technical Solution

Build an end-to-end dry-run bundle and validation scenario. One fixture project reaches `waiting_acceptance` and has a valid final assistant output; another reaches a stop state but lacks final output. The first should produce stop notification segments. The second should block stop notification, record capture failure, and appear in the daily summary failure section.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns end-to-end fixtures, no-external-action assertions, final-output missing negative path, and summary assertions.
  - Evidence path: `.pipeline/reviews/C16/M15/test-evidence.md`.
- `implement`
  - Owns end-to-end orchestration helper, dry-run bundle renderer, final wiring, and command/docs touchpoints.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M15/implementation-evidence.md`.
- `audit`
  - Reviews no false complete notification, no output truncation, no real side effects, and worker separation evidence.
  - Evidence path: `.pipeline/reviews/C16/M15/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Build fixture scenario with one valid waiting-acceptance event and one capture failure event.
2. Generate stop notification dry-run segments for the valid event.
3. Record capture failure and retry/failure state for the invalid event.
4. Generate the daily `00:30` summary containing both project outcomes.
5. Verify no Notion writes, no publish actions, and no real QQ send in dry-run.

## Research Required

Status: resolved.

Evidence:

- C16-M10 through C16-M14 contracts.

## Risks And Alternatives

Risks:

- End-to-end path could pass with unrealistic mocks while real session capture fails.

Rejected alternative: enable real notifications immediately. Dry-run evidence must pass first.

## Validation

Run:

```bash
node --test core/test/project-linkage-e2e.test.js core/test/project-stop-event.test.js core/test/final-assistant-output.test.js core/test/hypo-claw-notification.test.js core/test/daily-project-summary.test.js
cd core && npm test
git diff --check
```

Pass signal: complete fixture sends dry-run stop segments, missing final output prevents stop notification, daily summary includes the failure notice, and no external writes occur.

## Audit Focus

- No false complete notification.
- Complete output preservation.
- No external side effects in dry-run.
- Worker separation evidence.

## Completion Report Requirements

Include dry-run bundle path, stop notification sample, missing-output failure evidence, daily summary sample, validation output, and residual risks before real QQ enablement.
