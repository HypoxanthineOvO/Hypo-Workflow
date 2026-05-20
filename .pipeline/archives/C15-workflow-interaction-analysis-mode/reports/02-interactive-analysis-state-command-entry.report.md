# C15-M3 Interactive Analysis State And Command Entry Report

## 改动摘要

C15-M3 恢复并强化了 Hypo-Workflow 的 Analysis 工作模式，使它重新成为可见、可恢复、可审计的交互式调查 lane，而不是只停留在内部 preset 或零散 Debug 建议里。

本 Milestone 交付了四类能力：

1. 新增 `/hw:analysis` 一等命令入口，并在 root skill、OpenCode command map、OpenCode metadata、`.opencode/commands/hw-analysis.md`、help/docs/reference/README 中暴露。
2. 把 Analysis 的 durable source of truth 固定为外部 ledger，默认路径为 `.pipeline/analysis/<cycle-or-milestone>/ledger.yaml`，并保留旧 `.pipeline/analysis/<milestone-id>-analysis-ledger.yaml` 的显式兼容 helper。
3. 让 OpenCode 和 Claude status surface 从 `prompt_state.analysis_summary` 读取 compact summary，展示 question、ledger path、conclusion、confidence、counts、next action，但不展开完整 hypotheses/experiments/observations。
4. 将 Debug 持续调查升级路径、Analysis boundary、state/report contract、command/spec/docs 和 smoke 场景统一到 41 个用户命令的新事实。

## 技术思路

技术路线分成三层。

第一层是 command surface：在 `core/src/commands/index.js` 增加 `/hw:analysis -> /hw-analysis -> hw-debug -> skills/analysis/SKILL.md`，让 Analysis 有明确入口。`skills/analysis/SKILL.md` 定义 `enter/continue/end/report` 语义，强调可跨回合恢复、主线记忆、实验记录和后续 Build/Patch handoff。

第二层是 state boundary：Analysis 不把完整调查过程塞进 `.pipeline/state.yaml`，只在 `prompt_state.analysis_summary` 保存紧凑摘要。完整证据进入 `.pipeline/analysis/<cycle-or-milestone>/ledger.yaml`。实现上新增 canonical `analysisLedgerPath()`、legacy `legacyAnalysisLedgerPath()` 和 `resolveAnalysisLedgerPath()`，确保默认新路径，旧路径只在显式传入或 state 已引用时保留。

第三层是 user-visible recovery：`skills/status`、`skills/report`、OpenCode status model 和 Claude status markdown 都读取 compact summary。这样一个 Cycle/Milestone 内可以持续跟随用户分析，同时 status/report 不会丢主线，也不会膨胀 state。

## 修改文件/模块

核心实现：

- `core/src/commands/index.js`
- `core/src/analysis/index.js`
- `core/src/opencode-status/index.js`
- `core/src/claude-status/index.js`
- `core/src/rules/index.js`

Skill / command / adapter：

- `SKILL.md`
- `skills/analysis/SKILL.md`
- `skills/debug/SKILL.md`
- `skills/status/SKILL.md`
- `skills/report/SKILL.md`
- `skills/help/SKILL.md`
- `.opencode/commands/hw-analysis.md`
- `.opencode/hypo-workflow.json`
- `opencode.json`

规格和文档：

- `references/analysis-spec.md`
- `references/analysis-ledger-spec.md`
- `references/state-contract.md`
- `references/debug-spec.md`
- `references/progress-spec.md`
- `references/commands-spec.md`
- `references/opencode-command-map.md`
- `references/opencode-parity.md`
- `references/skill-spec.md`
- `README.md`
- `README.en.md`
- `docs/reference/commands.md`
- `docs/en/reference/commands.md`
- `references/opencode-spec.md`

测试和场景：

- `core/test/analysis-command-entry.test.js`
- `core/test/analysis-runtime.test.js`
- `core/test/analysis-state-ledger.test.js`
- `core/test/opencode-status.test.js`
- `core/test/claude-status-surface.test.js`
- `core/test/skill-spec.test.js`
- `core/test/codex-subagent-discipline.test.js`
- `tests/scenarios/v6/s19-help-list/run.sh`
- `tests/scenarios/v8.2/s43-v8-2-registration/run.sh`
- `tests/scenarios/v8.4/s50-rules-system/run.sh`
- `tests/scenarios/v9/s51-opencode-capability-matrix/run.sh`
- `tests/scenarios/v9/s55-opencode-command-map/run.sh`
- `tests/scenarios/v9/s59-v9-regression-bundle/run.sh`

Worker evidence：

- `.pipeline/reviews/C15/M3/test-evidence.md`
- `.pipeline/reviews/C15/M3/implementation-evidence.md`
- `.pipeline/reviews/C15/M3/audit.md`

