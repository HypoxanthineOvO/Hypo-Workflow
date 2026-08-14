---
authority_role: record
confidence: 0.99
created_at: 2026-07-12T07:07:51+08:00
dedupe_key: privacy/evidence-redact-before-persist-render
id: requirement-f96524166e1a8217674e9480be062afc
kind: requirement
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: f96524166e1a8217674e9480be062afc7878210ed3d497e8a5250385d9edf971
source_refs:
  - locator: .pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml
    ref: .pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lessons[0]
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T07:07:51+08:00
---

# 证据先脱敏再持久化与展示

任何证据在持久化或展示前必须脱敏：token/password/credential 替换为 [REDACTED]，不落盘原文。
