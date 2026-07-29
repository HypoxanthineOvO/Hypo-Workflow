# C21 M8 Core Implementation Evidence

## Conclusion

The non-destructive Core preparation is complete for the M8 cleanup gate. Public command inventory now contains exactly nine Codex routes, compatibility-only commands resolve through a private zero-write diagnostic catalog, and the current public Core API no longer exposes the legacy adapter/sync writers or the implementations already classified for deletion.

No files were deleted, moved, or renamed. No deletion Receipt was issued. No test source, fixture, snapshot, Runtime, Journal, Capsule, protected legacy state, or VSP repository was read or modified by this worker.

## Change Summary

- Replaced the 54-row exported command inventory with nine real `CANONICAL_COMMANDS` entries: `guide`, `init`, `goal`, `plan`, `cycle`, `maintain`, `resume`, `accept`, and `reject`.
- Kept internal, deferred, and removed spellings in a non-exported compatibility diagnostic catalog. These routes return `internal`, `deferred`, `removed`, or `unknown` with `writes: []`; they are not generator inventory.
- Preserved namespace normalization, focused Skill backend trust checks, natural intent routing, and contextual internal Start. Explicit Start is available only while an active Delivery is `waiting_to_start` and is never discoverable.
- Made standard/light/deep `runProjectSync` writes reject before the legacy write fence or any mutation. `checkOnly` still executes the read-only external/derived checks.
- Made OpenCode, Claude Code plugin, Claude Code agent, third-party, and Cursor bundle writers reject at their first executable statement with a structured deferred error and no advertised writes.
- Removed legacy writer exports from Root Core, including sync/adapter writers, README/docs repair writers, and exports backed by the Rules, Patch, TUI, Lease, and unaccepted C16 automation modules classified for later deletion.
- Removed retained adapter-module imports of the Rules implementation and the retained sync-module import of the C16 Actions implementation, so later authorized source deletion will not break these retained module imports.

## Modified Production Modules

- `core/src/commands/index.js`
- `core/src/index.js`
- `core/src/sync/index.js`
- `core/src/artifacts/opencode.js`
- `core/src/artifacts/claude.js`
- `core/src/artifacts/third-party.js`

## Verification Design

Validation was intentionally production-only. This worker did not open or run test sources. The checks exercised public production imports and direct writer entrypoints in isolated temporary directories:

1. Parse every modified JavaScript module with `node --check`.
2. Import Root Core and assert the public registry cardinality and absence of representative forbidden exports.
3. Compare `CANONICAL_COMMANDS`, `commandMap("opencode")`, and trusted `discoverableCommandMap("codex")` against the exact ordered nine-route contract.
4. Probe internal, deferred, removed, legacy Maintain, and unknown explicit commands and require zero-write diagnostics.
5. Probe contextual Start in `waiting_to_start` and non-startable Delivery states.
6. Call every fenced writer in its own empty temporary directory and require both rejection and an empty directory afterward.
7. Call `runProjectSync(..., { checkOnly: true })` in an empty temporary directory and require `check_only: true` with an empty directory afterward.
8. Run scoped `git diff --check` over the six production modules.

## Validation Results

- Syntax: `6/6` modified production modules passed `node --check`.
- Root import: passed.
- Public registry: exactly `9/9`, in the required order.
- Trusted Codex backend discovery: exactly the same `9/9` routes.
- Diagnostic probes:
  - `/hw:chat`, `/hw:plan:deep` -> `internal`
  - `/hw:analysis`, `/hw:docs` -> `deferred`
  - `/hw:rules`, `/hw:watchdog`, `/hw:maintain status` -> `removed`
  - `/hw:nope` -> `unknown`
  - every probe returned an empty `writes` list
- Contextual Start: `available` and non-discoverable for `waiting_to_start`; `unavailable` while executing.
- Root forbidden-export probe: no forbidden exports were present.
- Mutation-fence probes:
  - `runProjectSync` standard -> `ERR_HYPO_WORKFLOW_SYNC_RETIRED`, zero files
  - `writeOpenCodeArtifacts` -> `ERR_HYPO_WORKFLOW_ADAPTER_DEFERRED`, zero files
  - `writeClaudeCodePluginArtifacts` -> `ERR_HYPO_WORKFLOW_ADAPTER_DEFERRED`, zero files
  - `writeClaudeCodeAgentArtifacts` -> `ERR_HYPO_WORKFLOW_ADAPTER_DEFERRED`, zero files
  - `writeThirdPartyAdapterArtifacts` -> `ERR_HYPO_WORKFLOW_ADAPTER_DEFERRED`, zero files
  - `writeCursorSkillBundle` -> `ERR_HYPO_WORKFLOW_ADAPTER_DEFERRED`, zero files
- `runProjectSync` check-only: passed and wrote zero files.
- Scoped `git diff --check`: passed.

## Expected Result

