# M4 Report - 命令、文档、适配器与完整回归

## Result

pass

## Summary

M4 completed the command, docs, adapter, and regression surface for C10. `/hw:pr create` is now a first-class command mapping, generated docs expose P0 Configure / PR Create / Subagent strict-degraded behavior, and the regression bundle passes.

## Changed Areas

- `core/src/commands/index.js`
- `core/src/docs/index.js`
- `README.md`
- `docs/user-guide.md`
- `docs/reference/commands.md`
- `docs/reference/configuration.md`
- `docs/reference/generated-artifacts.md`
- `docs/platforms/codex.md`
- `docs/platforms/opencode.md`
- `references/commands-spec.md`
- `references/opencode-spec.md`
- `references/opencode-command-map.md`
- `references/opencode-parity.md`
- `references/skill-spec.md`
- `SKILL.md`
- `skills/help/SKILL.md`
- regression scenario command-count checks

## Validation

- `node --test core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js core/test/readme-update.test.js core/test/skill-spec.test.js core/test/claude-plugin-alias.test.js core/test/knowledge-ledger.test.js` - pass, 35 tests.
- `node --test core/test/p0-configure-contract.test.js core/test/pr-create-contract.test.js core/test/pr-create-execution.test.js core/test/pr-create.test.js core/test/subagent-separation-contract.test.js core/test/codex-subagent-discipline.test.js` - pass, 21 tests.
- `npm test --prefix core` - pass, 365 tests.
- `bash scripts/validate-config.sh .pipeline/config.yaml` - pass.
- `python3 tests/run_regression.py` - pass, 63/63 scenarios.
- `git diff --check` - pass.

## Evidence

- Command registry now contains 39 user-facing commands and maps `/hw:pr create` to `/hw-pr-create` with `hw-build`.
- Docs repair regenerated `docs/reference/commands.md`, `docs/user-guide.md`, platform docs, configuration reference, and generated-artifacts reference.
- `references/commands-spec.md` now documents `/hw:pr create`, `--from-worktree`, and `--plan`, including GitLab/self-hosted repository input and explicit remote-write confirmation.
- Subagent docs and templates record implementation/test source isolation, degraded mode confirmation, and role isolation degradation evidence.

## Subagent And Separation

- Actual Subagent delegation was not launched in this run because this Codex session did not receive explicit authorization to spawn workers.
- Main Agent performed the validation locally and recorded non-delegation rationale.
- The delivered contract requires future delegated implementation workers to avoid test source, fixtures, snapshots, and assertion details.

## Residual Risk

- No real GitHub/GitLab remote smoke was run. Provider writes remain behind explicit confirmation and are covered by deterministic provider fakes.
