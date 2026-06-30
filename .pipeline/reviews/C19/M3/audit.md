# C19-M3 Audit Evidence

## Scope

Reviewed prompt rule projection and platform adapter guidance for C19-M3.

## Verdict

PASS.

## Findings

- Four-rule discipline is projected into OpenCode root `AGENTS.md`, OpenCode command/agent surfaces, and Claude Code command/agent surfaces.
- `@karpathy/guidelines` remains optional: default rule severity is still `off`, and opting into the pack applies `warn`.
- Shared `ASK_QUESTIONS_GUIDANCE` now requires actual phase artifacts before Question Tool / Ask confirmation for Discover, Technical Stack, Architecture, Decompose, and Generate.
- OpenCode and Claude surfaces receive the guidance through shared `agent-guidance.js` rendering, limiting adapter-local duplication.
- DeepSeek tool-calling guidance remains present in generated OpenCode and Claude surfaces tested by the focused suite.
- OpenCode permission/config output remains schema-compatible; no unsupported `bypass` or stale dash command surface was introduced.

## Validation

Focused command:

```bash
uv run -- node --test core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
```

Result: 13/13 passing.

Regression command:

```bash
uv run -- node --test core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js core/test/claude-plugin-alias.test.js core/test/claude-model-routing.test.js core/test/opencode-model-matrix-docs.test.js core/test/readme-update.test.js && bash tests/scenarios/v9/s55-opencode-command-map/run.sh && bash tests/scenarios/v9/s56-agents-ask-todo-plan-discipline/run.sh && bash tests/scenarios/v9/s58-opencode-full-v84-parity/run.sh && git diff --check
```

Result:

- Node tests: 37/37 passing.
- Scenario tests: s55, s56, s58 passing.
- `git diff --check`: passing.

## Residual Risk

M4 should run broader source-side closure, including docs/Skill consistency and full test regression, after all source-side Plan changes are accumulated.
