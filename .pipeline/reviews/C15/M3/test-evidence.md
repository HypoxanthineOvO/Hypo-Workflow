# C15-M3 Test Evidence

## Scope

- Worker role: `test`
- Write scope honored:
  - `core/test/analysis-command-entry.test.js`
  - `.pipeline/reviews/C15/M3/test-evidence.md`
- No implementation, docs, spec, or source files were edited.
- New test reads tracked source/spec/skill files and generates OpenCode artifacts only in a temporary directory; it does not depend on `.pipeline/` runtime state.

## Added Contract Test

- File: `core/test/analysis-command-entry.test.js`
- Purpose: focused M3 command-entry contract for the interactive Analysis lane.
- Covered expectations:
  - canonical `/hw:analysis` and OpenCode `/hw-analysis` registry entry
  - command map/spec/root skill/skill spec/OpenCode map traceability
  - `skills/analysis/SKILL.md` existence and `enter` / `continue` / `end` / `report` semantics
  - Analysis evidence model distinct from `/hw:chat`: `hypothesis`, `experiment`, `observation`, `confidence`, `follow-up`
  - compact `prompt_state.analysis_summary` plus `ledger_path` status/report surface
  - debug guidance for escalating sustained root-cause work into Analysis state
  - generated OpenCode `hw-analysis.md`, root `opencode.json` command metadata, and `.opencode/hypo-workflow.json.commandMap`

## RED Result

Command:

```bash
uv run -- node --test core/test/analysis-command-entry.test.js
```

Result: RED, 5 failed / 0 passed.

Observed failures:

- `/hw:analysis` is absent from `core/src/commands/index.js` / `commandByCanonical`.
- `skills/analysis/SKILL.md` does not exist.
- `skills/status/SKILL.md` does not mention `prompt_state.analysis_summary` / `analysis_summary` or the Analysis ledger pointer.
- `skills/debug/SKILL.md` does not route sustained root-cause investigation to `/hw:analysis` / Analysis state.
- `writeOpenCodeArtifacts()` does not generate `.opencode/commands/hw-analysis.md` because the command registry lacks `/hw-analysis`.

## Regression Result

Command:

```bash
uv run -- node --test core/test/analysis-runtime.test.js core/test/analysis-state-ledger.test.js core/test/analysis-interaction.test.js core/test/analysis-preset.test.js core/test/chat-runtime.test.js core/test/chat-mode-spec.test.js core/test/sync-standardization.test.js core/test/skill-spec.test.js
```

Result: GREEN, 34 passed / 0 failed.

This confirms the underlying Analysis preset, ledger helpers, interaction boundaries, chat behavior, sync behavior, and existing skill spec tests remain stable before M3 implementation.

## Gaps For Implementation Worker

- Add `/hw:analysis` to the canonical command registry with OpenCode mapping `/hw-analysis`.
- Add or equivalent-route `skills/analysis/SKILL.md` with interactive investigation semantics for `enter`, `continue`, `end`, and `report`.
- Update root skill, `references/commands-spec.md`, `references/skill-spec.md`, and `references/opencode-command-map.md` or their generated equivalents to include `/hw:analysis`.
- Make `/hw:analysis` visibly distinct from `/hw:chat`; Analysis must persist structured investigation evidence, not just append chat entries.
- Update status/report guidance to summarize `prompt_state.analysis_summary` and show `ledger_path` without expanding state with full hypotheses, experiments, or observations.
- Update debug guidance so long-running root-cause investigation can enter Analysis state.
- Ensure OpenCode generated command files and metadata include `/hw-analysis`.
