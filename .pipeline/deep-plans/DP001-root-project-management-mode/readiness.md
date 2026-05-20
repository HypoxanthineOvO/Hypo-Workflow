# Readiness: 根目录项目管理模式

Depth: conversion_ready
Status: ready_for_plan

Deep Plan readiness checks whether requirements, architecture, tracks, tests, and risks are sufficient for conversion.

## Remaining Decision

- 第一版实现包含真实 Notion apply path，但必须放在最后：先完成 local schema + scanner + dry-run + queue/ledger 和完整方案审核，再通过显式 apply 确认门控写入。

## Resolved Research

- DR001：三方项目对账已完成，产物 `global-project-reconciliation.md`。
- DR002：项目分类 taxonomy 已完成，产物 `project-classification-taxonomy.md`。
- DR003：Global Workspace source-of-truth 已完成，产物 `global-workspace-source-of-truth.md`。
- DR004：Global Secret Store schema 已完成，产物 `global-secret-store-schema.md`。
- DR005：代表性 Notion 页面深读已完成，产物 `representative-notion-page-deep-read.md`。
- DR006：样本 Artifact Catalog 盘点已完成，产物 `sample-artifact-inventory.md`。
- DR007：Global Knowledge 聚合策略已完成，产物 `global-knowledge-aggregation.md`。
- DR008：Project Link Graph 关系 taxonomy 已完成，产物 `project-link-graph-taxonomy.md`。
- DR009：同步 authority/conflict matrix 已完成，产物 `sync-authority-conflict-matrix.md`。
- DR010：Maintenance Queue lifecycle 已完成，产物 `maintenance-queue-lifecycle.md`。
- DR011：Global Rules projection 已完成，产物 `global-rules-projection.md`。
- DR012：conversion readiness checklist 已完成，产物 `conversion-readiness-checklist.md`。

## Historical Gaps

