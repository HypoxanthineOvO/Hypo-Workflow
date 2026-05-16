# C15-M3 Audit Review

Worker: `audit`
Scope: C15-M3 `Interactive Analysis State And Command Entry`
Time: 2026-05-16T01:32:49+08:00

## Verdict

结论：存在阻塞问题，C15-M3 暂不应标记完成。

底层 Analysis preset、ledger helper、interaction boundary 没有消失；本次实现也补上了 `/hw:analysis`、OpenCode `/hw-analysis`、skill/spec/debug/status/report/progress guidance 的主要入口。但核心 runtime helper 和部分测试/状态展示仍保留旧 ledger 路径或未接入 compact Analysis summary，导致“用户可见入口 + state recovery”的关键合同没有完全闭环。

## Findings

### Critical: 新建 Analysis 仍默认写入 legacy ledger 路径，违背 C15-M3 canonical path

证据：

- `core/src/analysis/index.js:95` 的 `analysisLedgerPath()` 仍返回 `.pipeline/analysis/${id}-analysis-ledger.yaml`。
- `core/src/analysis/index.js:135` 和 `core/src/analysis/index.js:220` 分别让 `buildAnalysisStateSummary()`、`buildAnalysisReportContract()` 在未传 override 时沿用该 legacy 路径。
- `core/src/analysis/index.js:256` 的 prompt plan 仍要求维护 `.pipeline/analysis/<milestone-id>-analysis-ledger.yaml`。
- `core/test/analysis-state-ledger.test.js:33`、`core/test/analysis-state-ledger.test.js:35` 和 `core/test/analysis-runtime.test.js:109` 仍断言 legacy path，因此当前绿色测试没有覆盖新的 canonical contract。
- `references/state-contract.md:168`、`references/state-contract.md:191` 仍把 full evidence 示例/边界写成 legacy path。

影响：

新 `/hw:analysis enter` 或任何复用 helper 的 state/report recovery 默认会把 `prompt_state.analysis_summary.ledger_path` 指向 legacy 文件，而 C15-M3 要求 canonical source of truth 是 `.pipeline/analysis/<cycle-or-milestone>/ledger.yaml`，旧 `.pipeline/analysis/<milestone-id>-analysis-ledger.yaml` 只应兼容已有 ledger。这样会造成文档/skill 说 canonical，但 runtime summary/report helper 实际创建/恢复另一套路径。

建议修复：

- 将 `analysisLedgerPath(id)` 默认改为 `.pipeline/analysis/<id>/ledger.yaml`。
- 增加显式 `legacyAnalysisLedgerPath(id)` 或 resolver：当 `prompt_state.analysis_summary.ledger_path` 已指向 legacy 时保留 legacy；无 state pointer 时使用 canonical。
- 更新 `renderAnalysisPromptPlan()`、`references/state-contract.md`、`analysis-state-ledger` 和 `analysis-runtime` 测试，确保新建默认是 canonical、旧路径仅作为 compatibility case。

### Warning: OpenCode/Claude runtime status surfaces 未展示 `prompt_state.analysis_summary`

证据：

- `rg analysis_summary core/src/opencode-status core/src/claude-status` 无命中。
- `core/src/opencode-status/index.js:73` 到 `core/src/opencode-status/index.js:98` 组装 status model 时没有 analysis summary 字段。
- `core/src/opencode-status/index.js:601` 到 `core/src/opencode-status/index.js:619` 的 sidebar 只展示 Cycle/Phase/Next/Acceptance/Feature/Milestone/Step/Gate。
- `core/src/claude-status/index.js:51` 到 `core/src/claude-status/index.js:61` 的 markdown status 同样没有 question、ledger path、outcome/confidence、next action 或 compact counts。

影响：

`skills/status/SKILL.md` 和 `references/commands-spec.md` 已写明 `/hw:status` 应展示 Analysis compact summary，但 OpenCode/Claude 生成状态表面仍不会显示这些字段。用户在 OpenCode/TUI/Claude status 路径下仍可能感觉 Analysis state “不可见”。

建议修复：

- 在共享 status surface model 中添加 `analysis` 或 `analysis_summary` compact 节点，仅复制 question、ledger path、outcome/conclusion、confidence、next action、hypothesis/experiment counts。
- sidebar/markdown 只展示 compact fields，不读取或 dump ledger 全量 hypotheses/experiments/observations。
- 增加 opencode/claude status fixture test，验证 state 中存在 `prompt_state.analysis_summary` 时可见。

### Warning: 41 命令更新仍有测试/文档计数不一致

证据：

