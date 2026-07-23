# C21-M5 Bootstrap Acceptance Revision 2 Final Re-Audit

- Worker: `/root/m5_acceptance_final_audit_r2`
- Role: fresh independent `FINAL RE-AUDIT`
- Time: `2026-07-12T11:28:18+08:00`
- Decision: `APPROVED`
- Findings: `0 Critical / 0 Warning / 0 Info`
- Production edits: none
- Test edits: none
- Live authority edits: none
- Gate: authorize one exact live `reconciliation` acceptance; M6 remains behind successful live acceptance and M5 closure

## 结论

`.pipeline/reviews/C21/M5/final-reaudit.md` 的两个 blocker 已累计关闭：

1. Bootstrap acceptance 现在会把四个 legacy 文件的冻结事实作为机械校验条件。未来 checkpoint 在 stage 前封存 inventory，activation 前二次验证；当前旧 sealed checkpoint 必须提供 exact byte-hashed、self-hashed、checkpoint-bound compatibility binding。
2. `evidence_refs` 现在是严格的 Snapshot/File union。Snapshot 必须真实存在、自校验并精确等于 staged checkpoint；File 必须是仓库内 regular non-symlink 文件且 byte digest 匹配。

本审计没有以测试全绿代替反证。除独立运行全部指定回归外，还在 `cp -a` 生成的完整 `.pipeline` 临时副本上真实执行了当前 live reconciliation acceptance，并在 11 个彼此独立的新副本上验证 drift/tamper/path 反例。正向演练和所有反例均符合合同，源 live 仍保持 pending 且未被修改。

因此，本审计明确授权主线程在 **当前 exact live facts 不变** 的前提下，对 live 执行一次受控 `acceptBootstrapActivation(..., mode: "reconciliation")`。授权的 binding、Snapshot、file evidence 和 checkpoint 见下文“Live Acceptance 授权”。任何相关 bytes、mtime、semantic hash、Pack chain 或 cursor 漂移都会使本授权失效并需要重新验证。

## Blocker Closure Matrix

| Blocker | 结论 | 独立证据 |
|---|---|---|
| HIGH-01A: acceptance 不验证 legacy freeze | **Closed** | Future checkpoint 封存四文件 inventory；strict/reconciliation 均复验；live-copy state bytes、PROGRESS mtime、PROGRESS missing 均在 companion/transaction 前 zero-write 拒绝 |
| HIGH-01B: `evidence_refs` 只是任意声明 | **Closed** | strict Snapshot/File union；missing/wrong file、wrong Snapshot semantic、symlink、path escape 均 zero-write 拒绝；成功 companion 绑定 verified evidence hash |
| 旧 sealed checkpoint 不能原地补字段 | **Closed** | 独立 compatibility binding raw SHA、semantic self-hash、job/checkpoint ref、四文件 inventory 全部验证；旧 checkpoint bytes 未改 |
| Reconciliation TOCTOU 复核范围不足 | **Closed** | 两次完整 head observation 都重新读取 evidence、binding 与四文件 inventory，结果必须 canonical-equal 才能进入 transaction |
| Revision 1 pending/rollback/API 合同回退 | **Closed** | 原 lifecycle tests 保持 GREEN；accepted rollback precedence、idempotency、writer reopen 和 non-public specialized transaction 均独立验证 |

## 代码审阅

### Future checkpoint 和 activation

- `core/src/migration/bootstrap-workspace.js:95-116` 在 staging artifact 或 activation 写入前调用 `captureLegacyFreezeInventory()`。
- Inventory 精确覆盖 `.pipeline/cycle.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md`、`.pipeline/state.yaml`，每项包含 `path/sha256/size_bytes/mtime_ns`。
- `core/src/migration/bootstrap-workspace.js:124-141` 在 activation transaction 前再次读取并比较 inventory。
- `core/src/migration/bootstrap-workspace.js:850-881` 把 inventory 纳入 rollback checkpoint durable body 和 semantic hash。
- `core/src/migration/bootstrap-workspace.js:1808-1839` 使用 before/after `lstat(bigint)`、regular/non-symlink、dev/ino/size/mtime 稳定性和实际 byte length 检查，避免接受观察期间变化的文件。

捕获时点正确：stage 先观察 legacy 文件，再构建并写 proposal/plan/checkpoint；activation 在 manifest-last transaction 前复核。因此未来 activation 不会把 activation 后的当前状态误当成历史 baseline。

### 旧 checkpoint compatibility binding