- 新的长期维护态应该命名为什么：Console、Maintenance、Ops、Registry、还是 Workspace？
- 维护态的权威数据应该是根目录 .pipeline 下的新 ledger，还是每个项目/文章各自维护 ledger 后由根目录聚合？
- Notion 同步规则是 Workflow 通用能力，还是一个可插拔的 maintenance domain？
- 维护任务是否允许并行执行，还是只允许生成待办/队列并由用户逐项确认？
- 根目录 Workflow 是一个真实可执行项目，还是仅作为控制台/聚合器。
- 日常同步需要写 Notion 远端，属于外部副作用，必须定义确认与审计边界。
- 文章维护和项目同步是否共享同一种数据模型，还是需要 domain-specific item 模型。
- 需要确定长期维护态的名称和生命周期。
- 需要把 DR003 的 source-of-truth 决策转成 schema：`~/.hypo-workflow/workspace.yaml` 为 authority，`projects.yaml` 为派生兼容视图，`~/.hypo-workflow/maintenance/` 为队列/ledger/cache。
- 需要确定 Notion 同步 dry-run、diff、commit、审计边界。
- 维护对象的最小通用字段是什么：id、type、source refs、remote refs、status、dirty fields、last synced、policy、ledger？
- 本地 Workflow 状态和 Notion 项目笔记冲突时，哪个是 authoritative，还是按字段设置 authority？
- 日常维护操作需要如何表达：scan、diff、plan、apply、verify、record？
- 根目录入口只聚合项目，还是也应该聚合文章、笔记、发布项等非项目对象？
- Notion 里已有项目笔记的 schema、字段名和页面组织方式尚未知。
- 所有项目状态是否都已经由 Hypo-Workflow 管理，还是存在未初始化项目或外部项目。
- 同步频率是手动按需、定期批量、还是事件触发。
- 需要收集 Notion 既有项目笔记 schema 或最小字段样例。
- 需要定义字段级 authority 和冲突策略。
- 需要定义日常维护 lifecycle 与 Cycle/Patch 的边界。
- 不同 artifact 类型应该如何映射到 Notion：数据库字段、页面正文、子页面、附件，还是链接引用？
- Prompt 和 Report 是否应同步全文、摘要、索引，还是只同步 latest/current？
- 架构图应以 Mermaid 文本、渲染图片、还是 Notion block 结构同步？
- 文档同步需要双向编辑还是本地到 Notion 的单向发布？
- 每种 artifact 的大小、更新频率和冲突风险不同，需要分层同步策略。
- Notion API 对 Mermaid、长文档、代码块和大批量页面更新的限制需要后续调研。
- 哪些 artifact 是权威源，哪些只是派生投影，必须避免 Notion 回写污染本地 source of truth。
- 需要定义 Workflow artifact taxonomy：progress、architecture、prompt、report、docs 等类型。
- 需要定义 artifact-to-Notion projection policy。
- 需要定义哪些 artifact 只允许本地到 Notion 单向同步。
- 需要调研 Notion 对长文档、代码块、Mermaid/架构图和批量更新的能力限制。
- Storage Sync Template 的最小抽象是 page tree、record schema、artifact slots、还是 operation protocol？
- 进度锚定页面应该包含哪些固定区块：当前状态、Cycle/maintenance queue、artifact index、last sync、blocked items、links？
- pre-Workflow 项目的进度如何表示：manual snapshot、legacy import、还是 pending-init？
- ntn 调研需要从哪个 Notion 根页面或数据库开始，只读范围如何限定？
- Notion 页面路径和项目映射规则尚未读取。
- 不同项目各自页面结构不同，需要区分通用模板和 per-project override。
- 第一批 Milestone 中“进度锚定页面”是只生成本地 plan/diff，还是允许实际创建/更新 Notion 页面。
- 需要定义通用 Storage Sync Template：page tree、artifact slots、record schema、operation protocol。
- 需要通过 ntn 只读读取用户 Notion 页面结构，但必须先限定入口页/数据库和读取范围。
- 需要定义进度锚定页面的固定内容和 Notion 投影方式。
- 需要定义 Workflow-managed、pre-Workflow、unmanaged 项目的分类与缺失 artifact 表达。
- 需要规划第一批 Milestone：先做进度锚定页面，再逐类确定 artifact 存储。
- Deep Research 阶段是否只读 Notion，还是允许创建测试页面/沙盒页面？
- 第一版应更偏 schema discovery、local dry-run，还是 end-to-end 但只覆盖少量项目？
- 项目进度锚定页是否应成为所有 artifact 同步的强制入口？
- 需要选择 Deep Research 阶段采用全量发现还是代表性子集发现。
- 需要决定是否允许沙盒 Notion 页面写入验证，或严格只做 dry-run。
- 需要确定 Notion-first generic template 的约束，避免 Notion 假设泄漏到核心模型。
- Project Home 上 README-like 项目介绍应从 README、PROJECT-SUMMARY、architecture 还是手写 metadata 生成？
- 进度图表第一版是 Mermaid/文本表格，还是 Notion database view？
- Cycle 子页面应从 archives/C*/summary.md 生成，还是从 state/log/report 聚合？
- Knowledge 子树是否直接镜像 .pipeline/knowledge/ 与 docs/，还是先只同步 compact/index？
- 当前 Hypo-Workflow 项目的 Notion 目标父页面/项目页在哪里？
- 需要定义 Project Home 固定区块和 README-like 内容来源。
- 需要定义 Cycle 子页面生成来源和粒度。
- 需要定义 Knowledge/docs 子树是否镜像文件夹结构或只同步 compact/index。
- 需要当前 Hypo-Workflow 项目的 Notion 目标父页面/项目页作为 ntn 只读发现入口。
- 当前 ntn integration 已认证但看不到任何页面搜索结果；需要 Notion URL/page id 或把目标页面分享给当前 integration 后才能继续 schema discovery。
- Storage Sync Template 需要区分权限不可见、直接引用缺失、页面不存在和 schema 已发现等 discovery 状态。
- 现有 Hypo-Workflow Notion 页是 pre-Workflow 手工 Project Home；需要定义 legacy children 与新 Workflow-managed 子树的兼容/迁移策略。
- Hypo Projects 是页面分组而不是数据库；需要 Storage Sync Template 支持 page-section child page collection，而不仅是 database records。
- 用户否定了“追加分区”和“新建隔离页”；需要设计 legacy corpus 整理、重排、合并和验证，而不是单向投影。
- 需要定义内容域优先的 canonical page tree，并明确时间线、索引页、快捷查询页都只是派生/辅助视图。
- 需要定义 Architecture、Knowledge、Docs 三个内容域的第一版固定子树和 legacy merge 规则。
- 需要降低 Project Home 子树术语抽象度，用页面职责而不是内部英文名提问。
- 需要决定是否深入读取 34 个 legacy child pages 的正文，还是先用页面标题和顶层正文生成 merge plan。
- 需要定义 Global Workspace 层各对象的第一版 schema 字段：Workspace Home、Project Registry、Project Link Graph、Global Rules、Global Secret References、Global Knowledge Index、Sync Targets、Maintenance Queue。
- 需要决定全局层哪些对象可以同步到 Notion，哪些必须只保留本地或只同步摘要/引用。
- 需要确定全局 Knowledge 是独立 ledger，还是由各项目 compact/index 聚合而成。
- 需要把用户确认的 `Hypo-Info -> Hypo-Info-V2`、`Hypo-Agent -> Hypo-Claw` successor/legacy 关系纳入 Project Link Graph schema，并避免项目注册表与关系图双 source-of-truth。
- 需要对 28 个 `.pipeline` 项目进行第一版纳入/排除分类，避免测试项目、历史项目和真实长期项目混在一起。
- 需要决定 git-only / README-only 候选项目是否进入 unmanaged/pre-Workflow 同步范围。
- 需要定义从现有 Hypo-Claw 配置迁移 Notion token 等 raw secret 的 dry-run/apply/verify/record 流程。
- 本地 registry、顶层 `.pipeline` 项目和 Notion `Hypo Projects` 子页三套集合不一致，需要定义 reconciliation 规则。

