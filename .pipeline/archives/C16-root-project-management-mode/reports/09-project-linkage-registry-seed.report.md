# C16-M10 Project Linkage Registry Seed Report

## Result

Completed.

## Summary

C16-M10 added the first local metadata-only project linkage registry seed through `buildProjectLinkageRegistry()`.

The registry returns the seven first-batch canonical projects:

- `hypo-workflow`
- `hypo-claw`
- `hypo-writer`
- `hypo-info-v2`
- `hypo-research`
- `hypo-switcher`
- `hypo-llm`

It also preserves legacy relations:

- `hypo-agent -> hypo-claw`
- `hypo-info -> hypo-info-v2`

Legacy projects are not active notification targets.

## Files Changed

- `core/src/workspace/index.js`
- `core/test/project-linkage-registry.test.js`
- `.pipeline/reviews/C16/M10/test-evidence.md`
- `.pipeline/reviews/C16/M10/implementation-evidence.md`
- `.pipeline/reviews/C16/M10/audit.md`

## Worker Evidence

- Test worker: Godel
  - Evidence: `.pipeline/reviews/C16/M10/test-evidence.md`
  - RED: missing `buildProjectLinkageRegistry` export.
- Implement worker: Rawls
  - Evidence: `.pipeline/reviews/C16/M10/implementation-evidence.md`
  - GREEN: implemented metadata-only registry.
- Audit worker: Cicero
  - Evidence: `.pipeline/reviews/C16/M10/audit.md`
  - Verdict: PASS.

## Validation

```bash
node --test core/test/project-linkage-registry.test.js core/test/project-link-graph.test.js core/test/workspace-authority.test.js
```

Result: 15/15 passing.

```bash
cd core && npm test
```

Result: 592/592 passing.

```bash
git diff --check
```

Result: passing.

## Side-Effect Boundary

- Notion writes: none.
- QQ sends: none.
- Service restarts: none.
- External actions: none.

The returned registry explicitly includes:

- `planned_actions: []`
- `remote_writes_enabled: false`
- `external_actions_enabled: false`

## Residual Risks

The registry is intentionally static in this milestone. Future milestones must keep side-effect gates explicit when connecting this registry to stop events, QQ notifications, or daily summaries.
