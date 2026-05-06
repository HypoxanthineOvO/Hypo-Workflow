# Codex Guide

Hypo-Workflow does not run project work itself; the host agent performs the work using `.pipeline/` files.

## Capability Summary

- Commands: skill.
- Ask gates: chat.
- Plan support: codex-plan-tool.
- Subagents: codex-gpt-runtime.
- Events/hooks: limited.
- Rules/instructions: skill-files.
- Recovery: lease-heartbeat.

## Install / Sync

For a local checkout:

```bash
git clone https://github.com/HypoxanthineOvO/Hypo-Workflow.git ~/.codex/skills/hypo-workflow
```

For development, symlink the checkout instead of copying it:

```bash
mkdir -p ~/.codex/skills
ln -sfn /absolute/path/to/Hypo-Workflow ~/.codex/skills/hypo-workflow
```

Then invoke the Hypo-Workflow skills from Codex. In repositories that already expose `/hw:*`, use the canonical `/hw:init`, `/hw:plan`, and `/hw:start` flow.

## Supported Features

- Reads `.pipeline/` state, config, Cycle, Rules/Habits, prompts, reports, logs, and review artifacts.
- Uses the canonical `/hw:*` workflow vocabulary: init, plan, start/resume, status/report, sync/docs, rules, patch, release.
- Preserves protected authority files unless the lifecycle command explicitly owns the write.
- Uses Codex skills and the Codex plan tool where available.
- Strongly prefers Codex Subagents for substantial implementation or review work while keeping implementation separate from testing/review.
- Does not require external model routing; Codex Subagents stay inside the Codex/GPT runtime.

## Boundaries

- Hypo-Workflow is not a runner; the host agent performs implementation, tests, and review.
- `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` are protected authority files.
- External installs, user-level config writes, destructive commands, and network side effects require explicit confirmation.
