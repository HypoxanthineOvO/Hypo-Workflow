# Consultation-First Action Boundary

本合同定义 Hypo-Workflow source-side 的修改启动边界：普通讨论先协商，明确执行请求直接做。Planning 的价值来自把理解、技术选择和架构影响展示给用户，而不是把每个阶段变成一次签发。

## Mini-contract

Mini-contract 是讨论类输入进入执行前的一段简短确认说明，固定顺序必须是：

1. `我的理解`
2. `问题原因`
3. `推荐方案`

这三个小节必须按上述顺序出现。不要在 Mini-contract 之前编辑文件、运行会改变工作区的命令，或把用户的背景描述当作执行授权。

## Non-editing signals

以下输入都是 non-editing / no file edits 信号：必须先输出 Mini-contract，不得编辑文件、不得写入文件、不得直接改配置或代码。

- `discussion` / 讨论：包括普通讨论、讨论输入、讨论/背景、背景/讨论、讨论方案等语境。处理方式是先 Mini-contract，说明我的理解、问题原因、推荐方案，不直接编辑。
- `background` / 背景：用户提供背景信息、上下文、材料或说明时，默认只是补充语境。处理方式是先 Mini-contract，no file edits。
- `idea` / 想法：用户提出想法、构思或点子时，默认是方案探索。处理方式是先 Mini-contract，不改文件。
- `complaint` / 抱怨：用户表达抱怨、吐槽、不满或投诉时，默认需要诊断和建议。处理方式是先 Mini-contract，不写文件。
- `question` / 提问：用户提出 question、疑问、询问或问题类请求时，默认回答或澄清。处理方式是先 Mini-contract，不直接编辑文件。
- `solution-discussion` / 方案讨论：用户讨论方案、比较方案或要求分析方案时，默认是 solution-discussion。处理方式是先 Mini-contract，must not edit files，直到用户明确授权执行。

如果输入同时包含讨论信号和模糊动作词，以讨论信号优先；只有后续出现执行授权，才进入实现。

## Direct execution

clear imperative / 明确祈使请求可以 direct execution，但必须同时满足 concrete target / 具体目标：

- 用户给出明确动作，例如“创建”“修改”“修复”“运行”“把 X 写到 Y”。
- 用户给出明确目标，例如具体文件、目录、命令、测试、报告路径或受限范围。
- 请求没有被 discussion、background、idea、complaint、question、solution-discussion 语境包裹成讨论。

满足这些条件时允许执行 / 可直接执行，并按仓库现有规则完成实现、验证和结果说明。

## Post-plan authorization

肯定回复只回答 Agent 刚刚明确提出的问题。理解确认、讨论继续、方案认可和执行启动是不同语义，不得互相替代。

- 在“我的理解是否正确？”之后，`可以`只确认理解。
- 在“是否继续整理方案？”之后，`可以`只允许继续规划。
- 只有展示完整 Proposal 并明确询问是否开始实施后，`确认并开始`、`按这个方案实施`、`按你的方案来`、`go ahead` 或 `apply it` 才授权执行。
- `确认但不开始`只批准 Proposal，保持 `waiting_to_start`。
- 明确的 `/hw:accept`、`/hw:reject` 或无歧义验收/拒绝陈述本身授权对应动作；Receipt 只绑定和校验这次授权，不再要求第二次普通确认。
- `继续讨论`不产生 authority write。

不要在 Proposal 认可之后再要求第二次普通执行确认。范围扩大、破坏性操作、远端写入、发布、服务重启和受保护文件仍使用各自的局部边界。

## Required planning display

Discover、Technical 和 Architecture 是必须展示的 planning artifact，不是三个强制确认 gate。用户要求一口气完成时，Agent 可以连续展示三项内容，再进入一个最终 Proposal 选择。

