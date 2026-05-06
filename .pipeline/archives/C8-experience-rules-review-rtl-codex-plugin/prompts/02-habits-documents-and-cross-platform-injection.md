# M03 / F001 - Habits Documents and Cross-Platform Injection

## Objective

- Generate habits Markdown and platform instruction snippets from structured Rules/Habits, then verify Codex, OpenCode, Claude, Cursor, Copilot, and Trae adapters consume the right views.

## 需求

- Generate a human-readable habits document from structured rule authority.
- Render active always-rules and habits into platform instruction surfaces.
- Ensure generated AGENTS/OpenCode/Claude/Codex instruction text reflects active rules and conflict resolution.
- Include a review checklist that compares structured authority to generated adapter artifacts.
- Keep generated files clearly marked as derived and avoid silently overwriting user-owned content.

## Boundaries

- In scope:
  - artifact generators under `core/src/artifacts/`
  - rules summary rendering
  - platform docs
  - generated adapter smoke tests
  - Skill Markdown where needed
- Preserve existing managed-block behavior.
- Keep structured rules as authority; generated Markdown is derived.

## Non-Goals

- Do not change real user-level platform settings.
- Do not implement Agent Review gates yet; this milestone only prepares the checks and generated surfaces.

## Implementation Plan

1. Add fixtures for structured rules and expected habits Markdown.
2. Add adapter generation tests proving active rules appear in generated instruction surfaces.
3. Implement habits Markdown rendering and managed derived blocks.
4. Update sync/docs guidance for generated habits and rule-injection behavior.
5. Add a report checklist showing authority-to-artifact coverage.

## 预期测试

- Generated habits Markdown lists active rules by scope and severity.
- Conflicted/overridden rules are visible but marked correctly.
- OpenCode `AGENTS.md`, Claude artifacts, Codex instructions, Cursor/Copilot/Trae outputs include the active instruction view where supported.
- User-owned files are not overwritten outside managed blocks.

## Validation Commands

- `node --test core/test/platform-adapters.test.js`
- `node --test core/test/commands-rules-artifacts.test.js`
- `node --test core/test/*.test.js`
- `python3 tests/run_regression.py`
- `git diff --check`

## Evidence

- Show generated habits path and sample active rules.
- Include generated adapter smoke paths and any unsupported platform fallback notes.

## Human QA

- Confirm the generated habits document is readable and not too verbose.
- Confirm adapter instructions do not duplicate rules excessively.

## 预期产出

- Generated habits document support.
- Cross-platform rule injection checks.
- Documentation and regression evidence.
