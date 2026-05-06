# M01 / F001 - Rules and Habits Authority Schema

## Objective

- Define the structured Rules/Habits authority model, scope precedence, conflict reporting, and validation helpers that later milestones can consume.

## 需求

- Extend the existing rules system without breaking `.pipeline/rules.yaml`, `rules/builtin/*.yaml`, presets, or Markdown custom rules.
- Add a structured user/project/cycle rule authority model with stable ids, scope, severity, hooks, source metadata, instruction content, examples, and enforcement/evidence fields.
- Define `cycle > project > global > builtin` precedence and report overridden or conflicting rules.
- Keep generated Markdown habits and platform instructions as derived views, not authority.
- Document how this authority relates to Knowledge Ledger, SessionStart context, and existing rules summary output.

## Boundaries

- In scope:
  - `references/rules-spec.md`
  - `skills/rules/SKILL.md`
  - `rules/template/`
  - `core/src/rules/`
  - focused tests under `core/test/`
- Preserve existing built-in rules and presets.
- Do not implement natural-language capture yet; that belongs to M02.
- Do not generate platform adapter text yet; that belongs to M03.

## Non-Goals

- Do not remove Markdown custom rules.
- Do not migrate existing user rules automatically.
- Do not introduce remote rule-pack installation.

## Implementation Plan

1. Add failing tests for structured rule normalization, scope precedence, conflict reporting, and backwards compatibility with existing `.pipeline/rules.yaml`.
2. Design a schema for structured rule records and a compact effective-rule summary.
3. Implement deterministic helpers for loading/merging structured rules with existing built-in and custom Markdown rules.
4. Update rules docs and Skill instructions so agents treat structured records as authority.
5. Keep output language behavior intact.

## 预期测试

- Existing rules summary tests still pass.
- Structured `global/project/cycle` rule fixtures resolve in the expected precedence order.
- Conflicts report the winning rule and overridden rule ids.
- Markdown custom rules remain loadable and visible.
- Invalid structured rules produce deterministic warnings or errors according to configured strictness.

## Validation Commands

- `node --test core/test/commands-rules-artifacts.test.js`
- `node --test core/test/*rules*.test.js`
- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- Record the effective rule table from a fixture containing global, project, cycle, builtin, and Markdown custom rules.
- Include a conflict report sample in the milestone report.

## Human QA

- Confirm the schema is understandable enough for a user to inspect.
- Confirm no existing `.pipeline/rules.yaml` behavior changed unexpectedly.

## 预期产出

- Structured Rules/Habits schema docs and helpers.
- Focused tests and compatibility evidence.
- Report section listing precedence and conflict behavior.
