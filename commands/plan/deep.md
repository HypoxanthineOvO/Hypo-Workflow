---
description: Hypo-Workflow mapping for /hw:plan:deep
hypo_workflow_managed: true
---

# /hw:plan:deep

Canonical command: `/hw:plan:deep`
Route: `plan`
Skill: `skills/plan-deep/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/plan-deep/SKILL.md`, then execute `/hw:plan:deep` semantics with any user-provided arguments.

This is also the target for the `/hw:plan --deep` alias. It creates or updates a durable discussion package before ordinary `/hw:plan` decomposition. It must not skip the ordinary `/hw:plan` P1-P4 gates after `convert`.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/deep-plans/`
- `.pipeline/rules.yaml`
- current plan-state files

Keep this command as a Claude Code plugin slash-command mapping, not a separate runner. Claude Code performs the work; Hypo-Workflow files remain the source of truth.
