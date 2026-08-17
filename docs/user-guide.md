# 用户指南

这份指南带你从装好 Hypo-Workflow 到交付第一个需求，并解释日常会用到的概念。如果你想先了解"它是什么、为什么用"，先看 [README](../README.md)。

Hypo-Workflow 是一套工作协议：实际的编码、测试、命令执行由你的宿主 Agent（当前完整支持 Codex）完成，Workflow 负责把计划、进度、证据和记忆保存在 `.pipeline/` 的普通文件里——人可读、可恢复、可审计。

## 快速上手：从安装到第一个交付

### 1. 安装

**Codex（完整支持，含 Hooks）**：

```bash
git clone https://github.com/HypoxanthineOvO/Hypo-Workflow.git
codex plugin marketplace add /absolute/path/to/Hypo-Workflow
```

在 Codex 的 `/plugins` 中安装并启用 `hypo-workflow`，新会话里用 `/hooks` 审查、信任 plugin Hooks（Hook 文件变更后需要重新信任）。

**Kimi Code**：把 `skills/<name>/SKILL.md` 复制到 `~/.kimi-code/skills/<name>/SKILL.md`（详见 [adapters/kimi](../adapters/kimi/README.md)）。

**其他 Agent（ZCode 等）**：支持尚在完善中。可以把仓库丢给 Agent，让它参照 `AGENTS.md` 和 `docs/platforms/` 下对应平台指南自行安装；遇到问题欢迎提 issue。

### 2. 初始化工作区

在你的项目里对 Agent 说：

```text
/hw:init
```

Agent 会检查仓库、建立 `.pipeline/` 工作区（或接手已有的），并告诉你当前状态。不确定下一步时随时用 `/hw:guide`，它会推荐一条合适的路径。

### 3. 提需求：先讨论，再动手

直接描述你的需求。Agent 不会立刻写代码，而是先进入 **Discussion**：需求发掘 → 技术选型 → 架构影响。它会追问你没说清楚的假设，你确认讨论充分后，才会进入规划。

讨论结束时，Agent 给出一个完整 Proposal，你有三种回应：

- **确认并开始**——立即执行；
- **确认但不开始**——方案存起来，稍后手动启动；
- **不确认 / 继续讨论**——回去接着聊。

注意：只有在 Proposal 完整展示、Agent 正在问你是否开始时，"可以""OK"才表示同意开工；其他场合的肯定只回答当下的问题。

### 4. 三种交付方式

讨论和规划完成后，按规划结果交付：

| 你的情况 | 用什么 | 行为 |
| --- | --- | --- |
| 规划出来没有中途检查点 | `/hw:goal` | Agent 自主连续执行到完成，你最后验收 |
| 规划出来有中途检查点 | `/hw:plan` | 拆成 Milestone，在检查点（**Stone**）停下来等你验收 |
| 没有终点的探索 | `/hw:experiment` | 记录环境/基线/参数，支持扫描、重跑、持续迭代 |

Goal 和普通 Cycle **都先经过规划**，区别只是规划结果里有没有 Stone。任务复杂、验收标准多，都不构成必须有 Stone 的理由。

三个真实例子：

- **Goal**——GPU 模拟器调优：Discussion 把调优方法论（差异分析、discriminator、分层回归）写进计划后，Agent 自主跑完整轮 RTX 3090 Ti 性能/Activity 闭环，最后统一验收。
- **普通 Cycle（含 Stone）**——TUI 加 Agents 面板：先交一个独立 Mock 给你检查真实终端下的视觉效果，认可后才接真实实现。
- **Experiment**——HBM 显存研究：绑定环境与参数，反复跑、扫参数、对照 baseline，随时可查状态。

### 5. 验收与修订

交付完成后，Agent 会在对话中讲清结论、方案、改动、测试、结果、问题和风险。然后：

- `/hw:accept`——验收通过，Cycle 归档；
- `/hw:reject`——带结构化反馈打回，进入修订循环。

### 6. 中断与恢复

上下文压缩、会话中断都不是事。下次回来：

```text
/hw:resume
```

Agent 从 `.pipeline/` 的记录恢复计划、进度和下一步，你不用重新解释需求。

