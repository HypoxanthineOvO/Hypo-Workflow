# C16-M4 Test Evidence

Worker: test  
Scope: RED tests only; no production implementation.  
Timestamp: 2026-05-19T22:10:00+08:00

## Files Added

- `core/test/maintenance-command-map.test.js`
- `core/test/maintenance-queue.test.js`
- `core/test/maintenance-ledger.test.js`
- `.pipeline/reviews/C16/M4/test-evidence.md`

## Command Run

```bash
node --test core/test/maintenance-command-map.test.js core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js core/test/log-evidence.test.js
```

Result: RED, exit code 1.

Summary:

- tests: 13
- pass: 5
- fail: 8
- existing `core/test/log-evidence.test.js`: passed all 5 tests
- new M4 maintenance tests: failed as expected because the command surface and Maintenance APIs are not implemented/exported yet

## RED Failures

1. `/hw:maintain` command family is missing from `commandMap("opencode")`.
   - Failure: `expected /hw:maintain root command`
   - Required commands: `/hw:maintain`, `/hw:maintain status`, `/hw:maintain scan`, `/hw:maintain plan`, `/hw:maintain queue`, `/hw:maintain run`, `/hw:maintain apply`, `/hw:maintain verify`, `/hw:maintain log`

2. `/hw:maintain` is not separable from `/hw:sync` because the root command is absent.
   - Failure: `expected /hw:maintain command`
   - Expected route/skill boundary: `/hw:sync` remains `route: "tool"` with `skills/sync/SKILL.md`; `/hw:maintain*` uses `route: "maintenance"` with `skills/maintain/SKILL.md`

3. Maintenance ledger append helper is missing.
   - Failure: `expected appendMaintenanceLedgerEvent to be exported from ../src/index.js`
   - Expected behavior: append-only ledger write under maintenance storage and raw secret redaction.

4. Maintenance evidence path resolver is missing.
   - Failure: `expected resolveMaintenanceEvidencePaths to be exported from ../src/index.js`
   - Expected surfaces: `scan`, `dry_run`, `apply`, `verify`, `backup`

5. Maintenance zh-CN status rendering API is missing.
   - Failure: `expected renderMaintenanceStatus to be exported from ../src/index.js`
   - Expected behavior: Chinese user-visible summary when `output.language = "zh-CN"` and no raw secret leakage.

6. Maintenance queue item validator is missing.
   - Failure: `expected validateMaintenanceQueueItem to be exported from ../src/index.js`
   - Expected behavior: validate queue items as `kind: "maintenance_operation"`, not Feature/Cycle/Patch items.

7. Maintenance queue lifecycle transition helper is missing.
   - Failure: `expected transitionMaintenanceQueueItem to be exported from ../src/index.js`
   - Expected statuses: `queued`, `planned`, `approved`, `running`, `completed`, `deferred`, `skipped`, `blocked`

8. Maintenance side-effect gate evaluator is missing.
   - Failure: `expected evaluateMaintenanceSideEffectGate to be exported from ../src/index.js`
   - Expected levels: `local_read`, `remote_read`, `local_derived_write`, `local_authority_write`, `local_document_write_with_backup`, `remote_write`, `destructive_remote_write`, `external_action`
   - Expected gates: remote/destructive/external require confirmation; local document write requires backup metadata.

## API Names Required For GREEN

- `validateMaintenanceQueueItem`
- `transitionMaintenanceQueueItem`
- `evaluateMaintenanceSideEffectGate`
- `appendMaintenanceLedgerEvent`
- `validateMaintenanceLedger`
- `resolveMaintenanceEvidencePaths`
- `renderMaintenanceStatus`
- `renderMaintenanceLog`

## Notes

- Tests intentionally use `requireApi()` assertions so missing exports produce focused RED failures.
- No production files were modified.
- No protected workflow state files were modified.

## Follow-up Contract Revision After Implementation

Worker: test  
Scope: update tests only after M4 implementation added `/hw:maintain` command family.  
Timestamp: 2026-05-19T22:30:00+08:00

### Files Updated

- `core/test/commands-rules-artifacts.test.js`
- `core/test/claude-plugin-alias.test.js`
- `core/test/sync-standardization.test.js`
- `core/test/skill-spec.test.js`
- `core/test/knowledge-ledger.test.js`
- `core/test/deep-plan-integration.test.js`
- `core/test/codex-subagent-discipline.test.js`
- `.pipeline/reviews/C16/M4/test-evidence.md`

### Contract Changes

- Updated hardcoded user-facing command count from `41` to `50`.
- Updated user-facing skill path count from `39` to `40` where derived from `commandMap("opencode")`.
- Updated local child Skill count expectation from `40` to `41` in the skill spec contract.
- Added explicit `/hw:maintain` command family assertions in `core/test/commands-rules-artifacts.test.js`:
  - `/hw:maintain`
  - `/hw:maintain status`
  - `/hw:maintain scan`
  - `/hw:maintain plan`
  - `/hw:maintain queue`
  - `/hw:maintain run`
  - `/hw:maintain apply`
  - `/hw:maintain verify`
  - `/hw:maintain log`
- Expected all `/hw:maintain*` entries to use `route: "maintenance"` and `skill: "skills/maintain/SKILL.md"`.

### Commands Run

```bash
node --test core/test/commands-rules-artifacts.test.js
```

Result: pass, 5/5.

```bash
node --test core/test/maintenance-command-map.test.js core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js core/test/log-evidence.test.js
```

Result: pass, 13/13.

```bash
node --test core/test/commands-rules-artifacts.test.js core/test/claude-plugin-alias.test.js core/test/sync-standardization.test.js core/test/skill-spec.test.js core/test/knowledge-ledger.test.js core/test/deep-plan-integration.test.js core/test/codex-subagent-discipline.test.js core/test/maintenance-command-map.test.js core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js core/test/log-evidence.test.js
```

Result: fail, 48/52 passed, 4 failed.

### Remaining Production Text / Generated Artifact Failures

These failures are expected after updating the tests because production docs/skill assets still carry pre-M4 counts or missing Maintain skill assets. Test worker did not modify them.

1. `skills/help/SKILL.md` still says `41 user-facing Hypo-Workflow commands` and `41 个面向用户的命令`.
   - Failing tests:
     - `core/test/codex-subagent-discipline.test.js`: `setup and help do not route Codex Subagents to external providers`
     - `core/test/deep-plan-integration.test.js`: `Help, docs, and references present Deep Plan as integrated operations with boundaries`

2. `references/skill-spec.md` still says:
   - `40 local Skill files`
   - `39 user-facing Skill paths`
   - `41 user-facing commands`
   - It also lacks the `skills/maintain/SKILL.md` inventory and command-map rows.
   - Failing tests:
     - `core/test/skill-spec.test.js`: `skill spec documents required sections and quality contract`
     - `core/test/skill-spec.test.js`: `skill spec keeps command map and local skill inventory traceable`

3. `references/commands-spec.md` still contains `/hw:help` text saying it lists all `41 user-facing commands`.

4. `skills/maintain/SKILL.md` is referenced by `commandMap()` but the file is not present on disk.

### Implement Worker Follow-up

- Add or restore `skills/maintain/SKILL.md`.
- Update `skills/help/SKILL.md` from 41 to 50 and include the Maintain command family in the appropriate group.
- Update `references/skill-spec.md` inventory/counts and command map table for `skills/maintain/SKILL.md`.
- Update `references/commands-spec.md` help count from 41 to 50.
