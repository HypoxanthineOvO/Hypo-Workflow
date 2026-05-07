# M04 / F002 - 只读 inspect/review 流程

## Objective

- 实现或规范 `/hw:pr inspect` 和 `/hw:pr review` 的 remote-readonly 流程：远端只读，用 fixture/mock 读取 PR/MR 状态、diff、评论和 CI/checks，同时允许写入本地 `.pipeline/pr/` 归档。

## 需求

- `/hw:pr inspect <url|id>` 汇总 PR/MR 元数据、review 状态、CI/checks、冲突状态、目标分支和本地归档路径。
- `/hw:pr review <url|id>` 做 Agent 审查：关键 diff、风险、需要处理的评论、测试建议、是否可合并。
- 默认使用 fixture/mock，不做 live remote 读取；如果设计 live provider，必须受 network/remote boundary 约束，且只能做远端只读操作。
- remote-readonly 流程可以写本地 `.pipeline/pr/` 归档，但不能写远端、分支或平台状态。
- 输出中文主体，保留 PR/MR/CI/checks 等术语。

## Boundaries

- In scope:
  - command parser/spec
  - provider fixture adapter
  - local archive update
  - docs and tests
- 不实现真实 GitHub/GitLab API 调用，除非作为明确可关闭的 remote-readonly provider boundary。
- 不修改代码、分支或远端状态。

## Implementation Plan

1. 写 tests，验证 inspect/review 对远端只读、不调用远端写 helper，同时允许本地归档写入。
2. 添加 fixture provider，覆盖 GitHub PR 和 GitLab MR 样例。
3. 实现 inspect summary 和 review note generation 的 deterministic helper。
4. 将结果写入 `.pipeline/pr/<id>/summary.md` 和 `review-notes.md`。
5. 更新 `/hw:help`、commands reference、platform docs。

## 预期测试

- inspect 能从 fixture 生成状态摘要。
- review 能列出风险和待处理评论。
- review 不能调用 push/merge/close provider 方法。
- 本地归档包含 evidence refs 而不是泄露 secret。
- unknown provider 或 malformed URL 有清晰错误。

## Validation Commands

- `node --test core/test/*pr*.test.js core/test/commands-rules-artifacts.test.js`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- 报告包含 GitHub 和 GitLab fixture 输出摘要。
- 报告指出只读流程写了哪些本地归档文件。

## Human QA

- 确认 inspect/review 输出足够帮助用户判断下一步。
- 确认没有暗示已经合并或远端状态已改变。

## 预期产出

- `/hw:pr inspect/review` 合同或实现。
- Fixture-backed read-only tests。
