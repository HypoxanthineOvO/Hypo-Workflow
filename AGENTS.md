# Hypo-Workflow managed OpenCode instructions

This file is Hypo-Workflow managed. Edit the source Hypo-Workflow rules/config when possible, then regenerate adapters with `hypo-workflow sync --platform opencode`.

## Runtime contract

- Hypo-Workflow is not a runner.
- The OpenCode Agent performs the actual work.
- `.pipeline/` remains the source of truth for state, Cycle, Patch, rules, PROGRESS, logs, prompts, and reports.
- Use `question` for required user decisions.
- Use `todowrite` for visible plan discipline, especially in `/hw-plan*` commands.

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
- opencode-bash-auto-policy (project/error/guard): OpenCode execution auto-approval must be represented through Hypo-Workflow `execution.bash.mode=allow_local`; generated `opencode.json` must stay schema-compatible and must not use `permission: bypass` or `permission.*: bypass`.
- plan-tool-required (builtin/warn/workflow): Complex planning and execution work must maintain a visible plan/todo state.
- prefer-chinese-output (project/warn/style): 面向用户的说明、README 更新、PROGRESS 摘要和交互提示优先使用中文。命令名、配置键、文件名和专有英文术语保持英文。
- progress-timezone (builtin/warn/style): Keep PROGRESS timestamps aligned with output.timezone.
- report-language (builtin/warn/style): Keep reports and generated summaries aligned with output.language.
- session-start-context-load (builtin/error/hook): Preserve SessionStart context loading as a rule-level gate.
