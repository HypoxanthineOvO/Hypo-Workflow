# M11 / F005 - 人读文档中文主体化报告

> 完成时间：2026-05-07 16:40 +08:00  
> 结果：Pass

## 交付内容

- 新增 `checkDocsLanguage()` 文档语言自检 helper，覆盖 README、README 引用链、docs/reference、platform guides 和关键 references。
- 更新 docs generator source，使 `docs/user-guide.md`、`docs/developer.md`、platform guides、commands/platforms/generated-artifacts references 都保留中文主体说明。
- 给关键 references 增加中文主体入口说明：
  - `references/commands-spec.md`
  - `references/pr-spec.md`
  - `references/explain-spec.md`
  - `references/platform-claude.md`
- 更新 docs governance tests，要求 human-facing docs 和关键 references 通过中文主体自检。
- 保留 command、config key、file path、provider、hook event、evidence packet 等英文术语，避免破坏实现和测试引用。

## 自检结果

- `checkDocsLanguage(".")`：通过，检查 17 个文档入口。
- `docs/reference/commands.md`、`docs/reference/platforms.md`、`docs/reference/generated-artifacts.md` 已由生成器补充中文解释。
- `docs/platforms/*.md` 已由生成器输出中文标题、安装/同步、支持能力和边界说明。

## 验证

- `node --test core/test/docs-governance.test.js core/test/readme-spec.test.js core/test/readme-update.test.js core/test/claude-plugin-alias.test.js`：22/22 通过。
- `npm test --prefix core`：345/345 通过。
- `bash scripts/validate-config.sh .pipeline/config.yaml`：通过。
- `node cli/bin/hypo-workflow sync --check-only --project .`：derived=fresh。
- `git diff --check`：通过。

## 保留英文术语类别

- Slash commands：如 `/hw:plan`、`/hw:pr`、`/hw:explain`。
- 配置键和 schema 字段：如 `automation.level`、`execution.worker_separation.mode`。
- 文件路径和 artifact 名称：如 `.pipeline/state.yaml`、`.opencode/commands/hw-explain.md`。
- 平台/API 术语：如 PR/MR、provider、SessionStart、PermissionRequest、evidence packet、unknowns。
