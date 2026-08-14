---
kind: discussion-summary
cycle: C027-machine-era-dismantle-and-readable-rewrite
updated: 2026-08-14T18:05:00+08:00
raw_discussion: local/discussions/C027-machine-era-dismantle-and-readable-rewrite/
---

# 讨论摘要

## 用户需求

- 审计四块并清理：实验管理清理、减少校验与哈希（人读优先）、zcode/DSH/Kimi 适配、文件与历史清理 + AGENTS.md 生成。
- 澄清补充：彻底根除哈希机制（不只是 Memory）；删除保护过度严格，移除并代之以"反脚手架"原则；测试太多，须有底层逻辑（测试只测机器、文件靠人读）；worktree 足以解决并行写；VSPi 现状由 Agent 核查。

## 已确认决定

- 测试底层逻辑：机器删、机器测试随删；存活约 12 个；catalog 退化为 maintained 小清单。
- 实验：语义文件协议保留，旧实验机器删除（C23 讨论史已核对）。
- 适配器：Kimi 已装做真实最小适配；zcode（智谱）未装只画像；DSH = AGENTS.md 生成做实。
- .pipeline：cycles 平铺不动；archives 核对后删；runtime 提取有效人读文本后删壳；机器权威文件删除；最终五块（INDEX/cycles/memory/experiments/local）。
- AGENTS.md：简单拼装原则段，sync 真正生成，不搞复杂生成器。
- Memory：可读命名 + 分层（global/rules·requirements·knowledge + cycle + inbox）+ 三约束级（constraint/guideline/reference）；收尾前整理 Memory 写入 cycle skill。
- 删除保护移除：hooks 6→4 事件；反脚手架原则写入 AGENTS.md Four-Rule 与 goal/plan skills。
- rules 引擎退役、legacy 实体目录取消（删除记录 = 矩阵 + git tag）。
- 文件清理：I 节清单逐项勾选后才执行；受保护文件删除单独勾选。
- VSPi：0.6.2 不依赖被删机器；投影改读语义文件记入其后续候选，本轮不碰 VSPi 仓库。
- git 历史不碰。

## 接受与拒绝

- 讨论完成检查点：用户确认十项范围充分，授权写 C027 Proposal（2026-08-14）。
- S1：尚未（等待矩阵审阅与 I 节勾选）。

## 未决问题

- S1：矩阵是否接受、I 节各项勾选结果。
