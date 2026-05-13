# C12/M2 Test Evidence

## Worker

- role: test
- worker_id: `019e1cbb-e6d5-7823-930a-b465cfe5c658`
- lifecycle: requested -> started -> completed -> closed

## Files Changed By Test Worker

- `core/test/deep-plan-ask.test.js`

## Red Test Command

```bash
uv run -- node --test core/test/deep-plan-ask.test.js
```

## Expected RED Result

The focused test failed as expected because the public Deep Plan ask API is not implemented/exported yet:

- `generateDeepPlanAskQuestions`
- `recordDeepPlanAskRound`
- `assessDeepPlanShallowPlanGate`

## Coverage

- First-principles challenge queue covers necessity, minimum viable loop, falsifying evidence, and essential-vs-habitual pressure tests.
- The default first question must not be `who is the user` / `用户是谁`.
- Ask rounds are iterative and persisted back into the package with decisions, open questions, ambiguity, and next recommended question.
- Shallow/pseudo-deep packages are rejected before convert/decompose until target readiness depth is met.

## Ownership

The test worker owns `core/test/deep-plan-ask.test.js`. The implement worker must not edit it.
