# C8 M01 Code Review Summary

## Verdict

`needs_changes` on the implementation review; all findings were fixed before final validation.

## Findings

- Structured effective rules initially ignored `.pipeline/rules.yaml rules:` severity overrides.
- Global habits initially loaded implicitly from the operator home directory, which made project behavior depend on hidden user state.
- `enforcement.check_kind` initially accepted arbitrary strings.
- Rules documentation listed lifecycle hooks without `pre-release`.

## Resolution

- Applied legacy severity overrides to structured effective rules with a `severity_override` marker.
- Changed global structured loading to require explicit `globalRulesDir`.
- Added enum validation for `agent_judgment`, `deterministic`, `command`, and `checklist`.
- Added `pre-release` to the rules spec and Skill docs.

## Reviewed Refs

- `core/src/rules/index.js`
- `core/test/rules-authority.test.js`
- `references/rules-spec.md`
- `skills/rules/SKILL.md`
- `rules/template/custom-rule-template.md`