- `core/src/workspace-store/bootstrap-acceptance.js:307-339` 要求 exact schema、固定 authority/binding kind、Bootstrap job ref、canonical checkpoint ref、四文件 inventory 和 semantic self-hash。
- `core/src/migration/bootstrap-workspace.js:1246-1299` 要求调用方提供 binding path 与 raw byte SHA；读取时拒绝缺失、越界、symlink、non-regular、raw digest 错误、自哈希错误和 checkpoint binding 错误。
- 旧 checkpoint 缺少 inventory 时不允许现采当前 live 状态作为 baseline；未提供 compatibility binding 会直接拒绝。
- 如果未来 checkpoint 已自带 inventory，额外 binding 也必须与 checkpoint inventory 精确相等，不能替换 checkpoint authority。

### Evidence truthfulness

- `core/src/workspace-store/bootstrap-acceptance.js:247-275` 只允许 exact `{type: snapshot, path, semantic_hash}` 或 `{type: file, path, sha256}`，并拒绝空数组、重复 ref、未知字段和未知类型。
- `core/src/migration/bootstrap-workspace.js:1208-1244` 要求恰好一个 Snapshot；通过 production `readSnapshot()` 验证 regular/non-symlink、schema、自哈希、content-derived path，并要求 path/hash 等于 `stage.checkpoint`。
- File evidence 通过 contained repository-relative regular-file reader，并验证实际 bytes SHA-256。
- Path normalizer 拒绝 absolute、drive、home/file URI、traversal、空组件和反斜杠；realpath containment 防止逃逸。

### Companion、双观察和生命周期

- `verified_evidence_hash` 是已验证 canonical evidence refs 的 hash；`legacy_freeze_inventory_hash` 是 canonical 四文件 inventory 的 hash。
- 两个 proof hash 和 `legacy_freeze_source` 进入 `validation_head`，再进入 acceptance companion semantic self-hash。
- `core/src/migration/bootstrap-workspace.js:1331-1415` 的 reconciliation 每次都执行 evidence、binding、legacy freeze、stage、Record/Snapshot/Receipt inventory、Journal/Capsule/Pack/restore 校验；主路径连续执行两次并要求 head 完全一致。
- Pending gate 保持在 shared transaction、Journal pre-blob/pre-append 和 Retention pre-delete 边界；read、restore 和 recovery 保持可用。
- `rollbackBootstrapActivation()` 先读取有效 companion，再做 pending rollback baseline 检查；accepted 状态稳定返回 `ERR_BOOTSTRAP_ROLLBACK_ACCEPTED`。
- 相同 acceptance request 幂等返回 immutable companion；冲突 request 或损坏 companion fail closed。
- `acceptBootstrapActivation` 只从 migration module 和 Core root 暴露。专用 `commitBootstrapAcceptanceTransaction` 未从 workspace-store barrel 或 Core root 暴露，CLI、Hooks、Scripts、Skills、OpenCode 和 Claude surface 也没有 public command 路由。

## Binding 来源验证

Binding：`.pipeline/reviews/C21/M5/legacy-freeze-acceptance-baseline.json`

- Raw file SHA-256: `a81c9dc1780f1426e530c03ca02e3a705c9bcbe07af1f0251efc41a3f98c6866`
- Semantic hash: `802931c8be1e55221235e5f2e821f364e5ddc22449370c189b8a992f05ef8d41`
- Job: `{kind: bootstrap_job, id: c21-reference-bootstrap}`
- Checkpoint path: `.pipeline/runtime/migrations/c21-reference-bootstrap/rollback-checkpoint.yaml`
- Checkpoint semantic hash: `2f2258b97c56914ec8609337fbe96e1b5b1b9b1bcc3e685214104ba1792d6a56`
- Current checkpoint file byte SHA-256: `e0336e44e381166552737e35a1ca3b030b09b5e7618b0c4675a5a7090fa97da4`

Production normalizer 和独立 canonical recomputation 均确认 binding self-hash 有效，checkpoint ref 精确命中当前 sealed checkpoint。Binding 前三项逐字段精确等于 `.pipeline/reviews/C21/M5/legacy-freeze-baseline.json`：

| Path | SHA-256 | Size | mtime_ns |
|---|---|---:|---:|
| `.pipeline/state.yaml` | `8b97e6df7a2b78469008b776e65bebd6227eb660e6cba2953422aa38f5cf4d17` | 39182 | `1783815360088171556` |
| `.pipeline/cycle.yaml` | `d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb` | 606 | `1783815360286160870` |
| `.pipeline/log.yaml` | `14f108a6994130ec59f60e7a94169df80998ee7319dc4b5dd0f6fa2f8a268222` | 690935 | `1783815360290160654` |
| `.pipeline/PROGRESS.md` | `303e593fae56deb877718a55d7c4acbb080c2506e6da21f9cda2474fb5b7fa4b` | 34562 | `1783815360300160114` |

