# Global Project Reconciliation Draft

生成时间：2026-05-18T19:02:13+08:00

范围：DR001 三方项目对账 dry-run。输入来自：

- 本地全局 registry：`~/.hypo-workflow/projects.yaml`
- 本地顶层目录：`/home/heyx/*`
- Notion：`Hypoxanthine's Home` 中 `Hypo Projects` 分组下的 child pages

本报告只读本地和 Notion；没有写入 Notion，也没有修改其他项目。

## 结论摘要

- 当前全局 registry 只有 2 个项目：`Hypo-Switcher`、`Hypo-Basics`。
- `/home/heyx` 顶层发现 28 个带 `.pipeline` 的 Workflow-like 项目。
- `/home/heyx` 顶层发现 37 个 git 项目，其中 19 个是 git-only 顶层项目。
- `/home/heyx` 顶层发现 42 个 README/package/build 候选项目。
- Notion `Hypo Projects` 分组下发现 19 个 child pages。
- 三套集合不一致，不能直接把任意一套当成全局 truth；第一版 Global Project Registry 需要显式 reconciliation manifest。

## 对账规则草案

| 规则 | 说明 |
|---|---|
| exact-name | 标题和本地目录归一化后相同，例如 `Hypo-Workflow`。 |
| alias-name | 标题和目录明显同源但命名不同，例如 `Hypo Coder` ↔ `Hypo-Coder`。 |
| version-relation | `-v1`、`-v2`、rewrite 等不自动合并，先建 relation，例如 `replaces`、`fork_of`、`legacy_of`。 |
| notion-title-suffix | Notion 标题带描述后缀时先剥离描述，例如 `Hypo-GPU — 教学级 GPU Simulator`。 |
| non-project-page | Notion 页看起来是笔记或 spec，不直接进入 Project Registry，先进入 review。 |
| local-only | 有本地项目但无 Notion page，先标记 local-only，不自动创建远端页。 |
| notion-only | 有 Notion page 但无本地项目，先标记 notion-only，不自动创建本地项目。 |

## Registry 覆盖情况

| Registry 项目 | 本地路径 | 本地状态 | Notion 对应 | 对账动作 |
|---|---|---|---|---|
| Hypo-Switcher | `/home/heyx/Hypo-Switcher` | completed | `Hypo-Switcher` (`dbb464fb-7586-4e07-bee9-a24c82754eaa`) | enrich-registry：补 Notion page id；关联 `Hypo-Switcher-v1` 为 legacy/rejected branch。 |
| Hypo-Basics | `/home/heyx/Hypo-Basics` | completed | 无 | local-only-review：决定是否创建/绑定 Notion Project Home。 |

## Canonical Mapping Draft

