# Hypo-Workflow managed OpenCode instructions

This file is Hypo-Workflow managed. Edit the source Hypo-Workflow rules/config when possible, then regenerate adapters with `hypo-workflow sync --platform opencode`.


## Consultation-First Action Boundary / 协商优先

For discussion/background/idea/complaint/question/solution-discussion inputs, treat them as non-editing / no file edits signals: do not edit files or write code/config before answering with a Mini-contract in this order: 我的理解 -> 问题原因 -> 推荐方案.

Clear imperative requests with a concrete target may use direct execution: when the user names the action and target file, command, report, or bounded scope, execute directly unless the request is framed as discussion, background, idea, complaint, question, or solution-discussion.

Affirmative replies answer the question actually asked. Agreement after a Mini-contract confirms understanding, not execution. Only after a complete Proposal is visible and the Agent explicitly asks whether to start do 确认并开始、按这个方案实施、按你的方案来、go ahead, or apply it authorize execution. 确认但不开始 approves without starting.

Plan defaults to a guided planning Discussion. Unless the user explicitly asks the Agent to generate a Plan directly from the supplied requirements, the Agent must first discuss the work through relevant Discover, Technical, Architecture, and other scope-specific topics. Discussion starts clarification-first: search the repository and history (project index, current Cycle, memory) before analyzing; then surface the unstated assumptions the user is relying on, the key missing information and how it could change the answer, and the most common mistake for this problem type; then ask the single most critical question (or a few) aimed at the user's real goal and situation, not a generic template. Wait for the user's answer before continuing. Before writing a Proposal, the Agent must: 1) establish a clear, user-visible discussion scope; 2) discuss every item in that scope; 3) recap the scoped items and explicitly ask the user whether they have all been discussed sufficiently and whether Proposal writing may begin. Only the user's explicit confirmation at that checkpoint authorizes Proposal writing. Statements such as "可以", "对", agreement with an idea, or positive feedback on an intermediate recommendation confirm that content only; they do not close Discussion, authorize Proposal writing, or authorize execution. Proposal approval and execution authorization remain separate later gates: never collapse discussion completion, Proposal writing, Proposal approval, and execution start into one inferred transition.

Discover, Technical, and Architecture artifacts must be visible as the material of the scoped Discussion, but their visibility alone does not close it.

After rejection, explain what is wrong, the current state, why the prior reasoning failed, which assumptions change, the proposed correction, and affected Discover/Technical/Architecture deltas before generating a revised Proposal. Never replace this discussion with a Receipt or confirmation card.

An explicit `/hw:accept`, `/hw:reject`, or unmistakable natural-language acceptance/rejection statement authorizes that corresponding action. Report the accept/reject result without asking for a duplicate ordinary confirmation. Ask only when the target, scope, result, or feedback meaning is ambiguous.

On first-use of a new concept in a Cycle, explain it with one-sentence explanation before relying on it.

Direct sync scope covers source-owned managed surfaces such as shared guidance, generated command/agent instructions, AGENTS/OpenCode/Claude adapters, documentation contracts, tests, and release checklists.

Target-owned scope stays separate: Codex-VSP per-model prompts, model selection prompts, and runtime prompt tuning, plus VSP-Open-Code local reminders, runtime prompt details, provider/model behavior, and reminder wording are target-owned scope. They need a local Cycle and must not be directly written by source-side direct sync.

## Four-Rule Discipline

Project the optional @karpathy/guidelines behavior pack as concise execution discipline without changing its default severity. Think Before Coding: state assumptions and material ambiguities before edits. Simplicity First: choose the smallest sufficient solution. Surgical Changes: keep edits local and compatible with surrounding patterns. Goal-Driven Execution: define the desired effect and verification method, then evaluate progress against that target.

## Ask Questions Discipline

