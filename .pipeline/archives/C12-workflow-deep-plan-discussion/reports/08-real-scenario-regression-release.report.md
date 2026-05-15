# M8 Report - 真实场景验收、回归与发布准备

## Result

pass_with_warning

## Summary

C12 final validation completed. Deep Plan now has a real Hypo-Agent replan playbook, a research-code playbook, source-code inspection gates for remote research, focused lifecycle regression, and full regression evidence.

## Delivered

- Hypo-Agent Deep Plan playbook: `.pipeline/playbooks/C12-hypo-agent-deep-plan.md`.
- Research-code playbook: `.pipeline/playbooks/C12-research-code.md`.
- API gate for `remote_clone` / `remote_download`: requires `confirmed_remote_actions`, bounded research cache, and implementation-code evidence refs.
- README-only evidence is rejected for implementation-behavior research claims.
- Final real-scenario tests cover `new -> ask -> research -> map -> drill -> readiness -> convert` and ordinary Plan handoff.
- Legacy 39-command regressions were updated to the 40-command Deep Plan surface.

## Validation

- `uv run -- node --test core/test/deep-plan-real-scenario.test.js core/test/deep-plan-research.test.js core/test/deep-plan-handoff.test.js`: 17/17 passing.
- `uv run -- node --test core/test/deep-plan*.test.js`: 52/52 passing.
- `uv run -- node --test core/test/deep-plan*.test.js core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/commands-rules-artifacts.test.js`: 73/73 passing.
- `uv run -- bash scripts/validate-config.sh .pipeline/config.yaml`: passing.
- `uv run python tests/run_regression.py`: 68/68 passing.
- `uv run -- node cli/bin/hypo-workflow sync --platform opencode --project /home/heyx/Hypo-Workflow --check-only`: exit 0, stale warning only, errors 0.
- `git diff --check`: passing.

## Warning

`sync --check-only` can report derived stale warnings even while `.pipeline/derived-health.yaml` records `stale_count: 0`. The final audit judged this non-blocking because the sync command exits 0 and reports `errors:0`.

## Evidence

- `.pipeline/reviews/C12/M8/test-evidence.md`
- `.pipeline/reviews/C12/M8/implementation-evidence.md`
- `.pipeline/reviews/C12/M8/audit.md`
