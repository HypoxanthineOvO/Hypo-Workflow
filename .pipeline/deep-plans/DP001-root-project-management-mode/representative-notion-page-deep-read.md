# DR005 代表性 Notion 页面深读

Deep Plan: C16 根目录项目管理模式  
Generated: 2026-05-18T23:15:30+08:00  
Mode: Notion remote read-only via `ntn`; no Notion writes. Token was injected from local secret storage and was not printed or copied into this report.

## Scope

本轮只读深读四个代表性 Notion 页面，用来验证 Project Home、Legacy Reconciliation、pre-Workflow 项目和非 repo 对象的同步模板：

| Notion page | Role in research | Local/current counterpart | Expected handling |
|---|---|---|---|
| `Hypo-Info` | legacy predecessor page | `Hypo-Info-V2` current project | Archive/link as predecessor; current Project Home must bind to `Hypo-Info-V2`. |
| `Hypo-Agent` | legacy predecessor page | `Hypo-Claw` current project | Archive/link as predecessor; selected child docs can be projected into Hypo-Claw Knowledge/Docs. |
| `Hypo-GPU -- 教学级 GPU Simulator` | pre-Workflow manual Project Home | local git-only `Hypo-GPU` | Preserve as manual snapshot; show missing Workflow artifacts explicitly. |
| `Hypo-Image` | Notion-only / skill-backed object | `~/.codex/skills/hypo-image` | Treat as `skill/service`, not ordinary project repo. |

## Hypo-Info

Page id: `328819d0-6774-800f-ba24-cc78c23cf8a7`  
Created: 2026-03-19T06:45:00Z  
Last edited: 2026-05-10T07:42:00Z

Top-level structure:

| Block type | Count |
|---|---:|
| heading_1 | 2 |
| heading_2 | 1 |
| heading_3 | 3 |
| child_page | 9 |
| table | 1 |
| code | 1 |
| list items | 9 |
| paragraph/divider | 2 |

Observed page domains:

- `项目简介`: old Hypo-Info overview, positioned as a personal information portal with automated collection, AI enhancement, storage, and display.
- `核心流程`: collection, full-text extraction, AI enhancement, storage, and display.
- `关键设计原则`: MVP-first, media/self-media first, self-built collection, frontend/backend separation.
- `技术栈`: old FastAPI/Vue/SQLite/AI-service framing.
- `讨论与设计` and `开发日志`: legacy design and progress corpus.

Child pages:

| Child page | Classification |
|---|---|
| `AI 开发流程` | Process knowledge / legacy workflow practice. |
| `Brainstorm` | Legacy discussion. |
| `开发计划` | Legacy milestone roadmap. |
| `架构规划` | Legacy architecture design. |
| `开发日志` | Legacy progress log. |
| `M-RichText：富文本内容采集与渲染` | Legacy module/milestone detail. |
| `M7 Eval 7.9.3b -- Bayesian BT 结果自检与异常分析` | Legacy evaluation detail. |
| `M7 Hotfix 7.9.4 -- Bayesian BT 生产接入...` | Legacy hotfix detail. |
| `Hypo-Info 分叉部署计划：Genesis (Lab) / Eden (Personal)` | Legacy deployment plan / architecture decision. |

Deep-read samples:

- `AI 开发流程` describes a manual Notion + Codex iteration flow: discuss in Notion, generate a Codex prompt, approve plan, log work, execute, check, debug, update docs, then prepare the next prompt. It is process knowledge, not current status.
- `开发计划` contains MVP/M0-M7 planning. It is valuable as historical roadmap but should not override current `Hypo-Info-V2` state.
- `架构规划` describes the old five-layer collection/full-text/AI/storage/frontend architecture.
- `分叉部署计划` describes Genesis/Eden deployment split, profile overlays, sources, sections, and deployment tasks.

DR005 conclusion:

`Hypo-Info` is a legacy Project Home for the old project. It should not be reused as the current canonical Project Home without an explicit archive/merge step. The current registry should bind `Hypo-Info-V2` as canonical and keep this Notion page as `legacy_predecessor`, with selected child pages linked under `Architecture / Legacy Design`, `Knowledge / Process`, and `Progress / Legacy Milestones`.

