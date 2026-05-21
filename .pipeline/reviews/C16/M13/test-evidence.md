# C16-M13 Test Evidence - Hypo-Claw QQ Notification Adapter

## Scope

Added RED test coverage only. No production files were edited.

New test asset:

- `core/test/hypo-claw-notification.test.js`

## Contract Covered

- Notification formatting includes project identity, stop reason, progress summary, and the final assistant output as original text.
- Final assistant output preservation covers blank lines, code fences, token-looking strings, brackets, Chinese text, and punctuation.
- Long notifications are split into complete ordered segments and rejoin exactly to the original formatted message.
- Segmentation records stable `index` and `total` metadata and does not truncate the last segment.
- `dry-run` and `test` modes render segments but do not spawn Hypo-Claw and do not contact QQ.
- `notify` mode constructs only the Hypo-Claw CLI invocation:
  - `--stdin`
  - `--notify`
  - `--thread-id <id>`
  - `--server <url>`
- The adapter must not call a QQ client directly.
- Failed notify sends write a local retry queue entry with channel `hypo-claw-qq`, CLI args, failure stderr, full message text, and the original event with unmodified `final_assistant_output`.

## RED Command Results

Command:

```bash
node --test core/test/hypo-claw-notification.test.js
```

Result: RED as expected.

- Tests: 5
- Pass: 0
- Fail: 5
- Failure reason: expected new APIs to be exported from `../src/index.js`
  - `formatProjectStopNotification`
  - `segmentProjectStopNotification`
  - `sendProjectStopNotification`

Representative formatter failure:

```text
expected formatProjectStopNotification to be exported from ../src/index.js
+ actual - expected

+ 'undefined'
- 'function'
```

Representative send-adapter failure:

```text
expected sendProjectStopNotification to be exported from ../src/index.js
+ actual - expected

+ 'undefined'
- 'function'
```

## Isolation Check

Command:

```bash
node --test core/test/project-stop-event.test.js core/test/final-assistant-output.test.js
```

Result: PASS.

- Tests: 10
- Pass: 10
- Fail: 0

This confirms the new RED failures are isolated to the missing C16-M13 notification adapter exports, while the C16-M11 project-stop event contract and C16-M12 final assistant output capture contract remain green.

## Notes For Implementation Worker

Expected new API exports:

- `formatProjectStopNotification(event)`
- `segmentProjectStopNotification(message, options)`
- `sendProjectStopNotification(event, options)`

`sendProjectStopNotification` should support dependency injection for tests:

- `spawn(command, args, options)` for Hypo-Claw CLI execution
- `append_retry_queue(entry)` for local retry queue writes
- `qq_client` only as a negative guard; direct QQ calls should never be used by this adapter

`dry-run` and `test` must be local-only validation modes. `notify` is the only mode that should set `external_contacted: true`, and only through the Hypo-Claw CLI command shape listed above.
