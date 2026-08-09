# 用户指南

Hypo-Workflow 是当前 Codex 宿主中的项目工作协议。`.pipeline/INDEX.md` 是语义入口，Cycle 的 Plan、Progress、Execution、Discussion、Experiment 与 Memory 使用普通文件保存可读、可恢复的事实；实际编码、测试、命令执行和实验监控仍由宿主 Agent 完成，Workflow 不是 runner。旧 manifest Delivery 继续作为兼容入口读取。

## 当前入口

v15.0.0-alpha.2 的 Official Codex 发布包公开十个聚焦入口，每次只路由到一个 Child Skill：

| 入口 | 用途 |
| --- | --- |
| `/hw:guide` | 检查仓库并推荐一个合适的 Workflow 路径 |
| `/hw:init` | 初始化或检查 manifest-based 工作区 |
| `/hw:goal` | Discussion 后自主交付没有 Stone 的完整需求 |
| `/hw:plan` | Discussion 后交付含至少一个 Stone 的 Milestone Plan |
| `/hw:cycle` | 兼容既有 Cycle Delivery，新工作不默认推荐 |
| `/hw:maintain` | 保存一个聚焦的 requirement、preference、decision 或 feedback |
| `/hw:experiment` | 管理非线性实验、基线、环境、扫描、Attempt、结果审查与即时状态 |
| `/hw:resume` | 在重启或上下文压缩后恢复当前 Delivery |
| `/hw:accept` | 接受已经验证并等待人工验收的 Delivery |
| `/hw:reject` | 拒绝待验收结果并记录结构化反馈 |

普通对话不要求用户先选择入口。状态、报告、解释、检查、调试、知识索引和压缩属于 Agent 根据语义执行的内部行为，不是额外的公共命令。

## Discussion、Goal、Plan、Maintain 与 Experiment

- 新交付先按需求发掘、技术栈、架构变化完成 Discussion，再选择 Delivery。
- Goal 用于没有人工中途检查点的执行；它可以很复杂，也可以有很多验收点，并由内置 `/Goal` 自主连续完成。
- Plan 必须含至少一个 Stone。Milestone 是可独立验证的阶段结果；Stone 是需要用户检查真实产物或作出决定的人工节点。普通 Milestone 不停，Stone 才停。
- `0 Stone -> Goal`，`>= 1 Stone -> Plan`。复杂度、文件数和验收点数量不参与这个判断。
- Maintain 保存日常项目事实，不开启 Delivery。
- Experiment 是长期、非线性的实验记录面。它把项目知识、环境、代码快照、机器、数据集、baseline、scan、Attempt、指标、异常、trash/restore 与 next action 组织成可索引事实。

当用户询问“现在实验怎么样”时，Agent 首先读取 [Experiment Record Protocol](reference/experiment-records.md) 中的 `experiment.yaml` 和它明确引用的 Attempt，直接概括默认与 contextual baseline、硬件与环境、数据集含义、扫描目的、outcome、可疑结果、资源边界和下一步；只有需要 drill-down 时才跟随引用。旧的 bounded materialized status projection 是可选兼容来源，不是回答状态或继续实验的前置条件。

## 多 Work Item 与并发 Placement

同一个 Project 可以同时存在多个 Goal、Plan、兼容 Cycle 和 Experiment。`active.delivery` 仅供尚未采用 Placement 的旧 workspace 使用，不是全项目互斥锁。Session 可以显式选择一个 Work Item 来路由上下文；有多个候选而尚未绑定时，SessionStart 返回候选列表，但不阻断普通提示、工具、诊断或 Experiment 文件记录。跨 Work Item 权威写入和资源 claim 仍要求明确选择，避免把两个任务混在一起。

一个 Project authority root 可以登记多个独立 Git Repository Target，例如 `Cryo-Computing` 下相互独立的 `Accel-Sim` 与 `llm-trace`。每个 target 保存稳定仓库身份、当前 locator、Git base，以及一个 primary integration target；后续可以增加 alternate integration target，不要求把嵌套仓库改成 submodule。

