---
kind: execution-log
cycle: C022-workflow-semantic-simplification
updated: 2026-08-06T14:03:53+08:00
---

# Workflow 语义简化执行记录

## 2026-08-06 14:03 - C22 最终接受并关闭

- **计划项：** `M5` → Cycle close
- **目的：** 记录用户对 C22 完整结果的最终接受，并结束本 Cycle。
- **动作：** 校验目标为 `C022-workflow-semantic-simplification`、状态为 `waiting-review`、全部计划项已完成且验证证据仍有效；生成最终 Summary 并关闭 Cycle。
- **结果：** 用户明确接受 C22；Cycle 状态改为 `closed`，后续版本发布、本机安装和 Nod 部署不回写为 C22 任务。
- **证据：** 用户消息“接受 C22”；maintained 704/704、跨仓库 VSP Host Contract/semantic routing/TUI routing 25/25、History Refresh 重复激活 `unchanged`。
- **计划影响：** 无；完整计划已结束。
- **遇到的问题：** 安装版 Accept Skill 仍描述旧 manifest Delivery Receipt，而 C22 是语义 Cycle；未伪造不匹配的旧 Receipt，按已批准的语义文件合同记录接受。
- **下一步：** 独立执行 `15.0.0-alpha.1` 发布、本机更新和 Nod 部署。

## 2026-08-06 01:10 - M5 完成并等待最终接受

- **计划项：** `M5`
- **目的：** 按 S2 决定激活历史语义层，同时证明旧历史、Manifest 和 live Delivery 未被改写。
- **动作：** 实现显式授权、预览一致性校验、冲突前置阻断、原子索引写入、失败回滚和幂等激活；正式创建 20 个历史 Cycle、Cycle/Memory/Experiment/Legacy 索引和激活记录；更新回归目录与旧英文提示断言。
- **结果：** 20 个历史 Cycle 正式可读，7 个 live Delivery 仍走旧兼容入口，`experiment-protocol-hooks-simplification` 保持 `pending_acceptance`；重复激活返回 `unchanged`。
- **证据：** `.pipeline/history-refresh/C022-activation.md`、`.pipeline/cycles/INDEX.md`、`.pipeline/legacy/INDEX.md`；maintained 68 files、704/704 tests 通过；C22 Plan/Progress 校验通过。
- **计划影响：** S2 决定使 M5 从“切换 Manifest”调整为“Manifest 原位保留、`.pipeline/INDEX.md` 成为语义入口”。
- **遇到的问题：** 首轮激活测试发现全新 `cycles/` 目录处理缺口；完整 maintained 回归发现 8 条旧英文/内部协议断言和一项 retired CLI 测试自相矛盾，均按当前中文语义和 C21 retired-surface 合同局部修正。
- **下一步：** 等待 C22 最终接受或带反馈拒绝；不执行远端 release。

## 2026-08-06 00:35 - S2 接受并进入 M5

- **计划项：** `S2` → `M5`
- **目的：** 按已审阅预览激活语义历史，同时保护仍需旧入口的工作。
- **动作：** 记录用户选择“接受并进入 M5”，采用正式写入 20 个语义 Cycle、旧详细历史与 live Delivery 原位保留的策略。
- **结果：** M5 获得激活授权；pending live Delivery 不自动转换、不自动接受。
- **证据：** Stone S2 选择与 `.pipeline/history-refresh/C022-preview/mapping.yaml`。
- **计划影响：** 为保持 live Delivery 兼容，Manifest 不切换 schema；`.pipeline/INDEX.md` 成为语义入口，旧 Manifest 保留兼容读取。
- **遇到的问题：** 无。
- **下一步：** 实现并执行可回滚、幂等的正式激活。

## 2026-08-06 00:25 - M4 完成并进入 S2