| canonical_id | display_name | local_path | local_state | registry | notion_page | classification | proposed_action | notes |
|---|---|---|---|---|---|---|---|---|
| accelsim | AccelSim | `/home/heyx/AccelSim` | pending_acceptance | no | none | workflow-managed/local-only | local-only-review | 需要判断是否进入个人项目同步范围，或作为研究/外部项目。 |
| anima | Anima | `/home/heyx/Anima` | running / needs_revision | no | none | workflow-managed/local-only | local-only-review | 中文项目名 `赛博生命`，无 Notion 项目页。 |
| fhe | FHE | `/home/heyx/FHE` | idle / completed | no | none | workflow-managed/local-only | local-only-review | 可能是研究项目集合。 |
| hypo-agent | Hypo-Agent | `/home/heyx/Hypo-Agent` | executing | no | `Hypo-Agent` (`317819d0-6774-8081-b832-fed31c5d497f`) | workflow-managed/archived-predecessor | archive-and-link-successor | 用户确认这是 `Hypo-Claw` 的前身；后续应归档为 legacy，不作为当前 canonical 项目。 |
| hypo-agent-ts-rewrite | Hypo-Agent TS Rewrite | `/home/heyx/Hypo-Agent-ts-rewrite` | partial `.pipeline` / no state | no | none | partial-workflow/local-only | relation-review | 可能与 `Hypo-Agent` 存在 rewrite/replaces 关系。 |
| hypo-assistant | Hypo-Assistant | `/home/heyx/Hypo-Assistant` | planning | no | none | partial-workflow/local-only | local-only-review | state 使用旧 planning schema。 |
| hypo-basics | Hypo-Basics | `/home/heyx/Hypo-Basics` | completed | yes | none | workflow-managed/local-only | bind-or-create-page | registry 已有但 Notion 无对应页。 |
| hypo-claw | Hypo-Claw | `/home/heyx/Hypo-Claw` | executing | no | none | workflow-managed/current-successor | register-current-and-link-legacy | 用户确认当前 canonical 项目是 Hypo-Claw，前身为 `Hypo-Agent`；当前无 Notion 项目页，后续需要 dry-run 创建/绑定 Project Home。 |
| hypo-coder | Hypo-Coder | `/home/heyx/Hypo-Coder` | completed | no | `Hypo Coder` (`312819d0-6774-8046-a2cb-ea286e2ee2d0`) | workflow-managed/alias-matched | register-and-bind-alias | Notion 标题使用空格；本地使用 hyphen。 |
| hypo-extractor | Hypo-Extractor | `/home/heyx/Hypo-Extractor` | stopped / gate_waiting | no | none | workflow-managed/local-only | local-only-review | 需要确认是否长期项目。 |
| hypo-homework | Hypo-Homework | `/home/heyx/Hypo-Homework` | completed | no | `Hypo-Homework` (`608588e7-d6a1-4d1a-88fe-728f490819ce`) | workflow-managed/matched | register-and-bind | 本地与 Notion 直接匹配。 |
| hypo-info | Hypo-Info | `/home/heyx/Hypo-Info` | running / plan_discover | no | `Hypo-Info` (`328819d0-6774-800f-ba24-cc78c23cf8a7`) | workflow-managed/archived-predecessor | archive-and-link-successor | 用户确认之前做得有问题，应归档为 `Hypo-Info-V2` 的 legacy 前身，不作为当前 canonical 项目。 |
| hypo-info-v2 | Hypo-Info-V2 | `/home/heyx/Hypo-Info-V2` | pending_acceptance | no | none | workflow-managed/current-successor | register-current-and-link-legacy | 用户确认当前 canonical 项目是 Hypo-Info-V2；后续需要 dry-run 创建/绑定 Project Home，并链接旧 `Hypo-Info` 页面。 |
| hypo-llm | Hypo-LLM | `/home/heyx/Hypo-LLM` | blocked | no | `Hypo-LLM` (`5b5ea577-dee9-44bc-b97e-5e9115366d12`) | workflow-managed/matched | register-and-bind | 同时存在 `Hypo-LLM-v2`，需要 version relation。 |
| hypo-llm-v2 | Hypo-LLM-v2 | `/home/heyx/Hypo-LLM-v2` | blocked | no | none | workflow-managed/local-only | relation-review | 可能是 `Hypo-LLM` successor/fork；当前 state 与 Hypo-LLM 高度相似。 |
| hypo-ngp | Hypo-NGP | `/home/heyx/Hypo-NGP` | stopped | no | none | workflow-managed/local-only | local-only-review | 可能和 render/NGP 项目相关。 |
| hypo-rasterizer | Hypo-Rasterizer | `/home/heyx/Hypo-Rasterizer` | completed / lifecycle_release | no | none | workflow-managed/local-only | local-only-review | 无 Notion 项目页。 |
| hypo-research | Hypo-Research | `/home/heyx/Hypo-Research` | idle | no | `Hypo-Research` (`5775b07e-e074-413e-9ef8-2a5f62c508d2`) | workflow-managed/matched | register-and-bind | 本地与 Notion 直接匹配。 |
| hypo-switcher | Hypo-Switcher | `/home/heyx/Hypo-Switcher` | completed | yes | `Hypo-Switcher` (`dbb464fb-7586-4e07-bee9-a24c82754eaa`) | workflow-managed/registered/matched | enrich-registry | 已登记；需补 Notion binding。 |
| hypo-switcher-v1 | Hypo-Switcher-v1 | `/home/heyx/Hypo-Switcher-v1` | running / needs_revision | no | none | workflow-managed/local-only | relation-review | 应与 `Hypo-Switcher` 建 legacy/fork relation，而不是独立主项目。 |
| hypo-workflow | Hypo-Workflow | `/home/heyx/Hypo-Workflow` | planning / C16 | no | `Hypo-Workflow` (`528322b7-e9d5-40bd-a2e8-8350602c9feb`) | workflow-managed/matched | register-and-bind | 当前 pilot 项目；Notion 页已做 mapping dry-run。 |
| hypo-writer | Hypo-Writer | `/home/heyx/Hypo-Writer` | waiting_acceptance | no | none | workflow-managed/local-only | local-only-review | 用户特别提到多文章维护，应进入第一版强候选。 |
| lab-website-test-v1 | Lab Website Test V1 | `/home/heyx/Lab-Website-Test-V1` | completed | no | possibly `课程网站 Design Spec` (`237e8162-8444-4bfc-bfcb-ac31b7b3889a`) | workflow-managed/possible-match | relation-review | Notion 页可能是设计 spec，不一定是 Project Home。 |
| lab-website-test-v2 | Lab Website Test V2 | `/home/heyx/Lab-Website-Test-V2` | completed | no | possibly `课程网站 Design Spec` (`237e8162-8444-4bfc-bfcb-ac31b7b3889a`) | workflow-managed/possible-match | relation-review | 可能是 V1 的 successor；需与课程网站 spec 对账。 |
| ramulator2 | Ramulator2 | `/home/heyx/Ramulator2` | idle / lifecycle_init | no | none | workflow-managed/local-only | local-only-review | 研究/系统项目候选。 |
| vsp-coder | VSP-Coder | `/home/heyx/VSP-Coder` | running / needs_revision | no | none | workflow-managed/local-only | local-only-review | 无 Notion 项目页。 |
| vsp-framework | VSP-Framework | `/home/heyx/VSP-Framework` | completed | no | none | workflow-managed/local-only | local-only-review | 无 Notion 项目页。 |
| xsxpre | XSXPre | `/home/heyx/XSXPre` | completed | no | none | workflow-managed/local-only | local-only-review | 无 Notion 项目页。 |
| hypoxanthine-bill | Hypoxanthine-Bill | `/home/heyx/Hypoxanthine-Bill` | git-only | no | `Hypo-Bill` (`318819d0-6774-80c1-a8dd-d74185345f82`) | git-only/alias-matched | bind-as-pre-workflow | Notion 名是 `Hypo-Bill`，本地目录是 `Hypoxanthine-Bill`。 |
| hypo-gpu | Hypo-GPU | `/home/heyx/Hypo-GPU` | git-only | no | `Hypo-GPU — 教学级 GPU Simulator` (`2449f319-7d67-4c32-a8a4-49c2e382b3e6`) | git-only/matched | bind-as-pre-workflow | Notion 标题带描述后缀。 |
| hypo-wtt | Hypo-WTT | `/home/heyx/Hypo-WTT` | git-only | no | `Hypo-WTT` (`7aa8ce5e-cf11-4615-a418-77806f32a9f6`) | git-only/matched | bind-as-pre-workflow | 未接入 Workflow。 |
| hypoxanthine-latex | Hypoxanthine-LaTeX | `/home/heyx/Hypoxanthine-LaTeX` | git-only | no | `Hypo-LaTeX` (`318819d0-6774-8013-aee4-c61317042a53`) | git-only/alias-matched | bind-as-pre-workflow | Notion 名是 `Hypo-LaTeX`，本地目录是 `Hypoxanthine-LaTeX`。 |
| hypo-marp | Hypo-Marp | `/home/heyx/Hypo-Marp` | git-only | no | `Hypo-Marp` (`dfef4ed3-4493-4f1b-8305-43f3859b918f`) | git-only/matched | bind-as-pre-workflow | 未接入 Workflow。 |
| hypo-thesis | Hypo-Thesis | `/home/heyx/Hypo-Thesis` | git-only | no | `Hypo-Thesis` (`5ffd4c9d-d5be-4522-ac15-146ef7099b7c`) | git-only/matched | bind-as-pre-workflow | 未接入 Workflow。 |
| hypo-courses | Hypo-Courses | `/home/heyx/Hypo-Courses` | git-only | no | none | git-only/local-only | local-only-review | 可能与课程/文档体系相关。 |
| hypo-healthy | Hypo-Healthy | `/home/heyx/Hypo-Healthy` | git-only | no | none | git-only/local-only | local-only-review | 可能与 Notion `Work Life Balance` 下健康笔记相关，但不在 `Hypo Projects`。 |
| hypo-renderlab | Hypo-RenderLab | `/home/heyx/Hypo-RenderLab` | git-only | no | none | git-only/local-only | local-only-review | 可能与 `Hypo-NGP` / render 项目相关。 |
| hypoxanthine-lang | Hypoxanthine-Lang | `/home/heyx/Hypoxanthine-Lang` | git-only | no | none | git-only/local-only | local-only-review | 命名为 Hypoxanthine 系列，但 Notion 无对应页。 |
| cryomodel | CryoModel | `/home/heyx/CryoModel` | git-only | no | none | git-only/local-only | local-only-review | 研究项目候选。 |
| hyx-spinal-template | HYX-Spinal-Template | `/home/heyx/HYX-Spinal-Template` | git-only | no | none | git-only/local-only | local-only-review | 模板类项目，可能默认 exclude 或归类 reference。 |
| instant-ngp | instant-ngp | `/home/heyx/instant-ngp` | git-only | no | none | git-only/local-only | local-only-review | 外部/研究依赖可能性高，需确认是否纳入。 |
| literature | Literature | `/home/heyx/Literature` | git-only | no | none | content/research/local-only | local-only-review | 可能更适合 Knowledge/Reference，不一定是 Project。 |
| openai-codex | openai-codex | `/home/heyx/openai-codex` | git-only | no | none | external/git-only | likely-ignore-or-reference | 看起来是外部工具 repo，默认不进入个人项目同步。 |
| ramulator2-v2.1 | Ramulator2-v2.1 | `/home/heyx/Ramulator2-v2.1` | git-only | no | none | git-only/local-only | relation-review | 可能与 `Ramulator2` 有 version/fork relation。 |
| shtu-paper | SHTU-Paper | `/home/heyx/SHTU-Paper` | git-only | no | none | paper/local-only | local-only-review | 论文项目，可能进入 docs/knowledge/paper 类对象。 |
| sub2api-cost-scheduler | sub2api-cost-scheduler | `/home/heyx/sub2api-cost-scheduler` | git-only | no | none | git-only/local-only | local-only-review | 可能与 Hypo-LLM/Sub2API 维护有关。 |
| tjm-riscv-core | TJM_RISCV_Core | `/home/heyx/TJM_RISCV_Core` | git-only | no | none | git-only/local-only | local-only-review | 硬件项目候选。 |
| hypo-emoji | Hypo-Emoji | none | none | no | `Hypo-Emoji` (`1da5b02e-5982-49c8-b310-ca01e03dc64d`) | notion-only | notion-only-review | 未找到顶层本地项目。 |
| hypo-image | Hypo-Image | none | none | no | `Hypo-Image` (`3a9c0d19-940d-47e0-b6e4-6ecb11906e2b`) | notion-only | notion-only-review | 可能对应 Codex skill，不是顶层 repo。 |
| hypo-pet | Hypo-Pet | none | none | no | `Hypo-Pet` (`397e7d5e-9ae9-4ab8-8828-b46907d3f8a0`) | notion-only | notion-only-review | 未找到顶层本地项目。 |
| tools-learning-notes | 工具学习笔记 | none | none | no | `工具学习笔记` (`0840d88c-cc08-4499-bc31-cc714c04e254`) | notion-note | exclude-or-knowledge | 更像 Knowledge/Docs，不是 Project Home。 |
| course-website-design-spec | 课程网站 Design Spec | none | none | no | `课程网站 Design Spec` (`237e8162-8444-4bfc-bfcb-ac31b7b3889a`) | notion-spec/possible-project-link | relation-review | 可能关联 `Lab-Website-Test-V1/V2`，需深读确认。 |

