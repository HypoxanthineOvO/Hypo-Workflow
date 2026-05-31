---
description: Hypo-Workflow mapping for /hw:maintain scan
hypo_workflow_managed: true
---

# /hw:maintain scan

Canonical command: `/hw:maintain scan`
Route: `maintenance`
Skill: `skills/maintain/SKILL.md`

Load the corresponding Hypo-Workflow skill instructions from `skills/maintain/SKILL.md`, then execute `/hw:maintain scan` semantics with any user-provided arguments.


## Ask Questions Discipline

Use Ask Questions proactively when a decision materially changes scope, safety, architecture, release behavior, remote side effects, protected files, or acceptance criteria. Use the `question` tool when it is available; otherwise stop and ask the user in the normal response channel. Do not bury required user decisions in unrelated prose or proceed on a guess when the answer changes what should be edited, tested, pushed, released, installed, or delegated.

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
