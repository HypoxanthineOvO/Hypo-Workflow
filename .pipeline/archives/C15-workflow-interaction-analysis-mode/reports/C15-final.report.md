# C15 Final Report: Workflow 交互细节与 Analysis 模式调查

## 结论

C15 已完成。五个 Milestone 均通过 focused 验证和独立审计/复核，覆盖用户提出的四个核心目标：

- P2 不再只拆 Milestone 目标，必须给出可审核的技术方案、技术路线、调研状态、风险替代、验证路径和审计焦点。
- Milestone、Cycle、Debug、Audit、Patch 完成汇报都必须包含详细字段，说明改动、思路、测试设计、验证结果、预期结果、遇到的问题和风险。
- Hypo-Analysis 恢复为 `/hw:analysis` 一等入口，并使用 `.pipeline/analysis/<id>/ledger.yaml` 记录持续交互式分析主线。
- `cycle`/`start` Skill 的 `assets/state-init.yaml` 引用已改成共享根资产路径 `../../assets/state-init.yaml`，源仓库和已安装副本均修复。

## 改动摘要

- C15-M1：建立 P2 Technical Route Gate，阻止 goal-only P2 进入 proposed/P3。
- C15-M2：建立 Detailed Completion Report Contract，统一 Milestone/Cycle/Debug/Audit/Patch 的完成汇报字段。
- C15-M3：恢复 `/hw:analysis`，补齐 command map、OpenCode artifact、status/report surface、ledger path 和 41-command docs/smoke。
- C15-M4：修复 `state-init.yaml` 子 Skill 共享资产路径，并扩展 skill quality 检查防回归。
- C15-M5：做集成 smoke，修复 installed `/hw:analysis` freshness 和 regression runner `--scenario` 过滤问题。

## 技术思路

这次没有只改一个提示词，而是把用户反馈拆成 Workflow 生命周期里的几个 contract：

- 规划 contract：P2 是“目标 + 技术方案 + 技术路线 + 调研状态”的审核点。
- 完成 contract：完成汇报不是一句完成，而是可审查的结构化 narrative。
- 分析 contract：Analysis 是可恢复的 ledger-backed 交互 lane，不是普通 chat，也不是一次性 debug。
- Skill asset contract：child Skill 不能把 root shared asset 当成本地 `assets/...`。
- Release smoke contract：源仓库和实际安装副本都必须验，不能只验源码。

这样的拆法能避免 Workflow “嘴上说完成目标”，但实际缺少技术路线、缺少测试设计、缺少安装面验证。

## 修改文件和模块

主要涉及：

- Plan/Workflow Skills：`skills/plan*`、`skills/cycle`、`skills/start`、`skills/report`、`skills/debug`、`skills/audit`、`skills/patch`、`skills/analysis`。
- Core helpers：`core/src/commands`、`core/src/analysis`、`core/src/response`、`core/src/skills`、`core/src/opencode-status`、`core/src/claude-status`。
- Specs/docs/templates：`references/*`、`templates/*`、`assets/report-template.md`、`README*`、`docs/reference/commands.md`。
- Tests/scenarios：P2 contract、completion report contract、Analysis command/runtime/state/status、skill quality/spec、OpenCode command map 和 regression runner。
- Installed bundle：`/home/heyx/.codex/skills/hypo-workflow` 中与 M3/M4/M5 相关的 Skill、OpenCode command、command map 和 status helpers。

## 测试设计

测试按“先 RED 证明缺口，再 GREEN，再独立审计”的方式进行：

- M1：P2 contract fixtures 验证每个 milestone 必须有技术方案/路线字段，用户 challenge 会回到 revision/in_progress。
- M2：completion report contract 验证八个详细字段贯穿 runtime helper、模板和五类完成面。
- M3：Analysis 入口测试先失败，再补 `/hw:analysis`、ledger path、status/report 和 41-command docs/smoke。
- M4：构造 child Skill bad asset fixture，证明旧 quality check 抓不住 `assets/state-init.yaml` 错误，再实现 inline asset path 检查。
- M5：组合 smoke 验证 M1-M4 一起工作，并额外检查 installed bundle freshness。

## 验证结果

最终关键验证全部通过：

- M1 focused tests：27/27 passing。
- M2 focused tests/scenarios：13/13 passing，`s24`/`s25`/`s38` smoke passing。
- M3 focused regression：105/105 passing，OpenCode/README/docs/scenario 41-command smoke passing。
- M4 focused tests：9/9 passing，source/installed `state-init.yaml` layout smoke passing。
- M5 integration tests：58/58 passing，31/31 contract aggregate passing，指定 regression scenarios 4/4 passing。
- installed bundle command map：41 commands，包含 `/hw:analysis -> /hw-analysis`。
- `git diff --check`：passing。
- M5 audit recheck：PASS。

## 预期用户可见行为

- Workflow 在 P2 会主动展示技术方案和技术路线，并把不确定点、欠调研和用户私有 schema 问题作为硬门禁。
- 完成后汇报会更详细，不只说“完成了”，而是说明改动范围、设计思路、测试设计、验证结果、预期行为、遇到的问题和剩余风险。
- 用户可以用 `/hw:analysis` 进入持续分析状态，在 Cycle/Milestone 内保留主线和分析记录。
- `/hw:cycle new` 或初始化状态时不应再报 `skills/cycle/assets/state-init.yaml` 缺失。
- `tests/run_regression.py --scenario ...` 会真正只运行指定场景。

## 遇到的问题

- P2 测试初版依赖 ignored runtime 文件，被审计阻断；已改成 tracked fixture。
- Completion contract 初版只改模板，没有改 runtime response helper；已补齐。
- Analysis 初版默认 ledger path 仍是旧扁平路径，且 docs/scenarios 仍写 40 commands；已修为 canonical ledger 和 41 commands。
- M4 初版只修 cycle，后续发现 start 也有同类 `assets/state-init.yaml` 引用；已同步修复。
- M5 发现安装副本与源仓库不同步、regression runner 忽略 `--scenario`、全量结果文件 suffix 陈旧；均已修复。

## 剩余风险

- 历史全量 regression suite 在 M5 初始调查中曾显示 55/68；本 Cycle 的 focused smoke 已通过，但 full suite 健康仍建议另开任务治理。
- 安装副本只做了 C15 必需的 targeted synchronization，没有执行整仓库覆盖式同步。
- 当前工作区有大量 C15 新增和修改文件；提交前需要把 untracked C15 tests/reports/skills 纳入版本控制。

## 决策

C15 完成，可以进入人工验收或提交阶段。
