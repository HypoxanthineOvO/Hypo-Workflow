# C20-M2 Test Evidence

## Scope

Worker: `test`

Task scope completed: `write_tests` and `review_tests` for shared consultation-first guidance projection across managed instruction surfaces.

Allowed files touched:

- `core/test/c20-consultation-boundary.test.js`
- `.pipeline/reviews/C20/M2/test-evidence.md`

No implementation files or target repositories were edited.

## Test Design

The new focused RED tests live in `core/test/c20-consultation-boundary.test.js` and assert:

- `core/src/artifacts/agent-guidance.js` exports a shared `CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE` string.
- The shared guidance contains the C20 Mini-contract shape: `我的理解`, `问题原因`, `推荐方案`.
- The guidance treats `discussion`, `background`, `idea`, `complaint`, `question`, and `solution-discussion` as non-editing/no-file-edit signals.
- The guidance preserves direct execution for clear imperative requests with concrete targets, so the rule cannot collapse into ask-before-everything behavior.
- The guidance treats post-plan affirmative replies such as `可以`, `确认`, `OK`, `go ahead`, and `apply it` as execution authorization.
- The guidance requires one-sentence explanation on first use of a new concept.
- The guidance separates direct sync scope from target-owned scope and names `Codex-VSP` and `VSP-Open-Code` prompt/reminder boundaries.
- Generated OpenCode command, OpenCode agent, and root `AGENTS.md` surfaces project the same guidance.
- Generated Claude command and Claude agent surfaces project the same guidance.

The assertions use semantic anchors instead of requiring a full copied policy block.

## Test Command

```bash
node --test core/test/c20-consultation-boundary.test.js core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
```

## RED Result

Result: RED, exit code `1`.

Summary from the run:

- Tests: `23`
- Passed: `19`
- Failed: `4`

Expected C20-M2 RED failures from the new tests:

- `agent guidance exports consultation-first shared guidance`
  - Fails because `CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE` is currently `undefined`.
- `OpenCode command, agent, and root instruction surfaces project consultation-first guidance`
  - Fails because generated OpenCode `/hw:plan` command output has no consultation-first heading/label.
- `Claude command and agent surfaces project consultation-first guidance`
  - Fails because generated Claude `/hw:plan` command output has no consultation-first heading/label.

Additional pre-existing/adjacent failure in the combined command:

- `OpenCode artifacts project four-rule discipline and visible phase gates`
  - Fails because generated root `AGENTS.md` does not contain `Think Before Coding`.
  - This assertion was already present in the dirty worktree and was not introduced by this C20-M2 test change.

The six existing C20-M1 contract tests still pass before the new projection tests fail.

## Review Notes

The new tests are intentionally RED against the current implementation. They check the shared source constant first, then generated surfaces, so implementation can satisfy the tests by adding one shared guidance constant and injecting it through existing render paths.

The target-owned boundary is verified as guidance text only. The tests do not require source-side edits to `/home/heyx/Codex-VSP` or `/home/heyx/VSP-Open-Code`.

## Risks

- The expected export name `CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE` follows existing `*_GUIDANCE` naming. If implementation chooses a different public name, either implementation should align with this contract or the test name should be deliberately revised.
- The root `AGENTS.md` projection test may fail after command/agent projection is fixed unless the OpenCode root instruction renderer/template also receives the shared guidance.
