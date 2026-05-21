# C16-M11 Test Evidence

## Scope

RED tests only. No production files were edited.

Added focused contract coverage in `core/test/project-stop-event.test.js` for:

- terminal states `waiting_acceptance`, `completed`, `blocked`, `failed`, and `cannot_continue`
- manual chat pause / user message negative case
- intermediate milestone completion while auto-continue remains possible
- event payload fields: `project_id`, `stop_reason`, `occurred_at`, `progress_summary`, `source_platform`, `session_ref`, `session_hint`, `notification_state`
- stable `id` / `dedupe_key` for duplicate terminal states
- local append-only evidence shape with no QQ, Notion, remote write, send, or external action plan

## RED Command

```bash
node --test core/test/project-stop-event.test.js core/test/lifecycle-regression.test.js core/test/completion-report-contract.test.js
```

Result: failed as expected.

- Total: 14 tests
- Passed: 9
- Failed: 5
- Existing nearby tests passed before the new RED failures.
- Failure reason: `classifyProjectStopEvent` and `buildProjectStopEvent` are not exported from `../src/index.js`.

Representative failure:

```text
expected classifyProjectStopEvent to be exported from ../src/index.js
+ actual - expected

+ 'undefined'
- 'function'
```

Representative build-event failure:

```text
expected buildProjectStopEvent to be exported from ../src/index.js
+ actual - expected

+ 'undefined'
- 'function'
```

## Isolation Check

```bash
node --test core/test/lifecycle-regression.test.js core/test/completion-report-contract.test.js
```

Result: passed.

- Total: 9 tests
- Passed: 9
- Failed: 0

## Contract Notes For Implementation

Expected new API exports:

- `classifyProjectStopEvent(input)`
- `buildProjectStopEvent(input)`

`classifyProjectStopEvent` should return:

- stop case: `{ should_emit: true, stop_reason, event }`
- non-stop case: `{ should_emit: false, stop_reason: null, event: null }`

`buildProjectStopEvent` should create a local append-only event with:

- stable `id` and `dedupe_key` based on project id, stop reason, source platform, session identity, and terminal timestamp
- `notification_state: "pending"`
- `planned_actions: []`
- `remote_writes_enabled: false`
- `external_actions_enabled: false`
