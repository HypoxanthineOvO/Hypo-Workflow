# C16-M1 Completion Report — Workspace Authority Schema And Object Registry

## Result

Status: completed

C16-M1 added the Global Workspace authority read/validate/derive layer and root exports for the new workspace APIs.

## What Changed

- Added `core/src/workspace/index.js`.
- Exported workspace APIs from `core/src/index.js`.
- Added tests:
  - `core/test/workspace-authority.test.js`
  - `core/test/project-link-graph.test.js`
- Updated lifecycle log validation to accept C16 Deep Plan event families and planning statuses in `core/src/log/index.js`.

## Implemented APIs

- `validateWorkspaceAuthority(workspace, options)`
- `loadWorkspaceAuthority(options)`
- `deriveProjectRegistryFromWorkspace(workspace, options)`
- `validateWorkspaceRelations(workspace, options)`
- `buildProjectLinkGraph(workspace, options)`

## Behavior

- `workspace.yaml` is the authority for global objects, aliases, relations, sync target refs, policy refs, secret refs, and derived-view metadata.
- `projects.yaml` is derived compatibility output and cannot override workspace object identity, display name, local path, or graph relations.
- Workspace validation rejects missing required sections, duplicate object ids, duplicate aliases, raw secret values, invalid relation endpoints/types/directions, missing relation metadata, unknown refs, and malformed `derived_views.projects_yaml.authority`.
- Derived project registry output recursively removes raw-secret-looking keys from projected compatibility metadata and drift diagnostics.
- Project link graph helpers expose successors, predecessors, display links, and derived-view drift.

## Worker Evidence

- Test evidence: `.pipeline/reviews/C16/M1/test-evidence.md`
- Implementation evidence: `.pipeline/reviews/C16/M1/implementation-evidence.md`
- Audit recheck: `.pipeline/reviews/C16/M1/audit-recheck.md`

## Validation

```bash
node --test core/test/global-config-registry.test.js core/test/workspace-authority.test.js core/test/project-link-graph.test.js
```

Result: 17/17 passing.

```bash
node --test core/test/log-evidence.test.js
```

Result: 5/5 passing.

```bash
cd core && npm test
```

Result: 527/527 passing.

```bash
git diff --check -- core/src/workspace/index.js core/src/index.js core/src/log/index.js core/test/workspace-authority.test.js core/test/project-link-graph.test.js .pipeline/reviews/C16/M1/test-evidence.md .pipeline/reviews/C16/M1/implementation-evidence.md
```

Result: passing.

## Problems Encountered

Audit found that the initial implementation allowed raw compatibility secrets to appear in derived `projects.yaml` metadata. The first fix sanitized `projects[]`, but audit recheck found the same values could still leak through `drift[].existing`. A second RED regression now checks the full derived return object, and the final implementation sanitizes both projected records and drift diagnostics.

## Residual Risk

Secret filtering is currently field-name based. Future milestones should consider stricter schema-level allowlists or content-pattern detection for compatibility metadata.
