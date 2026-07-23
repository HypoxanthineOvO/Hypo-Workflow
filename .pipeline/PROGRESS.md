# C21 Hypo-Workflow vNext：全局架构、平台能力与效果治理 — 研究进度

> 最后更新：08:15 | 状态：M5 Curator + independent Auditor 已登记；legacy source freeze | Cycle：C21

## 当前状态

🔄 **M5 Curator 与独立 Auditor 已登记** — 正在对 66 个历史候选做 proposal-only 去重、supersedes 与当前权威裁决；独立审计前不写 Record Store、不 staging、不 activation。

✅ **前置全局扫描已完成** — 已形成详细原始报告和简版定性报告；本轮没有进入产品实现。

🟡 **Decompose 已提出** — 基于三份独立仓库扫描与 Codex 官方 Hook 文档，C21 已拆为 8 个串行 Milestone；当前等待用户确认技术路线，尚未进入 Generate 或产品实现。

✅ **Generate 已完成** — 已生成 8 份完整执行 prompt、C21 Skill-first 架构基线和严格工作器配置；当前尚未修改产品代码，等待最后的执行确认后启动 M1 test worker。

🔄 **C21-M1 已启动** — 已建立 execution lease，并请求独立 test worker 编写格式识别、事务故障恢复和旧 writer 拒写的真实文件系统 RED 测试。

✅ **M1 RED 已确认** — 20 个顶层测试、完整实现后 41 个 case；focused 结果为 11 pass / 3 个预期缺模块失败。test worker 已释放，独立 implement worker 已请求。

✅ **M1 聚焦 GREEN 已完成** — 52/52 通过。

✅ **M1 全量回归修订已完成** — Revision 2 修复 init 缺失目录与 lifecycle requested 状态兼容问题。

✅ **M1 GREEN 验证已完成** — focused 52/52、full 728/728、diff 与语法检查全部通过。

⛔ **M1 独立审计 NEEDS_CHANGES** — 复现 4 类 authority/integrity blocker，diff_score 4 超过阈值 3。

✅ **M1 Revision 2 测试已完成** — 7 个顶层对抗契约；inventory 独立扩展到 22 类项目 writer。

✅ **M1 RED 已确认** — 主线程复现 73 tests：54 pass / 19 fail；失败仅对应新增 authority/integrity 契约。

✅ **M1 implement Revision 3 已完成** — transaction disk-hash invariant、pending-id exclusion、missing-root 与 22-family writer fence 已实现。

✅ **M1 Revision 3 GREEN 已完成** — focused 73/73、full 749/749、diff/syntax/config 全部通过。

⛔ **M1 re-audit NEEDS_CHANGES** — 原七项 blocker 已关闭，但发现祖先/后代 write path 会造成不可恢复部分安装。

✅ **M1 test Revision 3 已完成** — 双顺序 prefix-collision 契约已加入；旧 73 项保持 GREEN。

✅ **M1 prefix-collision RED 已确认** — 76 total / 73 pass / 3 fail；旧 73 项全部 GREEN。

✅ **M1 implement Revision 4 已完成** — prefix-free preflight 在任何 filesystem I/O 前执行。

✅ **M1 Revision 4 GREEN 已完成** — focused 76/76、full 752/752、diff/syntax/config 全部通过。

✅ **C21-M1 已完成** — final audit PASS；focused 76/76；full 752/752；transaction kernel 与 22-family writer fence 已认证。

✅ **C21-M2 测试契约已完成** — 5 files / 37 top-level contracts / 49 eventual cases；M1 baseline 76/76。

✅ **C21-M2 RED 已确认** — 37 tests：0 pass / 5 expected module fail / 32 skip；M1 76/76。

✅ **C21-M2 implement 已完成** — 四个 authority store、19 个显式 exports 与生产侧磁盘/安全/并发 smoke 已交付。

⛔ **C21-M2 focused GREEN Attempt 1 为 RED** — 49 test/subtest：18 pass / 31 fail；失败集中为四类生产契约偏差与一条过强回滚断言。

✅ **C21-M2 Revision 1 已完成** — test 与 implement 均已关闭且保持角色边界。

⛔ **C21-M2 focused GREEN Attempt 2 为 RED** — 26 pass / 23 fail；已收敛为 3 个生产契约簇。

✅ **C21-M2 implement Revision 2 已完成** — 三个剩余生产契约均完成自建 smoke。

⛔ **C21-M2 focused GREEN Attempt 3 为 RED** — 31 pass / 18 fail；剩余为 4 个窄生产边界与 1 个自相矛盾 fixture。

✅ **C21-M2 Revision 3/2 已完成** — implement production smoke、Snapshot 9/9、M1 76/76。

✅ **C21-M2 focused GREEN Attempt 4** — 49/49 通过。

✅ **C21-M2 full validation 已完成** — focused 49/49；full 801/801；log 7/7；diff/config/syntax/secret checks 全过。

⛔ **C21-M2 独立审计为 NEEDS_CHANGES** — 发现 4 Critical / 3 Warning；现有 49/49 与 801/801 绿灯不足以关闭 authority 缺口。

✅ **C21-M2 Revision 3 RED 已确认** — 54 tests：34 pass / 11 fail / 9 skip；M1 76/76。

