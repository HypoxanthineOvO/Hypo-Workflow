---
description: Hypo-Workflow mapping for /hw:analysis
hypo_workflow_managed: true
---

# /hw:analysis

Canonical command: `/hw:analysis`
Route: `analysis`
Skill: `skills/analysis/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/analysis/SKILL.md`, then execute `/hw:analysis` semantics with any user-provided arguments.

## Consultation-First Action Boundary / 协商优先

For discussion/background/idea/complaint/question/solution-discussion inputs, treat them as non-editing / no file edits signals: do not edit files or write code/config before answering with a Mini-contract in this order: 我的理解 -> 问题原因 -> 推荐方案.

Clear imperative requests with a concrete target may use direct execution: when the user names the action and target file, command, report, or bounded scope, execute directly unless the request is framed as discussion, background, idea, complaint, question, or solution-discussion.

Post-plan affirmative replies authorize execution. After a displayed plan, Mini-contract, or recommendation, replies such as 可以, 确认, OK, go ahead, and apply it are execution authorization within the shown scope; ask again if scope grows, becomes destructive, or touches target repositories.

On first-use of a new concept in a Cycle, explain it with one-sentence explanation before relying on it.

Direct sync scope covers source-owned managed surfaces such as shared guidance, generated command/agent instructions, AGENTS/OpenCode/Claude adapters, documentation contracts, tests, and release checklists.

Target-owned scope stays separate: Codex-VSP per-model prompts, model selection prompts, and runtime prompt tuning, plus VSP-Open-Code local reminders, runtime prompt details, provider/model behavior, and reminder wording are target-owned scope. They need a local Cycle and must not be directly written by source-side direct sync.



## Four-Rule Discipline

Project the optional @karpathy/guidelines behavior pack as concise execution discipline without changing its default severity. Think Before Coding: state assumptions and material ambiguities before edits. Simplicity First: choose the smallest sufficient solution. Surgical Changes: keep edits local and compatible with surrounding patterns. Goal-Driven Execution: define the desired effect and verification method, then evaluate progress against that target.

## Ask Questions Discipline

Use Ask Questions proactively when a decision materially changes scope, safety, architecture, release behavior, remote side effects, protected files, or acceptance criteria. Use the `question` tool when it is available; otherwise stop and ask the user in the normal response channel. Do not bury required user decisions in unrelated prose or proceed on a guess when the answer changes what should be edited, tested, pushed, released, installed, or delegated.

Before calling Question Tool / Ask for a Plan gate, explain in the conversation why the decision is needed, what will change for each answer, and what evidence or artifact the user is confirming. Never open a bare question card before that explanation is visible.

For major Plan gates, show the actual phase artifacts before Question Tool / Ask confirmation. This includes Discover, Technical Stack, Architecture, Decompose, and Generate outputs such as the stage summary, decision table, open questions, diagrams, milestone table, decision matrix, and dependency map. The Question Tool / Ask card must be the gate after the visible explanation and artifacts, not a replacement for them.

Prefer one concise question with the smallest actionable decision. Continue without asking only when the repo evidence and active configuration make the decision unambiguous.

## DeepSeek Tool Calling Rules

When using DeepSeek through Claude Code, follow these rules strictly. They override any conflicting habits from chat training.

### Argument formatting

1. Omit optional fields you do not need. Do not send `null`, `""`, `{}`, or `[]` as a placeholder. If a field is optional and you have no value, leave it out of the JSON entirely.
2. Match the container type exactly.
   - Array fields take JSON arrays: `["a", "b"]`, never `"[\"a\", \"b\"]"` as a string, never `{}` as an object, and never `"foo"` as a bare string.
   - Single-element arrays still need brackets: `["foo"]`, not `"foo"`.
   - Object fields take JSON objects, not arrays or strings.
3. Strings are raw strings. Do not wrap values in extra quotes, code fences, or markdown.
4. Numbers and booleans are unquoted: `30`, not `"30"`; `true`, not `"true"`.

### Paths and identifiers

5. File paths, URLs, IDs, and similar fields go to system functions as raw argument values, not chat output. Never format them as markdown links, never wrap them in backticks, and never add explanatory parentheses.
6. If a tool description says "path", treat it as input to a filesystem call. No formatting and no decoration.

### Related parameters

7. When a tool has paired parameters, such as offset plus limit, start plus end, or from plus to, provide both or neither. Read the description because half the pair often produces an error.

### Recovery

8. If a tool returns a validation error, read the error message carefully and fix only what it complains about. Do not rewrite the whole call. Do not retry the same arguments.
9. If a tool returns a "Note:" with a defaulted value, that is informational, not an error. Continue the task. If the default is wrong, retry with the correct explicit value.

### Tool selection

10. Use the tool whose description matches your intent most specifically. Do not reach for a shell command if a dedicated tool exists. Do not reach for execute-code style tools for work a single dedicated tool call can handle.

Before acting, inspect the relevant context when present:

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/rules.yaml`
- current prompt/report files for pipeline commands
- open patches for Patch commands

Keep this command as a Claude Code plugin slash-command mapping, not a separate runner. Claude Code performs the work; Hypo-Workflow files remain the source of truth.
