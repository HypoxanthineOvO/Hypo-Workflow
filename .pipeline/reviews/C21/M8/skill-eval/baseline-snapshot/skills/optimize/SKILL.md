---
name: optimize
description: Run an Audit+Quality guided optimization loop when the user wants sustained code-quality improvement without sacrificing correctness.
---

# /hypo-workflow:optimize
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

使用此技能编排 Auto Optimize Flow：`Audit + Quality -> Optimize Implement/Test -> Audit + Quality`。它不是后台自动重构器；开始任何实现前必须确认 correctness contract、backup、budget、validation path 和执行边界。

## Preconditions

- 必须有 scope 和非目标。
- 必须定义 correctness contract。
- 必须定义 backup 或可恢复策略。
- 必须定义验证命令或可执行场景。
- 必须定义迭代预算：轮数、文件范围、风险边界或时间预算。

## Execution Flow

1. Intake：确认目标、scope、correctness contract、backup、budget、validation path、manual/auto mode。
2. Baseline：运行或读取 `/hw:audit` 与 `/hw:quality` 结果，生成优化前证据。
3. Route：
   - 小而明确的修复可转 `/hw:patch`。
   - 大范围或边界不清的优化必须转 `/hw:plan`。
   - 当前 scope 可控时才进入实现循环。
4. Test first：由 `test` worker 先定义验证和伪测试拒绝标准。
5. Implement：由 `implement` worker 做范围内质量优化，不能写测试或伪造验证。
6. Green validation：运行验证命令，记录 pass/fail。
7. Recheck：再次运行 Audit + Quality，比对 baseline。
8. Stop condition：达到 gate、预算耗尽、风险升级、测试失败、scope 变大或用户暂停时停止。
9. 写入 `.pipeline/quality/optimize-state.yaml`、优化报告和 lifecycle log。

## Safety Rules

- 没有 backup、correctness contract、validation path、budget 时不能开始实现。
- 不得进行无边界大改。
- 不得把质量优化做成风险绕过；Critical Audit finding 必须阻断。
- Worker Separation 启用时，`test`、`implement`、`audit` 必须保持角色分离。

## Reference Files

- `references/optimize-spec.md`
- `references/quality-spec.md`
- `references/audit-spec.md`
- `references/tdd-spec.md`
- `references/subagent-spec.md`
- `references/commands-spec.md`