- **计划项：** `M4` → `S2`
- **目的：** 为当前真实历史生成可审阅、可重复且不修改旧源的语义迁移预览。
- **动作：** 盘点 1270 个 `.pipeline` 源文件，映射 20 个 archived Cycle 与 71 个 Memory Records，列出 live Delivery、Knowledge、Chats、Patches 和 PR 的保留策略。
- **结果：** 生成 106 个 preview files；20/20 Cycle 的 Plan/Progress 对齐；重复生成返回 `unchanged`；旧 archives 内容快照不变。
- **证据：** `.pipeline/history-refresh/C022-preview/REPORT.md`、`mapping.yaml` 与 `core/test/history-refresh-preview.test.js`。
- **计划影响：** M5 仍被 S2 阻塞，未授权激活。
- **遇到的问题：** C5、C8、C14 的旧 state YAML 无法解析；C2 缺 Summary；C13/C14 缺 Progress；一个 live Delivery 仍为 `pending_acceptance`。初次 preview 的 report 匹配曾把缺 ID 的历史项误配到同一 report，已修复并重建。
- **下一步：** 用户审阅 S2 的映射策略、不确定项和激活选择。

## 2026-08-05 23:40 - M3 完成并进入 M4

- **计划项：** `M3` → `M4`
- **目的：** 完成语义文件实际行为，并开始安全的旧历史预览。
- **动作：** 实现 Plan/Progress 校验、语义 Resume、Session 聚焦、Discussion 原文追加/脱敏/去重和语义 PreCompact；为当前项目建立语义索引。
- **结果：** 综合 suite 28/28 通过，当前 C22 七个计划 ID 完全对齐，Resume 上下文为 5634 bytes。
- **证据：** `core/src/semantic-workflow/index.js`、`core/test/semantic-workflow-runtime.test.js` 和 `.pipeline/INDEX.md`。
- **计划影响：** 无；按计划自动进入 M4。
- **遇到的问题：** 三条旧 Hook 断言依赖已删除的英文内部措辞，已改为验证中文语义与内部信息不可见；旧 fallback 测试仍通过。
- **下一步：** 只读盘点旧历史并生成 History Refresh 预览。

## 2026-08-05 23:10 - M2 完成并进入 M3

- **计划项：** `M2` → `M3`
- **目的：** 清除真实模型可见表面的协议负担，并开始实现语义文件行为。
- **动作：** 重写 Root Router、10 个 Child Skills、Claude/OpenCode 公开命令生成源与映射、Codex Hook 注册和用户可见提示。
- **结果：** Claude/OpenCode 命令均为薄映射；Codex 只注册六类语义/安全 Hook；focused suite 28/28 与 Skill quality 11/11 通过。
- **证据：** `core/test/semantic-workflow-prompts.test.js`、`SKILL.md`、`commands/`、`.opencode/commands/` 和 `hooks/hooks.json`。
- **计划影响：** 无；按计划自动进入 M3。
- **遇到的问题：** 两组旧 Claude 测试因 dirty worktree 中缺失的 Core export 在 import 阶段失败；M2 未修改这些并行接口。Release artifact 构建器拒绝 dirty source，按设计未运行。
- **下一步：** 实现语义恢复、Plan/Progress 校验和 Discussion Ledger 捕获。

## 2026-08-05 22:30 - S1 接受并进入 M2

- **计划项：** `S1` → `M2`
- **目的：** 在语义基础获批后开始清理真实模型可见提示词。
- **动作：** 记录 S1 接受，将当前计划项推进到 M2。
- **结果：** M1 与 S1 均为 `completed`，M2 为 `in_progress`。
- **证据：** 用户选择“接受 S1 并继续 M2”。
- **计划影响：** 无。
- **遇到的问题：** 无。
- **下一步：** 审计 Router、Child Skills、Hooks 及其生成源。

## 2026-08-05 22:20 - 完整计划编码修订完成

- **计划项：** `M1` → `S1`
- **目的：** 验证 Plan、Progress 与 Execution 能清楚表达完整计划和当前位置。
- **动作：** 更新合同、模板、C002/C003 样例和 C22 记录，并新增 Plan/Progress ID 顺序一致性测试。
- **结果：** Focused test 5/5 通过，M1 完成，S1 进入 `waiting-review`。
- **证据：** `templates/semantic/plan.md`、`templates/semantic/progress.md`、C002 Progress 和当前 `PROGRESS.md`。
- **计划影响：** 不改变 Milestone scope，只补足计划表达与状态投影。
- **遇到的问题：** 无新增问题。
- **下一步：** 用户审阅 S1；未接受前不开始 M2。

