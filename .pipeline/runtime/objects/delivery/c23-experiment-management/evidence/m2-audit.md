# C23 Revision 1 M2 Independent Audit

- `worker_id`: `c23-m2-audit-luna`
- `role`: `audit`
- Milestone: `M2` / Project knowledge, metrics, and concept-to-code mapping
- Audit date: 2026-07-18 (Asia/Shanghai)
- Verdict: `RED`
- Workflow Runtime/Continuation advancement: none

## Task Assessment

- Complexity: `material`
- Uncertainty: `medium`
- Oracle strength: `mixed`
- Blast radius: `authority`
- Reversibility: `reversible`
- Hazards: `authority_conflict`, `stale_knowledge`, `policy_bypass`, `private_path_binding`
- Semantic routing class: `critical`
- Reason codes: `git_merged_authority`, `record_integrity`, `independent_audit`

M2 的正常路径有强 fixture oracle，但历史重放和手工 Git 合并后的 authority 图属于弱 oracle。用户会依赖该知识库直接定位指标与代码，因此静默隐藏事实或错误标记 active 会改变后续实验判断，必须按 authority 级风险审计。

## Findings By Severity

### P1: Git 合入的跨 fact-key supersedes Record 会被读取端接受，并静默隐藏无关事实

`list` 先把当前项目目录内所有候选 Record 的 `supersedes` 合并为一个集合，再据此判断 active（`core/src/experiment/knowledge.js:116-130`）。读取端随后只核对 Record metadata 与其自身 fact 一致（`:292-313`），没有验证 supersedes target 存在、属于相同 dedupe key、位于同一条事实历史、或图无环。

独立临时工作区复现：

1. 通过 Knowledge Store 写入合法 `metric.psnr`。
2. 模拟 Git 手工合入一个 semantic hash、ID、路径和 body 均合法的 `metric.cross-key` Record。
3. 让后者的 `supersedes` 指向 `metric.psnr` 的 Record ID，但保留不同 dedupe key。
4. `list({project_id})` 没有 fail closed，而是只返回 `metric.cross-key`；历史视图把 `metric.psnr` 标记为 `active:false`。

通用 Record index 的 `validateSupersedesGraph` 会拒绝该图（`core/src/records/index.js:183-191`），但 M2 reader 绕过了这项验证。由于 Record 是 Git 友好的可合并 authority，读取端不能假设所有文件都只由当前进程写入。这会让一次冲突合并静默删除另一个概念的可见 authority，阻断 M2 验收。

修复验收条件：Knowledge reader 必须在计算 active 之前验证完整候选图；每条 edge 的 target 必须存在且具有相同 project scope 与 dedupe key，图必须无环，每个 dedupe key 必须恰有一个 active leaf。无效 Git 合并必须显式报 integrity/conflict，不得返回部分结果。

### P1: 已 superseded 的旧事实 exact replay 返回 `active:true`，与持久 authority 自相矛盾

`recordFact` 对 `commitRecordPatch` 的 deduplicated 结果不读取真实 active 状态，固定返回 `projectFact(..., true, ...)`（`core/src/experiment/knowledge.js:68-94`）。通用 Record writer 在发现相同 semantic ID 时会提前返回 deduplicated（`core/src/records/index.js:58-68`），因此不会重新检查该 Record 是否已经被后续事实 supersede。

独立临时工作区复现：

1. 写入原始 `metric.psnr`。
2. 通过显式 edge 写入 replacement，并 supersede 原始 Record。
3. 再次用完全相同的原始 fact 调用 `recordFact`。
4. 返回对象声称原始 Record `active:true`；同一时刻 `list(include_superseded:true)` 对同一 ID 返回 `active:false`，active-only list 只包含 replacement。

这会误导调用 AI 以为旧知识已恢复，违反显式历史变更和单一 authority 语义，阻断 M2 验收。

修复验收条件：deduplicated replay 必须从 Record authority 派生真实状态。若目标 Record 已 inactive，应明确拒绝并要求用新 Record 显式 supersede 当前 active leaf，或至少返回 `active:false`；绝不能报告与 `list` 不一致的状态。

### P1: 结构化 Knowledge details 可绕过既有 forbidden-reasoning Record policy

`normalizeFact` 检查 raw secrets，但未调用 `containsForbiddenReasoning`（`core/src/experiment/knowledge.js:167-207`）。之后 `renderFactBody` 先把 fact 序列化为 JSON 字符串（`:335-340`），底层 Record Patch 因此只能看到 body 字符串，无法递归检查原始 details key。

独立复现中，带有 `details.hidden_reasoning: "must not persist"` 的 fact 成功写成 durable Record。通用 Record contract 的对应测试明确要求 hidden reasoning 和 unrestricted rationale 字段拒绝；M2 wrapper 不应成为该 policy 的旁路。

修复验收条件：在序列化之前对结构化 fact 调用统一 forbidden-reasoning validator，并增加 zero-write 回归，覆盖 `chain_of_thought`、`hidden_reasoning` 和 `rationale_dump` 的嵌套形式。

### P2: code_ref 可绑定 `.pipeline` authority，而非项目代码

