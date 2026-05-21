# C16-M13 Hypo-Claw QQ Notification Adapter

## Goal

Send project stop notifications through Hypo-Claw QQ only, with dry-run/test/notify modes and no content truncation.

## Technical Solution

Add a local notification adapter that formats project-stop notifications and invokes Hypo-Claw CLI. Long content is split into ordered segments. The final assistant output remains original text; the adapter must not redact or truncate it.

Hypo-Claw CLI contract observed:

- `--stdin`
- `--notify`
- `--thread-id <id>`
- `--server <url>`
- `--test`

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns formatter snapshots/fixtures, segmentation integrity tests, CLI invocation tests, and failure queue tests.
  - Evidence path: `.pipeline/reviews/C16/M13/test-evidence.md`.
- `implement`
  - Owns notification formatter, segmenter, Hypo-Claw CLI adapter, retry queue integration, and mode handling.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M13/implementation-evidence.md`.
- `audit`
  - Reviews external-action boundary, no-truncation behavior, QQ-only scope, and retry evidence.
  - Evidence path: `.pipeline/reviews/C16/M13/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Add project-stop notification formatter with project name, stop reason, progress summary, and final assistant output.
2. Add deterministic segmentation that preserves the full text and segment order.
3. Add dry-run and test modes that do not contact QQ.
4. Add notify mode that shells out to the configured Hypo-Claw CLI with `--stdin --notify`.
5. Add local retry queue entries when sending fails.

## Research Required

Status: resolved for CLI contract.

Evidence:

- `/home/heyx/Hypo-Claw/src/cli.ts`

Deferred:

- Real QQ delivery remains an execution-time external side effect and needs explicit execution authorization.

## Risks And Alternatives

Risks:

- External action failure could lose notifications.
- Very long final output could exceed QQ limits if segmentation is incorrect.

Rejected alternative: each project sends QQ directly. Hypo-Claw is the unified notification outlet.

## Validation

Run:

```bash
node --test core/test/hypo-claw-notification.test.js core/test/maintenance-ledger.test.js
cd core && npm test
```

Pass signal: dry-run/test preserve all segments, notify mode builds the expected CLI invocation, and failures enter retry queue without dropping the original message.

## Audit Focus

- No truncation.
- QQ-only v1 channel.
- Failure/retry evidence.
- No real QQ send in dry-run/test validation.

## Completion Report Requirements

Include formatter example, segment count evidence, CLI command shape, retry behavior, validation output, and external-action residual risks.
