# C16-M10 Implementation Evidence

## Scope

- Added `buildProjectLinkageRegistry()` in `core/src/workspace/index.js`.
- Export path uses the existing `core/src/index.js` workspace re-export.
- Registry is local metadata only: `planned_actions` is empty, `remote_writes_enabled=false`, and `external_actions_enabled=false`.
- Legacy `hypo-agent` and `hypo-info` are relation sources only and are not included in canonical projects or active notification targets.

## Validation

```bash
node --test core/test/project-linkage-registry.test.js core/test/project-link-graph.test.js core/test/workspace-authority.test.js
```

Result: pass, 15 tests.

```bash
git diff --check -- core/src/workspace/index.js
```

Result: pass, no output.