Use Ask Questions proactively when a decision materially changes scope, safety, architecture, release behavior, remote side effects, protected files, or acceptance criteria. Use the `question` tool when it is available; otherwise stop and ask the user in the normal response channel. Do not bury required user decisions in unrelated prose or proceed on a guess when the answer changes what should be edited, tested, pushed, released, installed, or delegated.

Before calling Question Tool / Ask, explain in the conversation why the decision is needed and what will change for each answer. Never open a bare question card before that explanation is visible.

Discover, Technical, and Architecture artifacts must be visible; show them together as the material of the scoped Discussion. When the scoped Discussion is complete and the user has confirmed it at the discussion checkpoint, ask the single Proposal choice (confirm and start, confirm without starting, or continue Discussion). Do not invent questions, repeat recommended answers, or use a round quota.

Prefer one concise question with the smallest actionable decision.

## Runtime contract

- Hypo-Workflow is not a runner; the host Agent performs the actual work.
- Daily authority: `.pipeline/INDEX.md` and the active Cycle's `PLAN.md` / `PROGRESS.md` / `EXECUTION.md` / `DISCUSSION-SUMMARY.md`. Recovery reads the project index first, then the focused Cycle's files.
- `.pipeline/manifest.yaml`, runtime objects, structured Records, and legacy Cycle/Patch files are legacy-compatibility surfaces tracked in the Legacy index; they are migration inputs, not default session context.
- Use `question` for required user decisions.
- Use `todowrite` for visible plan discipline, especially in `/hw-plan*` commands.

## Completion and report surface

When a Workflow writes a report, debug artifact, audit artifact, Patch record, Cycle summary, or Milestone completion, the final chat response must include the core report content: conclusion/change summary, technical approach, modified files/modules, test design, validation results, expected result, problems encountered, and risks/follow-up. A bare path such as "written to `.pipeline/...`" is insufficient.

The final response must also explain the substance of the report in the conversation before or alongside artifact paths. Do not only list `.pipeline/...` files, worker closures, YAML validity, and test counts. For every important report or review artifact, summarize what it contains, the main conclusion, the user-facing interpretation, and what the user should understand or do next. For learning gates, quizzes, research reports, requirement briefs, or design reports, teach the key concepts and intended checkpoint outcome directly in chat; paths are supporting references, not the explanation.

## Hook-optional context and persistence

Hooks are optimizations, not the source of correctness. At session start, after compaction, or when Workflow context is uncertain:

- Read `.pipeline/INDEX.md` first, then the focused Cycle's `PLAN.md` / `PROGRESS.md` / `EXECUTION.md` / `DISCUSSION-SUMMARY.md`. `.pipeline/manifest.yaml` and runtime objects are legacy-compatibility surfaces.
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

## Active Rules/Habits

Structured Rules/Habits are authority; Markdown habits and platform instructions are derived views.

- claude-hw-command-namespace (project/error/workflow): Claude Code integration must expose Hypo-Workflow commands through the `hw` plugin namespace as `/hw:*` slash commands while keeping Claude native `/resume` separate from Hypo `/hw:resume`.
- conflict-check (builtin/warn/guard): Detect incompatible local agent plugins or hook systems at session start.
- opencode-bash-auto-policy (project/error/guard): OpenCode execution should use native schema-compatible YOLO permissions: generated `opencode.json` and OpenCode agent frontmatter should use `allow`, not `ask` or unsupported `bypass`.
- plan-tool-required (builtin/warn/workflow): Complex planning and execution work must maintain a visible plan/todo state.
- prefer-chinese-output (project/warn/style): 面向用户的说明、README 更新、PROGRESS 摘要和交互提示优先使用中文。命令名、配置键、文件名和专有英文术语保持英文。
- progress-timezone (builtin/warn/style): Keep PROGRESS timestamps aligned with output.timezone.
- report-language (builtin/warn/style): Keep reports and generated summaries aligned with output.language.
- session-start-context-load (builtin/warn/hook): Surface SessionStart context loading as a reminder, not a correctness gate.

Conflicts are resolved by `cycle > project > global > builtin`; review reports should list overridden sources.
