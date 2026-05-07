# M03 / F002 - Change Request 合同与本地归档

## Objective

- 设计 `/hw:pr` 的平台中立 Change Request 合同，并新增本地 PR/MR 处理归档结构。

## 需求

- 定义 Change Request 抽象：GitHub Pull Request 和 GitLab Merge Request 共享一套状态、review、CI/checks、diff、comment、conflict、mergeability 字段。
- 设计 `.pipeline/pr/` 本地归档结构，记录 inspect/review/fix/merge/close 的证据、决策和确认。
- 明确 `/hw:pr inspect|review|fix|merge|close <url|id>` 的第一版命令边界。
- 预留 `/hw:pr create`，但 C9 不要求完整创建 PR/MR。
- 文档必须写清楚远端写操作是高风险门。

## Boundaries

- In scope:
  - new `references/pr-spec.md` or equivalent
  - `references/commands-spec.md`
  - `docs/user-guide.md`
  - `docs/reference/commands.md`
  - local archive schema/tests
- 不连接 live GitHub/GitLab 作为测试依赖。
- 不执行真实 push/merge/close。
- 不把 `.pipeline/pr/` 当成远端平台的 source of truth。

## Implementation Plan

1. 写 failing tests，覆盖 Change Request normalization 和 archive path/schema。
2. 设计 `.pipeline/pr/PR-YYYYMMDD-001/` 结构：`request.yaml`、`summary.md`、`review-notes.md`、`changes.md`、`evidence/`、`decisions.yaml`。
3. 实现本地归档 helper 或至少生成 schema/fixture。
4. 更新命令规范和用户文档，说明 GitHub PR/GitLab MR 术语差异。
5. 增加 secret-safe evidence 约束，避免把 token、authorization、cookie 写入归档。

## 预期测试

- GitHub PR URL 和 GitLab MR URL 能被识别为 Change Request source。
- 本地归档目录名稳定且不覆盖已有记录。
- `request.yaml` 至少记录 provider、url、number、source_branch、target_branch、author、status_snapshot、created_at。
- `decisions.yaml` 能记录人工确认项和最终状态。
- secret marker 会被拒绝或 redacted。

## Validation Commands

- `node --test core/test/*pr*.test.js core/test/log-evidence.test.js`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- 报告展示一个 fixture archive tree。
- 报告列出远端写操作确认门。

## Human QA

- 确认 `/hw:pr` 的语义不像自动合并机器人。
- 确认用户能理解 PR/MR 在 GitHub/GitLab 的命名差异。

## 预期产出

- Change Request spec。
- `.pipeline/pr/` archive contract。
- Focused tests 和中文文档。

