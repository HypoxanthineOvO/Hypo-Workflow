---
authority_role: record
confidence: confirmed
created_at: 2026-07-23T14:58:18.865Z
dedupe_key: project:vspi:model-group-tier-capability-contract
id: decision-632e54cd38ccd9e7f74858578dfc33ee
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 632e54cd38ccd9e7f74858578dfc33ee3b2225ad1db6e3ee8e5014451612f025
source_refs:
  - locator: confirmed scope and model-group decision
    ref: conversation/vspi-workflow-symbiosis-2026-07-23
    type: user_turn
supersedes: []
updated_at: 2026-07-23T14:58:18.865Z
---
# VSPi model-group structure

Model groups use difficulty tiers plus capability filters. Workflow emits model-neutral semantic routing information from task complexity, uncertainty, risk, verification strength, and execution feedback. VSPi maps that result to an ordered model group and resolves an available concrete model.

Vision, tool use, and context-window needs are hard capability filters. Coding, research, review, and other task roles remain Prompt Profile concerns. Provider names, model ids, credentials, and model-specific prompt tuning remain outside Hypo-Workflow Core.
