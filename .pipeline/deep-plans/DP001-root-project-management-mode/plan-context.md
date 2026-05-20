# Compact: 根目录项目管理模式
Use for Feature Queue and ordinary /hw:plan handoff.
readiness: conversion_ready
pseudo-test rejection policy: reject pseudo tests; ordinary Plan must require real, runnable validation evidence before Feature Queue execution.
summary: 用户将进度锚定页具体化为 Project Home：每个项目有 README-like 项目主页，首页放项目介绍、当前状态和进度图表；具体进度细节在子页面中按 Cycle 组织，一个 Cycle 一个页面；Knowledge/docs 等在项目主页下建立子页面并按本地文件夹结构继续嵌套。Deep Research 第一批试点先聚焦当前 Hypo-Workflow 项目。只读 ntn discovery 已确认用户现有 Notion 结构：Hypoxanthine's Home 是 workspace 根页面，Hypo Projects 是页面列中的 H1 分组，Hypo-Workflow 是该分组下的普通 child page，内容是 Workflow 早期手工 README/路线图/版本设计子页。用户进一步纠正：新同步结构不应简单追加到旧页，也不应新建隔离页，而应整理现有内容并与当前 Workflow artifacts 合并为一个统一 Project Home。用户明确 Project Home 的 canonical storage model：远端存储按内容域划分，时间线只是内容域下面的局部子模块；索引/快捷查询页可以存在，但必须链接回 canonical 内容页。Architecture、Knowledge、Docs 都应是内容域子页面树，而不是单页字段。用户接受 Progress/Architecture/Knowledge/Docs 的第一版职责划分，并确认 Prompts/Reports 按此前方案处理：canonical 内容放在各 Cycle 子页下，同时生成全局索引页链接回 Cycle。已生成中文本地 Notion mapping dry-run 报告，对 87 个顶层 blocks 和 34 个子页进行目标树分类。用户进一步提出根目录既然有全局层，就应纳入全局规则、全局 Secret 引用维护、全局 Knowledge、项目注册表和项目联动关系，使 Workflow 知道有哪些项目、它们如何共享规则/凭据/知识/同步目标。
decisions:
D001: C16 先作为 Deep Plan discussion package 运行，不直接生成 implementation milestones。
D002: C16 的问题核心是为 Workflow 增加长期维护/运营态，而不只是根目录项目列表或一次性同步 Cycle。
D003: 首次大规模同步可以仍然走 Cycle；后续日常同步应进入独立于 Cycle/Patch 的维护阶段。
D004: C16 的主目标是设计 Workflow 的长期维护对象模式；根目录中控台只是该模式的可选入口或聚合视图。
D005: Notion 同步应被建模为长期维护模式的首个 domain adapter，而不是 Workflow 内置的唯一目的。
D006: 通用长期维护模式是必要方案；窄版 Notion 项目同步不足以覆盖进度、架构图、prompt、report、文档等多类 Workflow artifacts。
D007: 全量 artifact 类型都进入维护同步模型：进度、架构图、prompt、report、文档等都要被支持。
D008: 设计通用 Storage Sync Template；Notion 是首个 storage adapter，用 ntn 只读调研用户现有页面结构后进行映射。
D009: 项目同步必须区分 Workflow-managed、pre-Workflow 和 unmanaged 项目。
D010: C16 第一批 Milestone 应先建立进度锚定页面，再逐类确定 artifact 的存储与投影方式。
D011: C16 第一批工作应定位为 Deep Research / mapping / dry-run 阶段，而不是立即进入真实 Notion 写入或完整实现。
D012: 每个项目的进度锚定页应升级为 Project Home：README-like 项目主页 + artifact domain 子页面树。
D013: 进度图表可放在 Project Home，进度细节按 Cycle 子页面组织，一个 Cycle 一个子页面。
D014: Knowledge 和文档类 artifact 在 Project Home 下建立子页面，并按本地文件夹结构继续嵌套。
D015: Deep Research 第一批 Notion/Storage 试点范围先聚焦当前 Hypo-Workflow 项目。
D016: Notion discovery 必须把 integration 可见范围作为显式 access gate；搜索不到页面时不能继续盲扫或假设路径存在。
D017: 当前 Hypo-Workflow 的 Notion 既有页应进入整理与合并流程：以现有内容为 legacy corpus，与当前 Workflow artifacts 重组为同一个统一 Project Home，而不是简单追加分区或新建隔离子页。
D018: Notion 同步第一版需要 Legacy Reconciliation 模型，包含 discover、classify、map、merge-plan、dry-run、apply、verify、record，而不仅是 artifact projection。
D019: 统一 Project Home 的 canonical 信息架构按内容域组织；时间线只作为内容域内部的子模块，例如每个 Cycle 子页内按时间顺序组织 Prompts 和 Reports。
D020: Architecture、Knowledge、Docs 都是 Project Home 下的 canonical 子页面树；每个域内部可以继续按文件夹、主题、图表或文档类型嵌套。
D021: 第一版 Project Home 子树固定为内容域职责页：Progress 包含项目进度总览、Cycle 列表、待同步/待整理事项；Architecture 包含当前架构、架构图、关键决策、旧设计整理；Knowledge 存经验/规则/参考；Docs 按 User Docs、Developer Docs、Specs、Release Docs 分类。
D022: Prompts 和 Reports 的 canonical 内容放在对应 Cycle 子页下；全局 Prompts/Reports 页面只作为索引/检索视图，链接回各 Cycle 的 canonical 页面。
D023: 根目录项目管理模式需要一个高于单项目 Project Home 的 Global Workspace 层，负责项目注册、跨项目联动、全局规则、全局 Knowledge、Secret 引用和全局同步目标。
D024: Global Secret 维护需要允许 raw key 存在于全局本地 secret store，例如未来的 `~/.hypo-workflow/secrets.yaml` 或等价 OS/keychain 后端；仓库、Knowledge Ledger、Project Home 和 Notion 只保存/同步 secret reference、用途、依赖项目、可用性健康状态和 redaction policy。
D025: 第一版 Global Workspace 应包含 Workspace Home、Project Registry、Project Link Graph、Global Rules、Global Secret References、Global Knowledge Index、Sync Targets 和 Maintenance Queue 八类页面/对象。
D026: 第一版 Global Workspace 的 source of truth 采用 `~/.hypo-workflow/workspace.yaml`；现有 `~/.hypo-workflow/projects.yaml` 保持为 Global TUI / project switcher 的轻量派生兼容视图，`~/.hypo-workflow/maintenance/` 存放维护队列、ledger、cache 和 dry-run/apply 证据。
D027: 第一版 Global Secret Store 使用 `~/.hypo-workflow/secrets.yaml` 作为 raw value authority，支持 global/workspace/project 分层，存储 LLM API Key/Base URL、Notion token、微信公众号 token、Hypo-Claw API 等可用凭据；Agent 可以读取并用于任务集成。
D028: Agent 读取、迁移或 health check raw secret 时需要写审计事件，但审计事件、workspace projection、Notion、Knowledge、报告、diff 和 log 不得保存 raw value；raw value 只能留在 `secrets.yaml` 或未来等价 secure backend。
D029: `~/.hypo-workflow/secrets.yaml` 第一版不加密，但必须要求本地文件权限 `0600`，并继续禁止 raw value 进入仓库或同步层。
D030: Agent 在任务匹配 secret capability / allowed_for 时可以自动读取 raw secret，不需要每次另行询问；读取仍需审计且不得回显 raw value。
D031: Secret health check 默认使用真实 provider 调用，只记录脱敏状态、时间、checker 和摘要。
D032: Hypo-Claw API 第一版允许通知任务完成/报告就绪、读状态、拉任务和同步报告。
D033: `Hypo-Info` 旧版应归档为 legacy/predecessor，`Hypo-Info-V2` 是当前 canonical 项目。
D034: `Hypo-Agent` 是 `Hypo-Claw` 的前身，应归档为 legacy/predecessor，`Hypo-Claw` 是当前 canonical 项目。
D035: DR005/DR006 样本集合采用 `Hypo-Info-V2/Hypo-Info`、`Hypo-Claw/Hypo-Agent`、`Hypo-GPU`、`Hypo-Image` 和压力样本 `Hypo-Writer`，覆盖 successor/legacy、local-only current、pre-Workflow、Notion-only/skill-backed、long-running writing maintenance 五类情况。
D036: DR005 证明 Storage Sync Template 至少需要四类对象形态：current Workflow project with legacy predecessor、pre-Workflow manual project、skill/service object、legacy project corpus。
D037: DR006 证明 Artifact Catalog 必须记录 freshness、parseability、authority、sensitivity 和 relation provenance；派生产物可能相对 state/continuation 过期。
D038: Global Knowledge v1 采用 global authored records + per-project compact/index derived aggregation；项目 raw Knowledge 不被全局层或 Notion 默认复制。
D039: Project Link Graph typed edges 由 `workspace.yaml` 掌权；Project Registry 只负责对象身份。
D040: 同步必须从第一版支持字段级 authority/conflict matrix；Notion 是 projection 与 legacy corpus 面，不能覆盖当前 Workflow 状态、prompt、report、rules、raw secrets 或 ledger。
D041: Maintenance Queue v1 位于 `~/.hypo-workflow/maintenance/`，以 scan/diff/dry-run/apply/verify/record lifecycle 管理日常维护。
D042: Global Rules v1 读取 structured global/project/cycle rules 并生成有效规则矩阵；Notion 只展示规则和冲突。
D043: Deep Research 已足够转普通 `/hw:plan`；推荐第一版实现停在 local schema + scanner + dry-run + queue/ledger，不直接做真实 Notion apply。
D044: 第一版实现应包含真实 Notion apply path，但必须放在最后；先完成 schema/scanner/dry-run/merge plan/queue ledger，并在完整方案审核后通过显式 apply 确认门控再写远端。
tracks:
T001: 根目录管理的真实闭环
T002: 跨项目同步与状态聚合
T003: 用户界面与命令入口
T004: 长期维护态与数据对象模型
T005: Notion 同步作为首个维护域
T006: Workflow Artifact Catalog 与 Notion 投影
T007: Storage Sync Template 与多后端适配
T008: 进度锚定页面与项目接入状态
T009: Global Workspace 与跨项目联动层
## Feature Queue
- F001: Maintenance mode foundations and storage template contract
- F002: Project Home model and current-project dry-run page tree
- F003: ntn read-only Notion structure discovery and mapping draft
- F004: Artifact projection policies for progress, architecture, prompts, reports, and docs
- F005: Global Workspace layer, project link graph, rules, secret refs, and knowledge indexes
- F006: Workspace authority schema, project/object registry, and relation graph implementation
- F007: Artifact Catalog scanner with freshness, sensitivity, and stale-derived detection
- F008: Storage Sync Template plus Notion Project Home merge dry-run
- F009: Maintenance Queue/Ledger with side-effect gates and evidence records
- F010: Global Knowledge, Rules, and Secret refs projections
## Risks
- R007: 把根目录控制台和 Notion 同步耦合过紧，会让其他长期维护域（文章、数据集、发布渠道）难以复用。
- R008: Notion 同步范围包含长文档、prompt 和 report 后，性能、分页、API 限制和可读性可能成为第一版风险。
- R009: 如果不区分 source artifact 与 derived projection，可能让 Notion 内容反向污染 Workflow 审计记录。
- R010: Notion 页面结构各项目不同，若无通用 storage template 和 per-project mapping，会很快变成一次性脚本。
- R011: pre-Workflow/unmanaged 项目缺少本地 artifact，若不显式建模会导致同步结果看似缺失或错误。
- R012: ntn 读取真实 Notion 结构是远端只读操作，需要后续明确范围和凭据边界。
- R001: 如果根目录和子项目都写 Workflow 状态，可能出现双 source-of-truth。
- R002: 跨项目 sync 可能带来外部副作用、长耗时和派生产物污染。
- R003: 现有 Global TUI 被定义为配置管理器，不是 workflow action center；直接扩展可能违背既有契约。
- R004: 如果维护态只是一个特殊 Cycle，会继续继承 Cycle 的线性时间模型，无法自然表达多对象并行维护。
- R005: 如果直接做成 Notion 同步器，会把 Workflow 的通用管理模式锁死在单个集成上。
- R006: Notion 远端写入是外部副作用；没有 dry-run、diff 和审计日志会导致不可追踪的数据污染。
- R008: 不区分 artifact 类型会导致 prompt/report/文档被用同一字段同步，产生长度、冲突和可读性问题。
- R009: 把 Notion 当作 source of truth 回写 prompt/report 可能破坏 Workflow 的本地审计链。
- R010: 如果 storage template 抽象不清，Notion 适配会把页面结构假设泄漏到核心维护模型。
- R011: 如果先同步复杂 artifacts 而没有进度锚定页，后续每类内容缺少稳定挂载位置。
- R013: Notion integration 可能只被授予局部页面访问；如果 discovery 不显式区分权限不可见和页面不存在，会生成错误的空映射。
- R014: 如果全局层直接复制各项目 raw Knowledge/Docs，会导致上下文膨胀、重复和过期；第一版应聚合 compact/index 和链接。
- R015: 如果 Secret 维护没有严格区分 reference 与 value，Notion 同步和 Knowledge 索引可能造成凭据泄漏。
- R016: 如果 Project Registry 与 Project Link Graph 都可手写且互相覆盖，会出现跨项目关系的双 source-of-truth。
## Unresolved Items
- Need user-provided Notion root page/database scope for ntn read-only discovery.
- Need first-version fixed sections for progress anchor page.
- item:
- Current pilot scope: Hypo-Workflow project only, replacing prior representative subset recommendation for the first discovery pass.
- Need Notion target parent/project page for current Hypo-Workflow pilot.
- Need target Notion page URL/page id or integration sharing for Hypoxanthine's Home / Hypo-Projects / Hypo-Workflow before schema discovery can proceed.
- Need mapping policy for existing Hypo-Workflow legacy Notion child pages versus new Workflow-managed Cycle/Knowledge/Report subtrees.
- Need legacy reconciliation policy for sorting existing page blocks and child pages into the unified Project Home model.
- Need content-domain-first canonical Project Home tree and derived index/linking rules.
- Need fixed first-version subtrees for Architecture, Knowledge, and Docs domains.
- Need plain-language page responsibility choices for Progress and Architecture subtrees.
- Need dry-run classification of existing Hypo-Workflow Notion blocks and child pages into the accepted Project Home tree.
- Need user review of `.pipeline/deep-plans/DP001-root-project-management-mode/notion-hypo-workflow-mapping.md`.
- Need first-version Global Workspace object tree and local-vs-Notion projection boundary.
- Need Project Link Graph relation taxonomy and authority source, including confirmed `replaced_by` relations for `Hypo-Info -> Hypo-Info-V2` and `Hypo-Agent -> Hypo-Claw`.
- Need Global Knowledge aggregation policy: independent ledger vs per-project compact/index aggregation.
- Need `workspace.yaml` schema and migration path from current `projects.yaml` plus DR001/DR002 reconciliation manifests.
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
- Notion 既有项目笔记 schema 如何映射到维护对象字段？
- 字段级 authority 是否需要从第一版开始支持？
- `workspace.yaml` 的第一版 schema 如何从 DR001/DR002 的项目对账和分类结果生成 draft？
- 非项目对象（文章、笔记、发布项）是否进入第一版验收？
- 不同 artifact 类型应该如何映射到 Notion：数据库字段、页面正文、子页面、附件，还是链接引用？
- Prompt 和 Report 是否应同步全文、摘要、索引，还是只同步 latest/current？
- 架构图应以 Mermaid 文本、渲染图片、还是 Notion block 结构同步？
- 文档同步需要双向编辑还是本地到 Notion 的单向发布？
- 每类 artifact 的 Notion 投影方式是什么：字段、正文、子页面、索引、链接或摘要？
- 哪些 artifact 需要双向同步，哪些必须本地单向权威？
- 第一版是否需要覆盖全部 artifact 类型的实际同步，还是先实现 catalog/diff 加部分 apply？
- Storage Sync Template 的最小抽象是 page tree、record schema、artifact slots、还是 operation protocol？
- 进度锚定页面应该包含哪些固定区块：当前状态、Cycle/maintenance queue、artifact index、last sync、blocked items、links？
- pre-Workflow 项目的进度如何表示：manual snapshot、legacy import、还是 pending-init？
- ntn 调研需要从哪个 Notion 根页面或数据库开始，只读范围如何限定？
- ntn 只读调研应从哪个 Notion 根页面/数据库开始？
- 进度锚定页面的固定区块是什么？
- Storage Sync Template 第一版是否需要支持 Notion 以外的真实后端，还是只保证 adapter contract？
- Workflow-managed / pre-Workflow / unmanaged 项目的分类规则和展示规则是什么？
- Deep Research 阶段是否只读 Notion，还是允许创建测试页面/沙盒页面？
- 第一版应更偏 schema discovery、local dry-run，还是 end-to-end 但只覆盖少量项目？
- 项目进度锚定页是否应成为所有 artifact 同步的强制入口？
- Project Home 上 README-like 项目介绍应从 README、PROJECT-SUMMARY、architecture 还是手写 metadata 生成？
- 进度图表第一版是 Mermaid/文本表格，还是 Notion database view？
- Cycle 子页面应从 archives/C*/summary.md 生成，还是从 state/log/report 聚合？
- Knowledge 子树是否直接镜像 .pipeline/knowledge/ 与 docs/，还是先只同步 compact/index？
- 当前 Hypo-Workflow 项目的 Notion 目标父页面/项目页在哪里？
- Project Home 的 README-like 内容源优先级是什么？
- Cycle 子页第一版是否从归档 summary 生成？
- Knowledge/docs 子树第一版是否只同步 compact/index 而非全文？
- 全局层哪些内容允许同步到 Notion，哪些只能留在本地：规则、Secret 引用、Knowledge、项目关系、队列？
- Project Link Graph 第一版的关系类型和 authority 应如何定义？
- 全局 Knowledge 是新建独立 ledger，还是从各项目 `.pipeline/knowledge/` compact/index 聚合生成？
research_evidence:
- researched_at: 2026-05-18T15:24:00+08:00
  source_boundaries: mode=local_read_only, remote_network=not_used, writes=deep_plan_artifacts_only
  searched_surfaces: repository_files, local_docs, global_registry, current_pipeline
  evidence_refs: cli/bin/hypo-workflow, cli/bin/hypo-workflow, core/src/actions/index.js, core/src/tui/index.js, core/src/sync/index.js, core/src/sync/index.js, core/src/sync/index.js, core/src/opencode-status/index.js, references/config-spec.md, references/config-spec.md, ~/.hypo-workflow/projects.yaml
  finding: F001 已有全局项目 registry，存放于 ~/.hypo-workflow/projects.yaml；init-project 会登记项目，Global TUI 可读取这些摘要。
  finding: F002 registry_refresh 已存在于 light sync，但它只刷新登记项目摘要；没有定义根目录 workspace 自己的状态、队列、失败策略或跨项目执行边界。
  finding: F003 PROJECT-SUMMARY 和 OpenCode status 当前都围绕单项目 .pipeline 建模；根目录管理需要明确它是聚合视图还是一个可执行 workflow 项目。
  finding: F004 文档明确 Global TUI 是配置管理器，不是 workflow action center；如果根目录管理要执行同步/继续/恢复，需要新的模式边界而不是偷改 Global TUI 含义。
  unknown: U001 根目录项目管理模式的 source of truth 应该是根目录 .pipeline、~/.hypo-workflow/projects.yaml、还是新增 workspace manifest？
  unknown: U002 跨项目同步是否允许修改子项目 .pipeline 派生产物，还是第一版只读聚合状态？
  unknown: U003 根目录模式是否需要支持“所有 Workflow 进度”的实时持续监控，还是按需 refresh snapshot 即可？
