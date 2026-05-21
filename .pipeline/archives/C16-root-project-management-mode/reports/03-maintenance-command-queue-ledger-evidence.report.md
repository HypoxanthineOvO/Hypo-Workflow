# C16-M4 Completion Report — Maintenance Command Surface Queue Ledger And Evidence Store

## Result

Status: completed

C16-M4 added the first-class `/hw:maintain` command family plus deterministic maintenance queue, ledger, evidence path, side-effect gate, and zh-CN rendering helpers.

## What Changed

- Added `core/src/maintenance/index.js`.
- Exported maintenance helpers from `core/src/index.js`.
- Added `/hw:maintain` plus `status`, `scan`, `plan`, `queue`, `run`, `apply`, `verify`, and `log` to `core/src/commands/index.js`.
- Added `skills/maintain/SKILL.md` and mirrored the active installed Codex Skill copy.
- Updated command-count and command-map docs from 41 to 50 user-facing commands.
- Added M4 tests:
  - `core/test/maintenance-command-map.test.js`
  - `core/test/maintenance-queue.test.js`
  - `core/test/maintenance-ledger.test.js`
- Updated command/docs/skill regression tests for the 50-command surface.

## Queue And Ledger Schema

- Queue items validate as `kind: maintenance_operation`.
- Feature/Cycle/Patch-shaped fields are rejected or removed from normalized items.
- Lifecycle statuses: `queued`, `planned`, `approved`, `running`, `completed`, `deferred`, `skipped`, `blocked`.
- Lifecycle actions emit `queue_item_*` ledger-compatible events.
- Ledger append writes `root/maintenance/ledger.yaml`, preserves existing events, appends only, and validates the result.

## Side-effect Gates

- Allowed by default: `local_read`, `remote_read`, `local_derived_write`.
- Confirmation required: `local_authority_write`, `remote_write`, `destructive_remote_write`, `external_action`.
- `local_document_write_with_backup` requires backup metadata.
- `destructive_remote_write` requires confirmation and backup metadata.

## Command Boundary

- `/hw:maintain*` uses `route: "maintenance"` and `skills/maintain/SKILL.md`.
- `/hw:sync` remains `route: "tool"` and `skills/sync/SKILL.md`.
- `/hw:maintain` is not a runner and does not replace Cycle, Patch, Feature Queue, or Sync.
- Queue, ledger, evidence, cache, and backups are under `~/.hypo-workflow/maintenance/`.

## Worker Evidence

- Test evidence: `.pipeline/reviews/C16/M4/test-evidence.md`
- Implementation evidence: `.pipeline/reviews/C16/M4/implementation-evidence.md`
- Audit evidence: `.pipeline/reviews/C16/M4/audit.md`

## Validation

```bash
node --test core/test/maintenance-command-map.test.js core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js core/test/log-evidence.test.js
```

Result: 13/13 passing.

```bash
node --test core/test/commands-rules-artifacts.test.js core/test/claude-plugin-alias.test.js core/test/sync-standardization.test.js core/test/skill-spec.test.js core/test/knowledge-ledger.test.js core/test/deep-plan-integration.test.js core/test/codex-subagent-discipline.test.js
```

Result: 39/39 passing.

```bash
cd core && npm test
```

Result: 545/545 passing.

```bash
git diff --check
```

Result: passing.

## Residual Risks

- C16-M5 must not expose `appendMaintenanceLedgerEvent(..., options.ledgerFile)` to user-controlled command input.
- C16-M5 must bind side-effect gates to real run/apply orchestration so high-risk actions cannot bypass confirmation.
- Backup creation must verify real file/checksum metadata before allowing local document or destructive remote writes.