当前四个 live 文件的 exact `{path, sha256, size_bytes, mtime_ns}` 全部等于 binding。

### PROGRESS 历史锚点判断

`.pipeline/reviews/C21/M5/audit.md:2822` 在 activation 前记录 PROGRESS SHA-256 为 `303e593f...fa4b`，`:2833` 明确记录 audit 写前/写后 bytes、mtime_ns 和 SHA-256 完全一致。该报告没有把 PROGRESS 的 numeric mtime 直接内联，但本审计不认为这造成证据缺口，原因如下：

1. 当前 hash 和 size 精确命中 pre-activation audit 记录。
2. 当前 PROGRESS `birthtime_ns=1783815360300160114`、`ctime_ns=1783815360304159899`，均早于 audit file `birthtime_ns=1783817325070704035`，也早于 rollback checkpoint `birthtime_ns=1783817635268671583`。
3. 在当前 filesystem 上，内容替换或 `utimes` 恢复 mtime 都会推进 ctime；当前 ctime 仍停留在 audit/activation 前。因此 binding 中的 numeric mtime 可与 audit 当时观察到且声明未变化的同一 inode 状态连接。
4. 当前 binding acceptance 正向探针使用该 exact mtime 成功；mtime-only 反证会稳定 fail closed。

这组 hash + pre-activation audit attestation + pre-audit ctime/birthtime + current exact match 足以作为当前一次性 compatibility binding 的历史来源。它不应被泛化成未来 migration 方案；未来 checkpoint 已直接封存完整四文件 inventory。

## 独立测试结果

| Validation | Result |
|---|---:|
| Bootstrap acceptance | `41/41 pass` |
| M1 focused | `76/76 pass` |
| M3 Recovery | `49/49 pass` |
| M5 focused | `64/64 pass` |
| Knowledge post-activation gate | `2/2 pass` |
| Full Core | `983/983 pass`, `0 fail / 0 skip` |
| JavaScript syntax | `248/248` files pass `node --check` |
| `git diff --check` | pass |
| API boundary | pass |
| Public-surface scan | no acceptance/internal transaction route found |

Acceptance `41/41` 同时覆盖 future checkpoint 四文件 inventory、strict/reconciliation 八个 legacy drift leaves、十一种 evidence union leaves、两个 successful proof-hash leaves，以及 Revision 1 的 pending gate、rollback、idempotency、writer reopen 和 reconciliation 合同。

## Live-Copy 正向演练

正向演练使用 `cp -a` 把完整 `.pipeline`、当前 production `core` 和必要 package runtime 复制到 `/tmp/hw-c21-m5-r2-positive-CZyCEA/repo`，并从副本导入 production API。未调用 source live acceptance。

输入：

- mode: `reconciliation`
- Snapshot evidence: staged C21 checkpoint
- File evidence: `.pipeline/reviews/C21/M5/audit.md`，SHA-256 `1a4734c1025d4cd3325c51c5da1a1d7c86e744a7adf8ece99d63bf1cf6f1ca4e`
- Legacy binding: exact path + raw SHA `a81c9dc...6866`
- Fixed operation id: `c21-m5-r2-final-audit-reconcile`

结果：

```text
status: accepted
Pack chain: b3fe311f... -> 5a84f34f... -> fb22c351... -> c772da37...
head Pack: c772da37d5ab512e4886adc7f536aab27280e80960c7cb1d89ac5cda1c41f069
cursor sequence: 18
Journal events: 18
Journal warnings: 0
restore delta: 0
verified_evidence_hash: e838743654001a57efaf4c32873f478db6c2f60980f69dcd86f1db0417f27c5e
legacy_freeze_inventory_hash: 8126ed7ec6176bd77f1460abfb1e07b1a0a1139352302f73885bc8a21cf9c008
```

- Journal、Capsule、head Pack cursor 一致。
- Head Pack embedded Capsule 和当前 Capsule 一致；embedded Continuation 和当前 Continuation 一致。
- Selected Pack 是链尾，restore delta/rejected Pack 均为 0。
- Companion self-hash、checkpoint/job/stage/manifest ref、两个 proof hash 和 compatibility source 全部有效。
- Sealed rollback checkpoint bytes 保持不变。
- 相同 request 使用新 operation id 重复调用返回 `idempotent: true`，companion bytes 与 mtime_ns 完全不变。
- Acceptance 后普通 Runtime writer 成功。
- Runtime 已合法漂移后再调用 rollback，仍优先返回 `ERR_BOOTSTRAP_ROLLBACK_ACCEPTED`。

