# Cursor Guide

[中文](../../platforms/cursor.md) | English

Hypo-Workflow does not execute project work directly. The host Agent reads `.pipeline/` files and performs implementation, tests, and review.

## Capability Summary

- Commands: repository-instructions+skills.
- Ask gates: chat.
- Plan support: host-dependent.
- Subagents: host-dependent.
- Events/hooks: host-dependent.
- Rules/instructions: .cursor/rules/hypo-workflow.mdc.
- Skills: .cursor/skills/hw-*.md.
- Recovery: pipeline-files.

## Install / Sync

Generate the Cursor rule file, flat Skills, and slash commands:

```bash
hypo-workflow sync --platform cursor --project .
```

Targets: `.cursor/rules/hypo-workflow.mdc`, `.cursor/skills/hw-*.md`, `.cursor/commands/hw-*.md`, and a compact `.cursor/hypo-workflow/` reference bundle.

## Supported Behavior

- Read `.pipeline/` state, config, Cycle, Rules/Habits, prompts, reports, logs, and review artifacts.
- Use canonical `/hw:*` workflow vocabulary: init, plan, start/resume, status/report, sync/docs, rules, patch, release.
- Support `/hw:explain` as a read-only evidence-first command.
- Protect authority files unless the active lifecycle command owns the write.
- Generate the repository-level rule file so Cursor Agent follows the Hypo-Workflow contract.
- Sync one flat Skill file per `/hw-*` entry: `.cursor/skills/hw-*.md`.
- Sync `.cursor/commands/hw-*.md` so Cursor chat can discover `/hw-start`, `/hw-plan`, `/hw-resume`, and the other command entries.
- Embed command authority directly in `.cursor/skills/hw-*.md`; mirror only compact shared references/assets/scripts/adapters under `.cursor/hypo-workflow/`.
- Model selection belongs to the active Cursor UI/session; the adapter does not write or recommend concrete model/provider defaults unless the user explicitly asks to configure an external backend.
- Carry protected-file, preflight, rules, and implementation/test separation guidance.

## Boundaries

- Hypo-Workflow is not a runner; implementation, tests, and review are performed by the host Agent.
- `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` are protected authority files.
- External installs, user-level config writes, destructive commands, and network side effects require explicit confirmation.
- This adapter is an instruction surface only; it does not claim native hooks, lifecycle enforcement, background execution, or automatic recovery.
