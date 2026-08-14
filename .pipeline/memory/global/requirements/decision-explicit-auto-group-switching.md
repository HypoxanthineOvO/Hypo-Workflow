---
authority_role: record
confidence: confirmed
created_at: 2026-07-23T15:10:50.676Z
dedupe_key: project:vspi:explicit-auto-group-switching
id: decision-65a61a9a8e0b3a9cd7b0e247f7024e38
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 65a61a9a8e0b3a9cd7b0e247f7024e382a8d6c84cff01e994fcab8a605367d7c
source_refs:
  - locator: confirmed Explicit Auto Group behavior
    ref: conversation/vspi-workflow-symbiosis-2026-07-23
    type: user_turn
supersedes: []
updated_at: 2026-07-23T15:10:50.676Z
---
# Explicit Auto Group model switching

VSPi exposes an explicit Auto Group mode. When Auto is enabled, Hypo-Workflow emits model-neutral routing class and capability requirements at a turn or Worker boundary, and VSPi resolves a concrete model from the configured model group.

A user-pinned concrete model overrides automatic group selection until the user re-enables Auto. VSPi never changes models during an active streaming generation. The selected group, concrete model, reason, fallback, and estimated cost class remain visible and auditable.
