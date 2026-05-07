---
agent: hw-review
description: Hypo-Workflow mapping for /hw:explain
---

# /hw-explain

Canonical command: `/hw:explain`
Route: `explain`
Skill: `skills/explain/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/explain/SKILL.md`, then execute the canonical command semantics with any user-provided arguments.
Explain lane:
- stay read-only and evidence-first
- cite local files, reports, logs, or diff context before answering
- use `--subagent` for independent evidence collection when available
- if Subagent support is unavailable, record `fallback_reason` and continue in self evidence-first mode
- answer unknowns explicitly instead of inventing unsupported details

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as an OpenCode-native slash mapping, not a separate runner. The OpenCode Agent performs the work and Hypo-Workflow files remain the source of truth.
