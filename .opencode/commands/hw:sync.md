---
agent: hw-build
description: Hypo-Workflow mapping for /hw:sync
---

# /hw:sync

Canonical command: `/hw:sync`
Route: `tool`
Skill: `skills/sync/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/sync/SKILL.md`, then execute the canonical command semantics with any user-provided arguments.
Sync lane: support `--light`, standard, and `--deep`; never execute pipeline milestones. SessionStart may only perform light external-change detection and prompt before heavier sync.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as an OpenCode-native slash mapping, not a separate runner. The OpenCode Agent performs the work and Hypo-Workflow files remain the source of truth.
