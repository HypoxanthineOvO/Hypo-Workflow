---
agent: hw-plan
description: Hypo-Workflow mapping for /hw:plan:discover
---

# /hw:plan:discover

Canonical command: `/hw:plan:discover`
Route: `plan`
Skill: `skills/plan-discover/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/plan-discover/SKILL.md`, then execute the canonical command semantics with any user-provided arguments.
Plan discipline: use `question` / Ask for every hard interactive gate unless automation is explicitly configured, and keep `todowrite` synchronized for P1/P2/P3/P4 checkpoint state. Progressive Discover starts with task category, desired effect, and verification method, then moves through assumptions, ambiguities, tradeoffs, and validation criteria as needed. Adaptive Grill-Me is only for architecture, source-of-truth, workflow semantic, product concept, or long-running coordination risk; low-risk tasks stay light. For `/hw:guide`, use the intent router contract and recommend one next path before confirmation. For `/hw:plan --deep`, treat it as an alias and route to `/hw:plan:deep` before ordinary decomposition; ordinary `/hw:plan` keeps P1-P4 gates and must not skip them after Deep Plan conversion. For `/hw:plan --batch`, collect multiple Features in one Discover pass, then generate Feature Queue tables and Mermaid diagrams according to `batch.decompose_mode`. For `/hw:plan --insert`, convert the natural-language request into a structured queue operation, summarize the queue diff, and wait for explicit confirmation before writing `.pipeline/feature-queue.yaml`.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as an OpenCode-native slash mapping, not a separate runner. The OpenCode Agent performs the work and Hypo-Workflow files remain the source of truth.
