# C20-M4 Target Cycle Input And Distribution Boundary Package

## Objective

Prepare the distribution package for Codex-VSP and VSP-Open-Code that separates direct sync surfaces from target-owned optimization work, without writing target repositories in this source Cycle.

## 需求

- Create `.pipeline/integrations/C20-target-cycle-input.md`.
- Update `.pipeline/integrations/matrix.yaml` with C20 source evidence and target handoff status.
- Inspect `/home/heyx/Codex-VSP` and `/home/heyx/VSP-Open-Code` read-only.
- Produce target-local Cycle briefs/checklists for both targets.
- Explicitly state target no-write status in this source Cycle.

## Boundaries

- In scope:
  - `.pipeline/integrations/C20-target-cycle-input.md`
  - `.pipeline/integrations/matrix.yaml`
  - Read-only inspection notes for `/home/heyx/Codex-VSP`
  - Read-only inspection notes for `/home/heyx/VSP-Open-Code`
  - Target-local Cycle briefs/checklists for Codex-VSP and VSP-Open-Code
- Out of scope:
  - No edits inside `/home/heyx/Codex-VSP`.
  - No edits inside `/home/heyx/VSP-Open-Code`.
  - No decision that Codex-VSP per-model prompt files must be edited before the target Cycle verifies the effective runtime path.
  - No VSP-Open-Code local reminder rewrite before target-local Cycle confirmation.

## Technical Solution

Use the source contract and source closure evidence as the authoritative input for target-local Cycles. The source Cycle may identify direct-sync surfaces and validation candidates, but target repositories apply and optimize them under their own Cycle gates.

## Technical Route

1. Read the C20 source spec and C20-M3 source closure evidence.
2. Inspect Codex-VSP and VSP-Open-Code read-only for relevant current surfaces and dirty status.
3. Write a target Cycle input package with direct-sync checklist, target-owned checklist, non-targets, and validation candidates.
4. Update the integration matrix with C20 source evidence and target-local Cycle handoff status.
5. Record that target writes are deferred to target-local Cycles and verify target git status did not change because of this source Cycle.

## Research Required

Status: deferred_by_user.

Deferred items:

- Codex-VSP exact per-model prompt edit list.
  - Defer until: Codex-VSP target-local Cycle verifies effective base-instructions path.
  - Evidence: user selected source-first specification followed by target-local Cycle adaptation.
- VSP-Open-Code local reminder wording expansion.
  - Defer until: VSP-Open-Code target-local Cycle inspects reminder runtime and tests.
  - Evidence: user selected target-owned optimization/repair for local reminder and runtime prompt details.

Resolved evidence:

- `.plan-state/c20-technical-stack.yaml` records target likely surfaces and validation candidates.
- `.plan-state/c20-architecture.yaml` records direct sync versus target-owned scope.

## Risks And Alternatives

- Risk: direct sync and target-owned work are mixed, causing accidental cross-repo prompt edits.
- Risk: target dirty worktrees obscure what C20 changed.
- Risk: source Cycle falsely claims behavior is deployed in targets.
- Alternative rejected: apply target writes in the source Cycle; rejected because user prefers target-local Cycles for optimization/update.
- Alternative rejected: only mention targets in prose; rejected because distribution needs a durable matrix and checklist.
- Mitigation: make target no-write status explicit, record target dirty status read-only, and require target-local validation before deployment claims.

## 预期测试

- Distribution package lists direct sync scope and target-owned scope separately.
- Codex-VSP brief includes base-instructions path verification before per-model prompt edits.
- VSP-Open-Code brief treats `Prefer automation` as compatible with clear tasks but not discussion signals.
- Integration matrix records source evidence, target status, validation candidates, and no-write status.
- A check confirms target repositories were not modified by this milestone.

## Validation Commands

```bash
node -e "const fs=require('fs'); for (const f of ['.pipeline/integrations/C20-target-cycle-input.md','.pipeline/integrations/matrix.yaml']) fs.accessSync(f)"
git diff --check
git -C /home/heyx/Codex-VSP status --short
git -C /home/heyx/VSP-Open-Code status --short
```

## Evidence

- Distribution files exist.
- Source diff has no whitespace errors.
- Target status checks are recorded as read-only evidence and no new source-Cycle target writes are applied.
- Output evidence should be recorded under `.pipeline/reviews/C20/M4/test-evidence.md`.

## Audit Focus

- Target package accurately reflects source spec and source closure evidence.
- Direct sync scope and target-owned scope are visibly separate.
- No cross-repo edits occurred in the source Cycle.
- Target Cycle briefs include concrete validation candidates and unresolved target-owned decisions.

## Human QA

- Review target-local Cycle briefs before opening target Cycles.
- Independent validation owner: `test` worker or main-agent verified read-only target validation, depending on available target tooling.

## Subworker Assignment Plan

- `test`: owns distribution package validation, matrix existence/parse checks, target read-only status capture, and pseudo-test rejection. Output evidence under `.pipeline/reviews/C20/M4/test-evidence.md`.
- `implement`: owns source-side integration package and matrix edits only.
- `audit`: read-only; reviews no-target-write boundary, dirty worktree preservation, direct-sync/target-owned separation, and target-local Cycle readiness. Output audit under `.pipeline/reviews/C20/M4/audit.md`.
- Main agent: orchestrates workers, integrates accepted changes, updates lifecycle state, and must not satisfy the worker roles itself.
- Non-overlap: the same worker identity must not satisfy both `test` and `implement`; audit remains separate when available.
- Prompt-scoped local execution scope required before spawning source-editing workers:
  - `test` may edit `.pipeline/reviews/C20/M4/test-evidence.md` only and may run read-only target status commands.
  - `implement` may edit `.pipeline/integrations/C20-target-cycle-input.md`, `.pipeline/integrations/matrix.yaml`, and `.pipeline/reviews/C20/M4/implementation-evidence.md`.
  - `audit` is read-only and may only write `.pipeline/reviews/C20/M4/audit.md` if granted audit report write scope.
  - No worker may edit files under `/home/heyx/Codex-VSP` or `/home/heyx/VSP-Open-Code` in this milestone.

## 预期产出

- `.pipeline/integrations/C20-target-cycle-input.md`
- Updated `.pipeline/integrations/matrix.yaml` C20 entry
- `.pipeline/reviews/C20/M4/test-evidence.md`
- `.pipeline/reviews/C20/M4/audit.md`
- Target-local Cycle input package for Codex-VSP and VSP-Open-Code
