---
authority_role: record
confidence: confirmed
created_at: 2026-08-09T03:33:00.248Z
dedupe_key: project:hypo-workflow:requirement:plan-discussion-scope-gate
id: requirement-f5aec7e7196c5c58f19143b8a139f1f1
kind: requirement
level: constraint
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: f5aec7e7196c5c58f19143b8a139f1f1ca019ff1300503f79fd536dec3cd0f8a
source_refs:
  - locator: user-confirmed Plan discussion and Proposal transition semantics
    ref: conversation/plan-discussion-scope-gate-2026-08-09
    type: user_turn
supersedes: []
updated_at: 2026-08-09T03:33:00.248Z
---

# Plan 讨论范围门

Plan 默认是引导式规划讨论。除非用户明确要求直接从需求生成 Plan，否则必须先按范围相关主题讨论。写 Proposal 前必须：1) 建立用户可见的讨论范围；2) 逐项讨论每一项；3) 复盘并明确询问是否已充分讨论、可否开始写 Proposal。只有用户在该检查点明确确认才授权写 Proposal；"可以/对"只确认对应内容，不关闭讨论、不授权写 Proposal、不授权执行。Proposal 批准与执行授权是后面的独立 gate，绝不把四步折叠成一次推断。

Plan 保留 `Discussion → Technical → Architecture → Write Plan` 四段主架构。Discussion 开头必须解决人类可读的 P0 工程合同，包括本 Cycle 是否允许工程修改、改动边界、默认禁止的扩展、单独授权动作、完成证据与必要例外。P0 使用文字引导并沉淀到 Cycle 语义文件；不恢复旧 Requirement Tracks、Readiness 评分、Discussion Package 或独立机器状态。

P0 不实现为状态机或独立运行时对象。每个答案只标注来源：`user-confirmed`（用户明确决定）、`evidence-established`（仓库或平台事实）、`agent-default`（低影响可逆默认）或 `user-decision-required`（会改变范围、架构、安全、发布、外部副作用或验收）。Proposal 前必须清空最后一类；只有真正改变方案的项目才询问用户，不能把 Agent 推断伪装成授权，也不能把普通实现细节升级为无止境追问。

每个 P0 固定形成六项答案：目标类型（只分析或包含批准后的产品修改）、交付边界、必要扩展（hash、依赖、migration、兼容层、相邻重构等）、高影响动作、完成证据、未决授权。Subagent、自动化等级或全量回归不做固定配置项；只有真实影响当前方案时才归入上述六项。
