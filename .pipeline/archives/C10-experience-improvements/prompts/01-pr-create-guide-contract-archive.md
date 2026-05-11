# M1 - PR Create 向导契约与本地归档模型

## Objective

- 将 `/hw:pr create` 从保留位升级为可规划的 Change Request 创建向导，支持默认问答、`--from-worktree` 和 `--plan` 两条路径。

## 需求

- 扩展 `references/pr-spec.md` 和 `skills/pr/SKILL.md`，定义 `create` 子命令。
- 默认 `/hw:pr create` 先询问用户是否已有本地改动。
- `--from-worktree`：已有改动，进入 dirty worktree、文件范围、分支、commit、push、title/body、target branch、reviewer/label 引导。
- `--plan`：还没开始，先进入一组 Plan，后续实现完成后回到 PR/MR create。
- 扩展 `.pipeline/pr/PR-YYYYMMDD-NNN/` archive 或新增 create proposal 字段，记录确认摘要和远端写动作列表。
- 预留 GitLab self-hosted `host/base_url` 配置，不强制完成所有 live API。

## Boundaries

- In scope: PR spec、PR skill、core PR archive contract、command/docs tests。
- 不实现真实 provider 写 API。
- 不把 `.pipeline/pr/` 变成远端状态 source of truth。

## Implementation Plan

1. 写 PR create contract tests，覆盖命令 shape、两种入口、archive 字段、远端写确认摘要。
2. 扩展 PR/MR Change Request spec，移除“create reserved”的旧限制。
3. 在 core PR 模块中增加 create proposal/archive 数据结构。
4. 更新 skills/pr 和用户文档，说明问答式引导和高阶参数。
5. 保持 fixture/mock 友好，不依赖真实网络。

## 预期测试

- GitHub PR 和 GitLab MR create proposal 都能被规范化。
- 未确认时不会执行 push/create/reviewer/label/target branch 远端写。
- archive 记录 proposed remote writes、confirmation policy、source/target branch、title/body。

## Validation Commands

- `node --test core/test/pr-contract.test.js core/test/pr-manual-gates.test.js core/test/pr-readonly-flow.test.js`

## Evidence

- 报告记录 PR create archive 示例、确认摘要字段和测试输出。

## Human QA

- review Subagent 审查 PR create 风险和 archive 字段是否足够让用户理解。

## 预期产出

- `/hw:pr create` 契约、archive 模型、focused tests、M1 report。
