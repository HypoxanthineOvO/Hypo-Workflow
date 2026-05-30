# C18-M6 Target Repository Adaptation After Confirmation

## Goal

在用户明确确认 C18-M5 的目标适配计划和文件清单后，分别适配 `~/Codex-VSP` 和 `~/VSP-Open-Code`。

## Hard Gate

Do not start implementation for this prompt until all conditions are true:

- C18-M5 has produced target adaptation plans and exact file lists.
- The user has explicitly confirmed those plans.
- The current target repo dirty status has been read and recorded.
- The implementation scope is limited to confirmed files.

If any condition is missing, stop and ask for confirmation instead of editing target repositories.

## Technical Solution

- Treat each target repository as its own integration implementation.
- Follow each target repo's AGENTS/README rules.
- Apply only confirmed file changes.
- Preserve unrelated dirty worktree changes.
- Record target results in each target repo and backlink from Hypo-Workflow.

## Subworker Assignment Plan

Status: authorized, but gated by C18-M5 user confirmation. Worker Separation mode: recommended.

- `test`
  - Owns target-specific focused validation, target dirty-status evidence, and pseudo-test rejection.
  - Evidence path: `.pipeline/reviews/C18/M6/test-evidence.md`.
- `implement`
  - Owns confirmed target command/skill/docs/hooks/journal/dashboard/state-store/test changes and target-side records.
  - Must not edit files outside the confirmed C18-M5 file list.
  - Evidence path: `.pipeline/reviews/C18/M6/implementation-evidence.md`.
- `audit`
  - Reviews target changes against confirmed plan, runtime state copy prohibition, target records, source backlink, and worker separation.
  - Evidence path: `.pipeline/reviews/C18/M6/audit.md`.
- Main agent
  - Coordinates workers, checks the confirmation gate, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Read C18-M5 adaptation plans and confirm the user approval text.
2. Re-read `git -C ~/Codex-VSP status --short` and `git -C ~/VSP-Open-Code status --short`.
3. Apply `~/Codex-VSP` changes only within confirmed files and validate with focused Cargo/just tests from the plan.
4. Apply `~/VSP-Open-Code` changes only within confirmed files and validate from `packages/opencode` with Bun tests/typecheck from the plan.
5. Update target records and source integration matrix/backlink.

## Research Required

Status: deferred_to_M5_gate.

Evidence:

- C18-M5 must provide exact file lists and target-specific validation commands.
- User confirmation after C18-M5 is required before writing target repos.

## Risks And Alternatives

Risks:

- Target dirty worktrees contain unrelated user work.
- Target hooks/dashboard code may require deeper adaptation than source-side assumptions.

Rejected alternative: defer all target adaptation to later cycles. Kept as gated milestone because C18 explicitly covers synchronization.

Mitigation: hard confirmation gate, file-list scoped edits, target tests, target-side records, and no runtime state copying.

## Validation

Candidate commands, to be replaced by C18-M5 exact commands:

```bash
cd ~/Codex-VSP/codex-rs
just test -p codex-tui <focused-test>

cd ~/VSP-Open-Code/packages/opencode
bun test <focused workflow tests>
bun typecheck
```

Pass signal: target commands exit 0 or documented target limitation/deferred item is recorded with user approval.

## Audit Focus

- Target changes match confirmed plan.
- No source runtime `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/log.yaml` is copied to target repos.
- Target-side records exist.
- Source integration matrix reflects actual status.

## Completion Report Requirements

Include target changed files, validation output, target-side record paths, source backlink, dirty worktree preservation notes, deferred target-specific items, and final integration status.
