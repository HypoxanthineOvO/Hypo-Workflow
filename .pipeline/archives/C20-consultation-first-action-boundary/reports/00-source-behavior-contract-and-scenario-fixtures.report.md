# C20-M1 Report — Source Behavior Contract And Scenario Fixtures

## Conclusion

C20-M1 completed with `PASS_WITH_WARNINGS` and no blockers. The source-side consultation-first action boundary now exists as an authoritative contract, and focused tests validate the approved behavior anchors.

## Change Summary

- Added `references/consultation-first-action-boundary.md`.
- Added `core/test/c20-consultation-boundary.test.js`.
- Added worker evidence under `.pipeline/reviews/C20/M1/`.

## Technical Approach

The milestone used a TDD contract-test slice:

1. `test` worker wrote a focused test that failed because the source contract did not exist.
2. Main thread confirmed RED with `node --test core/test/c20-consultation-boundary.test.js`.
3. `implement` worker added the Markdown source contract without editing the test.
4. Main thread confirmed GREEN with the same command.
5. `audit` worker reviewed contract fidelity, test meaningfulness, worker separation, and source/target boundaries.

## Modified Files / Modules

- `references/consultation-first-action-boundary.md`
- `core/test/c20-consultation-boundary.test.js`
- `.pipeline/reviews/C20/M1/test-evidence.md`
- `.pipeline/reviews/C20/M1/implementation-evidence.md`
- `.pipeline/reviews/C20/M1/audit.md`

## Test Design

The focused Node test reads `references/consultation-first-action-boundary.md` and validates:

- discussion/background/idea/complaint/question/solution-discussion as non-editing signals
- Mini-contract order: `我的理解` -> `问题原因` -> `推荐方案`
- direct execution for clear imperative requests with concrete targets
- post-plan affirmative execution authorization
- first-use new concept one-sentence explanation
- direct sync scope and target-owned scope separation for `Codex-VSP` and `VSP-Open-Code`

## Validation Results

- RED: `node --test core/test/c20-consultation-boundary.test.js` exited 1, 0/6 passing, missing `references/consultation-first-action-boundary.md`.
- GREEN: `node --test core/test/c20-consultation-boundary.test.js` exited 0, 6/6 passing.
- Audit: `PASS_WITH_WARNINGS`, no blockers, no Critical or Warning issues.

## Expected Result

C20 now has a source-owned behavior contract that later milestones can project into managed instruction surfaces and use as target-local Cycle input.

## Problems Encountered

Target repositories were already dirty, so M1 target isolation was judged through scoped evidence and audit notes rather than clean target status.

## Risks / Follow-Up

- M2 must preserve the direct execution carve-out when projecting the rule into generated guidance.
- M3 must verify rendered managed surfaces, not only source Markdown.
- M4 must keep target-owned prompt and reminder work in target-local Cycles with explicit file lists and validation.
