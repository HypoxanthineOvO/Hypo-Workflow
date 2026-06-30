# C19 Workflow 核心内容与 Plan 模式优化

> 最后更新：2026-06-08T21:22:31+08:00 | 状态：completed / C19-M5 target adaptation applied | 进度：5/5 Milestone

## 当前状态

- Cycle：C19
- 状态：active
- 类型：refactor
- Preset：tdd
- 开始时间：2026-06-08T15:31:09+08:00
- 上下文源：待发现

## 目标摘要

本 Cycle 聚焦优化 Workflow 的核心内容与 Plan 模式。下一步应进入 Plan 发现阶段，读取现有核心规则、命令、Plan 技能、配置与近期反馈，形成可确认的里程碑方案。

## P1 Discover 当前收集

- 固定系统提示词：评估知乎 DeepSeek 优化 AGENTS.md 是否适合融入 Workflow 固定系统提示词，原文或链接待用户提供。
- Plan 阶段：用户希望改成 `Discover -> Technical Stack -> Architecture -> Decompose -> Generate -> Implementation`。
- Discover 边界：只讨论需求本身，例如界面需要哪些内容、要做什么；不讨论用什么技术或怎么实现。
- DeepSeek/AGENTS.md 需求主题：Think Before Coding、Simplicity First、Surgical Changes、Goal-Driven Execution，以及 grill-me 式结构化追问。
- 固定提示词目标：更听指令、更强执行纪律、更会计划。
- Discover 期望产物：产品需求列表、用户故事与验收标准、界面与功能清单、待确认问题列表，并支持架构图、Milestone 表等图表输出。
- 集成体验要求：在 VSP-OpenCode 和 VSP-Codex 中更积极使用平台给出的工具，包括计划工具。
- 优化范围：全局系统提示词、平台 AGENTS.md/CLAUDE.md/OpenCode instructions、Workflow Skills、Plan 模式和执行模式都纳入。
- Plan 交互：关键决策优先用 Question Tool；用户明确要求时可以跳过阶段。
- Discover 完成标准：范围清楚、用户期望效果清楚、验收标准清楚。固定轮次应改为自适应完整度门控，避免为了凑轮次问无意义问题或到点停止思考。
- 行为变化：含糊需求先追问、主动说明假设和权衡、更积极使用工具、输出图表化计划产物、严格分离需求/技术/架构讨论。
- 关键痛点：当前 P2 经常没给出可见产物就进入下一段；Question Tool 经常需要用户提醒才使用。
- 阶段可见产物最低要求：本阶段摘要、决策表、待确认问题列表。
- 图表/表格要求：架构图、阶段流程图、Milestone 表、决策矩阵、依赖关系图。
- 推进规则：阶段无阻塞问题、必须先展示阶段产物、重大门控需 Question Tool 确认。
- 门控反馈：确认卡片前必须在对话中展示实际阶段产物摘要；只给文件路径或只发确认卡不够。

## Technical Stack 当前状态

- 状态：已完成。
- 边界：本阶段可以开始讨论承载机制、现有技术栈、实现方式和平台适配方式。
- 第 1 轮决策：覆盖 Plan 状态机、适配器生成、提示词规则源头、Question Tool 门控合同、图表/表格生成机制和 VSP-OpenCode / VSP-Codex 集成；改造风格为结构化重构；现有栈读取深度为聚焦链路追踪。
- 聚焦链路追踪：已确认现有栈包括 Plan Skills、`core/src/progressive-discover`、`core/src/batch-plan`、adapter guidance、optional `@karpathy/guidelines` 规则包、sync integration spec 和相关测试。
- 阶段产物：已生成 `.plan-state/c19-technical-stack-summary.md`。
- 第 2 轮决策：AGENTS.md 四规则采用“推荐启用 + managed instructions 投影”；新阶段模型落到 Skills + core + 产物 schema；目标仓适配纳入本 Cycle，但源仓完成后仍需确认文件清单和验证计划。
- 修正点：`guidelines` 术语不清，已解释为仓库中已有的“行为指导规则包”，不是新工具。
- 下一步：重新展示修正后的 Technical Stack 摘要，再确认是否进入 Architecture。

## Architecture 当前状态

