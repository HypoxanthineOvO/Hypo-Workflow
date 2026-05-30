---
description: Hypo-Workflow mapping for /hw:optimize
hypo_workflow_managed: true
---

# /hw:optimize

Canonical command: `/hw:optimize`
Route: `optimize`
Skill: `skills/optimize/SKILL.md`

Load `skills/optimize/SKILL.md`, then execute `/hw:optimize` semantics with any user-provided arguments. This command coordinates `Audit + Quality -> Implement/Test -> Audit + Quality` under backup, correctness, budget, validation path, Patch handoff, and Plan handoff gates.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- `.pipeline/quality/`
- `.pipeline/audits/`
- current prompt/report files for pipeline commands

Keep this command as a Claude Code plugin slash-command mapping, not a separate runner. Claude Code performs the work; Hypo-Workflow files remain the source of truth.
