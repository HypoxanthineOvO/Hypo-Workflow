---
name: init
description: Initialize or inspect a Hypo-Workflow workspace using the new manifest-based format. Use this Skill for `/hw:init`, `/hypo-workflow:init`, or `$hypo-workflow:init`; when starting a repository from scratch; when adopting an existing codebase; or when checking whether an older `.pipeline/` can be adopted safely. Init asks for the intended project outcome when none is supplied and never silently migrates legacy state.
---

# Init Workspace Adoption

Init creates a recoverable bootstrap context, not a Goal or Cycle. This distinction keeps repository adoption factual while later delivery workflows remain free to discuss and approve their own design.

Import `initializeWorkspace` from the installed Skill bundle's `core/src/index.js`, then pass the target project as the separate `root` argument. Every initializing mutation uses a unique safe final `{ id }` transaction option; never import Core from the target repository.

## 输出语言规则

读取项目 `.pipeline/config.yaml` 与可选的全局 `~/.hypo-workflow/config.yaml`；项目配置优先于全局配置。根据 `output.language` 输出：

- `zh-CN` / `zh`：面向用户的说明、提问、错误与报告使用中文。
- `en`：使用英文。
- `auto` 或缺失：跟随当前对话语言。

内部 schema key 保持英文。

## Input

Use `initializeWorkspace(root, request, options)` with:

```text
request: { intent?, project_id?, workspace_id? }
options: { id?, faultInjector? }
```

The ordinary user form is `/hw:init <intent>`. Treat the text after the command as `intent`; do not reinterpret flags from earlier initialization flows.

## No-input interaction

When no non-empty intent is supplied, return the API's single `init_outcome` question and ask what outcome the project should achieve. This branch is read-only. It does not use fixed question rounds and must not claim initialization succeeded.

After the user answers, show the understood outcome briefly. Their answer authorizes Init itself, not creation or execution of a Goal/Cycle.

## Workspace classes

| Classification | Behavior |
| --- | --- |
| `empty` | Compile the supplied intent and initialize the new format transactionally. |
| `unmanaged_brownfield` | Read a bounded set of safe repository evidence, create a traceable Adoption Brief, then initialize transactionally. |
| `current` | Report `already_initialized`; make no write. |
| `mixed_current_with_legacy_residue` | Report the residue without rewriting either authority model. |
| `legacy` | Run `inspectLegacyWorkspace(...)` read-only and explain that migration is separate. |
| `damaged_current` | Fail closed with repair guidance. Never call a legacy writer. |

## Successful initialization

One recoverable manifest-last transaction creates:

- a valid workspace manifest
- a reference-only active pointer to a `bootstrap_job`
- bootstrap Runtime and Continuation documents
- `project_intent` and `adoption_brief` Markdown Records
- derived machine/human Record indexes
- a derived Context Capsule

The returned `initial_snapshot` is `null`. Init does not fabricate a Goal, Cycle, accepted Snapshot, Receipt, Journal event, or Recovery Pack.

For brownfield adoption, distinguish evidence from inference. Every fact names `basis`, `confidence`, and an existing repository-relative source locator. Inference may be useful, but it is never labeled confirmed. Preserve all source bytes and mtimes.

## Safety

- Reject traversal, symbolic-link evidence, raw secret-like intent/identifiers, and hidden reasoning before persistence.
- Keep errors generic enough that rejected sensitive values are not echoed.
- Do not write legacy config/state/cycle/continuation/log/knowledge authority.
- Initialization has no user-global or platform-projection side effects.
- Preserve repository files outside the staged `.pipeline` targets.

## Report

Explain the classification, resulting project/workspace identity, bootstrap reference, Record facts and confidence, and the next available action in the conversation. For legacy or damaged workspaces, explain why no write occurred and what evidence or repair step is relevant.

Return to [`../../SKILL.md`](../../SKILL.md) for compatibility routing. Use [`../guide/SKILL.md`](../guide/SKILL.md) when the user is unsure what to do next.
