# C21-M4 Init, Workspace Adoption, And Minimal Skill Router

## Objective

Provide a usable new-project and brownfield entry point while detecting legacy projects without silently migrating them.

## Requirements

- `/hw:init <intent>` compiles supplied intent; `/hw:init` without input asks what outcome the user wants.
- Empty and brownfield repositories initialize transactionally into the new format.
- Legacy workspaces are inspected and reported with zero writes.
- Damaged current workspaces fail closed with repair guidance.
- Generate an Adoption Brief with source refs/confidence for inferred brownfield facts.
- Rewrite root `SKILL.md` as a concise compatibility router with progressive references.
- Add command exposure classes: `public`, `contextual`, `internal`, `deferred`, `removed`.
- During bootstrap, advertise only routes whose backend exists.

## Boundaries

In scope: `core/src/init/`, `core/src/migration/legacy-inspector.js`, Root Skill, Init/Guide Skills, exposure registry, and integration fixtures.

Out of scope: general `/hw:migrate`, full Goal/Cycle execution, platform adapters beyond the root Codex Skill bundle, or deletion of old Skills.

## Technical Solution

Build Init directly on the deterministic M1-M3 APIs. One classifier selects empty/brownfield/legacy/current/damaged/mixed behavior. Root Skill routes to focused Child Skills/references instead of duplicating all behavior. Registry availability prevents planned-but-unimplemented commands from becoming false public capability.

## Technical Route

1. Write RED integration tests for all workspace classes, with-input/no-input Init, repeated Init, and root router exposure.
2. Implement raw read-only project inspection and legacy evidence summaries without loading default-filled legacy config.
3. Compile user intent or interactive answers into manifest identity, initial Records, runtime, Capsule, and Adoption Brief.
4. Initialize the new layout through a recoverable transaction.
5. Add exposure and availability fields to the command registry.
6. Rewrite Root Skill to approximately routing-scale, with clear compatibility/deferred messages and no duplicated command manual.
7. Rewrite Init/Guide Skills to call new semantics and remove setup/platform registration behavior.
8. Validate repeated initialization, damaged recovery guidance, and byte-identical legacy fixtures.

## Research Required

Status: resolved.

Evidence: the user confirmed empty, brownfield, and experiment project classes while deferring experiment management; current CLI Init only creates legacy config/registry state; Skill Creator guidance favors progressive disclosure and focused Child Skills.

## Risks And Alternatives

- Risk: inferred brownfield facts overstate architecture.
- Risk: registry exposes Goal/Cycle before M6 exists.
- Rejected: keep Setup plus Init; the product is Skill-first, not installed software.
- Rejected: auto-migrate legacy projects; explicitly deferred.
- Mitigation: source refs/confidence, availability gate, zero-write legacy checks, and concise router contract tests.

## Test Specification

- Empty and brownfield Init create valid manifest/runtime/memory/snapshot structure.
- No-input Init produces a meaningful Ask contract, not a fixed round quota.
- Legacy fixture bytes and mtimes remain unchanged.
- Current/damaged/mixed classes route to distinct behavior.
- Root Skill remains below the agreed routing scale and resolves every public bootstrap route.
- Deferred/removed entries are not discoverable as active commands.

## Validation Commands

```bash
node --test \
  core/test/init-bootstrap.test.js \
  core/test/legacy-workspace-inspection.test.js \
  core/test/root-skill-router.test.js \
  core/test/command-exposure.test.js
```

Pass signal: new fixtures reopen successfully; legacy is byte-identical; damaged format is blocked; only implemented bootstrap routes are advertised.

Pseudo-test rejection: checking Root Skill line count or text anchors alone is insufficient; Init must run in real temporary repositories.

## Evidence Paths

- `.pipeline/reviews/C21/M4/test-evidence.md`
- `.pipeline/reviews/C21/M4/implementation-evidence.md`
- `.pipeline/reviews/C21/M4/audit.md`
- `.pipeline/reports/03-init-workspace-adoption-and-minimal-skill-router.report.md`

## Audit Focus

- Init never calls old Setup, global registry, or adapter sync.
- Legacy detection is truly zero-write.
- Brownfield inference carries evidence and confidence.
- Root Skill stays routing-focused and platform-neutral.

## Subworker Assignment Plan

Status: authorized, strict separation.

- `test`: owns Init/router integration fixtures and evidence.
- `implement`: owns Init/inspector/registry and scoped Skill edits, not tests.
- `audit`: independently checks zero-write behavior, progressive disclosure, exposure accuracy, and worker separation.
- Main agent: orchestrates and commits lifecycle state only.

## Expected Artifacts

- Init and legacy-inspection modules
- concise Root/Init/Guide Skills
- exposure registry
- integration tests and evidence reports