- researched_at: 2026-05-18T15:59:28+08:00
  source_boundaries: mode=local_read_only, remote_network=not_used, writes=deep_plan_artifacts_only
  searched_surfaces: local_binary, repository_files, repository_files
  evidence_refs: /home/heyx/.local/bin/ntn, scripts/notion_api.py, tests/test_notion_integration.py, tests/test_notion_source_adapter.py, references/check-spec.md
  finding: F005 本地已安装 ntn，可用于后续 Notion 页面结构只读调研；但该操作属于远端资源读取，需要明确入口页/数据库和只读边界。
  finding: F006 仓库已有旧 Notion helper 和测试，覆盖 auth/search、prompt source、report output 等基础 I/O；它不是通用维护存储模板，但可作为 Notion adapter 调研参考。
  unknown: U004 用户 Notion 中项目页面根路径/数据库、页面层级和字段 schema 需要通过 ntn 只读读取。
  unknown: U005 通用 Storage Sync Template 是否应抽象为 page-tree adapter、record adapter、artifact-slot adapter，还是三者组合。
- researched_at: 2026-05-18T16:17:27+08:00
  source_boundaries: mode=remote_read_only, remote_network=notion_api_via_ntn, writes=deep_plan_artifacts_only
  searched_surfaces: ntn doctor, ntn api /v1/users/me, ntn api /v1/search for target titles and empty page-only search
  finding: F007 当前 ntn token 可认证到 Hypoxanthine's Notion，说明 CLI 和 token 本身可用；失败点不是本地工具不可用。
  finding: F008 当前 integration 对目标 Notion 页面不可见：指定路径标题和 page-only search 均返回 0 个页面；下一步需要目标页面 URL/page id 与 integration 分享授权。
  unknown: U006 Hypoxanthine's Home / Hypo-Projects / Hypo-Workflow 的 Notion page id 或 URL 是什么，且是否已分享给当前 integration？
  unknown: U007 Storage Sync Template 是否需要把 access gate 状态作为 object mapping 的一等字段，例如 visible、not_shared、missing_direct_ref、schema_discovered？
