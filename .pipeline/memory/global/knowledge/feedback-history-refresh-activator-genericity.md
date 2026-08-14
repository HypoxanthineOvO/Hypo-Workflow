---
authority_role: record
confidence: confirmed
created_at: 2026-08-09T03:38:55.110Z
dedupe_key: project:hypo-workflow:feedback:history-refresh-activator-genericity
id: feedback-25f492856ad48c40ed080e244863aef3
kind: feedback
level: reference
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 25f492856ad48c40ed080e244863aef3d3a429e935df2480bc4165c9249f3818
source_refs:
  - locator: user-reported installed v15.0.0-alpha.1 activation blocker
    ref: conversation/history-refresh-activator-genericity-bug-2026-08-09
    type: user_turn
  - locator: >-
      DEFAULT_OUTPUT; activateHistoryRefresh; renderActivatedProjectIndex; renderActivatedCycleIndex;
      renderActivationMarker
    ref: core/src/history-refresh/index.js
    type: source_file
supersedes: []
updated_at: 2026-08-09T03:38:55.110Z
---
# History Refresh activator is repository-specific instead of generic

The History Refresh activator shipped in v15.0.0-alpha.1 contains reference-repository constants in its production path. The installed package matches the local Hypo-Workflow source, so this is not installation drift and there is no currently available fixed activator.

Confirmed defects in core/src/history-refresh/index.js:

- the default preview path is fixed to C022-preview;
- the activation marker is fixed to C022-activation.md;
- the activated project index writes name: hypo-workflow and C22 active;
- active Cycle discovery accepts only directories whose names start with C022-, which omits a target project root Cycle such as C7;
- the review text says 20 historical Cycles instead of using discovered inventory.

Impact: executing activateHistoryRefresh(..., { approved: true }) against another project can create an incorrect semantic index and omit its actual current root Cycle. Activation must remain blocked until the implementation derives project identity, preview/marker identity, Cycle inventory/counts, and current active Cycle rows from the target workspace and reviewed mapping.

Regression coverage must use a non-Hypo-Workflow project fixture with a non-C022 current Cycle and a different number of archived Cycles, then assert the generated root index, Cycle index, marker, counts, idempotence, and legacy preservation.
