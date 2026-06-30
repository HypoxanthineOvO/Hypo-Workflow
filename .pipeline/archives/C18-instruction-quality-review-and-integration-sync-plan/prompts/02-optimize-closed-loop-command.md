# C18-M3 Optimize Closed-Loop Command

## Goal

新增 `/hw:optimize`，编排 `Audit + Quality -> Optimize Implement/Test -> Audit + Quality` 的闭环优化流程。

## Technical Solution

- `/hw:optimize` is a workflow orchestration command, not a background optimizer.
- It starts by negotiating correctness contract, backup, budget, manual/auto mode, validation path, and routing strategy.
- It may route small items to Patch and broad or boundary-unclear work to Plan.
- Post-change verification must compare pre/post Audit and Quality evidence.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns contract tests for `/hw:optimize` command exposure, backup-before-edit, baseline behavior, Test worker first, post-optimize Audit+Quality compare, and budget/stop semantics.
  - Evidence path: `.pipeline/reviews/C18/M3/test-evidence.md`.
- `implement`
  - Owns command registration, `skills/optimize/SKILL.md`, `references/optimize-spec.md`, command specs, OpenCode specs, command map, and guidance docs.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C18/M3/implementation-evidence.md`.
- `audit`
  - Reviews safety gates, Patch/Plan handoff, worker separation, and absence of unbounded auto-edit semantics.
  - Evidence path: `.pipeline/reviews/C18/M3/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Register `/hw:optimize` and add command-specific OpenCode guidance.
2. Create `skills/optimize/SKILL.md` with startup negotiation, backup requirement, correctness gate, loop, stop conditions, and persistence.
3. Create `references/optimize-spec.md` with state schema, worker separation, budget, routing, report evidence, and stop conditions.
4. Update command docs/specs and tests for `/hw:optimize`.
5. Add focused assertions for backup, baseline, Test worker first, post-optimize Audit+Quality, and budget/stop semantics.

## Research Required

Status: resolved.

Evidence:

- `.plan-state/c18-quality-command-decisions.md`
- Existing Patch/Plan worker separation and acceptance tests under `core/test/`

## Risks And Alternatives

Risks:

- Auto Optimize could be misread as permission for broad unbounded edits.
- Backup requirements could be underspecified.

Rejected alternative: fold Auto Optimize into `/hw:quality optimize --auto`. Rejected because the selected design is a distinct orchestration command.

Mitigation: spec requires backup, budget, correctness gates, worker separation, and handoff thresholds before edits.

## Validation

Run:

```bash
node --test core/test/commands-rules-artifacts.test.js core/test/worker-separation-spawn-enforcement.test.js core/test/subagent-separation-contract.test.js
node --test core/test/completion-report-contract.test.js
git diff --check
```

Pass signal: tests exit 0 and assertions cover `/hw:optimize` command and safety contract.

## Audit Focus

- No implementation starts without backup, correctness, validation, and budget contracts.
- Boundary-unclear work routes to Plan.
- Small scoped fixes can route to Patch.
- Optimize does not silently bypass worker separation.

## Completion Report Requirements

Include changed files, command registration evidence, safety gate contract, validation output, Patch/Plan handoff behavior, and residual risks.
