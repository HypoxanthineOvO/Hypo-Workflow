# Global Workspace Source Of Truth

生成时间：2026-05-18T19:29:50+08:00

范围：DR003。比较三种全局维护状态存储方案，并给出第一版 source-of-truth 决策。本报告只写 Deep Plan 本地产物，不创建真实 `workspace.yaml`，不修改 `~/.hypo-workflow/projects.yaml`，不写 Notion。

## 结论

第一版建议采用：

1. `~/.hypo-workflow/workspace.yaml` 作为 Global Workspace 的用户级权威 manifest。
2. `~/.hypo-workflow/projects.yaml` 保持为现有 Global TUI / project switcher 的轻量派生兼容视图。
3. `~/.hypo-workflow/maintenance/` 存放全局维护队列、ledger、cache 和 dry-run/apply 证据。
4. 根目录或当前项目的 `.pipeline/maintenance/` 只保存当前 Cycle / 当前 workspace 运行时产物，不作为全局身份和绑定关系的权威来源。

核心理由：Global Workspace 是用户级长期维护对象，不应绑定到某一个项目仓库；但现有 `projects.yaml` 已被规范和代码实现为“项目摘要列表”，不适合承载 Notion binding、关系图、全局规则、Secret 引用、Knowledge 聚合和维护队列。

## 现有证据

| 证据 | 含义 |
|---|---|
| `references/config-spec.md:310` | `projects.yaml` 被定义为 setup-time project summaries，服务 Global TUI 和 project switcher。 |
| `references/config-spec.md:316` | Global TUI 是 configuration manager，不是 workflow action center。 |
| `core/src/config/index.js:698-730` | 当前 registry loader/saver 只保留 schema、selected_project_id、projects，并按项目 id 排序保存。 |
| `core/src/tui/index.js:100-123` | Global TUI 从 `projects.yaml` 读取项目摘要、状态、acceptance 和 knowledge status。 |
| `core/src/sync/index.js:427-437` | light sync 只在 registry 文件存在时刷新已登记项目摘要。 |
| `references/knowledge-spec.md:96-103` | raw secret 只能在 `~/.hypo-workflow/secrets.yaml` 或用户环境，仓库记录只能保存引用/用途/redacted value。 |
| `references/rules-spec.md:23-28` | 全局 structured rules 已有用户级权威路径 `~/.hypo-workflow/rules/structured/*.yaml`。 |

## 三种方案比较

| 方案 | 优点 | 问题 | DR003 结论 |
|---|---|---|---|
| 扩展 `~/.hypo-workflow/projects.yaml` | 已存在；Global TUI 已读取；兼容项目切换。 | 语义太窄，只是项目摘要；难以容纳非项目对象、关系图、Notion target、Secret ref、Knowledge index、维护队列；扩展后会让 UI/adapter 依赖一个混合大文件。 | 不作为 authority；保留为派生兼容视图。 |
| 新建 `~/.hypo-workflow/workspace.yaml` | 用户级；不绑定单一 repo；能表达多项目、多 root、多 storage backend 和关系图；适合其他用户不用 Notion 的场景。 | 需要新增 loader/schema/migration；需要定义与 `projects.yaml` 的同步关系。 | 作为第一版 authority。 |
| 根目录 `.pipeline/maintenance/registry.yaml` | 和“根目录开 Workflow”直觉一致；适合记录当前 Cycle 的 dry-run/report。 | 绑定某个工作目录或 repo；容易被归档/重置/提交；不适合作为用户全局长期状态；根目录和子项目会形成双 source-of-truth。 | 只作为运行时/报告/cache，不作为 authority。 |

## Authority Matrix

| 数据域 | 权威来源 | 派生/投影 | 说明 |
|---|---|---|---|
| Workspace 身份、roots、对象纳入、alias、Notion binding、sync target | `~/.hypo-workflow/workspace.yaml` | `projects.yaml`、Notion Workspace Home、报告 | 用户级长期维护 manifest。 |
| 项目运行状态 | 各项目 `.pipeline/state.yaml`、`.pipeline/cycle.yaml`、`.pipeline/PROGRESS.md` | workspace status cache、`projects.yaml` 摘要、Notion Project Home | Global Workspace 只保存快照/引用，不接管单项目运行状态。 |
| 项目关系图 | `workspace.yaml` 的 `relations` 或独立 `~/.hypo-workflow/relations.yaml` 后续拆分 | Notion Project Link Graph、Project Home 链接 | 第一版可放在 workspace manifest，规模变大后拆文件。 |
| Sync target 映射 | `workspace.yaml` 的 `sync_targets` 和对象级 `remote_refs` | adapter operation plan、Notion 页面树 | Notion 是首个 adapter，但字段不应命名成 Notion-only 核心模型。 |
| 当前维护队列 | `~/.hypo-workflow/maintenance/queue.yaml` | 根目录 TUI/报告/Notion Maintenance Queue 摘要 | Queue 是操作状态，不是对象身份 authority。 |
| 维护历史/证据 | `~/.hypo-workflow/maintenance/ledger/*.yaml` | reports、Notion sync record 摘要 | append-only 证据不塞进 `workspace.yaml`。 |
| 全局规则 | `~/.hypo-workflow/rules/structured/*.yaml` | workspace rule index、Notion Global Rules 摘要 | Workspace 只索引和关联项目覆盖关系，不复制规则权威。 |
| raw Secret value | `~/.hypo-workflow/secrets.yaml` 或 OS/keychain backend | secret ref projection、health/redacted marker | raw value 不进入 repo、Notion、Knowledge 或 workspace projection。 |
| Secret 引用、用途、依赖项目 | `workspace.yaml` 的 secret refs index，或未来 `~/.hypo-workflow/secrets.refs.yaml` | Project Home / Global Secret References | 只保存 ref、用途、依赖和健康状态。 |
| 全局 Knowledge | 各项目 `.pipeline/knowledge/knowledge.compact.md` 和 index + 全局 index manifest | Global Knowledge Index、Notion 摘要 | 第一版聚合 compact/index/link，不复制 raw records。 |

