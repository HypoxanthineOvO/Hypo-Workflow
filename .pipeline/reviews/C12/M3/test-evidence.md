# C12/M3 Test Evidence

## Worker

- role: test
- worker_id: `019e1cd3-cd70-73f1-8d0b-d640538677f0`
- lifecycle: requested -> started -> completed -> closed

## Files Changed By Test Worker

- `core/test/deep-plan-research.test.js`

## Red Test Command

```bash
uv run -- node --test core/test/deep-plan-research.test.js
```

## Expected RED Result

The focused test failed as expected because the public Deep Plan research API is not implemented/exported yet:

- `recordDeepPlanResearch`
- `assessDeepPlanResearchAction`
- `indexDeepPlanKnowledgeRefs`

## Coverage

- Research entries persist evidence refs, findings, unknowns, searched surfaces, and source boundaries.
- Package status remains `researching` while research entries are appended.
- Default action policy allows only local read-only research.
- Code edits, service restarts, network/remote clone/download, destructive actions, and external side effects require explicit confirmation.
- Compact Knowledge refs avoid raw discussion bodies, raw transcripts, and secret-looking content.

## Ownership

The test worker owns `core/test/deep-plan-research.test.js`. The implement worker must not edit it.
