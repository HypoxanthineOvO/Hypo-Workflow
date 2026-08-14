---
kind: memory-index
status: active
---

# Memory 索引

人类可读长期事实，梳理沉淀、不堆积。按约束等级分组：`constraint`（必须遵守）、`guideline`（默认遵守、有理由可偏离）、`reference`（方法经验与历史脉络，供选用）。正文与标题用中文，只有 YAML key、命令名、文件名、路径和必要专名保留英文。


## 约束级（必须）

- [Claude /hw 命令命名空间](global/rules/decision-claude-hw-command-namespace.md)
- [OpenCode bash 自动放行策略](global/rules/decision-opencode-bash-auto-policy.md)
- [用户指令与授权是执行边界](global/rules/decision-user-directives-and-grants.md)
- [澄清先行讨论纪律](global/rules/requirement-clarification-first-discussion.md)
- [并发 Cycle 语义](global/rules/requirement-concurrent-cycle-semantics.md)
- [协商优先的修改启动边界](global/rules/requirement-consultation-first-action-boundary.md)
- [Cycle 归档边界与显式继承](global/rules/requirement-cycle-archive-boundary-and-carry-forward.md)
- [Cycle、Experiment 与 Maintain 的职责分离](global/rules/requirement-cycle-experiment-maintain-role-separation.md)
- [高影响操作的授权边界（历史）](global/rules/requirement-high-impact-gates-and-scoped-automation.md)
- [人类可读执行记录](global/rules/requirement-human-readable-execution-records.md)
- [Plan 讨论范围门](global/rules/requirement-plan-discussion-scope-gate.md)
- [记录用中文](global/rules/requirement-records-in-chinese.md)
- [语义优先的记录与进度](global/rules/requirement-semantic-first-recording-and-progress.md)

## 指导级（应该）

- [Audit/Quality/Optimize 独立于执行链](global/requirements/decision-audit-quality-optimize-separation.md)
- [C21 之后的延期范围](global/requirements/decision-c21-deferred-scope.md)
- [九命令公开面](global/requirements/decision-c21-nine-command-public-surface.md)
- [宿主能力画像与原生注册语义](global/requirements/decision-capability-map-native-registration-and-hook-semantics.md)
- [Nod 受管 daemon 的 Node 环境](global/requirements/decision-decision-nod-managed-daemon-node-path.md)
- [Analysis 持久车道与执行边界](global/requirements/decision-durable-lane-and-execution-boundaries.md)
- [内嵌 Node 核心边界](global/requirements/decision-embedded-node-core-boundary.md)
- [worktree 隔离与脏树门](global/requirements/decision-explore-worktree-isolation-and-dirty-gate.md)
- [可外置域包边界](global/requirements/decision-externalizable-domain-pack-boundary.md)
- [集成同步与内部发布门](global/requirements/decision-integration-sync-internal-release-gate.md)
- [Goal/Cycle 同级交付与显式启动](global/requirements/decision-peer-kinds-explicit-start-manual-acceptance.md)
- [平台中立 README](global/requirements/decision-platform-neutral-readme.md)
- [可移植核心边界](global/requirements/decision-portable-core-boundaries.md)
- [Skill 优先的单一权威](global/requirements/decision-skill-first-single-authority.md)
- [源端管理面与目标自有面的边界](global/requirements/decision-source-managed-target-owned-boundary.md)
- [VSPi 集成边界](global/requirements/decision-vspi-integration-boundaries.md)
- [完成报告的内容要在对话里讲清](global/requirements/preference-completion-report-substance-in-conversation.md)
- [面向用户输出优先中文](global/requirements/preference-prefer-chinese-output.md)
- [中文规范标题](global/requirements/requirement-localization-zh-cn-canonical-headings.md)
- [按模型能力分层的 Plan 与 Progress](global/requirements/requirement-model-tiered-plan-and-progress.md)
- [证据先脱敏再持久化与展示](global/requirements/requirement-privacy-evidence-redact-before-persist-render.md)
- [VSPi 与 Hypo-Workflow 的共生范围](global/requirements/requirement-workflow-symbiosis-scope.md)

## 参考级（方法与历史）

- [审计的 source-id 闭包矩阵（经验）](global/knowledge/decision-audit-source-id-closure-matrix.md)
- [讨论原文的存储方式（经验）](global/knowledge/decision-discussion-ledger-storage.md)
- [最小模型可见 API（经验）](global/knowledge/decision-minimal-model-facing-api.md)
- [教训：交付不等于被接受](global/knowledge/feedback-c16-delivered-but-not-human-accepted.md)
- [教训：未解决的架构质量问题要显式跟踪](global/knowledge/feedback-c17-unresolved-architecture-quality-followups.md)
- [教训：目标本地续接要单独处理](global/knowledge/feedback-c20-target-local-continuations.md)
- [教训：外部效果与发布证据可审计](global/knowledge/feedback-external-effects-and-release-evidence.md)
- [教训：历史整理激活器要通用](global/knowledge/feedback-history-refresh-activator-genericity.md)
- [教训：归档迁移的状态冲突要显式解决](global/knowledge/feedback-migration-c12-archive-status-conflict.md)
- [教训：路径助手要重新校验工作区](global/knowledge/feedback-path-helper-workspace-revalidation.md)
- [机器时代交付史（C21–C27 拆除前）](global/knowledge/record-machine-era-history.md)
