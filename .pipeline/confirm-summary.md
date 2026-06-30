# C19 Confirm Summary

## Plan

C19 contains 5 Milestones:

| Milestone | Goal | Gate |
|---|---|---|
| C19-M1 | Plan phase model and command contract | source-side |
| C19-M2 | Structured phase artifacts and adaptive gates | source-side |
| C19-M3 | Prompt rule projection and platform adapters | source-side |
| C19-M4 | Plan Skills, docs, and source regression closure | source-side full regression |
| C19-M5 | Target repository adaptation after confirmation | dedicated post-M4 user discussion and confirmation |

## Key Decisions

- Add `/hw:plan:technical-stack`.
- Add `/hw:plan:architecture`.
- Remove user-facing `/hw:plan:confirm`; confirmation becomes in-phase Question Tool / Ask gate.
- Use Mermaid + Markdown table for default plan diagrams.
- Implement phase model in Skills + core helper + artifact schema.
- Project AGENTS.md four-rule discipline into managed instructions and adapters.
- Include Codex-VSP and VSP-Open-Code target adaptation only after post-M4 confirmation.

## Generate Status

Prompt files have been generated in `.pipeline/prompts/`. The plan is ready for final confirmation before `/hw:start`.
