# C15-M5 Integration Smoke And Release Readiness Report

## 结论

C15-M5 已完成。P2 技术路线门禁、详细完成汇报契约、`/hw:analysis` 交互式 Analysis 状态、共享 `state-init.yaml` 资产路径契约，以及源仓库/已安装 Codex Skill 的关键适配器 surface 已完成集成 smoke。

最终复核没有剩余 release blocker。审计中发现的两个问题均已修复：已安装 Skill 缺 `/hw:analysis` surface，以及 `tests/run_regression.py --scenario` 忽略筛选参数并继续跑全量。

## 改动摘要

- 运行 C15-M1 到 C15-M4 的组合 smoke，验证规划、完成汇报、Analysis、Skill asset path 四条主线能一起工作。
- 同步已安装副本 `/home/heyx/.codex/skills/hypo-workflow` 的 `/hw:analysis` 相关 surface，使安装副本 command map 从 40 补齐到 41。
- 修复 `tests/run_regression.py` 的 `--scenario` 参数：重复传参时只跑指定场景，未知场景以 exit 2 清晰失败。
- 修复 regression 结果文件名：filtered run 写 `selected-<count>`，全量 run 写 `all-<count>`，不再使用旧 `s01-s30`。
- 记录测试、实现、审计、审计修复和复核证据。

## 技术思路

M5 没有重复每个 Milestone 的全部实现测试，而是做薄集成层验证：把前四个 Milestone 的关键 contract 聚合成 focused smoke，再检查实际安装副本和生成适配器是否一致。

执行时发现“源仓库已通过，但安装副本仍旧”的真实问题。这个问题会直接影响用户在 Codex 中调用 `$hypo-workflow:analysis` 或 OpenCode `hw-analysis` 的实际可用性，所以本轮没有只把它列为风险，而是同步了安装副本的必要文件。

Regression runner 的问题也属于 release-readiness：M5 prompt 要求跑指定场景，但脚本原先没有解析 `--scenario`，导致命令实际跑全量并混入历史失败。修复后 focused smoke 的命令语义和报告结果一致。

## 修改文件和模块

- `tests/run_regression.py`：新增 `argparse`，支持重复 `--scenario`，未知场景 exit 2；结果文件 suffix 改为 `selected-<count>` / `all-<count>`。
- `/home/heyx/.codex/skills/hypo-workflow/skills/analysis/SKILL.md`：同步安装副本 Analysis Skill。
- `/home/heyx/.codex/skills/hypo-workflow/.opencode/commands/hw-analysis.md`：同步安装副本 OpenCode command。
- `/home/heyx/.codex/skills/hypo-workflow/core/src/commands/index.js`：安装副本命令表补齐 `/hw:analysis`。
- `/home/heyx/.codex/skills/hypo-workflow/core/src/analysis/index.js`：安装副本同步 canonical ledger path 行为。
- `/home/heyx/.codex/skills/hypo-workflow/core/src/opencode-status/index.js`：安装副本同步 Analysis compact status。
- `/home/heyx/.codex/skills/hypo-workflow/core/src/claude-status/index.js`：安装副本同步 Analysis status surface。
- `/home/heyx/.codex/skills/hypo-workflow/SKILL.md`、`.opencode/hypo-workflow.json`、`opencode.json`：安装副本同步 command/metadata surface。
- `.pipeline/reviews/C15/M5/test-evidence.md`：测试 worker 证据。
- `.pipeline/reviews/C15/M5/implementation-evidence.md`：安装副本同步和 regression runner 修复证据。

## 测试设计

测试矩阵分四层：

- Contract 聚合测试：P2 route gate、completion report contract、Analysis state/command、skill asset path、sync standardization。
- Scenario smoke：audit report、debug flow、patch fix flow、analysis preset runtime 四个端到端场景。
- Installed surface smoke：已安装 Codex Skill command map 必须是 41，并包含 `/hw:analysis -> /hw-analysis`。
- Negative path smoke：未知 `--scenario` 必须清晰失败，避免测试命令悄悄退回全量运行。

审计 worker 第一轮将 regression suffix 旧名判为 needs_changes；修复后第二轮只读复核 PASS。

## 验证结果

- `uv run -- node --test core/test/analysis*.test.js core/test/chat*.test.js core/test/response-contract.test.js core/test/skill*.test.js core/test/sync-standardization.test.js core/test/progressive-discover.test.js`：58/58 passing。
- `uv run -- node --test core/test/p2-technical-route-contract.test.js core/test/completion-report-contract.test.js core/test/analysis-command-entry.test.js core/test/analysis-state-ledger.test.js core/test/skill-quality.test.js core/test/skill-spec.test.js core/test/sync-standardization.test.js`：31/31 passing。
- `uv run python tests/run_regression.py --scenario s24-audit-report --scenario s25-debug-flow --scenario s38-patch-fix-flow --scenario s62-analysis-preset-runtime`：4/4 passing。
- `uv run python tests/run_regression.py --scenario does-not-exist`：exit 2，输出 `Unknown scenario(s): does-not-exist`。
- `git diff --check`：passing。
- 已安装副本 `node core/bin/hw-core commands --platform opencode`：`count=41`，`hasAnalysis=true`。
- 审计复核：PASS，无阻塞 findings。

## 预期结果

用户后续实际使用安装在 `/home/heyx/.codex/skills/hypo-workflow` 的 Skill 时，应能看到 `/hw:analysis` 入口和 `hw-analysis` OpenCode adapter，不再出现源仓库支持但安装副本缺失的断层。

指定 regression smoke 时，命令应只运行请求的场景，结果文件也应准确体现运行范围。`state-init.yaml` 继续通过共享根资产路径解析，不需要 child-local copy。

## 遇到的问题

- M5 初始测试发现 installed bundle 缺 `/hw:analysis`，即源仓库 41-command surface 已修复，但安装副本还停在 40。
- `tests/run_regression.py --scenario ...` 原先完全没有解析 `--scenario`，导致指定场景命令实际跑了全量 68 个场景，并混入历史失败。
- 第一轮审计发现 full-suite 结果文件仍使用旧 `s01-s30` suffix；已改成动态 `all-<count>`。

## 风险和后续

- 本轮没有把整个安装副本做整仓库同步，只同步了 C15 必需的 `/hw:analysis` surface 和已确认路径修复，避免删除或覆盖安装副本中无关文件。
- 历史全量 regression 在修复 runner 前曾显示 55/68；这些失败属于既有全量 suite 健康问题，不是 C15 focused release smoke blocker。后续 release 若要求 full suite 绿，需要单独开 Cycle 或 Patch 处理。
- 工作区包含大量 C15 新增/修改文件，最终提交前需要确认所有 untracked C15 artifacts 被纳入变更集。
