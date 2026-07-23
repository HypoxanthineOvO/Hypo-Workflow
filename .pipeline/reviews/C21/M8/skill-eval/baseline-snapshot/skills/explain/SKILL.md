---
name: explain
description: Answer project, code, config, command, or recent-change questions with cited local evidence; use when the user invokes /hw:explain or asks for evidence-first explanation.
---

# /hypo-workflow:explain

## 输出语言规则

读取 `.pipeline/config.yaml` 和全局配置（如果可用）。用户可见的解释应遵循 `output.language`；文件路径、命令名称、配置键和代码标识符保持原样。

## 前置条件

- 应该有一个问题、文件路径、diff 目标、报告 ID 或其他解释目标可用。
- 如果未提供目标，从可能的项目和 `.pipeline/` 来源收集小型本地证据包。
- Explain 必须保持只读。

## 执行流程

1. 加载 `references/explain-spec.md`。
2. 解析问题和任何显式目标，如 `--file`、`--diff` 或 `--report`。
3. 在回答前构建证据包。
4. 首先读取显式目标，然后根据需要读取附近的源代码/测试/文档/Pipeline 上下文。
5. 使用引用的证据和置信度回答。
6. 如果存在 `--subagent` 且有合适的 Subagent 可用，发送只读交接，仅请求 `reviewed_refs`、`findings`、`unknowns`、`confidence` 和 `risk_notes`。
7. 如果 `--subagent` 不可用，记录 `fallback_reason` 并以证据优先的自模式继续。
8. 使用引用的证据和置信度回答。
9. 如果证据缺失，说明 `needs_context` 或 `unknown`，并列出无法验证的内容。

## 交互行为

- 当问题太宽泛而无法用本地证据回答时，要求更具体的目标。
- 当可以安全收集合理的本地证据包时，不要提问。
- `--subagent` 请求独立的只读证据收集；Subagent 不产生最终答案。

## 安全规则

- 不要修改状态、日志、报告、源文件、Patch 文件、Cycle 文件或远程资源。
- 不要推进 Pipeline。
- 不要替换 `/hw:status`、`/hw:debug`、`/hw:audit` 或 `/hw:patch`。
- 不要捏造不支持的原因；明确标记未知项。
- 在显示前脱敏类似密钥的证据。

## 失败处理

- 缺失文件变为 `unknowns`，而不是虚构的解释。
- 不支持的标志应停止并给出清晰消息。
- 如果请求的证据看起来包含密钥，要求提供脱敏证据或在回答前进行脱敏。

## 参考文件

- `references/explain-spec.md`
- `references/commands-spec.md`
- `docs/reference/commands.md`