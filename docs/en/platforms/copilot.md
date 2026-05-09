# GitHub Copilot Guide

[中文](../../platforms/copilot.md) | English

Hypo-Workflow does not execute project work directly. The host Agent reads `.pipeline/` files and performs implementation, tests, and review.

## Capability Summary

- Commands: repository-instructions.
- Ask gates: chat.
- Plan support: host-dependent.
- Subagents: host-dependent.
- Events/hooks: host-dependent.
- Rules/instructions: .github/copilot-instructions.md.
- Recovery: pipeline-files.

## Install / Sync

Generate GitHub Copilot repository instructions:

```bash
hypo-workflow sync --platform copilot --project .
```

Target: `.github/copilot-instructions.md`.

## Supported Behavior

- Read `.pipeline/` state, config, Cycle, Rules/Habits, prompts, reports, logs, and review artifacts.
- Use canonical `/hw:*` workflow vocabulary: init, plan, start/resume, status/report, sync/docs, rules, patch, release.
- Support `/hw:explain` as a read-only evidence-first command.
- Protect authority files unless the active lifecycle command owns the write.
- Provide repository-level instructions so the host IDE Agent can follow the Hypo-Workflow contract.
- Carry protected-file, preflight, rules, and implementation/test separation guidance.

## Boundaries

- Hypo-Workflow is not a runner; implementation, tests, and review are performed by the host Agent.
- `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` are protected authority files.
- External installs, user-level config writes, destructive commands, and network side effects require explicit confirmation.
- This adapter is an instruction surface only; it does not claim native hooks, lifecycle enforcement, background execution, or automatic recovery.
