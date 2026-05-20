# C16-M1 Test Evidence

Worker: `test`
Scope: RED tests only. No production/runtime files under `core/src/**` were edited.

## Changed Files

- `core/test/workspace-authority.test.js`
- `core/test/project-link-graph.test.js`
- `.pipeline/reviews/C16/M1/test-evidence.md`

## Test Design

`core/test/workspace-authority.test.js` covers:

- required `workspace.yaml` v1 sections: `workspace`, `objects`, `relations`, `sync_targets`, `policies`, `secret_refs`, `derived_views`;
- duplicate object id rejection;
- duplicate alias rejection;
- raw secret value rejection in both `secret_refs` and object records;
- deriving `projects.yaml` from workspace authority without letting compatibility data override identity/path/display data;
- loading `~/.hypo-workflow/workspace.yaml` as authority while keeping `projects.yaml` as compatibility view.

Expected public API shape:

- `validateWorkspaceAuthority(workspace, options)`
- `deriveProjectRegistryFromWorkspace(workspace, options)`
- `loadWorkspaceAuthority(options)`

`core/test/project-link-graph.test.js` covers:

- typed graph validation for required seed edges:
  - `hypo-info -> hypo-info-v2: replaced_by`
  - `hypo-agent -> hypo-claw: replaced_by`
- unknown endpoint rejection;
- unsupported relation type rejection;
- unsupported direction rejection;
- required relation metadata;
- derived inverse display links from authoritative workspace graph while detecting derived project view drift.

Expected public API shape:

- `validateWorkspaceRelations(workspace, options)`
- `buildProjectLinkGraph(workspace, options)`

## Focused Test Command

```bash
node --test core/test/global-config-registry.test.js core/test/workspace-authority.test.js core/test/project-link-graph.test.js
```

## RED Result

Exit code: `1`

Exact command output summary:

```text
1..8
# tests 8
# suites 0
# pass 6
# fail 2
# cancelled 0
# skipped 0
# todo 0
# duration_ms 428.217723
```

Failure causes:

```text
SyntaxError: The requested module '../src/index.js' does not provide an export named 'buildProjectLinkGraph'
SyntaxError: The requested module '../src/index.js' does not provide an export named 'deriveProjectRegistryFromWorkspace'
```

Existing `core/test/global-config-registry.test.js` subtests passed before the new RED tests failed:

```text
ok 1 - default global config exposes model pool, acceptance, sync, and knowledge defaults
ok 2 - model pool maps roles to the OpenCode agent matrix without breaking overrides
ok 3 - lazy global config migration does not rewrite on read and backs up on save
ok 4 - project registry has stable IDs and persists project status summaries
ok 5 - init-project registers initialized projects in ~/.hypo-workflow/projects.yaml
ok 6 - config schema and spec document model pool, migration, and registry fields
```

## Assumptions

- Workspace authority APIs belong on the root `../src/index.js` export surface, consistent with existing registry/config helpers used by `global-config-registry.test.js`.
- The implementation may place workspace parsing/validation internally under `core/src/config`, `core/src/sync`, or another module, as long as the root exports above are available.
- RED failure at missing export is intentional before implementation.

## Revision: Audit Blocker Regression Tests

Worker: `test`
Scope: RED regression tests only after C16-M1 GREEN. No production/runtime files under `core/src/**` were edited.

Added regression coverage in `core/test/workspace-authority.test.js`:

- `derived projects.yaml strips raw secrets from compatibility project fields`
  - Asserts `deriveProjectRegistryFromWorkspace` preserves non-secret compatibility metadata such as `acceptance.mode` and `knowledge.status`.
  - Asserts raw compatibility fields `acceptance.token` and `knowledge.password` are not present in the derived project record and their values are not serialized into derived output.
- `workspace authority requires projects.yaml derived view to declare workspace authority`
  - Asserts `validateWorkspaceAuthority(..., { throwOnError: true })` rejects `derived_views.projects_yaml.authority` values other than `derived_from_workspace`.

Focused command:

