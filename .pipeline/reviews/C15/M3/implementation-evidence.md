# C15-M3 Implementation Evidence

Worker: `implement`

## Scope

Edited Analysis command exposure and adjacent guidance only:

- `skills/analysis/SKILL.md`
- `SKILL.md`
- `references/commands-spec.md`
- `references/opencode-command-map.md`
- `references/skill-spec.md`
- `references/analysis-spec.md`
- `references/analysis-ledger-spec.md`
- `references/debug-spec.md`
- `references/progress-spec.md`
- `skills/debug/SKILL.md`
- `skills/status/SKILL.md`
- `skills/report/SKILL.md`
- `core/src/commands/index.js`
- `opencode.json`
- `.opencode/commands/hw-analysis.md`
- `.opencode/hypo-workflow.json`
- `.pipeline/reviews/C15/M3/implementation-evidence.md`

No `core/test/*` files or protected runtime files (`.pipeline/state.yaml`, `.pipeline/log.yaml`, `.pipeline/PROGRESS.md`) were edited.

## Why Analysis Looked Missing

The lower-level Analysis machinery already existed: preset steps, ledger helpers, templates, interaction boundaries, and tests were present. The missing part was the user-facing lane:

- no canonical `/hw:analysis` command existed in the command map
- no OpenCode `/hw-analysis` mapping existed
- root `SKILL.md` did not route Analysis as a command
- status/report/debug guidance did not consistently expose Analysis ledger summaries
- ledger recovery guidance still centered on the older milestone filename form

So Analysis was not gone at the runtime/spec layer; it was effectively hidden from normal command invocation and recovery surfaces.

## Restored Behavior

Added `skills/analysis/SKILL.md` as the command skill for:

- `/hw:analysis enter "<question>"`
- `/hw:analysis continue`
- `/hw:analysis end`
- `/hw:analysis report`
- default inference from active `prompt_state.analysis_summary` or provided question

The lane now documents:

- canonical ledger source of truth: `.pipeline/analysis/<cycle-or-milestone>/ledger.yaml`
- legacy compatibility: `.pipeline/analysis/<milestone-id>-analysis-ledger.yaml`
- state boundary: only compact `prompt_state.analysis_summary` belongs in `state.yaml`
- continuation behavior for unfinished investigations
- summary display fields: question, ledger path, outcome/confidence, next action, and compact counts

## Routing And OpenCode Exposure

Updated the canonical command map in `core/src/commands/index.js`:

- `/hw:analysis`
- `/hw-analysis`
- `hw-debug`
- `route: analysis`
- `skills/analysis/SKILL.md`

Updated user-facing docs and maps:

- root `SKILL.md` command table, handler list, resource list, unknown-command list, and Analysis preset chain
- `references/commands-spec.md` parsing list, unknown-command list, `/hw:analysis` semantics, status/report/debug behavior
- `references/opencode-command-map.md`
- `references/skill-spec.md` inventory and command map counts
- generated OpenCode command file `.opencode/commands/hw-analysis.md`
- generated OpenCode command metadata in `opencode.json` and `.opencode/hypo-workflow.json`

## Status / Report / Debug Exposure

Updated Status and Report skills to show Analysis summaries without dumping the ledger:

- question
- ledger path
- outcome or conclusion
- confidence
- next action
- hypothesis/experiment counts

Updated Debug guidance so sustained root-cause work can enter Analysis state instead of staying as a one-off debug report.

Updated Progress guidance so Analysis rows show question, ledger path, outcome/confidence, and next action while keeping full evidence in the ledger.

## Validation

Ran:

```bash
node -e "const fs=require('fs'); for (const f of ['opencode.json','.opencode/opencode.json','.opencode/hypo-workflow.json']) JSON.parse(fs.readFileSync(f,'utf8')); console.log('json ok')"
node - <<'NODE'
import { commandMap } from './core/src/commands/index.js';
const commands = commandMap('opencode');
const analysis = commands.find((item) => item.canonical === '/hw:analysis');
if (!analysis) throw new Error('missing /hw:analysis');
if (analysis.opencode !== '/hw-analysis') throw new Error('wrong opencode mapping');
if (analysis.skill !== 'skills/analysis/SKILL.md') throw new Error('wrong skill path');
console.log(`commands=${commands.length} analysis=${analysis.opencode}`);
NODE
test -f .opencode/commands/hw-analysis.md && test -f skills/analysis/SKILL.md && printf 'analysis files ok\n'
node --test core/test/analysis-runtime.test.js core/test/analysis-state-ledger.test.js core/test/analysis-interaction.test.js core/test/analysis-preset.test.js core/test/commands-rules-artifacts.test.js core/test/opencode-status.test.js
```

Results:

- JSON parsing passed for OpenCode metadata.
- Command map reports `commands=41 analysis=/hw-analysis`.
- New Analysis skill and OpenCode command files exist.
- Existing Analysis-related tests passed.
- The targeted test run has one expected stale-count failure in `core/test/commands-rules-artifacts.test.js`: it still asserts `40` OpenCode mappings while this milestone intentionally adds the 41st command. Test worker owns test updates.

## Risks

- `core/src/analysis/index.js` still has the older helper default `.pipeline/analysis/<milestone-id>-analysis-ledger.yaml`; this implementation documented canonical command behavior and legacy compatibility without editing that runtime helper because it was outside the requested source scope.
- `references/state-contract.md` still contains the legacy example path; the new command skill and Analysis ledger spec describe canonical and legacy behavior. A follow-up may align state examples after the test worker updates expectations.
- Existing generated OpenCode artifacts were updated only for the new command/metadata; a full adapter sync may rewrite adjacent generated files.
