# C16-M1 Workspace Authority Schema And Object Registry

## Goal

Establish `~/.hypo-workflow/workspace.yaml` as the root authority for Global Workspace objects, bindings, project classes, typed relations, policies, sync target refs, and secret refs. `~/.hypo-workflow/projects.yaml` must remain a derived compatibility view.

## Technical Solution

Add a Global Workspace authority layer backed by a user-level manifest. The manifest owns object identity, aliases, relations, sync target refs, policy refs, secret refs, and derived-view metadata.

Required sections:

- `workspace`
- `objects`
- `relations`
- `sync_targets`
- `policies`
- `secret_refs`
- `derived_views`

Seed relation fixtures:

- `hypo-info -> hypo-info-v2: replaced_by`
- `hypo-agent -> hypo-claw: replaced_by`

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns red tests and fixtures for workspace schema validation, duplicate id/alias failures, typed graph validation, and projects.yaml derived-view behavior.
  - Evidence path: `.pipeline/reviews/C16/M1/test-evidence.md`.
- `implement`
  - Owns scoped implementation/docs edits for workspace parser, validator, scaffold helpers, relation validation, and derived-view drift checks.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M1/implementation-evidence.md`.
- `audit`
  - Reviews authority boundaries, secret redaction, derived-view behavior, and worker separation.
  - Evidence path: `.pipeline/reviews/C16/M1/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates state/log/PROGRESS, and writes the completion report.

## Technical Route

1. Read `.plan-state/decompose.yaml`, `.pipeline/deep-plans/DP001-root-project-management-mode/global-workspace-source-of-truth.md`, and `.pipeline/deep-plans/DP001-root-project-management-mode/project-link-graph-taxonomy.md`.
2. Add parser, validator, and default scaffold helpers for `workspace.yaml`.
3. Convert Deep Research reconciliation manifests into draft workspace fixtures.
4. Validate object ids, aliases, object classes, sync refs, and typed graph edges.
5. Generate or drift-check `projects.yaml` as derived compatibility output.
6. Document authority, relation, and compatibility-view behavior.

## Research Required

Status: resolved by Deep Research.

Evidence:

- `.pipeline/deep-plans/DP001-root-project-management-mode/global-workspace-source-of-truth.md`
- `.pipeline/deep-plans/DP001-root-project-management-mode/project-link-graph-taxonomy.md`

## Risks And Alternatives

Risks:

- Existing `projects.yaml` could be accidentally promoted back to authority.
- Object graph drift could appear if aliases and relations are not validated together.

Rejected alternative: extending `projects.yaml` directly. It lacks policy, relation, sync, and maintenance semantics.

## Validation

Run:

```bash
node --test core/test/global-config-registry.test.js core/test/workspace-authority.test.js core/test/project-link-graph.test.js
cd core && npm test
```

Pass signal: workspace schema validates, `replaced_by` seed edges validate, duplicate ids fail, and `projects.yaml` cannot override workspace authority.

## Audit Focus

- `workspace.yaml` is the only global object authority.
- No raw secrets appear in workspace schema.
- `projects.yaml` remains derived.

## Completion Report Requirements

Include changed files, technical reasoning, test design, validation output, expected behavior, residual risks, and any follow-up needed for derived views.
