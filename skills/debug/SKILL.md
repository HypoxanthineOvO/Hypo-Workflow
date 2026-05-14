---
name: debug
description: Investigate a concrete failure when the user wants symptom-driven root-cause analysis instead of a preventive audit scan.
---

# /hypo-workflow:debug
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

当用户需要症状驱动的根因分析而非预防性审计扫描时，使用此技能进行五步调试工作流。

当项目 `execution.worker_separation.mode` 启用时：

- 当 `execution.worker_separation.mode=off` 时，在可行的情况下将实现帮助与测试复现分开
- 当 `execution.worker_separation.mode=recommended` 时，如果复现/测试和实现合并到一个 Worker 上，调试不得声称 Worker 分离验证；停止、重试、推迟或要求用户明确确认降级后才能进行本地角色敏感编辑
- 当 `execution.worker_separation.mode=strict` 时，调试必须在声称完成证据前保持复现/测试、实现和审计/验证 Worker 的独立性
- 在角色敏感的复现、自动修复实现或验证工作开始前，解决 Subagent/委派授权
- `test` 或复现 Worker 拥有失败复现、失败测试、夹具、快照、断言、验证命令和证据；`implement` Worker 不得创建、编辑或重写该测试证据
- `implement` Worker 仅拥有生产/运行时/文档修复，不得生成或冒充 `test` 或 `audit`
- 审计或验证 Worker 是独立的；`/hw:audit` 仍是规范的审计通道，调试不得将审计静默合并到修复器中
- 主代理拥有 Worker 生命周期：记录 `requested`、`started`、`completed|failed|blocked` 和 `closed|close_failed`；在推进前等待证据，并在调试停止、阻塞、中止或完成时关闭/释放 Worker
- 如果授权缺失或被拒绝，停止或记录无法满足 Worker 分离门控的已记录降级路径；降级的调试工作必须保持阻塞/待处理状态以实现 Worker 分离完成
- 不要先在本地复现、修复和验证，然后报告独立 Worker 不可用
- 如果调试工作降级了角色分离，明确记录该限制

## 前置条件

- 有具体的症状、失败测试、跟踪或异常行为可用

## 执行流程

1. 收集症状。
2. 收集上下文：
   - 架构基线
   - 生命周期日志
   - 最近的 Milestone 报告
   - 最近的 Git 变更
3. 解析 `output.language` 和 `output.timezone`。
4. 生成 3-5 个排序假设。
5. 按顺序验证它们。
6. 使用 `output.language` 生成根因报告和可选的修复建议。
7. 在 `--auto-fix` 编辑或独立验证前，确认所需的 Worker 授权或停止并给出阻塞原因。
8. 使用 `--auto-fix` 时，仅在验证通过后才声称成功。
9. 在离开调试轮次前，关闭/释放调试打开的任何 Worker 或记录 `close_failed` 及 Worker ID 和原因；未解决的 Worker 生命周期无法满足调试验证证据。
10. 在持久写入前应用共享的密钥安全证据脱敏助手；不要存储原始 API 密钥、令牌、Authorization 头、Cookie、密码或私钥。
11. 将报告写入 `.pipeline/debug/`，时间戳使用 `output.timezone`，并追加调试生命周期条目。
12. 当使用状态跟踪时，设置 `current.phase=lifecycle_debug`。

## 参考文件

- `references/debug-spec.md`
- `references/log-spec.md`
- `SKILL.md`