- researched_at: 2026-05-18T16:28:33+08:00
  source_boundaries: mode=remote_read_only, remote_network=notion_api_via_ntn, writes=deep_plan_artifacts_only
  searched_surfaces: Hypoxanthine's Home direct page id, Home block children, Hypo Projects column, Hypo-Workflow page and child pages
  finding: F009 用户现有 Notion 项目入口不是项目数据库，而是 workspace 根页面 Hypoxanthine's Home 中的列布局；Hypo Projects 是 H1 分组标题，下面直接挂项目 child pages。
  finding: F010 Hypo-Workflow 对应 Notion page id 为 528322b7-e9d5-40bd-a2e8-8350602c9feb，是普通 child page；当前页面包含 README-like 项目介绍、当前状态、架构设计、开发路线、release 计划和后续路线图。
  finding: F011 Hypo-Workflow 页已有大量历史版本/设计子页，包括 V0/V1/V2/V8/C3/C4a/C4b/C4c/C4d 等；这些更像 pre-Workflow 手工 Milestone/Prompt/设计记录，不等同于当前 .pipeline Cycle archive。
  unknown: U008 第一版映射应如何处理现有 V/C 子页：作为 legacy children 只索引，还是导入为 pre-Workflow Cycle/Design records？
  unknown: U009 现有 Hypo-Workflow 页面中的哪些 block/子页应被分类为 overview、architecture、legacy milestone、legacy prompt、release log、docs、discussion、discarded 或 unknown？