## Hypo-Agent

Page id: `317819d0-6774-8081-b832-fed31c5d497f`  
Created: 2026-03-02T08:20:00Z  
Last edited: 2026-05-10T07:42:00Z

Top-level structure:

| Block type | Count |
|---|---:|
| callout | 2 |
| child_page | 9 |
| column_list | 2 |

Observed page domains:

- The opening callout frames Hypo-Agent as a personal always-on AI assistant with long-lived online execution, modular Skills, multi-model routing, and safety boundaries.
- A second callout appears to be status-oriented, but much of the content is inside columns and child pages.

Child pages:

| Child page | Classification |
|---|---|
| `使用反馈与改进记录` | Legacy feedback / product iteration knowledge. |
| `v1.0 正式上线清单` | Legacy release checklist / ops checklist. |
| `Hypo-Info` | Cross-project child / relation evidence. |
| `微信 iLink Bot API 接口文档` | API reference / integration docs. |
| `飞书接入调研` | Integration research. |
| `前端代码审计结果（Claude）` | Audit report. |
| `后端代码审计结果（Codex）` | Audit report. |
| `前端测试审计结果（Claude）` | Test audit report. |
| `后端测试审计结果（Codex）` | Test audit report. |

Deep-read samples:

- `使用反馈与改进记录` holds UX patch feedback rounds and improvement notes. This is durable Knowledge, not current execution state.
- `v1.0 正式上线清单` holds persona, memory cleanup, deployment config verification, secret config validity, systemd/nginx, and cleanup tasks. It is a release/ops checklist for the predecessor project.
- `Hypo-Info` child is cross-project relation evidence.
- `微信 iLink Bot API 接口文档` is API reference material. It contains placeholder/token field names and endpoint examples; it should be treated as integration docs and projected without raw secret values.

DR005 conclusion:

`Hypo-Agent` is the predecessor corpus for `Hypo-Claw`. It should be archived and linked from current `Hypo-Claw`, not treated as the active project. Useful child pages should be migrated or linked into `Hypo-Claw` domains:

- `Docs / Integrations`: iLink and Feishu docs.
- `Knowledge / Product Feedback`: usage feedback records.
- `Progress / Legacy Releases`: v1.0 checklist.
- `Reports / Legacy Audits`: frontend/backend code and test audits.

## Hypo-GPU

Page id: `2449f319-7d67-4c32-a8a4-49c2e382b3e6`  
Created: 2026-04-08T13:06:00Z  
Last edited: 2026-05-10T07:42:00Z

Top-level structure:

| Block type | Count |
|---|---:|
| heading_2 | 4 |
| heading_3 | 7 |
| child_page | 10 |
| table | 5 |
| list items | 27 |
| paragraph/divider | 13 |

Observed page domains:

- Project overview: teaching-grade GPU simulator for learning GPU microarchitecture and supporting Cryo-GPU research.
- Technical choices: simplified NVIDIA-style GPU, custom ISA, Python with strict typing.
- Development process: role split, single-milestone workflow, design-change process, prompt style, Git branch strategy, guide docs, commit message rules.
- Milestone roadmap: M0-M8.

Child pages:

| Child page | Classification |
|---|---|
| `M0 -- 骨架搭建` | Manual milestone page, completed. |
| `M1 -- 单线程标量执行` | Manual milestone page, design-stage snapshot. |
| `M2 -- SIMT 多线程` | Manual milestone page. |
| `M3 -- 分支 + SIMT Stack` | Manual milestone page. |
| `M4 -- Block Barrier + Shared Memory` | Manual milestone page. |
| `M5 -- 多 SM + Kernel Launch` | Manual milestone page. |
| `M6 -- Warp Scheduling 策略` | Manual milestone page. |
| `M7 -- Memory Latency 建模` | Manual milestone page. |
| `M8 -- 性能统计 + 可视化` | Manual milestone page. |
| `教程风格转换指南` | Docs/Knowledge page. |

Deep-read samples:

