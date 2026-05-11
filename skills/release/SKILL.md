---
name: release
description: Run Hypo-Workflow release automation when the user wants regression, versioning, changelog, and publication handled in one flow.
---

# /hypo-workflow:release
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for the release workflow.

## 前置条件

- worktree should be ready for release
- no unfinished milestone should remain in state

## 执行流程

1. Preflight:
   - verify clean worktree
   - verify correct branch
   - verify no unfinished milestone
2. Run regression unless the user explicitly confirms skipping tests.
3. Calculate the next version unless an explicit bump flag is given.
4. Update versioned files.
5. Run `update_readme` from the README spec contract:
   - read `templates/readme-spec.md`
   - replace managed marker blocks by default
   - obey `release.readme.mode` and `release.readme.full_regen`
   - do not silently full-regenerate in strict/shared release profiles
6. Run `readme-freshness` before commit/tag/push gates.
7. Resolve `output.language` and `output.timezone`.
8. Generate changelog content in `output.language` with timestamps in `output.timezone`.
9. Commit, tag, and push.
10. Optionally create the remote release entry.
11. Append a lifecycle log entry.
12. Set `current.phase=lifecycle_release` when state tracking is used.

## 参考文件

- `references/release-spec.md`
- `references/log-spec.md`
- `SKILL.md`
