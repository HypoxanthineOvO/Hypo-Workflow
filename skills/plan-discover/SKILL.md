---
name: plan-discover
description: Run the discovery phase of Hypo-Workflow planning when the user needs requirement clarification, constraint gathering, and repo context analysis.
---

# /hypo-workflow:plan-discover
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for P1 Discover only.

For `/hw:plan --batch`, this phase becomes Batch Discover. Batch Discover covers multiple Feature candidates in one interview, but it keeps the same interactive hard gates as ordinary Discover.

## Big Questions First

Before diving into details, start with three broad questions:

1. task category
2. desired effect
3. verification method

Only after these are clear should the Agent go deeper into assumptions, ambiguities, tradeoffs, and validation criteria.

Also classify the workflow lane in structured notes:

- `workflow_kind: build | analysis | showcase`
- if `workflow_kind=analysis`, set `analysis_kind: root_cause | metric | repo_system`

Use `root_cause` for debugging or difference analysis, `metric` for trends or quantitative comparison, and `repo_system` for codebase/system investigation. This taxonomy selects the workflow lane; Test Profiles still select validation policy.

Category-specific follow-up:

- `webapp`: ask for E2E path, browser interaction, and visual evidence
- `agent-service`: ask for CLI shape, shared core, and CLI scenario
- `research`: ask for baseline, expected direction, validation script, and environment constraints

For any testable delivery task, Discover must also pin down the closed-loop test plan:

- what exact command, script, browser path, or scenario will be run
- what output, screenshot, metric delta, or state change will prove pass or fail
- who performs the independent validation when the work is non-trivial or delegated
- what observation would disprove the implementation so the plan is not self-certifying

## Adaptive Grill-Me

After the broad questions are answered, decide whether the task needs deep Grill-Me design-concept alignment. Use light Discover for low-risk patches, small incremental features, and narrow docs/config requests.

Escalate to deep Grill-Me only when one or more risk signals are present:

- architecture or source-of-truth changes
- workflow lifecycle, status, acceptance, sync, recovery, or command semantics
- user-facing product or UX concepts that need naming and non-goal agreement
- long-running, batch, DAG, AFK, or HITL coordination
- unclear ownership between discussion, decision, glossary, architecture, prompt, and Knowledge Ledger layers

Deep Grill-Me should align concepts before P2 decomposition. It should ask focused questions about:

1. stable terms and what they mean
2. examples and non-examples
3. source-of-truth ownership
4. state transitions or lifecycle boundaries
5. prompt-generation hints and non-goals

Do not force deep Grill-Me for every small task.

## Design Concept Artifacts

When Discover confirms durable design concepts, write or update these layers during or after Generate:

- `.pipeline/design-concepts.yaml`: machine-readable concept records with `id`, `term`, `definition`, `boundaries`, `source_of_truth`, `state_transitions`, `decision_refs`, and `prompt_hints`.
- `.pipeline/glossary.md`: human-readable terms, examples, non-examples, and common misunderstandings.

Keep layers separate:

- transient discussion stays in conversation or short planning notes
- confirmed decisions belong in Knowledge Ledger records and decision indexes
- stable terms belong in glossary/design-concepts artifacts
- architecture contracts belong in `.pipeline/architecture.md`
- executable subsets belong in generated prompts

Knowledge Ledger indexes design decisions and references; it must not copy full design-concepts or glossary bodies into every context.

## Preconditions

- planning mode is active or about to start
- user goals are not yet structured into milestones

## Plan Modes

- `interactive`: ask questions in rounds and wait for user answers
- `auto`: infer from repo context and user prompt without pausing unless blocked

## interaction_depth Rules

- `low`
  - at least 2 rounds
  - cover core function, target users, and stack preference
- `medium`
  - at least 3 rounds
  - include priorities, non-functional needs, and integration boundaries
- `high`
  - at least 5 rounds
  - dig into feature detail, UX, edge cases, test strategy, deployment, performance, security, internationalization, and accessibility

If `plan.interactive.min_rounds` is set, use it as an additional floor after resolving `interaction_depth`. Default interactive depth is `medium` and default floor is 3 rounds.

## ⚠️ 强制交互规则（Interactive 模式）

❓ 最少提问轮数：
- interaction_depth: low    → 至少 2 轮提问
- interaction_depth: medium → 至少 3 轮提问（默认）
- interaction_depth: high   → 至少 5 轮提问

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

🚨 进入 P2 的唯一条件：
用户明确表示「够了」「开始吧」「可以了」等结束信号。
如果用户只是回答了你的问题，你应该继续提问，不应该理解为「可以开始了」。

## Interactive Behavior

1. Ask only 2-3 targeted questions per round.
2. Start broad, then drill into detail.
3. Start with task category, desired effect, and verification method before implementation-specific detail.
4. Convert the verification answer into a closed-loop validation path before leaving Discover.
5. Ask who owns implementation and who owns validation when multi-agent or delegated work is expected.
6. Reject open-loop answers such as "we will add tests" unless the user also defines how the test is run and what evidence closes the loop.
7. Summarize what has been learned after each round.
8. Count completed question rounds explicitly in the working notes.
9. Do not enter P2 until both conditions are true:
   - the configured minimum round count has been met
   - the user explicitly says「够了」「开始吧」「可以了」or an equivalent end signal
10. If user input is vague, ask follow-up questions instead of silently filling gaps.
11. If the user says "确认一下" or merely answers the previous questions, summarize and continue asking.

## Context Injection

`/hw:plan --context <sources>` and `cycle.yaml` `context_sources` can preload P1 with existing evidence. Supported sources:

- `audit`: read the newest report under `.pipeline/audits/`
- `patches`: read all open Patch files under `.pipeline/patches/`
- `deferred`: read every `.pipeline/archives/*/deferred.yaml`; also read `.pipeline/archives/cycle-0-legacy/summary.md` when present
- `debug`: read the newest report under `.pipeline/debug/`
- `explore:E001`: read `.pipeline/explorations/E001-*/summary.md`, `notes.md`, and `exploration.yaml`

Context injection behavior:

1. Load the selected sources before the first question round.
2. Present a concise source summary, including counts such as open patches, deferred milestones, or imported Legacy milestones.
3. Ask the first 2-3 targeted questions based on that evidence.
4. Never treat injected context as user confirmation or as permission to skip the minimum rounds.
5. If no selected source exists, say which source was empty and continue normal Discover.

Example opening:

> 基于审计报告 + 3 个 open patch，我看到这些问题：…… 你想全部处理还是只修 Critical？还有其他想加的吗？

## Batch Discover

When `--batch` is present:

1. Collect multiple Feature candidates before moving to Decompose.
2. For each Feature, capture:
   - title
   - workflow_kind: `build`, `analysis`, or `showcase`
   - analysis_kind when applicable: `root_cause`, `metric`, or `repo_system`
   - task category
   - desired effect
   - verification method
   - user-visible goal
   - priority
   - dependencies
   - likely gate: `auto` or `confirm`
   - preferred `decompose_mode`: `upfront` or `just_in_time`
   - acceptance boundary
3. Ask unified follow-up questions so the user does not repeat one full planning loop per Feature.
4. Present a Feature Queue preview table before P2.
5. Do not generate `.pipeline/feature-queue.yaml` until queue confirmation.

Required Batch Discover output:

- `.plan-state/batch-discover.yaml`
- a Markdown Feature candidate table
- unresolved cross-Feature dependency questions

## Reference Files

- `plan/PLAN-SKILL.md` — Discover phase baseline
- `references/commands-spec.md` — command routing
- `SKILL.md` — full system context
