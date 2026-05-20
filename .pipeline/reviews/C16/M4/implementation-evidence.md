# C16-M4 Implementation Evidence

Worker: implement C16-M4
Scope: Maintenance Command Surface Queue Ledger And Evidence Store
Timestamp: 2026-05-19T22:20:00+08:00

## Modified Files

- `core/src/maintenance/index.js`
  - Added maintenance queue validation, lifecycle transitions, side-effect gates, ledger append/validate helpers, evidence path resolution, and zh-CN status/log rendering.
- `core/src/commands/index.js`
  - Added first-class `/hw:maintain` command family with `status`, `scan`, `plan`, `queue`, `run`, `apply`, `verify`, and `log` subcommands.
- `core/src/index.js`
  - Added root export for `./maintenance/index.js`.
- `skills/maintain/SKILL.md`
  - Added repository-source maintenance command Skill.
- `/home/heyx/.codex/skills/hypo-workflow/skills/maintain/SKILL.md`
  - Added installed Codex Skill copy so `skills/maintain/SKILL.md` is traceable from the active Skill bundle.
- `references/commands-spec.md`
  - Added `/hw:maintain` parsing/semantics and updated command count to 50.
- `references/skill-spec.md`
  - Updated local Skill inventory to 41, user-facing command count to 50, and unique user-facing Skill path count to 40.
- `skills/help/SKILL.md`
  - Updated help command grouping/count and added maintenance command family.
- `SKILL.md`
  - Added `/hw:maintain` family to the root routing summary and unknown-command list.
- `references/opencode-command-map.md`, `references/opencode-parity.md`, `README.md`, `README.en.md`, `docs/reference/commands.md`, `docs/en/reference/commands.md`, `docs/en/developer.md`
  - Synchronized production documentation/generator outputs to 50 commands and the maintenance command family.
- `/home/heyx/.codex/skills/hypo-workflow/{SKILL.md,references/commands-spec.md,references/skill-spec.md,references/opencode-parity.md,skills/help/SKILL.md,README.md,README.en.md,docs/reference/commands.md,docs/en/reference/commands.md,docs/en/developer.md}`
  - Mirrored installed Codex Skill production docs where the active bundle had stale command counts or missing maintenance references.
- `.pipeline/reviews/C16/M4/implementation-evidence.md`
  - Added this implementation evidence record.

## Exported API

- `validateMaintenanceQueueItem`
- `transitionMaintenanceQueueItem`
- `evaluateMaintenanceSideEffectGate`
- `appendMaintenanceLedgerEvent`
- `validateMaintenanceLedger`
- `resolveMaintenanceEvidencePaths`
- `renderMaintenanceStatus`
- `renderMaintenanceLog`

## Command Surface

- `/hw:maintain` maps to route `maintenance`, agent `hw-build`, skill `skills/maintain/SKILL.md`, OpenCode alias `/hw-maintain`.
- Subcommands map to `/hw-maintain-status`, `/hw-maintain-scan`, `/hw-maintain-plan`, `/hw-maintain-queue`, `/hw-maintain-run`, `/hw-maintain-apply`, `/hw-maintain-verify`, and `/hw-maintain-log`.
- `/hw:sync` remains route `tool` with skill `skills/sync/SKILL.md`; maintenance commands use route `maintenance` and do not reuse sync metadata.
- `/hw:maintain` documentation now states it is not `/hw:sync`, not a runner, and uses `~/.hypo-workflow/maintenance/` as queue/ledger/evidence authority.
- `commandMap("opencode")` exposes 50 user-facing commands and 40 unique user-facing Skill paths. The 9 maintenance commands share `skills/maintain/SKILL.md`.

## Queue And Ledger Behavior

- Queue validation requires `kind: maintenance_operation` and required operation fields.
- Feature/Cycle/Patch-shaped fields such as `feature_id`, `cycle_id`, `patch_id`, and `milestones` are rejected or removed from the normalized item.
- Lifecycle statuses supported: `queued`, `planned`, `approved`, `running`, `completed`, `deferred`, `skipped`, `blocked`.
- Lifecycle actions emit `queue_item_*` ledger-compatible event types.
- Ledger append writes `root/maintenance/ledger.yaml`, preserves existing events, appends only, and validates the resulting event list.

## Side-Effect Gate

- Allowed by default: `local_read`, `remote_read`, `local_derived_write`.
- Confirmation required: `local_authority_write`, `remote_write`, `destructive_remote_write`, `external_action`.
- Default blocked without confirmation: `remote_write`, `destructive_remote_write`, `external_action`.
- `local_document_write_with_backup` requires backup metadata with `path`, 64-character `checksum_sha256`, and `created_at`.
- `destructive_remote_write` also requires backup metadata after confirmation.

## Evidence And Redaction

- Evidence resolver returns five surfaces: `scan`, `dry_run`, `apply`, `verify`, and `backup`.
- Paths are under `maintenance/evidence/scan`, `maintenance/evidence/dry-runs`, `maintenance/evidence/apply-results`, `maintenance/evidence/verify-results`, and `maintenance/backups`.
- Ledger append recursively applies shared `redactSecrets` before writing YAML.
- Inline credentials, secret-like object keys, bearer tokens, cookies, passwords, and private keys are redacted to `[REDACTED]`.
- Ledger redaction metadata always records `raw_secret_recorded: false` after normalization.
- zh-CN rendering returns Chinese user-visible summaries and passes output through shared redaction.

## Validation

Focused tests:

```bash
node --test core/test/maintenance-command-map.test.js core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js core/test/log-evidence.test.js
```

Result: PASS, 13 tests passed.

Optional worker separation:

```bash
node --test core/test/worker-separation-spawn-enforcement.test.js
```

Result: PASS, 8 tests passed.

Expanded production-doc/skill validation:

```bash
node --test core/test/commands-rules-artifacts.test.js core/test/claude-plugin-alias.test.js core/test/sync-standardization.test.js core/test/skill-spec.test.js core/test/knowledge-ledger.test.js core/test/deep-plan-integration.test.js core/test/codex-subagent-discipline.test.js
```

Result: PASS, 39 tests passed.

Focused tests re-run after production doc/skill synchronization:

```bash
node --test core/test/maintenance-command-map.test.js core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js core/test/log-evidence.test.js
```

Result: PASS, 13 tests passed.
