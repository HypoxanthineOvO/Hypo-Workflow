# Evidence Snapshot

## PR Metadata

- URL: <https://github.com/HypoxanthineOvO/Hypo-Workflow/pull/4>
- Title: `Add end-of-run dirty-only compact refreshfeat: add end-of-run compact refresh`
- Author: `qingyiyi`
- Head: `auto-compact-and-docs-after-start`
- Base: `main`
- Mergeable: `MERGEABLE`
- Merge state: `CLEAN`
- Head commit: `afc2e1c40bea26823d8bba5b7d479ca4a57883b6`

## Files

- `config.schema.yaml`
- `core/bin/hw-core`
- `core/src/compact/index.js`
- `core/src/config/index.js`
- `core/src/index.js`
- `core/src/sync/index.js`
- `core/test/compact-end-of-run.test.js`
- `references/commands-spec.md`
- `references/config-spec.md`
- `skills/compact/SKILL.md`
- `skills/resume/SKILL.md`
- `skills/start/SKILL.md`

## Checks

`gh pr checks 4` reported no checks.

## Local Test Evidence

Temporary merge test:

```text
git fetch https://github.com/HypoxanthineOvO/Hypo-Workflow.git main:refs/remotes/github/main pull/4/head:refs/remotes/github/pr/4
git worktree add --detach <tmp> refs/remotes/github/main
git merge --no-commit --no-ff refs/remotes/github/pr/4
npm test --prefix core
python3 tests/run_regression.py
```

Observed:

- Node test suite: 369 passed.
- Regression suite: 62/63 passed.
- Failing scenario: `s40-compact-session-start`.

