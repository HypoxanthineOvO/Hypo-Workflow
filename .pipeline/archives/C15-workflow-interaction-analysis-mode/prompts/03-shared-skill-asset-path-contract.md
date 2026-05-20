# C15-M4 Shared Skill Asset Path Contract

## Goal

Fix child-skill references to shared root assets, especially `skills/cycle/SKILL.md` referencing `assets/state-init.yaml` as if it existed under the child skill directory.

## Technical Solution

Establish a path convention:

- Child skills may reference files local to their own directory.
- Shared root assets must be referenced as shared root assets, or by correct relative paths from the child skill.
- From `skills/cycle/SKILL.md`, the shared state template path is `../../assets/state-init.yaml`.

Do not copy root assets into child directories. Do not keep fallback generation as the normal path; fallback hides structural reference bugs.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns path-resolution/content tests for child skill asset references.
  - Evidence path: `.pipeline/reviews/C15/M4/test-evidence.md`.
- `implement`
  - Owns skill/spec edits and minimal path contract repair.
  - Evidence path: `.pipeline/reviews/C15/M4/implementation-evidence.md`.
- `audit`
  - Reviews installed-layout compatibility and false-positive risk in path scanning.
  - Evidence path: `.pipeline/reviews/C15/M4/audit.md`.
- Main agent
  - Coordinates, updates state/log/PROGRESS, and writes final report.

## Required Steps

1. Scan `skills/*/SKILL.md` for relative `assets/`, `references/`, and `templates/` references.
2. Fix `skills/cycle/SKILL.md` so `state-init.yaml` resolves from the child skill context or is explicitly described as a shared root asset.
3. Update `references/skill-spec.md` with the path convention.
4. Add or extend skill quality tests to catch nonexistent child-local asset paths.
5. Verify the installed Codex skill layout and repo layout both make the shared asset discoverable.

## Validation

Run targeted checks:

```bash
uv run -- node --test core/test/skill-quality.test.js core/test/skill-spec.test.js
test -f /home/heyx/.codex/skills/hypo-workflow/assets/state-init.yaml
```

Smoke expectation: simulate or invoke the `/hw:cycle new` path resolution and verify no warning about missing `skills/cycle/assets/state-init.yaml` is needed.

## Completion Report Requirements

Report the exact broken reference, the chosen path convention, files changed, tests added, expected behavior, and any known exceptions.
