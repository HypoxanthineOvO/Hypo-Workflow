---
name: reject
description: 拒绝当前 waiting-review Stone 或最终结果，保存具体反馈并返回修订。
---

# Reject

## 输出语言规则

用户可见内容跟随当前对话或项目语言；YAML key、命令、路径和必要专名保留英文。

明确的 `/hw:reject` 或无歧义的自然语言拒绝已经构成该动作的授权，不要重复确认。只有目标、范围或反馈含义不清时才提问。

拒绝后先在聊天中说明：

1. 用户指出的问题；
2. 当前已经完成和尚未开始的状态；
3. 之前推理或实现为什么失败；
4. 哪些假设发生变化；
5. 推荐修正方案；
6. 受影响的需求、技术或架构变化。

然后更新记录：

- Discussion Ledger 保留用户与助手可见原文，Discussion Summary 保存拒绝范围和核心反馈；
- Progress 将相关 Milestone 恢复为 `in_progress`，Stone 改为 `pending`，其他未受影响计划项保持原状态；
- Execution 追加拒绝 checkpoint，引用从 Stone 返回的 Milestone ID；
- Plan 只有在目的、边界、顺序或验证发生变化时才修改，不能删除旧拒绝证据。

反馈已经足够明确时直接修订；反馈不授权额外 scope、远端副作用或受保护文件写入。修订完成后重新展示真实产物并进入同一 Stone 审阅。