启动前，Host 声明代码和资源占用，Core 原子返回 `shared`、`isolated_worktree`、`isolated_resources` 或 `blocked`。固定同一 commit 的 `read`/`execute` 可以共享；不同 snapshot 或 `build`/`write`/`checkout` 使用 worktree；可重定位 mutable cache 使用资源隔离；独占 GPU、端口或固定输出重叠会阻断。Core 只持久化 lease/fencing 与 bounded Host action，不直接执行 Git 或启动进程。源码变更必须合并进登记的 integration target，并提供与 claim、target、commit 和 `git merge-base --is-ancestor` 结果一致的摘要校验文件，Delivery 才能请求最终验收。

## Experiment 工作模型

### 项目知识与复现上下文

Experiment knowledge 保存实验目的、论文和文档的安全引用、指标语义、数据集单位、主要模块、优化位置和 concept-to-code 映射。它不仅记录“RE 加速”这个名字，还可以把采样或 occupancy 等真实功能映射到代码位置。代码变化后，Agent 必须检查这些引用是否 stale，并更新知识或明确报告差异。

运行前记录：

- Git commit/tree 代码快照，以及工作树是否包含需要说明的变化。
- `uv` 环境、lockfile digest 和必要版本；默认不引入 Conda。
- 机器、GPU、驱动、CUDA、资源限制和外部大文件位置。不同服务器可以保存不同数据路径与运行细节。
- 数据集、scene、参数、随机种子、完整命令、日志/config/metric 引用和可读输出目录。

凭据、原始 Key、隐藏推理、完整对话和论文 PDF 不写入 Experiment record；只保存经授权位置的安全引用。

### Experiment、Attempt、扫描与 baseline

一个逻辑 Experiment 可以有多次 Attempt。明确“重跑这个实验”会保留逻辑身份并产生新的 Attempt；代码快照和失败证据仍然可追踪。数据集或 scene 不同则是不同实验身份，避免把 NeRF 的不同场景或模拟器的不同 trace 混在一起。

扫描可以声明：

- changed axes、fixed parameters 和选择范围；
- 单轴频率扫描、L1/L2 交叉扫描或其他多参数组合；
- screening case 为什么值得扩展到所有数据；
- 内存、显存、磁盘、时间等 feasibility boundary，以及 OOM 或不可运行区域。

Baseline 带作用域。项目可以同时存在全局 default baseline，以及温度、数据集、方法族或优化阶段内的 contextual baseline；变更 baseline 会留下理由和适用范围。

### 长任务、结果审查与历史保留

宿主 Agent 可以前台等待，或使用不干扰其他工作的唯一命名 tmux session。用户要求“帮我盯着”时，Agent 负责轮询并更新事实。意外中断会保存证据；有真实 checkpoint 就恢复，没有就明确记录 restart-from-scratch。

Attempt 的 operational completion 只表示程序走完，不表示科学结果合理。Scientific review 会参考指标含义、baseline、论文预期、邻近运行、配置、数据预处理、随机性和资源边界。论文与本地结果不一致时先列出可能原因，不直接断言实现错误。AI 标出的可疑结果会进入 pending confirmation，由用户决定。

错误或过期 Attempt 进入 trash，不直接删除；用户改变判断时可以 restore。只有新的明确删除授权才能永久清理。若同一 Attempt 重跑会覆盖已有输出，Agent 必须先说明保留风险。

### 普通记录、兼容同步与即时状态

默认记录位于 `.pipeline/memory/experiment-records/<project_id>/<experiment_id>/`：一个可读的 `experiment.yaml` 保存当前计划和 Attempt 引用，每个 Attempt 使用独立 YAML 文件。Agent 通过普通文件工具直接维护，不要求 `BatchReport`、专用写入 API、内容哈希或 projection。不同 clone 使用普通 Git 合并；相同语义事实冲突时，Workflow 整理差异并停止自动选择，除非用户明确委托。

默认回答顺序是 baseline、硬件/环境、数据集语义、扫描及目的、outcome counts、可疑或资源受限结果、trash/保留状态和具体下一步。旧 content-addressed events 和 materialized status 可以继续读取或由可选工具同步，但辅助能力失败只能告警，不能阻断实验运行、分析或普通记录更新。

