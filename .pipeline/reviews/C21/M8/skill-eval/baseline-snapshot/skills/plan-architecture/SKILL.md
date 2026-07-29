---
name: plan-architecture
description: Run the Architecture phase of Hypo-Workflow planning after Technical Stack and before Decompose.
---

# /hypo-workflow:plan-architecture
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

仅将此 skill 用于 Plan 的 Architecture 阶段。

## 阶段位置

Plan 阶段顺序为：

`Discover -> Technical Stack -> Architecture -> Decompose -> Generate -> Implementation`

Architecture 必须在 Technical Stack 已展示并通过 Question Tool / Ask gate 确认后运行。它负责架构接入和图表化计划产物，不负责直接执行实现。

## 目标

Architecture 负责把需求和技术栈决策落到当前系统结构：

- 读取 `.pipeline/architecture.md` 和相关源码/adapter 文档。
- 识别当前组件、边界、状态源、生成器、命令表面和集成接入点。
- 产出当前架构观察、目标架构变化、影响范围、风险和非目标。
- 默认用 Mermaid 和 Markdown table 展示架构图、阶段流和关键决策。
- 在进入 Decompose 前使用 Question Tool / Ask gate 获取确认。

## 产物

- 机器可读记录：`.plan-state/architecture.yaml`
- 人类可读摘要：`.plan-state/architecture-summary.md`
- 必要时更新 `.pipeline/architecture.md`，但更新前必须展示拟改内容并通过门控确认。

当当前 Cycle 使用编号或 slug 前缀时，可以写入匹配的 `.plan-state/<cycle>-architecture.*` 文件，但必须在响应中展示实际摘要内容，而不是只给路径。

## 交互规则

1. 先展示 Technical Stack 已确认的技术承载和约束。
2. 读取架构基线后再提出架构结论；不要凭记忆补全。
3. 至少展示一个 Mermaid 架构图或阶段流，以及一个决策/影响表。
4. 如果架构基线需要更新，说明旧事实、新事实和更新原因。
5. 阶段结束前必须展示：
   - 阶段摘要
   - 架构图或流程图
   - 接入点/影响范围表
   - 开放问题和风险
6. 重大门控必须使用 Question Tool / Ask；没有该工具时，在普通对话中停止并明确询问。
7. 用户确认后才进入 `/hw:plan:decompose`。

## 参考文件

- `skills/plan/SKILL.md`
- `references/commands-spec.md`
- `.pipeline/architecture.md`