- asked_at: 2026-05-18T17:08:22+08:00
  answer: 用户明确否定追加分区和新建子页，指出正确方向应该是整理现有内容并合并进去；这也是需要仔细讨论的核心原因。
- asked_at: 2026-05-18T17:14:23+08:00
  answer: 用户明确应按内容划分存储。时间线是内容域下面的子模块，例如每个 Cycle 的子页面下面才会有时间顺序的 Prompts 和 Reports 子页面。为了检索，可以把这些子页面单独放在索引/快捷子页里，但必须在 canonical 内容位置保留链接。
- asked_at: 2026-05-18T17:33:27+08:00
  answer: 用户确认 Arch、Knowledge 和 Docs 都要有子页面，并要求下一轮问题更明确，不要继续问模糊原则。
- asked_at: 2026-05-18T17:40:58+08:00
  answer: 用户指出问题仍然太模糊：不清楚 Graph、Maintenance Queue 和 Architecture 子页的含义；Knowledge 与 Docs 的区别需要解释；Docs 可以分类；Prompts/Reports 的 canonical 位置还没想好，两种方案都可以。
- asked_at: 2026-05-18T17:49:29+08:00
  answer: 用户确认这些职责都没问题；Prompts 和 Reports 按此前方案处理，即 canonical 放在 Cycle 子页下，并提供全局索引页链接回去。
