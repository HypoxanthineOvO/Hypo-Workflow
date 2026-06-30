# C19-M3 Test Evidence

Role: test worker
Scope: Prompt Rule Projection And Platform Adapters

## Files Edited

- `core/test/commands-rules-artifacts.test.js`
- `core/test/c18-instruction-quality-contract.test.js`
- `.pipeline/reviews/C19/M3/test-evidence.md`

## Contract Tests Added

- `karpathy guideline pack remains optional while preserving pack severity defaults`
  - Verifies the four `@karpathy/guidelines` rules stay `off` by default.
  - Verifies opting into `@karpathy/guidelines` applies `warn` pack defaults.
- `OpenCode artifacts project four-rule discipline and visible phase gates`
  - Requires generated `AGENTS.md`, OpenCode `hw-plan` agent, and OpenCode plan command surfaces to include:
    - Think Before Coding
    - Simplicity First
    - Surgical Changes
    - Goal-Driven Execution
  - Requires Plan gate guidance to show actual phase artifacts before Question Tool / Ask confirmation.
  - Rechecks OpenCode DeepSeek tool-calling guidance remains present.
- `Claude artifacts receive shared rule and gate guidance with DeepSeek compatibility`
  - Requires Claude Code slash commands and generated agents to receive the same four-rule and gate guidance.
  - Rechecks Claude DeepSeek tool-calling guidance remains present.
- `shared Ask guidance requires visible phase artifacts before major Plan confirmation gates`
  - Pins the requirement in shared `ASK_QUESTIONS_GUIDANCE`, so OpenCode and Claude should inherit gate visibility through shared guidance rather than adapter-local duplicated text.

## Test Command

```bash
uv run -- node --test core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
```

## Current Result

Expected failure observed.

- pass: 10
- fail: 3

Failure signals:

- `shared Ask guidance requires visible phase artifacts before major Plan confirmation gates`
  - `ASK_QUESTIONS_GUIDANCE` does not mention actual phase artifacts before Question Tool / Ask confirmation.
- `OpenCode artifacts project four-rule discipline and visible phase gates`
  - Generated `AGENTS.md` is missing `Think Before Coding`; the four-rule projection has not reached OpenCode surfaces yet.
- `Claude artifacts receive shared rule and gate guidance with DeepSeek compatibility`
  - Generated Claude `/hw:plan` command is missing `Think Before Coding`; the four-rule projection has not reached Claude surfaces yet.

Existing compatibility signals still covered:

- OpenCode `hw-plan` agent still includes `DeepSeek Tool Calling Rules`.
- Claude `/hw:plan` command and `hw-docs` agent still include `DeepSeek Tool Calling Rules`.
- Optional `@karpathy/guidelines` severity behavior passes: default `off`, opt-in pack default `warn`.

## Final Validation

Focused command:

```bash
uv run -- node --test core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
```

Result:

```text
tests 13
pass 13
fail 0
```

Regression command:

```bash
uv run -- node --test core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js core/test/claude-plugin-alias.test.js core/test/claude-model-routing.test.js core/test/opencode-model-matrix-docs.test.js core/test/readme-update.test.js && bash tests/scenarios/v9/s55-opencode-command-map/run.sh && bash tests/scenarios/v9/s56-agents-ask-todo-plan-discipline/run.sh && bash tests/scenarios/v9/s58-opencode-full-v84-parity/run.sh && git diff --check
```

Result:

```text
Node tests 37/37 passing
s55 passed
s56 passed
s58 passed
git diff --check passing
```
