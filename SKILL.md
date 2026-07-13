---
name: hypo-workflow
description: Route project work through the manifest-based Hypo-Workflow protocol. Use for /hw:* commands, repository initialization, Goal or Cycle delivery, focused maintenance records, final acceptance, and restart-safe Resume.
---

# Hypo-Workflow Router

Hypo-Workflow is a Skill protocol. The host Agent performs project work; Core validates and persists durable state. A current workspace is identified by `.pipeline/manifest.yaml`, and `.pipeline/` is the project record core.

## Public Routes

Normalize `/hypo-workflow:*` and `$hypo-workflow:*` to `/hw:*`. Resolve the target project as `repoRoot` and this trusted installed bundle as `skillRoot`. Load exactly one ordinary, non-symlink Child Skill backend.

| Route | Child Skill | Purpose |
| --- | --- | --- |
| `/hw:guide` | [skills/guide/SKILL.md](skills/guide/SKILL.md) | recommend one next workflow |
| `/hw:init` | [skills/init/SKILL.md](skills/init/SKILL.md) | initialize or inspect a workspace |
| `/hw:goal` | [skills/goal/SKILL.md](skills/goal/SKILL.md) | deliver one bounded outcome |
| `/hw:plan` | [skills/plan/SKILL.md](skills/plan/SKILL.md) | adapt planning depth to the evidence |
| `/hw:cycle` | [skills/cycle/SKILL.md](skills/cycle/SKILL.md) | deliver ordered dependent Milestones |
| `/hw:maintain` | [skills/maintain/SKILL.md](skills/maintain/SKILL.md) | persist one focused project fact |
| `/hw:resume` | [skills/resume/SKILL.md](skills/resume/SKILL.md) | restore the active Delivery |
| `/hw:accept` | [skills/accept/SKILL.md](skills/accept/SKILL.md) | accept verified pending work |
| `/hw:reject` | [skills/reject/SKILL.md](skills/reject/SKILL.md) | reject with structured feedback |

No other Child Skill is a public Codex route in this release.

## Natural And Internal Behavior

Do not make the user select a command for ordinary conversation:

- Chat and Explain are default conversational behavior. Answer questions with local evidence and keep the active Delivery in view.
- Status, Report, Log, Check, Compact, Knowledge, and Sync are internal observation or consistency behavior over Manifest, Runtime, Continuation, Records, Journal, Capsule, Pack, and Snapshots.
- Debug is internal symptom-driven investigation.
- Start is a contextual transition after approval. It remains non-discoverable and requires a separate scoped Receipt plus an explicit user instruction to begin.
- Deep Plan, Discover, Technical Stack, Architecture, Decompose, Generate, Extend, and Review are internal phases of `/hw:plan`.

Analysis, Audit, Quality, Docs, PR, Release, Explore, and Optimize are deferred. Setup, Rules, Stop, Skip, Reset, Showcase, Patch, Help, Watchdog, and plan-confirm are removed. An explicit invocation of an internal, deferred, removed, or unknown old command returns a read-only diagnostic and the nearest current route; it must not write, generate an adapter, or fall back to a legacy writer.

User constraints are durable requirements, preferences, decisions, or feedback Records. One-time authority is a scoped Receipt. Repository conventions belong in root guidance, and mechanically enforceable boundaries belong in deterministic Hooks or Core gates. There is no generic Rules authority.

## Consultation-First Boundary

Discussion, background, ideas, complaints, questions, and revision feedback are non-editing signals. First answer with 我的理解 -> 问题原因 -> 推荐方案. Feedback revises the proposal; implementation starts only after the user explicitly says to begin.

Before a required decision, explain the concrete context, current evidence, recommendation, what each answer changes, and material risks. A bare “这样可以吗” is not an adequate gate.

## Planning And Execution

Choose the smallest sufficient planning depth. Readiness is evidence-based, never round-count based. Goal needs one Design; Cycle uses only the internal phases justified by uncertainty and dependencies.

Choose worker topology by risk:

- `solo-verified` for an explicitly trivial, reversible change.
- Separate test, implement, and audit identities for material implementation when independent evidence is useful.
- Use other bounded roles such as research/challenge, curator/audit, or design/visual-audit when they better match the work.

Do not force delegation onto tiny fixes, and do not let one material implementation worker certify its own result. Record requested, started, completed or blocked, and closed lifecycle evidence for workers that count toward acceptance.

## Authority And Recovery

- Manifest selects the current writer; a damaged manifest fails closed.
- Runtime owns lifecycle state. Continuation owns the next action. Records own durable facts. Receipts own user authorization.
- Recovery Journal preserves bounded event evidence; Capsule and sealed Recovery Pack provide resumable context. A Pack never overrides newer Runtime.
- `runtime/active.yaml` contains references only. Snapshots preserve accepted or checkpoint projections.
- Never write current facts to legacy `state.yaml`, `cycle.yaml`, `log.yaml`, `PROGRESS.md`, `rules.yaml`, or `knowledge/`.

Import Core from this installed bundle's `core/src/index.js` and pass the target workspace separately as `root`. Use explicit zero-argument Clocks and unique safe transaction IDs for mutations.

## Hooks And Destructive Actions

The current Official Codex adapter handles SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SubagentStart, SubagentStop, and Stop through `hooks/hooks.json`. Hooks support ambient Maintain, bounded recovery context, worker evidence, relevant reminders, and an extra deletion guardrail.

Hooks are concurrent guardrails, not lifecycle or authorization authority. PreToolUse interception is incomplete. Deletion requires an exact hashed Deletion Manifest, a fresh `deletion.execute` Receipt bound to that Manifest and Git state, and the controlled executor. Any drift returns to the user gate.

## Completion

Explain report substance in the final conversation: conclusion, technical approach, modified modules, test design, validation results, expected behavior, encountered problems, and remaining risks. Artifact paths support that explanation; they never replace it.
