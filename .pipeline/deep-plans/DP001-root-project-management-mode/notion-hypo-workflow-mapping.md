# Hypo-Workflow Notion 映射 Dry Run 报告

生成时间：2026-05-18T17:58:45+08:00

范围：对现有 Notion 页面 `Hypo-Workflow`（`528322b7-e9d5-40bd-a2e8-8350602c9feb`）进行只读 dry-run 分析。本轮没有写入 Notion。

## 读取证据

- 页面标题：`Hypo-Workflow`
- 页面最后编辑时间：2026-05-16T05:23:00.000Z
- 已读取顶层 blocks：87
- 已读取顶层 child pages：34
- 渲染后的 Markdown 长度：613 行
- 认证说明：默认 `ntn` keychain 访问报错 `Failed to create keychain entry`；本次 dry-run 只把已有本地 token 文件作为单次进程的 `NOTION_API_TOKEN` 环境变量使用。token 未被打印、复制，也没有写入仓库文件。

## 目标树

```text
Project Home（项目主页）
├── Overview（项目概览）
├── Progress（进度）
│   ├── 项目进度总览
│   ├── Cycle 列表
│   └── 待同步/待整理事项
├── Architecture（架构）
│   ├── 当前架构
│   ├── 架构图
│   ├── 关键决策
│   └── 旧设计整理
├── Knowledge（知识沉淀）
│   ├── 经验
│   ├── 规则
│   └── 参考
├── Docs（正式文档）
│   ├── User Docs
│   ├── Developer Docs
│   ├── Specs
│   └── Release Docs
├── Prompts Index（Prompt 索引）
└── Reports Index（Report 索引）
```

Prompts 和 Reports 的 canonical 内容放在各自 Cycle 页面下；全局页面只做索引和检索入口，并回链到 Cycle 内的 canonical 位置。

## 总体判断

当前 Notion 页面不是空同步目标，而是一个旧版手工 Project Home。它的顶层内容混合了项目概览、早期架构/规格、发布历史、未来路线图、讨论占位和历史版本/Prompt 子页。因此第一版同步不应该替换页面、追加新分区或新建隔离同步页，而应该先生成整理与合并计划。

该页面也明显落后于本地仓库：Notion 当前状态仍写着 `v9.1.0 (C2)`，而本地 README/release authority 已是 `v12.8.1`，当前活跃 Cycle 是 `C16`。合并计划必须把本地 `.pipeline` 与 release artifact 作为当前状态权威。

## 顶层 Block 映射

| 源内容 | 目标位置 | 动作 | 说明 |
|---|---|---|---|
| 开头产品介绍 callout | `Overview` | 合并/更新 | 保留为简洁项目描述，但措辞应从当前 README 刷新。 |
| 当前状态 callout `v9.1.0 (C2)` | `Progress/项目进度总览` | 由本地权威替换 | 已过期；应从 README、release v12.8.1 和当前 C16 状态更新。 |
| `项目简介` / 解决的问题 / 核心流程 | `Overview` | 合并 | 适合作为 Project Home 概览，可压缩并链接到正式文档。 |
| `关键设计原则` | `Overview` 与 `Architecture/关键决策` | 拆分 | 面向用户的原则放 Overview；设计 rationale 放 Architecture 决策页。 |
| `技术栈` 表格 | `Architecture/当前架构` 或 `Docs/Developer Docs` | 合并/更新 | 需要对照当前 platform/core 架构刷新。 |
| `架构设计` section | `Architecture/当前架构` | 合并/更新 | 属于早期架构说明，保留前需要更新。 |
| `目录结构` code block | `Architecture/当前架构` 与 `Docs/Developer Docs` | 合并/更新 | 当前 repo 结构可能已经变化，写入前需要校验。 |
| `执行流水线` Mermaid/code | `Architecture/架构图` | 合并/更新 | 适合作为架构图，但应对齐当前 Cycle/Patch/Analysis 模式。 |
| `三种 Preset` 表格 | `Docs/User Docs` 或 `Docs/Specs` | 合并/更新 | 同时有用户概念说明和规格表属性。 |
| `配置示例（config.yaml）` | `Docs/Specs` | 合并/更新 | 需要和当前 config schema 对齐。 |
| `状态机（state.yaml）` | `Docs/Specs` | 合并/更新 | 需要和当前 state contract 对齐。 |
| `开发路线` 表格 | `Progress/Cycle 列表` | 转换 | 将旧 V0-V9.1 路线图转换成历史进度记录，不作为当前状态。 |
| `测试项目：hypo-todo` | `Docs/Developer Docs` 或 `Knowledge/参考` | 保留为引用 | 历史验证样例，可作为参考资料。 |
| `Prompt 序列` 表格 | `Prompts Index` 与 legacy Cycle 页面 | 建索引 | 视为 hypo-todo 的旧 Prompt 序列，不等同于当前 C16 prompts。 |
| `Release 计划` | `Docs/Release Docs` | 迁移/归档 | 属于历史 release 计划；当前 release docs 另行链接。 |
| `后续路线图（Release 之后）` | `Progress/待同步/待整理事项` 与 `Architecture/旧设计整理` | 分类 | 混合已完成项和过期未来想法，需要 item-level 对账。 |
| `讨论与设计` 占位 | `Knowledge/参考` 或删除 | 复核 | 目前没有实质内容。 |
| `开发日志` 占位 | `Progress/Cycle 列表` 或删除 | 复核 | 目前没有实质内容。 |

