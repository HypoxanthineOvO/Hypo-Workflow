---
authority_role: record
confidence: confirmed
created_at: 2026-07-23T15:09:27.927Z
dedupe_key: project:vspi:uninitialized-plan-requires-explicit-init
id: decision-d95fcf9dbd4704b7cf3aba5a0735bfb7
kind: decision
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: d95fcf9dbd4704b7cf3aba5a0735bfb77cc1f2f844da877873deb06cb575c78c
source_refs:
  - locator: restored answer for uninitialized Plan behavior
    ref: conversation/vspi-workflow-symbiosis-2026-07-23
    type: user_turn
supersedes: []
updated_at: 2026-07-23T15:09:27.927Z
---
# Uninitialized VSPi Plan behavior

In VSPi 0.2.0, normal chat and model selection remain available when a project has no Hypo-Workflow workspace. The Plan surface requires explicit Workflow initialization: /plan reports that Workflow is not enabled and offers /hw:init.

VSPi must not create a Local Plan fallback or initialize .pipeline implicitly. This preserves one canonical Plan authority and keeps a read or navigation action from writing project state.
