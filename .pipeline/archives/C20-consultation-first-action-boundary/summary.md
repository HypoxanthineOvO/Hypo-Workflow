# C20 协商优先的修改启动风格

- Cycle: C20
- 类型：feature
- 状态：completed（已验收：2026-06-30T21:43:36+08:00）
- 开始时间：2026-06-30T18:02:35+08:00
- 结束时间：2026-06-30T21:43:36+08:00
- Preset：tdd

## 改动摘要

C20 建立了「协商优先的修改启动风格」（Consultation-First Action Boundary）：当用户没有明确要求直接执行时，助手先输出修改计划或想法并等待确认；仅在用户明确授权时按推荐方案进入实际修改。同时新增「新概念第一次使用时一句话解释」（First-Use Concept Explanation）约定。源端产出行为合同 `references/consultation-first-action-boundary.md`，投影到 OpenCode/Claude/根 `AGENTS.md` 等 managed surfaces，并生成目标仓（Codex-VSP、VSP-Open-Code）的 Cycle 输入包与 integration matrix。

## Milestones

| Milestone | 结果 |
|---|---|
| C20-M1 | source behavior contract 与 focused fixtures 落地，focused 6/6 通过，审计 PASS_WITH_WARNINGS。 |
| C20-M2 | shared guidance 投影到 OpenCode/Claude/root managed surfaces，focused 23/23 通过。 |
| C20-M3 | 源端回归收口：focused 30/30、`npm test` 687/687、`git diff --check` 通过，lifecycle log validator 支持 gate feedback 事件。 |
| C20-M4 | 目标侧 Cycle 输入包与 C20 integration matrix 就绪，目标仓保持 no-write 只读边界。 |

## 验证结果

- focused suite 30/30、`npm test` 687/687、`git diff --check` 全部通过。
- 审计结论均为 PASS 或 PASS_WITH_WARNINGS，warning 仅为 source/target dirty baseline 与只读审计范围 caveat。

## 发布

- v13.1.0-beta.2 已发布（GitHub prerelease + GitLab release），含 C19 named Plan phases、C20 consultation boundary、managed surface sync。

## 延后事项

- 无（4 个 Milestone 全部完成）。

## 风险与后续

- 两个 target-local continuation（`C20-target-codex-vsp`、`C20-target-vsp-open-code`）计划在目标仓各自本地 Cycle 中消费 C20 输入包，不属于本仓库后续 Cycle 范围。
- 知识摘要：`knowledge-summary.md`。
