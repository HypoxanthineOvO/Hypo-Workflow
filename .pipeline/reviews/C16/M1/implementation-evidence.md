# C16-M1 Implementation Evidence

Worker: `implement`
Scope: production/runtime implementation only, plus this evidence file.

## Changed Files

- `core/src/workspace/index.js`
- `core/src/index.js`
- `.pipeline/reviews/C16/M1/implementation-evidence.md`

## Implementation Summary

Added a workspace authority module that exposes the C16-M1 public API:

- `validateWorkspaceAuthority(workspace, options)`
- `deriveProjectRegistryFromWorkspace(workspace, options)`
- `loadWorkspaceAuthority(options)`
- `validateWorkspaceRelations(workspace, options)`
- `buildProjectLinkGraph(workspace, options)`

The module validates required v1 sections, duplicate object ids, duplicate aliases, raw secret-value fields, object reference lists, typed relation endpoints, supported relation types/directions, and required relation metadata.

`projects.yaml` remains a derived compatibility view. `deriveProjectRegistryFromWorkspace` builds project records from authoritative workspace objects, preserves only non-authoritative runtime compatibility fields from an existing registry, and reports drift for disagreements or legacy entries missing from workspace.

`loadWorkspaceAuthority({ home })` reads `${home}/.hypo-workflow/workspace.yaml` as the authority and reads optional `${home}/.hypo-workflow/projects.yaml` only as `compatibility_view`.

`buildProjectLinkGraph` derives graph edges and helper methods from workspace relations:

- `successorsOf(id)`
- `predecessorsOf(id)`
- `displayLinksFor(id)`

It also reports drift when derived project link fields disagree with the authoritative graph.

## Validation

Command:

```bash
node --test core/test/global-config-registry.test.js core/test/workspace-authority.test.js core/test/project-link-graph.test.js
```

Result:

```text
1..15
# tests 15
# pass 15
# fail 0
# duration_ms 422.079932
```

## Assumptions

- Workspace object identity and relations are authoritative only in `workspace.yaml`.
- `projects.yaml` can contribute runtime compatibility fields such as `platform`, `profile`, `current_cycle`, `pipeline_status`, `acceptance`, and `knowledge`, but cannot override workspace identity, display name, or local path.
- C16-M1 only requires read/validate/derive behavior; no command writes to `workspace.yaml` or `projects.yaml` were added.

## Revision: Audit Blocker Fix

Worker: `implement`
Scope: audit-blocker production fix only, plus this evidence file.

Changed files:

- `core/src/workspace/index.js`
- `.pipeline/reviews/C16/M1/implementation-evidence.md`

Fix summary:

- `deriveProjectRegistryFromWorkspace` now recursively strips raw-secret-looking keys from compatibility metadata projected into derived project records, including keys such as `token`, `password`, `api_key`, `credential`, and related variants.
- Non-secret compatibility metadata under `acceptance` and `knowledge` is preserved, so fields such as `acceptance.mode` and `knowledge.status` remain available in the derived `projects.yaml` view.
- `validateWorkspaceAuthority(..., { throwOnError: true })` now validates `derived_views.projects_yaml.authority` and rejects values other than `derived_from_workspace`.

Focused validation command:

```bash
node --test core/test/global-config-registry.test.js core/test/workspace-authority.test.js core/test/project-link-graph.test.js
```

Result:

```text
1..17
# tests 17
# pass 17
# fail 0
# duration_ms 462.979754
```

Revision assumptions:

- Raw-secret-looking compatibility keys should be removed from derived views rather than replaced with redaction sentinel values, because the regression tests assert the fields are absent.
- The same raw-secret key pattern used by workspace validation is authoritative for compatibility projection sanitization.

## Second Revision: Audit Recheck Drift Secret Regression

Worker: `implement`
Timestamp: `2026-05-19T16:07:54+08:00`
Scope: audit-recheck production fix only, plus this evidence file. Tests and lifecycle files were not edited.

Changed files:

- `core/src/workspace/index.js`
- `.pipeline/reviews/C16/M1/implementation-evidence.md`

Fix summary:

- `deriveProjectRegistryFromWorkspace` now sanitizes drift diagnostics with the same raw-secret key policy used for compatibility metadata projection.
- `drift[].existing` and `drift[].authority` preserve useful non-secret structure while recursively omitting raw-secret-looking keys such as `token`, `password`, `api_key`, `credential`, and related variants.
- This ensures `JSON.stringify(derived)` cannot expose raw secret-looking compatibility values through drift entries.

Focused validation command:

```bash
node --test core/test/global-config-registry.test.js core/test/workspace-authority.test.js core/test/project-link-graph.test.js
```

Result:

```text
1..17
# tests 17
# suites 0
# pass 17
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 584.089258
```

Second revision assumptions:

- Drift remains useful when sanitized values preserve non-secret fields and omit only raw-secret-looking keys.
- The existing `RAW_SECRET_KEYS` policy remains the authoritative sanitization rule for compatibility-derived output.
