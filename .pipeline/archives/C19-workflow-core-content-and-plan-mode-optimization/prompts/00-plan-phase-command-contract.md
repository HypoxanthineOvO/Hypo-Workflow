# C19-M1 Plan Phase Model And Command Contract

## Objective

Define the new Plan phase model and command surface across Skills, command map, command docs, and references.

## Scope

- Update `/hw:plan` semantics to `Discover -> Technical Stack -> Architecture -> Decompose -> Generate -> Implementation`.
- Add or expose `/hw:plan:technical-stack` and `/hw:plan:architecture`.
- Remove user-facing `/hw:plan:confirm`; model confirmation as in-phase Question Tool / Ask gates.
- Preserve backward-compatible handling or migration messaging if existing generated artifacts still reference confirm.

## Technical Solution

Introduce explicit named Plan phase command contracts while keeping `/hw:plan` as the orchestrating entry. Confirmation becomes a gate behavior rather than a standalone user command.

## Technical Route

1. Audit current plan command entries and generated command files.
2. Add canonical command entries for `/hw:plan:technical-stack` and `/hw:plan:architecture`.
3. Remove or deprecate `/hw:plan:confirm` from user-facing command maps and docs.
4. Update Skill text to describe phase semantics and transition rules.
5. Update command specs and generated command docs to reflect the new command surface.

## Research Required

Status: resolved.

Evidence:
- `core/src/commands/index.js` currently exposes `/hw:plan:confirm` and no technical-stack/architecture commands.
- The final Architecture decision is captured in `.pipeline/architecture.md`.

## Risks And Alternatives

- Risk: removing confirm may break tests or docs expecting the old command count; mitigate with focused command-map and adapter tests.
- Alternative rejected: keep no new commands; rejected by user in Architecture.
- Compatibility path: if generated artifacts still require a transition, use migration wording rather than preserving confirm as a user command.

## Validation Path

Run:

```bash
uv run -- node --test core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js
```

Pass signal: command map and generated docs include technical-stack/architecture and no user-facing confirm command.

## Audit Focus

- No command namespace regression.
- No stale confirm references in user-facing docs/adapters.
- Architecture decision is reflected consistently.

## Subworker Assignment Plan

- `test`: owns focused command/docs tests and expected failing assertions before implementation. Output evidence under `.pipeline/reviews/C19/M1/test-evidence.md`.
- `implement`: owns scoped edits to command map, command docs, and Plan Skill command-surface text. Must not edit test evidence.
- `audit`: reviews final diff, command namespace consistency, stale confirm references, and validation evidence. Output audit under `.pipeline/reviews/C19/M1/audit.md`.
- Main agent: coordinates workers, integrates outputs, updates `.pipeline/state.yaml`, `.pipeline/PROGRESS.md`, and `.pipeline/log.yaml`.
