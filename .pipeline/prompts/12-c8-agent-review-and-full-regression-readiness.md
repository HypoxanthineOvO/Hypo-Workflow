# M13 / F004 - C8 Agent Review and Full Regression Readiness

## Objective

- Validate C8 end to end, including C8's own Agent Review evidence, full regression, and cross-platform smoke readiness.

## 需求

- Run the new review mechanism over C8 plan/test/code outputs where practical.
- Ensure `.pipeline/reviews/` contains durable evidence for C8 final validation.
- Validate Rules/Habits authority, generated habits/instructions, review gates, domain-pack/RTL behavior, and Claude Code Codex plugin support together.
- Run focused and full regression suites.
- Update final report, progress, architecture notes, Knowledge if reusable decisions changed, and release readiness docs if needed.

## Boundaries

- In scope:
  - final focused tests
  - full Node and Python regression
  - config validation
  - generated adapter smoke
  - review evidence/report readiness
- Do not perform real plugin installation unless the user explicitly confirms during this milestone.
- Do not publish a release unless the user explicitly confirms release actions.

## Non-Goals

- Do not add new major features.
- Do not resolve deferred Agent Teams work.
- Do not split RTL into a separate repository during final validation.

## Implementation Plan

1. Run focused tests for all C8 features.
2. Run full core and scenario regression.
3. Generate or inspect C8 final review artifacts.
4. Verify active Rules/Habits are injected into relevant platform surfaces.
5. Verify domain-pack and plugin safety boundaries are documented and tested.
6. Write the final milestone report and update Progress.

## 预期测试

- Rules/Habits focused tests pass.
- Review artifacts/gates focused tests pass.
- Domain pack and RTL focused tests pass.
- Claude Codex plugin support focused tests pass.
- Full Node and Python regression pass.
- `git diff --check` passes.

## Validation Commands

- `node --test core/test/*rules*.test.js core/test/*review*.test.js core/test/*domain*.test.js core/test/*claude*codex*.test.js`
- `node --test core/test/*.test.js`
- `python3 tests/run_regression.py`
- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `claude plugin validate .`
- `git diff --check`

## Evidence

- Include final test command output summary.
- Include `.pipeline/reviews/` paths for final plan/test/code/regression review.
- Include known fallback notes for unavailable live Claude/Codex plugin capabilities.

## Human QA

- Confirm the review reports are understandable and not just raw logs.
- Confirm C8 did not silently install plugins or mutate user-level config.

## 预期产出

- Final C8 validation report.
- Review artifact evidence.
- Updated Progress and release-readiness notes.
