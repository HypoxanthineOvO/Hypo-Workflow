---
name: plan
description: Build an evidence-driven Goal Design or Cycle Plan. Use for /hw:plan and planning requests that need questions, architecture choices, ordered decomposition, or durable Deep Plan research before execution.
---

# Adaptive Plan

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

Plan chooses depth from evidence; it does not enforce `min_rounds`.

- Goal always uses one internal `design` phase.
- A normal Cycle may use `discover -> technical_stack -> architecture -> decompose -> generate` internally.
- Durable research selects internal Deep Plan before the Cycle phases.
- Challenge questions absorb the useful Grill Me behavior and appear only for unresolved material ambiguity.

For an ordinary Cycle, the named flow is `Discover -> Technical Stack -> Architecture -> Decompose -> Generate -> Implementation`. `--deep` routes through internal Deep Plan first and must not skip Discover, Technical Stack, Architecture, Decompose, or Generate. Single-feature /hw:plan behavior is unchanged and stays simple. Without `--batch`, preserve the existing single-feature named phase flow; Feature DAG is optional and ordinary single-feature `/hw:plan` must not require or display it. `/hw:plan --batch` may use a Feature Queue with `batch.decompose_mode`; `/hw:plan --insert` is an internal queue operation.

Progressive Discover asks task category, desired effect, and a real test method. Select a test profile and a closed-loop validation plan where relevant. Before proposal, name `technical_solution`, `technical_route`, `research_required`, `risks_and_alternatives`, `validation_path`, and `audit_focus`; unresolved material research remains a gate.

Material execution selects `off`, `recommended`, or `strict` worker separation. `test`, `implement`, and `audit` use distinct identities when required, with requested -> started -> completed|failed|blocked -> closed|close_failed evidence. Degraded mode requires user confirmation and a non-delegation rationale.

Show the relevant artifact before each required decision gate. Approval creates `waiting_to_start`; it does not execute. Directional feedback produces a revised proposal first. Start only after the user explicitly says to begin.

调用 Question Tool / Ask 之前，先在会话中解释为什么需要这个决定、不同选项会改变什么，并展示待确认的阶段产物。报告不得只说“已写入”或只给 `.pipeline/` 路径，必须在会话中总结结论与验证结果。

Compile approved output with `compileGoalDesign` or `compileCyclePlan`; the content-derived `plan_hash` binds later Receipts.
