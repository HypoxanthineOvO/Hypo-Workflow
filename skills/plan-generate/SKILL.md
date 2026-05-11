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

P3 must preserve and echo audit contracts gathered in P1. Generated artifacts carry forward the real test method, pseudo-test rejection, rejection scope, blocked approval, and audit evidence so the audit worker can reject missing evidence instead of inferring policy.

Prompt architecture requires one canonical prompt file per milestone. The canonical prompt is always the milestone's primary release artifact. If delegated subworker prompts are actually needed, generate them only as derived artifacts under a fixed derived path; canonical and derived artifacts must not collapse into a single generic worker prompt or be counted as the same milestone surface.

Derived prompt release rules:

- release derived prompts only when the milestone is explicitly delegated for worker-separated execution
- if no delegation exists, or the milestone remains single-agent, do not create derived prompt files
- when derived prompts are released, place them only under `.pipeline/prompts/derived/Mxx/` and keep the path deterministic for that milestone
- name the derived files by role or role-equivalent execution function, not by ad hoc labels
- do not count derived subworker prompts toward milestone count, canonical prompt count, or prompt generation completion

Generated canonical prompts must include a `Subworker Assignment Plan` whenever worker separation is `recommended` or `strict`, or the planned work is non-trivial enough to require independent validation. Place this section before any implementation steps. The section must be concrete enough that `/hw:start` can execute without inventing role boundaries:

- `test`: owns `write_tests` and `review_tests`; independently validates the real test contract, records command/scenario evidence, checks failure/green evidence where applicable, and rejects pseudo tests
- `implement`: owns scoped implementation edits and produces a concise change summary
- `audit`: inspects the final diff, test evidence, assumptions, risk, worker identity separation, and whether the derived prompt release path is explicit and deterministic
- main agent: orchestrates, integrates returned artifacts, updates lifecycle/progress/log files, and makes the final decision; it must not write red tests or implementation locally before the `test` and `implement` workers are authorized or assigned
- non-overlap: the same worker identity must not satisfy both `test` and `implement`; `strict` must also keep audit separate
- artifacts: name the expected review/test/audit artifact paths under `.pipeline/reviews/` or the prompt-specific report path

On Codex, missing execution subworker authorization does not remove the assignment. Instead, generate the same `Subworker Assignment Plan` with `status: blocked_until_authorized` and include a start/resume gate requiring `/hw:start` or `/hw:resume` to Ask before role-sensitive work. Canonical prompts still release, but derived subworker prompt files do not release until authorization exists. Only an explicit user-confirmed fastest single-agent downgrade may generate prompts without subworker assignments, and those prompts must state that worker-separation gates are intentionally disabled.

Default prompt file contract:

- keep one canonical prompt file per milestone under `.pipeline/prompts/`
- if delegated subworker prompts are required, generate them only under a fixed derived path such as `.pipeline/prompts/derived/Mxx/`
- do not count derived subworker prompts toward milestone count or canonical prompt count
- do not require four always-present role files for every milestone

If derived lifecycle artifacts fail to refresh after a successful authority commit, generated prompts should direct the operator to repair the derived artifact or run `/hw:sync --light` rather than treating the authority write as failed.

## Interactive Behavior

- in interactive mode, surface any major append-mode conflict or architecture uncertainty before finalizing
- in auto mode, proceed unless blocked by a structural conflict that would rewrite history

## Reference Files

- `plan/PLAN-SKILL.md` — Generate phase behavior
- `references/commands-spec.md` — command semantics
- `references/config-spec.md` — project/global config split
- `SKILL.md` — full system context