✅ **C21-M2 Revision 4 implement 已完成** — 六项审计契约与 20 个 root exports 已交付。

⛔ **C21-M2 focused Attempt 5** — 59/61；剩余两个 Receipt factory envelope 缺口。

✅ **C21-M2 Revision 5 已完成** — Receipt 终态 Clock 与 hidden-reasoning scope 拒绝已关闭。

✅ **C21-M2 最终验证** — focused 61/61；full 813/813；log 7/7；M1 76/76；静态检查全过。

✅ **C21-M2 fresh re-audit PASS** — 0 finding；首轮 4 Critical / 3 Warning 全部关闭。

✅ **C21-M2 已完成** — Runtime、Records、Receipts、Snapshots 与 20 个显式 exports 已认证。

✅ **C21-M3 RED 已确认** — 24 total：4 个 API boundary fail / 20 个行为 skip；M1 76/76；M2 61/61。

✅ **C21-M3 initial implement 已完成** — Journal/Capsule/Pack/restore/retention 生产 smoke 通过。

⛔ **C21-M3 focused Attempt 1** — 21/29；8 个 public envelope 差异。

✅ **C21-M3 implement Revision 1 已完成** — 8 个 public envelope 已关闭。

⛔ **C21-M3 focused Attempt 2** — 28/29；仅剩 malformed Pack corruption code。

✅ **C21-M3 implement Revision 2 已完成** — corrupt Pack/Seal 使用稳定脱敏分类。

✅ **C21-M3 最终验证** — focused 29/29；full 842/842；M1 76/76；M2 61/61；log/static 全过。

⛔ **C21-M3 independent audit 为 NEEDS_CHANGES** — 3 Critical / 3 Warning；发现 Pack generation、跨 writer blob、metadata gate、retention integrity、真实 incremental 与 append cursor 缺口。

✅ **C21-M3 audit RED 已确认** — 47 tests：31 pass / 16 fail；原 29/29 全保留；六个 cluster 稳定。

⛔ **C21-M3 focused Attempt 3** — 41/47；Pack ancestry、blob concurrency、retention binding 和 append cursor 已关闭，只剩 true incremental Capsule 与 routing metadata gate。

⛔ **C21-M3 focused Attempt 4** — 39/47；routing gate 与 sealed cursor-segment 跳过已通过，但普通 same-segment delta 被过度跳过。

✅ **C21-M3 最终验证 GREEN** — focused 47/47；full 860/860；M1 76/76；M2 61/61；log 7/7；静态检查全过。

✅ **C21-M3 已完成** — fresh final audit PASS；六个首审 finding 全部关闭。

✅ **C21-M4 test worker RED_READY** — 25 total / 7 fail / 18 skip；M1 76、M2 61、M3 47 全绿。

✅ **C21-M4 RED 已确认** — 25 total / 7 fail / 18 skip；失败只来自缺失的新 API、metadata 和 router。

✅ **C21-M4 implement 已完成** — production/adversarial/registry Skill smoke 全绿；Root Skill 100 行/6.8KB。

⛔ **C21-M4 focused Attempt 1** — 18/25；5 个窄生产差异，另有 2 个测试错误地扩展 M2 Record kind。

✅ **C21-M4 Revision 1 已完成** — test 修正 M2 Record taxonomy，implement 关闭 5 个生产差异。

✅ **C21-M4 focused GREEN** — 25/25；M1-M3/log/static 全绿。

⛔ **C21-M4 full Attempt 1** — 871/885；14项均为 unavailable Goal误入legacy generator或精简Skill兼容/quality缺口。

✅ **C21-M4 implement Revision 2** — canonical 54 / legacy 53 分离；Skill quality 0 issue。

⛔ **C21-M4 full Attempt 2** — 884/885；仅剩 Guide one next path 兼容措辞。

✅ **C21-M4 implement Revision 3** — Guide 兼容措辞已完成，Skill quality 0 issue。

✅ **C21-M4 最终验证 GREEN** — focused 25/25；full 885/885；M1 76；M2 61；M3 47；log 7；静态检查全过。

⛔ **C21-M4 independent audit NEEDS_CHANGES** — 1 Critical / 2 Warning；brownfield敏感metadata、symlink repoRoot、symlink .pipeline ancestor。

✅ **C21-M4 audit RED_READY** — 44 total / 33 pass / 11 fail；原25项全保留，4个audit cluster稳定。

✅ **C21-M4 audit RED 已确认** — 44 total / 33 pass / 11 fail；原25项全绿，4个cluster精确复现。

✅ **C21-M4 implement Revision 4** — 4个audit cluster已修复，全部production smoke通过。

⛔ **C21-M4 audit GREEN Attempt 1** — 41/44；4个production cluster已关闭，2个basename fixture位于scanner范围外。

✅ **C21-M4 test Revision 3** — bounded scan fixture已对齐，worker focused 44/44。

✅ **C21-M4 final validation** — focused 44/44、full 904/904、M1 76、M2 61、M3 47、log 7，静态检查全部通过。

✅ **C21-M4 fresh final re-audit** — PASS，0 finding；初审 1 Critical / 2 Warning 全部关闭。

