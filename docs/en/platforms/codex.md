# Codex Guide

[中文](../../platforms/codex.md) | English

Hypo-Workflow does not execute project work directly. The host Agent reads `.pipeline/` files and performs implementation, tests, and review.

## Capability Summary

- Commands: skill.
- Ask gates: chat.
- Plan support: codex-plan-tool.
- Subagents: codex-gpt-runtime.
- Events/hooks: limited.
- Rules/instructions: skill-files.
- Recovery: lease-heartbeat.

## Install / Sync

Local checkout install:

```bash
git clone https://github.com/HypoxanthineOvO/Hypo-Workflow.git ~/.codex/skills/hypo-workflow
```

For development, symlink the current checkout instead of copying it:

```bash
mkdir -p ~/.codex/skills
ln -sfn /absolute/path/to/Hypo-Workflow ~/.codex/skills/hypo-workflow
```

## Supported Behavior

- Read `.pipeline/` state, config, Cycle, Rules/Habits, prompts, reports, logs, and review artifacts.
- Use canonical `/hw:*` workflow vocabulary: init, plan, start/resume, status/report, sync/docs, rules, patch, release.
- Support `/hw:explain` as a read-only evidence-first command.
- Protect authority files unless the active lifecycle command owns the write.
- Use Codex skills and the Codex plan tool when available.
- Prefer Codex Subagents for substantial implementation or review work when available.
- Keep implementation separate from testing/review; strict worker separation hides test source, fixtures, snapshots, and assertion details from implementation workers.
- Keep Codex Subagents inside the Codex/GPT runtime and do not require external model routing.

## Boundaries

- Hypo-Workflow is not a runner; implementation, tests, and review are performed by the host Agent.
- `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` are protected authority files.
- External installs, user-level config writes, destructive commands, and network side effects require explicit confirmation.
