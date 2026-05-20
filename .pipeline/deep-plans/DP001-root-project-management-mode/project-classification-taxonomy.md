# Project Classification Taxonomy

生成时间：2026-05-18T19:21:56+08:00

范围：DR002 项目分类规则与默认动作。输入来自 DR001 `global-project-reconciliation.md`。

本报告只定义分类与动作，不修改 registry，不写 Notion。

## 核心原则

1. Global Project Registry 不等于本地目录清单，也不等于 Notion child page 清单。
2. Project Registry 只登记“需要长期维护、同步、联动、状态追踪”的对象。
3. 本地 `.pipeline` 是强信号，但不是自动纳入第一版的充分条件；测试项目、历史项目和外部研究依赖要先 review。
4. Notion page 是已有知识资产，不是自动 source of truth；Notion-only 页面先作为 legacy/knowledge candidate。
5. `v1`、`v2`、`rewrite`、`fork` 这类目录不自动合并为同一项目，也不默认独立成主项目；必须显式建 Project Link Graph relation。
6. 所有 create/update Notion 动作都必须先进入 dry-run queue，不能由分类规则直接写远端。

## 分类 Taxonomy

| 分类 | 定义 | 是否进第一版 registry | 默认动作 | Notion 动作 |
|---|---|---:|---|---|
| `workflow-managed/matched` | 本地有有效 `.pipeline/state.yaml`，Notion 有同名或可归一同名 Project page。 | yes | `register-and-bind` | 绑定现有 page，生成 Project Home merge plan。 |
| `workflow-managed/registered/matched` | 已在 registry，且本地/Notion 都能匹配。 | yes | `enrich-registry` | 补 Notion ref、last sync、link graph。 |
| `workflow-managed/alias-matched` | 本地是 Workflow 项目，Notion 名称有空格/后缀/别名差异。 | yes, after alias review | `register-and-bind-alias` | 绑定现有 page，但记录 alias。 |
| `workflow-managed/local-only` | 本地有完整 Workflow state，但 Notion 无对应 page。 | review | `local-only-review` | 不自动创建；进入 candidate create/bind queue。 |
| `partial-workflow/local-only` | 有 `.pipeline` 但 state 缺失、旧 schema 或仅部分规划状态。 | review | `schema-review` | 不创建；先判断是否历史/临时/未完成接入。 |
| `git-only/matched` | 本地 git 项目无 Workflow，Notion 有对应 Project page。 | yes, as pre-workflow | `bind-as-pre-workflow` | 绑定现有 page，Project Home 标记为 pre-Workflow。 |
| `git-only/alias-matched` | git-only 本地项目与 Notion page 通过别名匹配。 | yes, after alias review | `bind-as-pre-workflow-alias` | 绑定现有 page，记录 alias 与 source path。 |
| `git-only/local-only` | 本地 git 项目无 Workflow，Notion 无对应 page。 | review | `local-git-review` | 不创建；先判断是否个人项目、外部依赖、论文、课程或模板。 |
| `paper/local-only` | 论文/文稿类本地项目。 | domain-review | `paper-object-review` | 可能不进 Project Registry，转入 writing/paper object registry。 |
| `content/research/local-only` | 文献、资料、数据集、参考集合。 | usually no | `knowledge-object-review` | 通常进入 Knowledge/Reference，不作为 Project Home。 |
| `external/git-only` | 外部工具、第三方 repo、forked dependency。 | usually no | `reference-or-ignore` | 不创建 Project Home；可作为 dependency/reference。 |
| `notion-only` | Notion 有 Project-like page，本地无顶层项目。 | review | `notion-only-review` | 保留 legacy page；需要判断是否已迁移、无代码项目或只是想法。 |
| `notion-note` | Notion 页面明显是笔记、工具学习、知识整理。 | no | `knowledge-page-review` | 归入 Knowledge/Docs，不进 Project Registry。 |
| `notion-spec/possible-project-link` | Notion 是 spec/design page，可能关联一个或多个本地项目。 | no, relation only | `spec-relation-review` | 建 `spec_for` relation，不作为独立 Project。 |
| `workflow-managed/possible-match` | 本地 Workflow 项目和 Notion page 可能相关但不是 Project Home。 | review | `relation-review` | 深读 Notion page 后确认。 |
| `relation-review` | 版本、重写、fork、legacy、successor 等关系候选。 | relation only | `link-graph-review` | 不创建/合并；进入 Project Link Graph。 |
| `workflow-managed/archived-predecessor` | 本地/Notion 曾经是项目，但用户确认已被新版或新项目替代。 | no, legacy only | `archive-and-link-successor` | 保留为 legacy corpus，链接到当前 canonical 项目，不作为当前 Project Home。 |
| `workflow-managed/current-successor` | 用户确认这是旧项目的当前有效后继项目。 | yes | `register-current-and-link-legacy` | 作为 canonical Project Home；旧项目/旧 Notion 页仅作为 legacy source 或 redirect。 |
| `ignore` | 明确不纳入全局维护。 | no | `ignore-with-reason` | 不同步。 |

