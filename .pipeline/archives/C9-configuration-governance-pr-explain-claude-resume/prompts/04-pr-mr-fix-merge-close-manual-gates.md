# M05 / F002 - fix/merge/close 手动门

## Objective

- 设计并实现 `/hw:pr fix|merge|close` 的高风险人工确认边界，确保本地修复可追踪，远端写操作不可自动发生。

## 需求

- `/hw:pr fix <url|id>` 可以基于 review notes 规划本地修复，并把本地修改、测试和建议 commit/push 步骤写入归档。
- `/hw:pr merge <url|id>` 必须先检查 CI/checks、review/approval、冲突、目标分支、归档证据，再要求人工确认。
- `/hw:pr close <url|id>` 必须记录关闭原因并要求人工确认。
- `push`、`merge`、`close`、修改 reviewer、label、target branch 全部是高风险门，即使配置是 full/solo-auto 也不能自动执行。
- 所有 confirm decision 写入 `.pipeline/pr/<id>/decisions.yaml`。

## Boundaries

- In scope:
  - command contract
  - confirmation gate helper/tests
  - archive updates
  - docs
- 不执行真实远端写操作。
- 不绕过 protected branch 或平台 approval。
- 不把 PR/MR 合并和 `/hw:release` 发布混在一起；release/tag/changelog 仍归 release flow。

## Implementation Plan

1. 写 failing tests，验证 high-risk gate 在 full automation 下仍阻止远端写。
2. 实现或规范 fix 本地记录：changed files、tests、remaining risks、push recommendation。
3. 实现 merge readiness checker 的 fixture path。
4. 实现 close reason 和 confirmation record。
5. 更新 docs，明确 `/hw:pr create` 是后续预留。

## 预期测试

- full automation 不能跳过 PR/MR remote write confirmation。
- merge readiness 缺 CI、缺 approval、有 conflict 时不能进入 merge proposal。
- close 必须有 reason 或明确默认原因。
- fix 不会自动 push。
- decisions.yaml 记录确认状态、时间、动作、操作者/agent、风险摘要。

## Validation Commands

- `node --test core/test/*pr*.test.js core/test/init-automation-contract.test.js`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- 报告展示 merge blocked 和 merge ready 两个 fixture。
- 报告展示 decisions.yaml 片段。

## Human QA

- 确认用户不会误以为 `/hw:pr merge` 自动合并。
- 确认 fix 输出对新手 PR/MR 用户足够解释。

## 预期产出

- PR/MR high-risk gate 合同或实现。
- 本地归档和确认记录测试。