✅ **C21-M4 已完成** — Init/adoption/Legacy inspection/Skill router 已认证，Plan Review 确认 M5-M8 无需 prompt patch。

✅ **C21-M5 test worker** — RED_READY；24 total / 3 pass / 3 fail / 18 skip，旧 M1-M4 全绿。

✅ **C21-M5 RED confirmed** — 24 total / 3 pass / 3 fail / 18 skip；失败只对应三组新 API。

🔄 **C21-M5 implement worker** — /root/m5_implement 正在实现 proposal topology、deterministic writer、activation/rollback/restore，禁止读取测试。

✅ **C21-M5 test Revision 1** — 已修正 fixture 中错误的 M6 路由；focused/full RED 计数不变，失败仍只对应九个 M5 API。

✅ **C21-M5 bounded Extractors** — 六组 66 条 proposal 已统一为可审计来源契约；`locator` 均指向真实 repo-relative 文件，细粒度位置保留在 `ref`，实际读取与 source hash 复算通过。

✅ **C21-M5 implement worker** — 九个 Bootstrap API 已交付；production-only 扩展 smoke、9/9 exports 与静态检查通过。

⛔ **C21-M5 focused GREEN Attempt 1** — 36 total / 7 pass / 29 fail；全部失败由同一个 source-envelope 拒绝提前截断。

✅ **C21-M5 implement Revision 1** — canonical `{type,ref,locator,digest}` 来源与 Record provenance 完整绑定；安全/确定性 production smoke 通过。

⛔ **C21-M5 focused GREEN Attempt 2** — 仍为 7 pass / 29 fail；来源契约已关闭，现暴露五个 proposal topology clusters。

✅ **C21-M5 implement Revision 2** — support/exclusion/merge/active-leaf/sanitized audit-marker 五组合同已完成，production suite green。

⛔ **C21-M5 focused GREEN Attempt 3** — 35/36；所有核心行为已通过，仅缺 activation result 的 candidate-key → Record-ID 映射。

✅ **C21-M5 implement Revision 3** — activation result 已补排序 `{key,id,active}` 引用视图，并验证与 compiled records/index 一致。

✅ **C21-M5 focused GREEN Attempt 4** — 36/36；proposal、audit、staging、activation fault、rollback、fresh restore、writer fence 全绿。

✅ **C21-M5 full validation** — focused 36/36、full 940/940、M1 76、M2 61、M3 47、M4 44、log 7；syntax/diff/credential clean。

🔄 **C21-M5 curation / independent audit** — 开始对 66 条真实 proposal 做取舍、supersedes 和来源/隐私审批；仍不写 Record authority。

✅ **C21-M5 proposal semantic normalization** — C9-C21 四组共 54 条全部经 production API `included`，0 excluded；事实、patch 与来源不变量保持。

✅ **C21-M5 extraction coverage** — PROPOSAL_ONLY；66 candidates / 115 refs / 57 unique locators，57/57 digest 通过，无 intake blocker，已列出 Curator 冲突队列。


审计结论为 **BLOCKED（6 Critical / 7 Warning / 3 Info）**。这里的 BLOCKED 只阻断直接开始 vNext 实现和 Cycle acceptance，不阻断后续研究与方案讨论。

## Milestone 进度

