# C20-M1 Test Evidence

Timestamp: 2026-06-30T20:03:37+08:00

Worker: test

Scope:

- Edited `core/test/c20-consultation-boundary.test.js`.
- Edited `.pipeline/reviews/C20/M1/test-evidence.md`.
- Did not edit `references/consultation-first-action-boundary.md`.
- Did not edit `/home/heyx/Codex-VSP` or `/home/heyx/VSP-Open-Code`.

## Test Command

```bash
node --test core/test/c20-consultation-boundary.test.js
```

## Red Result

Expected red result observed on the final test version.

- Exit code: 1
- Tests: 6
- Pass: 0
- Fail: 6
- Root failure:
  `missing consultation-first action boundary contract at references/consultation-first-action-boundary.md: ENOENT: no such file or directory`

This is the intended red state for the test worker because the source contract file is not implemented in this scope.

## Coverage Notes

The focused contract test reads `references/consultation-first-action-boundary.md` and asserts these anchors:

- Discussion, background, idea, complaint, question, and solution-discussion inputs are non-editing/no-file-edits signals.
- The Mini-contract structure appears in order: `我的理解` -> `问题原因` -> `推荐方案`.
- Clear imperative requests with concrete targets preserve direct execution.
- Post-plan affirmative replies authorize execution and include `可以`, `确认`, `OK`, `go ahead`, and `apply it`.
- First use of a new concept requires a one-sentence explanation.
- Direct sync scope and target-owned scope are separated, and target boundaries name `Codex-VSP` and `VSP-Open-Code`.

## Risks

- The test intentionally allows both English and Chinese anchors for most requirements, but it still expects explicit contract language rather than only implied behavior.
- Because the contract file is currently missing, all subtests fail at the missing-file gate; content-level assertion quality must be rechecked after the implement worker adds the contract.
- The Workflow state files were not updated by this worker because the assigned edit whitelist only permits the test file and this evidence file.
