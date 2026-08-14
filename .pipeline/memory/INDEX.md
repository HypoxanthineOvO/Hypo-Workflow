---
kind: memory-index
status: active
---

# Memory 索引

人类可读长期事实。按约束等级分组：`constraint`（必须遵守）、`guideline`（默认遵守、有理由可偏离）、`reference`（方法经验，供选用）。正文与标题用中文，只有 YAML key、命令名、文件名和专有英文术语保留英文。


## 约束级（必须）

- [Claude /hw 命令命名空间](global/rules/decision-claude-hw-command-namespace.md)
- [OpenCode bash 自动放行策略](global/rules/decision-opencode-bash-auto-policy.md)
- [用户指令与授权（旧版，已被替代）](global/rules/decision-user-directives-and-grants-2.md)
- [用户指令与授权是执行边界](global/rules/decision-user-directives-and-grants.md)
- [澄清先行讨论纪律](global/rules/requirement-clarification-first-discussion.md)
- [并发 Cycle 语义](global/rules/requirement-concurrent-cycle-semantics.md)
- [协商优先的修改启动边界](global/rules/requirement-consultation-first-action-boundary.md)
- [Cycle 归档边界与显式继承](global/rules/requirement-cycle-archive-boundary-and-carry-forward.md)
- [Cycle、Experiment 与 Maintain 的职责分离](global/rules/requirement-cycle-experiment-maintain-role-separation.md)
- [高影响操作的授权边界（历史）](global/rules/requirement-high-impact-gates-and-scoped-automation.md)
- [人类可读执行记录](global/rules/requirement-human-readable-execution-records.md)
- [Plan 讨论范围门](global/rules/requirement-plan-discussion-scope-gate.md)
- [语义优先的记录与进度](global/rules/requirement-semantic-first-recording-and-progress.md)

- [记录用中文](global/rules/requirement-records-in-chinese.md)

## 指导级（应该）

- [Audit/Quality/Optimize 独立于执行链](global/requirements/decision-audit-quality-optimize-separation.md)
- [C21 之后的延期范围](global/requirements/decision-c21-deferred-scope.md)
- [九命令公开面](global/requirements/decision-c21-nine-command-public-surface.md)
- [宿主能力画像与原生注册语义](global/requirements/decision-capability-map-native-registration-and-hook-semantics.md)
- [并发 Workstream 与崩溃安全架构（历史）](global/requirements/decision-concurrent-workstream-crashsafe-architecture.md)
- [Nod 受管 daemon 的 Node 环境](global/requirements/decision-decision-nod-managed-daemon-node-path.md)
- [Analysis 持久车道与执行边界](global/requirements/decision-durable-lane-and-execution-boundaries.md)
- [内嵌 Node 核心边界](global/requirements/decision-embedded-node-core-boundary.md)
- [显式 Auto Group 模型切换](global/requirements/decision-explicit-auto-group-switching.md)
- [worktree 隔离与脏树门](global/requirements/decision-explore-worktree-isolation-and-dirty-gate.md)
- [可外置域包边界](global/requirements/decision-externalizable-domain-pack-boundary.md)
- [Stash 实现模型（旧版，已被替代）](global/requirements/decision-implementation-model-2.md)
- [Stash 实现模型](global/requirements/decision-implementation-model.md)
- [集成同步与内部发布门](global/requirements/decision-integration-sync-internal-release-gate.md)
- [Journal/Capsule/Pack 权威（历史）](global/requirements/decision-journal-capsule-pack-authority.md)
- [C21-M1 内核基线（历史）](global/requirements/decision-m1-accepted-kernel-baseline.md)
- [C21-M2 权威基线（历史）](global/requirements/decision-m2-accepted-authority-baseline.md)
- [C21-M3 恢复基线（历史）](global/requirements/decision-m3-accepted-recovery-baseline.md)
- [C21-M4 Init 路由基线（历史）](global/requirements/decision-m4-accepted-init-router-baseline.md)
- [VSPi 模型组层级契约](global/requirements/decision-model-group-tier-capability-contract.md)
- [Goal/Cycle 同级交付与显式启动](global/requirements/decision-peer-kinds-explicit-start-manual-acceptance.md)
- [VSPi Plan 绑定版本边界](global/requirements/decision-plan-binding-version-boundary.md)
- [平台中立 README](global/requirements/decision-platform-neutral-readme.md)
- [可移植核心边界](global/requirements/decision-portable-core-boundaries.md)
- [Skill 优先的单一权威（旧版，已被替代）](global/requirements/decision-skill-first-single-authority-2.md)
- [Skill 优先的单一权威](global/requirements/decision-skill-first-single-authority.md)
- [源端管理面与目标自有面的边界](global/requirements/decision-source-managed-target-owned-boundary.md)
- [事务与派生一致性（历史）](global/requirements/decision-transaction-and-derived-coherence.md)
- [未初始化时 Plan 需要显式 init](global/requirements/decision-uninitialized-plan-requires-explicit-init.md)
- [完成报告的内容要在对话里讲清](global/requirements/preference-completion-report-substance-in-conversation.md)
- [面向用户输出优先中文](global/requirements/preference-prefer-chinese-output.md)
- [崩溃安全协调不得永久阻塞（历史）](global/requirements/requirement-crash-safe-nonblocking-coordination.md)
- [动态选择、本地化与安装新鲜度校验（历史）](global/requirements/requirement-dynamic-selection-localization-installed-freshness.md)
- [中文规范标题](global/requirements/requirement-localization-zh-cn-canonical-headings.md)
- [C21-M5 参考仓库引导切换合同（历史）](global/requirements/requirement-m5-reference-bootstrap-cutover-contract.md)
- [C21-M6 Goal/Cycle 自适应计划路线（历史）](global/requirements/requirement-m6-goal-cycle-adaptive-plan-route.md)
- [C21-M7 Maintain 与 Codex Hook 路线（历史）](global/requirements/requirement-m7-maintain-codex-hook-route.md)
- [C21-M8 清理与删除门路线（历史）](global/requirements/requirement-m8-cleanup-deletion-gate-route.md)
- [按模型能力分层的 Plan 与 Progress](global/requirements/requirement-model-tiered-plan-and-progress.md)
- [多 Workstream 多模型（历史）](global/requirements/requirement-multi-workstream-multi-model.md)
- [证据先脱敏再持久化与展示](global/requirements/requirement-privacy-evidence-redact-before-persist-render.md)
- [基于风险的 Worker 分离（历史）](global/requirements/requirement-risk-based-worker-separation.md)
- [语义索引与一次性历史整理](global/requirements/requirement-semantic-index-and-history-refresh.md)
- [VSPi 与 Hypo-Workflow 的共生范围](global/requirements/requirement-workflow-symbiosis-scope.md)

