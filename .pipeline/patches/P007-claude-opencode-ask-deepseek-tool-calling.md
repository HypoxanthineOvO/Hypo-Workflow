# P007: 强化 Claude/OpenCode Ask 与 DeepSeek Tool Calling 提示
- 严重级: normal
- 状态: closed
- 发现于: Patch
- 创建时间: 2026-05-13T13:33:33+08:00
- 修复时间: 2026-05-13T13:50:14+08:00
- 改动: core/src/artifacts/agent-guidance.js, core/src/artifacts/claude.js, core/src/artifacts/opencode.js, core/src/sync/index.js — 为 Claude/OpenCode 生成面注入 Ask Questions discipline，并按 DeepSeek 模型条件注入 tool-calling rules
- 测试: ✅ core tests 493/493；regression 68/68；focused Claude/OpenCode prompt tests 27/27；git diff --check 通过
- worker_separation: implement=main-codex, test=Kierkegaard, audit=Kant
- worker_lifecycle: test=requested/started/completed/closed, implement=requested/started/completed/closed, audit=requested/started/completed/closed
- commit: `本提交`
- 关联: Claude Code, OpenCode, DeepSeek
- resolved_by: null
- related: []
- supersedes: []

## 描述

用户反馈 Claude Code 中 Ask Questions 调用不够积极，希望在生成的 agent prompt 中进一步鼓励遇到真实决策点时主动使用 Ask/question 工具。

同时，当 Claude Code 或 OpenCode 的 agent 模型为 DeepSeek 时，需要注入严格的 Tool Calling Rules，避免 optional 参数占位、容器类型错误、路径格式化、成对参数缺失和错误重试方式。
