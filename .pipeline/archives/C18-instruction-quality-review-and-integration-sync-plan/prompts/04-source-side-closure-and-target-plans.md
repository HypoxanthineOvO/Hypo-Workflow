# C18-M5 Source-Side Status, Docs, And Full Regression Closure

## Goal

闭合本仓库 docs/status/tests/full regression，并只读检查 `~/Codex-VSP` 与 `~/VSP-Open-Code`，生成目标适配计划和文件清单。

## Technical Solution

- Refresh source docs, generated references, project summary, and integration matrix.
- Run focused tests from prior milestones, then full `npm test` and `git diff --check`.
- Read-only inspect target repositories for dirty status and integration surfaces.
- Write target adaptation plans, file lists, validation commands, and deferred items.
- Stop for user confirmation before target writes.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns full regression, focused regression replay, diff check, and read-only target inspection evidence.
  - Evidence path: `.pipeline/reviews/C18/M5/test-evidence.md`.
- `implement`
  - Owns source docs/status/project summary/integration matrix updates and target adaptation plan artifacts.
  - Must not write target repositories.
  - Evidence path: `.pipeline/reviews/C18/M5/implementation-evidence.md`.
- `audit`
  - Reviews command/docs/artifact freshness, full regression evidence, no target writes, target plan completeness, and worker separation.
  - Evidence path: `.pipeline/reviews/C18/M5/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Update README, PROJECT-SUMMARY, docs/reference, and generated command/platform references as needed.
2. Run focused tests from C18-M1 to C18-M4.
3. Run full `npm test` and `git diff --check`.
4. Read-only inspect `~/Codex-VSP` and `~/VSP-Open-Code` dirty status and integration surfaces.
5. Write source-side target adaptation plans with file list, validation plan, risks, and deferred items.
6. Stop before C18-M6 and request user confirmation for target writes.

## Research Required

Status: resolved for P3, with details deferred to this milestone's read-only inspection.

Evidence:

- P1 inspection found `~/Codex-VSP` and `~/VSP-Open-Code` exist and are dirty.
- `~/Codex-VSP` likely validates under `codex-rs` with Cargo/just.
- `~/VSP-Open-Code` likely validates under `packages/opencode` with Bun.

## Risks And Alternatives

Risks:

- Full `npm test` may expose unrelated dirty-worktree regressions.
- Target repos are dirty, so plans must not overwrite uncommitted work.

Rejected alternative: apply target changes immediately. Rejected by plan-before-apply policy.

Mitigation: record unrelated failures separately, preserve dirty worktrees, and require explicit confirmation gate.

## Validation

Run:

```bash
npm test
git diff --check
git -C ~/Codex-VSP status --short
git -C ~/VSP-Open-Code status --short
```

Pass signal: source tests and diff check pass or unrelated failures are documented; target adaptation plan exists; no target writes occurred.

## Audit Focus

- Source command/docs/artifact surfaces are fresh.
- No accidental target writes.
- Target adaptation plan covers commands/Skill/Docs, Hooks/Journal, Dashboard/Status, state read/write, permissions, and target tests.

## Completion Report Requirements

Include changed files, full regression output, target dirty status, target adaptation plan paths, exact file lists, validation commands, deferred items, and the required user confirmation question for C18-M6.
