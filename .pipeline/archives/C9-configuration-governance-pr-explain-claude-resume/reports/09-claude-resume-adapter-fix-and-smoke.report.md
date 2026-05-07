# M10 / F004 - Claude 适配修复与烟测报告

> 完成时间：2026-05-07 16:34 +08:00  
> 结果：Pass

## 修复内容

- 移除 `skills/resume/SKILL.md` frontmatter 中的 bare `name: resume`，保留 skill directory 和 command map 的 `/hw:resume` canonical 入口。
- 为 resume skill 增加 `/hw:resume` namespace-only 描述、`disable-model-invocation: true` 和 `argument-hint`，避免 metadata 诱导 Claude native `/resume`。
- 更新 Claude Code guide 生成源，明确：
  - Claude native `/resume` 属于 Claude Code。
  - Hypo workflow resume 是 `/hw:resume`。
  - `hooks/hooks.json` 的 `matcher: resume` 是 SessionStart event matcher，不是用户 slash command。
- 更新 `references/platform-claude.md` 和 `references/commands-spec.md` 的 namespace 边界说明。
- 更新 Claude resume namespace tests：当前仓库应无 `resume-skill-name-conflict`，但 legacy fixture 仍能检测 bare `name: resume`。

## Before / After Alias Matrix

| 输入 / Metadata | Before | After |
|---|---|---|
| `/resume` | 未注册，但可能被 `name: resume` 误导 | 未注册，且 resume skill 不再声明 bare name |
| `/hw:resume` | 正常 Hypo workflow resume | 保持正常 |
| `skills/resume/SKILL.md` frontmatter | `name: resume` | 无 bare `name`，描述限定 `/hw:resume` |
| `hooks/hooks.json matcher: resume` | 事件 matcher，易被误读 | 文档明确不是 slash command |
| OpenCode `/hw-resume` | 正常 | 保持正常 |

## 验证

- `node --test core/test/*claude*resume*.test.js core/test/claude-plugin-alias.test.js core/test/platform-adapters.test.js core/test/skill-quality.test.js`：13/13 通过。
- `claude plugin validate .`：Validation passed。
- `node cli/bin/hypo-workflow sync --check-only --project .`：derived=fresh。
- `npm test --prefix core`：344/344 通过。
- `git diff --check`：通过。

## 边界

- 未修改用户 `~/.claude`。
- 未执行 plugin install。
- 未声称能控制 Claude Code 内置 autocomplete；本次只保证 Hypo metadata 不把裸 `/resume` 表示为 Hypo alias。