- `find skills -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l` 实际为 `40`，但 `references/skill-spec.md:15` 写 “41 local Skill files”，`references/skill-spec.md:62` 也重复该计数。当前 41 是 user-facing command count，不是 local child Skill file count。
- `README.md:68`、`README.md:110`、`README.en.md:65`、`docs/developer.md:19` 仍保留 40 的说明。
- 额外 spot-check：`uv run -- node --test core/test/codex-subagent-discipline.test.js` 失败，其中 `core/test/codex-subagent-discipline.test.js:272` 仍断言 `40 user-facing Hypo-Workflow commands`。该文件还存在其它与本审计范围不完全相关的失败，未作为本 finding 的主证据。

影响：

指定测试集已经通过，但仓库内仍有 stale count 文档和至少一个未包含在指定命令里的测试断言。后续全量回归或文档发布会继续暴露 40/41 drift。

建议修复：

- 将 “local Skill files” 修正为实际 `40`，或补齐确实缺失的第 41 个 child Skill；不要把 command count 和 child Skill file count 混用。
- 更新 README/docs/scenario grep 和 `codex-subagent-discipline.test.js` 中的 user-facing command count。
- 增加一个基于 `find skills/*/SKILL.md` 的真实 inventory assertion，避免 `skill-spec.test.js` 只检查文本短语。

## Positive Checks

- `/hw:analysis` 已加入 `core/src/commands/index.js`，OpenCode mapping 为 `/hw-analysis`，agent 为 `hw-debug`，skill 为 `skills/analysis/SKILL.md`。
- `SKILL.md`、`references/commands-spec.md`、`references/opencode-command-map.md`、`references/skill-spec.md`、`.opencode/commands/hw-analysis.md`、`opencode.json`、`.opencode/hypo-workflow.json` 均能看到 `/hw:analysis` / `/hw-analysis` 入口。
- `skills/analysis/SKILL.md` 清楚区分 Analysis 与 `/hw:chat`，并定义 `enter`、`continue`、`end`、`report` 语义。
- Debug guidance 已把持续 root-cause investigation 引导到 Analysis lane。
- `core/src/rules/index.js:160` 的 `rule.name || rule.id` 修复是合理的窄修复：它让 builtin rule 同时兼容 `name` 和 `id` 格式，主要解决 `rules/builtin/claude-hw-command-namespace.yaml` 这类 `id:` 规则，不扩大规则执行面。

## Validation Run

指定命令结果：

```bash
uv run -- node --test core/test/analysis-command-entry.test.js
```

结果：PASS，5 tests passed。

```bash
uv run -- node --test core/test/analysis-runtime.test.js core/test/analysis-state-ledger.test.js core/test/analysis-interaction.test.js core/test/analysis-preset.test.js core/test/chat-runtime.test.js core/test/chat-mode-spec.test.js core/test/sync-standardization.test.js core/test/skill-spec.test.js core/test/deep-plan-integration.test.js core/test/commands-rules-artifacts.test.js core/test/claude-plugin-alias.test.js core/test/knowledge-ledger.test.js
```

结果：PASS，56 tests passed。

```bash
git diff --check -- SKILL.md skills/analysis/SKILL.md skills/help/SKILL.md skills/plan-deep/SKILL.md core/src/commands/index.js core/src/rules/index.js core/test/analysis-command-entry.test.js core/test/skill-spec.test.js core/test/sync-standardization.test.js core/test/deep-plan-integration.test.js core/test/commands-rules-artifacts.test.js core/test/claude-plugin-alias.test.js core/test/knowledge-ledger.test.js references/commands-spec.md references/opencode-command-map.md references/opencode-parity.md references/skill-spec.md references/analysis-spec.md references/analysis-ledger-spec.md references/debug-spec.md references/progress-spec.md skills/debug/SKILL.md skills/status/SKILL.md skills/report/SKILL.md .opencode/commands/hw-analysis.md .opencode/hypo-workflow.json opencode.json .pipeline/reviews/C15/M3
```

结果：PASS，无输出。

额外只读 spot-check：

```bash
uv run -- node --test core/test/codex-subagent-discipline.test.js
```

结果：FAIL，10 tests 中 4 passed / 6 failed；本审计仅采纳其中与 40/41 count 直接相关的 stale assertion 作为证据，其它失败未展开归因。

## Remaining Risk / Test Gaps

- 当前 M3 新测试验证了入口和文档可见性，但没有验证 helper 默认路径是否符合 canonical ledger path。
- 当前状态展示测试未覆盖 `prompt_state.analysis_summary` 在 OpenCode/Claude status surface 中的可见性。
- README、developer docs、legacy scenario grep 仍可能在全量回归或 release readiness 阶段失败。
