---
name: init
description: Initialize or inspect a Hypo-Workflow workspace using the manifest-based format. Use for /hw:init when starting a repository, adopting an existing codebase, or checking whether legacy state can be adopted safely.
---

# Init Workspace Adoption

## 输出语言规则

用户可见内容遵循项目 `output.language`；缺失时跟随当前对话语言。Schema key、配置 key、命令和路径保持英文。

Init creates a recoverable bootstrap context, not a Goal or Cycle. Init has no user-global configuration or setup prerequisite.

Import `initializeWorkspace` from this installed bundle's `core/src/index.js` and pass the target project separately as `root`. Every mutation uses a unique safe final `{ id }` transaction option.

## Input

Use:

```text
initializeWorkspace(root, { intent?, project_id?, workspace_id? }, { id?, faultInjector? })
```

The ordinary form is `/hw:init <intended outcome>`. Treat trailing text as the intended project outcome.

When no non-empty outcome is supplied, return the single `init_outcome` question and ask what the project should achieve. This branch is read-only. After the answer, summarize the understood outcome; that answer authorizes Init only, not a Goal, Cycle, or implementation.

## Workspace Classes

| Classification | Behavior |
| --- | --- |
| `empty` | Initialize the manifest format transactionally from the supplied outcome. |
| `unmanaged_brownfield` | Read bounded safe repository evidence, create an Adoption Brief, then initialize transactionally. |
| `current` | Report `already_initialized` and make no write. |
| `mixed_current_with_legacy_residue` | Report residue without rewriting either model. |
| `legacy` | Run `inspectLegacyWorkspace` read-only; migration is a separate future action. |
| `damaged_current` | Fail closed with concrete repair evidence. Never call a legacy writer. |

## Successful Initialization

A manifest-last transaction creates:

- `.pipeline/manifest.yaml` with runtime, memory, and snapshot zones
- a reference-only `runtime/active.yaml` pointer to a `bootstrap_job`
- bootstrap Runtime and Continuation objects
- `project_intent` and `adoption_brief` Markdown Records
- derived machine and human Record indexes
- a derived Context Capsule

`initial_snapshot` is `null`. Init does not fabricate a Goal, Cycle, Receipt, Journal event, Recovery Pack, accepted Snapshot, platform adapter, generic Rules store, or global configuration.

For brownfield adoption, every fact records basis, confidence, and an existing repository-relative locator. Inference is never labeled confirmed. Preserve source bytes and mtimes.

## Safety And Report

Reject traversal, symlink evidence, secret-like values, raw credentials, and hidden reasoning before persistence. Errors must not echo rejected secrets. Preserve all repository files outside the staged `.pipeline` write set.

Explain the workspace classification, project/workspace identity, bootstrap reference, Adoption Brief facts and confidence, and the next useful public route in chat. For legacy or damaged workspaces, explain why no write occurred and what evidence or repair is needed.
