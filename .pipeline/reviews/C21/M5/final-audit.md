# C21-M5 独立最终审计

- 审计身份：`/root/m5_final_audit`
- 审计角色：全新独立 `final audit`，未参与 M5 test、implement、Extractor、Curator 或 source audit
- 审计时间：`2026-07-12T09:28:34+08:00`
- 裁决：`NEEDS_CHANGES`
- Findings：`1 High / 0 Medium / 0 Low`
- M6 门禁：`BLOCKED`

## 结论

C21-M5 的 Bootstrap 提炼、manifest-last 激活、单写边界、mixed-offset Recovery Pack 修复、Knowledge legacy writer 门禁、live authority 完整性、legacy freeze 和完整回归均通过独立检查。当前新工作区可读、可恢复，最新有效 Pack 为 `fb22c351...a986`，且 legacy authority 未漂移。

但是 M5 不能完成并进入 M6：Bootstrap rollback checkpoint 仍声明 `acceptance_state: pending`，仓库也没有任何显式 Bootstrap accept transition；与此同时，合法的 post-activation Runtime、Continuation、Capsule、Journal 和后代 Packs 已使 checkpoint 的 exact-hash / exact-file-set 回滚前置条件失效。隔离副本中真实调用 `rollbackBootstrapActivation(...)` 已稳定返回 `ERR_BOOTSTRAP_RECOVERY_INVALID`。因此“checkpoint 接受前 rollback 始终可用”的 M5 明确通过条件当前不成立。

该问题目前 fail closed，没有观察到数据删除或旧 authority 写入；但 pending 状态与实际不可回滚状态互相矛盾，是阻断完成的生命周期缺口，而不是可延期的文档问题。

## Findings

### HIGH-01：Pending Bootstrap checkpoint 已不可回滚，且不存在接受转换

**契约**

M5 prompt 要求 rollback “remains usable until the bootstrap checkpoint is accepted”。实现也把 checkpoint 命名为 `bootstrap_pre_acceptance`，并把 `acceptance_state` 固定为 `pending`。

**客观事实**

1. Live `.pipeline/runtime/migrations/c21-reference-bootstrap/rollback-checkpoint.yaml` 仍为 `acceptance_state: pending`。
2. 全仓没有 Bootstrap acceptance API、accepted companion artifact 或可解析的 `accepted` checkpoint state。`normalizeRollbackCheckpoint` 只接受 `pending`。
3. `rollbackBootstrapActivation` 在判断 acceptance 之前先执行 exact `verifyCheckpointActivated` 和 unexpected-file 检查。
4. Checkpoint 中 51 个初始 new files 有 3 个已合法漂移：
   - Capsule：期望 `adc96531...81993`，当前文件 SHA-256 `a33cb537...309aa`
   - Continuation：期望 `51ee210a...d386`，当前 `e704a571...70ef`
   - Runtime：期望 `9fae6f3a...e908`，当前 `2d38c106...39b8d`
5. 另有 5 个不在 checkpoint 初始文件集中的合法后代文件：Journal segment，以及 Pack `5a84...`、`fb22...` 各自的 `pack.yaml` / `seal.yaml`。
6. 在 `/tmp` 的完整 live `.pipeline` 副本中真实调用 rollback，结果为：

```text
classification: mixed_current_with_legacy_residue
outcome: rejected
code: ERR_BOOTSTRAP_RECOVERY_INVALID
message: Bootstrap activated file differs from the rollback checkpoint
```

7. 现有绿色测试“rollback checkpoint is usable before acceptance”只覆盖 activation 后立即 rollback；没有先产生 Runtime/Journal/Capsule/descendant Pack，也没有任何 accept transition 测试。因此 `942/942` 不能反证此 finding。

**影响**

