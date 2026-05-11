# M04 / F001 - Worker Separation And Spawn Anti-Cross-Role Enforcement

## Objective

- Make strict worker separation enforceable and auditable, with explicit detection of spawn cross-role behavior.

## Prompt Shape

canonical milestone prompt only

## Audit Memory

- Highest-risk scenario: same worker secretly performs both `test` and `implement`.

## Subworker Assignment Plan

- `test`: create validation for worker identity, file ownership, lifecycle evidence
- `implement`: update separation contracts and schemas
- `audit`: certify strict separation or reject

## Required Validation

- worker identity uniqueness
- prompt scope
- changed file ownership
- lifecycle closure
- separated test/implement evidence

## Forbidden

- runtime observation alone is not enough
- cross-role detection must not be underspecified

## Execution Contract

1. Define strict role separation requirements
2. Require evidence for:
   - worker identity uniqueness
   - prompt scope
   - changed file ownership
   - lifecycle closure
   - separated test/implement evidence
3. Allow audit to reject on cross-role evidence

## Pass Signal

- strict separation is contractually enforceable
- focused tests/examples detect cross-role cases

## Rejection Rules

- Reject if runtime observation is treated as enough without persisted evidence
- Reject if cross-role detection is underspecified