## 第一版 `workspace.yaml` 草案

```yaml
schema_version: 1
workspace:
  id: hypoxanthine-main
  display_name: Hypoxanthine Workspace
  roots:
    - /home/heyx
  authority: workspace_yaml
  updated_at: "2026-05-18T19:29:50+08:00"

projects:
  - id: hypo-workflow
    display_name: Hypo-Workflow
    classification: workflow-managed/matched
    adoption_status: workflow-managed
    local:
      path: /home/heyx/Hypo-Workflow
      state_authority: .pipeline/state.yaml
      artifact_authority: .pipeline
    remote_refs:
      - backend: notion
        target_id: notion-hypo-projects
        page_id: 528322b7-e9d5-40bd-a2e8-8350602c9feb
        binding_status: matched
    sync:
      status: pending_dry_run
      policy: local_artifacts_to_storage_projection
    aliases: []
    review:
      required: false
      reason: null

relations:
  - from: hypo-info
    type: successor_candidate
    to: hypo-info-v2
    status: review

sync_targets:
  - id: notion-hypo-projects
    backend: notion
    display_name: Hypo Projects
    root_ref:
      page_id: cd9cb9d0-09b9-4728-a71e-1df5f06cb644
      section_heading: Hypo Projects
    access:
      status: visible
      last_checked_at: "2026-05-18T18:27:52+08:00"

secret_refs:
  - id: notion_api
    provider: notion
    store_ref: local_secret:notion_api
    value_policy: raw_value_never_projected
    dependent_projects:
      - hypo-workflow
      - hypo-claw
    health:
      status: unknown
```

## 与现有 `projects.yaml` 的关系

`projects.yaml` 应保留，因为它已经服务：

- Global TUI 项目列表；
- project switcher；
- `init-project` 自动登记；
- light sync 的 registry refresh。

但它应从 `workspace.yaml` 和各项目扫描结果生成/刷新，而不是继续作为更复杂数据的 authority。第一版可以采用双读策略：

1. 如果 `workspace.yaml` 存在，Global Workspace 读取它作为 authority。
2. 生成兼容 `projects.yaml` 时，只输出 `id`、`display_name`、`path`、`platform`、`profile`、`current_cycle`、`pipeline_status`、`open_patch_count`、`acceptance`、`knowledge`、`updated_at`。
3. 如果 `workspace.yaml` 不存在，则沿用现有 `projects.yaml`，并提供 migration/draft 命令生成 workspace draft。
4. `projects.yaml` 与 `workspace.yaml` 不一致时，报告 drift，不自动覆盖 authority。

## 与根目录 Workflow 的关系

根目录 Workflow 可以作为操作入口，但不是 Global Workspace 的长期身份源：

- 当前 Cycle / Deep Plan 的报告继续放在当前项目 `.pipeline/deep-plans/`。
- 后续 root workspace 运行可以在 `.pipeline/maintenance/` 保存 dry-run plans、diff reports、temporary queue snapshots。
- 真正的用户级项目纳入、Notion binding、关系图和 sync target mapping 仍回写到 `~/.hypo-workflow/workspace.yaml`，并要求显式确认。

这解决两个冲突：

1. 根目录项目自身可以被归档、重置或提交，但用户全局状态不应随项目生命周期变化。
2. 子项目 `.pipeline` 仍是各自运行状态权威，Global Workspace 只聚合，不争夺单项目执行状态。

## 第一版实现边界建议

1. 只实现 `workspace.yaml` schema、loader、validator 和 read-only draft generator。
2. 从 DR001/DR002 manifest 生成 `workspace.draft.yaml`，不直接写 authority 文件。
3. 由用户确认后才写 `~/.hypo-workflow/workspace.yaml`。
4. 保留现有 `projects.yaml` 读写行为，新增从 workspace 派生项目摘要的 refresh 路径。
5. 所有 Notion 写入仍走 dry-run -> apply confirmation -> verify -> ledger。
6. raw Secret 继续由 DR004 单独设计，DR003 只规定 workspace 中不得出现 raw value。

## 风险与防线

| 风险 | 防线 |
|---|---|
| `workspace.yaml` 变成过大的万能文件 | operation queue、ledger、cache、raw secret、raw knowledge 拆到专门位置；workspace 只存身份、绑定、关系和 policy refs。 |
| `projects.yaml` 与 `workspace.yaml` drift | 增加 drift check；`projects.yaml` 作为 derived view 时可再生成。 |
| Global Workspace 修改子项目状态 | 禁止直接写子项目 protected state；只读取并刷新摘要，真实执行仍进入对应项目 Workflow。 |
| Notion 反向污染本地 artifacts | 字段级 authority 在 DR009 定义；第一版 prompt/report/progress 默认本地单向权威。 |
| Secret 泄漏 | workspace 只允许 `store_ref`、purpose、dependent_projects、health 和 redacted marker；raw value 由 DR004 本地 store 处理。 |

## DR004 输入

DR004 可以在本结论基础上继续设计 Global Secret Store：

- `~/.hypo-workflow/secrets.yaml` 或 OS/keychain backend 的第一版选择；
- workspace `secret_refs` 与 raw store 的引用关系；
- health check 是否允许调用真实 provider；
- redaction 与 drift 检查；
- 哪些 secret refs 可以同步到 Notion，哪些只能本地可见。
