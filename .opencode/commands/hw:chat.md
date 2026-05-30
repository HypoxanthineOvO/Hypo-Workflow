---
agent: hw-build
description: Hypo-Workflow mapping for /hw:chat
---

# /hw:chat

Canonical command: `/hw:chat`
Route: `lifecycle`
Skill: `skills/chat/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/chat/SKILL.md`, then execute the canonical command semantics with any user-provided arguments.
Chat lane:
- reload `state.yaml + cycle.yaml + PROGRESS.md + recent report`
- write chat entries instead of Milestone reports
- keep small edits lightweight
- suggest `/hw:patch` when scope grows beyond append conversation

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as an OpenCode-native slash mapping, not a separate runner. The OpenCode Agent performs the work and Hypo-Workflow files remain the source of truth.
