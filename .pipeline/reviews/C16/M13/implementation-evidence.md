# C16-M13 Implementation Evidence - Hypo-Claw QQ Notification Adapter

## Scope

Implemented the production notification adapter in `core/src/workspace/index.js`.

## Added APIs

- `formatProjectStopNotification(event)`
- `segmentProjectStopNotification(message, options)`
- `sendProjectStopNotification(event, options)`

## Behavior

- Formatter includes project identity, stop reason, progress fields, and appends the final assistant output verbatim at the end.
- Segmenter splits deterministically by character limit and re-joins exactly to the original message.
- `dry-run` and `test` modes render local evidence only and do not spawn Hypo-Claw.
- `notify` mode invokes only the configured Hypo-Claw CLI with `--stdin --notify --thread-id <id> --server <url>`.
- Notify failures are written to a local retry queue, or to the injected `append_retry_queue` hook in tests, preserving the original message and event text.

## Validation

```bash
node --test core/test/hypo-claw-notification.test.js core/test/maintenance-ledger.test.js
```

Result: PASS.

- Tests: 8
- Pass: 8
- Fail: 0

```bash
git diff --check -- core/src/workspace/index.js core/test/hypo-claw-notification.test.js .pipeline/reviews/C16/M13/test-evidence.md
```

Result: PASS.

## External Side-Effect Boundary

No real QQ message was sent during implementation or validation. All notify behavior was tested through an injected spawn runner.

## Audit Revision

Audit found two blockers:

- `notify` computed segments but sent one full message.
- `notify` could spawn Hypo-Claw without an adapter-level confirmation gate.

Revision:

- Added regression tests for explicit notify confirmation and ordered multi-segment CLI calls.
- `notify` now returns `blocked` without spawning unless `confirmed: true`.
- `notify` sends one Hypo-Claw CLI call per segment, each stdin payload carrying `segment.index` and `segment.total`.
- Failure results now record `qq_contacted: false`; the adapter can prove a Hypo-Claw CLI attempt, not direct QQ delivery.

Revision validation:

```bash
node --test core/test/hypo-claw-notification.test.js
```

Result: PASS.

- Tests: 7
- Pass: 7
- Fail: 0
