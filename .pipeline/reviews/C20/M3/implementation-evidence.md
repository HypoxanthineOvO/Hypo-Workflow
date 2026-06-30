# C20-M3 Implementation Evidence

## 范围

- Worker: `implement`
- 工作目录: `/home/heyx/Hypo-Workflow`
- Prompt: `.pipeline/prompts/02-source-regression-and-managed-artifact-closure.md`
- 本次闭合目标:
  - 刷新 source-side managed artifacts，使 checked-in OpenCode / Claude / root instruction surfaces 投射 C20 consultation-first / Mini-contract guidance。
  - 修复 lifecycle log validator 对当前真实 gate 事件和状态的显式支持。
- 未写入目标仓:
  - 未把任何生成命令指向 `/home/heyx/Codex-VSP` 或 `/home/heyx/VSP-Open-Code`。
  - 仅对两个目标仓执行过只读 `git status --short` 检查；两个目标仓本身已有 dirty changes，不属于本 worker 输出。
- Workflow runtime authority:
  - 未按本 worker 身份写 `.pipeline/state.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md`。
  - 当前源仓这些 protected/runtime 文件在本 worker 开始前已显示 dirty；本次实现未回滚、未规范化这些既有改动。

## 修改文件 / 模块

### Lifecycle log validator

- `core/src/log/index.js`
  - 新增 lifecycle family: `gate`。
  - 新增允许状态:
    - `ready_for_visible_gate`
    - `needs_prompt_source_before_vsp_opencode_write`
    - `needs_plan_visible_summary`
  - `logFamily()` 现在把 `gate` / `gate_*` 类型归入 `gate` family。
  - `RECENT_FAMILIES` 包含 `gate`，使用户 gate feedback 可进入 recent feed；普通 `step` 事件仍按既有设计不进入 recent feed。
- `core/test/log-evidence.test.js`
  - 新增 `lifecycle log accepts visible gate feedback statuses` 回归用例。
  - 覆盖 `step_progress + ready_for_visible_gate`、`gate_feedback + needs_prompt_source_before_vsp_opencode_write`、`gate_feedback + needs_plan_visible_summary`。
  - 断言 validator 接受 `step` 和 `gate` families，并断言 recent feed 保留两条 `gate_feedback`。

### Managed artifact refresh

通过既有 artifact writer 刷新当前源仓 managed surfaces：

```bash
node --input-type=module -e 'import { DEFAULT_GLOBAL_CONFIG, loadLayeredConfig, writeClaudeCodeAgentArtifacts, writeClaudeCodePluginArtifacts, writeOpenCodeArtifacts } from "./core/src/index.js"; const { config } = await loadLayeredConfig({ projectRoot: "." }); await writeOpenCodeArtifacts(".", { config }); await writeClaudeCodePluginArtifacts(".", { version: DEFAULT_GLOBAL_CONFIG.version, model: config.claude_code?.model || DEFAULT_GLOBAL_CONFIG.claude_code.model }); await writeClaudeCodeAgentArtifacts(".", { config }); console.log("generated managed OpenCode and Claude artifacts");'
```

当前允许范围 scoped diff 摘要：

- `131 files changed, 3234 insertions(+), 125 deletions(-)`。
- 主要输出面:
  - `AGENTS.md`
  - `.opencode/agents/hw-*.md`
  - `.opencode/commands/hw:*.md`
  - `.opencode/hypo-workflow.json`
  - `.opencode/plugins/hypo-workflow.ts`
  - `.opencode/runtime/hypo-workflow-status.js`
  - `opencode.json`
  - `.claude/agents/hw-*.md`
  - `commands/**/*.md`
- 生成 churn 说明:
  - OpenCode command/agent/root surfaces 增加 C20 `Consultation-First Action Boundary / 协商优先`、Mini-contract、direct execution、post-plan authorization、direct sync scope、target-owned scope guidance。
  - Claude command/agent surfaces 增加同一 shared guidance。
  - 已删除过时的 generated plan-confirm surfaces: `.opencode/commands/hw:plan:confirm.md`、`commands/plan/confirm.md`。
  - 已出现当前 command map 对应的 Plan phase surfaces: `.opencode/commands/hw:plan:technical-stack.md`、`.opencode/commands/hw:plan:architecture.md`、`commands/plan/technical-stack.md`、`commands/plan/architecture.md`。
  - `.claude-plugin/**` 和 `monitors/**` 本次 writer 执行后未产生额外 diff。
