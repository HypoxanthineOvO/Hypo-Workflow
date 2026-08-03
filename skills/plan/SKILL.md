---
name: plan
description: Discuss requirements, technical stack, and architecture, then deliver a Milestone Plan containing at least one user-reviewed Stone. Use for /hw:plan when execution needs an intermediate manual checkpoint.
---

# Discussion And Plan Delivery

## 输出语言规则

用户可见内容遵循项目 `output.language`；缺失时跟随当前对话语言。Schema key、配置 key、命令和路径保持英文。

`/hw:plan` is the Plan Delivery route. A Plan is selected only when execution contains at least one **Stone**: a Milestone checkpoint where the user must inspect a concrete artifact or make a decision. Complexity, file count, acceptance-criteria count, and internal implementation phases do not by themselves justify Plan.

Deep Plan, Discover, Technical Stack, Architecture, Decompose, Generate, Extend, and Review remain internal phases, not separate public commands or Child Skills.

## Discussion First

Do not choose Goal or Plan merely because repository exploration produced a plausible implementation. Exploration supplies evidence; it does not prove shared understanding. Before proposing work, challenge which statements came from the user, which are repository facts, which are Agent inferences, and which decisions belong to the user.

Discussion must visibly produce these artifacts:

1. **Discover**: a complete requirement synthesis showing what the user asked for, how related statements were combined, desired effect, users, behaviors, scope, non-goals, acceptance criteria, assumptions, and unresolved product decisions. Separate user statements, repository facts, and Agent inference.
2. **Technical**: the existing and proposed stack, dependencies, compatibility, validation tools, and material implementation choices with reasons. Always show it for a new project or new stage. When nothing changes, say so explicitly instead of silently skipping it.
3. **Architecture**: a Mermaid, ASCII, table, or TUI-equivalent diagram. For an existing project, show the overall architecture and mark changed components plus downstream effects. For a new project, show the target components, ownership, boundaries, data/control flow, integration points, and failure boundaries.
4. **Delivery Selection** lists proposed Stones. Call `selectDeliveryMode`: zero Stones routes to Goal; one or more Stones routes to Plan.

These artifacts do not each require confirmation. When the user requests uninterrupted planning, show them together and proceed to one complete Proposal. Ask only questions whose answers could materially change requirements, technology, architecture, acceptance, or a Stone. Never invent questions or repeat recommended answers to satisfy a round quota. If no material question remains, explain why the evidence is sufficient and still show all three artifacts.

## Internal Phase Contract

1. **Deep Plan**: preserve question, evidence, alternatives, decisions, risks, and unresolved items as durable planning Records. It never implements work and never replaces the later visible artifacts or final Proposal review.
2. **Discover**: establish desired effect, non-goals, constraints, acceptance boundary, exact validation path, and material ambiguities. Separate confirmed repository facts from inference.
3. **Technical Stack**: run only when language, framework, dependency, platform, compatibility, or validation tooling choices are material. Resolve unknown external capabilities from primary evidence or keep them blocking.
4. **Architecture**: show components, ownership, data/control flow, integration points, failure boundaries, and downstream impact. Include a compact diagram when relationships would otherwise be ambiguous.
5. **Decompose**: Plan work becomes ordered Milestones. Each Milestone has one outcome, earlier-only dependencies, verification criteria, technical route, risks, and audit focus. Mark at least one Milestone with a Stone containing its review artifact and acceptance criteria.
6. **Generate**: compile with `compilePlan`. The compiler rejects zero-Stone Plans. The content-derived `plan_hash` binds approval, Stone acceptance, final acceptance, and revision Receipts.
7. **Extend**: append dependent Milestones through a superseding Plan. Never renumber or rewrite completed history.
8. **Review**: after execution changes reality, compare actual architecture with the approved Plan and propose downstream revisions before changing them.

Show the relevant artifact in chat before relying on it. A visible artifact is not itself a request for confirmation. Use an Ask gate only for a real unresolved user decision or the final Proposal choice.

## Proposal And Start

After showing the complete Plan, offer exactly one Proposal choice with these meanings:

- **确认并开始**: issue one scoped `delivery.approve_and_start` Receipt and call `approveAndStart`.
- **确认但不开始**: issue `delivery.approve`, persist `waiting_to_start`, and wait for Resume or explicit start.
- **不确认 / 继续讨论**: make no authority write and return to Discussion.

Plain agreement answers the question that was actually asked; it is not universal execution authority. Explicit phrases such as 确认并开始、按这个方案实施、按你的方案来、go ahead, or apply it authorize start when the complete Proposal is visible. Do not add a second ordinary start confirmation after that. Destructive actions, remote writes, releases, service restarts, protected-file writes, or scope growth may still require their own local gate.

After each ordinary Milestone verifies, continue automatically. When a Stone Milestone verifies, persist `pending_stone`, set Delivery to `waiting_for_stone`, and show the real artifact and criteria. Acceptance issues scoped `stone.accept` and continues; rejection issues scoped `stone.reject`, records structured feedback, and returns to `needs_revision`. A rejected Stone never silently continues.

## Worker Topology And Routing

Use `selectExecutionTopology` from coordination value, coupling, and oracle strength:

- `solo-verified` whenever the main Agent can maintain coherence and verify objectively, including material but tightly coupled work.
- `independent-audit` when a genuinely independent oracle adds value.
- `strict` or custom separated roles only when subproblems are bounded, parallelizable, and cheaper to coordinate than to keep together.
- Add bounded research, challenge, curation, design, or visual-audit roles when the domain requires them.

Do not derive Worker count from Plan, Milestone, Stone, file count, or acceptance-criteria count. When separation is selected, show why its independence or parallel value exceeds coordination cost.

Topology chooses identities; Worker Routing chooses only a semantic capability class after identities are fixed. The host Agent generates a visible Task Assessment from repository evidence, including complexity, uncertainty, oracle strength, blast radius, reversibility, risk flags, and a bounded summary. Validate it with `validateTaskAssessment`, then call `selectWorkerRouting`; do not invoke another classifier or persist its prompt.

Routing precedence is `escalation > critical > explore > standard > mechanical`. Security, migration, irreversible work, or two distinct failed execution routes escalate; architecture, weak oracle, independent audit, and recovery conflict are critical; unknown root causes and candidate comparisons explore. Same-route retries, cancellation, startup failures, and network failures do not increase the distinct-route count. Display the assessment, class, reasons, and any fallback before Worker start. Routing metadata never relaxes topology or acceptance.

## Persistence And Reporting

Persist current facts only through Manifest-selected Runtime, Continuation, Records, Receipts, Journal, Capsule, Pack, and Snapshot APIs. Never recreate legacy Plan phase files or legacy state writers.

At each gate and completion, explain the actual artifact content in the conversation. Do not answer only with a `.pipeline/` path.
