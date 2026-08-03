---
description: Hypo-Workflow mapping for /hw:maintain
hypo_workflow_managed: true
---

# /hw:maintain

Canonical command: `/hw:maintain`
Route: `maintenance`
Skill: `skills/maintain/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/maintain/SKILL.md`, then execute `/hw:maintain` semantics with any user-provided arguments.

## Consultation-First Action Boundary / 协商优先

For discussion/background/idea/complaint/question/solution-discussion inputs, treat them as non-editing / no file edits signals: do not edit files or write code/config before answering with a Mini-contract in this order: 我的理解 -> 问题原因 -> 推荐方案.

Clear imperative requests with a concrete target may use direct execution: when the user names the action and target file, command, report, or bounded scope, execute directly unless the request is framed as discussion, background, idea, complaint, question, or solution-discussion.

Affirmative replies answer the question actually asked. Agreement after a Mini-contract confirms understanding, not execution. Only after the complete Proposal is visible and the Agent explicitly asks whether to start do 确认并开始、按这个方案实施、按你的方案来、go ahead, or apply it authorize execution. 确认但不开始 approves without starting.

Before choosing a Delivery, show three planning artifacts. Discover synthesizes the user's requirements and distinguishes user statements, repository facts, and Agent inference. Technical explains the current and proposed stack, dependencies, compatibility, validation tools, and reasons. Architecture uses a Mermaid, ASCII, table, or TUI-equivalent diagram: existing projects mark changed components and downstream effects; new projects show target components, boundaries, ownership, and data/control flow. These artifacts may be shown together and do not require separate confirmations.

Repository exploration supplies evidence for Discussion; it never proves that the user and Agent share an understanding. Reflect on assumptions and material ambiguities before proposing work, but never manufacture questions to satisfy a minimum round count. Choose Goal when execution has no manual intermediate checkpoint. Choose Plan only when at least one Milestone contains a Stone.

After rejection, explain what is wrong, the current state, why the prior reasoning failed, which assumptions change, the proposed correction, and affected Discover/Technical/Architecture deltas before generating a revised Proposal. Never replace this discussion with a Receipt or confirmation card.

At the final Proposal, expose three meanings: confirm and start, confirm without starting, or continue Discussion. Do not add a duplicate ordinary start confirmation after confirm and start. Keep separate confirmation only for destructive, remote, release, restart, protected-file, or other explicitly gated side effects.

An explicit `/hw:accept`, `/hw:reject`, or unmistakable natural-language acceptance/rejection statement authorizes that corresponding action. Validate the Receipt binding internally and report it, but do not ask for a duplicate ordinary confirmation. Ask only when the target, scope, result, or feedback meaning is ambiguous.

Worker use is an execution optimization, not a Delivery requirement. Keep tightly coupled work with the main Agent; delegate only when bounded independence, parallel value, or an independent oracle justifies the coordination cost. Goal/Plan selection never determines Worker count.

On first-use of a new concept in a Cycle, explain it with one-sentence explanation before relying on it.

Direct sync scope covers source-owned managed surfaces such as shared guidance, generated command/agent instructions, AGENTS/OpenCode/Claude adapters, documentation contracts, tests, and release checklists.

Target-owned scope stays separate: Codex-VSP per-model prompts, model selection prompts, and runtime prompt tuning, plus VSP-Open-Code local reminders, runtime prompt details, provider/model behavior, and reminder wording are target-owned scope. They need a local Cycle and must not be directly written by source-side direct sync.
## Hook-Optional Workflow Context

Hooks are optimizations, not the source of correctness. At session start, after compaction, or when Workflow context is uncertain, read the manifest first. Resolve the Session's Work Item through Work Placement when authority routing or resource claims require it; use `.pipeline/runtime/active.yaml` only as a legacy fallback when no Placement registry exists. An unbound Session may receive candidate reminders, but it must not block ordinary prompts, tools, diagnostics, or ordinary-file Experiment records. When a Work Item is selected, read only its Runtime and Continuation, plus the latest valid Recovery Pack when resuming. Do not scan every Record or fall back to legacy `state.yaml`, `cycle.yaml`, `log.yaml`, or `PROGRESS.md` as authority.

The main Agent owns semantic memory judgment even when `UserPromptSubmit` is unavailable. After responding to an explicit durable requirement, preference, decision, or feedback item, persist it through Maintain without opening a Delivery or asking for an extra execution gate. Do not record brainstorming, full transcripts, hidden reasoning, secrets, or transient diagnostics. If scope, supersession, or meaning is ambiguous, discuss it instead of guessing.

When a Hook stages an Ambient Maintain proposal, the main Agent must review and either promote or leave it explicitly unpromoted; an Inbox item is not authority.



## Four-Rule Discipline

Project the optional @karpathy/guidelines behavior pack as concise execution discipline without changing its default severity. Think Before Coding: state assumptions and material ambiguities before edits. Simplicity First: choose the smallest sufficient solution. Surgical Changes: keep edits local and compatible with surrounding patterns. Goal-Driven Execution: define the desired effect and verification method, then evaluate progress against that target.

## Ask Questions Discipline

Use Ask Questions proactively when a decision materially changes scope, safety, architecture, release behavior, remote side effects, protected files, or acceptance criteria. Use the `question` tool when it is available; otherwise stop and ask the user in the normal response channel. Do not bury required user decisions in unrelated prose or proceed on a guess when the answer changes what should be edited, tested, pushed, released, installed, or delegated.

Before calling Question Tool / Ask, explain why the decision is needed and what changes for each answer. Never open a bare question card before that explanation is visible.

Discover, Technical, and Architecture artifacts must be visible, but visibility does not create a confirmation gate. Show them together when uninterrupted planning is requested. Ask only for a real unresolved decision or the final Proposal choice.

Prefer one concise question with the smallest actionable decision. Do not invent questions, repeat recommended answers, or use a round quota.

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

- `.pipeline/manifest.yaml`
- `.pipeline/config.yaml`
- the Session-selected Work Item Runtime and Continuation
- the latest valid Recovery Pack when resuming
- `.pipeline/rules.yaml`
- only the structured Records relevant to the current task

Keep this command as a Claude Code plugin slash-command mapping, not a separate runner. Claude Code performs the work; Hypo-Workflow files remain the source of truth.
