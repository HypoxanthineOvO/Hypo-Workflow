---
name: quality
description: Generate one-time or comparative code quality scorecards when the user wants evidence-backed quality review, baseline, compare, or quality action planning.
---

# /hypo-workflow:quality
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

使用此技能生成代码质量评分报告、baseline、compare、review 或 quality action queue。`/hw:quality` 是一等命令，负责“质量有多好、哪里值得优化、是否达到质量阈值”；它不替代 `/hw:audit` 的风险治理 gate。

## Preconditions

- 源代码、架构基线或目标 scope 应该可读。
- 如果用户未给出 scope，默认检查当前项目。
- 如果发现 Critical 风险、安全问题、数据损坏风险或正确性不明，升级到 `/hw:audit`。

## Execution Flow

1. Intake：确认 scope、目标、baseline/compare/review 模式、正确性约束和验证命令。
2. 读取 `references/quality-spec.md`。
3. 收集本地证据：代码结构、测试、docs、recent diff、架构基线和已有 reports。
4. 按 1-5 分为各维度评分，必须附证据。
5. 计算 gate：
   - Overall >= 4 才算质量通过。
   - Core dimensions 必须 >= 3：Correctness、Maintainability、Structure/Organization。
6. 写入 `.pipeline/quality/quality-NNN.md`。
7. 维护 `.pipeline/quality/actions.yaml`，记录需要进入 Patch、Plan、Optimize 或人工处理的 action。
8. 如果使用状态跟踪，记录 `.pipeline/quality/state.yaml` 和 `.pipeline/log.yaml` lifecycle entry。

## Modes

- `scorecard`：一次性评分报告。
- `baseline`：建立后续 compare 的基线。
- `compare`：比较当前质量与 baseline 或前一报告。
- `review`：围绕某个范围做轻量质量审查。
- `action queue`：只整理可执行质量优化队列。

## Safety Rules

- 不要把质量评分伪装成风险审计；风险阻断交给 `/hw:audit`。
- 不要只给主观分数；每个分数必须有文件、测试、报告或结构证据。
- 不要要求无边界重构；大范围优化必须转 `/hw:plan`，小范围修复可转 `/hw:patch`。

## Reference Files

- `references/quality-spec.md`
- `references/evaluation-spec.md`
- `references/completion-report-contract.md`
- `references/commands-spec.md`
- `SKILL.md`
