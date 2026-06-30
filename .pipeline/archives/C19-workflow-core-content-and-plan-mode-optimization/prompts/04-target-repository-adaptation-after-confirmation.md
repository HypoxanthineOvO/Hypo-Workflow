# C19-M5 Target Repository Adaptation After Confirmation

## Objective

Adapt Codex-VSP and VSP-Open-Code after source-side closure and explicit user confirmation.

## Scope

- After C19-M4, hold a dedicated M5 discussion before target planning or writes.
- Especially inspect VSP-OpenCode because the user expects target-specific tuning there.
- Inspect target repositories read-only.
- Generate source summary, target inspection, gap analysis, and target adaptation plan.
- Ask for explicit confirmation of file lists, non-targets, and validation commands.
- After confirmation, apply target-specific adaptations, validate, write target records, and source backlinks.

## Technical Solution

Reuse the C18 integration sync workflow as a release-gated target adaptation process, not a user command.

## Technical Route

1. Read `references/integration-sync-spec.md` and source-side change summary from C19-M4.
2. Hold a dedicated user discussion for M5 scope, especially VSP-OpenCode tuning.
3. Inspect `~/Codex-VSP` and `~/VSP-Open-Code` dirty status and relevant integration surfaces.
4. Generate adaptation plan and stop for user confirmation before target writes.
5. Apply confirmed target changes and run target-native validation.
6. Record target evidence and source backlink.

## Research Required

Status: blocking_question.

Question: after C19-M4 source closure, user must confirm M5 target plan, file lists, non-targets, and validation commands before target writes.

Defer until: after C19-M4.

## Risks And Alternatives

- Risk: target dirty worktrees; must preserve unrelated changes.
- Risk: source/target architecture drift; target inspection must be evidence-based.
- Alternative source-only release gate was rejected by user, who selected target adaptation after confirmation.

## Validation Path

Run target-native focused validation commands determined in the target adaptation plan, plus:

```bash
git diff --check
```

Pass signal: each target repository validates its own adapted surfaces and records evidence.

## Audit Focus

- No target writes before explicit confirmation.
- No copying source runtime state to targets.
- Dirty worktree preservation.
- Source backlink and target records exist.

## Subworker Assignment Plan

- `test`: owns target validation plan evidence after confirmation. Output evidence under `.pipeline/reviews/C19/M5/test-evidence.md`.
- `implement`: owns confirmed target-specific adaptations only after explicit file-list confirmation.
- `audit`: reviews target plan, dirty worktree preservation, validation evidence, and source backlink. Output audit under `.pipeline/reviews/C19/M5/audit.md`.
- Main agent: must stop before target writes and ask through Question Tool with exact files, non-targets, validation commands, and rollback/defer behavior.
