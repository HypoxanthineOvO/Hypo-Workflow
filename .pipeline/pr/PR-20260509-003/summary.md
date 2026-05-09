# PR-20260509-003 Summary

Remote PR: <https://github.com/HypoxanthineOvO/Hypo-Workflow/pull/5>

## Snapshot

- Provider: GitHub
- PR: `#5`
- Base: `main`
- Head: `Heaticy:dev/lichf`
- Head commit: `1cf54f168fd64b3aea1bd337b1ceda23ee77bacc`
- Mergeability: `CONFLICTING`, `DIRTY`
- Draft: no
- Checks: no checks reported
- Review decision: unknown/empty
- Diff: 104 files, +3399/-1216

## What This PR Changes

This is lcf/lichf's new GitHub PR. It is not a GitLab MR from the evidence available locally.

The meaningful feature content is worker-separation hardening:

- adds worker-separation policy and runtime evidence handling around Cycle acceptance
- makes `/hw:accept` block when required `test` / `implement` / `audit` worker evidence is missing, colliding, unauthorized, or lifecycle-blocked
- derives worker evidence from persisted step/subagent results instead of treating runtime-only subtask metadata as durable acceptance evidence
- adds config defaults/schema for worker-separation mode, role requirements, degradation handling, authorization, lifecycle policy, and required audit evidence
- tightens `/hw:start`, `/hw:resume`, `/hw:patch`, `/hw:plan`, `/hw:debug`, and `/hw:audit` guidance so role-sensitive work cannot be done locally first and certified afterward
- updates OpenCode status/runtime surfaces to show subagent/worker evidence boundaries
- adds substantial focused tests for acceptance policy, cycle acceptance, config, subagent discipline, lifecycle, OpenCode status, and test-profile governance

In product terms, the PR tries to make worker separation enforceable at runtime and acceptance time, not just documented in planning prompts.

## Caveats

The PR branch also contains the older closed PR `#3` commit:

- `57877f8 chore: bump workflow version to 13.0.0`

That commit carries obsolete version/release metadata and conflicts with the current `v12.2.0+` main line. The branch also contains many `.pipeline/` runtime/prompt/archive changes from an older Cycle context. Those should not be merged wholesale without a deliberate integration pass.

## GitLab MR Check

- `git ls-remote origin 'refs/merge-requests/*'` did not show any GitLab MR refs.
- `glab` is not authenticated for the self-hosted GitLab instance in this environment.
- unauthenticated GitLab API query to `gitlab.vsplab.cn` returned `404`.

Conclusion: I found a GitHub PR `#5`; I did not find a usable GitLab MR for the same work.

## Current Recommendation

Direct remote merge was intentionally skipped. The PR was valuable, but its branch also carried stale release metadata and old `.pipeline/` runtime artifacts, so it was integrated locally instead.

Clean integration result:

- Integration commit: `fb70480 feat: harden worker separation acceptance`
- Kept feature commit content from `1cf54f168fd64b3aea1bd337b1ceda23ee77bacc`
- Dropped obsolete PR `#3` version bump commit `57877f805f9d55294c8b36add9085313f4367a46`
- Restored current mainline version metadata instead of accepting stale `13.x` values
- Restored current `.pipeline/` runtime state instead of merging stale prompt/archive artifacts
- Resolved worker-separation guidance against current P0, PR/MR, and end-of-run compact behavior
- Replaced a brittle `rg -g` test dependency with pure Node scanning so scenario regression works with `tests/bin/rg`

Validation:

- `npm test --prefix core` -> 398/398 passed
- `python3 tests/run_regression.py` -> 63/63 passed
- `bash scripts/validate-config.sh .pipeline/config.yaml` -> passed
- `git diff --check` -> passed

Remote PR `#5` may still appear open because the accepted work was integrated through a clean local commit rather than a direct GitHub merge commit.
