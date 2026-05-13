# C12/M7 Implementation Evidence

## Scope

- `core/src/deep-plan/index.js`

## Implementation

- `convertDeepPlanToPlanContext` now returns `feature_queue_draft` alongside compact `plan_context`.
- The draft preserves `ordered_feature_queue` order for implementation-ready items and carries risks, unknowns, test matrix, and acceptance depth.
- Directional items are parked in `feature_queue_draft.parked_items` instead of becoming executable queued Features.
- `plan_handoff` metadata carries the pseudo-test rejection policy, ordinary Plan requirement, and parked-item blockers.
- Compact Plan context now explicitly carries the pseudo-test rejection policy into ordinary `/hw:plan`.
- Handoff draft leaves `current_feature` null until ordinary Plan confirmation.
- Ready Features inherit global artifacts when they omit explicit risk/test/acceptance refs.

## Validation

- `uv run -- node --test core/test/deep-plan-handoff.test.js core/test/deep-plan-convert.test.js core/test/feature-queue-ops.test.js`: 21/21 passing.
- `git diff --check`: passing.
