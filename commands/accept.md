---
description: Hypo-Workflow mapping for /hw:accept
hypo_workflow_managed: true
---

# /hw:accept

Canonical command: `/hw:accept`
Route: `lifecycle`
Skill: `skills/accept/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/accept/SKILL.md`, then execute `/hw:accept` semantics with any user-provided arguments.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as a Claude Code plugin slash-command mapping, not a separate runner. Claude Code performs the work; Hypo-Workflow files remain the source of truth.
