# PR-20260509-001 Changes

Local integration fix was applied on branch `integrate/pr-4-end-of-run-compact`.

Readonly inspection actions:

- Listed open GitHub PRs.
- Read PR `#4` metadata, comments, reviews, files, checks, and diff summary.
- Fetched PR head into local remote ref `refs/remotes/github/pr/4`.
- Created a temporary worktree and tested the merge result.

Integration actions:

- Merged PR `#4` into local branch `integrate/pr-4-end-of-run-compact`.
- Updated `skills/start/SKILL.md` so `/hw:start` explicitly documents end-of-run dirty-only compact when `compact.auto=true` and `compact.end_of_run=true`.
- Updated `tests/scenarios/v8.2/s40-compact-session-start/run.sh` to assert the new end-of-run compact contract instead of only the old per-milestone compact wording.
- Updated `core/src/sync/index.js` so standard sync refreshes all declared safe compact targets instead of only `PROGRESS.compact.md`.
- Updated `renderLogCompact` to select recent events by timestamp, not file order.
- Threaded compact settings through end-of-run compact renderers and added coverage for `compact.log_recent`.
- Added `compact.end_of_run` and `compact.refresh_policy` to the earlier config schema branch.

Validation:

- `npm test --prefix core`: pass, 369/369.
- `python3 tests/run_regression.py`: pass, 63/63.
- `bash scripts/validate-config.sh .pipeline/config.yaml`: pass.
- `git diff --check`: pass.

Remote writes:

- None.
- Merge/push/reviewer/label/target branch writes still require explicit confirmation.
