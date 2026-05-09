# Evidence Snapshot

## PR Metadata

- URL: <https://github.com/HypoxanthineOvO/Hypo-Workflow/pull/5>
- Title: `Harden worker separation acceptance`
- Author: `Heaticy`
- Head: `dev/lichf`
- Base: `main`
- Mergeable: `CONFLICTING`
- Merge state: `DIRTY`
- Head commit: `1cf54f168fd64b3aea1bd337b1ceda23ee77bacc`

## Commits

- `57877f8 chore: bump workflow version to 13.0.0`
- `1cf54f1 feat: harden worker separation acceptance`

## Checks

`gh pr checks 5` reported no checks.

## Conflict Evidence

Temporary merge into current `github/main` failed. Conflict examples:

- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`
- `.opencode/hypo-workflow.json`
- `.pipeline/PROGRESS.md`
- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `CHANGELOG.md`
- `SKILL.md`
- `cli/package.json`
- `core/package.json`
- `core/src/config/index.js`
- `references/subagent-spec.md`
- `skills/start/SKILL.md`
- `skills/resume/SKILL.md`
- `skills/patch/SKILL.md`

## GitLab MR Evidence

- SSH ref scan did not show `refs/merge-requests/*`.
- `glab` lacks usable self-hosted GitLab authentication in this environment.
- Unauthenticated API query to `gitlab.vsplab.cn` returned `404`.

## Local Integration Evidence

- Integrated at: `2026-05-09T19:40:03+0800`
- Integration branch: `integrate/pr-5-worker-separation`
- Integration commit: `fb70480 feat: harden worker separation acceptance`
- Direct remote merge: no
- Dropped stale commit: `57877f8 chore: bump workflow version to 13.0.0`
- Kept feature content: `1cf54f1 feat: harden worker separation acceptance`
- Stale `.pipeline/` runtime artifacts: not merged
- Stale `13.x` version metadata: not merged

Validation after integration:

- `npm test --prefix core` -> 398/398 passed
- `python3 tests/run_regression.py` -> 63/63 passed
- `bash scripts/validate-config.sh .pipeline/config.yaml` -> passed
- `git diff --check` -> passed
