---
agent: hw-compact
description: Hypo-Workflow mapping for /hw:knowledge
---

# /hw:knowledge

Canonical command: `/hw:knowledge`
Route: `tool`
Skill: `skills/knowledge/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/knowledge/SKILL.md`, then execute the canonical command semantics with any user-provided arguments.
Knowledge lane: inspect `.pipeline/knowledge/` records, indexes, compact summaries, and secret references. Load compact and index context by default; only open raw records when the user requests `view` or a narrow `search` result.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- `.pipeline/knowledge/knowledge.compact.md`
- `.pipeline/knowledge/index/*.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as an OpenCode-native slash mapping, not a separate runner. The OpenCode Agent performs the work and Hypo-Workflow files remain the source of truth.
