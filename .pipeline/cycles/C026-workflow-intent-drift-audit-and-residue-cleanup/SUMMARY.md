---
kind: cycle-summary
cycle: C026-workflow-intent-drift-audit-and-residue-cleanup
status: closed
started: 2026-08-14
finished: 2026-08-14
builds_on:
  - C022-workflow-semantic-simplification
  - C023-test-contract-and-history-refresh-genericity
successors: []
---

# 意图漂移审计与残留清理总结

## 目的与边界

找出并清理 C022 语义简化后仍存活的、与初衷相矛盾的残留表面：讨论范围门只停在记忆层未传播、Plan 部分被编成 Milestone、Hooks 两套教义并存、staged inbox 无人闭环、旧机器时代机制未退役、权威链两条并存。边界：只改源端 Skills/模板/Hooks 契约/规则预设/适配器生成面/文档/本地索引；不 commit、不发布、不装插件、不重启服务。

## 最终结果

- 讨论范围门从记忆层落地到全部执行面（`skills/plan`、`skills/goal`、`AGENTS.md`、生成源），并新增澄清先行讨论模式（先搜仓库与历史 → 假设/缺口/常见错误三项分析 → 最关键问题 → 等回答）。
- Plan 部分（Discussion + Proposal）被明示排除在 Milestone/Stone ID 空间外；五个旧阶段机器（planning/batch-plan/deep-plan/progressive-discover/delivery）与 C17 config.yaml 标记 legacy。
- Hooks 确立单一教义：hook 规则全部降为 warn 提醒（builtin + 3 预设 + rules-spec），hooks 三方漂移对齐，pending_acceptance Goal 闭环，10 条 staged inbox 全部审阅归类。
- 权威链统一：日常权威 = `.pipeline/INDEX.md` + 当前 Cycle 四件套；manifest/runtime/Records 归 legacy；7 个旧 live Delivery 归档标记。
- 过度防御性设计审计：清除 Receipt 验证仪式与重复句，其余判定保留或列为候选。
- Maintain 持久化：新增 clarification-first-discussion requirement 记录。

## 验证结果

- Maintained Core 709/709；Maintained Scenario 8/8；`git diff --check` 干净。
- rules-summary：hook 规则全 warn，仅 2 条项目治理规则 error。
- 3 个 excluded 历史 lane 测试失败为模块导出退役所致，非本轮回归。

## 重要决定与经验

- 需求审计必须做到"执行面对账"：确认的需求要传播到模型每日读取的表面（Skill + 适配器），只记录不传播是残留的主要来源。
- 修改生成面时要同时改生成源（agent-guidance.js），否则下次重新生成会把修复冲掉。
- 判断"过度防御"的分界线：用户明确要求的语义不算，纯仪式/重复表述/为不存在机制做的验证/已退役的 gate 才算。
- Claude 旧 Stop hook 与规则引擎瘦身未在本轮处理，涉及宿主面，需单独确认。

## 后续候选

- E3：Claude Stop hook 从阻断式对齐为提醒式或标 legacy（单独确认）。
- E4：规则引擎 off 项瘦身。
- 本 Cycle 全部改动尚未 commit（尊重边界）；需要时单独授权 commit。
- 新语义同步到 Claude/OpenCode 适配器生成面（`.claude`、`.opencode` 下 agent 文件）。

## 历史记录

- Plan：`PLAN.md`
- Progress：`PROGRESS.md`
- Execution：`EXECUTION.md`
- Discussion：`DISCUSSION-SUMMARY.md`
- 审计矩阵：`AUDIT-MATRIX.md`