## 默认动作语义

| 动作 | 含义 | 是否有外部副作用 |
|---|---|---:|
| `register-and-bind` | 新增/补全 registry 条目，绑定 local path 和 Notion page ref。 | no in research; later local write only |
| `enrich-registry` | 对已有 registry 项补充 Notion ref、aliases、relation refs、sync status。 | no in research; later local write only |
| `register-and-bind-alias` | 和 `register-and-bind` 相同，但要求记录 alias mapping。 | no in research; later local write only |
| `bind-as-pre-workflow` | 绑定 git-only 项目和 Notion page，项目状态设为 `pre-workflow`。 | no in research; later local write only |
| `local-only-review` | 保留为候选，不创建 Notion page，等待用户/规则确认。 | no |
| `schema-review` | 先判断 `.pipeline` 是否旧格式、损坏、测试残留或未完成接入。 | no |
| `local-git-review` | 对 git-only 项目做纳入判断，可能进入 pre-Workflow、Knowledge、Paper、External。 | no |
| `paper-object-review` | 判断是否进入 Project Registry，还是进入 future Writing/Paper object registry。 | no |
| `knowledge-object-review` | 归类为 Knowledge/Reference 候选，不作为 Project Home。 | no |
| `notion-only-review` | 深读 Notion page 判断其是否项目、想法、已废弃、或无本地代码对象。 | remote read only |
| `spec-relation-review` | 将 spec/design page 作为项目关系边，而非独立 project。 | remote read only |
| `link-graph-review` | 为 `successor`、`legacy_of`、`fork_of`、`rewrite_of` 等关系建候选边。 | no |
| `archive-and-link-successor` | 旧项目/旧页不再作为当前项目，只保留历史索引、legacy content 和 successor 链接。 | no in research; later local/Notion dry-run |
| `register-current-and-link-legacy` | 将新项目设为 canonical，旧项目/旧页作为 predecessor/legacy source 挂到关系图和整理队列。 | no in research; later local/Notion dry-run |
| `ignore-with-reason` | 明确排除，并记录 reason，避免下次重复提示。 | no |

## 第一版 Registry 纳入门槛

项目满足任一条件即可进入第一版 registry draft：

1. 本地有有效 `.pipeline/state.yaml`，且项目不是明显测试/历史/临时目录。
2. Notion `Hypo Projects` 有 Project-like page，且能匹配本地项目。
3. 用户已明确提到该对象需要长期维护，例如 `Hypo-Writer`。
4. 项目参与跨项目联动，例如共享 Secret、共享规则、作为另一个项目的 successor/fork。

默认不进入第一版 registry，但保留 review：

1. 外部依赖 repo，例如 `openai-codex`、`instant-ngp` 这类可能不是用户维护主体的仓库。
2. 论文/文献/资料集合，除非用户明确希望作为项目管理。
3. 课程/测试/实验站点，除非它们仍在活跃维护。
4. 只有 Notion page、没有本地对象、且页面更像笔记/想法/学习资料。

