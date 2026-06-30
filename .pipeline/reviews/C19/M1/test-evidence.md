# C19-M1 Test Evidence

## Scope

Test worker updated focused test assets for the Plan phase command contract.

## Changed Test Assets

- `core/test/commands-rules-artifacts.test.js`
- `core/test/docs-governance.test.js`

## Encoded Contract

- `/hw:plan:technical-stack` is a user-facing Plan command.
- `/hw:plan:architecture` is a user-facing Plan command.
- `/hw:plan:confirm` is not user-facing and is absent from command maps, generated OpenCode command files, OpenCode config, metadata, and generated command references.
- Confirmation remains an in-phase Ask/Question Tool gate, not a standalone user command.

## Focused Test Command

```bash
uv run -- node --test core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js
```

## Result

Status: failing as expected before production implementation.

Failure signals:

- `core/test/commands-rules-artifacts.test.js`: command map still reports `52` commands, expected `53`.
- `core/test/commands-rules-artifacts.test.js`: generated OpenCode command files do not include `hw:plan:technical-stack.md`.
- `core/test/docs-governance.test.js`: generated command reference still lacks `/hw:plan:technical-stack` and still lists `/hw:plan:confirm`.

## Final Validation

After implementation, focused and full validation passed.

Focused command:

```bash
uv run -- node --test core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js core/test/readme-update.test.js
```

Result: 22/22 passing.

Full command:

```bash
uv run -- node --test core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js core/test/deep-plan-contract.test.js core/test/deep-plan-integration.test.js core/test/codex-subagent-discipline.test.js core/test/batch-plan.test.js core/test/claude-plugin-alias.test.js core/test/sync-standardization.test.js core/test/skill-spec.test.js core/test/knowledge-ledger.test.js core/test/analysis-command-entry.test.js core/test/chat-mode-spec.test.js core/test/opencode-model-matrix-docs.test.js core/test/readme-update.test.js && bash tests/scenarios/v9/s51-opencode-capability-matrix/run.sh && bash tests/scenarios/v9/s55-opencode-command-map/run.sh && bash tests/scenarios/v9/s56-agents-ask-todo-plan-discipline/run.sh && bash tests/scenarios/v9/s58-opencode-full-v84-parity/run.sh && bash tests/scenarios/v9/s61-opencode-model-matrix-sync/run.sh && git diff --check
```

Result:

- Node tests: 83/83 passing.
- Scenario tests: s51, s55, s56, s58, s61 passing.
- `git diff --check`: passing.
