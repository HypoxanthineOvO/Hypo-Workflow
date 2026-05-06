# Trae Guide

Hypo-Workflow does not run project work itself; the host agent performs the work using `.pipeline/` files.

## Capability Summary

- Commands: repository-instructions.
- Ask gates: chat.
- Plan support: host-dependent.
- Subagents: host-dependent.
- Events/hooks: host-dependent.
- Rules/instructions: .trae/rules/project_rules.md.
- Recovery: pipeline-files.

## Install / Sync

Generate the Trae project rule:

```bash
hypo-workflow sync --platform trae --project .
```

Target: `.trae/rules/project_rules.md`.

## Supported Features

- Reads `.pipeline/` state, config, Cycle, Rules/Habits, prompts, reports, logs, and review artifacts.
- Uses the canonical `/hw:*` workflow vocabulary: init, plan, start/resume, status/report, sync/docs, rules, patch, release.
- Preserves protected authority files unless the lifecycle command explicitly owns the write.
- Provides repository-level instructions so the host IDE agent can follow the Hypo-Workflow contract.
- Carries protected-file, preflight, rules, and implementation/test separation guidance.

## Boundaries

- Hypo-Workflow is not a runner; the host agent performs implementation, tests, and review.
- `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` are protected authority files.
- External installs, user-level config writes, destructive commands, and network side effects require explicit confirmation.
- This adapter is an instruction surface only. It does not claim native hooks, lifecycle enforcement, background execution, or automatic recovery.

## Repository Instructions

Adapter target: `.trae/rules/project_rules.md`.

These adapters are repository instruction files. They tell the host IDE Agent to read `HypoxanthineOvO/Hypo-Workflow` and follow README Quick Start guidance; they do not provide native Hook or lifecycle enforcement.

Keep protected files guarded, run preflight checks before completion, and keep implementation separate from testing/review when the host supports delegated work.
