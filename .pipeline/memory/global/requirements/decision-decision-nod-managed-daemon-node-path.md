---
authority_role: record
confidence: confirmed
created_at: 2026-08-06T09:34:53.744Z
dedupe_key: decision.nod-managed-daemon-node-path
id: decision-649bfe230e39bfc41a368d2b09c387dc
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: hypo-workflow
  type: project
semantic_hash: 649bfe230e39bfc41a368d2b09c387dc50daa571a39882b512e41ebabe5a5cf8
source_refs:
  - locator: 用户选择现在持久修复
    ref: conversation/nod-hook-repair
    type: user_feedback
supersedes: []
updated_at: 2026-08-06T09:34:53.744Z
---

# Nod 受管 daemon 的 Node 环境

Nod 上的 VSP-Codex 受管 app-server 必须从非交互环境获得稳定 Node 路径，使用 ~/.local/share/fnm/aliases/default/bin，避免 daemon 重启后 hook 因 node 不在 PATH 而重复失败。
