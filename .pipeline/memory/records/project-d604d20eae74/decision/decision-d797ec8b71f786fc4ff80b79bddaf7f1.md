---
authority_role: record
confidence: high
created_at: 2026-07-11T20:09:41+08:00
dedupe_key: project:stash:implementation-model
id: decision-d797ec8b71f786fc4ff80b79bddaf7f1
kind: decision
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: d797ec8b71f786fc4ff80b79bddaf7f18283724a88cf954c348aa9dd263a8df1
source_refs:
  - locator: .pipeline/reports/C21-stash-suspend-reconciliation-design.md
    ref: .pipeline/reports/C21-stash-suspend-reconciliation-design.md#已确认的产品模型; push 记录什么; pop 语义; 冲突策略
    type: legacy_file
supersedes:
  - decision-f8e8e63dd30d8a90c572e1a699a19f21
updated_at: 2026-07-11T20:09:41+08:00
---
The deferred Workflow Stash model is Checkpoint + Suspend + Blocking Delivery + Reconciliation, not git stash or a code snapshot. Push records Workflow contracts, evidence, remaining work, blocker, resume condition, HEAD and dirty paths while leaving the worktree in place and warning about overlap risk. Pop waits for the blocker condition, reads the accepted new baseline, creates a Resume Merge Plan, reconciles old assumptions forward, updates affected Milestones and verification, and preserves history. Adaptive mode auto-resolves only low-ambiguity mappings and asks on semantic conflict; strict mode requires approval for every contract difference. Failed reconciliation remains recoverable rather than pretending restoration succeeded.
