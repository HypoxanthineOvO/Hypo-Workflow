# C12/M7 Test Evidence

Worker: test
Date: 2026-05-13
Scope: Deep Plan convert handoff into Feature Queue / ordinary Plan flow.

## Files Added

- `core/test/deep-plan-handoff.test.js`

## Command

```bash
node --test core/test/deep-plan-handoff.test.js core/test/deep-plan-convert.test.js core/test/feature-queue-ops.test.js
```

## Result

- Total: 20
- Passed: 17
- Failed: 3

## RED Failures

1. `Deep Plan convert emits an ordered Feature Queue draft with risks, unknowns, tests, and acceptance depth`
   - Failure: `conversion must return a structured Feature Queue draft`
   - Evidence: `convertDeepPlanToPlanContext` currently returns compact `plan_context` Markdown, but no `feature_queue_draft` structure.

2. `Deep Plan handoff parks directional items instead of turning them into executable Features`
   - Failure: `conversion must return a structured Feature Queue draft`
   - Evidence: mixed readiness handoff has no draft surface for `features` vs `parked_items`, so directional parking cannot be verified yet.

3. `ordinary Plan context preserves pseudo-test rejection policy from Deep Plan handoff`
   - Failure: `ordinary Plan context must carry the no-pseudo-test policy into P1/P2`
   - Actual compact context included Feature Queue, Test Matrix, Acceptance Depth, Risks, and Unresolved Items, but no pseudo-test rejection / real-test policy.

## Passing Guard

- `implementation-ready Deep Plan handoff rejects missing target-depth artifacts with explicit gaps`
  - Missing `test_matrix` is rejected with a `test matrix` readiness gap.
  - Missing `acceptance_depth` is rejected with an `acceptance depth` readiness gap.
