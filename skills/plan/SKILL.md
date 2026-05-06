---
name: plan
description: Enter Hypo-Workflow planning mode when the user wants to design milestones before execution starts.
---

# /hypo-workflow:plan
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for the full P1-P4 planning flow.

Without `--batch`, preserve the existing single-feature P1-P4 flow. The ordinary `/hw:plan` command still runs one Discover interview, one Decompose checkpoint, one Generate phase, and one Confirm gate.

Progressive Discover is enabled by default as a structure for P1. Start with the big questions first:

1. task category
2. desired effect
3. verification method

When a project has not yet declared `execution.worker_separation.mode`, Discover should also ask whether the project wants `off`, `recommended`, or `strict` implement/test/audit separation and persist that decision during Generate.

Then continue through assumption statement, ambiguity resolution, tradeoff review, and validation criteria as needed. Keep this structure strong, but do not turn it into a rigid questionnaire.

Test Profiles sit on top of presets. Keep `preset` for step order, but collect category-specific validation policy through `execution.test_profiles` or inferred Discover context.

For testable delivery, planning must design a closed-loop verification path and independent validation ownership before decomposition. Do not accept open-loop plans that only describe code-writing or "run something later" behavior.

Use `/hw:plan --batch` only when the user wants to plan multiple Features in one conversation and create a Feature Queue.

Feature DAG concepts belong only to long-running, batch, multi-Feature, AFK, or HITL coordination. Ordinary single-feature `/hw:plan` must stay simple and should not require or display Feature DAG fields.

Use `/hw:plan --insert <natural language>` to edit an existing Feature Queue. Convert the natural-language request to a structured queue operation first, show the queue diff, then wait for explicit confirmation before writing `.pipeline/feature-queue.yaml`.

## Preconditions

- planning should happen before normal execution begins
- if `.pipeline/` already exists, treat planning as revise-or-append, not necessarily greenfield

## Plan Modes

- `plan.mode=interactive` (default)
  - user participates at each checkpoint
  - P1 Discover asks targeted questions until the user says the requirement interview is sufficient
  - P4 Confirm must wait for explicit user confirmation
  - read `plan.interaction_depth` and convert it to the minimum question rounds:
    - `low` -> 2 rounds
    - `medium` -> 3 rounds
    - `high` -> 5 rounds
  - if `plan.interactive.min_rounds` is present, use it as an additional floor
  - if `plan.interactive.require_explicit_confirm` is missing, treat it as `true`
- `plan.mode=auto`
  - Claude completes P1-P4 without stopping for user answers unless blocked by missing critical information
  - P4 Confirm becomes a summary pass-through, not a hard gate

## Batch Plan Mode

`/hw:plan --batch` changes the planning target from one Feature to a Feature Queue.

Batch behavior:

1. Run Batch Discover once across all requested Features.
2. Ask one unified set of discussion rounds, then summarize all Feature candidates.
3. Generate `.pipeline/feature-queue.yaml` after the user confirms the queue.
4. Read `batch.decompose_mode` from project config > global config > default `upfront`.
5. If `batch.decompose_mode=upfront`, decompose every Feature into initial Milestones immediately.
6. If `batch.decompose_mode=just_in_time`, create queue entries first and defer Milestone decomposition until each Feature becomes current.
7. Generate Feature-level Markdown tables and Mermaid diagrams for queue order, dependencies, and architecture impact.
8. Keep P1 interactive hard gates unless `plan.mode=auto` and config allows unattended planning.
9. When dependencies are present, include Feature DAG fields such as `depends_on`, `blocked_by`, `execution_hint`, `handoff_hint`, and ready/blocked status. Do not create Milestone-level DAG scheduling.

Batch artifacts:

- `.pipeline/feature-queue.yaml`
- `.pipeline/metrics.yaml` shallow initialization when missing
- `.plan-state/batch-discover.yaml`
- `.plan-state/batch-decompose.yaml`
- `.plan-state/batch-architecture.md`

## Queue Insert Mode

`/hw:plan --insert` is a queue editing surface, not a new planning cycle.

Supported natural-language intents:

- append a Feature to the queue
- insert a Feature before or after another queued Feature
- reprioritize or move queued Features
- pause a Feature by setting `gate: confirm`
- update title, summary, or `decompose_mode` for queued Features

Safety rules:

- produce a structured queue operation and a before/after diff first
- do not mutate `.pipeline/feature-queue.yaml` until the user confirms the diff
- do not reorder active, done, blocked, or deferred Features unless the user explicitly asks for repair surgery
- record applied operations in `.pipeline/log.yaml`

## 强制交互规则（Interactive 模式）

Interactive planning is a hard conversational gate, not a suggestion.

❓ 最少提问轮数：
- `interaction_depth: low` -> 至少 2 轮提问
- `interaction_depth: medium` -> 至少 3 轮提问（默认）
- `interaction_depth: high` -> 至少 5 轮提问

