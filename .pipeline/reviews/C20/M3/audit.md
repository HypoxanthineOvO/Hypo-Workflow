# C20-M3 Audit Report

## Verdict

PASS_WITH_WARNINGS

C20-M3 的核心闭合目标已满足：shared consultation-first guidance 已进入 source spec、OpenCode/Claude/root managed surfaces；关键生成面没有发现未限定的“总是先问/总是确认”式冲突；lifecycle log validator 的修复是显式白名单式扩展，没有放开任意 status；实现证据记录的 focused 30/30、`npm test` 687/687、`git diff --check` pass 足以支撑 source-side closure。

保留 warnings 的原因不是 C20 核心逻辑失败，而是当前 source worktree 和两个 target repo 都处于 dirty 状态，且 source worktree 的未提交改动远超 M3 核心文件范围。审计需要把这些 caveat 与 C20-owned 改动分开。

## Blockers

无。

原 test worker 记录的两个 blocker 已被 implementation evidence 和当前源码/生成面复核关闭：

- Managed artifact freshness：`AGENTS.md`、`.opencode/commands/hw:plan.md`、`.opencode/agents/hw-plan.md`、`commands/plan.md`、`.claude/agents/hw-plan.md` 均已包含 `Consultation-First Action Boundary / 协商优先`、`Mini-contract`、`Direct sync scope`、`Target-owned scope` 等锚点。
- Lifecycle log validator drift：`core/src/log/index.js` 现在显式包含 `gate` family 和三个真实 gate 状态；`core/test/log-evidence.test.js` 增加对应 fixture，并验证 recent feed 只保留 `gate_feedback`。

## Warnings

- Source worktree 当前很脏：`git status --short` 显示大量 managed artifacts、docs、tests、runtime `.pipeline/*`、历史 prompt 删除、新 prompt/review 文件、`tmp.md` 和 `tmp/` 等 untracked/modified 状态。C20-M3 核心可审计，但提交/发布前需要由 main agent 明确分拣 C20-owned 与既有 dirty changes。
- Target repos 当前也 dirty：`/home/heyx/Codex-VSP` 与 `/home/heyx/VSP-Open-Code` 均有已有 modified/untracked 文件。implementation evidence 声称只读 `git status --short`，本审计未发现 C20 source cycle 应写目标仓的证据，但无法仅凭当前 status 证明 target dirty 的时间来源。
- `plugins/opencode/templates/AGENTS.md` 本身不直接包含 C20 文本；当前设计是在 `core/src/artifacts/opencode.js::renderAgentsInstruction()` 中把 shared guidance 注入模板输出。该职责分离可接受，但后续若要求 template 文件本身也作为可读合同，需要单独设计，避免复制 source of truth。
- `appendLifecycleLogEntry()` 的 writer normalization 对未知 status 回退为 `completed` 是既有行为，本次没有扩大；`validateLifecycleLog()` 仍会拒绝未知 status。若未来要让 writer 对未知 status 也 hard-fail，应另开 hardening 项。

## Evidence

已完整读取并复核：

- `.pipeline/prompts/02-source-regression-and-managed-artifact-closure.md`
- `.pipeline/reviews/C20/M3/test-evidence.md`
- `.pipeline/reviews/C20/M3/implementation-evidence.md`
- `references/consultation-first-action-boundary.md`
- `core/src/artifacts/agent-guidance.js`
- `core/src/artifacts/opencode.js`
- `core/src/artifacts/claude.js`
- `core/src/log/index.js`
- `core/test/log-evidence.test.js`
- `AGENTS.md`
- `.opencode/commands/hw:plan.md`
- `.opencode/agents/hw-plan.md`
- `commands/plan.md`
- `.claude/agents/hw-plan.md`

只读命令证据：

- `rg -n "Consultation-First Action Boundary|Mini-contract|Target-owned scope|Clear imperative|Post-plan affirmative|Direct sync scope" ...`：关键 source 和 generated surfaces 均命中 C20 guidance。
- `rg --files-without-match "Consultation-First Action Boundary" AGENTS.md .opencode/commands .opencode/agents commands .claude/agents`：无输出，表示这些受管 command/agent/root surfaces 都包含 C20 anchor。
- `rg -in "ask before every|ask-before-everything|always ask|must ask before|ask first before|ask for every|always confirm|always require confirmation|never execute directly" ...`：只发现 Plan route 的 `Ask for every hard interactive gate`，它被限定为 hard interactive gate，不是普通输入的 ask-before-everything 规则。
- `rg -n "P1|P2|P3|P4|P1-P4|Adaptive Grill|ordinary decomposition|full P1-P4|Confirm \(P4\)"` 针对关键 surfaces：无输出，关键面没有旧 P1/P4 或 Adaptive Grill 残留。
- `rg -n "/hw:plan:confirm|plan confirm|Confirm \(P4\)|P1-P4" ...`：剩余命中位于 compatibility notes 或 negative regression tests，不是用户命令面暴露。
- `git diff --check`：当前通过，无 whitespace errors。

