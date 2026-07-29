# C23 Revision 1 M2 Fresh Independent Reaudit

- `worker_id`: `c23-m2-reaudit-luna`
- `role`: `audit`
- Milestone: `M2` / Project knowledge, metrics, and concept-to-code mapping
- Reaudit date: 2026-07-18 (Asia/Shanghai)
- Verdict: `PASS`
- Workflow Runtime/Continuation advancement: none

## Task Assessment

- Complexity: `material`
- Uncertainty: `medium`
- Oracle strength: `mixed`
- Blast radius: `authority`
- Reversibility: `reversible`
- Hazards: `authority_conflict`, `stale_knowledge`, `policy_bypass`, `private_path_binding`
- Semantic routing class: `critical`
- Reason codes: `git_merged_authority`, `record_integrity`, `independent_reaudit`

M2 的正常语义与 freshness 路径有强 fixture oracle；Git 合入、历史 supersession 和 active-only 读取完整性属于弱 oracle，因此仍按 authority 级风险复审。旧 `m2-audit.md` 的 RED 结论作为修复历史保留，本报告只判断全部 remediation 后的当前实现。

## Findings By Severity

### P0/P1: none

旧审计的四项 finding 与 fresh reaudit 发现的 inactive-history 完整性缺口均已关闭：

1. superseded 旧事实 exact replay 不再固定投影 `active:true`；`recordFact` 回读持久项目 authority，并对旧 Record 返回 `active:false`。
2. `list`、`resolve`、`assessFreshness` 在投影前验证 missing target、cross-dedupe edge、cycle/integrity corruption 和 multiple active leaves，任何歧义都 fail closed。
3. 结构化 fact 在 JSON body 序列化前拒绝嵌套 `chain_of_thought`、`hidden_reasoning` 和 `rationale_dump`，错误不回显私有值且 rejection zero-write。
4. local `code_ref` 整体拒绝 `.pipeline` 与 `.git` 根及所有子路径，不再把 Workflow authority 或 Git metadata 当作项目代码。
5. active-only 读取会先解析并验证全部候选 Record，包括 inactive 历史；body 的 project/fact key、confidence、supersedes 与 exact provenance 必须和 Record metadata 一致，然后才计算 graph 和过滤 active projection。

### P2: no blocking finding

没有发现新的 M2 阻断问题。Record commit 与 derived index rebuild 的两事务窗口、remote provenance 不做在线验证、whole-file digest 粒度和 deterministic token retrieval 的语义范围仍是已知非阻断风险，见后文。

## Independent Adversarial Validation

Fresh reaudit 使用自建临时 current-format workspace 和独立 Record 构造器，没有调用维护测试中的 graph helper。

原 RED closure matrix：`7/7 PASS`。

- superseded exact replay：返回原 Record ID、`active:false`；active list 仍只包含 replacement。
- missing target：三个 read API `3/3` fail closed，workspace bytes 不变。
- cross-dedupe supersedes：三个 read API `3/3` fail closed，workspace bytes 不变。
- multiple active leaves：三个 read API `3/3` fail closed，workspace bytes 不变。
- cycle/corrupt persisted bytes：三个 read API `3/3` fail closed，workspace bytes 不变。
- 三类 nested forbidden reasoning：`3/3` zero-write reject。
- `.pipeline/manifest.yaml`、legacy state、memory、runtime 与 `.git/config` code refs：全部 zero-write reject；代码审查确认 `.pipeline/**` / `.git/**` 由完整 root-prefix rule 封闭。

完整历史 semantic/provenance matrix：`4/4 PASS`，每项均使三个 active-only read API fail closed。

- inactive body fact key 与 metadata dedupe key 不一致。
- active Record metadata/body provenance 不一致。
- inactive Record metadata/body provenance 不一致。
- inactive Record body 含 forbidden hidden-reasoning field。

这些案例均使用临时目录并在结束时删除，没有修改仓库或 Workflow lifecycle。

## Functional Outcome

当前 M2 可以把项目知识持久化为一事实一 Record，并在不扫描仓库的情况下提供紧凑结构化答案：

- NeRF fixture 从“RE 加速 / 采样加速”定位到名称不含 `sample` 的 occupancy-guided ray marching 代码、模块和原理。
- PSNR fact 返回 meaning、direction、unit、comparability notes、source version 和 project version。
- AceSim fixture 解释 IPC、host trace memory，并定位 temperature/frequency/L1/L2 配置模块。
- freshness 只读取登记过的代码路径；修改与删除分别返回 `digest_mismatch` 和 `missing`，无关结果文件不会进入知识判断。
- 同 fact key 的变化要求显式 supersedes，历史 Record 可追踪；不同项目的查询严格隔离。
- Record index 仍是可重建 derived view，M2 reader 直接读取项目 Record authority，不引入第二知识 authority。

## Exact Validation

Fresh independent executions after the final remediation:

- `node core/test/c23-m2-experiment-knowledge.test.js`: `14/14` PASS。
- `node core/test/record-store.test.js`: `13/13` PASS。
- `node core/test/workspace-transaction.test.js`: `19/19` PASS。
- C23 M1 focused suites: `6/6 + 10/10 + 5/5 = 21/21` PASS。
- M2 + Record + transaction + M1 focused total: `67/67` PASS。
- `secret-ref-projection.test.js`: `2/2` PASS。
- `authority-nonduplication.test.js`: `2/2` PASS。
- maintained catalog dry-run: valid; maintained/selected `54/54`; M2 selected。
- all catalog dry-run: valid; maintained `54`, quarantined `116`, selected `170`。
- `node --check` for Knowledge production, Experiment, Core export, and M2 test modules: PASS。
- `git diff --check`: PASS。
- `.pipeline/runtime/transactions/`: no descendants。

Test-role evidence was independently updated rather than borrowing audit probes:

- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m2-retest.md`
- SHA-256: `bc5efb3a087755e600aa859e922ffef426fafc38a0e8d2b6df9356598a3ecbe6`
- Worker identity: `c23-m2-test-luna`, role `test`; latest contract is `14/14` GREEN and includes individually content-valid inactive body/dedupe and provenance mismatch histories.

The maintained/all catalog commands were dry-runs; this reaudit does not claim execution of all 54 or 170 catalog paths.

## Authority And Change Boundaries

Before writing this report, authority hashes remained:

```text
manifest.yaml       6e367f6b2fc288c3197aaa6ec10d66893897dbd502d6a936c0211fef09a01e1e
runtime/active.yaml 61f2256d4c242ec144a2d76576a9a0e271b7c7bb853198d5fe0e4502b8eddb3e
C23 runtime.yaml    c2171b5a4bfe622b049b8ba29bde016842377d4c44097713f4b2fd6b0a79cb2b
C23 continuation    517f610d2942e722b7b9073b3d189ad1063d64692f6e06d1cc750a0bed98b0cd
legacy state.yaml   8b97e6df7a2b78469008b776e65bebd6227eb660e6cba2953422aa38f5cf4d17
legacy cycle.yaml   d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb
legacy log.yaml     14f108a6994130ec59f60e7a94169df80998ee7319dc4b5dd0f6fa2f8a268222
legacy PROGRESS.md  303e593fae56deb877718a55d7c4acbb080c2506e6da21f9cda2474fb5b7fa4b
```

M1 remains `verified`, M2 remains `executing`, and revision/hash remain `1` / `dc63837d450c3006b9ba106027f1fafdf218e9a13e1c185ae03dd1f952821c0e`. This audit does not advance milestone state.

## Conclusion

`PASS` for C23 revision 1 M2. Project knowledge authority, metric semantics, module/optimization mapping, source/version binding, registered-path freshness, explicit historical supersession, project isolation, Git-merged graph conflict handling, complete-history semantic/provenance validation, secret/reasoning policy, private path denial, legacy isolation, and M1 regression meet the approved M2 outcome. The old RED evidence is correctly retained as history; current test, implementation, and fresh audit identities remain distinct.

## Expected Result

AI 可以直接从项目级 Record authority 回答“指标是什么意思、模块负责什么、某个优化为什么有效、代码在哪里”，并同时显示版本与 stale 状态。任何非法 Git 合并、歧义 supersedes graph、坏 inactive 历史或 provenance 不一致都会明确失败，不会静默选择一个答案。私有 reasoning 与 Workflow/Git authority 文件不能进入项目代码知识。

## Modified File

- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m2-reaudit.md` only.

本 reaudit 未修改 production、tests、fixtures、catalog、manifest、Runtime、Continuation、Receipt、legacy authority、Hook、version、plugin metadata 或 cachebuster，也未推进 Workflow lifecycle。

## Problems Encountered

- 原四项 finding 修复后，fresh audit 额外发现 active-only 读取会跳过 inactive body/provenance 校验。主线程随后修复为先解析完整历史，test worker 将该案例固化为第 14 项维护测试；最终独立与 test-role 验证均通过。
- 第一版 full-history 临时 probe 少了一个 JavaScript 块结束符，因语法错误在执行前退出，未触达仓库。修正后同一 `4/4` matrix 全部通过。
- 工作区包含大量既有 C21/C23 未提交内容；审计通过明确文件边界、worker evidence、authority hashes 与临时 workspace 隔离归因，没有清理或覆盖用户变更。

## Residual Risks / Follow-up

- `recordFact` 先提交 authoritative Record，再用第二个可恢复事务重建 derived index。第二步中断可能使调用失败但事实已 durable；reader 不依赖该 index，后续可增加专门的跨事务 fault-injection/retry contract。
- external paper/document version 与 project version 是 caller-supplied provenance；M2 不联网验证远端内容真实性，AI 必须区分“已登记”和“已核验”。
- `resolve` 是 deterministic alias/token candidate retrieval，不是科学真值 oracle；可疑映射和冲突仍需用户确认。
- code freshness 使用 whole-file SHA-256。大型文件的无关改动也会标 stale；真实 pilot 若噪声过大，可增加 symbol/range digest，但不得弱化当前 fail-closed 文件绑定。
- cycle adversarial case 使用 integrity-invalid persisted bytes，因为 content-addressed Record ID 使相互引用的 valid-hash cycle 无法实际构造；missing target、cross-dedupe 和 multiple-leaf 案例均为 individually content-valid Records，直接覆盖 graph validator。