## 参考级（方法）

- [C21-M5 引导激活已接受（历史）](cycle/decision-bootstrap-activation-accepted.md)
- [C23 实验管理计划（旧版，已被替代）](cycle/decision-cycle-c23-experiment-management-plan-2.md)
- [C23 实验管理计划](cycle/decision-cycle-c23-experiment-management-plan.md)
- [VSPi 共生 Workflow 核心计划（历史）](cycle/decision-cycle-vspi-symbiotic-workflow-core-plan.md)
- [并发 Work Item 安全 Placement 计划（历史）](cycle/decision-goal-concurrent-work-placement-integration-plan.md)
- [实验记录与 Hooks 非阻塞化计划](cycle/decision-goal-experiment-protocol-hooks-simplification-plan.md)
- [发布 C21 并以 Host Contract 收敛 VSP 集成（历史）](cycle/decision-goal-g22-vsp-distribution-contract-plan.md)
- [VSPi 共生 Workflow Goal 计划（历史）](cycle/decision-goal-vspi-symbiotic-workflow-goal-plan.md)
- [C23 交付反馈（历史）](cycle/feedback-cycle-c23-experiment-management-feedback-492b5eb524d3d0ec.md)
- [把 Plan 换成自主 Goal（历史）](cycle/feedback-replace-plan-with-goal.md)
- [审计的 source-id 闭包矩阵（经验）](global/knowledge/decision-audit-source-id-closure-matrix.md)
- [讨论原文的存储方式（经验）](global/knowledge/decision-discussion-ledger-storage.md)
- [最小模型可见 API（旧版，已被替代）](global/knowledge/decision-minimal-model-facing-api-2.md)
- [最小模型可见 API（经验）](global/knowledge/decision-minimal-model-facing-api.md)
- [教训：交付不等于被接受](global/knowledge/feedback-c16-delivered-but-not-human-accepted.md)
- [教训：未解决的架构质量问题要显式跟踪](global/knowledge/feedback-c17-unresolved-architecture-quality-followups.md)
- [教训：目标本地续接要单独处理](global/knowledge/feedback-c20-target-local-continuations.md)
- [教训：外部效果与发布证据可审计](global/knowledge/feedback-external-effects-and-release-evidence.md)
- [教训：历史整理激活器要通用](global/knowledge/feedback-history-refresh-activator-genericity.md)
- [教训：归档迁移的状态冲突要显式解决](global/knowledge/feedback-migration-c12-archive-status-conflict.md)
- [教训：路径助手要重新校验工作区](global/knowledge/feedback-path-helper-workspace-revalidation.md)