| # | Milestone | 状态 | 摘要 |
|---|---|---|---|
| 12日 08:06 | Worker | 完成四组 semantic enum revisions | 54 included / 0 excluded；facts unchanged |
| 12日 08:01 | Worker | 重开四组 semantic enum revisions | six source classes / material risk / verified-source reviewed |
| 12日 07:58 | Step | 启动 M5 curation / review | 真实 proposals；Record authority 仍冻结 |
| 12日 07:58 | Validation | M5 full GREEN | 940/940；M1-M4/log/static 全绿 |
| 12日 07:56 | Validation | M5 focused GREEN | 36/36；进入 full regression |
| 12日 07:55 | Step | 启动 M5 focused GREEN Attempt 4 | activation-result Revision 3 已关闭 |
| 12日 07:55 | Worker | 完成 M5 implement Revision 3 | deterministic Record reference view |
| 12日 07:53 | Worker | 启动 M5 implement Revision 3 | activation result Record mapping only |
| 12日 07:53 | Step | M5 focused GREEN Attempt 3 | 35/36；单一 public-envelope gap |
| 12日 07:50 | Step | 启动 M5 focused GREEN Attempt 3 | proposal topology Revision 2 已关闭 |
| 12日 07:50 | Worker | 完成 M5 implement Revision 2 | production suite green |
| 12日 07:44 | Worker | 完成 M5 extraction coverage | PROPOSAL_ONLY；57/57 digest；Curator queue ready |
| 12日 07:41 | Worker | 启动 M5 implement Revision 2 | five proposal-topology clusters |
| 12日 07:41 | Step | M5 focused GREEN Attempt 2 RED | 7 pass / 29 fail；进入 proposal topology |
| 12日 07:38 | Step | 启动 M5 focused GREEN Attempt 2 | source-envelope Revision 1 已关闭 |
| 12日 07:38 | Worker | 完成 M5 implement Revision 1 | canonical source/provenance binding |
| 12日 07:35 | Worker | 启动 M5 extraction coverage | 66 candidates / 115 source refs；proposal-only |
| 12日 07:33 | Worker | 启动 M5 implement Revision 1 | strict source envelope compatibility |
| 12日 07:33 | Step | M5 focused GREEN Attempt 1 RED | 7 pass / 29 fail；单一入口 cluster |
| 12日 07:32 | Worker | 完成 C1-C4 Source Contract revision | 六组 66 proposals 全部可由 Auditor 真实读取来源 |
| 12日 07:31 | Worker | 完成 current C21 Source Contract revision | 16 candidates / 30 source pairs / 18 source inventory |
| 12日 07:30 | Step | 启动 M5 focused GREEN Attempt 1 | independent test contract vs production implementation |
| 12日 07:30 | Worker | 完成 M5 implement worker | 9 APIs；production smokes + static scans pass |
| 12日 07:26 | Worker | 重开六组 Source Contract revisions | 修正 locator=file path / ref=fine-grained provenance |
| 12日 07:20 | Worker | 完成 C9-C20 Extractor Revision 1 | 38 proposals；exact envelope + strict Record schema |
| 12日 07:15 | Worker | 重开三组 Extractor Revision 1 | C9-C20 candidate envelope exact-key normalization |
| 12日 07:13 | Worker | 完成 C5-C20 四组 Extractor | 44 proposals；M2 schema/source/privacy scans pass |
| 12日 07:05 | Worker | 完成 M5 test Revision 1 | 路线修正；focused/full RED 计数不变 |
| 12日 07:05 | Worker | 完成 C1-C4 Extractor | 6 candidates / 8 exclusions；proposal-only |
| 12日 07:05 | Worker | 扩展 M5 bounded extraction | 启动 C9-C12、C13-C16、C17-C20、current C21 |
| 12日 07:05 | Worker | 重开 C5-C8 Extractor Revision 1 | 对齐 M2 Record Patch schema |
| 12日 07:01 | Worker | 重开 M5 test Revision 1 | 修正 M6 Goal/Cycle/adaptive Plan fixture route |
| 12日 07:01 | Worker | 恢复记录 M5 Extractors | C1-C4、C5-C8；read-only proposals only |
| 12日 06:56 | Worker | 启动 M5 implement worker | /root/m5_implement；production-only；tests forbidden |
| 12日 06:56 | Step | 确认 M5 RED | 24 total / 3 pass / 3 fail / 18 skip |
| 12日 06:55 | Validation | 启动 M5 RED 确认 | 目标 24 total / 3 API gate fail |
| 12日 06:55 | Worker | 完成 M5 test worker | RED_READY；3 pass / 3 fail / 18 skip |
| 12日 06:36 | Worker | 启动 M5 test worker | /root/m5_test；bootstrap/activation/single-writer/fresh-process |
| 12日 06:36 | Milestone | 启动 C21-M5 | internal reference Bootstrap Job / schema activation |
| 12日 06:36 | Plan Review | M4 downstream review | M5-M8 无需 prompt patch |
| 12日 06:32 | Milestone | 完成 C21-M4 | final audit PASS；44/44；904/904 |
| 12日 06:29 | Audit | M4 fresh final re-audit PASS | 0 finding；初审 3 项全部关闭 |
| 12日 06:21 | Audit | 启动 M4 fresh final re-audit | /root/m4_reaudit；strict read-only |
| 12日 06:21 | Validation | M4 final audit-driven GREEN | 44/44；904/904；M1 76；M2 61；M3 47；log 7 |
| C21-M1 | Workspace format / transaction / writer fence | ✅ 完成 | final audit PASS；76/76 focused；752/752 full |
| C21-M2 | Runtime / Records / Receipts / Snapshots | ✅ 完成 | re-audit PASS；61/61 focused；813/813 full |
| C21-M3 | Recovery Journal / Capsule / Pack | ✅ 完成 | final audit PASS；47/47；860/860 |
| C21-M4 | Init / adoption / Skill router | ✅ 完成 | final audit PASS；44/44；904/904 |
| C21-M5 | Reference bootstrap / activation | 🔄 实现中 | 9 internal Bootstrap APIs |
| C21-M6 | Goal / Cycle / adaptive Plan | ⏳ 待执行 | — |
| C21-M7 | Maintain / Codex Hooks | ⏳ 待执行 | — |
| C21-M8 | Cleanup / deletion gate / regression | ⏳ 待执行 | — |

## 已确认设计

