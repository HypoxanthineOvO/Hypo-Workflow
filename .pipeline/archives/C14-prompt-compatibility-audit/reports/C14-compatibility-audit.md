# C14 兼容性审查 — 综合报告

## 审查概述

- **Cycle**: C14 — Prompt 兼容性审查
- **范围**: Workflow 语义、跨平台适配、Prompt/规则冗余、测试健壮性、文档引导
- **平台矩阵**: OpenCode、Claude Code、Codex
- **严重度**: P0-P4
- **原则**: 只审不修，所有发现必须引用证据路径

## 各域汇总

| 域 | P0 | P1 | P2 | P3 | P4/Info |
|---|---|---|---|---|---|
| M1: Workflow 语义 | 0 | 2 | 2 | 3 | 0 |
| M2: 平台适配器 | 0 | 1 | 3 | 4 | 2 |
| M3: Prompt/Rules | 0 | 5 | 8 | 6 | 5 |
| M4: 测试健壮性 | 0 | 0 | 3 | 5 | 0 |
| M5: 文档与引导 | 6 | 7 | 6 | 0 | 0 |

## P0 发现（阻塞级）

| # | 域 | 标题 |
|---|---|---|
| C14-F001 | M5 | `CONTRIBUTING.md` 完全缺失 |
| C14-F002 | M5 | `docs/developer.md` 无命令/Skill 添加指南 |
| C14-F003 | M5 | `docs/developer.md` 无测试执行/编写说明 |
| C14-F004 | M5 | `docs/en/reference/configuration.md` 英文版严重滞后 |
| C14-F005 | M5 | 无平台适配器添加流程文档 |
| C14-F006 | M5 | 无代码风格/规则文档 |

## P1 发现（高危级）

| # | 域 | 标题 |
|---|---|---|
| C14-F101 | M1 | `code_quality` 评分方向矛盾（1→5 优劣逆转） |
| C14-F102 | M1 | V4 STOP 规则与 V1 兼容性不明确 |
| C14-F103 | M2 | OpenCode 生成物版本 v12.5.2，仓库 v12.7.0 |
| C14-F104 | M3 | 根 SKILL.md 与 commands-spec.md 命令列表不同步 |
| C14-F105 | M3 | 根 SKILL.md (1017行) 与独立 Skill 高度重叠 |
| C14-F106 | M3 | dashboard Skill 退役但文件仍存在 |
| C14-F107 | M3 | `claude-hw-command-namespace: error` 规则无对应 defined 文件 |
| C14-F108 | M3 | 输出语言规则在 40 个 Skill 中逐字重复（约 280 行） |
| C14-F109 | M5 | user-guide.md "阻塞怎么办" 极弱 |
| C14-F110 | M5 | Claude Code smoke 指南无英文版 |
| C14-F111 | M5 | C6 Claude readiness 报告无英文版 |

## P2 发现（中危级）

| # | 域 | 标题 |
|---|---|---|
| C14-F201 | M1 | `current.phase` 枚举漏洞 (needs_revision)  |
| C14-F202 | M1 | Feature Queue `decomposed` 状态语义不明 |
| C14-F203 | M2 | 缺失 `.opencode/hypo-workflow.json.analysis` |
| C14-F204 | M2 | commandMap 在 .ts 和 .json 中完全重复 |
| C14-F205 | M2 | Claude Code 缺少 4 个 agent (build/status/explore/code-b) |
| C14-F206 | M3 | dashboard Skill 仍在文件系统但命令映射已移除 |
| C14-F207 | M3 | `skill-spec.md` 声称 40 Skills 但只列 39 行 |
| C14-F208 | M3 | `/hw:review` 是仅打印迁移警告的别名 |
| C14-F209 | M3 | root SKILL.md 与独立 Skill 行为定义三层重复 |
| C14-F210 | M4 | `readme-update.test.js` 硬编码 36 条命令计数 |
| C14-F211 | M4 | 23 个测试因 i18n 英文正则失败（文档中文化） |
| C14-F212 | M5 | Cycle 生命周期文档不完整 |
| C14-F213 | M5 | `state.yaml` schema 无参考文档 |
| C14-F214 | M5 | Codex AGENTS.md 集成无文档 |

## P3 发现（改进级）

选列：日志开始事件写入时机缺失、history.completed_prompts 命名误导、opencode.json 双份、节点测试 i18n 脆性、场景回归显示 53/68 通过、Python 测试需 Token 等。

## Suggested Fix Queue

| 优先级 | 修复方向 | 建议 Milestone |
|---|---|---|
| 1 | 补齐 CONTRIBUTING.md + developer.md 核心内容 | M-DOCS |
| 2 | 统一 code_quality 评分方向，明确 V4 兼容规则 | M-EVAL |
| 3 | 运行 sync 更新所有平台生成物到 v12.7.0 | M-SYNC |
| 4 | 裁决 SKILL.md 与独立 Skill 的重叠策略 | M-PROMPT |
| 5 | 修复 i18n 测试脆性 | M-TEST |
| 6 | 补齐缺失的 analysis sidecar、Agent、文档翻译 | M-GAPS |

## Pending Hypotheses

- `plan:generate` 是否设置 `current.phase` 到 `plan_generate`？
- `review_tests`/`review_code` 的 Worker Separation 角色分配是否明确？
- 输出语言规则的重叠是 "自包含设计" 还是应集中引用？
- `/hw:stop` 在实际交互中是否仍被使用？