## 独立反证矩阵

每个反例都使用一个新的 `cp -a` 完整 `.pipeline` 副本。Snapshot 在 mutation/request 构造后、acceptance 调用前记录完整文件、目录和 symlink metadata；调用后要求 exact tree equality、无 `acceptance.yaml`、无 transaction entry、错误不回显 marker。

| Case | Result | Code |
|---|---|---|
| legacy `state.yaml` bytes drift | zero-write reject | `ERR_BOOTSTRAP_ACCEPTANCE_INVALID` |
| `PROGRESS.md` mtime-only drift | zero-write reject | `ERR_BOOTSTRAP_ACCEPTANCE_INVALID` |
| `PROGRESS.md` missing | zero-write reject | `ERR_BOOTSTRAP_ACCEPTANCE_INVALID` |
| binding raw byte hash wrong | zero-write reject | `ERR_BOOTSTRAP_ACCEPTANCE_INVALID` |
| binding semantic self-hash wrong | zero-write reject | `ERR_BOOTSTRAP_ACCEPTANCE_INVALID` |
| self-valid binding targets wrong checkpoint hash | zero-write reject | `ERR_BOOTSTRAP_ACCEPTANCE_INVALID` |
| file evidence missing | zero-write reject | `ERR_BOOTSTRAP_ACCEPTANCE_INVALID` |
| file evidence digest wrong | zero-write reject | `ERR_BOOTSTRAP_ACCEPTANCE_INVALID` |
| Snapshot semantic hash wrong | zero-write reject | `ERR_BOOTSTRAP_ACCEPTANCE_INVALID` |
| file evidence is symlink | zero-write reject | `ERR_BOOTSTRAP_ACCEPTANCE_INVALID` |
| evidence path escapes repository | zero-write reject | `ERR_BOOTSTRAP_ACCEPTANCE_INVALID` |

所有 `11/11` 反例：`rejected=true`、`zero_write=true`、`payload_leaked=false`、`acceptance_exists=false`、`transaction_entries=[]`。

## Live Acceptance 授权

本审计授权主线程在 source live **当前 facts 未变化时** 使用以下 exact request 执行一次 acceptance：

```js
await acceptBootstrapActivation(repoRoot, {
  bootstrap_job_ref: {
    kind: "bootstrap_job",
    id: "c21-reference-bootstrap",
  },
  checkpoint_ref: {
    path: ".pipeline/runtime/migrations/c21-reference-bootstrap/rollback-checkpoint.yaml",
    semantic_hash: "2f2258b97c56914ec8609337fbe96e1b5b1b9b1bcc3e685214104ba1792d6a56",
  },
  mode: "reconciliation",
  evidence_refs: [
    {
      type: "snapshot",
      path: ".pipeline/snapshots/cycles/c21/checkpoint-0c3866ced3fa71b190b26cd3.yaml",
      semantic_hash: "0c3866ced3fa71b190b26cd32f14c024a1a1474af0b4462cb8924c65ecfdda03",
    },
    {
      type: "file",
      path: ".pipeline/reviews/C21/M5/audit.md",
      sha256: "1a4734c1025d4cd3325c51c5da1a1d7c86e744a7adf8ece99d63bf1cf6f1ca4e",
    },
  ],
  legacy_freeze_binding: {
    path: ".pipeline/reviews/C21/M5/legacy-freeze-acceptance-baseline.json",
    sha256: "a81c9dc1780f1426e530c03ca02e3a705c9bcbe07af1f0251efc41a3f98c6866",
  },
}, {
  id: "c21-m5-bootstrap-acceptance-live-r2",
});
```

主线程执行前应最后复核：source live 无 `acceptance.yaml`、四 legacy exact facts 不变、binding/audit/Snapshot digest 不变、Pack chain 仍为四节点、cursor 仍为 18、无 pending transaction。API 本身也会 fail closed，但这些检查使执行证据清晰。

成功后必须：

1. 读取并验证 persisted companion self-hash、checkpoint/stage/manifest binding、两个 proof hash和 compatibility source。
2. 验证 accepted rollback precedence 和普通 writer gate 已重新开放。
3. 通过新 Runtime/Journal/Capsule/Pack 记录 acceptance 与本审计 closure，不能回写 frozen legacy state/cycle/log/PROGRESS。
4. 封存新的 linear Recovery Pack，重新验证 restore delta 0。
5. 运行 post-accept focused/full regression，生成 M5 completion report 和 Architecture Plan Review，再进入 M6。

