---
name: knowledge
description: Inspect and maintain Hypo-Workflow Knowledge Ledger records, indexes, compact summaries, and secret references under `.pipeline/knowledge/`.
---

# /hypo-workflow:knowledge
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for `/hw:knowledge` and OpenCode `/hw-knowledge`.

## 前置条件

- `.pipeline/config.yaml` should be read when config defaults affect loading, compaction, redaction, or strictness.
- `.pipeline/knowledge/` may be absent on older projects; report an empty ledger instead of failing.
- Raw record reads should happen only when the user asks for a specific `view` or narrow `search`.

## 执行流程

1. Read `references/knowledge-spec.md`.
2. Resolve `knowledge.*` config from project > global > defaults.
3. For `list`, read compact and index files first; list record ids, categories, tags, and sources when available.
4. For `view <id>`, open only the matching `.pipeline/knowledge/records/*.yaml` file.
5. For `compact`, display or regenerate `.pipeline/knowledge/knowledge.compact.md` according to the user's requested action.
6. For `index`, inspect or regenerate category indexes under `.pipeline/knowledge/index/`.
7. For `search`, filter by category, tag, source, or text, and open raw records only for matching candidates.
8. Redact secret-like fields before showing any record content.

## 指令语义

- `list`: show available categories, compact summary status, and record ids.
- `view`: show one redacted record.
- `compact`: show or regenerate the compact summary.
- `index`: show or regenerate generated category indexes.
- `search`: filter by `category`, `tag`, `source`, or free text.

## 安全规则

- Never write raw API keys, tokens, passwords, authorization headers, or secrets into `.pipeline/`.
- Real values belong in `~/.hypo-workflow/secrets.yaml` or environment variables.
- Keep `.pipeline/state.yaml` compact; do not store full knowledge records in runtime state.
- This skill is not a runner and does not execute Milestones.
- M01 defines the contract. Full hook capture and automatic SessionStart integration belong to later milestones.

## 参考文件

- `references/knowledge-spec.md`
- `references/config-spec.md`
- `references/commands-spec.md`
- `references/state-contract.md`
- `SKILL.md`
