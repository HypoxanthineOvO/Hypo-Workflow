---
authority_role: record
confidence: confirmed
created_at: 2026-08-14T08:10:00.000Z
dedupe_key: project:hypo-workflow:requirement:clarification-first-discussion
id: requirement-dee5b35939cfe5774c148570aafd6cdb
kind: requirement
level: constraint
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: dee5b35939cfe5774c148570aafd6cdbfe9eb19f1c10fe5f304659ddad40448f
source_refs:
  - locator: 用户要求 Plan Discussion 澄清先行（假设/缺口/常见错误 + 最关键问题）
    ref: conversation/c026-plan-discussion-2026-08-14
    type: user_turn
supersedes: []
updated_at: 2026-08-14T08:10:00.000Z
---

# 澄清先行讨论纪律

Discussion 在给出任何 Proposal 或最终回答之前，先搜索仓库与历史（项目索引、当前 Cycle、memory），再展示三项分析：未明说的默认假设、缺失的关键信息及其影响、这类问题最常犯的错误；然后提最关键的一个或少数几个问题（理解真实目标，而非通用模板）；等用户回答后再继续。
