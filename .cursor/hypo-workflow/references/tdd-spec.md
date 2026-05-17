# TDD Step Spec

Use this reference when the active pipeline step belongs to the TDD preset. The main skill only decides step order and state transitions; this file defines what each step should actually do.

## Sequence Map

Built-in presets:

- `tdd`
- `implement-only`
- `custom`
- `analysis`

`tdd` expands to:

1. `write_tests`
2. `review_tests`
3. `run_tests_red`
4. `implement`
5. `run_tests_green`
6. `review_code`

`implement-only` expands to:

1. `implement`
2. `run_tests`
3. `review_code`

`analysis` uses a separate investigative chain defined in [`analysis-spec.md`](./analysis-spec.md). It is not an alias for `implement-only`.

## Shared TDD Rules

- Work only on the current prompt.
- Use the current prompt file as the authoritative source for `需求`, `预期测试`, and `预期产出`.
- Prefer the smallest correct change set.
- Drive one behavior at a time through a red/green/refactor loop: write the failing test for that behavior, implement the smallest code to pass it, then clean up.
- Do not batch unrelated tests or unrelated implementation changes into a single loop.
- Prefer real feedback from runnable validation over proof by inspection.
- Preserve existing project conventions unless the prompt explicitly requires a structural change.
- When evidence is missing, stop and record a blocking reason instead of guessing.

## write_tests

Goal: translate `预期测试` into concrete automated checks.

Worker-separation rule:

- when `execution.worker_separation.mode` is `recommended` or `strict`, `write_tests` must be owned by the independent `test` worker before red tests are written
- the main agent may prepare context and acceptance boundaries, but must not create or edit the red tests locally first and then request independent review afterward
- if the host cannot authorize or start the test worker, stop before writing tests unless the plan explicitly selected the fastest single-agent `off` lane with user-confirmed downgrade evidence

Design principles:

- Cover the happy path first.
- Add edge cases for empty values, invalid input, and missing resources where relevant.
- Include error-handling tests when the prompt implies failure behavior.
- Keep the tests close to observable behavior; do not overfit to internals.
- Keep each new test scoped to one behavior when practical.
- Do not add production implementation in this step.

Expected notes:

- files created or modified
- approximate new test count
- deferred coverage risks, if any

## review_tests

Goal: verify that the new or updated tests are worth implementing against.

Checklist:

- Does the suite cover every named expectation from `预期测试`?
- Are there boundary cases for empty, missing, or invalid inputs?
- Are test names readable and scoped to one behavior each?
- Are there redundant or brittle tests that should be simplified?

Outcome guidance:

- `pass`: coverage is sufficient and naming is clear
- `needs_changes`: small gaps exist and can be fixed immediately
- `critical`: the tests are misleading or fundamentally incomplete

Review artifact:

- write or reference a review artifact under `.pipeline/reviews/<feature>/<milestone>/review_tests/`
- include `verdict`, non-empty `reviewed_refs`, checked and unchecked rules when available, and `fallback_reason` when no independent reviewer is available
- on `needs_changes`, repair and re-review within the bounded retry policy from `review-artifacts-spec.md`

## run_tests_red

Goal: confirm that the newly written tests fail before implementation.

Expected behavior:

- Newly introduced tests should fail for the right reason.
- Existing unrelated tests may still pass.
- A fully green run is suspicious unless the target behavior already exists.

Record at minimum:

- command used
- pass/fail/error counts
- whether the failure mode matches the prompt

## implement

Goal: make the intended tests pass with the smallest reasonable implementation.

Worker-separation rule:

- when `execution.worker_separation.mode` is `recommended` or `strict`, `implement` must be owned by the independent implementation worker before implementation edits are made
- the main agent may prepare context, integrate returned changes, and resolve merge conflicts, but must not create the implementation locally first and then request review or certification
- if the host cannot authorize or start the implementation worker, stop before implementation edits unless the plan explicitly selected the fastest single-agent `off` lane with user-confirmed downgrade evidence

Implementation rules:

- Follow the project architecture already in the repository.
- Avoid changing tests unless you can point to a test bug.
- Keep interfaces simple and consistent with the prompt.
- Prefer explicit behavior over clever abstractions.
- If the prompt conflicts with reality, document the compromise in notes.

## run_tests_green

Goal: verify that the prompt is complete and non-regressive.

Passing standard:

- The intended suite for the current prompt is green.
- Previously passing tests remain green.
- When `write_tests` was skipped through cascade logic, this step can degrade to inline validation and must record `fallback=inline_validation, reason=tests_skipped`.

Record at minimum:

- command or fallback mode used
- pass/fail/error counts
- regressions, if any

## run_tests

Use this step for `implement-only` or custom flows that include a generic test gate.

If no test files exist for the current prompt:

- run inline validation instead
- verify imports succeed
- verify there are no syntax errors
- note `inline_validation` in state and log

## review_code

Goal: assess final code quality and prompt alignment.

Review checklist:

- readability
- naming clarity
- structural complexity
- obvious bugs or unsafe behavior
- fit versus `预期产出`
- architecture drift versus what the prompt asked for

This step produces both:

- `code_quality`
- `diff_score`

The main skill consumes those values when computing the final decision.

Review artifact:

- write or reference a review artifact under `.pipeline/reviews/<feature>/<milestone>/review_code/`
- include the final verdict, reviewed refs, issues, retry round, checked/unchecked rules, and secret-safe evidence pointers
- strict review policies may block `warn`, `needs_changes`, or `critical`; default policy retries `needs_changes` up to 3 total rounds
