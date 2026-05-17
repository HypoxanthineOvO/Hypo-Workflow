# PR-20260517-001 Summary

GitHub PR: https://github.com/HypoxanthineOvO/Hypo-Workflow/pull/8

作者：Baojch / Jiacheng Bao

标题：Optimize Cursor adapter sync

状态：MERGED。GitHub 未报告 checks；已在 2026-05-17 21:08:04 CST 提交 `request changes` review。2026-05-17 21:18:42 CST 复审确认作者追加修复提交 `27c5389` 后，原 blocking finding 已解决。2026-05-17 21:21:32 CST 提交 approve review，2026-05-17T13:23:59Z 合入 GitHub main，merge commit `930b5620c4d9d0f4ccd862f434a9497e664c285e`。

## Scope

- 153 files changed, +13,984 / -51.
- 主要新增 `.cursor/commands/hw-*.md`、`.cursor/skills/hw-*.md` 和 `.cursor/hypo-workflow/` 资源镜像。
- 修改 Cursor 第三方 adapter 生成逻辑：`core/src/artifacts/third-party.js`。
- 同步修改平台能力、Skill spec、README、Cursor docs、generated artifact docs 和相关测试。

## Rereview

新增提交：

- `27c53895155a062a330502bdc29859d741fc9191` - `fix: make Cursor setup references self-contained`

复审结论：

- `/hw-setup` 不再引用未镜像的 `references/config-spec.md`。
- 生成的 Cursor Skill 现在包含 `Cursor Reference Resolution`，明确缺失 source-repository paths 是 external/non-local，并给出 fallback 行为。
- `core/test/platform-adapters.test.js` 增加生成 Skill reference 可解析或显式 external/fallback 的回归检查。

## Merge

- Approve review submitted after user authorization.
- PR merged with a regular merge commit.
- Local `main` fast-forwarded to `930b5620c4d9d0f4ccd862f434a9497e664c285e`.
- Docs governance API check passed on merged local main.
- Sync check-only reported `.pipeline` compact/runtime stale warnings in detached PR worktree; these are not PR payload and should not be merged.

## Claimed Test Plan

PR body 只声明：

```bash
node --test core/test/platform-adapters.test.js core/test/profile-platform.test.js
```

本地审阅追加跑了更宽的 smoke 和完整 Node 测试，见 `evidence/snapshot.md`。
