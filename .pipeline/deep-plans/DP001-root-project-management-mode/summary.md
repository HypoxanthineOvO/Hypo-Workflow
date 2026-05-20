# 根目录项目管理模式

这是普通 plan 转换前使用的持久 Deep Plan 讨论包。

Status: ready_for_plan
Readiness depth: conversion_ready

为 Hypo-Workflow 设计一个新的根目录项目管理模式：在根目录集中管理多个 Workflow 项目的进度、同步、状态摘要和跨项目操作边界。当前阶段只做 Deep Research + Deep Plan，不进入实现。

## Conversation Summary

用户将进度锚定页具体化为 Project Home：每个项目有 README-like 项目主页，首页放项目介绍、当前状态和进度图表；具体进度细节在子页面中按 Cycle 组织，一个 Cycle 一个页面；Knowledge/docs 等在项目主页下建立子页面并按本地文件夹结构继续嵌套。Deep Research 第一批试点先聚焦当前 Hypo-Workflow 项目。只读 ntn discovery 已确认用户现有 Notion 结构：Hypoxanthine's Home 是 workspace 根页面，Hypo Projects 是页面列中的 H1 分组，Hypo-Workflow 是该分组下的普通 child page，内容是 Workflow 早期手工 README/路线图/版本设计子页。用户进一步纠正：新同步结构不应简单追加到旧页，也不应新建隔离页，而应整理现有内容并与当前 Workflow artifacts 合并为一个统一 Project Home。用户明确 Project Home 的 canonical storage model：远端存储按内容域划分，时间线只是内容域下面的局部子模块；索引/快捷查询页可以存在，但必须链接回 canonical 内容页。Architecture、Knowledge、Docs 都应是内容域子页面树，而不是单页字段。用户接受 Progress/Architecture/Knowledge/Docs 的第一版职责划分，并确认 Prompts/Reports 按此前方案处理：canonical 内容放在各 Cycle 子页下，同时生成全局索引页链接回 Cycle。已生成中文本地 Notion mapping dry-run 报告，对 87 个顶层 blocks 和 34 个子页进行目标树分类。用户进一步提出根目录既然有全局层，就应纳入全局规则、全局 Secret 引用维护、全局 Knowledge、项目注册表和项目联动关系，使 Workflow 知道有哪些项目、它们如何共享规则/凭据/知识/同步目标。

## Decisions

