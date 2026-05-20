# C16-M4 Audit Report

verdict: PASS

## findings

- no blockers
- Info: `appendMaintenanceLedgerEvent(root, event, options)` defaults to `root/maintenance/ledger.yaml`, but also accepts `options.ledgerFile` for tests or internal callers. M5 run-engine wiring should not expose that override to user-controlled command input; otherwise the maintenance ledger authority could be weakened even though the current default is correct.

## evidence

- Scope reviewed:
  - `.pipeline/prompts/03-maintenance-command-queue-ledger-evidence.md`
  - `core/src/maintenance/index.js`
  - `core/src/commands/index.js`
  - `skills/maintain/SKILL.md`
  - `references/commands-spec.md`
  - `references/skill-spec.md`
  - `.pipeline/reviews/C16/M4/test-evidence.md`
  - `.pipeline/reviews/C16/M4/implementation-evidence.md`
- Command namespace separation:
  - `core/src/commands/index.js:22` keeps `/hw:sync` on `route: "tool"` with `skills/sync/SKILL.md`.
  - `core/src/commands/index.js:23-31` maps `/hw:maintain` plus `status`, `scan`, `plan`, `queue`, `run`, `apply`, `verify`, and `log` to `route: "maintenance"` and `skills/maintain/SKILL.md`.
  - Supplemental command-map check returned `count: 50`, all nine maintain commands on `route: "maintenance"`, `/hw:sync` still on `route: "tool"`, and `uniqueSkillPaths: 40`.
- Queue authority and protected workflow state separation:
  - `core/src/maintenance/index.js:87-140` validates queue items as `kind: "maintenance_operation"`, requires operation-specific fields, rejects Feature/Cycle/Patch-shaped fields, and removes those fields from normalized output.
  - `skills/maintain/SKILL.md:20-29` states `/hw:maintain` is not `/hw:sync`, not a runner, uses `~/.hypo-workflow/maintenance/`, and queue items must not impersonate Feature/Cycle/Patch.
  - `skills/maintain/SKILL.md:73-79` explicitly forbids writing queue/ledger state to `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/log.yaml`.
  - No maintenance helper path in `core/src/maintenance/index.js` writes `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/log.yaml`.
- Side-effect gates:
  - `core/src/maintenance/index.js:190-260` allows read/derived-write levels by default, requires confirmation for `local_authority_write`, blocks `remote_write`, `destructive_remote_write`, and `external_action` unless confirmed, and requires backup metadata for destructive remote writes.
  - `core/src/maintenance/index.js:227-238` blocks `local_document_write_with_backup` without backup metadata.
  - `core/src/maintenance/index.js:401-410` requires backup `path`, 64-character `checksum_sha256`, and ISO-compatible `created_at`.
  - `skills/maintain/SKILL.md:60-71` documents the same side-effect policy.
- Ledger sanitization and append behavior:
  - `core/src/maintenance/index.js:262-284` writes the default ledger to `root/maintenance/ledger.yaml`, preserves existing events, and appends the normalized event.
  - `core/src/maintenance/index.js:286-316` validates event shape and runs shared secret-safe evidence validation.
  - `core/src/maintenance/index.js:378-398` applies shared `redactSecrets`, records whether raw secret evidence was seen, and forces `raw_secret_recorded: false`.
  - `core/test/maintenance-ledger.test.js` verifies raw Authorization bearer tokens, `api_key`, and password content are not persisted.
- Evidence paths:
  - `core/src/maintenance/index.js:318-328` resolves `scan`, `dry_run`, `apply`, `verify`, and `backup` paths under `maintenance/evidence/scan`, `maintenance/evidence/dry-runs`, `maintenance/evidence/apply-results`, `maintenance/evidence/verify-results`, and `maintenance/backups`.
  - `skills/maintain/SKILL.md:51-56` documents the same evidence surfaces.
- zh-CN rendering:
  - `core/src/maintenance/index.js:331-375` renders zh-CN status/log summaries and redacts rendered summaries/events.
  - `core/src/maintenance/index.js:64-85` defines Chinese status and event labels for maintenance output.
- Docs/Skill sync:
  - `references/commands-spec.md:15` records 50 user-facing commands.
  - `references/commands-spec.md:61-69` lists `/hw:maintain` and its eight subcommands.
  - `references/commands-spec.md:270-295` documents `/hw:maintain` behavior, queue/ledger authority, gates, `/hw:sync` separation, and non-runner boundary.
  - `references/skill-spec.md:35` includes `skills/maintain/SKILL.md` in the local Skill inventory.
  - `references/skill-spec.md:63-67` records 41 local Skill files, 50 user-facing commands, 40 user-facing Skill paths, and the maintain Skill boundary.
  - `references/skill-spec.md:175-183` maps `/hw:maintain*` to `skills/maintain/SKILL.md`.
  - Filesystem check returned `41` child `skills/*/SKILL.md` files and confirmed `skills/maintain/SKILL.md` exists.
- Worker separation:
  - `.pipeline/prompts/03-maintenance-command-queue-ledger-evidence.md` assigns separate `test`, `implement`, and `audit` workers with separate evidence paths.
  - `.pipeline/reviews/C16/M4/test-evidence.md:3-5` records the test worker and RED-test scope.
  - `.pipeline/reviews/C16/M4/test-evidence.md:82-114` records the test worker's post-implementation contract updates and maintain-specific assertions.
  - `.pipeline/reviews/C16/M4/implementation-evidence.md:3-5` records the implement worker.
  - This report is written only by the audit worker to `.pipeline/reviews/C16/M4/audit.md`.

## validation commands

```bash
node --test core/test/maintenance-command-map.test.js core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js core/test/log-evidence.test.js
```

Result: PASS, 13/13.

```bash
node --test core/test/commands-rules-artifacts.test.js core/test/claude-plugin-alias.test.js core/test/sync-standardization.test.js core/test/skill-spec.test.js core/test/knowledge-ledger.test.js core/test/deep-plan-integration.test.js core/test/codex-subagent-discipline.test.js
```

Result: PASS, 39/39.

```bash
node --input-type=module -e 'import { commandMap, commandByCanonical } from "./core/src/commands/index.js"; const commands=commandMap("opencode"); const maintain=commands.filter(c=>c.canonical.startsWith("/hw:maintain")); console.log(JSON.stringify({count:commands.length, maintain, sync:commandByCanonical("/hw:sync"), uniqueSkillPaths:new Set(commands.map(c=>c.skill)).size}, null, 2));'
```

Result: PASS evidence. `count` was `50`; all maintain commands used `route: "maintenance"` and `skills/maintain/SKILL.md`; `/hw:sync` remained `route: "tool"` and `skills/sync/SKILL.md`; `uniqueSkillPaths` was `40`.

```bash
find skills -path '*/SKILL.md' -type f | sort | wc -l && test -f skills/maintain/SKILL.md
```

Result: PASS evidence. Count was `41`; maintain Skill file exists.

## residual risks

- M5+ run engine still needs to bind the pure gate helpers to actual apply/run execution so high-risk side effects cannot bypass confirmation in orchestration code.
- M5+ should keep ledger path authority fixed to `~/.hypo-workflow/maintenance/ledger.yaml` in command execution and avoid exposing `options.ledgerFile` to command arguments.
- M5+ backup creation must verify checksum metadata against real backup files before allowing document or destructive remote writes.
- M5+ should continue testing redaction on full run-engine evidence payloads, not only the M4 helper-level events.
