# M3 — Prompt/Skill/Rules 冗余与冲突审查

## 目标

审查早期规则、skills、prompts、命令说明中是否存在过时、重复、冲突、低使用价值或 source-of-truth 漂移。

## 审查问题

- 同一规则是否在根 SKILL、子 skill、AGENTS、adapter prompt 中重复且不一致？
- 是否存在低使用价值命令或语义（例如 stop）需要保守标记为降级/合并候选？
- 早期平台、旧命令、旧字段是否残留并造成歧义？
- Prompt/Skill 是否过度指令化，造成执行时冲突或上下文膨胀？

## 工作要求

1. 只读审查，采取保守标记：不直接建议删除，先列候选和风险。
2. 区分正式 finding 与 refactor opportunity。
3. 标记建议 source-of-truth 和派生视图。

## 输出

写入 `.pipeline/reports/C14-M3-prompt-rules-audit.md`，至少包含：

- Duplicate instruction matrix
- Conflict list
- Historical residue list
- Low-value command/semantic candidates
- Source-of-truth consolidation suggestions
- Findings table

## 验收

- 重复/冲突项必须引用至少两个证据位置。
