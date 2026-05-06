# C8 Plan Confirm Summary

## 项目

- Cycle: C8
- 名称: Hypo-Workflow 体验优化：Rules、自审、RTL 与 Codex Plugin
- Workflow kind: build
- Preset: tdd
- Feature 数: 4
- Milestone 数: 13

## 生成文件

- `.pipeline/config.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/feature-queue.yaml`
- `.pipeline/design-spec.md`
- `.pipeline/architecture.md`
- `.pipeline/PROGRESS.md`
- `.pipeline/metrics.yaml`
- `.pipeline/prompts/00-*.md` through `.pipeline/prompts/12-*.md`
- `.pipeline/reviews/README.md`
- `.pipeline/knowledge/records/C8-PLAN-domain-pack-boundary-and-review-rules-20260506.yaml`
- `.plan-state/batch-discover.yaml`
- `.plan-state/batch-decompose.yaml`
- `.plan-state/batch-architecture.md`
- `.plan-state/generate.yaml`

## 关键确认点

- Rules/Habits 以结构化记录为 authority，再生成 Markdown 和 adapter instructions。
- Review 默认覆盖 plan/test/code，并尽量检查 Skills、hooks、agents、commands 和 generated artifacts。
- Review 的自动修订循环默认最多 3 轮；严格配置可以阻塞。
- Domain pack 接口是核心交付，RTL 是第一版 reference pack，不硬编码进核心。
- Claude Code Codex plugin 支持先探测和生成指引；真实安装和用户级配置写入需要明确确认。

## P4 Gate

等待用户确认后，C8 才进入执行。确认后从 M01 开始。
