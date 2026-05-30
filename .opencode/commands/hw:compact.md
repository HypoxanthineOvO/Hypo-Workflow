---
agent: hw-compact
description: Hypo-Workflow mapping for /hw:compact
---

# /hw:compact

Canonical command: `/hw:compact`
Route: `tool`
Skill: `skills/compact/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/compact/SKILL.md`, then execute the canonical command semantics with any user-provided arguments.
Compact lane: generate compact context files and coordinate with OpenCode `session.compacted` context restore.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as an OpenCode-native slash mapping, not a separate runner. The OpenCode Agent performs the work and Hypo-Workflow files remain the source of truth.