- researched_at: 2026-05-18T17:58:45+08:00
  finding: F012 Hypo-Workflow Notion 页包含 87 个顶层 blocks 和 34 个 child pages，足以生成第一版 legacy mapping dry-run；本轮未写 Notion。
  finding: F013 Notion 页的 current status 明显过期：远端显示 v9.1.0/C2，本地 README/release authority 显示 v12.8.1，当前活跃 Cycle 是 C16。
  finding: F014 旧页主体内容可按 Overview、Progress、Architecture、Docs、Knowledge、Prompts Index、Reports Index 归类；V/C 子页大多进入 Progress/Cycle 列表与 Architecture/旧设计整理，prompt-named 子页进入 Prompts Index 并回链到 legacy cycle/version。
- asked_at: 2026-05-18T18:06:57+08:00
  answer: 用户指出既然进入全局模式，就应该纳入全局规则、全局 Secret 维护、全局 Knowledge 和项目联动关系，让 Workflow 知道有哪些项目可以联动；同时指出 mapping report 应该提供中文版。
- researched_at: 2026-05-18T18:06:57+08:00
  finding: F015 现有全局项目注册表已存在于 `~/.hypo-workflow/projects.yaml`，用于 Global TUI 和 project switcher；但它目前是项目摘要，不表达项目联动、Notion target、共享规则、共享 Secret 引用或全局维护队列。
  finding: F016 现有 Knowledge Ledger 是项目本地 `.pipeline/knowledge/`，已有 compact/index 与 `secret-refs` 分类；全局 Knowledge 第一版更适合聚合 compact/index 和链接，不应复制所有 raw records。
  finding: F017 现有规范已明确 raw secret values 只能在用户环境或全局 secrets 文件，仓库记录只能保存 provider、环境变量名、用途和 redacted value；Global Secret 维护应把 raw store 和可同步 projection 分层实现。
  finding: F018 `/hw:sync --light` 已能刷新项目 registry 和项目 Knowledge compact/index，但还不是 Global Workspace 维护模式；它可作为未来全局 refresh 的底层操作之一。