## 核心概念

- **Cycle**：一次迭代的完整生命周期，也是归档边界。每个 Cycle 下有 `PLAN.md`（计划）、`PROGRESS.md`（进度）、`EXECUTION.md`（执行证据）和讨论记录，全部是普通文件。
- **Milestone 与 Stone**：Milestone 是可独立验证的阶段；Stone 是需要你检查真实产物或拍板的人工节点。只有 Stone 会暂停执行。
- **Maintain**：`/hw:maintain` 把一条被确认的项目事实（需求、偏好、决定、反馈）沉淀进长期记忆。记忆和讨论原文分开存放，之后的每个会话都能用上。
- **Memory**：`.pipeline/memory/` 里经过确认的项目事实，是跨会话、跨 Agent 的项目记忆本体。

## Experiment：给探索性工作的通道

适合参数扫描、论文复现、性能调优这类"反复跑、看结果、再调整"的工作。

**记录什么**：项目目的、论文/文档引用、指标和数据集含义；每次运行绑定 Git 快照、`uv` 环境、机器/GPU/驱动/CUDA、数据位置、参数、随机种子、完整命令和输出目录。凭据、原始 Key、论文 PDF 不会写入记录，只保存安全引用。

**Experiment 与 Attempt**：一个逻辑实验可以跑多次 Attempt，重跑保留身份、可追踪失败证据；换数据集或场景则是新实验。

**Baseline 带作用域**：可以同时存在全局默认 baseline 和特定数据集/方法族内的局部 baseline，变更留下理由。

**问"现在实验怎么样"**：Agent 直接读取 `experiment.yaml` 及其引用的 Attempt，按顺序回答 baseline、环境、数据集、扫描目的、结果、可疑项和下一步，不会重新扫描全部目录。

**结果审查**：程序跑完只代表 operational completion，不代表结果科学上合理。Agent 会对照 baseline、论文预期和邻近运行做审查；可疑结果进入 pending confirmation，由你决定。误删的 Attempt 进 trash 可恢复，永久删除需要单独授权。

**长任务**：可以用唯一命名的 tmux session 监督，Agent 轮询并更新记录；意外中断保存证据，有 checkpoint 就恢复，没有就明确记录从头重跑。

详见 [Experiment 记录协议](reference/experiment-records.md)。

## 多任务并发

同一个项目可以同时存在多个 Goal、Plan 和 Experiment。一个 authority root 可以登记多个独立 Git 仓库 target（比如同一项目下的 `Accel-Sim` 与 `llm-trace`）。源码写入使用独立 worktree，GPU、端口、输出目录等资源在启动前通过原子 lease 检查冲突，避免两个任务互相踩踏。源码变更最终必须合并回登记的 integration target，并附 Git ancestry 证据才能请求验收。

## Worker 分工

Workflow 根据耦合度、可并行性、独立验证价值和协调成本决定是否拆 Worker——紧耦合的大工作可以由主 Agent 端到端完成。拆出去的 Worker 会标注语义能力档（`mechanical` / `standard` / `explore` / `critical` / `escalation`），具体用什么模型由宿主决定。详见 [Worker Routing 说明](reference/commands.md)。

## 十条命令速查

| 命令 | 用途 |
| --- | --- |
| `/hw:guide` | 不确定下一步？推荐一个流程 |
| `/hw:init` | 初始化、接手或检查工作区 |
| `/hw:goal` | 讨论后自主交付无中途检查点的需求 |
| `/hw:plan` | 讨论后交付含 Stone 的计划 |
| `/hw:cycle` | 兼容既有 Cycle（新工作不默认推荐） |
| `/hw:maintain` | 沉淀一条项目事实 |
| `/hw:experiment` | 管理实验环境、扫描、重跑与状态 |
| `/hw:resume` | 中断后恢复工作现场 |
| `/hw:accept` | 验收通过 |
| `/hw:reject` | 带反馈打回修订 |

状态、报告、解释、检查等是普通对话中 Agent 的自然行为，不需要专门命令。每条命令的详细行为见 [十命令参考](reference/commands.md)。
