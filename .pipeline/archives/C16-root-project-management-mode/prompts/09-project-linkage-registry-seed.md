# C16-M10 Project Linkage Registry Seed

## Goal

Register the first-batch cross-project linkage set without writing Notion or promoting legacy projects to current projects.

First-batch projects:

- `hypo-workflow`
- `hypo-claw`
- `hypo-writer`
- `hypo-info-v2`
- `hypo-research`
- `hypo-switcher`
- `hypo-llm`

## Technical Solution

Extend the local Global Workspace/maintenance read model with a linkage registry seed. Each project entry must include id, display name, local path, human-readable role, stop notification enablement, daily summary enablement, and relation metadata. Legacy projects such as `Hypo-Agent` and `Hypo-Info` are relation sources only.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns registry seed fixtures, canonical/legacy relation tests, and no-remote-write assertions.
  - Evidence path: `.pipeline/reviews/C16/M10/test-evidence.md`.
- `implement`
  - Owns registry/linkage helper implementation, exports, and documentation updates for first-batch scope.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M10/implementation-evidence.md`.
- `audit`
  - Reviews scope creep, legacy relation handling, Notion boundary, and worker separation.
  - Evidence path: `.pipeline/reviews/C16/M10/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Add or extend local project-linkage helpers under the existing `workspace` or `maintenance` boundary.
2. Seed the seven canonical projects with stable ids, paths, roles, and enablement flags.
3. Add relation edges for `hypo-agent -> hypo-claw` and `hypo-info -> hypo-info-v2`.
4. Ensure legacy projects are excluded from first-batch active notification targets.
5. Keep all outputs local and metadata-only.

## Research Required

Status: resolved.

Evidence:

- `.pipeline/deep-plans/DP001-root-project-management-mode/global-project-reconciliation.md`
- `.pipeline/deep-plans/DP001-root-project-management-mode/project-classification-taxonomy.md`

## Risks And Alternatives

Risks:

- Old projects could be treated as current notification targets.
- Registry changes could imply Notion writes if boundaries are not explicit.

Rejected alternative: scan every `/home/heyx` directory on each notification. First-version linkage needs stable project identity.

## Validation

Run:

```bash
node --test core/test/project-linkage-registry.test.js core/test/project-link-graph.test.js core/test/workspace-authority.test.js
cd core && npm test
```

Pass signal: seven canonical projects are returned, legacy projects are relation-only, and no Notion/external operation is planned.

## Audit Focus

- First-batch scope only.
- Legacy relation correctness.
- No remote writes.

## Completion Report Requirements

Include first-batch project table, relation handling, files changed, validation output, and residual scope risks.
