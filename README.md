<div align="center">

# Hypo-Workflow

**给你的任何 Coding Agent 装上项目记忆和工作纪律，从此解耦“项目”和“Agent”**


[![Version](https://img.shields.io/badge/version-15.0.0--alpha.2-blue)](.codex-plugin/plugin.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**语言 / Language：中文 | [English](README.en.md)**

</div>

---

## Why Hypo-Workflow？

### 🧠 跨 Agent 的永久项目记忆

项目的事实、计划和决策存在 `.pipeline/` 里的普通 Markdown/YAML 文件中，而不是锁死在某一个 Agent 的上下文里。这意味着你可以让 **Codex 做 Plan 生成 Workflow 文件，换 ZCode 执行；做完之后让 Kimi Code 审查某个 Cycle**——每个 Agent 读的是同一份项目事实，接力不需要重新解释背景。上下文压缩、会话中断、换机器、换工具，项目记忆都在。

> 部分 Agent 的支持尚在完善中，欢迎提 issue。

### 💬 讨论先行，需求问清楚再动手

汲取了 Grill-Me / SuperPowers 一类工具的精华思想，Hypo-Workflow 内置了完整的项目讨论阶段：Agent 不会拿到一句话就开始写代码，而是先做需求发掘、技术选型、架构讨论，把 unstated assumption 摆到台面上问你。需求聊透了，才允许进入规划和执行。

### 📜 全程留痕，决策可审计

每一次讨论、每一个决策、每一轮执行都会留下记录：什么时候决定了什么、为什么改、验证结果是什么，全部可查。其中被确认的项目事实还会通过 Maintain 沉淀进项目记忆，成为后续所有会话的上下文。

## 安装
最简单的方式是**直接把仓库丢给你的 Agent**——对它说：

> 请阅读 `AGENTS.md` 和 `docs/platforms/` 下对应平台的指南，按照其中的说明把 Hypo-Workflow 安装到当前环境，装好后告诉我怎么验证。

目前对 Agents 的支持尚且不够完善，遇到问题的话，欢迎大家提 issue！

## 怎么用？

所有工作都先经过 Discussion（讨论）和规划：
* “讨论”是明确需求，把 unstated assumption 摆到台面上，确保 Agent 和你对项目需求的理解是充分一致的；
* 规划时只需要回答一个问题：**这件事执行过程中，需要我中途审核吗？**

```text
规划出来没有中途检查点 ──→ Goal        一口气自主交付，最后验收
规划出来有中途检查点   ──→ 普通 Cycle   拆成 Milestone，在检查点（Stone）停下来等你验收
没有线性终点的探索     ──→ Experiment  参数扫描、反复重跑、持续迭代......
```

**真实例子**：

- **Goal**——GPU 模拟器调优：Discussion 阶段把「怎么分析性能差异、怎么构造 discriminator、怎么分层回归」聊透并写进计划，确认后 Agent 一口气跑完 RTX 3090 Ti 性能/Activity 全量闭环（分析差异 → 改源码 → 回归 → 回到真实 workload 循环），你只在最终验收时出场。
- **普通 Cycle（含 Stone）**——给 TUI 加 Agents 面板：Agent 先做一个独立 Mock 展示真实终端画面下的布局、密度和配色，**在 Stone 处停下来**，你检查并认可视觉效果后，它才接着进行真实实现。否则，会反复迭代，直到这个审核通过，才会继续执行后续的真实实现。
- **Experiment**——HBM 显存研究：绑定 Git 快照、GPU 型号、参数和输出目录，反复跑实验、扫描参数、对照 baseline，随时问一句"实验怎么样了"就有当前结论和下一步。任何时候都可以回顾 Baseline / 实验组数 / 实验结果......

### 核心概念，一分钟搞懂

- **Cycle**：一个迭代的完整生命周期，也是归档边界。每个 Cycle 下有计划、进度、执行证据和讨论记录。
- **Goal Cycle vs 普通 Cycle**：两者都先经过规划。规划出来**有**中途人工检查点（Stone），就是普通 Cycle；**没有**检查点，就可以作为 Goal 自主连续交付。任务复杂度不影响这个选择。
- **Maintain**：把一条被确认的项目事实（需求、偏好、决定、反馈）沉淀进长期记忆，之后的会话都能用上。
- **Experiment**：为没有终点的探索性工作设计——绑定 Git 快照、GPU/CUDA 环境、参数和结果，问一句"实验怎么样了"直接得到答案。

### 十条命令

| 命令             | 用途                                  |
| ---------------- | ------------------------------------- |
| `/hw:guide`      | 不确定下一步？推荐一个流程            |
| `/hw:init`       | 初始化、接手或检查工作区              |
| `/hw:goal`       | 讨论后自主交付无中途检查点的需求      |
| `/hw:plan`       | 讨论后交付含人工检查点（Stone）的计划 |
| `/hw:cycle`      | 兼容既有 Cycle（新工作不默认推荐）    |
| `/hw:maintain`   | 沉淀一条项目事实                      |
| `/hw:experiment` | 管理实验环境、扫描、重跑与状态        |
| `/hw:resume`     | 中断后恢复工作现场                    |
| `/hw:accept`     | 验收通过                              |
| `/hw:reject`     | 带反馈打回修订                        |

## 深入了解

- [用户指南](docs/user-guide.md) —— 从装好到交付第一个需求的完整路径
- [十命令参考](docs/reference/commands.md) —— 每条命令的详细行为
- [Codex 平台指南](docs/platforms/codex.md)
- [平台支持状态](docs/reference/platforms.md)
- [发布说明](docs/release/v15.0.0-alpha.2.md)

## License

MIT，见 [LICENSE](LICENSE)。
