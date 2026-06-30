# Consultation-First Action Boundary

本合同定义 Hypo-Workflow source-side 的修改启动边界：普通讨论先协商，明确执行请求直接做。它约束源仓的共享指导与后续生成表面，但不把目标仓本地优化写成源侧强制改动。

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

在 agent 已经给出计划、Mini-contract 或推荐方案之后，post-plan affirmative replies / 计划后确认回复算 execution authorization / 执行授权。

以下回复明确表示可以执行：`可以`、`确认`、`OK`、`go ahead`、`apply it`。

收到这些确认后，可以按已展示的计划执行；如果执行范围比计划更大、涉及目标仓写入、破坏性操作或新文件清单，必须重新确认。

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
