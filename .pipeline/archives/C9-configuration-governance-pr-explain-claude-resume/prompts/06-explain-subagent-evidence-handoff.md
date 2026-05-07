# M07 / F003 - `--subagent` 取证流程

## Objective

- 支持 `/hw:explain --subagent`，让独立 Subagent 先读取上下文和证据，主 Agent 再基于 evidence packet 回答，减少自我确认和幻觉。

## 需求

- 定义 `--subagent` flag 的语义、可用性检测和 fallback。
- Subagent 任务是只读 evidence gathering，不负责最终解释、不修改文件、不执行远端写操作。
- Evidence packet 必须包含 reviewed_refs、findings、unknowns、confidence、risk_notes。
- 主 Agent 回答时引用 Subagent evidence，并可补充少量本地复核。
- 当 Subagent 不可用时，必须记录 fallback_reason，仍按 evidence-first self mode 回答。

## Boundaries

- In scope:
  - Explain spec/skill
  - subagent handoff schema
  - Codex/OpenCode/Claude adapter guidance
  - tests with fake subagent packet
- 不要求平台真的提供 live Subagent 才能通过测试。
- 不让 Subagent 写 `.pipeline` authority 文件。
- 不把 `--subagent` 变成并行实现功能。

## Implementation Plan

1. 写 tests，覆盖 `--subagent` packet schema、fallback、final answer evidence引用。
2. 设计 handoff prompt，要求 Subagent 只读、列证据、列 unknowns。
3. 更新 Codex/OpenCode/Claude 平台文档，说明支持和降级方式。
4. 将 Explain 与 existing review artifact 区分：Explain 默认不写正式 report，除非未来新增 archive flag。
5. 增加 secret-safe redaction 要求。

## 预期测试

- fake Subagent packet 被主解释器消费并引用。
- packet 缺 `reviewed_refs` 或 `unknowns` 时被判为不完整。
- Subagent unavailable 时有 fallback_reason。
- `--subagent` 不会导致实现/测试/审查角色混乱。

## Validation Commands

- `node --test core/test/*explain*.test.js core/test/codex-subagent-discipline.test.js core/test/platform-adapters.test.js`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- 报告展示一个 Subagent evidence packet。
- 报告说明 fallback 行为。

## Human QA

- 确认 `--subagent` 能让回答更可信，而不是更啰嗦。
- 确认主 Agent 没有把 Subagent 未确认内容说成事实。

## 预期产出

- `--subagent` Explain handoff 合同。
- Packet schema/tests/docs。