Generator consumers of `commandMap` can now see only the nine current public routes. Explicit legacy commands cannot load their old Skill backends or mutate a workspace. The highest-risk platform writers cannot recreate OpenCode, Claude Code, Cursor, Copilot, Trae, Rules, TUI, or old authority artifacts before the deletion gate. Root consumers cannot reach those writers through the current Core package surface.

## Problems Encountered

- The worktree already contained extensive C21 and user changes, including prior edits in every touched module. Edits were applied against the live content without resetting or reverting those changes.
- The physical `skills/` tree still contains non-public Child Skills. This worker did not remove them because deletion requires the later exact Manifest and fresh user approval.
- An installed compatible Official Codex host was not available to this worker, so no host-level discovery or Hook delivery claim is made here.

## Residual Risks And Follow-up

- Physical Codex discovery remains larger than nine until the separately authorized deletion batch removes the 37 non-public Child Skill files. Registry/backend discovery being nine does not by itself change host filesystem discovery.
- Direct `repairDocs` and write-enabled README helpers remain in their source modules for the bounded follow-up; Root no longer exports them. They must be fenced or retired before claiming that every historical documentation generator is unreachable by direct module import.
- `core/src/skills/index.js` still carries the old Watchdog/count quality model. It must be updated to validate Root plus exactly nine public Child Skills after the cleanup file set is finalized.
- The legacy implementation body below the unconditional `runProjectSync` retirement error remains as deferred source. It is unreachable in non-check-only execution but should be simplified in the later adapter cleanup Cycle.
- Full M8 tests, Skill behavior evaluation, deletion-manifest validation, full Core regression, and independent audit remain owned by their separate TEST/AUDIT phases.

## Revision 2: Direct Module Write Fences And Skill Inventory

### Blocking Finding

PRE-DELETE TEST found that removing Root exports was insufficient: callers could still import the Docs and README modules directly, and the old Skill quality model treated all physical Child Skills as expected inventory. Revision 2 closes those direct-module paths without deleting files.

### Revision 2 Changes

- `core/src/docs/index.js`
  - `repairDocs(root, { write: false })` is now a read-only preview. It returns `status: preview`, `generated: []`, and the 25 `planned_files` without calling a file writer or write-enabled README path.
  - Default or write-enabled repair fails before reads that could lead to mutation with `ERR_HYPO_WORKFLOW_DOCS_DEFERRED`, `status: deferred`, and `writes: []`.
  - The private `writeGenerated` implementation and filesystem mutation imports were removed.
- `core/src/readme/index.js`
  - `updateReadme(..., { write: true })` now fails at function entry with `ERR_HYPO_WORKFLOW_README_WRITE_RETIRED`, `status: removed`, and `writes: []`, even when the rendered content would be unchanged.
  - Preview rendering and freshness checks remain available and read-only; filesystem mutation imports were removed.
- `core/src/skills/index.js`
  - Expected inventory is derived from the nine `commandMap("opencode")` backends plus Root `SKILL.md`.
  - Only Root and those nine public Child Skills receive normal quality checks. Root is exempt from the child-only output-language heading rule.
  - Other physical Child Skills are reported individually as `unexpected-physical-skill` and exposed through `unexpectedSkills` / `extraSkills` plus explicit inventory statistics.
  - The Watchdog/internal exception and internal-count model were removed.
  - Frontmatter, references, child asset paths, missing backends, and symlink-component checks remain active.

### Revision 2 Production Smoke

The smoke used isolated temporary directories and byte snapshots before and after each direct module call. No test file, fixture, or assertion metadata was opened or executed.

- Docs preview: byte-for-byte identical; `generated: 0`; `planned_files: 25`.
- Docs default write: byte-for-byte identical; rejected with `ERR_HYPO_WORKFLOW_DOCS_DEFERRED`; `writes: []`.
- README preview: byte-for-byte identical while returning an in-memory changed preview.
- README write: byte-for-byte identical; rejected with `ERR_HYPO_WORKFLOW_README_WRITE_RETIRED`; `writes: []`.
- Skill inventory: `9` expected Child Skills, `46` physical Child Skills, exactly `37` extras, and `10` checked files including Root.
- Skill quality also surfaced three independent current heading issues in `init`, `plan`, and `maintain`; these are separate from and do not alter the exact 37-extra inventory result.
- `node --check`: passed for all three Revision 2 production modules.
- Scoped `git diff --check`: passed.

### Revision 2 Outcome And Residuals

The prior residual statements that direct Docs/README writers and the old Skill quality model remained open are superseded by this revision. Direct imports can no longer mutate through those entrypoints, and the quality model now treats non-public physical Skills as cleanup blockers rather than normal inventory.

Physical discovery is still 46 until the separately approved deletion executes; this is intentionally reported as 37 extras rather than hidden. The three public Child Skill heading findings, full PRE-DELETE TEST rerun, exact Deletion Manifest, deletion Receipt, full regression, and independent audit remain outside this worker's production-only scope.
