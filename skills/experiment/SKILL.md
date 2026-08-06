---
name: experiment
description: 用普通 Markdown/YAML 创建、运行、监督、比较和审阅可跨 Cycle 延续的实验。
---

# Experiment

## 输出语言规则

用户可见内容跟随当前对话或项目语言；YAML key、命令、路径、指标名和必要专名保留英文。

Experiment 是人类可读文件，不是 runner，也不是另一种 Cycle。主模型负责实际命令、进程监督、结果解释和记录更新。

## 创建或恢复

1. 从 Experiment 索引读取选中的实验文件和必要 Attempts，不扫描整个结果树回答普通状态问题。
2. 写清目的与假设、baseline、数据或 scene、变化与固定参数、环境、指标、成功解释、资源边界和下一步。
3. 同一代码、参数、数据、scene 和用户明确 rerun 属于同一实验的新 Attempt；数据或 scene 不同通常是不同实验。
4. Experiment 可以在 `cycles` 中引用多个 Cycle。Cycle 关闭不会删除或重置 Attempts。

## 执行与监督

- 使用普通文件工具更新 Experiment 与 Attempt。记录代码 snapshot、环境、GPU/driver/CUDA、外部数据位置、命令、参数、输出目录、日志、指标和失败证据。
- 扫描实验先明确 axes、固定参数、case 展开和资源上限。
- 长任务使用前台或唯一命名的隔离会话；用户要求持续监督时才轮询。
- 可恢复时使用真实 checkpoint；否则明确记录从头重启。
- 运行结束不等于科学成功，必须比较 baseline、指标语义、资源限制和异常结果。

## 并行与保留

只读且代码 snapshot 兼容的实验可以共享 checkout。不同 snapshot、源码修改、GPU、端口、mutable cache 或输出目录冲突需要隔离或暂停。需要原子资源声明时再使用项目已有的 placement 机制，不让它阻塞普通记录与分析。

错误或过时 Attempt 标为 `trashed`，不要直接删除。相同输出目录 rerun 前先处理旧产物保留风险。两个分支对同一实验事实产生不兼容修改时，停止并让用户决定。

状态报告先展示 baseline、配置和硬件上下文、数据含义、Attempts、指标、异常、保留状态和下一步。不要用内部事件代替可读解释。
