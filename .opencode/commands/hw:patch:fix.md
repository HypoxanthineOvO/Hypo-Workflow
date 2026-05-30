---
agent: hw-build
description: Hypo-Workflow mapping for /hw:patch fix
---

# /hw:patch:fix

Canonical command: `/hw:patch fix`
Route: `fix`
Skill: `skills/patch/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/patch/SKILL.md`, then execute the canonical command semantics with any user-provided arguments.
Patch Fix lane:
- Step 1: Read Patch
- Step 2: Locate Code
- Step 3: Authorize/resolve worker separation
- Step 4: Start `test` worker first for reproduction, test design, and test/fixture/assertion/snapshot edits when needed
- Step 5: Apply the minimal production/runtime/documentation fix through `implement`; `implement` must not write tests or spawn validation roles
- Step 6: Run tests and obtain independent `test` worker validation plus `audit` closure review
- Step 7: Commit
- Step 8: Close or gate pending acceptance only after worker lifecycle is recorded as requested/started/completed-or-blocked/closed-or-close_failed

OpenCode uses configured native agents/subagents without an extra subworker authorization gate, but code/test Patch fixes still need distinct `implement`, `test`, and `audit` worker identities before auto-close. `review_tests` is a TDD step name, not a Patch worker role.

do not run Plan Discover, do not enter full TDD pipeline, do not mutate `state.yaml` for Patch Fix, and do not leave opened subworkers without wait/close lifecycle evidence.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as an OpenCode-native slash mapping, not a separate runner. The OpenCode Agent performs the work and Hypo-Workflow files remain the source of truth.
