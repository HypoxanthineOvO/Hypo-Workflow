---
agent: hw-review
description: Hypo-Workflow mapping for /hw:pr
---

# /hw-pr

Canonical command: `/hw:pr`
Route: `change-request`
Skill: `skills/pr/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/pr/SKILL.md`, then execute the canonical command semantics with any user-provided arguments.
Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as an OpenCode-native slash mapping, not a separate runner. The OpenCode Agent performs the work and Hypo-Workflow files remain the source of truth.
