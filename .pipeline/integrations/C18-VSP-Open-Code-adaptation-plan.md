# C18 VSP-Open-Code Adaptation Plan

## Status

Planned only. Do not write `~/VSP-Open-Code` until the user confirms this file list after C18-M5.

## Read-Only Inspection

- Path: `~/VSP-Open-Code`
- Dirty worktree: yes, modified `.pipeline/*`, install/release scripts, `packages/opencode/src/*`, workflow translation/cache files, tests, and new locale test.
- Current project summary: C6 completed, focused on Dashboard recovery, journal lightweight record area, compact optimization, WorkflowStore API extension, Plan enhancement, and platform awareness.
- Existing Workflow integration:
  - `/hw:*` and `$hw:*` command completion/submission
  - structured `WorkflowStore` for `.pipeline/state.yaml`, `cycle.yaml`, and `log.yaml`
  - TUI Workflow Dashboard and footer status
  - journal lightweight record layer
  - Workflow reminder injection and worker role guidance

## Source Changes To Sync

- Enhanced `/hw:audit`: Intake-first, Experience/Engineering/Risk, Critical blocking, Action Queue.
- New `/hw:quality`: scorecard, baseline, compare, review, action queue.
- New `/hw:optimize`: Audit+Quality -> Implement/Test -> Audit+Quality with backup/correctness/budget/validation gates.
- Integration sync is a source-side development/release workflow, not a user command.

## Proposed File List

Confirm before editing:

- `README.md`
- `CHANGELOG.md`
- `PROJECT-SUMMARY.md`
- `packages/opencode/src/cli/cmd/workflow/state.ts`
- `packages/opencode/src/translation/continue-cache.ts`
- `packages/opencode/src/translation/continue-queue.ts`
- `packages/opencode/src/translation/continue-cache-queue.test.ts`
- `packages/opencode/src/util/locale.ts`
- `packages/opencode/test/workflow/integration-contract.test.ts`
- `packages/opencode/test/workflow/yolo-governance-contract.test.ts`
- `packages/opencode/test/util/locale.test.ts`
- `.pipeline/log.yaml`
- `.pipeline/state.yaml`

## Required Adaptations

1. Command surfaces:
   - add `/hw:quality` and `/hw:optimize` to completion/submission and docs where command lists are curated
   - keep integration sync out of user command namespace
2. Workflow reminder/Dashboard/Status:
   - describe enhanced Audit, Quality, Optimize
   - surface Quality/Optimize as available Workflow activities without implying the app is a background runner
3. WorkflowStore and journal:
   - preserve structured state/log writes
   - classify quality/optimize/audit feedback candidates in journal/inbox-compatible records
4. Records:
   - update target-side CHANGELOG, PROJECT-SUMMARY, and `.pipeline` lifecycle records
   - source matrix backlink after validation

## Validation Commands

Candidate commands:

```bash
cd ~/VSP-Open-Code/packages/opencode
bun test test/workflow/integration-contract.test.ts test/workflow/yolo-governance-contract.test.ts
bun test src/translation/continue-cache-queue.test.ts
bun typecheck
```

Exact focused tests may be adjusted after C18-M6 reads the current test names.

## Risks

- Worktree is dirty, including a `MM` file in `packages/opencode/src/translation/continue-cache.ts`; C18-M6 must inspect and avoid overwriting unrelated staged/unstaged work.
- Root-level tests must not be run from repo root per target AGENTS; use `packages/opencode`.
- Some source-side Quality/Optimize semantics may belong in prompt/guidance text only, while target-specific UI affordances may be deferred.
