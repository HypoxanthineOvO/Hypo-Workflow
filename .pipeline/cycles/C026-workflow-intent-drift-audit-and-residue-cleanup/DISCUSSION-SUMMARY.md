---
kind: discussion-summary
cycle: C026-workflow-intent-drift-audit-and-residue-cleanup
updated: 2026-08-14T15:53:00+08:00
raw_discussion: local/discussions/C026-workflow-intent-drift-audit-and-residue-cleanup/
---

# 讨论摘要

## 用户需求

- 用户指出：C022 语义简化后仍有旧问题未改掉，怀疑此前执行流程与需求审计不彻底、有残留。
- 三个具体症状：① Plan 环节模型仍主动跳过讨论直接开干；② Plan 和 Execute 本是两个部分，Plan 却总被设置为 Milestone；③ Hooks 设计感觉不好。
- 用户要求系统性梳理，纠正"越改越不符合初衷"的漂移。
- S2 反馈补充：梳理因 GPT 劣根性导致的过度防御性设计（M6）。
- S2 反馈补充：Plan 的 Discussion 要"澄清先行"——先搜仓库与历史，指出未明说的假设、缺失关键信息及其影响、最常见错误，再提最关键的一个或少数几个问题，等回答后再给最终输出（M7）。

## 已确认决定

- 创建梳理 Cycle（C026），先交付完整审计矩阵作为 M1，停在 S1 等待用户审阅；审阅通过后才执行清理（M2–M5）。
- 本轮（M1）不修改任何被审计文件，只新增 Cycle 文件与本地索引。
- 清理边界：只改源端 Skills/模板/Hooks 契约/规则预设/适配器生成面/文档/本地索引；不涉及远端发布、插件安装、服务重启。

## 审计核心结论（M1）

- 讨论 gate 需求已确认但只停在 memory/inbox（staged），`skills/plan/SKILL.md` 与 `AGENTS.md` 两个执行面未更新，其中 `AGENTS.md` 表述与新需求相反。
- Plan 部分从未被明示排除在 Milestone/Stone ID 空间外；旧阶段制机制（planning/batch-plan/deep-plan 等）未退役。
- Hooks 两套教义并存：规则引擎 error 级 hook gate vs "Hooks 是辅助、fail-open"；core/hooks.json/README 三方漂移。
- 审计链条自身有残留：10 条 staged inbox 未处理、7 个半终态 runtime 对象未归档、两条权威链并存。

## 接受与拒绝

- S1：用户接受审计矩阵与 M2–M5 清理范围（"接受，开始清理"，2026-08-14）。
- S2：用户接受全部结果（含 M6 过度防御审计与 M7 澄清先行落地），C026 关闭。

## 未决问题

- 无（后续候选见 `SUMMARY.md`）。
