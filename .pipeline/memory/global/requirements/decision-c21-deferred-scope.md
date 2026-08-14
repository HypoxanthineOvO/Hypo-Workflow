---
authority_role: record
confidence: high
created_at: 2026-07-11T20:39:36+08:00
dedupe_key: project:roadmap:c21-deferred-scope
id: decision-7356b0a9bd8eaa0cea04437082b0c010
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 7356b0a9bd8eaa0cea04437082b0c01032a61c937f9fcfaaa6af44c4722ea86d
source_refs:
  - locator: .pipeline/architecture.md
    ref: .pipeline/architecture.md#Deferred Scope
    type: legacy_file
  - locator: .pipeline/reports/C21-core-cutover-bootstrap-scope.md
    ref: .pipeline/reports/C21-core-cutover-bootstrap-scope.md#后续 Cycle; 当前版本目标; 兼容策略
    type: legacy_file
supersedes: []
updated_at: 2026-07-11T20:39:36+08:00
---

# C21 之后的延期范围

C21 后优先 OpenCode 适配，再 Claude Code/其他适配器、Workflow Stash/Suspend/Pop 与实验项目管理；聚合遥测和 Docs/PR/Release 重设计靠后；Dashboard、TUI、通用自动化任务暂不做。延期的 Analysis/Audit/Quality/Explore/Docs/PR/Release/Optimize 保持不可发现、零写入。（实验管理已在 C23 交付 pilot 版，语义文件协议保留。）
