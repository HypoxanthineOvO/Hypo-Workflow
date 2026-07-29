# C21-M1 Workspace Format, Transaction Kernel, And Legacy Write Fence

## Objective

Establish the only writable C21 workspace boundary and prevent legacy writers from mutating a manifest-activated workspace before any new user-facing flow is enabled.

## Requirements

- Add canonical serialization/hash helpers without breaking existing named imports.
- Detect `empty`, `unmanaged_brownfield`, `current`, `legacy`, `damaged_current`, and `mixed_current_with_legacy_residue` without writing.
- Define and validate `.pipeline/manifest.yaml` plus allowed runtime/memory/snapshot roots.
- Implement recoverable staged multi-file transactions with prepared markers and backup hashes.
- Activate the manifest last and recover deterministically after interruption.
- Add one central legacy-write fence and wire every inventoried legacy writer into it.
- A damaged current manifest must fail closed; it must never fall back to the legacy writer.

## Boundaries

In scope:

- `core/src/serialization/`
- `core/src/workspace-format/`
- `core/src/workspace-store/`
- `core/src/manifest/`
- compatibility changes in `core/src/lifecycle/commit.js`
- all writer entrypoints listed by the M1 writer inventory
- focused tests and fault fixtures

Out of scope:

- Record Store, Receipt, Snapshot, Journal, Capsule, or Pack semantics
- public Skill rewrites or command deletion
- activation of this repository
- deletion or migration of legacy runtime files

## Technical Solution

Extract canonical YAML/frontmatter/hash behavior from the oversized config module, introduce an explicit workspace-format detector, and implement a recoverable transaction protocol. A valid manifest selects the new writer; a damaged manifest blocks all writers. Legacy modules remain readable but must call a shared format fence before any mutation.

Transaction protocol:

```text
stage -> validate proposed workspace -> prepared marker -> old hashes/backups
-> install staged files -> activate manifest last -> workflow.commit Receipt later in M2
```

## Technical Route

1. Write failing tests for all format classes, path traversal, partial installation, corrupt manifest, and legacy write rejection.
2. Extract `parseYaml`, `stringifyYaml`, frontmatter parsing, and canonical hashing into `core/src/serialization/`; preserve compatibility re-exports from config.
3. Implement `detectWorkspaceFormat()` using raw on-disk evidence rather than default-filled config.
4. Implement allowed-root/path-normalization helpers and single-file atomic writes.
5. Implement staged transaction prepare/install/activate/recover/rollback, including failure injection hooks used only by tests.
6. Add manifest schema/version validation and make activation the final transaction operation.
7. Build a complete legacy-writer inventory from imports and direct filesystem calls; wire the central fence into each discovered entrypoint.
8. Run focused tests, compatibility tests, static scans, and record evidence.

## Research Required

Status: resolved.

Evidence:

- `core/src/lifecycle/commit.js` sequentially renames files and cannot roll back an already-installed first file.
- The storage scan enumerated existing writer families and showed `.pipeline/log.yaml` is already about 13k lines.
- `.pipeline/reports/C21-unified-architecture-design.md` fixes manifest/runtime/memory/snapshot authority ownership.

## Risks And Alternatives

- Risk: a direct `writeFile` call omitted from the inventory bypasses the fence.
- Risk: moving YAML helpers changes timestamp or scalar behavior in old modules.
- Rejected: extend only `commitWorkflowUpdate()`; it hard-codes legacy authority and is not a recoverable transaction.
- Rejected: dual-write old and new formats; it creates competing authority and hides divergence.
- Mitigation: executable writer inventory, static direct-write scan, compatibility re-exports, semantic YAML tests, and fault injection.

## Test Specification

- Format detection performs zero writes and returns exactly one class.
- A valid current manifest never permits a legacy writer.
- An invalid current manifest blocks both new and old mutation paths.
- Staged transaction recovers after failure before install, mid-install, after install, and before/after manifest activation.
- Path guards reject traversal, symlink escape where applicable, and writes outside `.pipeline` zones.
- Old YAML/config tests retain semantic parity.

## Validation Commands

```bash
node --test \
  core/test/workspace-format.test.js \
  core/test/workspace-transaction.test.js \
  core/test/legacy-write-fence.test.js \
  core/test/yaml-parser-unification.test.js \
  core/test/workflow-commit.test.js

git diff --check
```

Pass signal: all commands exit 0; fault tests prove a deterministic recovered state; legacy write attempts leave current/damaged fixtures byte-identical.

Pseudo-test rejection: tests that only inspect manifest text or function names do not satisfy M1. Tests must perform real writes in temporary repositories and inject failures between transaction phases.

## Evidence Paths

- `.pipeline/reviews/C21/M1/test-evidence.md`
- `.pipeline/reviews/C21/M1/implementation-evidence.md`
- `.pipeline/reviews/C21/M1/audit.md`
- `.pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md`

## Audit Focus

- Manifest activation is last and recoverable.
- Detector and legacy inspector are read-only and do not load default-filled project config.
- Every known legacy writer is fenced before M5 activation.
- Core root exports remain explicit; no broad barrel export is introduced.
- No Record/Recovery behavior is prematurely embedded in the transaction module.

## Subworker Assignment Plan

Status: authorized, strict separation.

- `test`: owns test/fixture/assertion edits for M1 and the RED/GREEN evidence file. It must create real filesystem fault tests before implementation and must not edit production modules.
- `implement`: owns only the scoped production modules and implementation evidence. It must not create, edit, or weaken M1 tests.
- `audit`: remains independent and read-only over product/test diffs; it checks writer-inventory completeness, transaction evidence, assumptions, and worker identity separation. It may write only the audit artifact.
- Main agent: orchestrates, integrates accepted worker results, runs lifecycle commits, and records requested/started/completed/failed/closed evidence. It must not satisfy test, implement, or audit itself.
- Non-overlap: one worker identity cannot satisfy more than one of the three roles. Failure of a required worker blocks or retries the step; it does not silently degrade to local implementation.

## Expected Artifacts

- M1 production modules and named exports
- focused tests and failure fixtures
- writer inventory with all discovered legacy mutation entrypoints
- test, implementation, audit, and completion reports
