---
agent: hw-build
description: Hypo-Workflow mapping for /hw:release
---

# /hw:release

Canonical command: `/hw:release`
Route: `release`
Skill: `skills/release/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/release/SKILL.md`, then execute the canonical command semantics with any user-provided arguments.
Release lane:
- run `claude plugin validate .`
- run the regression suite
- update versioned files
- run `update_readme` after version updates and before the release commit
- run `readme-freshness` before commit/tag/push gates
- perform a dirty check before release mutations
- require an Ask gate before tag or push
- use `git tag` and `git push` only after confirmation

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as an OpenCode-native slash mapping, not a separate runner. The OpenCode Agent performs the work and Hypo-Workflow files remain the source of truth.
