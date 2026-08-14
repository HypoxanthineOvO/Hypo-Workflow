---
authority_role: record
confidence: high
created_at: 2026-05-14T23:30:00+08:00
dedupe_key: project:adapters:capability-map-native-registration-and-hook-semantics
id: decision-01879e62fb63a6e39f82d0acac18ea0b
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 01879e62fb63a6e39f82d0acac18ea0b0f6d3a1405d7d0503a8250feddb4cc3f
source_refs:
  - locator: .pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/knowledge-summary.md
    ref: >-
      .pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/knowledge-summary.md#Pitfalls /
      C6-SYNC-claude-opencode-codex-interface-map-20260505
    type: legacy_file
  - locator: .pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/summary.md
    ref: >-
      .pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/summary.md#Cycle summary and Milestone
      摘要 / M02-M04
    type: legacy_file
  - locator: .pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml
    ref: .pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lessons[2]
    type: legacy_file
  - locator: .pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md
    ref: .pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md#Summary and Milestones M09-M10
    type: legacy_file
  - locator: .pipeline/reports/C21-core-cutover-bootstrap-scope.md
    ref: .pipeline/reports/C21-core-cutover-bootstrap-scope.md#后续 Cycle; 当前版本目标; 兼容策略
    type: legacy_file
  - locator: .pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md
    ref: >-
      legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Dependencies, Pitfalls,
      and Decisions: C6-SYNC interface map
    type: legacy_file
  - locator: .pipeline/archives/C13-opencode-ux-enhancement/cycle.yaml
    ref: legacy:C13/cycle#cycle.status
    type: legacy_file
  - locator: .pipeline/archives/C13-opencode-ux-enhancement/summary.md
    ref: 'legacy:C13/summary#Knowledge summary: OpenCode command registration'
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T08:15:40+08:00
---

# 宿主能力画像与原生注册语义

为每个宿主按可验证能力生成最小适配，不按平台品牌复制大提示词；hook 语义按宿主原生格式注册。（Kim/ZCode 画像见 adapters/。）
