# M8 - 真实场景验收、回归与发布准备

## Objective

Validate C12 end-to-end with automated regression and a manual Hypo-Agent Deep Plan playbook, then refresh docs/adapters and produce final report.

## Scope

- Add a regression scenario for multi-round Deep Plan lifecycle.
- Create a manual playbook for planning Hypo-Agent again from an unclear request.
- Add a manual research-code playbook: when the user asks Deep Plan to research or reference an external work, the flow must request the required remote/network confirmation, download or clone the source into a bounded research cache, inspect implementation code instead of only README summaries, and record code evidence refs in the discussion package.
- Run focused Deep Plan tests, full core tests as appropriate, config validation, sync checks, and diff check.
- Produce final report with known limits and manual acceptance evidence.

## Validation

- `uv run -- node --test core/test/deep-plan*.test.js core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/commands-rules-artifacts.test.js`
- `uv run python tests/run_regression.py`
- `uv run -- bash scripts/validate-config.sh .pipeline/config.yaml`
- `uv run -- node cli/bin/hypo-workflow sync --platform opencode --project /home/heyx/Hypo-Workflow --check-only`
- `uv run -- git diff --check`
- Manual Hypo-Agent playbook shows Feature Queue order, acceptance depth, risks, and unknowns before ordinary Plan.
- Manual research-code playbook shows at least one referenced work is inspected from downloaded source code and not accepted from README-only evidence.

## Subworker Assignment Plan

- `test`: owns final regression scenario, Hypo-Agent manual playbook checklist, research-code manual playbook checklist, and focused/full test evidence. Handoff: `.pipeline/reviews/C12/M8/test-evidence.md`.
- `implement`: owns final docs/adapters/report updates required by validation. Must not create or rewrite test-owned evidence. Handoff: `.pipeline/reviews/C12/M8/implementation-evidence.md`.
- `audit`: reviews final diff, test evidence, manual playbook, role separation, and acceptance risks. Handoff: `.pipeline/reviews/C12/M8/audit.md`.

## Audit Fields

- `audit_target`: full C12 delivery readiness.
- `risk_hypotheses`: automated tests pass but manual Hypo-Agent flow is unclear; research accepts README-only evidence for external work; docs/adapters stale; pseudo-deep evidence accepted.
- `test_scenarios`: full lifecycle regression, Hypo-Agent manual flow, research-code external work inspection, sync/docs checks.
- `evidence_required`: test outputs, manual playbook result, final report.
- `independent_validator`: audit worker.
- `manual_checks`: run/read Hypo-Agent playbook and final report.
- `known_limits`: any unimplemented future UX or UI should be explicit.
