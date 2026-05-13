---
description: Hypo-Workflow mapping for /hw:plan
hypo_workflow_managed: true
---

# /hw:plan

Canonical command: `/hw:plan`
Route: `plan`
Skill: `skills/plan/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/plan/SKILL.md`, then execute `/hw:plan` semantics with any user-provided arguments.

If the user provides `--deep`, route to `/hw:plan:deep` as an alias before ordinary decomposition. Ordinary `/hw:plan` keeps the full P1-P4 gates and must not skip P1-P4 because of Deep Plan context or conversion output.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as a Claude Code plugin slash-command mapping, not a separate runner. Claude Code performs the work; Hypo-Workflow files remain the source of truth.