- asked_at: 2026-05-18T18:19:41+08:00
  answer: 用户修正 Secret 边界：Secret 那里要存 raw key，但不进入仓库；并询问接下来还有哪些需要 Research，例如全局有哪些项目。
- researched_at: 2026-05-18T18:19:41+08:00
  finding: F019 当前全局 registry 严重不完整：`~/.hypo-workflow/projects.yaml` 只登记了 Hypo-Switcher 和 Hypo-Basics 两个项目。
  finding: F020 `/home/heyx` 顶层发现 28 个带 `.pipeline` 的 Workflow-like 项目，其中很多已有明确 pipeline status，例如 AccelSim pending_acceptance、Anima running、Hypo-Claw executing、Hypo-Workflow planning、Hypo-Writer waiting_acceptance、VSP-Coder running 等。
  finding: F021 `/home/heyx` 顶层还发现 37 个 git 项目和 42 个 README/package/build 候选项目；Global Project Registry 需要区分 Workflow-managed、partial/legacy Workflow、git-only 和 content/research projects。
  finding: F022 当前 `~/.hypo-workflow/secrets.yaml` 不存在；如果要维护 raw key，需要新增本地全局 secret store 或接入 OS/keychain 后端，同时继续保证仓库/Notion/Knowledge 只保存引用与 redacted projection。
