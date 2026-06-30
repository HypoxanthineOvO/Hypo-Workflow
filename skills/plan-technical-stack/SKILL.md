---
name: plan-technical-stack
description: Run the Technical Stack phase of Hypo-Workflow planning after requirements Discover and before Architecture.
---

# /hypo-workflow:plan-technical-stack
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

仅将此 skill 用于 Plan 的 Technical Stack 阶段。

## 阶段位置

Plan 阶段顺序为：

`Discover -> Technical Stack -> Architecture -> Decompose -> Generate -> Implementation`

Technical Stack 必须在 Discover 已展示并通过 Question Tool / Ask gate 确认后运行。它不得替代 Discover，也不得直接生成 Milestone。

## 目标

Technical Stack 负责把已确认需求映射到技术承载方式：

- 读取当前仓库和 `.pipeline/architecture.md` 中与技术栈有关的事实。
- 识别语言、框架、包管理器、测试工具、adapter 生成机制、平台能力和运行边界。
- 明确实现机制、兼容策略、非目标和需要调研的外部能力。
- 输出可见阶段摘要、决策表和开放问题。
- 在进入 Architecture 前使用 Question Tool / Ask gate 获取确认。

## 产物

- 机器可读记录：`.plan-state/technical-stack.yaml`
- 人类可读摘要：`.plan-state/technical-stack-summary.md`

当当前 Cycle 使用编号或 slug 前缀时，可以写入匹配的 `.plan-state/<cycle>-technical-stack.*` 文件，但必须在响应中展示实际摘要内容，而不是只给路径。

## 交互规则

1. 先展示 Discover 已确认的需求边界。
2. 只讨论技术栈、实现机制、验证工具和平台能力；不要提前拆 Milestone。
3. 如果遇到未知第三方库、外部服务、平台能力或私有 schema，创建 `research_required` 项。
4. 阶段结束前必须展示：
   - 阶段摘要
   - 技术选择/约束决策表
   - 需要用户确认或延后的开放问题
5. 重大门控必须使用 Question Tool / Ask；没有该工具时，在普通对话中停止并明确询问。
6. 用户确认后才进入 `/hw:plan:architecture`。

## 参考文件

- `skills/plan/SKILL.md`
- `references/commands-spec.md`
- `.pipeline/architecture.md`
