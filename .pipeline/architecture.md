# C14 Architecture — Prompt/Workflow 兼容性审查

## 工作类型

C14 是审查型 Cycle。默认只读审查，不直接修复代码逻辑。所有发现进入报告、结构化 findings、修复队列和检查清单。

## 审查域

1. Workflow 语义与状态机
2. 跨平台适配器兼容性（OpenCode / Claude Code / Codex）
3. Prompt / Skill / Rules 冗余与冲突
4. 测试健壮性与硬编码
5. 文档、用户引导与贡献者体验
6. 潜在扩展空间

## 严重度

- P0: 阻塞或高概率破坏工作流的兼容性问题
- P1: 高风险 drift、状态不一致、平台不一致
- P2: 中风险硬编码、覆盖缺口、冗余冲突
- P3: 改进项、文档缺口、重构候选
- P4: 观察项或待验证假设

## 输出产物

- `.pipeline/reports/C14-M0-baseline-index.md`
- `.pipeline/reports/C14-M1-workflow-state-audit.md`
- `.pipeline/reports/C14-M2-platform-compatibility-audit.md`
- `.pipeline/reports/C14-M3-prompt-rules-audit.md`
- `.pipeline/reports/C14-M4-test-hardcode-audit.md`
- `.pipeline/reports/C14-M5-docs-onboarding-audit.md`
- `.pipeline/reports/C14-compatibility-audit.md`
- `.pipeline/reports/C14-findings.yaml`
- `.pipeline/reports/C14-fix-queue.md`
- `.pipeline/reports/C14-compatibility-checklist.md`

## 验收规则

- 正式 finding 必须有路径/行号或命令证据。
- P0/P1 必须有影响范围与建议修复方向。
- 无证据项进入 Pending hypotheses，不作为正式 finding。
- 测试命令采用“发现后执行关键验证”；未执行必须记录原因。
