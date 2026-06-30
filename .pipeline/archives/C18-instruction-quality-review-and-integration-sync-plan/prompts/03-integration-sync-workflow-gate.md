# C18-M4 Integration Sync Workflow As Development And Release Gate

## Goal

把集成同步定义为开发流程和 release gate，而不是新增用户命令。

## Technical Solution

- Add a source-side integration sync reference spec and developer/release checklist.
- Use an integration matrix to track feature-level status across `~/Codex-VSP` and `~/VSP-Open-Code`.
- Require source summary, target inspection, gap analysis, target adaptation plan, target validation, target records, and source backlink.
- Explicitly forbid exposing `/hw:integrations` or `/hw:sync integrations` as user commands.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns docs/reference/command tests proving integration sync is documented as a workflow and not exposed as a command.
  - Evidence path: `.pipeline/reviews/C18/M4/test-evidence.md`.
- `implement`
  - Owns `references/integration-sync-spec.md`, developer/release docs or generated references, integration matrix format, and no-command contract docs.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C18/M4/implementation-evidence.md`.
- `audit`
  - Reviews no-command boundary, target inspection requirements, target-side record requirements, runtime state copy prohibition, and worker separation.
  - Evidence path: `.pipeline/reviews/C18/M4/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Create `references/integration-sync-spec.md` from C18 decisions.
2. Add developer/release docs or generated reference content linking the spec.
3. Add or update release/docs/preflight tests to check integration sync workflow text and no new command exposure.
4. Define integration matrix path, likely `.pipeline/integrations/matrix.yaml` or a docs/reference table.
5. Update release/deferred guidance if C18 defers target writes.

## Research Required

Status: resolved.

Evidence:

- `.plan-state/c18-integration-sync-workflow-decisions.md`
- P1 target repo README/AGENTS/journal evidence

## Risks And Alternatives

Risks:

- Workflow may drift into an unimplemented checklist if tests do not check it.
- Users may expect a command despite the decision not to create one.

Rejected alternative: create `/hw:sync integrations`. Rejected because sync is a development process, not a normal user command.

Mitigation: add explicit no-command language and tests that command map does not include `/hw:integrations`.

## Validation

Run:

```bash
node --test core/test/docs-governance.test.js core/test/commands-rules-artifacts.test.js
node --test core/test/reference-contract.test.js
git diff --check
```

Pass signal: tests exit 0 and integration sync is visible in docs/reference but absent from command registry.

## Audit Focus

- Integration sync is a development/release gate, not a command.
- Runtime `.pipeline` state is not copied to target repos.
- Target inspection, target records, and source backlink are mandatory.

## Completion Report Requirements

Include changed files, integration matrix location, no-command evidence, validation output, target record/backlink contract, and residual risks.
