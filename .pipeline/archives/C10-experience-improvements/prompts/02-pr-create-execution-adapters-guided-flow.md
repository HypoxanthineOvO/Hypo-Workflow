# M2 - PR Create 远端执行适配与教学式流程

## Objective

- 实现 `/hw:pr create` 的可执行引导和 provider 边界，让用户能在确认后完成分支、commit、push 和 PR/MR 创建流程。

## 需求

- 在 core PR 模块中增加 create planning/execution helper。
- 支持 GitHub 与 GitLab provider 抽象；优先支持 `gitlab.com`，self-hosted 通过 `host/base_url` 预留或最小可用路径接入。
- 生成用户可读的决策步骤和一次性确认摘要。
- 将本地 git 状态检查、建议分支名、commit message、target branch、title/body、可选 reviewer/label 纳入向导。
- 所有 push/create/update remote write 必须在确认摘要之后执行，或生成明确的待执行命令。

## Boundaries

- In scope: core PR create helpers、mock provider execution、git-state planning helpers、docs/spec 更新。
- 不在测试中访问真实远端。
- 不自动绕过 protected branch 或平台权限限制。

## Implementation Plan

1. 写 mock provider 写操作测试，证明未确认不写、确认后按顺序调用。
2. 写 git-state helper 测试，覆盖 clean/dirty、已有分支、新分支建议、文件范围。
3. 实现 create plan builder 和 confirmed execution helper。
4. 将 provider capability、host/base_url 和 manual command fallback 写入 PR spec。
5. 更新 `/hw:pr create` 用户提示，让不熟悉 PR/MR 的用户可以逐步决策。

## 预期测试

- 未确认时 provider write calls 为空。
- 确认后按 plan 执行 branch/commit/push/create/update metadata 的 mock 调用。
- dirty worktree 和 branch 建议有确定性输出。

## Validation Commands

- `node --test core/test/pr-create.test.js core/test/pr-manual-gates.test.js`

## Evidence

- 报告记录 mock provider calls、确认摘要和 git-state 场景结果。

## Human QA

- test Subagent 负责测试设计和 provider call 断言；implement Subagent 只看测试命令和失败摘要。

## 预期产出

- PR create execution helpers、mock provider tests、M2 report。
