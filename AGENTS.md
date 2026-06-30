# Hypo-Workflow managed OpenCode instructions

This file is Hypo-Workflow managed. Edit the source Hypo-Workflow rules/config when possible, then regenerate adapters with `hypo-workflow sync --platform opencode`.


## Consultation-First Action Boundary / 协商优先

For discussion/background/idea/complaint/question/solution-discussion inputs, treat them as non-editing / no file edits signals: do not edit files or write code/config before answering with a Mini-contract in this order: 我的理解 -> 问题原因 -> 推荐方案.

Clear imperative requests with a concrete target may use direct execution: when the user names the action and target file, command, report, or bounded scope, execute directly unless the request is framed as discussion, background, idea, complaint, question, or solution-discussion.

Post-plan affirmative replies authorize execution. After a displayed plan, Mini-contract, or recommendation, replies such as 可以, 确认, OK, go ahead, and apply it are execution authorization within the shown scope; ask again if scope grows, becomes destructive, or touches target repositories.

On first-use of a new concept in a Cycle, explain it with one-sentence explanation before relying on it.

Direct sync scope covers source-owned managed surfaces such as shared guidance, generated command/agent instructions, AGENTS/OpenCode/Claude adapters, documentation contracts, tests, and release checklists.

Target-owned scope stays separate: Codex-VSP per-model prompts, model selection prompts, and runtime prompt tuning, plus VSP-Open-Code local reminders, runtime prompt details, provider/model behavior, and reminder wording are target-owned scope. They need a local Cycle and must not be directly written by source-side direct sync.

## Four-Rule Discipline

Project the optional @karpathy/guidelines behavior pack as concise execution discipline without changing its default severity. Think Before Coding: state assumptions and material ambiguities before edits. Simplicity First: choose the smallest sufficient solution. Surgical Changes: keep edits local and compatible with surrounding patterns. Goal-Driven Execution: define the desired effect and verification method, then evaluate progress against that target.

## Ask Questions Discipline

Use Ask Questions proactively when a decision materially changes scope, safety, architecture, release behavior, remote side effects, protected files, or acceptance criteria. Use the `question` tool when it is available; otherwise stop and ask the user in the normal response channel. Do not bury required user decisions in unrelated prose or proceed on a guess when the answer changes what should be edited, tested, pushed, released, installed, or delegated.

Before calling Question Tool / Ask for a Plan gate, explain in the conversation why the decision is needed, what will change for each answer, and what evidence or artifact the user is confirming. Never open a bare question card before that explanation is visible.

For major Plan gates, show the actual phase artifacts before Question Tool / Ask confirmation. This includes Discover, Technical Stack, Architecture, Decompose, and Generate outputs such as the stage summary, decision table, open questions, diagrams, milestone table, decision matrix, and dependency map. The Question Tool / Ask card must be the gate after the visible explanation and artifacts, not a replacement for them.

Prefer one concise question with the smallest actionable decision. Continue without asking only when the repo evidence and active configuration make the decision unambiguous.

## Runtime contract

- Hypo-Workflow is not a runner.
- The OpenCode Agent performs the actual work.
- `.pipeline/` remains the source of truth for state, Cycle, Patch, rules, PROGRESS, logs, prompts, and reports.
- Use `question` for required user decisions.
- Use `todowrite` for visible plan discipline, especially in `/hw-plan*` commands.

## Completion and report surface

When a Workflow writes a report, debug artifact, audit artifact, Patch record, Cycle summary, or Milestone completion, the final chat response must include the core report content: conclusion/change summary, technical approach, modified files/modules, test design, validation results, expected result, problems encountered, and risks/follow-up. A bare path such as "written to `.pipeline/...`" is insufficient.

The final response must also explain the substance of the report in the conversation before or alongside artifact paths. Do not only list `.pipeline/...` files, worker closures, YAML validity, and test counts. For every important report or review artifact, summarize what it contains, the main conclusion, the user-facing interpretation, and what the user should understand or do next. For learning gates, quizzes, research reports, requirement briefs, or design reports, teach the key concepts and intended checkpoint outcome directly in chat; paths are supporting references, not the explanation.

## Workflow state persistence

When executing inside a Hypo-Workflow Cycle, maintain pipeline state throughout the session:

- At session start or after compaction, read `.pipeline/state.yaml` to restore the current milestone/step context.
- After every meaningful code or config change that advances a step, update:
  - `.pipeline/state.yaml` — current step, heartbeat timestamp
  - `.pipeline/log.yaml` — step_complete or milestone_complete event
  - `.pipeline/PROGRESS.md` — timeline entry
- When receiving revision feedback mid-step, update step status to `in_progress` before reworking.
- If blocked, write `.pipeline/continuation.yaml` with `status: active` and `safe_resume_command: /hw:resume`.
- Never silently drop out of Workflow mode — always record state before responding to non-Workflow requests.

If you are unsure whether you are in a Workflow Cycle, run `/hw:status` first.

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
- session-start-context-load (builtin/error/hook): Preserve SessionStart context loading as a rule-level gate.

Conflicts are resolved by `cycle > project > global > builtin`; review reports should list overridden sources.
