# C12/M2 Audit

## Verdict

pass_with_followups

## Reviewed Refs

- `core/src/deep-plan/index.js`
- `core/test/deep-plan-ask.test.js`
- `core/test/deep-plan-package.test.js`
- `.pipeline/reviews/C12/M2/test-evidence.md`
- `.pipeline/reviews/C12/M2/implementation-evidence.md`

## Findings

- Medium: `generateDeepPlanAskQuestions` currently creates a fixed first-principles queue and defaults to `necessity` without considering existing `ask_rounds` or persisted `next_recommended_question`. This can repeat the first question in later rounds and create an endless-questioning risk. M2 repair round will add a regression and fix this before closing the milestone.
- Low follow-up: shallow-plan gate still relies on structural signals such as challenge ids, readiness depth, accepted decisions, and architecture components. M5 should bind deeper readiness to `readiness_gaps`, open questions, and evidence quality.

## Checked Rules

- Challenge wording covers necessity, minimum viable loop, falsifying evidence, and essential-vs-habitual dimensions.
- Default first ask is not `who is the user` / `用户是谁`.
- Ask-round persistence writes package artifacts only and does not touch protected authority files.
- Worker separation evidence is present for test and implementation roles.

## Tests Checked

- `uv run -- node --test core/test/deep-plan-ask.test.js`: 6/6 passing.
- `uv run -- node --test core/test/deep-plan-package.test.js core/test/deep-plan-ask.test.js`: 10/10 passing.
