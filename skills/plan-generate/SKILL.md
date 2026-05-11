---
name: plan-generate
description: Generate Hypo-Workflow artifacts from the approved milestone plan when the user wants prompts, config, and architecture outputs.
---

# /hypo-workflow:plan-generate
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for P3 Generate only.

## 前置条件

- milestones have been defined well enough to produce `.pipeline/` artifacts

## 执行流程

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
   - a `Subworker Assignment Plan` that pre-assigns worker-separated roles before implementation begins
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

Generated implementation prompts must include a `Subworker Assignment Plan` whenever worker separation is `recommended` or `strict`, or the planned work is non-trivial enough to require independent validation. Place this section before any implementation steps. The section must be concrete enough that `/hw:start` can execute without inventing role boundaries:

- `test`: owns `write_tests` and `review_tests`; independently validates the real test contract, records command/scenario evidence, checks failure/green evidence where applicable, and rejects pseudo tests
- `implement`: owns scoped implementation edits and produces a concise change summary
- `audit`: inspects the final diff, test evidence, assumptions, risk, and worker identity separation
- main agent: orchestrates, integrates returned artifacts, updates lifecycle/progress/log files, and makes the final decision; it must not write red tests or implementation locally before the `test` and `implement` workers are authorized or assigned
- non-overlap: the same worker identity must not satisfy both `test` and `implement`; `strict` must also keep audit separate
- artifacts: name the expected review/test/audit artifact paths under `.pipeline/reviews/` or the prompt-specific report path

On Codex, missing execution subworker authorization does not remove the assignment. Instead, generate the same `Subworker Assignment Plan` with `status: blocked_until_authorized` and include a start/resume gate requiring `/hw:start` or `/hw:resume` to Ask before role-sensitive work. Only an explicit user-confirmed fastest single-agent downgrade may generate prompts without subworker assignments, and those prompts must state that worker-separation gates are intentionally disabled.

If derived lifecycle artifacts fail to refresh after a successful authority commit, generated prompts should direct the operator to repair the derived artifact or run `/hw:sync --light` rather than treating the authority write as failed.

## 交互行为

- in interactive mode, surface any major append-mode conflict or architecture uncertainty before finalizing
- in auto mode, proceed unless blocked by a structural conflict that would rewrite history

## 参考文件

- `plan/PLAN-SKILL.md` — Generate phase behavior
- `references/commands-spec.md` — command semantics
- `references/config-spec.md` — project/global config split
- `SKILL.md` — full system context