## 第一版强候选项目

这些项目建议优先进入 Global Project Registry 第一批，因为它们有 Workflow 状态、Notion 项目页，或是用户已明确提到的长期维护对象：

- `Hypo-Workflow`
- `Hypo-Writer`
- `Hypo-Research`
- `Hypo-Claw`
- `Hypo-Coder`
- `Hypo-Info-V2`
- `Hypo-LLM` / `Hypo-LLM-v2`
- `Hypo-Switcher`
- `Hypo-Basics`
- `Hypo-Homework`
- `Hypo-GPU`
- `Hypo-Marp`
- `Hypo-Thesis`
- `Hypoxanthine-LaTeX`

## 待确认关系

| relation candidate | reason | proposed relation |
|---|---|---|
| `Hypo-Info` -> `Hypo-Info-V2` | 用户确认旧 Hypo-Info 做得有问题，当前版本是 Hypo-Info-V2。 | `replaced_by`；旧项归档 |
| `Hypo-Agent` -> `Hypo-Claw` | 用户确认 Hypo-Claw 的前身是 Hypo-Agent。 | `replaced_by`；旧项归档 |
| `Hypo-LLM` -> `Hypo-LLM-v2` | 两个本地项目 state 高度相似，Notion 只有 `Hypo-LLM` 页。 | `fork_of` or `successor` |
| `Hypo-Switcher-v1` -> `Hypo-Switcher` | v1 本地处于 rejected/needs_revision，registry/Notion 指向新版。 | `legacy_of` |
| `Hypo-Agent` -> `Hypo-Agent-ts-rewrite` | rewrite 目录只有 partial `.pipeline` 文件。 | `rewrite_of` |
| `课程网站 Design Spec` -> `Lab-Website-Test-V1/V2` | Notion 是 spec 页，本地有两个 lab website workflow 项目。 | `spec_for` |
| `Ramulator2` -> `Ramulator2-v2.1` | 本地一个 Workflow 项目、一个 git-only 版本目录。 | `version_of` |

## 下一步

DR002 应基于本 manifest 定义项目分类规则和默认动作：

- 哪些分类进入第一版 Global Project Registry；
- 哪些分类只作为 Knowledge/Docs/Reference；
- 哪些 local-only 项目应创建/绑定 Notion Project Home；
- 哪些 Notion-only 页面应绑定本地项目、保留为 legacy page，或排除出项目管理范围。