- D001: C16 先作为 Deep Plan discussion package 运行，不直接生成 implementation milestones。
- D002: C16 的问题核心是为 Workflow 增加长期维护/运营态，而不只是根目录项目列表或一次性同步 Cycle。
- D003: 首次大规模同步可以仍然走 Cycle；后续日常同步应进入独立于 Cycle/Patch 的维护阶段。
- D004: C16 的主目标是设计 Workflow 的长期维护对象模式；根目录中控台只是该模式的可选入口或聚合视图。
- D005: Notion 同步应被建模为长期维护模式的首个 domain adapter，而不是 Workflow 内置的唯一目的。
- D006: 通用长期维护模式是必要方案；窄版 Notion 项目同步不足以覆盖进度、架构图、prompt、report、文档等多类 Workflow artifacts。
- D007: 全量 artifact 类型都进入维护同步模型：进度、架构图、prompt、report、文档等都要被支持。
- D008: 设计通用 Storage Sync Template；Notion 是首个 storage adapter，用 ntn 只读调研用户现有页面结构后进行映射。
- D009: 项目同步必须区分 Workflow-managed、pre-Workflow 和 unmanaged 项目。
- D010: C16 第一批 Milestone 应先建立进度锚定页面，再逐类确定 artifact 的存储与投影方式。
- D011: C16 第一批工作应定位为 Deep Research / mapping / dry-run 阶段，而不是立即进入真实 Notion 写入或完整实现。
- D012: 每个项目的进度锚定页应升级为 Project Home：README-like 项目主页 + artifact domain 子页面树。
- D013: 进度图表可放在 Project Home，进度细节按 Cycle 子页面组织，一个 Cycle 一个子页面。
- D014: Knowledge 和文档类 artifact 在 Project Home 下建立子页面，并按本地文件夹结构继续嵌套。
- D015: Deep Research 第一批 Notion/Storage 试点范围先聚焦当前 Hypo-Workflow 项目。
- D016: Notion discovery 必须把 integration 可见范围作为显式 access gate；搜索不到页面时不能继续盲扫或假设路径存在。
- D017: 当前 Hypo-Workflow 的 Notion 既有页应进入整理与合并流程：以现有内容为 legacy corpus，与当前 Workflow artifacts 重组为同一个统一 Project Home，而不是简单追加分区或新建隔离子页。
- D018: Notion 同步第一版需要 Legacy Reconciliation 模型，包含 discover、classify、map、merge-plan、dry-run、apply、verify、record，而不仅是 artifact projection。
- D019: 统一 Project Home 的 canonical 信息架构按内容域组织；时间线只作为内容域内部的子模块，例如每个 Cycle 子页内按时间顺序组织 Prompts 和 Reports。
- D020: Architecture、Knowledge、Docs 都是 Project Home 下的 canonical 子页面树；每个域内部可以继续按文件夹、主题、图表或文档类型嵌套。
- D021: 第一版 Project Home 子树固定为内容域职责页：Progress 包含项目进度总览、Cycle 列表、待同步/待整理事项；Architecture 包含当前架构、架构图、关键决策、旧设计整理；Knowledge 存经验/规则/参考；Docs 按 User Docs、Developer Docs、Specs、Release Docs 分类。
- D022: Prompts 和 Reports 的 canonical 内容放在对应 Cycle 子页下；全局 Prompts/Reports 页面只作为索引/检索视图，链接回各 Cycle 的 canonical 页面。
- D023: 根目录项目管理模式需要一个高于单项目 Project Home 的 Global Workspace 层，负责项目注册、跨项目联动、全局规则、全局 Knowledge、Secret 引用和全局同步目标。
- D024: Global Secret 维护需要允许 raw key 存在于全局本地 secret store，例如未来的 `~/.hypo-workflow/secrets.yaml` 或等价 OS/keychain 后端；仓库、Knowledge Ledger、Project Home 和 Notion 只保存/同步 secret reference、用途、依赖项目、可用性健康状态和 redaction policy。
- D025: 第一版 Global Workspace 应包含 Workspace Home、Project Registry、Project Link Graph、Global Rules、Global Secret References、Global Knowledge Index、Sync Targets 和 Maintenance Queue 八类页面/对象。
- D026: 第一版 Global Workspace 的 source of truth 采用 `~/.hypo-workflow/workspace.yaml`；现有 `~/.hypo-workflow/projects.yaml` 保持为 Global TUI / project switcher 的轻量派生兼容视图，`~/.hypo-workflow/maintenance/` 存放维护队列、ledger、cache 和 dry-run/apply 证据。
- D027: 第一版 Global Secret Store 使用 `~/.hypo-workflow/secrets.yaml` 作为 raw value authority，支持 global/workspace/project 分层，存储 LLM API Key/Base URL、Notion token、微信公众号 token、Hypo-Claw API 等可用凭据；Agent 可以读取并用于任务集成。
- D028: Agent 读取、迁移或 health check raw secret 时需要写审计事件，但审计事件、workspace projection、Notion、Knowledge、报告、diff 和 log 不得保存 raw value；raw value 只能留在 `secrets.yaml` 或未来等价 secure backend。
- D029: `~/.hypo-workflow/secrets.yaml` 第一版不加密，但必须要求本地文件权限 `0600`，并继续禁止 raw value 进入仓库或同步层。
- D030: Agent 在任务匹配 secret capability / allowed_for 时可以自动读取 raw secret，不需要每次另行询问；读取仍需审计且不得回显 raw value。
- D031: Secret health check 默认使用真实 provider 调用，只记录脱敏状态、时间、checker 和摘要。
- D032: Hypo-Claw API 第一版允许通知任务完成/报告就绪、读状态、拉任务和同步报告。
- D033: `Hypo-Info` 旧版应归档为 legacy/predecessor，`Hypo-Info-V2` 是当前 canonical 项目。
- D034: `Hypo-Agent` 是 `Hypo-Claw` 的前身，应归档为 legacy/predecessor，`Hypo-Claw` 是当前 canonical 项目。
- D035: DR005/DR006 样本集合采用 `Hypo-Info-V2/Hypo-Info`、`Hypo-Claw/Hypo-Agent`、`Hypo-GPU`、`Hypo-Image` 和压力样本 `Hypo-Writer`，覆盖 successor/legacy、local-only current、pre-Workflow、Notion-only/skill-backed、long-running writing maintenance 五类情况。
- D036: DR005 证明 Storage Sync Template 至少需要四类对象形态：current Workflow project with legacy predecessor、pre-Workflow manual project、skill/service object、legacy project corpus。
- D037: DR006 证明 Artifact Catalog 必须记录 freshness、parseability、authority、sensitivity 和 relation provenance；`PROJECT-SUMMARY.md`、`PROGRESS.md` 等派生产物可能相对 state/continuation 过期。
- D038: Global Knowledge v1 采用 global authored records + per-project compact/index derived aggregation；项目 raw Knowledge 不被全局层或 Notion 默认复制。
- D039: Project Link Graph 的 typed edges 由 `workspace.yaml` 掌权；Project Registry 只负责对象身份，Knowledge/Notion/Project Home 都是关系投影面。
- D040: 同步必须从第一版支持字段级 authority/conflict matrix；Notion 是 projection 与 legacy corpus 面，不能覆盖当前 Workflow 状态、prompt、report、rules、raw secrets 或 ledger。
- D041: Maintenance Queue v1 位于 `~/.hypo-workflow/maintenance/`，以 scan/diff/dry-run/apply/verify/record lifecycle 管理日常维护，并按 side-effect level 门控外部写入。
- D042: Global Rules v1 读取 structured global/project/cycle rules 并生成有效规则矩阵；Notion 只展示规则和冲突，不作为规则编辑 authority。
- D043: Deep Research 已足够转普通 `/hw:plan`；推荐第一版实现停在 local schema + scanner + dry-run + queue/ledger，不直接做真实 Notion apply。
- D044: 第一版实现应包含真实 Notion apply path，但必须放在最后；先完成 schema/scanner/dry-run/merge plan/queue ledger，并在完整方案审核后通过显式 apply 确认门控再写远端。