`normalizeKnowledgePath` 只拒绝 `.git` 与 `.pipeline/runtime/`（`core/src/experiment/knowledge.js:432-442`）。独立复现使用正确摘要成功把 `.pipeline/manifest.yaml` 登记成 `code_ref`。同理，legacy state、Record memory 和其他 `.pipeline` 文件不在当前 deny 条件内。

该行为不直接写入或泄露 authority 内容，但会把 Workflow authority 变化误报成“代码知识 stale”，并破坏 concept-to-code 的边界。M2 code refs 应定位项目源码，不应引用 Workflow 私有或 legacy authority。

修复验收条件：code refs 至少整体拒绝 `.pipeline` 与 `.git` 根；新增 manifest、legacy state 和 memory Record 的 zero-write 边界测试。

## Validated Behavior

除上述 findings 外，M2 的主要正向能力已被独立确认：

- 每个 principle、metric、module、optimization fact 各自落为一个项目级 Markdown Record。
- NeRF fixture 能从“RE 加速 / 采样加速”定位到名称不含 sample 的 occupancy-guided ray marching 代码与 locator。
- PSNR 返回 meaning、direction、unit、comparability notes、source version 和 project version。
- AceSim fixture 能解释 IPC、host trace memory，并定位 temperature/frequency/L1/L2 配置模块。
- freshness 只读取已登记路径；修改或删除登记代码分别产生 `digest_mismatch` / `missing`，无关结果文件不会进入知识索引。
- 正常 API 写入要求显式 supersedes，保留历史 Record；多项目查询保持隔离。
- traversal、absolute path、malformed/mismatched digest、symlink、空 locator、缺失 source version 与 raw secret 在现有测试中 zero-write 拒绝。
- legacy sentinel 文件保持不变；M2 reader 不依赖派生 Record index。

## Exact Validation

独立执行结果：

- `node core/test/c23-m2-experiment-knowledge.test.js`: `11/11` PASS。
- `node core/test/record-store.test.js`: `13/13` PASS。
- `node core/test/workspace-transaction.test.js`: `19/19` PASS。
- C23 M1 focused suites: `6/6 + 10/10 + 5/5 = 21/21` PASS。
- `secret-ref-projection.test.js`: `2/2` PASS。
- `authority-nonduplication.test.js`: `2/2` PASS。
- maintained catalog dry-run: valid; `54` selected; C23 M2 path selected。
- `node --check` for Knowledge production/export/test modules: PASS。
- `git diff --check`: PASS。
- 当前 `.pipeline/runtime/transactions/` 无残留。

Adversarial temporary-workspace probes:

- superseded exact replay: reproduced inconsistent `active:true` return versus authoritative `active:false` history。
- cross-key supersedes Git Record: reproduced silent hiding of `metric.psnr` instead of fail-closed conflict。
- nested `details.hidden_reasoning`: reproduced successful durable Record write。
- `.pipeline/manifest.yaml` code binding: reproduced successful durable Record write。

所有 probe 仅使用临时目录并在结束时删除，没有修改仓库文件。

## Conclusion

M2 当前为 `RED`。正常 fixture、语义定位、指标解释、source/version binding、registered-path freshness、project isolation、secret/path 基础拒绝和 M1 regression 均通过；但读取端未验证 Git-merged supersedes graph、exact historical replay 错报 active、Knowledge wrapper 绕过 Record forbidden-reasoning policy，属于 authority 级阻断问题。修复并补充维护测试后需要 fresh independent retest 与 reaudit，M2 不能用当前证据推进为 verified。

## Expected Result

AI 应能在不扫描仓库的前提下读取紧凑、项目隔离、版本绑定的知识事实；任何 Git 合并冲突或非法历史 edge 都必须显式失败，不能隐藏无关事实。写入 API 对同一 Record 的 active 状态必须与读取 authority 一致。Knowledge wrapper 必须继承 Record 的 secret、reasoning、path 和 integrity policy，且 code refs 只能绑定项目源码。

## Modified File

- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m2-audit.md` only.

本 audit 未修改 production、tests、fixtures、catalog、manifest、Runtime、Continuation、Receipt、legacy authority、Hook、version、plugin metadata 或 cachebuster，也未推进 Workflow lifecycle。

## Problems Encountered

工作区包含大量 C21/C23 既有未提交文件，无法用仓库基线单独归因全部变更；审计通过明确的 M2 文件集、worker evidence、Runtime revision/hash 和临时工作区复现隔离判断。未遇到命令或环境阻断。

## Residual Risks / Follow-up

- `recordFact` 的 Record commit 与 derived index rebuild 是两个可恢复事务；中断可能让全局派生 index 暂时落后，但 M2 reader 直接读 Record authority，因此本项不是当前 RED 的原因。后续状态物化应提供明确 rebuild/recovery 路径。
- 外部 paper/document version 是调用方提供的 provenance，M2 不验证远端内容真实性；AI 仍需在结论中区分已核验与仅登记来源。
- 当前 resolve 是确定性候选召回，不是科学真值 oracle；可疑映射与冲突仍应征求用户确认。
- whole-file SHA-256 会因文件内无关改动标 stale；真实 pilot 若噪声过大，可后续增加 symbol/range 级摘要，但不能削弱现有 fail-closed 文件完整性。