- researched_at: 2026-05-18T18:27:52+08:00
  finding: F023 Notion 的 `Hypo Projects` 分组当前包含 19 个 child pages，包括 Hypo-Research、Hypo-Agent、Hypo-Bill、Hypo Coder、Hypo-GPU、Hypo-Info、Hypo-Image、Hypo-WTT、Hypo-LaTeX、Hypo-LLM、Hypo-Marp、Hypo-Thesis、Hypo-Homework、Hypo-Switcher、Hypo-Workflow 等。
  finding: F024 本地 registry、顶层 `.pipeline` 项目和 Notion `Hypo Projects` 三套项目集合不一致：registry 只有 2 个，本地 `.pipeline` 有 28 个，Notion 项目页有 19 个。Global Project Registry 第一版必须先做三方 reconciliation，而不是直接以任一集合为全量 truth。
- researched_at: 2026-05-18T19:02:13+08:00
  finding: F025 已固化 Deep Research backlog，DR001-DR012 覆盖三方项目对账、项目分类、Global Workspace source of truth、Secret Store、代表性 Notion 深读、Artifact Catalog、Global Knowledge、Project Link Graph、冲突策略、Maintenance Queue、全局规则和验收标准。
  finding: F026 已完成 DR001 三方项目对账 manifest `global-project-reconciliation.md`，将项目归为 matched、alias-matched、local-only、notion-only、possible-match，并列出 `Hypo-Info/V2`、`Hypo-LLM/v2`、`Hypo-Switcher/v1`、`Hypo-Agent-ts-rewrite`、`Lab-Website-Test-V1/V2` 等待确认 relation candidates。
