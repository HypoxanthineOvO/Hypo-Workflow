---
name: plan-decompose
description: Split discovered work into milestones when the user wants Hypo-Workflow to produce a serial, reviewable delivery plan.
---

# /hypo-workflow:plan-decompose
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for P2 Decompose only.

For `/hw:plan --batch`, this phase decomposes Feature Queue entries according to `batch.decompose_mode`.

## Preconditions

- P1 Discover has already clarified the project enough to define milestones

## Execution Flow

1. Read the current design summary and repo context.
2. Split work into serial milestones.
3. Each milestone must include:
   - objective
   - implementation scope
   - test spec
   - expected artifacts
4. Every implementation milestone must define a closed-loop validation path:
   - exact validation command or executable scenario
   - observable pass/fail evidence
   - independent validation owner when the work is non-trivial or delegated
5. For implementation work, prefer a runnable vertical slice: one narrow behavior that crosses only the layers needed to run and validate it.
6. Flag horizontal-only or open-loop splits when database/API/UI/schema-only milestones do not produce runnable behavior or credible validation.
7. Prefer narrow milestones when architecture may shift later prompts.
8. Preserve append-mode safety:
   - do not silently renumber executed prompts
   - append new prompts after the highest safe sequence number

## Interactive Behavior

- in interactive mode, show the proposed milestone split and ask follow-up questions if dependencies or scope boundaries are still ambiguous
- after P2 produces the split, stop at a checkpoint before P3
- the checkpoint must show:
  - milestone number and name
  - objective
  - implementation scope
  - test spec
  - expected artifacts
  - runnable vertical slice quality, including touched layers and real validation evidence
  - closed-loop validation path, including pass/fail signal and validation owner
  - unresolved assumptions
- wait for explicit user confirmation before entering P3 Generate
- do not generate `.pipeline/` files, prompt files, or architecture files from P2 directly
- if the user asks for changes, revise the split and present the checkpoint again
- in auto mode, finalize the milestone split directly unless blocked

## P2 Checkpoint Gate

Interactive P2 completion is not permission to write files. The only valid next step is to display the proposed decomposition and ask the user to confirm it. P3 may start only after the user explicitly approves the milestone split.

## Batch Decompose

When `--batch` is present:

1. Read `.plan-state/batch-discover.yaml` or the current Feature candidate table.
2. Resolve `batch.decompose_mode` as project config > global config > default `upfront`.
3. If mode is `upfront`, decompose every Feature into initial Milestones before P3.
4. If mode is `just_in_time`, create Feature-level queue entries and leave Milestone arrays empty with `JIT decomposition pending`.
5. For upfront mode, produce:
   - a Feature Queue Markdown table
   - a Mermaid dependency graph
   - a Feature-level architecture impact section
6. Preserve single-feature `/hw:plan` behavior when `--batch` is absent.

## Reference Files

- `plan/PLAN-SKILL.md` — Decompose phase rules
- `references/commands-spec.md` — command routing
- `SKILL.md` — broader planning context

## Analysis Decomposition Notes

For `workflow_kind: analysis`, decompose by question rather than by implementation slice. Each analysis Milestone should be able to define a question, gather context, hypothesize, experiment, interpret, and conclude with a ledger-backed report.
