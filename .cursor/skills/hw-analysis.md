---
name: hw-analysis
description: "Hypo-Workflow Cursor skill for /hw-analysis; use when the user invokes /hw-analysis or canonical /hw:analysis."
---

# /hw-analysis

Canonical command: `/hw:analysis`
Cursor command: `/hw-analysis`
Route: `analysis`
Embedded authority source: `skills/analysis/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:analysis` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: analysis
description: Run or resume an interactive Analysis investigation lane when the user invokes /hw:analysis or wants enter, continue, end, or report semantics for a traceable question.
---

# /hypo-workflow:analysis
<!-- @include: output-language-rule -->

## Output Language Rules

Read config.yaml -> output.language
- zh-CN / zh: all user-visible output uses Chinese
- en: use English
- auto: follow conversation language
Internal log/state keys remain English.

Use this skill for the user-visible Analysis lane. Analysis is an interactive investigation workflow for root cause, metric, or repository/system questions. It is not a broad audit, not lightweight chat, and not a build-first Milestone unless the ledger's follow-up proposal explicitly hands off to build work.

## Preconditions

- `.pipeline/config.yaml` should exist for a managed project; if missing, explain that `/hw:init` or `/hw:plan` is needed before durable Analysis state can be created.
- Read `.pipeline/state.yaml` when present to recover `prompt_state.analysis_summary`.
- Read `.pipeline/cycle.yaml` when present to choose the active Cycle or Milestone id.
- Read `.opencode/hypo-workflow.json.analysis` on OpenCode before an `analysis` preset step or any boundary-controlled action.
- Resolve `execution.analysis.interaction_mode` as `manual | hybrid | auto`; default is `hybrid`.

## Command Semantics

Supported forms:

- `/hw:analysis`
- `/hw:analysis enter "<question>"`
- `/hw:analysis continue`
- `/hw:analysis end`
- `/hw:analysis report`

Meaning:

- `enter`: start or focus the Analysis lane for one concrete investigation question.
- `continue`: resume from `prompt_state.analysis_summary.ledger_path` or the active continuation.
- `end`: conclude the lane with `outcome`, `confidence`, `conclusion`, and `next_actions`; do not mark a disproved hypothesis as failure by itself.
- `report`: summarize the ledger and latest Analysis report without dumping full hypotheses or experiment payloads.

If the user omits an operation, infer it safely:

- active analysis summary exists -> `continue`
- no active summary and a question is present -> `enter`
- no active summary and no question -> ask one focused question for the investigation target

## Execution Flow

1. Resolve output language/timezone and analysis boundaries from project > global > defaults.
2. Load state, Cycle, continuation, recent reports, and existing Analysis ledger if present.
3. Determine the durable ledger path:
   - canonical: `.pipeline/analysis/<cycle-or-milestone>/ledger.yaml`
   - legacy compatible: `.pipeline/analysis/<milestone-id>-analysis-ledger.yaml`
4. For `enter`, initialize the ledger with `question`, `environment_snapshot`, empty hypotheses/experiments/observations, `outcome: inconclusive`, `confidence: low`, and empty `next_actions`.
5. Store only compact recovery data in `prompt_state.analysis_summary`: `milestone_id`, `question`, `ledger_path`, hypothesis counts, experiment counts, `conclusion`, `confidence`, and `updated_at`.
6. Run the Analysis step chain:
   - `define_question`
   - `gather_context`
   - `hypothesize`
   - `experiment`
   - `interpret`
   - `conclude`
7. For each experiment, record actual evidence in the ledger: action, status, command or source inspected, output summary, artifacts, evidence refs, metrics, boundary decision, blocked reason, and code change refs.
8. If the conclusion implies implementation, write a `followup_proposal` with `workflow_kind: build`, `source_analysis`, `recommended_change`, `validation_plan`, `evidence_refs`, and `mode_required`.
9. For `end`, ensure the ledger contains `outcome`, `conclusion`, `confidence`, `next_actions`, `threats_to_validity`, and `ruled_out_alternatives`.
10. For `report`, show the question, ledger path, outcome, confidence, conclusion, next action, and compact hypothesis/experiment counts.

## Interactive Behavior

- Ask for the investigation question before creating a new lane if the user did not provide one.
- Ask before any `hybrid` code change experiment.
- Ask before service restarts, system dependency installation, network/remote resource access, destructive commands, or external side effects when the configured boundary is `ask` or `confirm`.
- In `manual`, deny code changes and record the blocked experiment or proposed follow-up instead.
- In `auto`, code changes may proceed inside configured boundaries, but destructive or external side effects still follow their explicit boundary.
- Keep a visible todo/plan for multi-step investigations when the platform supports it.

## Display Rules

Status, report, progress, and final responses must stay compact:

- show `question`
- show `ledger_path`
- show `outcome` and `confidence`
- show `next_actions`
- show hypothesis and experiment counts
- do not dump full hypotheses, full experiments, observations, or validity discussion unless the user asks to inspect the ledger

## Safety Rules

- `.pipeline/analysis/<cycle-or-milestone>/ledger.yaml` is the durable source of truth for Analysis evidence.
- `.pipeline/state.yaml` must not store full hypotheses, experiments, or observations.
- Do not silently overwrite an existing ledger. If both canonical and legacy paths exist, use the path referenced by `prompt_state.analysis_summary.ledger_path`; otherwise prefer the canonical path and mention the legacy path as imported evidence.
- Never shell-execute `safe_resume_command`; it is a display and recovery hint only.
- Keep Analysis separate from `/hw:chat`; when the task becomes implementation, use a follow-up proposal instead of silently converting the lane.

## Failure Handling

- If the ledger is missing but state points to it, search the legacy path and report the recovery choice.
- If the question is still ambiguous after one clarification, keep the lane in `define_question` rather than fabricating a conclusion.
- If an experiment is blocked by boundaries, record it as `status: blocked` with `blocked_reason`; this can still support an `inconclusive` or `blocked` outcome.
- If all hypotheses are disproved, record progress and either generate new hypotheses or conclude `disproved`/`inconclusive`.

## Reference Files

- `references/analysis-spec.md`
- `references/analysis-ledger-spec.md`
- `references/commands-spec.md`
- `references/debug-spec.md`
- `references/progress-spec.md`
- `references/state-contract.md`
- `templates/analysis/ledger.yaml`
- `templates/analysis/report.md`
- `SKILL.md`
