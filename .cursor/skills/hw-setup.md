---
name: hw-setup
description: "Hypo-Workflow Cursor skill for /hw-setup; use when the user invokes /hw-setup or canonical /hw:setup."
---

# /hw-setup

Canonical command: `/hw:setup`
Cursor command: `/hw-setup`
Route: `setup`
Embedded authority source: `skills/setup/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:setup` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: setup
description: Configure Cursor-safe Hypo-Workflow defaults without taking over model selection.
---

# /hypo-workflow:setup
## Cursor Setup Boundary

Use this Cursor-specific setup authority when `/hw-setup` or `/hw:setup` runs inside Cursor.

- Cursor chooses the active model in the UI/session.
- Do not ask for, recommend, or write concrete model/provider defaults.
- Do not write model routing fields unless the user explicitly asks to configure an external non-Cursor backend.
- Keep project-local `.pipeline/config.yaml` writes owned by `/hw:init` or `/hw:plan-generate`, not setup.

## Allowed Setup Scope

1. Read `~/.hypo-workflow/config.yaml` when present.
2. Summarize non-model defaults such as execution mode, plan mode, output language, output timezone, watchdog, compact, showcase, and rules.
3. Ask whether the user wants to edit those non-model defaults.
4. If writing global config, preserve any existing model/provider fields exactly as-is unless the user explicitly requested an external backend change.
5. Remind the user that project config can override global defaults.

## Local References

- `.cursor/skills/hypo-workflow.md` for Cursor routing and runtime boundaries.

This generated Skill is self-contained for Cursor setup. If broader source-repository configuration semantics are needed, treat them as external/non-local and use the allowed setup scope above as the fallback.
