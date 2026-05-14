---
name: audit
description: Run a preventive code audit when the user wants graded findings across security, bugs, architecture, performance, tests, and quality.
---

# /hypo-workflow:audit
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

使用此技能进行深度项目审计。

当 audit 用作验收或 worker-separation 证据时，在扫描开始前解决 Subagent/delegation 授权问题。audit worker 必须独立于实现被审计更改的 worker。如果授权缺失、被拒绝或不可用，停止或记录无法满足验收 gate 的降级审计；不要先在本地审计，然后声称缺少独立审查。

## Prerequisites

- 源代码和架构基线应该可用

## Steps

1. 确定范围：
   - 全项目
   - `--scope <dir>`
   - `--since <milestone>`
2. 首先读取架构基线。
3. 解析 `output.language` 和 `output.timezone`。
4. 如果 audit 将作为验收证据，请在扫描前确认独立 audit worker 已授权且与实现分离。
5. 扫描六个审计维度。
6. 将发现分级为 `Critical`、`Warning` 或 `Info`。
7. 将报告写入 `.pipeline/audits/audit-NNN.md`，使用 `output.language`。
8. 使用 `output.timezone` 渲染报告时间戳。
9. 在持久写入前应用共享的密钥安全证据脱敏助手；不要存储原始 API 密钥、令牌、Authorization 头、cookie、密码或私钥。
10. 追加生命周期日志条目。
11. 当使用状态跟踪时，设置 `current.phase=lifecycle_audit`。

## References

- `references/audit-spec.md`
- `references/log-spec.md`
- `SKILL.md`