## Modified-File Scope Assessment

C20-M3 核心改动范围合理：

- Shared guidance source：`core/src/artifacts/agent-guidance.js` 新增 `CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE` 与 `FOUR_RULE_DISCIPLINE_GUIDANCE`。
- Artifact projection：`core/src/artifacts/opencode.js` 和 `core/src/artifacts/claude.js` 将 shared guidance 注入 OpenCode commands/agents/root `AGENTS.md` 以及 Claude commands/agents。
- Key generated surfaces：`AGENTS.md`、`.opencode/commands/hw:plan.md`、`.opencode/agents/hw-plan.md`、`commands/plan.md`、`.claude/agents/hw-plan.md` 的文本与 shared guidance 一致，并保留 Plan gate 的限定语境。
- Deprecated command cleanup：`.opencode/commands/hw:plan:confirm.md` 和 `commands/plan/confirm.md` 删除符合“confirmation is an in-phase Ask gate, not standalone command”的目标。
- Lifecycle validator：`core/src/log/index.js` 只新增 `gate` family、三条具体 status 和 `gate`/`gate_*` family mapping；`core/test/log-evidence.test.js` 只新增对应测试。

但当前 `git diff --stat` 显示 221 files changed、6422 insertions、1616 deletions，明显包含 C20-M3 以外的历史/runtime/generated/doc/test 改动。审计结论仅覆盖 C20-M3 必审范围，不替这些额外 dirty changes 背书。

## Validation Assessment

validation evidence sufficient。

- 原 test evidence：focused C20/artifact/C18 tests 23/23 pass；随后 full `npm test` 因 lifecycle log schema/status drift 失败，准确暴露 M3 blocker；`git diff --check` pass。
- implementation evidence：修复后 focused lifecycle check 7/7 pass；focused C20/artifact/C18/log regression 30/30 pass；full `npm test` 687/687 pass；`git diff --check` pass。
- 本审计复跑了 `git diff --check`，当前仍 pass。

未在审计阶段复跑 full `npm test`，因为 audit worker 被限定为只读审计并只写报告；现有 implementation evidence 的命令、TAP summary 和后续源码/测试 diff 足以支撑闭合判断。

## Target Boundary Assessment

target boundary preserved with caveats。

- Source guidance 明确区分 `Direct sync scope` 与 `Target-owned scope`，并明确 `Codex-VSP` 的 per-model prompts/model catalog/runtime prompt tuning 以及 `VSP-Open-Code` 的 local reminders/runtime prompt details/provider-model behavior/reminder wording 属于 target-owned scope。
- 关键 generated surfaces 同步包含 target-owned boundary 文案，且要求 target 写入必须另走目标仓本地 Cycle。
- implementation evidence 声明未向 `/home/heyx/Codex-VSP` 或 `/home/heyx/VSP-Open-Code` 写入，只做只读 status 检查。
- 当前只读 `git -C /home/heyx/Codex-VSP status --short` 与 `git -C /home/heyx/VSP-Open-Code status --short` 均显示 dirty，但这些 dirty changes 不能归因于 C20-M3 source cycle；报告应单独列为环境 caveat，不能混入 source closure commit。

## Follow-up

- Main agent 在 closure 前应分拣 source dirty worktree，明确哪些文件属于 C20-owned source closure，哪些属于历史/runtime/其他 Cycle 残留。
- 不要把两个 target repo 的 dirty 状态纳入 source closure；后续 target adaptation 必须走目标仓本地 Cycle、明确文件清单、用户确认和目标仓验证。
- 若希望更强的 lifecycle log writer 严格性，另开小项让 append path 对未知 status hard-fail；不要混入本次 validator closure。
- 保留当前 C20 regression coverage：consultation-first behavior、managed artifact projection、Plan confirm removal、lifecycle gate feedback statuses、full `npm test`、`git diff --check`。
