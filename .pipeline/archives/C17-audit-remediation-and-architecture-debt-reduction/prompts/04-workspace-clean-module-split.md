# C17-M4 Workspace Clean Module Split

## Goal

Delete the `workspace/index.js` God Module by moving responsibilities to explicit modules without keeping a compatibility re-export shim.

## Technical Solution

Create explicit modules:

- `core/src/workspace-authority/index.js`
- `core/src/project-linkage/index.js`
- `core/src/project-stop-events/index.js`
- `core/src/codex-capture/index.js`
- `core/src/notification-sender/index.js`

Move implementation and tests to new module-specific imports. Delete or make private `core/src/workspace/index.js`; do not leave a public re-export shim. Update runtime imports, tests, docs, and examples.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns tests/stale import scans for new module boundaries, removed workspace public import, and focused behavior equivalence.
  - Evidence path: `.pipeline/reviews/C17/M4/test-evidence.md`.
- `implement`
  - Owns module creation, code movement, import migration, docs/examples import updates, and old workspace entry removal.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C17/M4/implementation-evidence.md`.
- `audit`
  - Reviews clean split, no compatibility shim, circular dependency risk, stale import scan, and worker separation.
  - Evidence path: `.pipeline/reviews/C17/M4/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Add new modules and move code by domain ownership.
2. Migrate internal imports in project-events, project-notifications, daily-project-summary, project-linkage-e2e, and core public entry.
3. Update tests to import new module paths.
4. Delete or de-publicize `core/src/workspace/index.js`; do not replace it with re-exports.
5. Update docs/examples to new explicit imports.
6. Run stale import scan as a required validation.

## Research Required

Status: none.

Evidence:

- Direct workspace imports currently found in project-events, project-notifications, daily-project-summary, project-linkage-e2e, and `core/src/index.js`.

## Risks And Alternatives

Risks:

- Breaking import cleanup has large blast radius.
- Notification/config/project linkage modules can form circular imports if not separated carefully.

Rejected alternative: preserving `workspace/index.js` re-export shim for one version. User explicitly chose a clean cut.

## Validation

Run:

```bash
node --test core/test/workspace-authority.test.js core/test/project-link-graph.test.js core/test/project-stop-event.test.js core/test/final-assistant-output.test.js core/test/hypo-claw-notification.test.js core/test/project-linkage-registry.test.js
rg -n 'workspace/index|from .*/workspace' core/src core/test docs README.md README.en.md
npm test
git diff --check
```

Pass signal: old workspace imports are gone, module tests pass, and root `npm test` passes.

## Audit Focus

- `workspace/index.js` must not remain as public compatibility layer.
- New modules must have clear ownership.
- No stale docs/examples or tests import old workspace paths.
- No circular dependency between notification, config, and project linkage modules.

## Completion Report Requirements

Include module mapping, removed/migrated imports, stale import scan result, validation output, expected behavior, and residual risks.