- **Workflow Stash / Suspend / Reconciliation**：采用半显示的 `/hw:stash` 命令族；`push` 只冻结 Workflow 边界而不保存或恢复代码，`pop` 面向新基线执行前向合并；默认只自动解决低歧义冲突，严格模式下每个契约冲突都必须先获得用户确认。详细设计见 [C21 Stash 设计决策](./reports/C21-stash-suspend-reconciliation-design.md)。
- **vNext 统一总体架构**：采用 Main Delivery 与 Foreground Activity 双引用；Goal/Cycle 是平级交付，Maintain 环境化，Explore 隔离化，Migration 独占化；Records、Runtime、Receipts、Snapshots 和平台投影各有唯一权威。详细设计见 [C21 统一架构决策](./reports/C21-unified-architecture-design.md)。
- **C21 核心改写与自举切换**：当前版本重写核心架构、核心流程、Maintain/Records 和 Codex 适配；先建立最小标准与 writer，再由 Terra 批量提炼必要历史，将本仓库切换成首个示范工作区；外围平台、高级命令和自动迁移留给后续 Cycle。详细设计见 [C21 核心范围与 Bootstrap 决策](./reports/C21-core-cutover-bootstrap-scope.md)。
- **Recovery Journal 与上下文恢复**：当前版本实现详细本地事件流、强结构 Effect Receipts、增量 Context Capsule 和 Recovery Pack；接入 Codex PreCompact/PostCompact/SessionStart，在原生压缩失败时从最近有效 Pack 和 Journal 增量恢复。详细设计见 [C21 Recovery Journal 决策](./reports/C21-recovery-journal-compaction-design.md)。

## 研究结果

| 方向 | 状态 | 定性结论 |
|---|---|---|
| 全局设计与约束层级 | ✅ 完成 | 权威、投影和约束很多，但缺少按 capability/risk 编译的最小政策层。 |
| Plugins / Skills / Hooks / 平台适配 | ✅ 完成 | 平台能力假设已过时；Claude/OpenCode 部分 Hook 效果不可信，Cursor 产物陈旧。 |
| RULES、命令与功能有效性 | ✅ 完成 | RULES 主要完成 authority/projection，未形成通用门禁；缺少调用与效果遥测。 |
| Maintain / Stash 核心模型 | ✅ 完成 | 真实 store 与 scheduler 存在正确性问题；应先恢复权威闭环，再讨论 Run/Checkpoint 模型。 |

## 报告

- [简版定性报告](./audits/audit-002-summary.md)：下一轮讨论入口。
- [详细原始报告](./audits/audit-002.md)：完整证据、平台矩阵、findings、Action Queue 和开放问题。

## 下一轮建议

1. 先定义哪些 Rule、Hook、确认和状态必须是真正的 deterministic invariant。
2. 再讨论 authority -> policy compiler -> platform projection -> effect receipt 的总体架构。
3. 然后讨论三层约束模型、Maintain 分域和 Checkpoint/Suspend。
4. 最后基于 telemetry 决定命令精简与 Kimi/ZCode 等平台扩张。

## 时间线