## Next Recommended Question

是否进入普通 `/hw:plan` 并按“先 dry-run/审核，最后 gated real apply”的边界拆分实现 Milestones？

## Research Unknowns

- U001: 根目录项目管理模式的 source of truth 应该是根目录 .pipeline、~/.hypo-workflow/projects.yaml、还是新增 workspace manifest？
- U002: 跨项目同步是否允许修改子项目 .pipeline 派生产物，还是第一版只读聚合状态？
- U003: 根目录模式是否需要支持“所有 Workflow 进度”的实时持续监控，还是按需 refresh snapshot 即可？
- U004: 用户 Notion 中项目页面根路径/数据库、页面层级和字段 schema 需要通过 ntn 只读读取。
- U005: 通用 Storage Sync Template 是否应抽象为 page-tree adapter、record adapter、artifact-slot adapter，还是三者组合。
- U006: Hypoxanthine's Home / Hypo-Projects / Hypo-Workflow 的 Notion page id 或 URL 是什么，且是否已分享给当前 integration？
- U007: Storage Sync Template 是否需要把 access gate 状态作为 object mapping 的一等字段，例如 visible、not_shared、missing_direct_ref、schema_discovered？
- U008: 第一版映射应如何处理现有 V/C 子页：作为 legacy children 只索引，还是导入为 pre-Workflow Cycle/Design records？
- U009: 现有 Hypo-Workflow 页面中的哪些 block/子页应被分类为 overview、architecture、legacy milestone、legacy prompt、release log、docs、discussion、discarded 或 unknown？
- U010: 是否需要深入读取每个 legacy child page 的正文，再把页面级粗分类升级为 block-level 精细 mapping？
- U011: 第一版真实 Notion 写入是否允许先创建/更新一个本地 dry-run 对应的 mapping manifest，还是必须继续只读讨论到完整 merge plan？
- U012: Global Workspace 的 source of truth 应放在 `~/.hypo-workflow/workspace.yaml`、根目录 `.pipeline/maintenance/`，还是扩展现有 `~/.hypo-workflow/projects.yaml`？
- U013: Global Rules 第一版是否只做只读生效规则索引，还是支持跨项目批量修改规则？
- U014: Project Link Graph 第一版需要哪些关系类型，以及这些关系由用户手写、自动发现还是二者合并？
- U015: 顶层 28 个 `.pipeline` 项目中，哪些应进入第一版 Global Project Registry，哪些只是测试/历史/临时项目？
- U016: git-only 项目中哪些应作为 unmanaged/pre-Workflow 项目同步到 Notion，例如 Hypo-GPU、Hypo-Healthy、Hypo-Marp、Hypo-Thesis、Hypoxanthine-LaTeX、SHTU-Paper 等？
- U017: 全局 raw key store 第一版应采用 `~/.hypo-workflow/secrets.yaml`、系统 keychain，还是两者抽象为 backend？
- U018: Notion `Hypo Projects` 中没有本地同名目录或未接入 Workflow 的页面，应归类为 legacy/pre-Workflow、Notion-only、还是非项目笔记？
- U019: 本地 `.pipeline` 项目中没有对应 Notion project page 的项目，应自动创建候选 Project Home、先只记为 local-only，还是等待用户确认？
- U020: DR002 应如何定义每类 project classification 的默认动作，例如 include、review、bind、create-page、exclude、knowledge-only？
- U021: DR003 应选择哪个 Global Workspace source-of-truth：扩展 `~/.hypo-workflow/projects.yaml`、新建 `~/.hypo-workflow/workspace.yaml`，还是根目录 `.pipeline/maintenance/registry.yaml`？
- U022: DR004 应如何设计 raw secret store、workspace secret refs、redaction、health check 和依赖项目索引？

