# Integration Sync Spec

Use this reference for source-side development and release work that must synchronize Hypo-Workflow command, Skill, docs, adapter, hook, journal, dashboard, or status changes into target integration repositories.

## Boundary

Integration sync is not a user command.

Do not add `/hw:integrations`, `/hw:sync integrations`, or a hidden command that performs cross-repository writes. The existing `/hw:sync` remains project adapter and derived-context synchronization; integration sync is a development workflow and release gate.

## Source Authority

The Hypo-Workflow source repository is the authority for command semantics, Skill/spec contracts, generated adapter logic, and release gating. Target repositories are not passive copies. Each target must be inspected and adapted according to its current state.

## Required Workflow

Every feature update that changes command semantics, Skill behavior, docs contracts, generated adapters, hooks, journal behavior, dashboard/status panels, or state handling must run this workflow before release closure:

1. Source summary
   - summarize changed commands, specs, docs, adapters, state/report paths, and tests
   - include source commit or local diff reference
2. Target inspection
   - inspect `~/Codex-VSP` and `~/VSP-Open-Code` status and relevant integration surfaces
   - record dirty worktree state before planning writes
3. Gap analysis
   - compare source behavior with target command/Skill/docs/hooks/journal/dashboard/status/state surfaces
   - classify required, optional, deferred, and target-specific adaptations
4. Target adaptation plan
   - list exact files to edit
   - list files explicitly out of scope
   - list validation commands
   - require user confirmation before writes
5. Target validation
   - run each target repository's own focused validation
   - document failures, limitations, or deferred items
6. Target records
   - write target-side records according to that repository's record scheme
   - do not copy source runtime `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/log.yaml`
7. Source backlink
   - update source integration matrix or report with target status, record paths, validation evidence, and deferred items

## Target Rules

- Preserve dirty worktrees; do not revert unrelated user work.
- Do not write target repositories until a source-side adaptation plan has been reviewed and confirmed.
- Do not copy source runtime `.pipeline` state into target repositories.
- Prefer target-native hooks, journal, dashboard, and status mechanisms instead of forcing source layouts.
- If target-specific adaptation grows beyond the confirmed file list, stop and ask.

## Integration Matrix

Recommended source-side path:

- `.pipeline/integrations/matrix.yaml`
- `.pipeline/integrations/CYCLE-ID-target-plan.md`

Matrix fields:

```yaml
cycle: C18
feature: quality-optimize-audit
source_summary: []
targets:
  - name: Codex-VSP
    path: ~/Codex-VSP
    inspected_at: null
    dirty_status: null
    required_changes: []
    validation_commands: []
    target_records: []
    status: planned | applied | validated | deferred
  - name: VSP-Open-Code
    path: ~/VSP-Open-Code
    inspected_at: null
    dirty_status: null
    required_changes: []
    validation_commands: []
    target_records: []
    status: planned | applied | validated | deferred
```

## Release Gate

A release that changes integration-relevant behavior must either:

- complete target adaptation and validation, or
- document a user-approved defer with target plans and risks.

The release gate fails if integration sync is represented only as a checklist with no target inspection evidence.
