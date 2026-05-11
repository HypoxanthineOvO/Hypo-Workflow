---
name: plan-extend
description: Append new milestones to an active Cycle without closing or reopening the Cycle.
---

# /hypo-workflow:plan:extend
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill when the user invokes `/hw:plan:extend` or `/hypo-workflow:plan:extend`.

This command extends the current active Cycle with additional milestones. It must never renumber existing milestones or rewrite prompts that have already been executed.

## 前置条件

- `.pipeline/cycle.yaml` exists with `cycle.status=active`
- `.pipeline/state.yaml` exists
- `.pipeline/prompts/` exists or can be created

If there is no active Cycle, stop and tell the user to run `/hw:cycle new "名称"` first. If `state.yaml` is missing, stop and ask the user to initialize or plan the Cycle before extending it.

## 执行流程

1. Read `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/state.yaml`.
2. Show the current Cycle metadata:
   - Cycle number and name
   - preset
   - current milestone count
   - completed, in-progress, deferred, and pending milestones
3. List existing milestones from `state.yaml` and prompt filenames.
4. Enter interactive questioning with the M0 rules:
   - at least 1 question round
   - ask 2-3 targeted questions
   - summarize collected intent
   - do not proceed until explicit user confirmation
5. Propose the appended milestone split.
6. Wait for the user to confirm the split.
7. Generate new prompt files under `.pipeline/prompts/`.
8. Append new milestone records to `.pipeline/state.yaml`.
9. Update `.pipeline/PROGRESS.md` if it exists: refresh the top metadata, milestone table, and timeline table instead of appending a loose one-line event.
10. Append a lifecycle event to `.pipeline/log.yaml`.

## 编号规则

- Find the current highest milestone number from:
  - existing `state.yaml` milestones
  - prompt filenames under `.pipeline/prompts/`
- New milestones start at max + 1.
- Do not renumber existing milestones.
- Do not reorder existing milestones.
- Prompt filenames should follow the existing local naming convention, for example `03-new-scope.md` after `02-existing.md`.

## 交互规则

`/hw:plan:extend` uses a lighter version of the M0 interactive gate because the Cycle already exists:

- ask at least 1 round of targeted questions
- use lightweight Progressive Discover: ask task category, desired effect, and verification method first
- do not infer missing scope details silently
- summarize what will be appended
- require explicit confirmation before writing files
- if the user says only "确认一下", treat it as a request to summarize, not permission to write

## Prompt 生成

Each appended prompt must include:

- objective
- implementation scope
- test or validation spec
- `Subworker Assignment Plan` when worker separation is `recommended` or `strict`, or the appended work needs independent validation
- exactly three worker roles in that plan: `test`, `implement`, and `audit`, with scope, expected evidence, non-overlap rules, and lifecycle requirements
- `blocked_until_authorized` plus a start/resume authorization gate when Codex execution subworkers are not authorized
- expected artifacts
- dependencies on previous milestones
- Patch IDs or deferred items it resolves, when relevant

Use the active Cycle preset unless the user explicitly asks for a custom per-milestone flow.

## 状态更新

Append milestone entries without rewriting existing records. If older states lack `status`, preserve their shape and add the minimal fields needed for the new entries.

Example appended entry:

```yaml
- name: "M4: 增量报表"
  status: pending
  deferred_reason: null
  prompt_file: "04-incremental-report.md"
```

Update `pipeline.prompts_total` to include the appended prompts when that field exists.

## 安全边界

- never create a new Cycle from this command
- never archive the current Cycle
- never delete or truncate `.pipeline/prompts/`
- never rewrite completed prompt files unless the user explicitly asks and confirms the exact files

## 参考文件

- `skills/plan/SKILL.md` — M0 interactive rules
- `skills/plan-decompose/SKILL.md` — P2 checkpoint behavior
- `plan/assets/prompt-template.md` — prompt shape
- `references/state-contract.md` — milestone fields
- `SKILL.md` — command routing
