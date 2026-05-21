# C16-M10 Test Evidence

## Scope

Worker: test

Step: `write_tests`

Added RED test file:

- `core/test/project-linkage-registry.test.js`

Protected lifecycle files were not edited.

## RED Coverage Added

`core/test/project-linkage-registry.test.js` defines the expected contract for a new exported API named `buildProjectLinkageRegistry`:

- Return exactly the seven first-batch canonical projects in stable order:
  `hypo-workflow`, `hypo-claw`, `hypo-writer`, `hypo-info-v2`, `hypo-research`, `hypo-switcher`, `hypo-llm`.
- Each canonical entry exposes stable `id`, `display_name`, `path`, human-readable `role`, `stop_notifications_enabled: true`, and `daily_summary_enabled: true`.
- Preserve confirmed legacy relations:
  `hypo-agent -> hypo-claw` and `hypo-info -> hypo-info-v2`, both as `replaced_by`.
- Exclude legacy projects from `projects` and `active_notification_targets`.
- Keep the seed metadata-only with `planned_actions: []`, `remote_writes_enabled: false`, and `external_actions_enabled: false`.

## Commands

### Focused RED Command

Command:

```bash
node --test core/test/project-linkage-registry.test.js
```

Result: RED, exit code 1.

Observed:

- 4 tests total.
- 0 passed.
- 4 failed.
- All failures are in the new registry test file.
- Failure point: `expected buildProjectLinkageRegistry to be exported from ../src/index.js`.

Expected RED reason:

- The project linkage registry seed API is not implemented/exported yet.

### Required Nearby Command

Command:

```bash
node --test core/test/project-linkage-registry.test.js core/test/project-link-graph.test.js core/test/workspace-authority.test.js
```

Result: RED, exit code 1.

Observed:

- 15 tests total.
- 11 passed.
- 4 failed.
- The 4 failures are exactly the new `project-linkage-registry.test.js` tests.
- Existing nearby tests in `project-link-graph.test.js` and `workspace-authority.test.js` passed.

Expected RED reason:

- Current `core/src/index.js` exports workspace authority and project link graph helpers, but does not export `buildProjectLinkageRegistry`.

## Notes For Implement Worker

The tests intentionally require `buildProjectLinkageRegistry()` to return a local, metadata-only registry object. Implementation should satisfy the asserted shape without planning Notion writes, QQ sends, service restarts, or other external actions.
