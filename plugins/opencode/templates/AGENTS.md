# Hypo-Workflow managed OpenCode instructions

This file is Hypo-Workflow managed. Edit the source Hypo-Workflow rules/config when possible, then regenerate adapters with `hypo-workflow sync --platform opencode`.

## Runtime contract

- Hypo-Workflow is not a runner.
- The OpenCode Agent performs the actual work.
- `.pipeline/` remains the source of truth for state, Cycle, Patch, rules, PROGRESS, logs, prompts, and reports.
- Use `question` for required user decisions.
- Use `todowrite` for visible plan discipline, especially in `/hw-plan*` commands.

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
