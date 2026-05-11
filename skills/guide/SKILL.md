---
name: guide
description: Interactive onboarding guide that senses the current project state and recommends a short Hypo-Workflow command path.
---

# /hypo-workflow:guide
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill when the user invokes `/hw:guide` or `/hypo-workflow:guide`.

Guide is an interactive intent router for users who are unsure which Hypo-Workflow command path to run next. It senses project state plus user intent, recommends one next path, asks for confirmation, and then executes only the first recommended command when the user agrees.

Before recommending `/hw:plan` for a new or active Cycle, Guide should surface the `P0 Configure` pre-discover stage when it has not been completed or explicitly reused. `P0 Configure` runs after `cycle new` and before `P1 Discover`; it confirms automation, Subagent authorization, acceptance mode, PR/MR remote write policy, full regression, analysis boundaries, and worker separation. Users may choose to reuse prior configuration, resolved in order: `cycle_explicit`, `previous_cycle_snapshot`, `project_config`, `global_config`, `built_in_default`.

## Step 1: 简短介绍

Print at most 5 lines:

- Hypo-Workflow is a serialized Pipeline execution engine for AI development work.
- It manages planning, execution, Cycle archives, lightweight Patches, audits, release flow, and automation.
- This guide will inspect the current project and suggest the next command path.

Do not list all commands in the introduction.

## Step 2: 感知项目状态

Check the current working directory:

- If `.pipeline/` is missing, say this project is not initialized.
- If `.pipeline/` exists:
  - read `.pipeline/state.yaml` or `.pipeline/state.compact.yaml` for current phase, prompt, step, and status
  - read `.pipeline/cycle.yaml` for active Cycle number/name when present
  - derive the canonical lifecycle phase and next action from Cycle acceptance, continuation, and state facts
  - scan `.pipeline/patches/` and count open Patches only
  - detect `.pipeline/derived-refresh.yaml` warnings
  - detect `.pipeline/.lock` or future lease metadata and whether recovery/repair is needed
  - summarize in one short sentence, for example: `你在 C3/M2 implement 步骤，有 2 个 open patch`

Do not mutate any file during sensing.

## Step 3: 询问用户目标

Ask one open question:

```text
你现在想做什么？
```

Wait for the user's answer.

## Step 4: 意图路由

Use the deterministic guide router shape exposed as `routeGuideIntent` in `core/src/guide/index.js` when available. Match the answer to one supported scenario and recommend exactly one 1-3 command path. If the answer is vague, ask 1-2 follow-up questions such as:

- 项目现在是刚开始、开发中，还是准备发布？
- 你是想修 Bug、规划新功能、查看进度，还是减少上下文占用？

## 场景表

| User intent | Recommended command flow |
| --- | --- |
| Start a new project from zero | `/hw:init` → `/hw:plan` → `/hw:start` |
| Continue an existing managed project | `/hw:resume` when interrupted, or `/hw:cycle new` for a new Cycle |
| Rejected Cycle revision | `/hw:resume` |
| Accepted Cycle with follow-up continuation | `/hw:plan --context follow_up` → `/hw:plan:generate` → `/hw:start` |
| Derived refresh warning or stale lease recovery | `/hw:sync --light` → `/hw:check` |
| Fix a bug | `/hw:patch "描述"` → `/hw:patch fix P<N>` |
| Explore a risky approach | `/hw:explore "主题"` → `/hw:plan --context explore:E001` |
| Plan long-running or multi-Feature work | `/hw:plan --batch` → `/hw:start` |
| Architecture, workflow semantics, or source-of-truth risk | `/hw:plan` with deep Grill-Me Discover → `/hw:start` |
| Review code quality | `/hw:audit` → `/hw:plan --context audit` |
| Check current progress | `/hw:status` or `/hw:dashboard` |
| Documentation intent | `/hw:docs` |
| Configuration intent | `/hw:setup` |
| Bring a legacy Git project under management | `/hw:init --import-history` |
| Reduce token/context usage | `/hw:compact` |
| Release a finished project | `/hw:release` |

`/hw:docs` is the documentation workflow route target. Use it for documentation check, repair, generated references, and README/docs IA work.

For flows that enter planning, recommend `P0 Configure` before the first `P1 Discover` question unless the user explicitly says to reuse the resolved configuration. `P0 Configure` runs after `cycle new` and before `P1 Discover`, asks about automation, Subagent authorization, acceptance mode, PR/MR remote write confirmation, full regression, analysis boundaries, and worker separation, and can reuse values from `cycle_explicit -> previous_cycle_snapshot -> project_config -> global_config -> built_in_default`.

## Step 5: 确认并执行

After recommending a flow, ask:

```text
要我帮你开始吗？
```

If the user explicitly confirms, execute the first command in the recommended flow. Do not execute later commands until the first one completes and the user or command flow permits continuation.

If the user declines, leave the recommended command flow visible and stop.

## 安全规则

- recommend command flows, not a single isolated command, unless the scenario naturally has one command
- do not initialize, plan, resume, compact, audit, release, or patch-fix before user confirmation
- do not write `.pipeline/state.yaml` from Guide itself
- do not use Guide as a runner; it only recommends and starts the first confirmed command
- route deep Grill-Me only for architecture, workflow semantics, product UX, source-of-truth, or long-running coordination risk
- route Feature DAG concepts only for long-running, batch, multi-Feature, AFK, or HITL coordination
- do not force deep Grill-Me for low-risk patches or small incremental tasks
- do not expose Feature DAG concepts for ordinary single-feature planning
- use `output.language` for all guide prose when config is available

## 参考文件

- `skills/init/SKILL.md`
- `skills/plan/SKILL.md`
- `skills/start/SKILL.md`
- `skills/resume/SKILL.md`
- `skills/patch/SKILL.md`
- `skills/compact/SKILL.md`
- `skills/audit/SKILL.md`
- `skills/release/SKILL.md`
- `references/progressive-discover-spec.md`
- `SKILL.md`
