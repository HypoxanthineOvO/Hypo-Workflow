# M3 - Subagent 授权、隔离与降级治理

## Objective

- 强化 Subagent 的鼓励和约束：P0 中请求授权，执行阶段优先使用 Subagent，并把 implement/test/audit 隔离、测试源码不可见和 degraded mode 写成可执行契约。

## 需求

- 更新 `references/subagent-spec.md`、root `SKILL.md`、`skills/start/SKILL.md`、`skills/resume/SKILL.md`、`skills/patch/SKILL.md`、`skills/plan/SKILL.md` 和必要 docs。
- 定义 implement Subagent 禁止读取测试源码、fixtures、snapshot、断言细节，只接收测试命令、pass/fail 和精简错误摘要。
- 定义 test/review/audit Subagent 可读取测试和最终 diff，并负责独立验证。
- 定义 strict 不可满足时的提前告知和用户确认 degraded mode。
- 在报告、log 或 state notes 中记录角色、隔离结果、降级原因和用户确认。

## Boundaries

- In scope: Subagent spec、execution guidance、review artifacts、tests/docs。
- 不实现跨平台强制沙箱。
- 不把外部模型路由作为 Codex Subagent 的必要条件。

## Implementation Plan

1. 扩展 Subagent discipline tests，断言测试源码不可见和 degraded mode 合同。
2. 更新 spec/skills，明确 P0 授权、执行角色和降级流程。
3. 补充 review artifact/log/report 字段要求。
4. 检查现有 Codex/Claude/OpenCode 文档是否误导为外部模型路由。
5. 记录无法技术强制隔离时的人工确认和风险。

## 预期测试

- 文本/结构断言覆盖不可读取测试样例、degraded mode、non-delegation rationale。
- review artifact tests 覆盖角色记录和独立验证。

## Validation Commands

- `node --test core/test/codex-subagent-discipline.test.js core/test/review-artifacts.test.js core/test/explain-subagent.test.js`

## Evidence

- 报告记录 Subagent role matrix、降级条件和测试输出。

## Human QA

- 审计 Subagent 评估隔离契约是否自洽，主 Agent 做最终整合。

## 预期产出

- Subagent 授权/隔离/降级合同、focused tests、M3 report。
