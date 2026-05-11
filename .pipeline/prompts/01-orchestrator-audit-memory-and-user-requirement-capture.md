# M02 / F001 - Audit Memory And User-Requirement Capture

## Objective

- Persist project rules, user special requirements, and cycle decisions into a durable audit memory model that plan/start/resume can consume safely.

## Prompt Shape

canonical milestone prompt only

## Audit Memory

- Required sources:
  - `rules.md` key interpretations
  - user special requirements from this planning session
  - C11 cycle decisions

## Subworker Assignment Plan

- `test`: validate memory schema, inheritance, and visibility boundaries
- `implement`: add memory file/schema/contracts/docs
- `audit`: verify nothing falls back to raw free-form conversation as authority

## Required Validation

- memory schema, inheritance, and visibility checks
- user requirement survives start/resume handoff
- scoped summaries do not expose unnecessary raw context

## Forbidden

- no implementation edits outside named memory assets
- no audit verdict writing
- no role impersonation

## Execution Contract

1. Define cycle-level `audit memory`
2. Define milestone-level `audit delta`
3. Define role-scoped views for `/hw:plan`, `/hw:start`, `/hw:resume`
4. Ensure `audit` can check missing user requirement carry-over

## Pass Signal

- Durable schema exists
- inheritance and scope rules are explicit
- tests/examples prove user requirements survive handoff

## Rejection Rules

- Reject if user requirements remain implicit chat context only
- Reject if `test` or `implement` can read unnecessary unrestricted memory