### Experiment 边界

Workflow 不是 runner、队列系统或常驻扫描器，不创建一批只能改状态的后台进程。实际命令、tmux、SCP、重试和分析由宿主 Agent 执行，Workflow 负责验证并保存事实。

真实 NeRF、AceSim、GPU、论文复现、GitLab remote、SSH/SCP、大 trace 和多周运行仍需要真实项目 Pilot。当前环境记录是实验级机器快照，不是整台电脑的代理、订阅、端口、服务、工具、Key 位置、SSH、软链接和二进制资产管理。

## Task Assessment 与 Worker Routing

这两个决策必须分开：

```text
Workflow 形态 -> Worker topology -> Task Assessment -> semantic routing class -> 宿主模型映射
```

Topology 根据任务耦合度、真实并行收益、独立 oracle 和协调成本决定由主线程完成还是使用 Worker。Goal、Plan、Milestone、Stone、文件数和验收点数量都不决定 Worker 数量。Task Assessment 由宿主 AI 根据仓库证据生成并在 Worker 启动前显示：

| 字段 | 含义 | 当前强制信号 |
| --- | --- | --- |
| `complexity` | 理解、实现和协调难度 | 只展示，不单独升档 |
| `uncertainty` | 根因、方案或输入尚不明确的程度 | `high` 至少 `explore` |
| `oracle_strength` | 测试、规范或指标作为判卷标准的可靠性 | `weak` 至少 `critical` |
| `blast_radius` | 潜在影响的模块、用户或 authority 范围 | `high` 至少 `critical` |
| `reversibility` | 是否可直接回退、需保护回退或实质不可逆 | `irreversible` 为 `escalation` |
| `risk_flags` | security、migration、recovery conflict 等特殊风险 | 任意非空至少 `critical` |

Core 不调用分类模型，而是按 `escalation > critical > explore > standard > mechanical` 的确定性优先级输出一个档位和 reason code：

| 档位 | 典型触发 |
| --- | --- |
| `mechanical` | 状态、格式化、只读摘要、确定性测试命令、trivial reversible change |
| `standard` | 普通实现、常规测试设计或文档 |
| `explore` | 未知根因、候选路线比较、高不确定性、探索性实现 |
| `critical` | weak oracle、独立 audit、architecture、recovery conflict、高 blast radius |
| `escalation` | security、migration、不可逆工作或两条不同执行路线失败 |

同一路线重试、用户取消、Worker 启动失败和网络错误不增加 distinct failed route count。`off` 不产生路由提示；`advisory` 在宿主不支持时记录 fallback；`required` 阻止不支持 semantic handoff 的 Worker 启动。Resume 复用持久化决定，不重新猜测。

Workflow 不输出 Luna/Sol、Provider、凭据、reasoning effort、token 或价格。宿主映射也不能改变角色独立性、验收证据或用户授权。

## 执行与验收

复杂交付由可验证效果驱动。最终 Proposal 提供“确认并开始 / 确认但不开始 / 继续讨论”三种语义。只有完整 Proposal 已展示且 Agent 正在询问是否开始时，简短肯定回复才继承 `delivery.approve_and_start`；其他肯定只回答当下问题。只有“确认但不开始”进入 `waiting_to_start`。高影响副作用仍保留局部门禁。

Runtime 是生命周期权威，Continuation 保存下一步，Recovery Pack 只提供有界恢复上下文。Pack 缺失时仍可从 Runtime 与 Continuation degraded resume；旧 `.pipeline` lifecycle 文件不作为回退权威。

最终交付会在对话中说明结论、技术方案、修改模块、测试设计、验证结果、预期行为、遇到的问题和残余风险；artifact 路径只作为证据索引。

## 发布边界

v15.0.0-alpha.2 的 Host Contract v1、Codex plugin ZIP 和 portable ZIP 均发布十个入口并包含 `/hw:experiment`。Host Contract v1 只承载 legacy compatibility；语义 workspace 通过普通文件恢复。Official Codex 是当前唯一源端支持面，VSP-Codex 的具体模型映射由目标仓独立适配与验证。
