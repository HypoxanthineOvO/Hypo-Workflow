# Hypo-Workflow managed OpenCode instructions

This file is Hypo-Workflow managed. Edit the source Hypo-Workflow rules/config when possible, then regenerate adapters with `hypo-workflow sync --platform opencode`.

## Planning conversation

Repository exploration is evidence, not proof that the Agent understands the user. Before proposing Goal or Plan work, visibly present: Discover, with the complete requirement synthesis and the source of each conclusion; Technical, with current/proposed technology and reasons; and Architecture, with a Mermaid, ASCII, table, or TUI-equivalent diagram showing changed components and downstream effects for an existing project or target components and flows for a new project. These artifacts may be shown together and are not separate confirmation gates.

Ask only about material unresolved decisions; never enforce a question or round quota. After the complete Proposal, offer one contextual choice: confirm and start, confirm without starting, or continue Discussion. A plain affirmative outside that final question is not execution authority.

After rejection, discuss what is wrong, the current state, why the prior reasoning failed, changed assumptions, the correction, and affected Discover/Technical/Architecture deltas before presenting a revised Proposal.

An explicit `/hw:accept`, `/hw:reject`, or unmistakable natural-language acceptance/rejection statement authorizes that action. Validate and report its Receipt binding without asking for a duplicate ordinary confirmation.

## Runtime contract

- Hypo-Workflow is not a runner.
- The OpenCode Agent performs the actual work.
- `.pipeline/manifest.yaml`, the selected Work Item Runtime/Continuation, and structured Records are the current authority. Legacy Cycle/Patch files remain migration inputs, not default session context.
- Use `question` for required user decisions.
- Use `todowrite` for visible plan discipline, especially in `/hw-plan*` commands.

## Completion and report surface

When a Workflow writes a report, debug artifact, audit artifact, Patch record, Cycle summary, or Milestone completion, the final chat response must include the core report content: conclusion/change summary, technical approach, modified files/modules, test design, validation results, expected result, problems encountered, and risks/follow-up. A bare path such as "written to `.pipeline/...`" is insufficient.

The final response must also explain the substance of the report in the conversation before or alongside artifact paths. Do not only list `.pipeline/...` files, worker closures, YAML validity, and test counts. For every important report or review artifact, summarize what it contains, the main conclusion, the user-facing interpretation, and what the user should understand or do next. For learning gates, quizzes, research reports, requirement briefs, or design reports, teach the key concepts and intended checkpoint outcome directly in chat; paths are supporting references, not the explanation.

## Hook-optional context and persistence

Hooks are optimizations, not the source of correctness. At session start, after compaction, or when Workflow context is uncertain:

- Read `.pipeline/manifest.yaml` first.
- Resolve the Session's Work Item through Work Placement when authority routing or resource claims require it. Use `.pipeline/runtime/active.yaml` only as a legacy fallback when no Placement registry exists.
- An unbound Session may receive candidate reminders, but it must not block ordinary prompts, tools, diagnostics, or ordinary-file Experiment records.
- When a Work Item is selected, read only its Runtime and Continuation, plus the latest valid Recovery Pack when resuming.
- Do not scan all Records or use legacy `state.yaml`, `cycle.yaml`, `log.yaml`, or `PROGRESS.md` as authority.

The main Agent must notice explicit durable requirements, preferences, decisions, and feedback even without `UserPromptSubmit`. After explaining the fact in chat, persist it through Maintain without an extra execution gate. Do not record brainstorming, full transcripts, hidden reasoning, secrets, or transient diagnostics. Review staged Ambient Maintain Inbox items before treating them as authority.

## Protected files

Treat `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` as protected. Unexpected writes should be blocked or require explicit user confirmation.

## Analysis boundary

When `execution.steps.preset=analysis`, read `.opencode/hypo-workflow.json.analysis` before acting.

- `manual`: deny code changes.
- `hybrid`: propose code changes and confirm before editing.
- `auto`: code changes are allowed inside the configured boundaries.
- Service restarts require confirmation.
- System-level dependency installation requires an explicit ask.
- Network, remote-resource, destructive, and external side-effect boundaries must be honored exactly as configured.