- 状态：已进入。
- 边界：读取当前架构和关键模块，输出架构图、接入点、决策表和待确认问题；不直接拆 Milestone。
- 只读盘点：已完成 `.pipeline/architecture.md`、V9 架构基线、core exports、Plan helper、batch graph、adapter generation、rules 和 sync surfaces。
- 阶段产物：已生成 `.plan-state/c19-architecture-summary.md`。
- 第 1 轮决策：命令面需要新增或暴露 `tech` / `arch` 阶段子命令，并重新评估当前独立 `confirm` 命令；图表默认 Mermaid + Markdown table；`.pipeline/architecture.md` 应在 Architecture 阶段更新。
- 架构基线：`.pipeline/architecture.md` 已更新为 C19 Plan Phase Model / Gate Visibility / AGENTS.md 四规则 / Visual Artifacts / Integration Sync 架构。
- 最终命令决策：使用 `/hw:plan:technical-stack` 和 `/hw:plan:architecture`；不要用户态 `confirm` 命令，确认改为阶段内 Question Tool / Ask 门控。
- 状态：Architecture 已完成。

## Decompose 当前状态

- 状态：已进入。
- 输入：Discover、Technical Stack、Architecture 三阶段产物和 C19 架构基线。
- 拆解初稿：已生成 5 个 Milestone，见 `.plan-state/c19-decompose.yaml` 和 `.plan-state/c19-technical-route.md`。
- Decompose 决策：用户确认进入 Generate。
- M5 门控修正：M4 完成后必须专门讨论 M5，尤其检查 VSP-OpenCode 是否需要目标侧微调；之后才生成目标文件清单、验证命令并确认写入。

## Generate 当前状态

- 状态：已完成。
- 产物：已生成 5 个 `.pipeline/prompts/` 执行提示和 `.pipeline/confirm-summary.md`。
- 最终确认：用户确认可以 `/hw:start`。
- 下一步：进入 C19-M1 执行。

## Milestone 计划

| Milestone | Prompt | 状态 | Gate |
|---|---|---|---|
| C19-M1 | `00-plan-phase-command-contract.md` | pending | source-side |
| C19-M2 | `01-structured-phase-artifacts-and-adaptive-gates.md` | pending | source-side |
| C19-M3 | `02-prompt-rule-projection-and-platform-adapters.md` | pending | source-side |
| C19-M4 | `03-plan-skills-docs-and-source-regression-closure.md` | completed | source-side full regression |
| C19-M5 | `04-target-repository-adaptation-after-confirmation.md` | completed | post-M4 discussion + target write confirmation |

## 时间线

