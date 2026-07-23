---
name: hypo-workflow
description: Route project work through the manifest-based Hypo-Workflow protocol. Use for /hw:* commands, repository initialization, Discussion-first Goal or Plan delivery, structured experiments, focused maintenance records, final acceptance, and restart-safe Resume.
---

# Hypo-Workflow Router

Hypo-Workflow is a Skill protocol. The host Agent performs project work; Core validates and persists durable state. A current workspace is identified by `.pipeline/manifest.yaml`, and `.pipeline/` is the project record core.

## Public Routes

Normalize `/hypo-workflow:*` and `$hypo-workflow:*` to `/hw:*`. Resolve the target project as `repoRoot` and this trusted installed bundle as `skillRoot`. Load exactly one ordinary, non-symlink Child Skill backend.

| Route | Child Skill | Purpose |
| --- | --- | --- |
| `/hw:guide` | [skills/guide/SKILL.md](skills/guide/SKILL.md) | recommend one next workflow |
| `/hw:init` | [skills/init/SKILL.md](skills/init/SKILL.md) | initialize or inspect a workspace |
| `/hw:goal` | [skills/goal/SKILL.md](skills/goal/SKILL.md) | discuss and autonomously deliver an outcome with zero Stones |
| `/hw:plan` | [skills/plan/SKILL.md](skills/plan/SKILL.md) | discuss and deliver Milestones containing at least one manual Stone |
| `/hw:cycle` | [skills/cycle/SKILL.md](skills/cycle/SKILL.md) | compatibility route for existing Cycle deliveries |
| `/hw:maintain` | [skills/maintain/SKILL.md](skills/maintain/SKILL.md) | persist one focused project fact |
| `/hw:experiment` | [skills/experiment/SKILL.md](skills/experiment/SKILL.md) | manage non-linear experiments and instant status |
| `/hw:resume` | [skills/resume/SKILL.md](skills/resume/SKILL.md) | restore the active Delivery |
| `/hw:accept` | [skills/accept/SKILL.md](skills/accept/SKILL.md) | accept verified pending work |
| `/hw:reject` | [skills/reject/SKILL.md](skills/reject/SKILL.md) | reject with structured feedback |

No other Child Skill is a public Codex route in this release.

## Natural And Internal Behavior

Do not make the user select a command for ordinary conversation:

- Chat and Explain are default conversational behavior. Answer questions with local evidence and keep the active Delivery in view.
- Status, Report, Log, Check, Compact, Knowledge, and Sync are internal observation or consistency behavior over Manifest, Runtime, Continuation, Records, Journal, Capsule, Pack, and Snapshots.
- Debug is internal symptom-driven investigation.
- Discussion is the default design path: requirements discovery, then material technical-stack decisions, then architecture changes, before choosing Goal or Plan.
- Delivery selection is determined only by manual intermediate checkpoints: zero Stones means Goal; one or more Stones means Plan. Complexity and acceptance-criteria count do not decide it.
- Ordinary confirmation means approve and start in one scoped Receipt. Confirm-without-start remains available explicitly; high-impact side effects retain local gates.
- Deep Plan, Discover, Technical Stack, Architecture, Decompose, Generate, Extend, and Review are internal phases.
- Experiment status reads one bounded materialized projection. Git event unions rebuild that projection explicitly; ordinary status questions never rescan result trees.

Analysis, Audit, Quality, Docs, PR, Release, Explore, and Optimize are deferred. Setup, Rules, Stop, Skip, Reset, Showcase, Patch, Help, Watchdog, and plan-confirm are removed. An explicit invocation of an internal, deferred, removed, or unknown old command returns a read-only diagnostic and the nearest current route; it must not write, generate an adapter, or fall back to a legacy writer.

User constraints are durable requirements, preferences, decisions, or feedback Records. One-time authority is a scoped Receipt. Repository conventions belong in root guidance, and mechanically enforceable boundaries belong in deterministic Hooks or Core gates. There is no generic Rules authority.

## Consultation-First Boundary

Discussion, background, ideas, complaints, questions, and revision feedback are non-editing signals. First answer with 我的理解 -> 问题原因 -> 推荐方案. Feedback revises the proposal; implementation starts only after explicit authorization, including an affirmative reply to the displayed contract.

Before a required decision, explain the concrete context, current evidence, recommendation, what each answer changes, and material risks. A bare “这样可以吗” is not an adequate gate.

## Planning And Execution

Choose the smallest sufficient planning depth. Readiness is evidence-based, never round-count based. Discussion must resolve product, stack, and architecture decisions before generating either a Goal Design or a Plan.

Choose worker topology by risk:

- `solo-verified` whenever tightly coupled work is clearer and objectively verifiable in the main Agent, even when material.
- Use independent audit or separated roles only when an independent oracle, bounded parallelism, or risk justifies their coordination cost.
- Use other bounded roles such as research/challenge, curator/audit, or design/visual-audit when they better match the work.

Do not infer Worker count from Goal, Plan, Milestone, Stone, file count, or acceptance count. Record requested, started, completed or blocked, and closed lifecycle evidence only for Workers actually selected for acceptance.

Worker Routing is a separate semantic handoff after topology is fixed. Before starting a Worker, the host Agent produces and shows a bounded Task Assessment covering complexity, uncertainty, oracle strength, blast radius, reversibility, risk flags, and a concise summary; Core validates it and deterministically emits only `mechanical`, `standard`, `explore`, `critical`, or `escalation` plus reason codes and failure state. `off` emits no hint, `advisory` records an explicit fallback when unsupported, and `required` blocks that Worker start when the semantic handoff is unsupported. Routing never changes role identity, evidence, acceptance, or user authority.

Persist the decision in current Runtime/Continuation and Worker Journal events. Resume reuses that persisted decision instead of reclassifying. A Worker that needs a different semantic handoff uses no-history or bounded-history context; a full-history fork inherits its parent execution context and must not be silently switched.

## Authority And Recovery

- Manifest selects the current writer; a damaged manifest fails closed.
- Runtime owns lifecycle state. Continuation owns the next action. Records and immutable Experiment events own durable facts. Receipts own user authorization.
- Recovery Journal preserves bounded event evidence; Capsule and sealed Recovery Pack provide resumable context. A Pack never overrides newer Runtime.
- `runtime/active.yaml` contains references only. Snapshots preserve accepted or checkpoint projections.
- Never write current facts to legacy `state.yaml`, `cycle.yaml`, `log.yaml`, `PROGRESS.md`, `rules.yaml`, or `knowledge/`.

Import Core from this installed bundle's `core/src/index.js` and pass the target workspace separately as `root`. Use explicit zero-argument Clocks and unique safe transaction IDs for mutations.

## Hooks And Destructive Actions

The current Official Codex adapter handles SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SubagentStart, SubagentStop, and Stop through `hooks/hooks.json`. Hooks support ambient Maintain, bounded recovery context, worker evidence, relevant reminders, and an extra deletion guardrail.

Hooks are concurrent guardrails, not lifecycle or authorization authority. PreToolUse interception is incomplete. Deletion requires an exact hashed Deletion Manifest, a fresh `deletion.execute` Receipt bound to that Manifest and Git state, and the controlled executor. Any drift returns to the user gate.

## Completion

Explain report substance in the final conversation: conclusion, technical approach, modified modules, test design, validation results, expected behavior, encountered problems, and remaining risks. Artifact paths support that explanation; they never replace it.
