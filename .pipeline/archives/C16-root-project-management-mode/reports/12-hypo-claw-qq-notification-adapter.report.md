# C16-M13 Hypo-Claw QQ Notification Adapter Report

## Result

Completed.

## Summary

C16-M13 added a local Hypo-Claw QQ notification adapter for project-stop events:

- `formatProjectStopNotification()`
- `segmentProjectStopNotification()`
- `sendProjectStopNotification()`

The adapter formats project identity, stop reason, progress fields, and the final assistant output. The final assistant output is appended verbatim and is not redacted, summarized, or truncated by the adapter.

## Formatter Example

The formatter produces a project-stop message ending with:

```text
Final assistant output:
<original final assistant output>
```

Tests cover blank lines, fenced code, token-looking text, brackets, Chinese text, and punctuation.

## Segmentation And CLI Behavior

- Default segment size: 1800 characters.
- Segments carry stable `index`, `total`, and `body`.
- Rejoining all segment bodies equals the original formatted message.
- Confirmed notify sends one Hypo-Claw CLI call per segment.
- CLI shape:

```bash
<hypo-claw-cli> --stdin --notify --thread-id <id> --server <url>
```

`dry-run` and `test` modes render local evidence only and do not spawn Hypo-Claw.

## Retry Behavior

On notify failure, the adapter writes a local retry queue entry, or uses the injected `append_retry_queue` hook in tests. Retry evidence preserves:

- channel `hypo-claw-qq`
- CLI command and args
- failure status/stdout/stderr
- full formatted message
- segment list
- original event including unmodified `final_assistant_output`

## Audit Outcome

Initial audit found two blockers:

- notify did not actually send per-segment messages.
- notify lacked an adapter-level external-action confirmation gate.

Both were fixed. `notify` now requires `confirmed: true`; otherwise it returns `blocked` without spawning. Confirmed notify sends ordered segment calls with `segment.index/total` metadata. Audit recheck PASS.

## Files Changed

- `core/src/workspace/index.js`
- `core/test/hypo-claw-notification.test.js`
- `.pipeline/reviews/C16/M13/test-evidence.md`
- `.pipeline/reviews/C16/M13/implementation-evidence.md`
- `.pipeline/reviews/C16/M13/audit.md`

## Validation

```bash
node --test core/test/hypo-claw-notification.test.js core/test/maintenance-ledger.test.js
```

Result: 10/10 passing.

```bash
node --test core/test/hypo-claw-notification.test.js core/test/project-stop-event.test.js core/test/final-assistant-output.test.js core/test/maintenance-ledger.test.js
```

Result: 20/20 passing.

```bash
cd core && npm test
```

Result: 609/609 passing.

```bash
git diff --check
```

Result: passing.

## Side-Effect Boundary

- Real QQ sends: none.
- Notion writes: none.
- Remote writes: none.
- Notify behavior was validated only with injected fake spawn runners.

## Residual Risks

Successful notify currently proves Hypo-Claw CLI calls completed, not direct end-to-end QQ delivery. Downstream code should treat `external_contacted/spawned` as CLI attempt evidence and reserve live QQ confirmation for explicitly authorized integration runs.