## 2026-08-05 22:10 - S1 再次拒绝并补充计划编码

- **计划项：** `S1` → `M1`
- **目的：** 让 Progress 明确展示完整计划以及自己对应的 Plan。
- **动作：** 为 Plan 增加稳定 ID 与完整表格，为 Progress 增加反向路径和全部计划项状态镜像，为 Execution 增加计划项引用。
- **结果：** M1 返回修订；结构调整限定在合同、模板、样例与 C22 记录。
- **证据：** 用户反馈“Progress 这个得明确有一个完整的计划表”。
- **计划影响：** 增强计划编码和可见性，Milestone scope 与顺序不变。
- **遇到的问题：** 初版 Progress 只有自由文本状态，不能回答“完整计划是什么”和“现在在哪一项”。
- **下一步：** 验证 Plan/Progress ID 完整一致，再重新提交 S1。

## 2026-08-05 21:55 - 中文修订完成并重新进入 S1

- **计划项：** `M1`
- **目的：** 让 M1 的人类可读记录符合项目语言偏好。
- **动作：** 将语义合同、10 份模板、全部真实样例和 C22 记录改为中文主体，并增加模板中文内容断言。
- **结果：** Focused test 4/4 通过，`git diff --check` 通过。
- **证据：** `references/semantic-workflow-contract.md`、`templates/semantic/` 与 `examples/semantic-workflow/`。
- **计划影响：** 无；M2 仍等待 S1。
- **遇到的问题：** 无新增问题。
- **下一步：** 重新提交 Stone S1。

## 2026-08-05 21:45 - S1 拒绝并返回 M1 修订

- **计划项：** `S1` → `M1`
- **目的：** 按人工审阅结果纠正 M1 的语言和阅读体验。
- **动作：** 接受拒绝反馈，将合同、模板、样例和 C22 自身记录改为中文主体。
- **结果：** M1 返回 revising，M2 保持未开始。
- **证据：** S1 用户反馈“我想用中文写，只保留必要的英文术语”。
- **计划影响：** 新增中文主体作为 M1 验收条件，架构与 scope 不变。
- **遇到的问题：** 初版错误地把英文 schema key 扩大成了英文正文。
- **下一步：** 完成中文修订并重新运行 focused validation。

## 2026-08-05 21:35 - M1 首版完成并进入 S1

- **计划项：** `M1`
- **目的：** 在修改真实提示词前，确认语义模型已经具体到可供用户审阅。
- **动作：** 新增语义合同、10 份模板、一个已关闭 Demo、两个并行 active Cycle、一个跨 Cycle Experiment 和 focused test。
- **结果：** 四项 focused test 通过，M1 写集无 whitespace error。
- **证据：** `core/test/semantic-workflow-templates.test.js` 与 `examples/semantic-workflow/INDEX.md`。
- **计划影响：** Scope 没有变化。
- **遇到的问题：** 两条初始测试断言依赖字节换行而不是 Markdown 语义；只修正了断言。
- **下一步：** 用户审阅合同、模板和真实样例。

## 2026-08-05 21:20 - M1 启动

- **计划项：** `M1`
- **目的：** 在修改 live prompts 前建立可审阅的语义基础。
- **动作：** 将 M1 限定为合同、模板、样例、focused test 和 C22 记录。
- **结果：** 源码边界明确，M1 不触碰 Router、Skills、Hooks、Core lifecycle 或旧 archives。
- **证据：** 当前讨论中已批准的 Proposal 与 `PLAN.md`。
- **计划影响：** 无。
- **遇到的问题：** 仓库存在大量既有修改，因此 M1 使用全新的隔离路径。
- **下一步：** 验证模板和示例，然后请求 S1 审阅。

## 2026-08-05 21:15 - C22 获批

- **计划项：** `M1`
- **目的：** 在源码修改前确认完整简化范围。
- **动作：** 展示目的、边界、验证、架构、五个 Milestone 和两个审阅点。
- **结果：** 用户选择确认并开始。
- **证据：** 当前 Cycle Discussion Ledger 与 `DISCUSSION-SUMMARY.md`。
- **计划影响：** 授权执行至 M1；History Refresh 激活仍需 S2。
- **遇到的问题：** 无。
- **下一步：** 启动 M1。
