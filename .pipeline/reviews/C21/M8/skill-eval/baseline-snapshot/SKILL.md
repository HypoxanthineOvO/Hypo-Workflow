---
name: hypo-workflow
version: 13.1.0-beta.2
description: Route project work through the manifest-based Hypo-Workflow protocol. Use for /hw:* commands, repository initialization, Goal or Cycle planning and delivery, focused maintenance recording, acceptance, and restart-safe Resume.
---

# Hypo-Workflow Router

Hypo-Workflow is a Skill protocol; the host Agent performs the work and Core owns durable validation and storage. `.pipeline/` is the project record core.

## Route

Normalize `/hypo-workflow:*` and `$hypo-workflow:*` to `/hw:*`, call `resolveWorkflowIntent(...)` or `resolveCommandRoute(...)`, and load exactly one focused Child Skill only when its ordinary non-symlink `SKILL.md` backend is available.

Intent routing keeps two roots separate: `repoRoot` is the target project workspace, while `skillRoot` is the trusted installed Skill bundle used for backend checks. If `skillRoot` is omitted, use this bundle's own root; never require the target project to contain Hypo-Workflow's Child Skills.

| Route | Child Skill | Purpose |
| --- | --- | --- |
| `/hw:guide` | [skills/guide/SKILL.md](skills/guide/SKILL.md) | choose one next action |
| `/hw:init` | [skills/init/SKILL.md](skills/init/SKILL.md) | initialize or inspect a workspace |
| `/hw:goal` | [skills/goal/SKILL.md](skills/goal/SKILL.md) | one Design and one final acceptance |
| `/hw:plan` | [skills/plan/SKILL.md](skills/plan/SKILL.md) | adaptive planning |
| `/hw:cycle` | [skills/cycle/SKILL.md](skills/cycle/SKILL.md) | ordered Milestones and final acceptance |
| `/hw:maintain` | [skills/maintain/SKILL.md](skills/maintain/SKILL.md) | focused maintenance Record |
| `/hw:resume` | [skills/resume/SKILL.md](skills/resume/SKILL.md) | restore the active Delivery |
| `/hw:accept` | [skills/accept/SKILL.md](skills/accept/SKILL.md) | accept pending Delivery |
| `/hw:reject` | [skills/reject/SKILL.md](skills/reject/SKILL.md) | reject with structured feedback |

Explicit start is an internal intent after approval; it is not advertised as a tenth command. Chat, Explain, Status, Report, Log, Check, Compact, Knowledge, Sync, Debug, and Plan phases are natural/internal behavior. Deferred and removed commands are zero-write diagnostics.

Compatibility diagnostics may cite internal [`/hw:knowledge`](skills/knowledge/SKILL.md) or deferred [`/hw:analysis`](skills/analysis/SKILL.md), but they are not part of public discovery in this release.

## Core Call Contract

Import Core from the installed Skill bundle's `core/src/index.js`; do not look for Core inside the target project. Pass the target project separately as the `root` argument. Delivery calls use `createDeliveryStore({ clock: () => timestamp })`, where the Clock returns a timezone-bearing ISO timestamp. Every mutation receives a unique safe final `{ id }` transaction option; reads and Resume do not.

For approval, start, accept, or reject: build the exact Receipt context from the current Delivery, show the concrete actor/action/object/scope/plan binding through the host user gate, and only after explicit confirmation issue the Receipt with `createReceiptStore({ clock })`. Pass the issued binding and a unique `tool_use_id` to the matching Delivery transition. A bare “可以” without the displayed context is not a Receipt.

## Authority

- A valid `.pipeline/manifest.yaml` selects the current writer; damaged manifests fail closed.
- Runtime owns lifecycle, Continuation owns next action, Records own durable decisions/feedback, Receipts own user authorization, and Recovery Packs own bounded resumable context.
- `runtime/active.yaml` contains references only. A Recovery Pack never overrides newer Runtime state.
- Recovery Packs enrich bounded context but are not required for first-use persistence: when no Pack exists, Resume returns authoritative Runtime/Continuation with degraded recovery context.
- Never fall back to legacy `state.yaml`, `cycle.yaml`, `log.yaml`, `PROGRESS.md`, or `knowledge/` writers in a current workspace.

## Action Boundary

Discussion, background, complaints, questions, and revision feedback are consultation signals. Reply with 我的理解 -> 问题原因 -> 推荐方案 before edits. Feedback creates a revised proposal; only a subsequent explicit start authorizes implementation.

Ask when a decision materially changes scope, safety, architecture, release behavior, remote effects, protected files, or acceptance criteria. Explain the concrete decision before opening a host question gate.

## Execution

- Use the smallest sufficient change and preserve unrelated user work.
- Material work uses separated worker roles selected by policy; explicitly trivial reversible work may use `solo-verified`.
- Destructive, remote, service restart, and system installation actions require their own gates.
- Reports must be explained in the final conversation, not only linked by path.
- Platform Hooks and ambient Maintain automation belong to later adapter work; do not claim they exist.
