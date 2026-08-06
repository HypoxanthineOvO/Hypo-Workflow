---
name: guide
description: 仅在用户不确定下一步时检查项目并推荐一个可用的 Hypo-Workflow 命令。
---

# Guide

## 输出语言规则

用户可见内容跟随当前对话或项目语言；YAML key、命令、路径和必要专名保留英文。

Guide 是只读入口，不是每次工作前的仪式。先读取项目索引和当前 Session 聚焦信息，再推荐一条最合适的路径并解释原因：

- 未初始化项目使用 `/hw:init`。
- 需求尚未清楚时继续 Discussion。
- 没有中间人工审阅点的交付使用 `/hw:goal`。
- 包含人工审阅点的交付使用 `/hw:plan`。
- 创建、切换或关闭项目迭代使用 `/hw:cycle`。
- 已有聚焦 Cycle 且需要继续时使用 `/hw:resume`。
- 待人工判断的结果使用 `/hw:accept` 或 `/hw:reject`。
- 已确认的长期事实使用 `/hw:maintain`。
- 实验设置、运行、对比、监督或状态查询使用 `/hw:experiment`。

如果存在多个 active Cycle 而 Session 尚未聚焦，列出它们的人类可读名称、目的、状态和下一步，让用户选择一个。不要静默继承最近使用的 Cycle，也不要在一个 Session 混合两个 Cycle。

涉及并行源码修改时，指出是否需要隔离 worktree、集成目标或资源隔离。不要展示内部实现术语，也不要推荐不存在的命令。
