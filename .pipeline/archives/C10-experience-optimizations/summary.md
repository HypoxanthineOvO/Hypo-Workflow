# C10 一系列体验优化

- Cycle: C10
- Name: 一系列体验优化
- Type: feature
- Status: completed
- Started: 2026-05-08T23:41:58+08:00
- Finished: 2026-05-09T00:30:30+08:00
- Preset: tdd

## Milestones

- M0: 完成 P0 Configure 契约、状态继承模型、文档和聚焦测试。
- M1: 完成 PR Create 向导契约与本地归档模型。
- M2: 完成 GitHub/GitLab PR Create 远端执行适配、教学式流程和手动确认边界。
- M3: 完成 Subagent 授权、隔离与降级治理。
- M4: 完成 `/hw:pr create` 命令面、文档、适配器刷新和完整回归。

## Key Data

- Tests: focused PR/P0/Subagent tests passed; `npm test --prefix core` passed; `node cli/bin/hypo-workflow validate-config` passed; `python tests/run_regression.py` passed; `git diff --check` passed.
- Final decision: pass.
- Warnings: real remote PR/MR smoke was not run.
- Deferred items: 0.
- Knowledge summary: `.pipeline/archives/C10-experience-optimizations/knowledge-summary.md`

## Lessons

- 面向用户的子命令即使共享同一个 Skill 实现，也应在 command registry 中显式暴露。
- 生成文档和回归命令数量场景需要与 command registry 变化保持同步。
