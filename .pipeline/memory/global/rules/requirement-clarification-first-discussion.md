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
# Clarification-first Discussion

Plan 的 Discussion 在给出任何 Proposal 或最终回答之前，必须先完成澄清先行分析，而不是直接给方案：

1. 先搜索仓库与历史：项目索引、当前 Cycle、memory 与历史记录，让分析建立在仓库事实上。
2. 展示三项分析：用户没有明说但已默认成立的假设；还缺哪些关键信息以及它们会如何改变答案；处理这类问题时最常犯的一个错误。
3. 然后提出最关键的一个或少数几个问题——目的是理解用户的真实目标和具体情况，让最终方案真正对用户有用，而不是谁都能套用的通用建议；信息充分时不要为了问而问。
4. 等用户回答后再继续；未经讨论完成门不得直接写 Proposal。

已应用于 `skills/plan/SKILL.md`、`skills/goal/SKILL.md`、`AGENTS.md` 与生成源 `core/src/artifacts/agent-guidance.js`（C026 M7）。
