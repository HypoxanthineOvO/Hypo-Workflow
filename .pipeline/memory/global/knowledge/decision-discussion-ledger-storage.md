---
authority_role: record
confidence: confirmed
created_at: 2026-08-05T13:18:27.498Z
dedupe_key: project:hypo-workflow:decision:discussion-ledger-storage
id: decision-cafe4ac041fd304d67b3ca2f30846c61
kind: decision
level: reference
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: cafe4ac041fd304d67b3ca2f30846c61b75a10eb23db8033541139b20f472b41
source_refs:
  - locator: user-selected local verbatim ledger with Git-tracked summary
    ref: conversation/discussion-ledger-storage-2026-08-05
    type: user_turn
supersedes: []
updated_at: 2026-08-05T13:18:27.498Z
---

# 讨论原文的存储方式（经验）

用户与助手的可见原文按 Cycle/Session 追加保存到本地 .pipeline/local/discussions/（gitignore）；Git 内只保存脱敏后的讨论摘要。