- researched_at: 2026-05-18T19:21:56+08:00
  finding: F027 已完成 DR002 项目分类 taxonomy，定义 workflow-managed/matched、workflow-managed/local-only、partial-workflow、git-only/matched、git-only/local-only、paper、content/research、external、notion-only、notion-note、notion-spec、relation-review、ignore 等分类。
  finding: F028 DR002 为每类项目定义了默认动作：register-and-bind、enrich-registry、bind-as-pre-workflow、local-only-review、schema-review、knowledge-object-review、reference-or-ignore、notion-only-review、spec-relation-review、link-graph-review 等。
  finding: F029 DR002 建议第一版 registry draft 默认纳入 workflow-managed/matched、registered/matched、alias-matched、用户明确提到的 Hypo-Writer、以及与 Notion page 匹配的 pre-Workflow git-only 项目；外部依赖、论文、文献和笔记类对象默认 review 或转入 Knowledge/Paper/Reference。
- researched_at: 2026-05-18T19:29:50+08:00
  finding: F030 DR003 比较三种 source-of-truth 方案后，决定 `~/.hypo-workflow/workspace.yaml` 作为 Global Workspace 用户级 authority；`~/.hypo-workflow/projects.yaml` 保持为现有 Global TUI / project switcher 的轻量派生兼容视图。
  finding: F031 DR003 将 `~/.hypo-workflow/maintenance/` 定位为维护 queue、ledger、cache 和 dry-run/apply 证据目录；根目录 `.pipeline/maintenance/` 只适合当前运行时报告，不能成为全局身份和绑定关系 authority。
  finding: F032 DR003 定义 authority matrix：各项目 `.pipeline` 仍是项目运行状态权威；workspace 只保存对象身份、remote refs、relations、sync targets、secret refs 和 policy refs；raw secret、raw knowledge、operation ledger 不塞进 workspace manifest。
- researched_at: 2026-05-18T20:10:47+08:00
  finding: F033 用户确认第一版 raw secret store 使用 `~/.hypo-workflow/secrets.yaml`，允许 global/workspace/project 分层，并希望记录可复用 LLM API Key/Base URL、Notion token、微信公众号 token、Hypo-Claw API 信息等可用凭据。
  finding: F034 用户确认 Agent 可以读取 raw secret，并应知道自己可以读取，以便后续任务直接集成使用；读取和迁移 raw secret 需要记录审计事件。
  finding: F035 用户确认现有 secret 允许迁移，且允许 Agent 复制 raw key；DR004 草案将迁移流程定义为 scan/classify/dry-run/apply/verify/record。
  finding: F036 DR004 草案校正了持久化边界：`secrets.yaml` 内可保存 raw value，但 workspace/Notion/Knowledge/report/diff/log/dry-run plan 仍不得保存 raw value。
- researched_at: 2026-05-18T21:13:55+08:00
  finding: F037 用户确认 `secrets.yaml` 第一版不用加密；本地保护采用 `0600` 文件权限。
  finding: F038 用户确认任务匹配 capability 时 Agent 可以自动读取 raw secret。
  finding: F039 用户确认 secret health check 默认使用真实 provider 调用。
  finding: F040 用户确认 Hypo-Claw API 能力边界包含通知、读状态、拉任务和同步报告。
- researched_at: 2026-05-18T22:21:08+08:00
  finding: F041 用户确认 `Hypo-Info` 旧版做得有问题，应作为 `Hypo-Info-V2` 的 legacy/predecessor 归档。
  finding: F042 用户确认 `Hypo-Agent` 是 `Hypo-Claw` 的前身，应作为 legacy/predecessor 归档。
  finding: F043 DR005 Notion deep-read 样本定为 `Hypo-Info`、`Hypo-Agent`、`Hypo-GPU — 教学级 GPU Simulator`、`Hypo-Image`。
  finding: F044 DR006 本地 artifact inventory 样本定为 `Hypo-Info-V2/Hypo-Info`、`Hypo-Claw/Hypo-Agent`、`Hypo-GPU`、`Hypo-Writer`、`~/.codex/skills/hypo-image`。
next_question: DR005 可以开始只读深读代表性 Notion 页面；优先读取 `Hypo-Info` 和 `Hypo-Agent`，验证 legacy page 如何链接到 canonical successor。