## 测试设计

测试按风险分层设计。

RED 阶段先新增 `core/test/analysis-command-entry.test.js`，验证 `/hw:analysis` 是否是一等命令、是否有 Skill、status/report/debug 是否知道 compact analysis summary、OpenCode 产物是否能生成 `hw-analysis`。RED 结果 5 项失败，证明问题不是既有 Analysis runtime，而是入口和恢复 surface 缺失。

GREEN 阶段覆盖三类回归：

- Analysis runtime：ledger required fields、interaction boundary、preset chain、report contract、follow-up proposal。
- Surface contract：OpenCode/Claude status 只展示 compact summary，不展开完整 ledger；docs/report/status 技能读取 `prompt_state.analysis_summary.ledger_path`。
- Registry/docs/smoke：命令数从 40 变为 41 后，README、Commands Reference、OpenCode spec、scenario scripts、skill-spec 和 help-list 都必须同步。

审计阶段使用两个只读 audit worker：

- 第一轮 audit 找出 Critical：默认 ledger path 仍是旧扁平路径，并发现 docs/scenario 仍写 40 或缺 `/hw:analysis`。
- 第二轮 audit 在修复后复核通过，确认 High findings 清零。

## 验证结果

已通过的主要命令：

- `uv run -- node --test core/test/analysis-command-entry.test.js ... core/test/readme-update.test.js`：105/105 passed。
- `uv run -- node --test core/test/docs-governance.test.js core/test/readme-update.test.js core/test/analysis-command-entry.test.js core/test/commands-rules-artifacts.test.js core/test/skill-spec.test.js`：30/30 passed。
- `bash tests/scenarios/v9/s51-opencode-capability-matrix/run.sh`：passed。
- `bash tests/scenarios/v9/s55-opencode-command-map/run.sh`：passed。
- `bash tests/scenarios/v6/s19-help-list/run.sh && bash tests/scenarios/v8.2/s43-v8-2-registration/run.sh && bash tests/scenarios/v8.4/s50-rules-system/run.sh && bash tests/scenarios/v9/s59-v9-regression-bundle/run.sh`：all passed。
- `git diff --check -- <M3 target files>`：passed。
- Static docs comparison：`commandMap('opencode')=41`，中文/英文 command reference rows 都是 41，missing canonical 为空，stale 40 count 为 false，`/hw:analysis` 存在。

审计复核：

- 第一轮 verdict：fail，发现 legacy default path 和 40-command docs/smoke stale。
- 第二轮 verdict：pass，无 High/blocking findings。

## 预期结果

用户现在可以通过 `/hw:analysis` 开启或继续持续分析状态。一个 Cycle 或 Milestone 内的交互式调查可以持续记录 question、hypotheses、experiments、observations、metrics、interpretation、conclusion、confidence 和 next actions，并且只把 compact recovery summary 留在 `state.yaml`。

后续 `/hw:status`、`/hw:report`、OpenCode status panel、Claude status markdown 应能提示当前 Analysis 主线和 ledger path，避免“聊天一多就忘主线”。Debug 也能在一次性排错升级为持续 root-cause investigation 时引导进入 Analysis lane。

## 遇到的问题

1. 初始实现把 canonical 路径写进文档和 skill，但 `core/src/analysis/index.js` 仍默认旧 `.pipeline/analysis/<milestone-id>-analysis-ledger.yaml`。这会让代码行为和文档相反，已通过新增 `legacyAnalysisLedgerPath()` 和改默认路径修复。
2. `/hw:analysis` 加入后命令总数变成 41，但 README、Commands Reference、OpenCode spec 和 v9 smoke 仍有 40 的旧断言。第一轮复核将其判为 High，已同步修复。
3. `core/test/codex-subagent-discipline.test.js` 旧断言只匹配英文措辞，而当前 Skills 多为中文。已改为中英双语契约匹配，保留 worker separation 的实质检查。
4. `tests/scenarios/v8.4/s50-rules-system/run.sh` 暴露旧规则数量断言：当前 builtin rules 为 17，summary 为 17/20 enabled，旧 smoke 仍断言 16 和 16/18。已按当前事实更新。

## 风险/后续

- 本 Milestone 主要修复 Analysis 入口、状态边界、status/report surface 和文档/场景一致性；还未处理 M4 的 `assets/state-init.yaml` 子技能路径引用问题。
- `skills/analysis/SKILL.md` 定义了操作语义，但还没有完整的 CLI 子命令执行器；当前 Hypo-Workflow 仍由宿主 Agent 按 Skill 执行。
- 工作区有大量 C15 变更和新增文件，最终收口需要 M5 做集成 smoke、release readiness、untracked artifact 检查和报告汇总。

