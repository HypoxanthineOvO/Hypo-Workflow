# M05 / F001 - Rejection Rework Blocked Runtime Loop

## Objective

- Turn rejection, rework, and blocked behavior into a deterministic runtime loop.

## Prompt Shape

canonical milestone prompt only

## Subworker Assignment Plan

- `test`: verify reject/rework/blocked scenarios
- `implement`: update runtime contracts, artifacts, and docs
- `audit`: validate that rejection leads to proper rework and blocked approval flow

## Rework Prompt Contract

- A rework prompt must reference the original prompt or source prompt through `original_prompt_ref` / `prompt_ref`.
- A rework prompt must be rejection-driven: derive scope from the rejection artifact, `required_rework`, rejection scope, findings, and feedback.
- A rework prompt is incremental: only the delta scope required by rejection findings is allowed unless the rejection artifact explicitly expands scope.

## Forbidden

- no deterministic next step omission
- no blocked bypass of audit

## Execution Contract

1. Define structured `rejection artifact`
2. Define structured `blocked evidence`
3. Define default rework path: `test` + `implement`
4. Define `audit` approval requirement for blocked
5. Define `rework prompt` linkage

## Pass Signal

- runtime loop is closed and auditable
- rework ownership is explicit

## Rejection Rules

- Reject if rejection leaves no deterministic next step
- Reject if blocked can bypass audit
