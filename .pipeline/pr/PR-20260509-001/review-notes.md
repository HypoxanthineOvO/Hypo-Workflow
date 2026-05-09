# PR-20260509-001 Review Notes

## Blocking Findings

1. `tests/scenarios/v8.2/s40-compact-session-start/run.sh` fails on the merged result.

   Evidence: current `main` passes the scenario, while `github/main + PR #4` fails the full regression run with `FAIL s40-compact-session-start`.

   Likely cause: PR `#4` changes the intended compact contract from per-milestone refresh to end-of-run dirty-only refresh, but the regression still checks the old wording. The existing scenario checks:

   - `rg -q 'compact.auto=true' skills/start/SKILL.md`
   - `rg -q 'compact.auto=true' skills/resume/SKILL.md`

   Merge advice: do not simply restore the old per-step/per-milestone behavior. Update the regression to assert the new contract, but first make the new contract explicit in `skills/start/SKILL.md` as well as `skills/resume/SKILL.md`: successful completion should run end-of-run dirty-only compact when `compact.auto=true` and `compact.end_of_run=true`.

2. Remote checks are absent.

   Evidence: `gh pr checks 4` returned `no checks reported on the 'auto-compact-and-docs-after-start' branch`.

   Merge advice: because there is no CI status to rely on, local regression must be green before merge.

## Warnings

- GitHub review decision is empty, so required human approval status is unknown from the readonly evidence.
- Copilot review comments existed on the PR. Some were followed by author-triggered autofix comments, but the local regression failure means the final state still needs another pass.
- Partial merge is possible only through an integration branch or cherry-picked patch, not through GitHub's normal PR Merge button. The safer route is to integrate the full feature with a small follow-up fix commit that updates `skills/start/SKILL.md`, adjusts `s40-compact-session-start`, and reruns full validation.

## Human Merge Advice

PR `#4` should remain open until the regression failure is fixed and the validation commands complete:

- `npm test --prefix core`
- `python3 tests/run_regression.py`
- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `git diff --check`
