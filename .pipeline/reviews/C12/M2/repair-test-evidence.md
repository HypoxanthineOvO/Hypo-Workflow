# C12/M2 Repair Test Evidence

## Worker

- role: test
- worker_id: `019e1ccb-312a-7730-98e9-8006351c0b9c`
- lifecycle: requested -> started -> completed -> closed

## Files Changed By Test Worker

- `core/test/deep-plan-ask.test.js`

## Red Test Command

```bash
uv run -- node --test core/test/deep-plan-ask.test.js
```

## Expected RED Result

The focused repair test failed as expected because `generateDeepPlanAskQuestions` repeats `necessity` instead of advancing to the persisted or next unanswered challenge:

- expected `minimum_viable_loop`, actual `necessity`
- expected `falsifying_evidence`, actual `necessity`

## Coverage

- Existing `ask_rounds` must influence the next default ask.
- Persisted `next_recommended_question` must be honored when it points to an unanswered challenge.
- Answered challenges must not remain the default.
