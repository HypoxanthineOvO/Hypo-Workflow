# PR-20260509-001 Summary

Remote PR: <https://github.com/HypoxanthineOvO/Hypo-Workflow/pull/4>

## Snapshot

- Provider: GitHub
- PR: `#4`
- Base: `main`
- Head: `qingyiyi:auto-compact-and-docs-after-start`
- Head commit: `afc2e1c40bea26823d8bba5b7d479ca4a57883b6`
- Mergeability: `MERGEABLE`, `CLEAN`
- Draft: no
- Checks: no checks reported
- Review decision: unknown/empty
- Diff: 12 files, +467/-8

## Scope

The PR adds end-of-run compact refresh support, including:

- `core/src/compact/index.js`
- `core/bin/hw-core compact-end-of-run`
- derived compact renderers in `core/src/sync/index.js`
- config defaults/schema updates
- compact/start/resume command documentation
- `core/test/compact-end-of-run.test.js`

## What This PR Changes

This PR changes the compact workflow from "refresh during execution/milestone transitions" toward "refresh once after a successful run." The intended behavior is:

- keep full authority files such as `PROGRESS.md`, `state.yaml`, `log.yaml`, `metrics.yaml`, `reports/`, `patches/`, and Knowledge records available while implementation and validation are still running
- after `/hw:start` or `/hw:resume` succeeds, run a deterministic compact refresh only for dirty or missing compact artifacts by default
- add `compact.end_of_run` and `compact.refresh_policy`, with `dirty_only` as the default refresh policy
- generate additional derived compact views, including state, log, reports, metrics, and patches compact outputs
- expose a low-level `hw-core compact-end-of-run` command for the end-of-run refresh path
- add tests for successful refresh, skipped refresh, disabled compact, and dirty-only behavior

In product terms, this PR is trying to reduce execution-time churn from repeated compact generation while still leaving fresh compact context after a completed run.

## Local Validation

Validation was run in a temporary worktree on `github/main` merged with PR `#4`.

- `npm test --prefix core`: pass, 369/369
- `python3 tests/run_regression.py`: fail, 62/63
- failing scenario: `s40-compact-session-start`
- `bash scripts/validate-config.sh .pipeline/config.yaml`: not reached because regression command returned non-zero
- `git diff --check`: not reached because regression command returned non-zero

## Current Recommendation

The original PR branch was accepted through a local integration path instead of a direct GitHub button merge. `integrate/pr-4-end-of-run-compact` merged PR `#4`, adapted the regression test to the new end-of-run compact contract, and fixed the implementation consistency issues found during review.

Remote status: GitHub marks PR `#4` as `MERGED` at `2026-05-09T10:56:33Z`.

## Partial Merge Assessment

Partial merge is technically possible by applying selected files or cherry-picking onto a local integration branch, but GitHub cannot partially merge this PR with the normal Merge button. For this PR, partial merge is not the best first choice because the core implementation, docs, config schema, CLI command, and tests are tightly coupled.

The better path is an integration fix:

1. Start from current `main`.
2. Apply PR `#4`.
3. Add a small fix commit that makes `/hw:start` explicitly document the new end-of-run compact step.
4. Update `s40-compact-session-start` to assert the new `compact.auto=true` + `compact.end_of_run=true` / dirty-only contract instead of the old per-milestone compact wording.
5. Re-run the full validation suite.

So yes, the regression test should adapt to the new feature, but only after the feature's intended behavior is explicitly represented in the user-facing workflow contract.

## Integration Validation

Validation on the integration branch:

- `npm test --prefix core`: pass, 369/369
- `python3 tests/run_regression.py`: pass, 63/63
- `bash scripts/validate-config.sh .pipeline/config.yaml`: pass
- `git diff --check`: pass

## Workflow Follow-up

This inspection exposed a `/hw:pr` UX gap: the first summary should explain what the PR changes before it talks about mergeability. That follow-up has been recorded in `.pipeline/feature-queue.yaml`.