## Resolved By DR003

- U001 / U012 / U021：Global Workspace source of truth 采用 `~/.hypo-workflow/workspace.yaml`；`~/.hypo-workflow/projects.yaml` 继续作为 Global TUI / project switcher 的派生兼容视图；`~/.hypo-workflow/maintenance/` 保存维护队列、ledger、cache 和 dry-run/apply 证据；根目录 `.pipeline/maintenance/` 只作为当前运行时/报告位置。

## Resolved By DR004 Draft

- U017 / U022：第一版 Global Secret Store 使用 `~/.hypo-workflow/secrets.yaml`；支持 global/workspace/project 分层；Agent 可读取 raw value 并用于任务集成、迁移和 provider health check；workspace/Notion/Knowledge/report/diff/log 只投影 secret ref、capabilities、用途、依赖项目和健康摘要，不保存 raw value。

## Resolved By DR004 Final

- U023 / U024 / U025 / U026：`secrets.yaml` 第一版不加密但要求 `0600`；Agent 在任务匹配 capability 时可自动读 raw secret；health check 默认真实调用 provider；Hypo-Claw API 允许通知、读状态、拉任务和同步报告。

## Resolved By DR005/DR006 Sample Selection

- 代表性样本已定：`Hypo-Info-V2/Hypo-Info` 覆盖 successor + legacy Notion page；`Hypo-Claw/Hypo-Agent` 覆盖 local-only current successor + legacy matched predecessor；`Hypo-GPU` 覆盖 pre-Workflow/git-only matched project；`Hypo-Image` 覆盖 Notion-only / skill-backed object；`Hypo-Writer` 覆盖 long-running writing maintenance pressure sample。

## Resolved By DR005-DR012 Research Batch

- U013 / U014：Global Rules 和 Project Link Graph 的 first-version authority 已明确：structured rules 和 `workspace.yaml` typed edges 是 authority，Notion 只做 projection。
- U015 / U016 / U018 / U019 / U020：项目纳入、legacy、pre-Workflow、notion-only、local-only 分类通过 DR001/DR002/DR005/DR006 给出默认处理。
- U023+：DR007-DR012 补齐 Global Knowledge、Link Graph、Authority/Conflict、Maintenance Queue、Rules Projection 和 Plan 转换验收标准。