- 当前磁盘事实声称 checkpoint 仍 pending，但用户或恢复流程已无法使用它回滚。
- M5 completion 若直接进入 M6，会把一个未接受且不可回滚的 Bootstrap 状态继续向前传播。
- 手工把 YAML 改成 `accepted` 不是修复：它会破坏 plan-bound semantic hash，且当前 normalizer 本身拒绝非 pending 状态。

**最小推荐修复**

优先采用“显式 accept transition + pending 写入门禁”，不在本轮扩张为可删除任意 descendants 的 rollback：

1. 增加 checkpoint-bound、幂等、事务化的 `acceptBootstrapActivation`（或同义内部 API）。接受事实应绑定 `bootstrap_job_ref`、checkpoint semantic hash、stage hash、manifest digest、接受时间和当前验证头；可使用不可变 companion acceptance artifact，避免原地篡改已被 plan/hash 绑定的 sealed checkpoint。
2. 在 checkpoint pending 时，阻止会使 rollback baseline 漂移的新格式写入；至少覆盖 Runtime、Continuation、Journal、Capsule、Pack 和相关索引。允许 fresh-process restore 等只读验证，随后显式 accept，再开放后续写入。
3. `rollbackBootstrapActivation` 应先解析权威 acceptance fact：accepted 时稳定返回 `ERR_BOOTSTRAP_ROLLBACK_ACCEPTED`；pending 时才验证 exact rollback baseline。
4. 对当前 live 仓库做一次受控 reconciliation acceptance：验证初始 Pack `b3fe...`、后代链 `b3fe... -> 5a84... -> fb22...`、cursor `0 -> 4 -> 15`、Journal 1..15、Runtime/Capsule 一致性、manifest、Records、Snapshot、legacy freeze 和无 pending transaction，然后写入明确 acceptance fact。不得通过直接编辑 checkpoint 或静默假定已接受来修复。

显式 accept transition **单独存在仍不充分**：若 pending 期间仍允许任意 writer 产生 descendants，同一缺口可再次出现。如果团队不采用 pending 写入门禁，则必须改为安全支持 post-checkpoint descendants 的 rollback，并增加完整 inventory、hash/drift 校验和显式破坏性授权；这比上述推荐方案范围更大，且有删除有效 post-cutover 工作的风险。

**修复验收测试**

- activation 后、accept 前的立即 rollback 成功并只移除 new-format cutover 文件；legacy bytes/mtime 不变。
- accept 前尝试写 Runtime、Journal、Capsule 或 Pack 必须 fail closed 且 zero-write。
- fresh restore 后显式 accept 成功、幂等，并生成 checkpoint-bound acceptance authority。
- accepted 后 rollback 返回 `ERR_BOOTSTRAP_ROLLBACK_ACCEPTED`，而不是旧 baseline drift 错误。
- checkpoint、manifest、Pack ancestry、Journal cursor 或 acceptance binding 任一篡改都使 accept/rollback zero-write 失败。
- live reconciliation fixture 能验证已有 descendants 并接受；接受后可继续写新 Runtime/Journal/Capsule/Pack。
- 新测试、M3 recovery、M5 focused、Knowledge gate 和 full Core regression 全绿；随后由新的独立 audit 身份复审。

## 已通过的客观检查

### Bootstrap 提炼与 authority 分离

- Prompt 与 architecture 明确采用 `Extractor -> Curator -> Auditor -> deterministic writer`；生产 API 强制 Extractor/Curator/Auditor 输出 `authority_role: proposal`，caller 不能提供 Record ID。
- Stage hash：`170be60dd7633f5f6e19313705ef5e29d11ea4cb6f729bcd466a3a0c5632335f`。
- Curation hash：`bd4b0ac0932e0b7f3a2951d67cbc23d6f1a0fcfe24d7934d394d61511abdd3c9`。
- Bound source audit：`approved / findings=[]`；audit hash `2f47824d8f12aad4d245589d2b8582e14a97b51f88f68f191869179882a7f4c8`。
- 本审计重新运行 production source/privacy audit，仍为 `approved / []`，curation hash 精确匹配。
- Live Store 为 42 Records、39 active dedupe groups、3 inactive history。三条 inactive history 精确对应 legacy local authority、Structured Rules authority 和 Git-snapshot Stash draft。
- 42/42 Records 经 production reader 校验通过，均至少有 1 个 source ref，semantic hash 与 derived index 一致。

