# C18 Design Spec

## 用户目标

本 Cycle 要完成三个层面的工作：

1. 强化 `/hw:audit`，让它在体验不好、准备重构或风险不明时具备工程方法论、追问流程、好坏标准和找问题方法。
2. 新增 `/hw:quality` 和 `/hw:optimize`，支持一次性质量评分报告和可持续的 Audit+Quality 优化闭环。
3. 建立 Hypo-Workflow 源仓库到 `~/Codex-VSP` 与 `~/VSP-Open-Code` 的集成同步开发流程，并在目标仓库中记录同步结果。

## 已确认设计

- `/hw:audit` 仍是风险治理 gate。
- `/hw:quality` 是一等命令，负责质量评分、baseline、compare、review 和 action queue。
- `/hw:optimize` 是闭环编排命令，执行前必须有 correctness、backup、budget、validation path。
- 集成同步不是用户命令，而是源仓库功能更新后的开发流程和 release gate。
- 目标仓库写入必须先由 C18-M5 只读检查并生成适配计划，再由用户确认。

## 验证方法

- 每个命令类 Milestone 运行 focused Node contract tests。
- C18-M5 运行 `npm test` 和 `git diff --check`。
- 目标仓库验证只在 C18-M6 用户确认后运行。

## 伪测试拒绝

Audit/Test 必须拒绝只检查文字存在的伪测试。有效测试至少要覆盖对应命令注册、Skill/spec、adapter/docs、状态路径、报告路径或 no-command contract 中的一个真实行为面。
