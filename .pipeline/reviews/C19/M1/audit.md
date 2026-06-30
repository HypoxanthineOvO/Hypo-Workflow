# C19-M1 Audit Evidence

## Scope

Reviewed the final Plan command-surface implementation for C19-M1.

## Verdict

PASS.

## Findings

- No user-facing `/hw:plan:confirm` command remains in command maps, generated OpenCode command files, OpenCode config, metadata, README, command references, or scenario fixtures.
- Remaining `/hw:plan:confirm` hits are limited to negative assertions, OpenCode stale-file cleanup, and the legacy compatibility Skill note.
- OpenCode command artifacts use colon command files such as `.opencode/commands/hw:plan:technical-stack.md` and `.opencode/commands/hw:plan:architecture.md`.
- Legacy dash-style OpenCode command files are removed during artifact generation. Remaining dash-style hits are Cursor adapter documentation/tests, OpenCode agent file names, or explicit legacy cleanup wording.
- `CANONICAL_COMMANDS` now stores colon-form `opencode` metadata, keeping the source registry consistent with generated OpenCode command names.

## Validation

```bash
uv run -- node --test core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js core/test/deep-plan-contract.test.js core/test/deep-plan-integration.test.js core/test/codex-subagent-discipline.test.js core/test/batch-plan.test.js core/test/claude-plugin-alias.test.js core/test/sync-standardization.test.js core/test/skill-spec.test.js core/test/knowledge-ledger.test.js core/test/analysis-command-entry.test.js core/test/chat-mode-spec.test.js core/test/opencode-model-matrix-docs.test.js core/test/readme-update.test.js && bash tests/scenarios/v9/s51-opencode-capability-matrix/run.sh && bash tests/scenarios/v9/s55-opencode-command-map/run.sh && bash tests/scenarios/v9/s56-agents-ask-todo-plan-discipline/run.sh && bash tests/scenarios/v9/s58-opencode-full-v84-parity/run.sh && bash tests/scenarios/v9/s61-opencode-model-matrix-sync/run.sh && git diff --check
```

Result:

- Node tests: 83/83 passing.
- Scenario tests: s51, s55, s56, s58, s61 passing.
- `git diff --check`: passing.

## Static Scans

```bash
rg -n "hw:plan:confirm|hw-plan-confirm|/hw:plan:confirm" opencode.json .opencode README.md docs/reference docs/en/reference references SKILL.md skills core/src core/test tests/scenarios/v9 --glob '!tests/results/**' -S
```

Acceptable remaining hits:

- Negative tests in `core/test`.
- Stale-file cleanup list in `core/src/artifacts/opencode.js`.
- Legacy compatibility notes in `skills/plan-confirm/SKILL.md` and `skills/plan/SKILL.md`.
- Scenario assertion that stale `.opencode/commands/hw:plan:confirm.md` is absent.

```bash
rg -n '`/hw-[^`]+`|/hw-plan|/hw-start|/hw-analysis|/hw-chat|/hw-report|/hw-compact|/hw-debug|dash-style|opencode: "/hw-' references/opencode-command-map.md references/opencode-spec.md references/opencode-parity.md docs/reference/commands.md docs/en/reference/commands.md README.md core/src/commands/index.js core/test tests/scenarios/v9 -S
```

Acceptable remaining hits:

- Cursor adapter docs/tests.
- OpenCode agent file names such as `hw-plan.md`, not slash command surface.
- One legacy cleanup explanation in `references/opencode-command-map.md`.

## Residual Risk

M1 only changes the command contract and public/docs/adapter surfaces. Later C19 milestones still need to implement structured phase artifacts, adaptive gates, and prompt/rule projection behavior.
