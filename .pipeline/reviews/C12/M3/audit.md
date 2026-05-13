# C12/M3 Audit

## Verdict

needs_changes

## Reviewed Refs

- `core/src/deep-plan/index.js`
- `core/test/deep-plan-research.test.js`
- `core/test/deep-plan-package.test.js`
- `core/test/deep-plan-ask.test.js`
- `.pipeline/reviews/C12/M3/test-evidence.md`
- `.pipeline/reviews/C12/M3/implementation-evidence.md`

## Findings

- High: `assessDeepPlanResearchAction` checks `allowed_actions` before gated/non-local actions. A caller can add `remote_clone`, `remote_download`, or `network_access` to `allowed_actions` and bypass explicit confirmation.
- High: confirmation flags are not action-scope specific. Remote/network confirmation can allow `edit_code`, `destructive_delete`, restart, or external side-effect actions.
- Medium: `indexDeepPlanKnowledgeRefs` redacts summaries but returns `evidence_refs` without redaction, so tokenized URLs or secret-looking refs can leak.

## Passing Checks

- `recordDeepPlanResearch` writes package artifacts and keeps package state as `researching`.
- Default action tests cover local read-only allowlist and gated side-effect actions.
- Worker separation evidence is present for test and implementation roles.

## Tests Checked

- `uv run -- node --test core/test/deep-plan-research.test.js`: 6/6 passing before boundary probes.
- `uv run -- node --test core/test/deep-plan-package.test.js core/test/deep-plan-ask.test.js core/test/deep-plan-research.test.js`: 18/18 passing before boundary probes.