- `M0` includes target structure, GPUConfig, ISA, assembler, empty `GPU.run`, Git tag `v0.0`, and completion evidence such as test count.
- `M1` includes the one-warp/one-thread ALU and global memory plan, Git tag `v0.1`, and a design-stage status.
- `教程风格转换指南` defines how to transform formal Codex design docs into owner-facing tutorial style.

DR005 conclusion:

`Hypo-GPU` is the cleanest pre-Workflow Project Home sample. It has a valid manual milestone tree but no local `.pipeline` artifact chain. The Storage Sync Template must support `pre_workflow_manual` state:

- current status comes from Notion/manual snapshot until Workflow is initialized;
- prompts/reports are absent, not broken;
- manual milestone pages can be preserved under `Progress / Legacy Manual Milestones`;
- tutorial conversion rules can be placed under `Docs` or `Knowledge`.

## Hypo-Image

Page id: `3a9c0d19-940d-47e0-b6e4-6ecb11906e2b`  
Created: 2026-04-28T07:11:00Z  
Last edited: 2026-05-16T05:23:00Z

Top-level structure:

| Block type | Count |
|---|---:|
| heading_2 | 11 |
| heading_3 | 8 |
| code | 9 |
| table | 3 |
| callout | 2 |
| list items | 10 |
| paragraph/divider/quote | 19 |

Observed page domains:

- design goals;
- architecture, file layout, and call chain;
- `SKILL.md` behavior;
- wrapper script behavior;
- private config location and installation;
- usage examples;
- parameters and compatibility;
- future plans.

Local counterpart:

- `~/.codex/skills/hypo-image/SKILL.md` exists.
- The skill wraps the system image generation CLI and injects image API configuration into the child process only.
- The skill explicitly forbids passing raw API keys in prompts/args/history/generated docs and constrains model usage to the intended image model.

DR005 conclusion:

`Hypo-Image` is not a normal project repo. It is a `skill/service` object backed by a local Codex skill and private runtime config. The global object model must support non-project objects:

- object type: `skill`;
- source refs: local skill path and optional wrapper/config refs;
- Notion page: Project-like docs page, but not `.pipeline` managed;
- secret refs: stored only as references to Global Secret Store capabilities, never raw values;
- sync behavior: docs/spec projection and health checks, not Cycle progress.

## Cross-Sample Template Lessons

The representative Notion pages require four object shapes:

| Shape | Examples | Required template support |
|---|---|---|
| Current Workflow project with legacy predecessor | `Hypo-Info-V2` + `Hypo-Info`; `Hypo-Claw` + `Hypo-Agent` | New/current Project Home plus archived predecessor links and selected legacy import/link projections. |
| Pre-Workflow manual project | `Hypo-GPU` | Manual milestone pages, missing Workflow artifacts, optional later initialization. |
| Skill/service object | `Hypo-Image` | Docs/spec sync, capability/secret refs, no `.pipeline` assumption. |
| Legacy project corpus | old `Hypo-Info`, old `Hypo-Agent` | Preserve, classify, link, and migrate selected pages; do not overwrite as current. |

## Project Home Mapping Rule

For Notion pages that already exist, the first operation should be `merge-plan`, not `append` or `replace`:

1. `discover`: read page metadata, top-level blocks, children, and selected child contents.
2. `classify`: assign each block/page to Overview, Progress, Architecture, Knowledge, Docs, Prompts, Reports, Legacy, or Unknown.
3. `bind`: connect Notion page to workspace object id and local source refs.
4. `merge-plan`: generate target Project Home tree and legacy relocation/link plan.
5. `dry-run`: show page changes with no remote writes.
6. `apply`: only after user confirmation.
7. `verify`: re-read remote and compare expected block/page map.
8. `record`: append maintenance ledger event with sanitized evidence.

## Open Items For Planning

- Whether archived predecessor pages should be renamed in Notion or only linked with status labels.
- Whether the first implementation should create new current Project Home pages for `Hypo-Info-V2` and `Hypo-Claw`, or only produce local dry-run merge plans.
- How much child-page body content should be imported in v1 versus linked as legacy corpus.
- Whether `skill/service` objects should appear in the same Project Registry or in a broader Object Registry with `type: skill`.