## DR001 项目应用结果

### 默认纳入第一版 registry draft

| 项目 | 分类 | 默认动作 | 说明 |
|---|---|---|---|
| Hypo-Workflow | `workflow-managed/matched` | `register-and-bind` | 当前 pilot。 |
| Hypo-Claw | `workflow-managed/current-successor` | `register-current-and-link-legacy` | 用户确认当前 canonical 项目；前身是 `Hypo-Agent`，旧页/旧项目归档。 |
| Hypo-Research | `workflow-managed/matched` | `register-and-bind` | 本地和 Notion 都存在。 |
| Hypo-Coder | `workflow-managed/alias-matched` | `register-and-bind-alias` | Notion 为 `Hypo Coder`。 |
| Hypo-Homework | `workflow-managed/matched` | `register-and-bind` | 本地和 Notion 都存在。 |
| Hypo-Info-V2 | `workflow-managed/current-successor` | `register-current-and-link-legacy` | 用户确认当前 canonical 项目；旧 `Hypo-Info` 做得有问题，需要归档并链接。 |
| Hypo-LLM | `workflow-managed/matched` | `register-and-bind` | 需要关联 `Hypo-LLM-v2`。 |
| Hypo-Switcher | `workflow-managed/registered/matched` | `enrich-registry` | 已在 registry。 |
| Hypo-Basics | `workflow-managed/local-only` | `local-only-review` | 已在 registry，但 Notion 无 page。 |
| Hypo-Writer | `workflow-managed/local-only` | `local-only-review` | 用户明确提到长期维护多文章需求，强候选。 |

### 作为 pre-Workflow 纳入候选

| 项目 | 分类 | 默认动作 | 说明 |
|---|---|---|---|
| Hypo-GPU | `git-only/matched` | `bind-as-pre-workflow` | Notion 有项目页。 |
| Hypo-WTT | `git-only/matched` | `bind-as-pre-workflow` | Notion 有项目页。 |
| Hypoxanthine-LaTeX | `git-only/alias-matched` | `bind-as-pre-workflow-alias` | Notion 为 `Hypo-LaTeX`。 |
| Hypo-Marp | `git-only/matched` | `bind-as-pre-workflow` | Notion 有项目页。 |
| Hypo-Thesis | `git-only/matched` | `bind-as-pre-workflow` | Notion 有项目页。 |
| Hypoxanthine-Bill | `git-only/alias-matched` | `bind-as-pre-workflow-alias` | Notion 为 `Hypo-Bill`。 |

### 进入 relation-review

| 对象 | 默认关系 | 说明 |
|---|---|---|
| Hypo-Info -> Hypo-Info-V2 | `replaced_by` | 用户确认旧 Hypo-Info 做得有问题，当前版本是 Hypo-Info-V2。 |
| Hypo-Agent -> Hypo-Claw | `replaced_by` | 用户确认 Hypo-Claw 的前身是 Hypo-Agent。 |
| Hypo-LLM -> Hypo-LLM-v2 | `successor` or `fork_of` | 两者 state 相似，需确认。 |
| Hypo-Switcher-v1 -> Hypo-Switcher | `legacy_of` | v1 rejected/needs_revision，新版已 registry。 |
| Hypo-Agent -> Hypo-Agent-ts-rewrite | `rewrite_of` | rewrite 目录 partial `.pipeline`。 |
| Lab-Website-Test-V1/V2 -> 课程网站 Design Spec | `spec_for` | Notion 是 spec，不一定是项目主页。 |
| Ramulator2 -> Ramulator2-v2.1 | `version_of` | 一个 Workflow，一个 git-only。 |

### 默认 review / 暂不纳入

