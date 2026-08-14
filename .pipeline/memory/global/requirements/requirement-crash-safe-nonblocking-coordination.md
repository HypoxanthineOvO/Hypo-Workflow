---
authority_role: record
confidence: confirmed
created_at: 2026-07-23T15:13:36.548Z
dedupe_key: project:concurrency:crash-safe-nonblocking-coordination
id: requirement-50d48cbaf43d48807074994ffa8db7ef
kind: requirement
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 50d48cbaf43d48807074994ffa8db7efd0a3529467dff061f561d2aafbc6a1e5
source_refs:
  - locator: multi-task concurrency and crash-safe lock requirements
    ref: conversation/vspi-workflow-symbiosis-2026-07-23
    type: user_turn
supersedes: []
updated_at: 2026-07-23T15:13:36.548Z
---

# 崩溃安全协调不得永久阻塞（历史）

曾要求写入中断可自动恢复、残留 lease 不永久阻塞；机器已随 C027 拆除，git 与 worktree 兜底。
