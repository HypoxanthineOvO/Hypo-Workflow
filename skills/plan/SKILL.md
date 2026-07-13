---
name: plan
description: Build an evidence-driven Goal Design or Cycle Plan. Use for /hw:plan and planning requests that need questions, architecture choices, ordered decomposition, or durable research before execution.
---

# Adaptive Plan

## 输出语言规则

用户可见内容遵循项目 `output.language`；缺失时跟随当前对话语言。Schema key、配置 key、命令和路径保持英文。

`/hw:plan` owns all planning depth. Deep Plan, Discover, Technical Stack, Architecture, Decompose, Generate, Extend, and Review are internal phases, not separate commands or Child Skills.

## Select Depth

Call `selectAdaptivePlan` and use evidence, not fixed rounds:

- Goal: one `design` phase. Clarify the outcome, acceptance criteria, constraints, evidence, and real verification method.
- Standard Cycle: use `discover -> technical_stack -> architecture -> decompose -> generate`, but omit a phase when its decision is already established and the visible artifact can prove that.
- Deep Cycle: prepend durable `deep_plan` research when requirements, product shape, architecture, or long-term sequencing are not ready for decomposition.
- Challenge questions absorb the useful Grill Me behavior. Ask them only for unresolved material ambiguity, weak source-of-truth ownership, lifecycle risk, or assumptions that could invalidate the plan.

`assessPlanReadiness` rejects `min_rounds`. Continue asking only while a material ambiguity remains.

## Internal Phase Contract

1. **Deep Plan**: preserve question, evidence, alternatives, decisions, risks, and unresolved items as durable planning Records. It never implements work and never bypasses later readiness checks.
2. **Discover**: establish desired effect, non-goals, constraints, acceptance boundary, exact validation path, and material ambiguities. Separate confirmed repository facts from inference.
3. **Technical Stack**: run only when language, framework, dependency, platform, compatibility, or validation tooling choices are material. Resolve unknown external capabilities from primary evidence or keep them blocking.
4. **Architecture**: show components, ownership, data/control flow, integration points, failure boundaries, and downstream impact. Include a compact diagram when relationships would otherwise be ambiguous.
5. **Decompose**: only Cycle work becomes ordered Milestones. Each Milestone has one outcome, earlier-only dependencies, verification criteria, technical route, risks, and audit focus. Prefer independently runnable vertical slices.
6. **Generate**: compile the approved result with `compileGoalDesign` or `compileCyclePlan`. The content-derived `plan_hash` binds approval, start, acceptance, and revision Receipts.
7. **Extend**: append dependent Milestones through a superseding Cycle Plan. Never renumber or rewrite completed history.
8. **Review**: after execution changes reality, compare actual architecture with the approved Plan and propose downstream revisions before changing them.

Show the relevant phase artifact in chat before every material decision gate: facts and ambiguities, choice table, architecture map, Milestone table, or generated Design/Plan summary. The Ask card is only the gate after this explanation.

## Proposal And Start Boundary

Planning approval persists a proposal and moves the Delivery only to `waiting_to_start`. It does not authorize implementation. Directional feedback produces a revised proposal first. Begin only after the user explicitly instructs execution and a separate `delivery.start` Receipt is issued against the current state and `plan_hash`.

A Goal has one final manual acceptance. A Cycle has ordered Milestones with verification but no per-Milestone acceptance gates; only the aggregate Cycle enters final manual acceptance.

## Worker Topology

Use `selectExecutionTopology` from actual complexity and risk:

- `solo-verified` for a trivial reversible change with an objective check.
- `separated` when material implementation benefits from independent test and audit identities.
- Add bounded research, challenge, curation, design, or visual-audit roles when the domain requires them.

When separation is required, show the role boundaries and expected evidence before start. If the host cannot provide required independence, stop for an explicit degraded-mode decision rather than silently self-certifying.

## Persistence And Reporting

Persist current facts only through Manifest-selected Runtime, Continuation, Records, Receipts, Journal, Capsule, Pack, and Snapshot APIs. Never recreate legacy Plan phase files or legacy state writers.

At each gate and completion, explain the actual artifact content in the conversation. Do not answer only with a `.pipeline/` path.