## 子页映射

| 源子页 | 目标位置 | 动作 | 置信度 | 说明 |
|---|---|---|---|---|
| `V0 — 最小可用 Pipeline` | `Progress/Cycle 列表` + `Architecture/旧设计整理` | 迁移旧 milestone | 高 | 早期版本 milestone 和设计背景。 |
| `V0.5 — hypo-todo 测试验证` | `Progress/Cycle 列表` + `Docs/Developer Docs` | 迁移旧 milestone/参考 | 高 | 验证与测试项目材料。 |
| `V1 — Subagent 调度` | `Architecture/旧设计整理` | 迁移旧设计 | 高 | execution/subagent model 的设计演进。 |
| `V2 — Notion Adapter` | `Architecture/旧设计整理` + `Docs/Specs` | 迁移旧设计/规格 | 高 | 和 Notion adapter 历史直接相关。 |
| `V2.5 — Skill 结构升级 + Plugin 化` | `Architecture/旧设计整理` | 迁移旧设计 | 高 | Skill/plugin 结构历史。 |
| `V3 — Hook 强化（Claude Code 专项）` | `Architecture/旧设计整理` + `Docs/Developer Docs` | 迁移旧设计 | 高 | 平台专项架构历史。 |
| `V4 — 智能评估` | `Architecture/旧设计整理` | 迁移旧设计 | 高 | 评估机制设计历史。 |
| `V4.5 — Slash 指令系统` | `Architecture/旧设计整理` + `Docs/User Docs` | 迁移旧设计 | 高 | command system 历史，也可沉淀成用户文档素材。 |
| `V5 — Plan Mode + 架构追踪` | `Architecture/旧设计整理` + `Progress/Cycle 列表` | 迁移旧 milestone | 高 | 当前 Plan flow 的重要前身。 |
| `V6 — Project Lifecycle` | `Architecture/旧设计整理` + `Docs/Specs` | 迁移旧设计/规格 | 高 | lifecycle model 历史。 |
| `V6.1 — 跨平台插件分发（Plugin Marketplace + Codex Skill）` | `Architecture/旧设计整理` + `Docs/Developer Docs` | 迁移旧设计 | 高 | 平台分发历史。 |
| `V6.2 — Claude Code 原生 Skill 拆分 + 执行体验优化` | `Architecture/旧设计整理` | 迁移旧设计 | 高 | Skill 拆分与执行体验历史。 |
| `V7 — Setup 向导 + WebUI Dashboard` | `Architecture/旧设计整理` + `Progress/Cycle 列表` | 迁移旧 milestone | 高 | setup/dashboard 历史。 |
| `V7.1 Prompt — setup 重构 + 使用教学增强` | Cycle canonical prompt area 或 `Prompts Index` | 归类为旧 Prompt | 高 | 标题显示这是 Prompt artifact。 |
| `B3 — Hypo-Agent 重构审计（实战测试）` | `Knowledge/经验` + `Progress/Cycle 列表` | 迁移 case study | 中 | 更像实战测试/案例，而不是版本设计。 |
| `V8 — Cycle 生命周期 + Patch 轨道 + Auto Resume` | `Architecture/旧设计整理` + `Progress/Cycle 列表` | 迁移旧 milestone | 高 | 当前 Cycle/Patch 系统的直接前身。 |
| `V8 Prompt — Cycle 生命周期 + Patch 轨道 + Plan 交互强化` | Cycle canonical prompt area 或 `Prompts Index` | 归类为旧 Prompt | 高 | V8 的 Prompt 页面。 |
| `V8.1 — History Import（Git 历史导入）` | `Architecture/旧设计整理` + `Docs/Specs` | 迁移旧设计/规格 | 高 | legacy import 功能历史。 |
| `V8.1 Prompt — History Import（Git 历史导入）` | Cycle canonical prompt area 或 `Prompts Index` | 归类为旧 Prompt | 高 | V8.1 的 Prompt 页面。 |
| `V8.2 — Patch 执行流 + Context Compact + Interactive Guide` | `Architecture/旧设计整理` + `Docs/User Docs` | 迁移旧设计 | 高 | 功能历史，同时可作为用户文档素材。 |
| `V8.2 Prompt — Patch Fix + Context Compact + Interactive Guide` | Cycle canonical prompt area 或 `Prompts Index` | 归类为旧 Prompt | 高 | V8.2 的 Prompt 页面。 |
| `V8.3 — Showcase 指令 + i18n Fix` | `Architecture/旧设计整理` + `Docs/User Docs` | 迁移旧设计 | 高 | 功能历史与文档素材。 |
| `V8.3 Prompt — Showcase 指令 + i18n Fix` | Cycle canonical prompt area 或 `Prompts Index` | 归类为旧 Prompt | 高 | V8.3 的 Prompt 页面。 |
| `V8.4 — Rules 独立化 + 用户自定义规则` | `Architecture/旧设计整理` + `Docs/Specs` | 迁移旧设计/规格 | 高 | rules model 历史。 |
| `C3 设计需求 — Test Profiles + /hw:chat + Discover 递进` | `Architecture/旧设计整理` + `Progress/Cycle 列表` | 迁移旧 Cycle/设计 | 高 | Cycle-like 设计需求。 |
| `V10 设计需求 — Analysis Preset（数据分析 / 问题定位 / 调试跟踪）` | `Architecture/旧设计整理` + `Progress/待同步/待整理事项` | 对账 | 中 | 部分能力可能已经在本地实现，需要对照当前 Analysis artifacts。 |
| `C4a 设计需求 — 全局管理 TUI（Global Management Console）` | `Architecture/旧设计整理` + `Progress/待同步/待整理事项` | 对账 | 中 | 与当前 C16 根目录项目管理讨论相关，但不能直接视为同一设计。 |
| `C4b 设计需求 — 验收-打回闭环（Accept / Reject Loop）` | `Architecture/旧设计整理` + `Docs/Specs` | 迁移/对账 | 高 | acceptance loop 后续似乎已实现，需要对照本地 archives/specs。 |
| `C4c 设计需求 — 探索模式（/hw:explore）` | `Architecture/旧设计整理` + `Docs/User Docs` | 迁移/对账 | 高 | explore command 已进入当前 Workflow，需要对照本地文档。 |
| `C4d 设计需求 — 项目知识库自动沉淀（Knowledge Ledger）` | `Architecture/旧设计整理` + `Knowledge/规则` | 迁移/对账 | 高 | 直接映射到 Knowledge Ledger 域。 |
| `系统测试方案` | `Docs/Specs` + `Knowledge/参考` | 迁移 | 中 | 测试计划/规格参考。 |
| `Release Prompt — Git 整理 + GitHub 仓库创建` | Cycle canonical prompt area 或 `Prompts Index` | 归类为旧 Prompt | 高 | Prompt artifact。 |
| `README.md 内容` | `Docs/User Docs` | 迁移/更新 | 高 | 旧 README 内容；当前 README 是本地权威。 |
| `Hypo-Workflow 使用指南` | `Docs/User Docs` | 迁移/更新 | 高 | 用户文档素材；需要对照当前 `docs/user-guide.md`。 |