| 时间 | 类型 | 事件 | 结果 |
|---|---|---|---|
| 2026-06-08T22:35:13+08:00 | Release | C19 target repositories published | 已按 Gate 完成两个目标仓库打标、Release 重建、Workflow 记录和远程推送。Codex-VSP：`af11d8a308` 推送到 `origin/main`，tag/GitLab Release `v0.134.0-vsp.7.2` 已发布，包含 preview tarball 与 sha256；验证 JSON/stale scan/`git diff --check`/Cargo build/version/release sha256/smoke 通过，`pnpm prettier --check` 缺口按 Gate 接受。VSP-Open-Code：`4dc194e9639d0451885e16e2c7ec4548d299c865` 推送到 `origin/dev`，tag/GitLab Release `v1.15.10-vsp.2.4` 已发布，12 个资产上传；验证 Bun focused 11/11、`bun typecheck`、`git diff --check`、build、release packaging、push hooks 与 publish 通过。源端报告见 `.pipeline/reports/C19-target-release-publication.report.md`。 |
| 2026-06-08T21:22:31+08:00 | Execution | C19-M5 target adaptation completed | 已按确认后的 Gate 同步 `~/Codex-VSP` 与 `~/VSP-Open-Code`。Codex-VSP：新增 `/hw:plan:technical-stack`、`/hw:plan:architecture`，移除用户态 `/hw:plan:confirm`，generated agents 改为命名阶段并投影四规则/Gate 可见性；JSON/plugin import/stale scan/`git diff --check` 通过，prettier 因目标环境缺少命令且 node v20 不满足 >=22 未运行。VSP-OpenCode：root `AGENTS.md` 已加入用户提供的完整 DeepSeek-oriented AGENTS prompt，架构文档和 runtime reminder/test 已切到命名 Plan 阶段与 in-phase Ask gate；Bun focused 11/11、`bun typecheck`、`git diff --check` 通过。 |
| 2026-06-08T20:52:37+08:00 | Gate | C19-M5 revised target adaptation plan ready | 已修订 `.pipeline/integrations/C19-target-adaptation-plan.md` 和 matrix：Codex-VSP 可在确认后做 adapter refresh；VSP-OpenCode 必须先获得完整知乎/DeepSeek 提示词正文或链接，才能写入 root `AGENTS.md` 并声明完整集成。YAML 解析和 scoped `git diff --check` 通过。 |
| 2026-06-08T20:49:53+08:00 | Gate Feedback | C19-M5 VSP-OpenCode scope revised | 用户明确 VSP-OpenCode 主要使用 DeepSeek 等国产模型，目标应完整喂入所提知乎文章的 AGENTS.md 提示词；本地仅找到主题短摘和四规则摘要，未找到完整正文，目标仓写入继续等待修订计划和正文来源确认。 |
| 2026-06-08T20:15:21+08:00 | Gate Feedback | C19-M5 write confirmation rejected | 用户指出目标适配计划没有先在对话中展示；目标仓写入继续阻塞，先展示计划摘要并等待修订。 |
| 2026-06-08T20:15:21+08:00 | Gate | C19-M5 target adaptation plan ready | 已只读检查 `~/Codex-VSP` 和 `~/VSP-Open-Code`，写入源仓 `.pipeline/integrations/C19-target-adaptation-plan.md` 与 matrix；两个目标仓均 dirty，目标写入仍等待文件清单、非目标和验证命令确认。 |
| 2026-06-08T19:32:40+08:00 | Gate | C19-M4 completed; C19-M5 target-write Gate reached | 源仓侧 Plan Skills、根 Skill、docs/references、core Discover guidance 和测试契约已同步到命名阶段模型；focused 55/55、`npm test` 674/674、`git diff --check` 通过；目标仓写入仍需 M5 文件清单/验证计划确认。 |
| 2026-06-08T19:25:26+08:00 | Execution | C19-M4 regression evidence returned | test worker 娄鑫 the 2nd 完成 focused 41/41、`npm test` 674/674、`git diff --check`；同时发现 stale P1/P2/P3/P4 用户面文案，随后由主线程修复并复测。 |
| 2026-06-08T19:21:33+08:00 | Execution | C19-M3 completed; C19-M4 starting | 四规则 discipline 和 Plan gate visibility 已投影到 shared guidance、OpenCode/Claude surfaces 和 active OpenCode artifacts；focused tests 13/13、相关回归 37/37、s55/s56/s58 与 `git diff --check` 均通过。 |
| 2026-06-08T18:55:54+08:00 | Execution | C19-M3 started | 已进入 C19-M3 `write_tests`；test worker 李萌 the 2nd 负责四规则投影、gate visibility 和 adapter guidance 合同测试，主线程并行定位共享 guidance 与 OpenCode/Claude 渲染面。 |
| 2026-06-08T18:49:38+08:00 | Execution | C19-M2 completed | 结构化阶段产物与自适应门控核心合同已完成：新增 `PLAN_PHASE_MODEL`、Discover clarity gate、visible phase gate，以及 phase flow / milestone table / decision matrix / dependency map renderer；focused tests 20/20、相关回归 49/49、YAML 解析和 `git diff --check` 均通过；审计 PASS。 |
| 2026-06-08T18:49:12+08:00 | Execution | C19-M2 red tests completed; implement started | test worker 娄鑫完成 M2 合同测试；focused tests 16/20 passing、4 个预期失败，失败点为阶段模型、Discover gate、Visible gate 和图表 renderer 尚未导出。 |
| 2026-06-08T18:44:27+08:00 | Execution | C19-M2 started | 已进入 C19-M2 `write_tests`；test worker 娄鑫负责 progressive-discover / batch-plan 合同测试，主线程并行读取 deterministic helper 实现面。 |
| 2026-06-08T18:14:58+08:00 | Execution | C19-M1 completed | Plan 命令合同已闭合：`/hw:plan:technical-stack` 与 `/hw:plan:architecture` 成为用户态阶段命令，`/hw:plan:confirm` 仅保留兼容说明/清理逻辑，OpenCode 命令面收敛为 colon 形式；83/83 Node 子测试、s51/s55/s56/s58/s61 和 `git diff --check` 均通过。 |
| 2026-06-08T16:49:21+08:00 | Execution | C19-M1 implement completed | 已实现 Plan 命令合同：新增 `/hw:plan:technical-stack`、`/hw:plan:architecture`，移除用户态 `/hw:plan:confirm`，同步 registry、adapter 命令 Markdown、Plan/Help Skills 和 references；focused tests 13/13 passing。 |
| 2026-06-08T16:33:24+08:00 | Execution | C19-M1 tests written; red confirmed | test worker 娄鑫完成命令合同测试更新；focused tests 失败符合预期，失败点为生产命令表仍缺 `/hw:plan:technical-stack`、`/hw:plan:architecture` 且仍有用户态 `/hw:plan:confirm`。 |
| 2026-06-08T16:31:02+08:00 | Execution | C19-M1 started | 已进入 C19-M1 `write_tests`，test worker 娄鑫负责命令合同测试；主代理并行读取非测试实现面。 |
| 2026-06-08T16:29:24+08:00 | Planning | Final plan confirmed | 用户确认 C19 规划产物，可以进入 `/hw:start` 执行。 |
| 2026-06-08T16:24:48+08:00 | Planning | Generate completed | 已生成 5 个执行 prompt、确认摘要和 state milestone 列表；等待最终确认后才能 `/hw:start`。 |
| 2026-06-08T16:24:48+08:00 | Planning | Decompose completed and Generate started | 用户确认进入 Generate，并补充 M5 应在 M4 后专门讨论，尤其关注 VSP-OpenCode 微调；已创建 `.plan-state/c19-generate.yaml`。 |
| 2026-06-08T16:20:40+08:00 | Planning | Decompose proposed | 已生成 C19 5 个 Milestone 拆解和技术路线，包含命令合同、阶段模型、规则投影、源侧闭合和目标适配。 |
| 2026-06-08T16:19:27+08:00 | Planning | Architecture completed and Decompose started | 用户确认进入 Decompose，并最终确定 `/hw:plan:technical-stack`、`/hw:plan:architecture` 以及移除用户态 `confirm` 命令；已创建 `.plan-state/c19-decompose.yaml`。 |
| 2026-06-08T16:15:37+08:00 | Planning | C19 architecture baseline updated | 已按用户确认在 Architecture 阶段更新 `.pipeline/architecture.md`。 |
| 2026-06-08T16:14:06+08:00 | Planning | Architecture command strategy revised | 用户选择新增阶段子命令，重点是 `tech` 和 `arch`，并指出需重新考虑 `confirm` 命令；Architecture 摘要已修正，进入 Decompose 的确认暂缓到修正版展示后。 |
| 2026-06-08T16:11:09+08:00 | Planning | Architecture summary generated | 已完成架构盘点并生成 `.plan-state/c19-architecture-summary.md`，包含当前架构图、目标架构图、接入点、决策表和开放问题。 |
| 2026-06-08T16:09:37+08:00 | Planning | Technical Stack completed and Architecture started | 用户确认修正版 Technical Stack 摘要，当前进入 Architecture 阶段；已创建 `.plan-state/c19-architecture.yaml`。 |
| 2026-06-08T16:06:05+08:00 | Planning | Technical Stack round 2 captured and summary revised | 已记录 AGENTS.md 四规则策略、阶段模型技术落点、目标仓适配范围，并修正 `guidelines` 术语解释。 |
| 2026-06-08T16:02:54+08:00 | Planning | Technical Stack review summary generated | 已完成聚焦链路追踪并生成 `.plan-state/c19-technical-stack-summary.md`，包含阶段摘要、当前技术栈观察、决策表和待确认问题。 |
| 2026-06-08T16:00:50+08:00 | Planning | Technical Stack round 1 captured | 已记录技术栈讨论范围、结构化重构偏好和聚焦链路追踪深度，写入 `.plan-state/c19-technical-stack.yaml`。 |
| 2026-06-08T15:58:19+08:00 | Planning | P1 Discover completed and Technical Stack started | 用户在看到实际摘要后确认结束 P1；`.plan-state/c19-discover-summary.md` 已改为中文，当前进入 Technical Stack。 |
| 2026-06-08T15:54:49+08:00 | Planning | P1 gate feedback captured | 用户指出确认卡片没有展示实际产物摘要，无法知道确认内容；已记录为 Plan 门控可见性需求。 |
| 2026-06-08T15:53:02+08:00 | Planning | P1 Discover visible summary generated | 已生成 `.plan-state/c19-discover-summary.md`，包含阶段摘要、决策表、待确认问题和进入下一阶段门控说明。 |
| 2026-06-08T15:52:10+08:00 | Planning | P1 Discover round 5 captured | 已记录阶段可见产物、图表表格要求和自动推进规则；P1 需求已具备总结确认条件。 |
| 2026-06-08T15:50:18+08:00 | Planning | P1 Discover round 4 captured | 已记录期望行为变化、需求层验收信号，以及 P2 可见产物和 Question Tool 主动使用的核心痛点；用户要求再问一轮关键问题。 |
| 2026-06-08T15:47:10+08:00 | Planning | P1 Discover round 3 captured | 已记录优化范围、Plan 阶段交互方式和 Discover 自适应完成门控需求。 |
| 2026-06-08T15:44:51+08:00 | Planning | P1 Discover round 2 captured | 已通过 Question Tool 记录 DeepSeek AGENTS.md 片段、固定提示词优化目标、Discover 产出形态和工具调用积极性要求。 |
| 2026-06-08T15:37:13+08:00 | Planning | P0 Configure reused and P1 Discover started | 已记录 C19 P0 配置复用，并将用户初始需求写入 `.plan-state/c19-discover.yaml`；当前停留在需求访谈，不进入技术讨论。 |
| 2026-06-08T15:31:09+08:00 | Cycle | C19 created | 已归档 C18 本地运行态并创建 C19，等待 Plan 发现与拆解。 |

## Deferred 项

- 暂无。