### 激活、单写与 legacy fence

- Workspace classification：`mixed_current_with_legacy_residue`；manifest 合法且选择新 writer。
- Manifest-last activation、fault recovery、fresh child restore 和 22-family legacy writer fence 的 executable tests 通过。
- Knowledge gate 在 live repo 上真实调用 legacy writer，返回 `ERR_LEGACY_WORKSPACE_WRITE_BLOCKED`，compact bytes、size、mtimeNs、ctimeNs 均 zero-write；同一生成逻辑在临时 legacy workspace 中真实写入并核对内容，未通过 mock 弱化 production gate。
- 当前无 pending workspace transaction。
- 未发现 M8 Deletion Manifest 或 deletion Receipt；本审计未执行删除。审计开始时已存在的四个 C20 prompt 归档 `D` 状态保持原样，dirty worktree 未被 reset、clean 或 revert。

### Recovery Pack mixed-offset 修复

- `orderValidPacks` 对已验证 Pack 使用 `Date.parse(sealed_at)` 比较 absolute instant；只有绝对时刻相等才进入 `previous_pack_ref` ancestry tie-break。
- 非法时间不会形成 comparator `NaN` 输入：Pack inspection 先经 `normalizeTimestamp`，要求带时区 ISO-8601 且 `Date.parse` finite。
- 新测试使用真实 store/Runtime/Journal/Capsule/Pack 链，覆盖：字符串顺序与绝对时间相反、不同 offset 但绝对时刻相等、descendant ancestry、restore `next_action`。既有 corrupt-head fallback 和 equal-Clock digest 两方向测试保留。
- Live Pack `fb22c3510eaee7b467dbf3e3e6060de7f0dbaef4bc274f0ace7fb4644d54a986` 验证有效，`previous_pack_ref=5a84f34...5a8fa04`，selection 和独立 fresh-process restore 都命中 `fb22...`，无 rejected Pack。

### 当前 live authority

- Runtime：`M5 / reviewing / final_audit`；completed milestones 为 M1-M4。
- Continuation：current M5，next M6；next action 明确要求本独立 final audit 后才能转 M6。
- Journal：单一 stream，15 events，cursor sequence `15`，latest event `a7584e5a...7a054`。
- Capsule production reader 校验通过，semantic hash `42f8dbf91f20cf847973744588d208460d1f4873770c83271703f8cbdce362dc`，cursor 与 Journal sequence 15 一致。
- Latest Pack 的 Capsule、Continuation、Record refs、evidence refs、worktree summary、cursor、seal 和 content digest 全部通过 validation。

### Legacy freeze

与 `.pipeline/reviews/C21/M5/legacy-freeze-baseline.json` 精确一致：

| 文件 | SHA-256 | size | mtime_ns |
|---|---|---:|---:|
| `.pipeline/state.yaml` | `8b97e6df7a2b78469008b776e65bebd6227eb660e6cba2953422aa38f5cf4d17` | 39182 | `1783815360088171556` |
| `.pipeline/cycle.yaml` | `d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb` | 606 | `1783815360286160870` |
| `.pipeline/log.yaml` | `14f108a6994130ec59f60e7a94169df80998ee7319dc4b5dd0f6fa2f8a268222` | 690935 | `1783815360290160654` |

### Worker separation 与 evidence