## Worker Separation、Dirty Worktree 与 Deletion Gate

- TEST: `/root/m5_acceptance_test`
- IMPLEMENT: `/root/m5_acceptance_implement`
- prior re-audit: `/root/m5_acceptance_reaudit`
- this final re-audit: `/root/m5_acceptance_final_audit_r2`

身份、scope 和 agent lifecycle 彼此分离。本 worker 没有修改 production/tests，也没有使用实现 worker 的自报 GREEN 代替独立命令和反证。

Source live 仍满足：

- `.pipeline/runtime/migrations/c21-reference-bootstrap/acceptance.yaml` 不存在。
- `.pipeline/runtime/transactions/` 无 entry。
- Receipt inventory 为空。
- 无实际 Deletion Manifest 或 deletion Receipt；`deletion.execute` 仅出现在 M8 future contract 文本中。
- 四 legacy 文件、sealed checkpoint、manifest、Runtime、Journal、Capsule、Packs、Records、Snapshot 均未被本审计修改。
- 未执行 reset、checkout、clean、revert、source delete、dependency install 或 remote operation。
- 仓库原有大规模 dirty worktree 保留；本审计唯一仓库写入是本报告。

## Completion Report Contract

### 改动摘要

Revision 2 final re-audit 结论为 `APPROVED`，`0 Critical / 0 Warning / 0 Info`。两个旧 blocker 已由实现审阅、指定回归、真实 live-copy acceptance 和独立 negative matrix 累计关闭。

### 技术思路

使用 GQM 把验收目标拆为“历史 freeze 是否真实”“evidence 是否真实”“accepted lifecycle 是否完整”；使用 ISO/IEC 25010 检查 functional correctness、reliability、security 和 maintainability；使用 ATAM-lite 检查 checkpoint/binding/Pack/transaction sensitivity points；使用 SWEBOK 对需求、构造、测试、配置和 worker separation 交叉核对。

### 修改文件 / 审阅模块

唯一修改：`.pipeline/reviews/C21/M5/final-reaudit-r2.md`。

审阅范围：M5 prompt/architecture、两轮旧 final audit、Revision 2 TEST/IMPLEMENT evidence、binding/baseline、acceptance/transaction/bootstrap/journal/pack production、acceptance tests、live manifest/stage/checkpoint/Runtime/Continuation/Journal/Capsule/Packs/Snapshot，以及 worker/deletion/dirty-worktree evidence。

### 测试设计

独立运行 acceptance、M1、M3、M5、Knowledge 和 full Core；执行 syntax/diff/API scans；用 `cp -a` 完整副本真实接受 live pending workspace；再为 legacy drift、binding tamper、evidence tamper 和 path safety 建立 11 个独立 zero-write 反例。

### 验证结果

全部指定测试和 full Core 通过。Live-copy acceptance 命中 exact 四 Pack chain、cursor/event 18、warnings 0、restore delta 0；companion/proof/binding/idempotency/rollback/writer 合同全部通过。Negative matrix `11/11` fail closed，源 live 保持 pending 与 frozen。

### 预期结果

主线程使用本报告 exact request 后，当前历史 descendant chain 会被明确接受，rollback window 正式关闭，普通新格式 writer 合法重新开放；随后 M5 可在新 Runtime/Journal/Capsule/Pack 中完成 closure，并在 post-accept regression 和报告完成后进入 M6。

### 遇到的问题

第一次临时副本使用 Node `fs.cp(..., preserveTimestamps)`，其 mtime 精度降为毫秒，production 因 nanosecond freeze drift 正确 fail closed。改用 `cp -a` 保留纳秒时间戳后正向演练通过。一次 probe script 语法错误发生在模块导入和任何 acceptance 调用之前，只留下 `/tmp` 副本；修正后完整重跑。两者均未触碰 source live，也不构成 product finding。

### 风险 / 后续

- Acceptance transaction 继承 M1 已记录的单进程确定性、跨进程 TOCTOU 和缺少 filesystem `fsync` 的残余风险。
- Reconciliation 以 authority files 为边界；空的 unexpected directories 不视为 authority。
- PROGRESS compatibility provenance 是当前一次性人工审计链，不应替代未来 checkpoint 的内建 inventory。
- 本 `APPROVED` 只授权 exact live acceptance，不授权删除、M6 mutation、发布或远程操作。
- Live acceptance 后仍必须完成 companion/Pack/restore/post-accept regression 和 M5 completion/Architecture Review；在这些动作完成前不能宣称 M5 已完成。
