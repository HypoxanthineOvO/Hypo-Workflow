# M12 / F004 - Confirmed Install and Multi-Worker Support

## Objective

- Add explicit-confirmation flows for real Codex plugin installation and support safe multi-Codex-worker delegation when ownership is disjoint.

## 需求

- Default behavior remains detection and guidance only.
- User-level `~/.claude` writes, remote plugin installs, and `claude plugin install` style commands require explicit confirmation.
- Installation proposals must show target, command, scope, external side effects, and rollback/fallback notes.
- Multi-worker Codex delegation is allowed only when a milestone can split file/module ownership cleanly.
- Record worker ownership, files touched, fallback reason, and integration result in review/report artifacts.

## Boundaries

- In scope:
  - install proposal/diff generation
  - confirmation prompts
  - capability-gated multi-worker prompt/routing guidance
  - tests for confirmation and ownership validation
- Do not actually run install commands in automated tests.
- Do not mutate user-level config without an explicit user confirmation command path.

## Non-Goals

- Do not guarantee every Claude plugin version supports multiple Codex workers.
- Do not allow overlapping worker write scopes.

## Implementation Plan

1. Add tests for install proposal rendering and confirmation gating.
2. Add safe helper/spec for user-level and remote install operations.
3. Add worker ownership schema and validation.
4. Add routing fallback when multi-worker capability is missing or ownership cannot be split.
5. Update docs and reports.

## 预期测试

- Install proposal is generated but not executed by default.
- Confirmed install path requires explicit confirmation in tests/fixtures.
- Overlapping worker ownership is rejected.
- Missing multi-worker capability degrades to single worker and records reason.
- Reports show worker ownership and integration status.

## Validation Commands

- `node --test core/test/*claude*codex*.test.js`
- `node --test core/test/*review*.test.js`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- Include sample install proposal.
- Include sample multi-worker ownership plan and rejected-overlap fixture.

## Human QA

- Confirm install confirmation text makes global/external side effects obvious.

## 预期产出

- Confirmation-gated install support.
- Safe multi-worker ownership contract.
- Fallback and report integration.