| 时间 | 类型 | 事件 | 结果 |
|---|---|---|---|
| 12日 06:14 | Validation | 启动 M4 final audit-driven validation | 44 + full + baselines |
| 12日 06:14 | Worker | 完成 M4 test Revision 3 | worker focused 44/44 |
| 12日 06:11 | Worker | 启动 M4 test Revision 3 | align bounded-scan fixtures |
| 12日 06:11 | Validation | M4 audit GREEN Attempt 1 | 41/44 |
| 12日 06:09 | Validation | 启动 M4 audit-driven GREEN | 目标 44/44 |
| 12日 06:09 | Worker | 完成 M4 implement Revision 4 | metadata/path trust smoke PASS |
| 12日 05:56 | Worker | 启动 M4 implement Revision 4 | metadata/path trust fixes |
| 12日 05:56 | Step | 确认 M4 audit RED | 33 pass / 11 fail；44 total |
| 12日 05:55 | Validation | 启动 M4 audit RED 确认 | 44 total；4 clusters |
| 12日 05:55 | Worker | 完成 M4 test Revision 2 | AUDIT_RED_READY |
| 12日 05:48 | Worker | 启动 M4 test Revision 2 | 3 个 audit-driven RED clusters |
| 12日 05:48 | Audit | M4 NEEDS_CHANGES | 1 Critical / 2 Warning |
| 12日 05:35 | Audit | 启动 M4 independent audit | /root/m4_audit；strict read-only |
| 12日 05:35 | Validation | M4 final GREEN | 25/25；885/885；M1 76；M2 61；M3 47；log 7 |
| 12日 05:32 | Validation | 启动 M4 final validation | focused/full/M1-M3/log/static |
| 12日 05:32 | Worker | 完成 M4 implement Revision 3 | one Guide phrase |
| 12日 05:31 | Worker | 启动 M4 implement Revision 3 | one Guide compatibility phrase |
| 12日 05:31 | Validation | M4 full Attempt 2 RED | 884/885 |
| 12日 05:28 | Validation | 启动 M4 Revision 2 验证 | focused + full |
| 12日 05:28 | Worker | 完成 M4 implement Revision 2 | canonical/legacy projection split |
| 12日 05:24 | Worker | 启动 M4 implement Revision 2 | legacy projection + compact Skill compatibility |
| 12日 05:24 | Validation | M4 full Attempt 1 RED | 871/885；focused 25/25 |
| 12日 05:21 | Validation | M4 focused GREEN | 25/25；进入 full validation |
| 12日 05:21 | Validation | 启动 M4 Revision 1 focused | 目标 25/25 |
| 12日 05:21 | Worker | 完成 M4 implement Revision 1 | 5 个 production fixes |
| 12日 05:21 | Worker | 完成 M4 test Revision 1 | M2 schema 对齐；interim 20/25 |
| 12日 05:17 | Worker | 启动 M4 implement Revision 1 | 5 个窄 production fixes |
| 12日 05:17 | Worker | 启动 M4 test Revision 1 | 对齐 M2 Record taxonomy |
| 12日 05:17 | Validation | M4 focused Attempt 1 RED | 18/25 |
| 12日 05:15 | Validation | 启动 M4 focused | 目标 25/25 |
| 12日 05:15 | Worker | 完成 M4 implement worker | production smokes PASS |
| 12日 04:53 | Worker | 启动 M4 implement worker | /root/m4_implement；production-only |
| 12日 04:53 | Step | 确认 M4 RED | 7 fail / 18 skip；25 total |
| 12日 04:50 | Validation | 启动 M4 RED 确认 | 目标 7 个 production-boundary fail |
| 12日 04:50 | Worker | 完成 M4 test worker | RED_READY；25 total |
| 12日 04:35 | Worker | 启动 M4 test worker | /root/m4_test；behavior-first RED |
| 12日 04:34 | Milestone | 启动 C21-M4 | Init / adoption / minimal Skill router |
| 12日 04:34 | Plan Review | M3 downstream review | M4-M8 无需 prompt patch |
| 12日 04:34 | Milestone | 完成 C21-M3 | final audit PASS；47/47；860/860 |
| 12日 04:24 | Audit | 启动 M3 fresh final audit | /root/m3_final_audit；strict read-only |
| 12日 04:24 | Validation | M3 Revision 5 final GREEN | 47/47；860/860；M1 76；M2 61；log 7 |
| 12日 04:20 | Validation | M3 Revision 5 focused GREEN | 47/47；进入 full validation |
| 12日 04:20 | Validation | 启动 M3 Revision 5 focused | 目标 47/47 |
| 12日 04:20 | Worker | 完成 M3 implement Revision 5 | 3 个 cursor production smoke PASS |
| 12日 04:16 | Worker | 启动 M3 implement Revision 5 | selective cursor-segment replay |
| 12日 04:16 | Validation | M3 focused Attempt 4 RED | 39/47；same-segment delta 回归 |
| 12日 04:15 | Validation | 启动 M3 Revision 4 focused | 目标 47/47 |
| 12日 04:15 | Worker | 完成 M3 implement Revision 4 | 2 个 production smoke PASS |
| 12日 04:12 | Worker | 启动 M3 implement Revision 4 | true incremental Capsule + routing metadata gate |
| 12日 04:12 | Validation | M3 focused Attempt 3 RED | 41/47；仅剩 2 个 cluster |
| 12日 04:12 | Worker | 完成 M3 implement Revision 3 | 4/6 audit clusters closed |
| 12日 03:58 | Worker | 启动 M3 implement Revision 3 | 6 个 audit-driven fixes |
| 12日 03:58 | Step | 确认 M3 audit RED | 31 pass / 16 fail；原 29 green |
| 12日 03:58 | Worker | 完成 M3 test Revision 1 | RED_READY；M1 76；M2 61 |
| 12日 03:46 | Worker | 启动 M3 test Revision 1 | 6 个 audit-driven RED |
| 12日 03:46 | Audit | M3 NEEDS_CHANGES | 3 Critical / 3 Warning |
| 12日 03:37 | Worker | 启动 M3 independent audit | /root/m3_audit；strict read-only |
| 12日 03:37 | Validation | M3 final GREEN | 29/29；842/842；M1 76；M2 61 |
| 12日 03:37 | Worker | 完成 M3 implement Revision 2 | corrupt Pack code；smoke pass |
| 12日 03:34 | Worker | 启动 M3 implement Revision 2 | malformed Pack classification |
| 12日 03:34 | Step | M3 focused Attempt 2 RED | 28/29 |
| 12日 03:34 | Worker | 完成 M3 implement Revision 1 | 8 envelope smokes pass |
| 12日 03:26 | Worker | 启动 M3 implement Revision 1 | 8 个 public envelope gaps |
| 12日 03:26 | Step | M3 focused Attempt 1 RED | 21/29 |
| 12日 03:26 | Worker | 完成 M3 initial implement | production smokes + 14 exports |
| 12日 03:04 | Worker | 启动 M3 implement worker | /root/m3_implement；production-only |
| 12日 03:04 | Step | 确认 M3 RED | 4 API boundary fail / 20 behavior skip |
| 12日 03:04 | Worker | 完成 M3 test worker | RED_READY；M1 76/76；M2 61/61 |
| 12日 02:45 | Worker | 启动 M3 test worker | /root/m3_test；filesystem/property/fault RED |
| 12日 02:45 | Milestone | 启动 C21-M3 | Recovery Journal / Capsule / Pack |
| 12日 02:45 | Milestone | 完成 C21-M2 | re-audit PASS；61/61；813/813 |
| 12日 02:45 | Audit | M2 fresh re-audit PASS | 0 finding；targeted 21/21 |
| 12日 02:32 | Worker | 启动 M2 fresh re-audit | /root/m2_reaudit；strict read-only |
| 12日 02:32 | Validation | M2 Revision 5 full GREEN | 61/61；813/813；log 7/7；M1 76/76 |
| 12日 02:32 | Worker | 完成 M2 implement Revision 5 | terminal Clock + hidden scope；smoke pass |
| 12日 02:25 | Worker | 启动 M2 implement Revision 5 | 2 个 Receipt envelope 缺口 |
| 12日 02:25 | Step | M2 focused Attempt 5 RED | 59/61；终态 Clock + hidden scope |
| 12日 02:25 | Worker | 完成 M2 implement Revision 4 | 6 groups；20 exports；production smoke pass |
| 12日 02:13 | Worker | 启动 M2 implement Revision 4 | /root/m2_implement；production-only |
| 12日 02:13 | Step | 确认 M2 Revision 3 RED | 34 pass / 11 fail / 9 skip；M1 76/76 |
| 12日 02:13 | Worker | 完成 M2 test Revision 3 | RED_READY；真实文件系统审计契约 |
| 12日 01:57 | Worker | 启动 M2 test Revision 3 | /root/m2_test；audit-driven RED；production forbidden |
| 12日 01:57 | Audit | M2 NEEDS_CHANGES | 4 Critical / 3 Warning；回退 TDD |
| 12日 01:42 | Worker | 启动 M2 independent audit | /root/m2_audit；strict read-only |
| 12日 01:41 | Worker | 请求 M2 independent audit | fresh strict read-only identity |
| 12日 01:41 | Validation | 完成 M2 full validation | focused 49/49；full 801/801；all static checks pass |
| 12日 01:39 | Validation | 修复 lifecycle log schema | 首轮 full 800/801；产品检查均通过 |
| 12日 01:37 | Validation | M2 focused GREEN Attempt 4 | 49/49；进入 full validation |
| 12日 01:36 | Step | 启动 M2 focused GREEN Attempt 4 | implement R3 + test R2 已关闭 |
| 12日 01:36 | Worker | 完成 M2 implement R3 / test R2 | production smoke；Snapshot 9/9；M1 76/76 |
| 12日 01:31 | Worker | 启动 M2 implement R3 + test R2 | production/test 严格分离 |
| 12日 01:29 | Step | M2 focused GREEN Attempt 3 RED | 31 pass / 18 fail |
| 12日 01:29 | Worker | 请求 M2 implement R3 + test R2 | 4 production edges + readRecord fixture |
| 12日 01:28 | Step | 启动 M2 focused GREEN Attempt 3 | implement Revision 2 已关闭 |
| 12日 01:28 | Worker | 完成 M2 implement Revision 2 | Receipt + Record index + Snapshot object |
| 12日 01:22 | Worker | 启动 M2 implement Revision 2 | production-only；tests forbidden |
| 12日 01:21 | Step | M2 focused GREEN Attempt 2 RED | 26 pass / 23 fail；3 production clusters |
| 12日 01:21 | Worker | 请求 M2 implement Revision 2 | Receipt + Record index + Snapshot object |
| 12日 01:20 | Step | 启动 M2 focused GREEN Attempt 2 | Revision 1 双角色均已关闭 |
| 12日 01:20 | Worker | 完成 M2 implement Revision 1 | 4 contract clusters；production smoke pass |
| 12日 01:17 | Worker | 完成 M2 test Revision 1 | M1 19/19；shared M2 interim 25 pass / 24 fail |
| 12日 01:14 | Worker | 启动 M2 Revision 1 双角色 | implement production-only；test test-only |
| 12日 01:12 | Step | M2 focused GREEN Attempt 1 RED | 18 pass / 31 fail；4 production clusters + 1 test overreach |
| 12日 01:12 | Worker | 请求 M2 Revision 1 | implement 修生产；test 仅修 M1 回滚空目录断言 |
| 12日 01:09 | Step | 启动 M2 focused GREEN | 独立 test/implement 契约首次对撞 |
| 12日 01:09 | Worker | 完成 M2 implement worker | IMPLEMENTED；4 stores + 19 exports；production smoke pass |
| 12日 00:47 | Worker | 启动 M2 implement worker | /root/m2_implement；4 stores + explicit exports；tests forbidden |
| 12日 00:45 | Worker | 请求 M2 implement worker | 4 new stores + root exports；tests forbidden |
| 12日 00:45 | Step | 确认 M2 RED | 37 tests：0 pass / 5 fail / 32 skip；M1 76/76 |
| 12日 00:44 | Worker | 完成 M2 test worker | RED_READY；37 tests：0 pass / 5 fail / 32 skip；M1 76/76 |
| 12日 00:26 | Worker | 启动 M2 test worker | /root/m2_test；5 test files + optional isolated fixtures |
| 12日 00:24 | Milestone | 启动 C21-M2 | Runtime / Records / Receipts / Snapshots；请求 test worker |
| 12日 00:24 | Milestone | 完成 C21-M1 | final audit PASS；focused 76/76；full 752/752 |
| 12日 00:14 | Worker | 启动 M1 final audit | /root/m1_final_audit；third fresh identity；strict read-only |
| 12日 00:13 | Worker | 请求 M1 最终独立复审 | third fresh audit identity；strict read-only |
| 12日 00:13 | Step | 完成 M1 Revision 4 GREEN | focused 76/76；full 752/752；diff/syntax/config pass |
| 12日 00:12 | Worker | 完成 M1 implement Revision 4 | prefix-free preflight；production smoke pass |
| 12日 00:08 | Worker | 启动 M1 implement Revision 4 | prefix-free preflight；tests forbidden |
| 12日 00:07 | Worker | 请求 M1 implement Revision 4 | transaction.js + implementation evidence only |
| 12日 00:07 | Step | 确认 M1 Revision 3 RED | 76 total / 73 pass / 3 fail |
| 12日 00:06 | Worker | 完成 M1 test Revision 3 | RED_READY；76 total / 73 pass / 3 fail；prior 73 green |
| 12日 00:03 | Worker | 启动 M1 test Revision 3 | narrow scope；workspace-transaction test + evidence only |
| 12日 00:02 | Worker | 重开 M1 test Revision 3 | 双顺序 prefix-collision RED；非法 write set 必须 staging 前零写拒绝 |
| 12日 00:02 | Audit | M1 re-audit NEEDS_CHANGES | 原七项关闭；新 1 Critical prefix-collision blocker |
| 11日 23:51 | Worker | 启动 M1 re-audit | /root/m1_reaudit；fresh identity；strict read-only |
| 11日 23:50 | Worker | 请求 M1 独立复审 | 新 audit identity；不复用首次 auditor |
| 11日 23:50 | Step | 完成 M1 Revision 3 GREEN | focused 73/73；full 749/749；diff/syntax/config pass |
| 11日 23:48 | Worker | 完成 M1 implement Revision 3 | 10 production files；transaction + 22 writer families；production smoke pass |
| 11日 23:36 | Worker | 启动 M1 implement Revision 3 | production-only；测试源与断言不可见 |
| 11日 23:35 | Worker | 请求 M1 implement Revision 3 | production-only；transaction invariant + 8 writer families |
| 11日 23:35 | Step | 确认 M1 Revision 2 RED | 73 tests：54 pass / 19 fail |
| 11日 23:34 | Worker | 完成 M1 test Revision 2 | RED_READY；73 tests：54 pass / 19 fail；22 writer families |
| 11日 23:23 | Worker | 启动 M1 test Revision 2 | 编写 audit-confirmed adversarial RED；只改测试与 test evidence |
| 11日 23:22 | Worker | 重开 M1 test Revision 2 | 审计驱动 RED：transaction integrity + public writer bypass |
| 11日 23:22 | Audit | M1 NEEDS_CHANGES | 4 blockers；diff_score 4 > threshold 3；回退 TDD |
| 11日 23:09 | Worker | 启动 M1 audit worker | /root/m1_audit；严格只读、独立身份 |
| 11日 23:08 | Worker | 请求 M1 独立审计 | 只读检查 transaction、14 writer、CLI/notify、worker separation 与 dirty worktree |
| 11日 23:08 | Step | 完成 M1 run_tests_green | focused 52/52；full 728/728；diff/syntax pass |
| 11日 23:06 | Worker | 完成 M1 implement Revision 2 | 两个生产兼容回归已修复；进入 focused/full GREEN 验证 |
| 11日 23:04 | Worker | 请求 M1 implement Revision 2 | focused 52/52；full 725/728；修复 init 缺失目录与 requested lifecycle status 兼容回归 |
| 11日 22:34 | Worker | 完成 M1 test，申请 implement | RED_READY；11 pass / 3 expected fail；生产实现与测试身份分离 |
| 11日 22:18 | Worker | 请求 M1 test worker | strict separation；只允许修改 3 个 M1 测试文件和测试证据 |
| 11日 22:15 | Plan | 完成 C21 Generate | 8 份 prompts、架构、配置和 protected state/cycle 已生成；等待执行确认 |
| 11日 22:05 | Plan | 提出 C21 Decompose 技术路线 | 8 个串行 Milestone 覆盖事务底座、Records/Receipts、Recovery、Init、自举、Delivery、Maintain/Codex 和删除门禁清理；等待确认 |
| 11日 20:49 | Design | 确认 Recovery Journal 与压缩恢复 | 详细事件、Receipts、增量 Capsule、Recovery Pack、压缩失败重放和隐私边界已定稿 |
| 11日 20:39 | Design | 确认 C21 核心范围与自举切换 | 核心大改、本仓库示范迁移、Terra Record Patch 拓扑、单写兼容策略和 Deletion Manifest 清理已定稿 |
| 11日 20:24 | Design | 确认 vNext 统一总体架构 | Main Delivery / Foreground Activity、唯一权威、Receipt 驱动状态转换和五类端到端场景已定稿 |
| 11日 20:09 | Design | 确认 Workflow Stash / Suspend / Reconciliation | `/hw:stash` 作为半显示命令；状态暂存、阻塞交付、前向合并和 adaptive/strict 冲突策略已定稿 |
| 21:24 | Audit | 完成 C21 前置全局设计扫描 | 6 Critical / 7 Warning / 3 Info；生成详细与简版报告 |
| 20:58 | Cycle | 扩展 C21 为 vNext 全局设计研究 | 旧 Stash / Maintain 草案仅作为背景；启动前置审计 |
| 06日 21:52 | Cycle | 创建 C21 | 完成原始 Stash / Maintain 第一轮方向讨论 |
