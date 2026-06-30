---
agent: hw-plan
description: Hypo-Workflow mapping for /hw:plan:discover
---

# /hw:plan:discover

Canonical command: `/hw:plan:discover`
Route: `plan`
Skill: `skills/plan-discover/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/plan-discover/SKILL.md`, then execute the canonical command semantics with any user-provided arguments.

## Consultation-First Action Boundary / 协商优先

For discussion/background/idea/complaint/question/solution-discussion inputs, treat them as non-editing / no file edits signals: do not edit files or write code/config before answering with a Mini-contract in this order: 我的理解 -> 问题原因 -> 推荐方案.

Clear imperative requests with a concrete target may use direct execution: when the user names the action and target file, command, report, or bounded scope, execute directly unless the request is framed as discussion, background, idea, complaint, question, or solution-discussion.

Post-plan affirmative replies authorize execution. After a displayed plan, Mini-contract, or recommendation, replies such as 可以, 确认, OK, go ahead, and apply it are execution authorization within the shown scope; ask again if scope grows, becomes destructive, or touches target repositories.

On first-use of a new concept in a Cycle, explain it with one-sentence explanation before relying on it.

Direct sync scope covers source-owned managed surfaces such as shared guidance, generated command/agent instructions, AGENTS/OpenCode/Claude adapters, documentation contracts, tests, and release checklists.

Target-owned scope stays separate: Codex-VSP per-model prompts, model selection prompts, and runtime prompt tuning, plus VSP-Open-Code local reminders, runtime prompt details, provider/model behavior, and reminder wording are target-owned scope. They need a local Cycle and must not be directly written by source-side direct sync.

Plan discipline: use `question` / Ask for every hard interactive gate unless automation is explicitly configured, and keep `todowrite` synchronized for Discover / Technical Stack / Architecture / Decompose / Generate checkpoint state. Progressive Discover starts with task category, desired effect, and verification method, then moves through assumptions, ambiguities, tradeoffs, and validation criteria as needed without discussing implementation stack or architecture prematurely. Technical Stack owns implementation substrate and existing stack choices. Architecture owns current architecture reading, diagrams, and integration points. Decompose owns milestone splitting after those phase artifacts exist. Confirmation is an in-phase Ask gate, not a standalone user command. For `/hw:guide`, use the intent router contract and recommend one next path before confirmation. For `/hw:plan --deep`, treat it as an alias and route to `/hw:plan:deep` before ordinary planning; ordinary `/hw:plan` keeps the named phase gates and must not skip them after Deep Plan conversion. For `/hw:plan --batch`, collect multiple Features in one Discover pass, then generate Feature Queue tables and Mermaid diagrams according to `batch.decompose_mode`. For `/hw:plan --insert`, convert the natural-language request into a structured queue operation, summarize the queue diff, and wait for explicit confirmation before writing `.pipeline/feature-queue.yaml`.

## Four-Rule Discipline

Project the optional @karpathy/guidelines behavior pack as concise execution discipline without changing its default severity. Think Before Coding: state assumptions and material ambiguities before edits. Simplicity First: choose the smallest sufficient solution. Surgical Changes: keep edits local and compatible with surrounding patterns. Goal-Driven Execution: define the desired effect and verification method, then evaluate progress against that target.

## Ask Questions Discipline

Use Ask Questions proactively when a decision materially changes scope, safety, architecture, release behavior, remote side effects, protected files, or acceptance criteria. Use the `question` tool when it is available; otherwise stop and ask the user in the normal response channel. Do not bury required user decisions in unrelated prose or proceed on a guess when the answer changes what should be edited, tested, pushed, released, installed, or delegated.

Before calling Question Tool / Ask for a Plan gate, explain in the conversation why the decision is needed, what will change for each answer, and what evidence or artifact the user is confirming. Never open a bare question card before that explanation is visible.

For major Plan gates, show the actual phase artifacts before Question Tool / Ask confirmation. This includes Discover, Technical Stack, Architecture, Decompose, and Generate outputs such as the stage summary, decision table, open questions, diagrams, milestone table, decision matrix, and dependency map. The Question Tool / Ask card must be the gate after the visible explanation and artifacts, not a replacement for them.

Prefer one concise question with the smallest actionable decision. Continue without asking only when the repo evidence and active configuration make the decision unambiguous.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as an OpenCode-native slash mapping, not a separate runner. The OpenCode Agent performs the work and Hypo-Workflow files remain the source of truth.