## 建议的 Dry-Run 动作

1. 将开头两个 callout 作为 `Overview` 和 `Progress/项目进度总览` 的种子，但用本地当前数据替换过期状态。
2. 将架构相关正文迁移/合并到 `Architecture/当前架构`、`Architecture/架构图` 和 `Architecture/关键决策`。
3. 将 `开发路线` 表格和版本子页转换成 `Progress/Cycle 列表` 下的历史进度记录，并保留原页面链接。
4. 将 V/C 设计页暂放入 `Architecture/旧设计整理`，等 item-level 对账后再判断已实现、过期或仍待办。
5. 将 Prompt 命名的页面纳入全局 `Prompts Index`，并链接回推断出的 legacy cycle/version。
6. 将用户文档、开发文档和参考资料纳入 `Docs/*`，但内容冲突时以本地当前 README/docs/release 文件为权威。
7. 将实践经验、历史测试案例和可复用结论纳入 `Knowledge/经验` 或 `Knowledge/参考`。

## 冲突与过期点

- Notion 当前状态已过期：远端写着 `v9.1.0 (C2)`，本地权威是 `v12.8.1`，当前活跃 Cycle 是 `C16`。
- 很多 V/C 子页可能和本地 `.pipeline/archives/`、`references/` 重叠；合并时应去重，不要复制出两套旧设计页。
- 当前 Notion 正文中的早期目录、配置和 state 示例可能已经不符合 v12.8.1 代码库。
- C4a global management console 与当前 C16 根目录项目管理模式有概念重叠，但需要 reconciliation，不能直接等同。

## 推荐下一步

生成一个结构化本地 mapping manifest，字段建议如下：

```text
source_id | source_title | source_type | proposed_target_path | action | confidence | needs_refresh | authority_hint | notes
```

在任何 Notion 写入前，先审阅这个 mapping manifest，并决定是否需要继续深入读取 34 个 legacy child pages 的正文。
