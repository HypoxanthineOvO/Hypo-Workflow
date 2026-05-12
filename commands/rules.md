---
description: Hypo-Workflow mapping for /hw:rules
hypo_workflow_managed: true
---

# /hw:rules

Canonical command: `/hw:rules`
Route: `rules`
Skill: `skills/rules/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/rules/SKILL.md`, then execute `/hw:rules` semantics with any user-provided arguments.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as a Claude Code plugin slash-command mapping, not a separate runner. Claude Code performs the work; Hypo-Workflow files remain the source of truth.
