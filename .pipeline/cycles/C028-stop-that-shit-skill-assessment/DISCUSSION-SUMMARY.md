---
kind: discussion-summary
cycle: C028-stop-that-shit-skill-assessment
updated: 2026-08-21T00:00:00+08:00
raw_discussion: local/discussions/C028-stop-that-shit-skill-assessment/
---

# 讨论摘要

## 用户需求

- 在 GitHub 上查找 Stop That Shit Skill，确认是否存在并阅读理解。
- 介绍该 Skill 的内容和结构。
- 若能找到，将这项评估作为一个新的 Cycle。
- 后续工作严格遵循 Stop That Shit 原则，并把防止无用 hash 和胡乱重构的部分作为 Hypo-Workflow 通用原则集成。
- 用户指出当前 Plan Discussion 缺少早期类似 P0 Configure 的必问工程边界，认为当前 Plan 质量很差，并询问能否在本 Cycle 工程化修复。

## 当前边界

- 本轮只进行来源核验、阅读和介绍，不进行安装或集成。

## 已确认决定

- 已找到后建立新的 C028 Cycle。
- 评估边界先停在来源、理解、介绍和适配价值讨论，不直接安装或移植。
- Stop Ladder、无用 hash 禁止和未经请求的相邻重构禁止是项目级长期约束，已通过 Maintain 保存；具体产品集成仍按 Discussion → Proposal → 执行门推进。
- 集成方向选择“语义原则 + 适量机器 Guard”，不全量搬入 Stop That Shit；Guard 主要面向 GPT/Codex。
- Guard 强度选择“hash 窄硬门 + 重构语义约束”；倾向不引入 Stop That Shit 的 mode。
- Plan 修复选择最小 P0 工程合同：保留 `Discussion → Technical → Architecture → Write Plan`，用文字引导 P0，不恢复旧轨道、评分、Discussion Package 或独立状态机。
- 接受 P0 四种答案来源标签：`user-confirmed`、`evidence-established`、`agent-default`、`user-decision-required`。明确不把它实现为状态机或独立运行时对象。
- 接受文字版 P0 的六项固定内容：目标类型、交付边界、必要扩展、高影响动作、完成证据、未决授权；不固定询问 subagent、自动化等级或全量回归。
- 必要 hash 采用 Cycle 级 P0 标记：`hash=allow + purpose + consumer`；只在 Session 聚焦该 active Cycle 时生效。正式排除 STS mode，不引入 session contract 或 Runtime。
- Hash Guard 覆盖写入、inline/direct hash，并在执行本地未跟踪或已修改脚本前补查新增 hash API；不递归扫描未修改脚本、依赖图或程序运行时，且不把脏改动归因于 GPT。
- 接受集成 Architecture：通用原则、Plan/Goal 文字引导、语义模板、Codex 窄 Guard、Bad/Good 契约测试和直接冲突文档；不增加外部依赖、公开命令、状态机、Runtime、STS mode 或文件锁。

## 已确认事实

- 原始来源是公开仓库 `lennney/stop-that-shit`，最新 release `0.1.0`。
- Skill 与 Guard 分层：Skill 可独立运行，Guard 通过 Hook 在支持的 action path 上执行有限边界。
- 仓库覆盖 Codex、Claude Code、OpenCode、Hermes；有统一 ControlEvent v1、四类失败族（Scope/Hash/Intent/Thrash）、Bad/Good 案例和 paired eval。
- 仓库测试 182 项中 181 项通过；OpenCode smoke 受当前环境版本和本地打包入口影响失败。
- C10/C11 曾有 Discover 前的 P0 Configure，覆盖自动化、subagent、验收、远端写、全量回归、analysis 边界与 worker separation；该机制在 C027 语义简化后不再属于活跃执行面。
- 当前 Plan Skill 有讨论流程门，但没有稳定的 Cycle 工程决策内容合同；源码版与当前安装包的 Plan Skill 还存在文案漂移。

## 未决问题

- Discussion 完成检查点已通过，用户授权写 Proposal。用户随后选择“确认但不开始”：Proposal 已批准，执行项保持 pending，等待后续明确开始。
