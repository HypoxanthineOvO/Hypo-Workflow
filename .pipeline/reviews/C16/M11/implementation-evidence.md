# C16-M11 Implementation Evidence

## Scope

- Added `classifyProjectStopEvent()` in `core/src/workspace/index.js`.
- Added `buildProjectStopEvent()` in `core/src/workspace/index.js`.
- Export path uses the existing `core/src/index.js` workspace re-export.

## Behavior

- Terminal states emit local project stop events:
  - `waiting_acceptance`
  - `completed`
  - `blocked`
  - `failed`
  - `cannot_continue`
- Manual chat pause and chat phase do not emit.
- Intermediate milestone completion with auto-continue available does not emit.
- Event ids and dedupe keys are stable across duplicate terminal states by using project id, stop reason, source platform, session identity, and terminal timestamp.
- Events are local append-only metadata and include no external action plan.

## Validation

```bash
node --test core/test/project-stop-event.test.js core/test/lifecycle-regression.test.js core/test/completion-report-contract.test.js
```

Result: pass, 14/14.

```bash
git diff --check -- core/src/workspace/index.js .pipeline/reviews/C16/M11/implementation-evidence.md
```

Result: pass, no output.
