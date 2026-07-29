# Commands Reference

[中文](../../reference/commands.md) | English

The v14.0.0-alpha.3 Official Codex surface and Host Contract v1 expose exactly ten public routes. The Root Router normalizes namespaces and checks backend availability; each route loads one ordinary, non-symlink Child Skill. The Codex plugin ZIP and portable ZIP contain the same route set.

| Command | Child Skill | Use when |
| --- | --- | --- |
| `/hw:guide` | `skills/guide/SKILL.md` | the user is genuinely unsure what to do; Init does not insert Guide by default |
| `/hw:init` | `skills/init/SKILL.md` | starting a project, adopting an existing codebase, or inspecting old `.pipeline/` data |
| `/hw:goal` | `skills/goal/SKILL.md` | Discussion produces zero manual intermediate Stones |
| `/hw:plan` | `skills/plan/SKILL.md` | Discussion produces at least one manual Stone |
| `/hw:cycle` | `skills/cycle/SKILL.md` | an existing Cycle must remain readable or resumable |
| `/hw:maintain` | `skills/maintain/SKILL.md` | persisting an everyday requirement, preference, decision, or feedback fact |
| `/hw:experiment` | `skills/experiment/SKILL.md` | maintaining experiment environments, baselines, scans, reruns, result review, and instant status |
| `/hw:resume` | `skills/resume/SKILL.md` | continuing an active Delivery after interruption, compaction, or restart |
| `/hw:accept` | `skills/accept/SKILL.md` | a verified Goal, Plan, or compatible Cycle is in `pending_acceptance` |
| `/hw:reject` | `skills/reject/SKILL.md` | acceptance fails and structured feedback must produce a revision |

## Internal Natural Behavior

Chat, Explain, Status, Report, Log, Check, Compact, Knowledge, Sync, and Debug are selected naturally by the Agent. Discussion runs Discover, Technical Stack, and Architecture before Stone count selects Goal or Plan. Plain confirmation uses `delivery.approve_and_start`; only confirm-without-start enters `waiting_to_start`. These behaviors create no additional Codex commands or Skills.

## Deferred And Removed

Analysis, Audit, Quality, Docs, PR, Release, Explore, and Optimize are deferred to later Cycles. Setup, Rules, Stop, Skip, Reset, Showcase, Patch, Help, Watchdog, and plan-confirm are removed.

An explicit invocation of an internal, deferred, removed, or unknown old command returns only its classification, the zero-write reason, and the closest current route. It must not mutate `.pipeline/`, generate platform adapters, or call legacy writers.
