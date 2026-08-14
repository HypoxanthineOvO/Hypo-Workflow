---
authority_role: record
confidence: high
created_at: 2026-07-11T20:24:08+08:00
dedupe_key: project:commands:c21-nine-command-public-surface
id: decision-c14e95505c675841696d374f7dfb12f4
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: c14e95505c675841696d374f7dfb12f4188827f72b1402e62b942bc4b780bf75
source_refs:
  - locator: .pipeline/architecture.md
    ref: .pipeline/architecture.md#Command Exposure
    type: legacy_file
  - locator: .pipeline/archives/C10-experience-optimizations/cycle.yaml
    ref: .pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.lessons[0:2]
    type: legacy_file
  - locator: .pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md
    ref: .pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Requirements; Audit Focus
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T08:15:40+08:00
---
The authoritative C21 public/contextual discovery surface contains exactly /hw:guide, /hw:init, /hw:goal, /hw:plan, /hw:cycle, /hw:maintain, /hw:resume, /hw:accept, and /hw:reject. User-visible commands must be registered in the authoritative registry; generated documentation, adapters, and command-inventory tests are projections of that registry. Chat, Explain, Status, Report, Log, Check, Compact, Knowledge, consistency Sync, Debug, explicit start, and Plan phases are natural/internal behavior. Setup, Rules, Stop command, Skip, Reset, Showcase, Patch, Help, Watchdog, and plan-confirm remain M8 removal candidates. Deferred or removal-candidate capabilities must not be advertised as executable backends.