- 初始 `test=/root/m5_test`、`implement=/root/m5_implement`、`audit=/root/m5_auditor` 明确分离；Curator 与六组 bounded Extractor package 也不拥有 authoritative writer。
- Pack-order repair 使用独立 `m5_pack_order_test` 与 `m5_pack_order_implement`；post-activation Knowledge correction 由另一 test worker 完成。
- 本 final audit 身份未参与上述角色。Test、implementation、curation、source audit、pack repair、post-activation test 和 freeze evidence 均在指定 M5 review 目录持久存在，关键 hash 可验证。

## 测试设计与验证结果

本审计以主动反证为目标：先审读 production comparator、Pack normalization、Bootstrap rollback/normalizer 与 Knowledge test，再运行真实 tests、live authority readers 和隔离 live-copy rollback probe。

| 检查 | 结果 |
|---|---|
| M3 Recovery：Journal + faults + Capsule + Pack | `49/49 pass` |
| M5 focused：migration + activation + single-writer + Records + Pack | `64/64 pass` |
| Post-activation Knowledge gate | `2/2 pass` |
| Full Core regression (`npm test`) | `942/942 pass` |
| Fresh source/privacy audit | `approved / []` |
| Live manifest/runtime/capsule/journal/pack readers | 全部通过 |
| Live fresh-process restore | 命中 `fb22...a986` |
| Legacy freeze hash/size/mtime | 3/3 精确一致 |
| Pending rollback on isolated live copy | **失败，复现 HIGH-01** |

完整回归绿色只能证明已有断言通过；它没有覆盖 HIGH-01 的真实 post-activation pending 路径，因此不改变 `NEEDS_CHANGES` 裁决。

## Completion Report Contract

### 改动摘要

本 worker 仅新增本最终审计报告；未修改 production、tests、manifest、Runtime、Journal、Capsule、Pack、Snapshot、Records、旧 state/cycle/log/PROGRESS 或其他 evidence。审计确认绝大多数 M5 行为通过，但发现一个阻断性 rollback/accept 生命周期缺口。

### 技术方法

结合 prompt/architecture contract 审读、production code path 分析、source/privacy 重审、真实 focused/full tests、live authority reader/restore 和 `/tmp` 完整副本 rollback falsification，区分“测试绿色”与“实际契约可用”。

### 修改文件 / 模块

- `.pipeline/reviews/C21/M5/final-audit.md`（唯一修改）

审读范围包括 Bootstrap migration、Recovery Pack、Knowledge writer gate、M5 tests/evidence 及 live `.pipeline` authority；未对这些范围写入。

### 测试设计

由本独立 audit 身份复跑 M3、M5、Knowledge 和 full Core tests，并使用 production APIs 验证 live Records/source binding、Pack selection/restore、Journal/Capsule coherence、legacy freeze 和 rollback 实际行为。

### 验证结果

通过项为 Recovery `49/49`、M5 focused `64/64`、Knowledge `2/2`、full `942/942`，live Pack/restore/freeze 全部有效；唯一失败是 pending checkpoint 的 live-copy rollback，返回 `ERR_BOOTSTRAP_RECOVERY_INVALID`。

### 预期结果

修复后，Bootstrap checkpoint 必须具备明确且可验证的 pending -> accepted 转换；pending 时 rollback 必须真实可用，accepted 后 rollback 必须以明确 accepted 错误拒绝。M5 只有在新独立复审通过后才能完成并转入 M6。

### 遇到的问题

发现 HIGH-01。除此之外无工具、环境、依赖或测试执行阻塞；没有降级 worker separation，也没有跳过所要求的验证。

### 风险与后续

- 在 HIGH-01 修复前推进 M6 会固化矛盾 authority，禁止推进。
- 不建议为快速过门禁直接编辑 checkpoint 或把当前 pending 状态口头解释为 accepted。
- 若选择支持 descendant rollback 而非 pending write fence，必须单独评审其删除范围、授权、inventory 和 drift 安全，不能作为小改动处理。
- 修复、live reconciliation、重新 seal Pack 和状态更新应由主 workflow/新实现与测试身份完成；最终 re-audit 必须使用新的独立身份。
