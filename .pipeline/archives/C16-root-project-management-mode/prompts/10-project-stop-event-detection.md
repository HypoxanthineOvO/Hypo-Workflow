# C16-M11 Project Stop Event Detection

## Goal

Detect real project stop events after Codex/OpenCode/Workflow execution reaches a terminal state. Do not notify for casual chat pauses or intermediate progress while auto-continue is still possible.

## Technical Solution

Add a project-stop event model backed by local append-only evidence. Terminal states are `waiting_acceptance`, `completed`, `blocked`, `failed`, and `cannot_continue`. Each event records project id, stop reason, timestamp, progress summary, source platform, session hint, and notification state.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns terminal/non-terminal fixtures, manual chat pause negative tests, and event idempotency tests.
  - Evidence path: `.pipeline/reviews/C16/M11/test-evidence.md`.
- `implement`
  - Owns stop-event classifier, event serialization, append-only local store integration, and exports.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M11/implementation-evidence.md`.
- `audit`
  - Reviews false-positive notification risk, duplicate suppression, and evidence integrity.
  - Evidence path: `.pipeline/reviews/C16/M11/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Define terminal stop reasons and non-terminal continuing states.
2. Add classifier inputs for Workflow state, acceptance state, continuation/blocked state, and platform session metadata.
3. Add append-only local event records for stop notification and daily summary aggregation.
4. Add deduplication by project id, session id, stop reason, and terminal timestamp.
5. Ensure manual chat pause text is not a stop source.

## Research Required

Status: resolved for contract.

Evidence:

- User confirmed manual chat pause is not a project stop.
- Existing `.pipeline/state.yaml`, `.pipeline/log.yaml`, completion reports, and lifecycle helpers provide terminal-state signals.

## Risks And Alternatives

Risks:

- False positives could spam QQ.
- False negatives could omit required stop notifications.

Rejected alternative: notify on every milestone completion. The user wants notification when the run stops.

## Validation

Run:

```bash
node --test core/test/project-stop-event.test.js core/test/lifecycle-regression.test.js core/test/completion-report-contract.test.js
cd core && npm test
```

Pass signal: terminal fixture states emit stop events, manual pause/chat fixtures do not, continuing workflow fixtures do not notify, and duplicate terminal states do not create duplicate notifications.

## Audit Focus

- Terminal-state accuracy.
- No notification without a real run stop.
- Append-only event evidence.

## Completion Report Requirements

Include stop reason matrix, negative cases, deduplication behavior, validation output, and residual platform ambiguity.
