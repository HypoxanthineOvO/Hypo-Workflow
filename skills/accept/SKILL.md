---
name: accept
description: 接受当前 waiting-review Stone 或 Cycle 最终结果，并更新人类可读记录。
---

# Accept

## 输出语言规则

用户可见内容跟随当前对话或项目语言；YAML key、命令、路径和必要专名保留英文。

明确的 `/hw:accept` 或无歧义的自然语言接受已经构成授权，不要重复询问。

1. 确认当前 Cycle、待接受计划 ID、真实产物、验证结果和接受范围与用户表达一致。
2. 如果目标或范围已经变化，停止并说明差异；不要把接受套到另一个 Stone 或 Cycle。
3. 将对应 Progress 行从 `waiting-review` 改为 `completed`，更新 `current` 和下一步。
4. 向 Execution 追加接受 checkpoint，并在 Discussion Summary 记录用户接受了什么。
5. Stone 接受后继续下一个普通计划项；最终结果接受后关闭 Cycle 并完成 Summary。

在聊天中说明接受的实际结果、验证证据、剩余风险和接下来发生什么。不要只报告状态值或文件路径。
