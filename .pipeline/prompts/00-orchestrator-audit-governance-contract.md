# M01 / F001 - Audit Governance Contract

## Objective

- Upgrade `audit` from a final passive review to a hard execution authority with mid-flight rejection, escalation, and blocked approval power.

## Prompt Shape

canonical milestone prompt only

## Audit Memory

- Project rules from `rules.md` remain globally binding.
- User requirements:
  - `audit` may reject `milestone`, `feature`, or `cycle`
  - `audit` may intervene before completion
  - only `implement` may propose blocked; only `audit` may approve blocked
  - spawn must not blur `test` and `implement`

## Subworker Assignment Plan

- `test`
  - Scope: tests/spec fixtures/examples for governance contracts only
  - Forbidden overlap: no implementation edits, no audit verdicts
  - Output: test evidence + changed test paths
- `implement`
  - Scope: spec/contract/state/log schema and related docs for M01 only
  - Forbidden overlap: no tests, no audit artifacts, no validation verdicts
  - Output: implementation diff summary + changed file list
- `audit`
  - Scope: read-only review of diff, worker separation, evidence quality, user requirement coverage
  - Forbidden overlap: no file edits
  - Output: verdict, findings, rejection or approval artifact

## Required Validation

- focused tests/spec fixtures/examples for governance contracts
- red/green expectation summary
- pass/fail signal for each governance rule

## Forbidden

- no implementation work in the canonical prompt
- no audit verdict artifacts in the canonical prompt
- no role impersonation

## Execution Contract

1. `test` writes or updates focused tests/spec checks for:
   - audit mid-flight rejection
   - rejection scope escalation
   - blocked approval authority
2. `implement` updates the core contracts and docs.
3. `audit` validates:
   - `audit` authority is explicit
   - escalation levels are explicit
   - blocked approval path is explicit
   - worker roles remained distinct

## Pass Signal

- Contract docs/specs clearly define the upgraded `audit` authority.
- Focused tests or fixtures cover the authority rules.
- `audit` returns `pass` without role-crossing or requirement gaps.

## Rejection Rules

- Reject if any artifact still treats `audit` as end-only review.
- Reject if blocked can be set without explicit audit approval.
- Reject if the same worker appears as both `test` and `implement`.