1. `Discover`：完整汇总用户提出的需求、需求来源、归纳方式、目标、范围、non-goals、验收标准、仍然存在的假设或问题。区分用户明确表达、仓库事实和 Agent 推断。
2. `Technical`：展示现有技术栈、准备沿用或引入的技术、关键依赖、兼容性和验证工具，并解释选择理由。新项目或新阶段不得省略；确实没有技术变化时明确说明。
3. `Architecture`：用 Mermaid、ASCII、表格或 TUI 等效示意图展示组件和数据/控制流。现有项目标出整体架构中被修改的部分及上下游影响；新项目展示目标架构、组件职责、边界和集成点。

仓库探索只为这些 artifact 提供证据，不能替代用户讨论。不要因为自己已经形成方案就宣布 Discover 收敛。先质疑哪些内容是事实、哪些是推断、哪些决策应由用户作出。不要为了流程配额制造带推荐答案的假问题。

## Rejection discussion

Reject 表明先前结果或理解没有达到用户预期。收到 reject 后，先展示：哪里不对、当前现状、先前为什么做错、哪些假设需要改变、准备怎么改、验收或架构会发生什么变化，以及仍需用户判断的问题。受影响的 Discover、Technical、Architecture artifact 应展示 delta。

Reject 本身不授权生成 replacement Proposal 或修改产品文件。只有用户反馈已经给出明确修法并要求直接采用，或者上述讨论已经把修订方向讲清楚，才继续整理修订 Proposal。

## First-use concept explanation

每个 Cycle 中 first-use / 首次引入 new concept / 新概念时，必须用 one-sentence / 一句话解释。解释只说明该概念在当前工作中的含义，不展开教程，不把解释变成额外执行授权。

示例：第一次出现 “Mini-contract” 时，应说明“Mini-contract 是执行前用 `我的理解`、`问题原因`、`推荐方案` 三段确认意图的短合同。”

## Distribution boundary

### Direct sync scope

direct sync scope / 直接同步范围只覆盖 source-owned managed surfaces：由 Hypo-Workflow 源仓生成或管理的共享指导、命令说明、AGENTS/OpenCode/Claude 适配表面、文档合同、测试锚点和发布检查表。源侧合同变更可以 direct sync 到这些受管表面，但同步内容应保持行为规则本身，不夹带目标仓本地 prompt 优化。

### Target-owned scope

target-owned scope / 目标仓自有范围必须与 direct sync scope 分离。目标仓自有优化、运行时提示细节、模型特定配置和本地提醒策略，不由 source-side direct sync 直接写入；它们应进入对应目标仓的本地 Cycle，由目标仓检查实际运行路径、dirty worktree、测试和发布流程。

### Codex-VSP and VSP-Open-Code boundaries

- `Codex-VSP`：source-owned managed surfaces 可 direct sync，例如共享 AGENTS 指导、命令文档、受管适配输出。`Codex-VSP` 的 per-model prompts、model catalog、模型选择策略和运行时 prompt 优化属于 target-owned scope，留给 `Codex-VSP` 目标仓本地 Cycle 验证和编辑。
- `VSP-Open-Code`：source-owned managed surfaces 可 direct sync，例如受管 AGENTS/OpenCode 指导、命令语义摘要和同步检查表。`VSP-Open-Code` 的 local reminders、runtime prompt details、本地 provider/model 行为和提醒词扩写属于 target-owned scope，留给 `VSP-Open-Code` 目标仓本地 Cycle 验证和编辑。

本源侧合同不得被解释为允许直接写入 `/home/heyx/Codex-VSP` 或 `/home/heyx/VSP-Open-Code`。目标仓写入需要目标仓计划、明确文件清单、用户确认和目标仓本地验证。

## Scenario fixtures

- 讨论场景：用户说“我有个想法/抱怨/问题，讨论一下方案”。结果：输出 Mini-contract，不编辑文件。
- 直接执行场景：用户说“修改 `references/x.md`，加入 Y，并运行 Z 测试”。结果：目标明确，可 direct execution。
- 计划后确认场景：agent 展示方案后，用户回复“可以”或 “go ahead”。结果：这是执行授权，按已展示范围执行。
- 新概念场景：Cycle 中首次出现新概念。结果：用一句话解释，然后继续当前协作。
