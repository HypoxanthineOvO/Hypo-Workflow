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

# 教训：历史整理激活器要通用

经验：激活器不能硬编码参考仓库常量（已由 C023 修复）：路径、标识、Cycle 数量都要从目标仓库派生。
