# Claude `/resume` 命名冲突审计

> Milestone：M09 / F004  
> 时间：2026-05-07 16:29 +08:00  
> Verdict：needs_fix_in_M10

## 结论

- Claude Code 原生 `/resume` 仍应归 Claude Code 所有。
- Hypo-Workflow 只应拥有 `/hw:resume`。
- 当前 command registry 没有注册裸 `/resume`，`.claude-plugin/plugin.json` 和 marketplace metadata 也没有声明裸 `/resume`。
- 高风险点是 `skills/resume/SKILL.md` 的 frontmatter 仍是 `name: resume`；在 Claude plugin namespace 和自动补全实现里，这可能诱导 `/resume` 走到 Hypo resume skill。
- `hooks/hooks.json` 的 `matcher: resume` 是 Claude SessionStart 事件 matcher，不是 slash command；应在修复文档中明确它不是用户命令入口。

## Findings

| ID | Severity | Evidence | 说明 |
|---|---|---|---|
| `resume-skill-name-conflict` | warn | `skills/resume/SKILL.md` | `name: resume` 可能与 Claude 原生 `/resume` 自动补全冲突。 |
| `sessionstart-resume-matcher` | info | `hooks/hooks.json` | `matcher: resume` 是事件 matcher，不应被解释为 Hypo slash alias。 |

## 已通过的边界

- `commandByCanonical("/resume")` 返回 `undefined`。
- `commandByCanonical("/hw:resume")` 仍返回 Hypo canonical command。
- Claude plugin manifest 没有裸 `/resume`。
- OpenCode 仍使用 `/hw-resume`，不受 Claude 修复影响。

## M10 修复候选

- 为 Claude adapter 增加 autocomplete-safe skill naming 或 manifest-level namespace guard，避免 `name: resume` 被裸命令补全。
- 文档中明确 `/resume` 是 Claude native，`/hw:resume` 是 Hypo pipeline resume。
- 保留自然语言「继续 pipeline」「继续」「下一步」这类明确 Hypo intent 的兼容入口，但不得把裸 slash `/resume` 视作 Hypo alias。
