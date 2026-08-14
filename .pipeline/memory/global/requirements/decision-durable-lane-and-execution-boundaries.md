---
authority_role: record
confidence: high
created_at: 2026-05-16T12:40:46+08:00
dedupe_key: project:analysis:durable-lane-and-execution-boundaries
id: decision-9a6060d4567e684b182e3d0823e9f8b9
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 9a6060d4567e684b182e3d0823e9f8b9393ac8480a5d0ce2459e089a080197d0
source_refs:
  - locator: .pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md
    ref: .pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L129-L159
    type: legacy_file
  - locator: .pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md
    ref: >-
      .pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L35-L45;L84-L103
    type: legacy_file
  - locator: .pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md
    ref: .pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md#L25-L26
    type: legacy_file
  - locator: .pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md
    ref: .pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md#L27-L31
    type: legacy_file
  - locator: .pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml
    ref: 'legacy:C15/cycle#cycle.summary: /hw:analysis recovery'
    type: legacy_file
  - locator: .pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md
    ref: 'legacy:C15/summary#Milestones: C15-M3 Interactive Analysis State And Command Entry'
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T08:15:40+08:00
---

# Analysis 持久车道与执行边界

Analysis 模式有持久车道：manual 拒绝改代码、hybrid 先确认、auto 在配置边界内改；重启与系统安装需确认。