| 对象 | 分类 | 默认动作 | 说明 |
|---|---|---|---|
| AccelSim | `workflow-managed/local-only` | `local-only-review` | 可能是研究项目，需确认是否个人长期维护。 |
| Anima | `workflow-managed/local-only` | `local-only-review` | 中文项目名，需确认 Notion 是否另有页面。 |
| FHE | `workflow-managed/local-only` | `local-only-review` | 可能是研究集合。 |
| Hypo-Extractor | `workflow-managed/local-only` | `local-only-review` | 当前 stopped/gate_waiting。 |
| Hypo-NGP | `workflow-managed/local-only` | `local-only-review` | 可能与 RenderLab/NGP 相关。 |
| Hypo-Rasterizer | `workflow-managed/local-only` | `local-only-review` | release 状态，需确认长期维护性。 |
| Ramulator2 | `workflow-managed/local-only` | `local-only-review` | 研究/系统项目。 |
| VSP-Coder | `workflow-managed/local-only` | `local-only-review` | 活跃但 Notion 无 page。 |
| VSP-Framework | `workflow-managed/local-only` | `local-only-review` | completed，无 Notion page。 |
| XSXPre | `workflow-managed/local-only` | `local-only-review` | completed，无 Notion page。 |
| Hypo-Courses | `git-only/local-only` | `local-git-review` | 课程/文档体系候选。 |
| Hypo-Healthy | `git-only/local-only` | `local-git-review` | 可能应在 Work Life Balance，不一定是 Hypo Projects。 |
| Hypo-RenderLab | `git-only/local-only` | `local-git-review` | 可能与 Hypo-NGP 相关。 |
| Hypoxanthine-Lang | `git-only/local-only` | `local-git-review` | 无 Notion page。 |
| CryoModel | `git-only/local-only` | `local-git-review` | 研究项目候选。 |
| HYX-Spinal-Template | `git-only/local-only` | `reference-or-ignore` | 模板类项目，默认不作为主项目。 |
| instant-ngp | `external/git-only` | `reference-or-ignore` | 可能是外部依赖。 |
| Literature | `content/research/local-only` | `knowledge-object-review` | 更像 Knowledge/Reference。 |
| openai-codex | `external/git-only` | `reference-or-ignore` | 外部工具 repo。 |
| SHTU-Paper | `paper/local-only` | `paper-object-review` | 论文对象，可能不归 Project Registry。 |
| sub2api-cost-scheduler | `git-only/local-only` | `local-git-review` | 可能关联 Hypo-LLM。 |
| TJM_RISCV_Core | `git-only/local-only` | `local-git-review` | 硬件项目候选。 |

### Notion-only / Knowledge 候选

| 页面 | 分类 | 默认动作 | 说明 |
|---|---|---|---|
| Hypo-Emoji | `notion-only` | `notion-only-review` | 未找到顶层本地项目。 |
| Hypo-Image | `notion-only` | `notion-only-review` | 可能对应 skill，不是顶层 repo。 |
| Hypo-Pet | `notion-only` | `notion-only-review` | 未找到顶层本地项目。 |
| 工具学习笔记 | `notion-note` | `knowledge-page-review` | 更像 Knowledge。 |
| 课程网站 Design Spec | `notion-spec/possible-project-link` | `spec-relation-review` | 可能关联 Lab Website 项目。 |

## Registry Draft 字段建议

```yaml
id: hypo-workflow
display_name: Hypo-Workflow
classification: workflow-managed
adoption_status: workflow-managed
local:
  path: /home/heyx/Hypo-Workflow
  state_status: planning
  workflow_schema: current
notion:
  page_id: 528322b7-e9d5-40bd-a2e8-8350602c9feb
  title: Hypo-Workflow
  binding_status: matched
aliases: []
relations: []
sync:
  status: pending_dry_run
  last_scanned_at: null
review:
  required: false
  reason: null
```

## DR003 输入

DR003 需要根据本 taxonomy 决定这些字段的 source of truth 放在哪里：

- 扩展 `~/.hypo-workflow/projects.yaml`
- 新建 `~/.hypo-workflow/workspace.yaml`
- 根目录 `.pipeline/maintenance/registry.yaml`

本报告倾向于：`workspace.yaml` 作为 Global Workspace authority，`projects.yaml` 保持为兼容/轻量派生视图。
