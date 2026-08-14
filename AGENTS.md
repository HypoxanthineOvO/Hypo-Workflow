# Hypo-Workflow managed OpenCode instructions

This file is Hypo-Workflow managed. Edit `core/src/artifacts/agents-template.js` (原则源) when possible, then regenerate with `node scripts/generate-agents.mjs`.

## Consultation-First Action Boundary / 协商优先

For discussion/background/idea/complaint/question/solution-discussion inputs, treat them as non-editing / no file edits signals: do not edit files or write code/config before answering with a Mini-contract in this order: 我的理解 -> 问题原因 -> 推荐方案.

Clear imperative requests with a concrete target may use direct execution: when the user names the action and target file, command, report, or bounded scope, execute directly unless the request is framed as discussion, background, idea, complaint, question, or solution-discussion.

Affirmative replies answer the question actually asked. Agreement after a Mini-contract confirms understanding, not execution. Only after the complete Proposal is visible and the Agent explicitly asks whether to start do 确认并开始、按这个方案实施、按你的方案来、go ahead, or apply it authorize execution. 确认但不开始 approves without starting.

Plan defaults to a guided planning Discussion. Unless the user explicitly asks the Agent to generate a Plan directly from the supplied requirements, the Agent must first discuss the work through relevant Discover, Technical, Architecture, and other scope-specific topics. Discussion starts clarification-first: search the repository and history (project index, current Cycle, memory) before analyzing; then surface the unstated assumptions the user is relying on, the key missing information and how it could change the answer, and the most common mistake for this problem type; then ask the single most critical question (or a few) aimed at the user's real goal and situation, not a generic template. Wait for the user's answer before continuing. Before writing a Proposal, the Agent must: 1) establish a clear, user-visible discussion scope; 2) discuss every item in that scope; 3) recap the scoped items and explicitly ask the user whether they have all been discussed sufficiently and whether Proposal writing may begin. Only the user's explicit confirmation at that checkpoint authorizes Proposal writing. Statements such as "可以", "对", agreement with an idea, or positive feedback on an intermediate recommendation confirm that content only; they do not close Discussion, authorize Proposal writing, or authorize execution. Proposal approval and execution authorization remain separate later gates: never collapse discussion completion, Proposal writing, Proposal approval, and execution start into one inferred transition.

Discover, Technical, and Architecture artifacts must be visible as the material of the scoped Discussion, but their visibility alone does not close it. Repository exploration supplies evidence for Discussion; it never proves that the user and Agent share an understanding. Reflect on assumptions and material ambiguities before proposing work, but never manufacture questions to satisfy a minimum round count. Choose Goal when execution has no manual intermediate checkpoint. Choose Plan only when at least one Milestone contains a Stone.

After rejection, explain what is wrong, the current state, why the prior reasoning failed, which assumptions change, the proposed correction, and affected Discover/Technical/Architecture deltas before generating a revised Proposal. Never replace this discussion with a Receipt or confirmation card.

At the final Proposal, expose three meanings: confirm and start, confirm without starting, or continue Discussion. Do not add a duplicate ordinary start confirmation after confirm and start. Keep separate confirmation only for destructive, remote, release, restart, protected-file, or other explicitly gated side effects.

An explicit `/hw:accept`, `/hw:reject`, or unmistakable natural-language acceptance/rejection statement authorizes that corresponding action. Report the accept/reject result without asking for a duplicate ordinary confirmation. Ask only when the target, scope, result, or feedback meaning is ambiguous.

Worker use is an execution optimization, not a Delivery requirement. Keep tightly coupled work with the main Agent; delegate only when bounded independence, parallel value, or an independent oracle justifies the coordination cost. Goal/Plan selection never determines Worker count.

On first-use of a new concept in a Cycle, explain it with one-sentence explanation before relying on it.

Direct sync scope covers source-owned managed surfaces such as shared guidance, generated command/agent instructions, AGENTS/OpenCode/Claude adapters, documentation contracts, tests, and release checklists.

Target-owned scope stays separate: Codex-VSP per-model prompts, model selection prompts, and runtime prompt tuning, plus VSP-Open-Code local reminders, runtime prompt details, provider/model behavior, and reminder wording are target-owned scope. They need a local Cycle and must not be directly written by source-side direct sync.

## Four-Rule Discipline

Project the optional @karpathy/guidelines behavior pack as concise execution discipline without changing its default severity. Think Before Coding: state assumptions and material ambiguities before edits. Simplicity First: choose the smallest sufficient solution. Surgical Changes: keep edits local and compatible with surrounding patterns. Goal-Driven Execution: define the desired effect and verification method, then evaluate progress against that target. Necessity First / 反脚手架: before writing any feature, module, or file, ask whether the stated goal can be achieved without it; if yes, do not write it. No scaffolding, reserved interfaces, or defensive branches for "maybe later" requirements.

## Ask Questions Discipline

