# M09 / F004 - Claude `/resume` 冲突审计报告

> 完成时间：2026-05-07 16:30 +08:00  
> 结果：Pass，进入 M10 修复

## 审计结论

- Hypo command registry 没有注册裸 `/resume`，`/hw:resume` 仍是唯一 canonical workflow resume command。
- `.claude-plugin/plugin.json` 和 `.claude-plugin/marketplace.json` 没有声明裸 `/resume`。
- 当前主要风险点是 `skills/resume/SKILL.md` 的 frontmatter `name: resume`，在 Claude plugin namespace/autocomplete 语义里可能与 Claude Code 原生 `/resume` 混淆。
- `hooks/hooks.json` 的 `matcher: resume` 是 Claude SessionStart 事件 matcher，不是 slash command alias；M10 文档需要明确这一点，避免误读。
- 修复应限定在 Hypo metadata、skill naming/docs、generated adapter source，不应尝试修改 Claude Code 内置行为。

## 产出

- 新增 `core/src/claude-resume/index.js`，提供 `auditClaudeResumeNamespace()` 和 `renderClaudeResumeAudit()`。
- 新增 `core/test/claude-resume-namespace.test.js`，覆盖 `/resume` 不被 Hypo registry 接管、`/hw:resume` 保持可用、当前 skill name collision 被审计出来。
- 更新 `references/commands-spec.md`，明确 Claude native `/resume` 属于 Claude Code，Hypo 不得把裸 `/resume` 注册或文档化为 `/hw:resume` alias。
- 新增审计 artifact：`.pipeline/reviews/C9-resume-conflict-audit/M09/namespace-audit/audit.md`。

## 验证

- `node --test core/test/*claude*resume*.test.js core/test/claude-plugin-alias.test.js core/test/commands-rules-artifacts.test.js`：11/11 通过。
- `claude plugin validate .`：Validation passed。
- `npm test --prefix core`：343/343 通过。
- `bash scripts/validate-config.sh .pipeline/config.yaml`：通过。
- `node cli/bin/hypo-workflow sync --check-only --project .`：derived=fresh。
- `git diff --check`：通过。

## M10 修复计划

- 消除或隔离 `skills/resume/SKILL.md` 的 bare `name: resume` 对 Claude autocomplete 的误导，同时保留 `/hw:resume` canonical command。
- 更新 Claude Code guide 和 smoke 文档，明确 `/resume` 与 `/hw:resume` 的边界。
- 确保 sync/Claude plugin artifact generator 不会重新生成冲突 metadata。