- 模板说明:
  - `plugins/opencode/templates/AGENTS.md` 仍不直接包含 C20 文本；当前生成路径在 `core/src/artifacts/opencode.js` 的 `renderAgentsInstruction()` 中把 `CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE` 注入模板输出。这是模板源与生成 surface 的职责分离，不是遗漏。

## Anchor Scan

命令：

```bash
rg -n "Consultation-First Action Boundary|Mini-contract|Target-owned scope|ready_for_visible_gate|gate_feedback|needs_prompt_source_before_vsp_opencode_write|needs_plan_visible_summary" AGENTS.md .opencode/commands/hw:plan.md .opencode/agents/hw-plan.md commands/plan.md .claude/agents/hw-plan.md core/src/log/index.js core/test/log-evidence.test.js
```

结果：

- `AGENTS.md`、`.opencode/commands/hw:plan.md`、`.opencode/agents/hw-plan.md`、`commands/plan.md`、`.claude/agents/hw-plan.md` 均包含 C20 consultation-first / Mini-contract / target-owned scope anchors。
- `core/src/log/index.js` 包含新增 gate 状态。
- `core/test/log-evidence.test.js` 包含对应真实状态/事件 fixture。

## Commands And Results

### Required context load

已读取以下必读文件：

- `.pipeline/prompts/02-source-regression-and-managed-artifact-closure.md`
- `.pipeline/reviews/C20/M3/test-evidence.md`
- `references/consultation-first-action-boundary.md`
- `core/src/artifacts/agent-guidance.js`
- `core/src/artifacts/opencode.js`
- `core/src/artifacts/claude.js`
- `core/src/log/index.js`
- `core/test/log-evidence.test.js`

### Focused lifecycle validator check

命令：

```bash
node --test core/test/log-evidence.test.js
```

结果：

- Pass。
- TAP summary: `tests 7`, `pass 7`, `fail 0`。

### Focused C20 / artifact / C18 regression

命令：

```bash
node --test core/test/log-evidence.test.js core/test/c20-consultation-boundary.test.js core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
```

结果：

- Pass。
- TAP summary: `tests 30`, `pass 30`, `fail 0`。
- 覆盖项包括:
  - C20 non-editing signals / Mini-contract / direct execution / post-plan authorization / first-use concept / target-owned scope。
  - OpenCode command、OpenCode agent、root `AGENTS.md` 生成投射。
  - Claude command、Claude agent 生成投射。
  - Plan confirm 用户面移除。
  - C18 visible phase artifact / Ask gate report surface 合同。
  - lifecycle gate feedback 类型和状态。

### Full regression

命令：

```bash
npm test
```

结果：

- Pass。
- TAP summary: `tests 687`, `pass 687`, `fail 0`。
- 原 test worker 记录的 `current lifecycle log validates real event families and statuses` 失败已消失。

### Whitespace check

命令：

```bash
git diff --check
```

结果：

- Pass。
- Exit code `0`，无 whitespace errors。

## Blocker Closure

1. Managed artifact freshness blocker: closed.
   - 已通过既有 artifact writer 刷新 source checked-in OpenCode / Claude / root managed surfaces。
   - 关键 surfaces 可扫描到 C20 consultation-first / Mini-contract guidance。

2. Lifecycle log validator drift blocker: closed.
   - `gate_feedback` 被显式归入 `gate` family。
   - `ready_for_visible_gate`、`needs_prompt_source_before_vsp_opencode_write`、`needs_plan_visible_summary` 被显式列为允许状态。
   - 新增 focused regression 覆盖真实 drift 形态。
   - Full `npm test` 已通过。

## 剩余风险 / Follow-up

- 当前源仓在本 worker 开始前已有大量 dirty changes，包含 docs/source/runtime state 等非本 worker 范围文件；本 worker 没有回滚或整理这些改动。
- `.pipeline/PROGRESS.md` 和 `.pipeline/log.yaml` 当前仍显示 dirty，但它们属于 main agent runtime state 范围，本 worker未写入；后续应由 main agent 维护 Workflow state。
- 目标仓 `/home/heyx/Codex-VSP` 和 `/home/heyx/VSP-Open-Code` 只做了只读状态检查，均已有 dirty changes；本次 source closure 不应把这些目标仓状态纳入 source commit。
- 生成 churn 较大但集中在既有 writer 输出面；audit worker 仍应复查 broad generated surfaces 是否都符合 C20 文案边界。
- `plugins/opencode/templates/AGENTS.md` 不直接复制 C20 文本；如果未来希望模板源本身也作为可读合同，需要另开 source-template 设计决策，避免与 `agent-guidance.js` 的 shared guidance 单一来源重复。