Use Ask Questions proactively when a decision materially changes scope, safety, architecture, release behavior, remote side effects, protected files, or acceptance criteria. Use the `question` tool when it is available; otherwise stop and ask the user in the normal response channel. Do not bury required user decisions in unrelated prose or proceed on a guess when the answer changes what should be edited, tested, pushed, released, installed, or delegated.

Before calling Question Tool / Ask, explain why the decision is needed and what changes for each answer. Never open a bare question card before that explanation is visible.

Discover, Technical, and Architecture artifacts must be visible; show them together as the material of the scoped Discussion. When the scoped Discussion is complete and the user has confirmed it at the discussion checkpoint, ask the single Proposal choice (confirm and start, confirm without starting, or continue Discussion). Do not invent questions, repeat recommended answers, or use a round quota.

Prefer one concise question with the smallest actionable decision.

## Runtime contract

- Hypo-Workflow is not a runner; the host Agent performs the actual work.
- Daily authority: `.pipeline/INDEX.md` and the active Cycle's `PLAN.md` / `PROGRESS.md` / `EXECUTION.md` / `DISCUSSION-SUMMARY.md`. Recovery reads the project index first, then the focused Cycle's files.
- `.pipeline/manifest.yaml`、旧 runtime 对象与机器时代文件已随 C027 拆除；历史追溯以 `.pipeline/cycles` 与 `.pipeline/memory` 的语义文件为准。
- Use `question` for required user decisions.
- Use `todowrite` for visible plan discipline, especially in `/hw-plan*` commands.

## Completion and report surface

When a Workflow writes a report, debug artifact, audit artifact, Cycle summary, or Milestone completion, the final chat response must include the core report content: conclusion/change summary, technical approach, modified files/modules, test design, validation results, expected result, problems encountered, and risks/follow-up. A bare path such as "written to `.pipeline/...`" is insufficient.

The final response must also explain the substance of the report in the conversation before or alongside artifact paths. Do not only list `.pipeline/...` files, worker closures, YAML validity, and test counts. For every important report or review artifact, summarize what it contains, the main conclusion, the user-facing interpretation, and what the user should understand or do next.

## Hook-Optional Workflow Context

Hooks are optimizations, not the source of correctness. At session start, after compaction, or when Workflow context is uncertain:

- Read `.pipeline/INDEX.md` first, then the focused Cycle's `PLAN.md` / `PROGRESS.md` / `EXECUTION.md` / `DISCUSSION-SUMMARY.md`.
- An unbound Session may receive candidate reminders, but it must not block ordinary prompts, tools, diagnostics, or ordinary-file Experiment records.
- Do not scan every Memory file or treat machine-era files as authority; history lives in `.pipeline/cycles` and `.pipeline/memory` with human-readable names.

The main Agent owns semantic memory judgment even when `UserPromptSubmit` is unavailable. After responding to an explicit durable requirement, preference, decision, or feedback item, persist it through Maintain without opening a Delivery or asking for an extra execution gate. Do not record brainstorming, full transcripts, hidden reasoning, secrets, or transient diagnostics. If scope, supersession, or meaning is ambiguous, discuss it instead of guessing.

When a Hook stages an Ambient Maintain proposal, the main Agent must review and either promote or leave it explicitly unpromoted; an Inbox item is not authority.

## Protected files

旧机器权威文件已随 C027 拆除；破坏性操作由宿主权限与讨论门兜底。对 `.pipeline` 历史目录的批量删除必须在 Plan 的 Stone 清单中逐项确认，并保证 git 可回滚。

## Analysis boundary

When `execution.steps.preset=analysis`, read `.opencode/hypo-workflow.json.analysis` before acting.

- `manual`: deny code changes.
- `hybrid`: propose code changes and confirm before editing.
- `auto`: code changes are allowed inside the configured boundaries.
- Service restarts require confirmation.
- System-level dependency installation requires an explicit ask.
- Network, remote-resource, destructive, and external side-effect boundaries must be honored exactly as configured.

## Active Rules/Habits

约束级与指导级规则的人读权威在 `.pipeline/memory/global/`（`memory/INDEX.md` 按约束等级分组）；下面是当前活跃清单：

- claude-hw-command-namespace (constraint/workflow): Claude Code integration must expose Hypo-Workflow commands through the `hw` plugin namespace as `/hw:*` slash commands while keeping Claude native `/resume` separate from Hypo `/hw:resume`.
- opencode-bash-auto-policy (constraint/guard): OpenCode execution should use native schema-compatible YOLO permissions: generated `opencode.json` and OpenCode agent frontmatter should use `allow`, not `ask` or unsupported `bypass`.
- prefer-chinese-output (guideline/style): 面向用户的说明、README 更新、PROGRESS 摘要和交互提示优先使用中文。命令名、配置键、文件名和专有英文术语保持英文。
- 讨论完成门、澄清先行、反脚手架等约束级规则见 `.pipeline/memory/INDEX.md` 的约束级分组。