## Research

- 2026-05-18T15:24:00+08:00: F001, F002, F003, F004
- 2026-05-18T15:59:28+08:00: F005, F006
- 2026-05-18T16:17:27+08:00: F007, F008
- 2026-05-18T16:28:33+08:00: F009, F010, F011
- 2026-05-18T17:08:22+08:00: 用户纠正同步目标为整理现有 Notion 页并合并进统一 Project Home，而非追加分区或新建隔离页。
- 2026-05-18T17:14:23+08:00: 用户确认 Project Home 远端存储应按内容域划分；时间线只在 Cycle 等内容域内部组织，索引/快捷页必须链接回 canonical 内容页。
- 2026-05-18T17:33:27+08:00: 用户确认 Architecture、Knowledge、Docs 都需要作为内容域子页面树，并要求下一轮问题更具体。
- 2026-05-18T17:40:58+08:00: 用户指出上一轮子树问题术语不清；Docs 可以分类，Prompts/Reports 暂时两种位置都可接受，需要后续再定。
- 2026-05-18T17:49:29+08:00: 用户确认 Progress/Architecture/Knowledge/Docs 职责划分可接受，并确认 Prompts/Reports 采用 Cycle 内 canonical + 全局索引回链方案。
- 2026-05-18T17:58:45+08:00: 只读读取 Hypo-Workflow Notion 页 87 个顶层 blocks 和 34 个子页，生成中文 `.pipeline/deep-plans/DP001-root-project-management-mode/notion-hypo-workflow-mapping.md`。
- 2026-05-18T18:06:57+08:00: 将全局层纳入 Deep Plan：Workspace Home、Project Registry、Project Link Graph、Global Rules、Global Secret References、Global Knowledge Index、Sync Targets、Maintenance Queue。
- 2026-05-18T18:19:41+08:00: 用户修正 Secret 边界：raw key 需要存，但只能在全局本地 secret store 中维护，不能进入仓库；同步层只投影引用、用途、依赖项目、健康状态和 redaction policy。
- 2026-05-18T18:19:41+08:00: 完成第一轮本地全局项目 discovery：现有 `~/.hypo-workflow/projects.yaml` 只登记 Hypo-Switcher 和 Hypo-Basics；`/home/heyx` 顶层发现 28 个 `.pipeline` 项目、37 个 git 项目、42 个 README/package/build 候选项目；`~/.hypo-workflow/secrets.yaml` 当前不存在。
- 2026-05-18T18:27:52+08:00: 只读对照 Notion `Hypo Projects` 分组，发现当前有 19 个 child pages；本地 registry、顶层 `.pipeline` 项目和 Notion 项目页三套集合不一致，Global Project Registry 第一版必须先做三方 reconciliation。
- 2026-05-18T19:02:13+08:00: 固化 Deep Research backlog，并完成 DR001 三方项目对账 manifest `.pipeline/deep-plans/DP001-root-project-management-mode/global-project-reconciliation.md`；输出 matched、alias-matched、local-only、notion-only、possible-match 与待确认 relation candidates。
- 2026-05-18T19:21:56+08:00: 完成 DR002 项目分类 taxonomy `.pipeline/deep-plans/DP001-root-project-management-mode/project-classification-taxonomy.md`；定义分类、默认动作、第一版 registry 纳入门槛，并给 DR001 项目套用默认处理规则。
- 2026-05-18T19:29:50+08:00: 完成 DR003 Global Workspace source-of-truth 决策 `.pipeline/deep-plans/DP001-root-project-management-mode/global-workspace-source-of-truth.md`；推荐 `workspace.yaml` 作为用户级 authority，`projects.yaml` 作为派生兼容视图，maintenance 目录承载队列/ledger/cache，下一步进入 DR004 Secret Store schema。
- 2026-05-18T20:10:47+08:00: 根据用户回答完成 DR004 Global Secret Store 草案 `.pipeline/deep-plans/DP001-root-project-management-mode/global-secret-store-schema.md`；Secret Store 定位为可用型本地 raw store，Agent 可读可用并记录审计，但 raw value 不进入仓库/Notion/Knowledge/报告/diff/log。
- 2026-05-18T21:13:55+08:00: 用户确认 DR004 最终策略：`secrets.yaml` 不加密仅要求 `0600`；任务匹配 capability 即可自动读 raw secret；health check 默认真实 provider 调用；Hypo-Claw API 允许通知、读状态、拉任务和同步报告。DR004 完成，下一步转入 DR005/DR006。
- 2026-05-18T22:21:08+08:00: 用户确认 `Hypo-Info -> Hypo-Info-V2` 和 `Hypo-Agent -> Hypo-Claw` 的归档/后继关系；新增 `.pipeline/deep-plans/DP001-root-project-management-mode/representative-sample-selection.md`，选定 DR005/DR006 代表性样本。
- 2026-05-18T23:15:30+08:00: 完成 DR005-DR012 调研批次：Notion 样本深读、本地 Artifact Catalog 盘点、Global Knowledge 聚合、Project Link Graph taxonomy、同步 authority/conflict matrix、Maintenance Queue lifecycle、Global Rules projection 和 conversion readiness checklist；Deep Plan 状态推进为 ready_for_plan。
- 2026-05-19T01:00:13+08:00: 用户确认第一版目标要包含真实 Notion apply，但应留到最后审核方案后再出；记录为 final gated apply boundary。
