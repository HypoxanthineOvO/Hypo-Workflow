# C14 修复队列

## 按优先级排列的修复建议

| 优先级 | 修复项 | 域 | 建议 Milestone |
|---|---|---|---|
| 1 | 补齐 CONTRIBUTING.md + developer.md 核心内容 | docs | M-DOCS |
| 1 | 翻译 configuration.md 英文版 | docs | M-DOCS |
| 2 | 统一 code_quality 评分方向 | spec | M-EVAL |
| 2 | 明确 V4 STOP 规则兼容性 | spec | M-EVAL |
| 3 | 运行 sync 更新所有平台生成物到 v12.7.0 | sync | M-SYNC |
| 3 | 生成 analysis sidecar 文件 | sync | M-SYNC |
| 4 | 裁决 SKILL.md 与独立 Skill 的重叠策略 | architecture | M-PROMPT |
| 4 | 清理 dashboard 退役文件 | cleanup | M-PROMPT |
| 4 | 创建 claude-hw-command-namespace 规则文件 | rules | M-RULES |
| 5 | 修复 i18n 测试脆性（23 个失败） | test | M-TEST |
| 5 | 修复 readme-update.test.js 硬编码命令计数 | test | M-TEST |
| 6 | 补齐 Claude Code 缺失 agent | claude | M-GAPS |
| 6 | 补齐缺失文档翻译 | docs | M-DOCS |
| 6 | 补齐 current.phase 和 decomposed 状态定义 | spec | M-SPEC |
| 7 | 补充 user-guide.md "阻塞怎么办" | docs | M-DOCS |
| 7 | 明确输出语言规则的重叠策略 | refactor | M-PROMPT |
| 7 | 明确 commandMap 双源关系 | generator | M-SYNC |

## Milestone 候选

| Milestone | 内容 | 预估工作量 |
|---|---|---|
| M-DOCS | CONTRIBUTING.md + developer.md 扩展 + configuration.md 翻译 | 中 |
| M-EVAL | code_quality 评分统一 + V4 兼容性说明 | 小 |
| M-SYNC | sync 更新生成物 + analysis sidecar + commandMap 双源文档化 | 小 |
| M-PROMPT | SKILL.md 分层裁决 + dashboard 清理 + 输出语言规则集中化 | 中 |
| M-TEST | i18n 测试修复 + 硬编码命令计数修复 | 中 |
| M-RULES | claude-hw-command-namespace 规则创建 | 小 |
| M-GAPS | Claude agent 补齐 + 文档翻译补齐 | 中 |
| M-SPEC | current.phase needs_revision + decomposed 语义明确 | 小 |
