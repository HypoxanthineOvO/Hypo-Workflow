# C12/M8 Implementation Evidence

## Scope

- `core/src/deep-plan/index.js`
- `core/src/log/index.js`
- `references/commands-spec.md`
- `references/opencode-spec.md`
- `.pipeline/playbooks/C12-hypo-agent-deep-plan.md`
- `.pipeline/playbooks/C12-research-code.md`
- regression/count tests and scenario scripts updated for 40 commands

## Implementation

- Added final Hypo-Agent Deep Plan playbook covering `new -> ask -> research -> map -> drill -> readiness -> convert`.
- Added research-code playbook requiring explicit concrete remote action confirmation, bounded research cache, implementation-code inspection, and code evidence refs.
- Tightened `assessDeepPlanResearchAction` so `remote_clone` / `remote_download` need `confirmed_remote_actions`, bounded `.pipeline/deep-plans/.../research-cache/...`, and implementation source evidence; README-only evidence is rejected.
- Kept compact context short for directional/architecture-ready packages while preserving pseudo-test rejection policy for implementation-ready handoff.
- Updated command-count regressions and platform specs to the 40-command / 38-skill Deep Plan surface.
- Updated lifecycle log validation to accept worker lifecycle evidence statuses used by current logs.

## Validation

- `uv run -- node --test core/test/deep-plan-real-scenario.test.js core/test/deep-plan-research.test.js core/test/deep-plan-handoff.test.js`: 17/17 passing.
- `uv run -- node --test core/test/deep-plan*.test.js`: 52/52 passing.
- `uv run -- node --test core/test/deep-plan*.test.js core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/commands-rules-artifacts.test.js`: 73/73 passing.
- `uv run -- bash scripts/validate-config.sh .pipeline/config.yaml`: passing.
- `uv run python tests/run_regression.py`: 68/68 passing.
- `uv run -- node cli/bin/hypo-workflow sync --platform opencode --project /home/heyx/Hypo-Workflow --check-only`: exit 0, `stale:1/errors:0`; `.pipeline/derived-health.yaml` reports `stale_count: 0`.
- `git diff --check`: passing.

## Notes For Audit

- Please inspect the sync check-only `stale:1/errors:0` discrepancy against `.pipeline/derived-health.yaml`.
- Manual research-code acceptance is documented as a playbook, not executed against a real remote repository during automated tests.
