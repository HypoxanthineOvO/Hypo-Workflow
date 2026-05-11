# M1 Report - PR Create 向导契约与本地归档模型

## Result

pass

## Summary

M1 introduced the `/hw:pr create` contract layer. The implementation adds proposal/archive helpers for ask, worktree, and plan-first modes, records local create proposals under `.pipeline/pr/`, and documents the single-confirmation remote-write gate.

## Changed Areas

- `core/src/pr/index.js`
- `core/test/pr-create-contract.test.js`
- `references/pr-spec.md`
- `skills/pr/SKILL.md`

## Validation

- `node --test core/test/pr-create-contract.test.js` - pass, 2 tests.
- `node --test core/test/pr-contract.test.js core/test/pr-manual-gates.test.js core/test/pr-readonly-flow.test.js core/test/pr-create-contract.test.js` - pass, 15 tests.
- `bash scripts/validate-config.sh .pipeline/config.yaml` - pass.
- `git diff --check` - pass.

## Evidence

- `buildChangeRequestCreateProposal` supports `ask`, `from_worktree`, and `plan`.
- `writeChangeRequestCreateProposal` writes `request.yaml`, `decisions.yaml`, `create-proposal.yaml`, `summary.md`, `review-notes.md`, `changes.md`, and `evidence/snapshot.md`.
- `decisions.yaml` records `proposed_operation: create`, `confirmation_required: true`, `confirmation_scope: single_create_flow`, and proposed remote writes.
- PR spec and skill now describe `/hw:pr create`, `--from-worktree`, `--plan`, and GitLab self-hosted provider seams.

## Subagent And Separation

- Review Subagent was not launched because this session did not explicitly authorize actual Subagent delegation.
- Main Agent performed the review pass and recorded this non-delegation rationale.

## Residual Risk

- M1 is contract/archive only. Actual provider write execution and git-state guided flow belong to M2.
