---
description: Hypo-Workflow mapping for /hw:quality
hypo_workflow_managed: true
---

# /hw:quality

Canonical command: `/hw:quality`
Route: `review`
Skill: `skills/quality/SKILL.md`

Load `skills/quality/SKILL.md`, then execute `/hw:quality` semantics with any user-provided arguments. Generate scorecard, baseline, compare, review, or action queue output. Keep this separate from `/hw:audit`: escalate risk governance findings to Audit and use Quality for evidence-backed code quality scoring.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- `.pipeline/quality/`
- recent reports and audit results

Keep this command as a Claude Code plugin slash-command mapping, not a separate runner. Claude Code performs the work; Hypo-Workflow files remain the source of truth.
