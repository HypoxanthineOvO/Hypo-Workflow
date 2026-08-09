<div align="center">

# Hypo-Workflow

**面向 Codex 的本地项目工作流协议**

规划 -> 执行 -> 独立验证 -> 人工验收 -> 可恢复继续

[![Version](https://img.shields.io/badge/version-15.0.0--alpha.2-blue)](.codex-plugin/plugin.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Official%20Codex-black)](docs/reference/platforms.md)

**语言 / Language：中文 | [English](README.en.md)**

</div>

Hypo-Workflow 是 Skill 协议，不是 runner 或后台服务。宿主 Agent 负责实现、测试和审查；`.pipeline/` 负责保存可验证、可恢复的项目事实。

[v15.0.0-alpha.2 发布说明](docs/release/v15.0.0-alpha.2.md)

当前版本以 **Official Codex** 为唯一当前适配平台。OpenCode、Claude Code、Cursor、GitHub Copilot、Trae 和自定义 Codex fork 的适配器均延后，仓库中残留的旧平台产物不代表当前支持。

## 当前架构

`.pipeline/INDEX.md` 是语义工作区入口；当前 Cycle 通过普通文件表达计划、进度、执行证据和讨论：

```text
INDEX.md
  -> Cycle: PLAN.md + PROGRESS.md + EXECUTION.md + Discussion
  -> Experiment: readable YAML/Markdown records
  -> Memory: confirmed project facts
  -> Legacy: preserved read-only references
```

- **Cycle** 是迭代与归档边界；**Goal** 适合零 Stone 交付，**Plan** 用于至少一个人工 Stone 的交付。
- **Plan / Progress / Execution** 共同保存完整计划、当前位置、变更原因和验证证据；Hooks 只是上下文优化，不是正确性的来源。
- **Work Placement / Repository Target** 为需要权威路由或资源 claim 的 Session 选择一个 Delivery 或 Experiment，并在启动前原子判定共享 checkout、独立 worktree、资源隔离或阻断；未绑定状态不会封锁普通工具，源码改动完成后必须回到登记的 integration target。
- **Memory** 只保存明确、持久的 requirement、preference、decision 和 feedback；讨论原文与长期事实分开。
- **Experiment records** 使用普通 YAML 保存实验计划和 Attempt；旧 events / status projection 保留为可选兼容视图。
- **Worker Routing** 在 Worker 启动前显示任务评估并输出语义能力档，不选择具体模型或 Provider。
- **Legacy compatibility** 保留 manifest Runtime、Receipt 和 Recovery 读取能力，用于尚未结束的旧 Delivery；它们不覆盖语义 Cycle。
- 旧 archives、Manifest 与 live Delivery 原位保留，History Refresh 只增加摘要和索引层。
- 跨项目 History Refresh 从目标工作区派生项目身份和实际 Cycle 数；根部旧格式 Cycle 只进入 Legacy 索引，不会被自动关闭或接受；缺少 current manifest 时在激活末尾创建，已有有效 manifest 保持原字节。

## 安装

完整能力使用 Codex plugin。开发 checkout 可作为本地 marketplace：

```bash
git clone https://github.com/HypoxanthineOvO/Hypo-Workflow.git
codex plugin marketplace add /absolute/path/to/Hypo-Workflow
```

然后在 Codex 的 `/plugins` 中安装或启用 `hypo-workflow`，并在新会话中用 `/hooks` 审查、信任 plugin Hooks。Hook 文件变更后需要重新信任其新 hash。

只把仓库 symlink 到 `$CODEX_HOME/skills` 可以加载 Skills，但不会提供 plugin-bundled Hooks，因此不是完整安装。

## 交付工作流与实验通道

所有新交付先经过 Discussion：需求发掘 -> 技术栈 -> 架构变化。随后只根据执行过程中是否需要人工中途检查选择 Goal 或 Plan。

没有人工中途检查点时使用 Goal；复杂度和验收点数量不影响这个选择：

```text
/hw:init -> Discussion -> Goal Design -> 确认并开始
         -> 内置 /Goal 自主连续执行 -> 验证 -> /hw:accept 或 /hw:reject
```

至少有一个中间产物必须由用户检查或决定时使用 Plan。Plan 拆 Milestone，但只有标记为 Stone 的节点暂停：

```text
/hw:init -> Discussion -> /hw:plan -> Milestones + 至少一个 Stone
         -> 确认并开始 -> 普通 Milestone 自动连续执行
         -> Stone 人工验收 -> 继续执行 -> 最终验收
```

没有线性终点、需要持续重跑、参数扫描和结果判断时使用 Experiment。默认记录是普通 YAML，不依赖任何命名报告工具：

```text
/hw:init -> /hw:experiment -> 记录环境/知识/基线 -> 执行与监督
         -> 普通 YAML 记录 Attempt -> 读取引用记录 -> 持续迭代
```

最终 Proposal 提供三种明确语义：`确认并开始`、`确认但不开始`、`不确认/继续讨论`。只有在完整 Proposal 已展示且 Agent 正在询问是否开始时，简短肯定回复才继承 `delivery.approve_and_start` 语义；其他“可以”“确认”“OK”只回答当下问题。只有“确认但不开始”进入 `waiting_to_start`。删除、远程写入、发布、服务重启等高影响操作仍保留局部门禁。中断后使用 `/hw:resume`。

并发工作不再由单一 `active.delivery` 限制。一个 Project authority root 可以登记多个独立 Git Repository Target，并同时存在多个 Goal、Plan、Cycle 与 Experiment；需要权威写入或资源 claim 时，一个 Session 只选择一个 Work Item。普通提示、工具和 Experiment 文件记录不依赖 Session 绑定。固定快照的只读/执行实验可以共享环境，源码写入使用独立 worktree，GPU、端口、cache 和输出目录在启动前通过原子 lease 与 fencing 检查冲突。永久主 checkout 作为 primary integration target 保留，源码改动在最终完成前必须提供带摘要校验的 Git ancestry 证据。

### Experiment 能力

- 保存项目目的、论文/文档引用、指标和数据集含义、模块职责、优化位置与 concept-to-code 映射，并在代码变化后检查知识是否过期。
- 每个运行绑定 Git 快照、`uv` 环境、机器/GPU/驱动/CUDA、数据位置、参数、命令、资源限制和可读输出目录。
- 区分逻辑 Experiment 与多次 Attempt，支持单轴/交叉扫描、screening 扩展、contextual baseline、tmux 监督、中断恢复、trash/restore 和科学合理性确认。
- “现在实验怎么样”直接读取 `experiment.yaml` 和它引用的 Attempt，先回答 baseline、环境、数据集、扫描目的、结果、异常和下一步，不重新扫描全部目录。

真实 NeRF、AceSim、GitLab、SSH/SCP、大 trace 和多周运行仍需真实项目 Pilot。当前记录的是实验使用的机器环境，不是整台电脑的代理、端口、服务、工具和 SSH 全局资产管理。

## 十个公开入口

| 命令 | 用途 |
| --- | --- |
| `/hw:guide` | 不确定下一步时推荐一个流程 |
| `/hw:init` | 初始化、接手或检查工作区 |
| `/hw:goal` | Discussion 后自主交付没有 Stone 的完整需求 |
| `/hw:plan` | Discussion 后交付含至少一个 Stone 的 Milestone Plan |
| `/hw:cycle` | 兼容既有 Cycle Delivery，新工作不默认推荐 |
| `/hw:maintain` | 保存一个日常项目事实 |
| `/hw:experiment` | 管理环境、扫描、重跑、科学审查与即时实验状态 |
| `/hw:resume` | 从 Runtime、Continuation 和 Recovery Pack 恢复 |
| `/hw:accept` | 接受待验收 Delivery |
| `/hw:reject` | 带结构化反馈拒绝并进入修订 |

Chat、Explain、Status、Report、Log、Check、Compact、Knowledge、Sync、Debug、Start 和 Plan 阶段是内部自然行为，不占用命令面。Analysis、Audit、Quality、Docs、PR、Release、Explore、Optimize 延后。Setup、Rules、Stop、Skip、Reset、Showcase、Patch、Help、Watchdog 和 plan-confirm 已移除；旧显式调用只返回零写诊断。

## Semantic Worker Routing

Topology 根据耦合度、可并行性、独立 oracle 和协调成本决定是否使用 Worker；Goal、Plan、Milestone、Stone 和验收点数量都不决定 Worker 数量。紧耦合但规模较大的工作也可以由主 Agent 端到端完成。Routing 只决定某个已经选定的 Worker 需要的语义能力档。

| 档位 | 典型任务 |
| --- | --- |
| `mechanical` | 状态、格式化、只读摘要、确定性命令 |
| `standard` | 需求和验收标准清楚的普通实现 |
| `explore` | 根因未知、候选方案比较、高不确定性 |
| `critical` | 架构、weak oracle、高影响面、独立 audit |
| `escalation` | security、migration、不可逆任务或两条不同路线失败 |

Workflow 不输出 Luna/Sol、Provider、凭据或 reasoning effort；这些映射属于宿主。Routing 也不会放宽角色分离、证据、验收或用户授权。

## Codex Hooks

Plugin 默认从 `hooks/hooks.json` 加载十类事件：

`SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PermissionRequest`、`PostToolUse`、`PreCompact`、`PostCompact`、`SubagentStart`、`SubagentStop`、`Stop`。

它们用于 ambient Maintain、相关文档/Record 提醒、压缩前 Pack 封存、压缩后恢复、worker evidence 和额外删除护栏。多个匹配 Hook 会并发运行，`PreToolUse` 也不能拦截所有等价路径，因此 Hook 不能替代 Core authority 或人工批准。

删除必须先展示 exact Deletion Manifest，经用户重新批准后签发绑定 Manifest 与 Git 状态的 `deletion.execute` Receipt，再由 controlled executor 执行。任何 hash 或 Git drift 都会使批准失效。

## 执行纪律

- 讨论、背景、想法、抱怨和方案反馈先回复“我的理解 -> 问题原因 -> 推荐方案”，不直接编辑。
- 紧耦合且可客观验证的工作优先由主 Agent 连续完成；只有独立 oracle、真实并行收益或风险足以覆盖协调成本时才拆 Worker。
- 完成报告必须在会话中讲清结论、方法、改动、测试、结果、问题和风险，不能只给文件路径。
- 保留 dirty worktree 中不相关的用户修改。

## 文档

- [用户指南](docs/user-guide.md)
- [十命令参考](docs/reference/commands.md)
- [Codex 指南](docs/platforms/codex.md)
- [平台状态](docs/reference/platforms.md)
- [当前产物与 authority](docs/reference/generated-artifacts.md)
- [VSPi 0.2.0 集成合同](docs/reference/vspi-integration.md)
- [命令规范](references/commands-spec.md)
- [状态契约](references/state-contract.md)

## License

MIT，见 [LICENSE](LICENSE)。
