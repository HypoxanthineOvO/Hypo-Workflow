---
name: plan-generate
description: Generate Hypo-Workflow artifacts from the approved milestone plan when the user wants prompts, config, and architecture outputs.
---

# /hypo-workflow:plan-generate
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for P3 Generate only.

## Preconditions

- milestones have been defined well enough to produce `.pipeline/` artifacts

## Execution Flow

1. Read `~/.hypo-workflow/config.yaml` if present.
2. Generate `.pipeline/config.yaml` with project-specific values and only the overrides that should beat global defaults, including `output.*`, `plan.interactive.*`, and `watchdog.*` only when the project needs explicit overrides.
3. Generate `.pipeline/prompts/*.md`.
4. Generate architecture baseline files.
5. Generate or update `.pipeline/cycle.yaml` metadata when a Cycle is being created:
   - `workflow_kind: build | analysis | showcase`
   - `analysis_kind` when workflow is analysis
   - `lifecycle_policy.reject.default_action`, defaulting to `needs_revision`
   - `lifecycle_policy.accept.next`, using `follow_up_plan` when planned follow-up exists
   - `continuations[]` for planned follow-up nodes
6. Before writing each prompt, create a detailed implementation plan containing:
   - ordered steps
   - dependencies
   - verification points
   - test spec
   - constraints
   - closed-loop validation command or scenario
   - observable evidence and independent validation owner when applicable
7. Convert that implementation plan into the final prompt file.
8. Detect append mode and preserve already executed numbering.
9. Use the workflow commit helper for any project-cycle write that touches protected lifecycle state so authority facts commit atomically before derived refreshes.

When a Cycle or Feature has `workflow_kind: analysis`, generated prompts should include the analysis step chain and generated config/cycle metadata should use the `analysis` preset:

- `define_question`
- `gather_context`
- `hypothesize`
- `experiment`
- `interpret`
- `conclude`

Generated analysis prompts should point to `templates/analysis/*`, `references/analysis-spec.md`, and `references/analysis-ledger-spec.md`, and should require an external ledger instead of expanding `state.yaml`.

Generated implementation prompts must not degrade testing into open-loop prose. Carry forward the exact validation command or executable scenario, the observable pass/fail evidence, and the implementation-versus-validation ownership split when the plan called for it.

If derived lifecycle artifacts fail to refresh after a successful authority commit, generated prompts should direct the operator to repair the derived artifact or run `/hw:sync --light` rather than treating the authority write as failed.

## Interactive Behavior

- in interactive mode, surface any major append-mode conflict or architecture uncertainty before finalizing
- in auto mode, proceed unless blocked by a structural conflict that would rewrite history

## Reference Files

- `plan/PLAN-SKILL.md` — Generate phase behavior
- `references/commands-spec.md` — command semantics
- `references/config-spec.md` — project/global config split
- `SKILL.md` — full system context
