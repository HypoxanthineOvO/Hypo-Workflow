# C17-M2 Layered Config And Integration Migration

## Goal

Remove runtime `/home/heyx/...` assumptions and move project/integration paths into layered configuration with explicit migration.

## Technical Solution

- Define layered config authority: project `.pipeline/config.yaml`, user `~/.hypo-workflow/config.yaml`, then safe defaults.
- Add schema fields for `integrations.hypo_claw`, `integrations.hypo_writer`, `projects[]`, timezone, and project linkage seeds.
- Implement an explicit migration command that can generate user-level config from current local defaults only when invoked.
- Make `sync/start` detect missing user config and prompt/report the migration command without silently writing.
- Replace hardcoded runtime paths in `core/src` and scripts with config/env/HOME-derived values.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns tests for layered precedence, explicit migration, no silent sync/start user writes, and path-free runtime source.
  - Evidence path: `.pipeline/reviews/C17/M2/test-evidence.md`.
- `implement`
  - Owns config schema/helper changes, migration command, runtime path refactor, script defaults, and docs/examples.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C17/M2/implementation-evidence.md`.
- `audit`
  - Reviews secret/path redaction, user-level write gates, hardcoded path removal, and worker separation.
  - Evidence path: `.pipeline/reviews/C17/M2/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Add tests for project > user > defaults precedence and migration behavior.
2. Implement config migration helper and CLI route after confirming command surface in `cli/bin/hypo-workflow`.
3. Refactor workspace/project-events/scripts to accept injected config and avoid `/home/heyx` runtime constants.
4. Update docs/examples for config migration.
5. Scan runtime source and scripts for forbidden hardcoded paths.

## Research Required

Status: targeted local required during implementation.

Evidence:

- Hardcoded paths are currently present in `core/src/workspace/index.js`, `core/src/project-events/index.js`, and `scripts/*.sh`.

Remaining local check:

- Confirm exact CLI command registration pattern in `cli/bin/hypo-workflow`.

## Risks And Alternatives

Risks:

- Migration can expose private local paths if written into repo files.
- Script defaults must remain usable without user-specific absolute paths.

Rejected alternative: silently generating `~/.hypo-workflow/config.yaml` during sync/start. User explicitly rejected silent writes.

## Validation

Run:

```bash
node --test core/test/global-config-registry.test.js core/test/project-events.test.js core/test/hypo-claw-notification.test.js
rg -n '/home/heyx' core/src scripts
npm test
git diff --check
```

Pass signal: runtime source and scripts no longer embed `/home/heyx` paths except tests/fixtures/docs where explicitly allowed.

## Audit Focus

- No silent writes to `~/.hypo-workflow/config.yaml` from sync/start.
- Migration output redacts raw secrets and writes only to user-level config when explicitly invoked.
- Config precedence is deterministic and tested.

## Completion Report Requirements

Include config schema changes, migration command behavior, path scan results, validation output, expected behavior, and residual risks.