❌ 绝对禁止：
1. 用户只说了一句话就直接开始拆 Milestone
2. 自己填补用户没说过的需求细节
3. 在用户没说「够了」「开始吧」「可以了」之前进入 P2
4. 一次性列出 10 个问题然后自己回答
5. 把「确认一下」当作「够了」的信号

✅ 必须做到：
1. 每轮问 2-3 个有针对性的问题，等用户回答
2. 根据用户回答追问细节，不要假设
3. 每轮结束时总结已收集的信息，让用户确认
4. 主动发现用户没想到的维度并提出
5. 像资深 PM 做需求访谈，循序渐进

🚨 P1 -> P2 的唯一过渡条件：
用户明确表示「够了」「开始吧」「可以了」等结束信号。用户只是回答问题、补充信息、或说「确认一下」时，继续 P1 追问，不得进入 P2。

When `--context` is present, injected context can sharpen the first questions but must not skip the required interaction rounds.

## Plan Tool Discipline

The `plan-tool-required` built-in rule is active for Plan Mode unless disabled in `.pipeline/rules.yaml`.

- OpenCode: use native `todowrite` for the visible planning state and native `question` / Ask for every interactive hard gate.
- Codex: use the available plan/update tool when present; otherwise keep a visible checklist in the conversation.
- Claude Code: maintain an explicit plan/checkpoint list in the conversation or configured planning surface.
- Each P1/P2/P3/P4 checkpoint must synchronize plan state before continuing.

## Execution Flow

1. Read `~/.hypo-workflow/config.yaml` if present.
2. Read `plan.mode` and `plan.interaction_depth` from `.pipeline/config.yaml` when present.
3. Parse `--context <sources>` when present. Split comma-separated values and allow only `audit`, `patches`, `deferred`, `debug`, and `explore:E001` style exploration context refs.
4. Parse `--batch` and `--insert` when present. Without `--batch` or `--insert`, preserve the existing single-feature P1-P4 flow.
5. If `--insert` is present, read `.pipeline/feature-queue.yaml`, convert the user request to a structured queue operation, show the queue diff, wait for confirmation, then apply and log the queue edit.
6. If no `--context` flag is given, read `cycle.yaml` and use `cycle.context_sources` when present.
7. Resolve plan mode as project `plan.mode` > global `plan.default_mode` > `interactive`.
8. In interactive mode, resolve minimum rounds from `plan.interaction_depth`, then apply `plan.interactive.min_rounds` as a floor.
9. Run P1 Discover:
   - collect goals, constraints, stack, users, and architecture expectations
   - start by asking task category, desired effect, and verification method
   - turn verification into a closed-loop test story: exact command or scenario, observable pass/fail signal, and independent validator ownership
   - after the big questions, drive assumption statement, ambiguity resolution, tradeoff review, and validation criteria as needed
   - if context sources were resolved, load them first, present the injected findings to the user, then start interactive questioning
   - when `--batch` is present, collect multiple Feature candidates, priorities, gates, dependencies, acceptance boundaries, category, and verification requirements before leaving Discover
10. Run P2 Decompose:
   - split work into reviewable milestones with validation points
   - reject milestone splits that have only open-loop implementation actions and no credible closed-loop validation path
   - in interactive mode, stop after showing the proposed split and wait for user confirmation before P3
   - when `--batch` and `batch.decompose_mode=upfront`, decompose all Features; when `just_in_time`, create Feature scaffolds only
11. Run P3 Generate:
   - generate `.pipeline/` artifacts and architecture baseline
   - preserve closed-loop validation commands, evidence expectations, and validator separation in generated prompts
   - when `--batch`, generate Feature Queue, Markdown table, Mermaid graph, and batch architecture notes
12. Run P4 Confirm:
   - interactive mode waits for user confirmation
   - auto mode summarizes and moves on
13. Set `current.phase` to the matching planning phase during each stage.

## Interactive Checkpoints

- Discover, Decompose, Generate, and Confirm can all surface follow-up questions
- in interactive mode, hook behavior should allow turn end during planning checkpoints
- in interactive mode, P2 may not begin until the user has met the configured minimum rounds and explicitly ended discovery
- in interactive mode, P3 may not begin until the user confirms the P2 milestone split
- in interactive mode, P4 is a hard gate and must wait for explicit confirmation
- in auto mode, planning should continue unattended

## Reference Files

- `plan/PLAN-SKILL.md` — detailed P1-P4 planning system
- `references/commands-spec.md` — command routing semantics
- `references/config-spec.md` — plan-mode fallback rules
- `SKILL.md` — overall pipeline context

## Analysis Planning Notes

When a request is investigative, root-cause-oriented, metric-oriented, or repository/system analysis, classify it with `workflow_kind: analysis` and choose `analysis_kind: root_cause | metric | repo_system`.

Analysis planning should treat one Milestone as one investigation question. The Milestone may contain multiple hypotheses and experiments, and a disproved hypothesis is progress rather than failure.