```bash
node --test core/test/global-config-registry.test.js core/test/workspace-authority.test.js core/test/project-link-graph.test.js
```

Exit code: `1`

Exact command output summary:

```text
1..17
# tests 17
# suites 0
# pass 15
# fail 2
# cancelled 0
# skipped 0
# todo 0
# duration_ms 449.122865
```

Failure causes:

```text
not ok 15 - derived projects.yaml strips raw secrets from compatibility project fields
error: Expected values to be strictly equal:
true !== false
location: core/test/workspace-authority.test.js:214:1
assertion: "token" in derived.projects[0].acceptance should be false

not ok 16 - workspace authority requires projects.yaml derived view to declare workspace authority
error: Missing expected exception.
location: core/test/workspace-authority.test.js:241:1
```

Existing focused tests passed before the new RED regression cases failed:

```text
ok 1 - default global config exposes model pool, acceptance, sync, and knowledge defaults
ok 2 - model pool maps roles to the OpenCode agent matrix without breaking overrides
ok 3 - lazy global config migration does not rewrite on read and backs up on save
ok 4 - project registry has stable IDs and persists project status summaries
ok 5 - init-project registers initialized projects in ~/.hypo-workflow/projects.yaml
ok 6 - config schema and spec document model pool, migration, and registry fields
ok 7 - workspace typed relations include the required replaced_by seed edges
ok 8 - workspace relation validator rejects unknown endpoints, unsupported types, and invalid direction
ok 9 - workspace relation validator enforces required edge metadata
ok 10 - project link graph derives inverse display links without making projects.yaml authoritative
ok 11 - workspace authority requires the full v1 section set
ok 12 - workspace authority rejects duplicate object ids and aliases
ok 13 - workspace authority forbids raw secret values and only accepts secret refs
ok 14 - projects.yaml is derived from workspace authority and cannot override object identity
ok 17 - workspace authority loads ~/.hypo-workflow/workspace.yaml before compatibility projects.yaml
```

Revision assumptions:

- Compatibility metadata under `acceptance` and `knowledge` may still be projected when non-secret, but raw secret-looking keys such as `token` and `password` must be removed or redacted from derived output.
- `derived_views.projects_yaml.authority` is a required authority contract value, not advisory metadata.

## Second Revision: Audit Recheck Drift Secret Regression

Worker: `test`
Timestamp: `2026-05-19T16:01:35+08:00`
Scope: RED regression test only for the audit recheck blocker. No production/runtime files under `core/src/**` were edited. Lifecycle files were not edited.

Updated regression coverage in `core/test/workspace-authority.test.js`:

- Extended `derived projects.yaml strips raw secrets from compatibility project fields` to assert that `JSON.stringify(derived)` does not contain raw compatibility secret values, not just `JSON.stringify(derived.projects[0])`.
- This covers the full `deriveProjectRegistryFromWorkspace()` return object, including `derived.drift[].existing`.

Focused command:

```bash
node --test core/test/global-config-registry.test.js core/test/workspace-authority.test.js core/test/project-link-graph.test.js
```

Exit code: `1`

Exact command output summary:

```text
1..17
# tests 17
# suites 0
# pass 16
# fail 1
# cancelled 0
# skipped 0
# todo 0
# duration_ms 444.886283
```

RED failure:

```text
not ok 15 - derived projects.yaml strips raw secrets from compatibility project fields
error: The input was expected to not match the regular expression /raw-(acceptance-token|knowledge-password)-must-not-project/.
location: core/test/workspace-authority.test.js:214:1
stack location: core/test/workspace-authority.test.js:239:10
```

Failure evidence:

```text
derived.drift[0].existing.token = "raw-acceptance-token-must-not-project"
derived.drift[1].existing.password = "raw-knowledge-password-must-not-project"
```

Second revision assumptions:

- Drift diagnostics are part of the derived return object and must obey the same no-raw-secret projection rule as `derived.projects[]`.
- The implementation can preserve drift structure, but `existing` values must be sanitized, redacted, or omitted before return serialization can expose raw secret-looking compatibility values.
