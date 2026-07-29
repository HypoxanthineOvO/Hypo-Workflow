# C21-M5 Bootstrap Acceptance Final Re-Audit

- Worker: `/root/m5_acceptance_reaudit`
- Role: fresh independent `RE-AUDIT`
- Decision: `NEEDS_CHANGES`
- Production edits: none
- Test edits: none
- Live authority edits: none

## 结论

C21-M5 的 HIGH-01 尚未累计闭环，因此 M5 不能完成，也不能进入 M6。

修复后的 pending mutation gate、不可变 acceptance companion、rollback precedence、Recovery Pack 单线校验和 live reconciliation 主路径均有效；四组指定回归也全部通过。但是 acceptance 目前只证明新格式 authority 自洽，不能证明它声称绑定的历史冻结状态和 evidence 真实存在且未漂移：

1. reconciliation 不读取或验证 `.pipeline/reviews/C21/M5/legacy-freeze-baseline.json`，也不验证 `.pipeline/state.yaml`、`.pipeline/cycle.yaml`、`.pipeline/log.yaml` 或 `.pipeline/PROGRESS.md` 的冻结状态。完整 live `.pipeline` 副本中的 legacy `state.yaml` 已明确漂移，acceptance 仍返回 `accepted`。
2. `evidence_refs` 只做 canonical value 归一化并写入自哈希 companion。不存在的 Snapshot 路径和错误的全零 `semantic_hash` 仍可被接受并原样持久化。

因此，companion 的自哈希能够证明“这份 acceptance 文档没有被改写”，却不能证明“它引用的验收证据是真的”或“legacy authority 在验收时仍与冻结基线一致”。这是 acceptance lifecycle 的真实性缺口，不是报告完整性问题。

## Findings

### HIGH-01A: acceptance 未机械验证 legacy freeze

`acceptBootstrapActivation()` 的 strict 路径验证 stage、checkpoint 和初始新格式 write set；reconciliation 路径通过 `buildReconciliationAcceptanceHead()` 验证 Runtime、Continuation、Journal、Capsule、Pack、Record、Receipt、Snapshot 和相关 inventory。

但是 `verifyReconciliationBaseline()` 只遍历 `checkpoint.new_files`，`inspectReconciliationInventory()` 只扫描：

- `.pipeline/runtime`
- `.pipeline/memory`
- `.pipeline/snapshots`

acceptance 路径没有读取 legacy freeze baseline，也没有对 legacy authority 做 bytes、size 或 mtime 比较。strict acceptance 同样没有在提交 companion 前机械验证 legacy freeze。

独立反证使用完整 live `.pipeline` 临时副本：

```text
expected .pipeline/state.yaml sha256:
8b97e6df7a2b78469008b776e65bebd6227eb660e6cba2953422aa38f5cf4d17

tampered copy sha256:
0bf2024bbab26f30310ac324d72777f325e5fca78f9332f068262138ba8fa8fc

legacy_drift_present: true
acceptance_status: accepted
rejection_code: null
```

这意味着 acceptance 可以在 legacy authority 已漂移时关闭 rollback window、写入 accepted fact 并重新开放普通 writer，与 HIGH-01 的累计合同冲突。

此外，现有 `legacy-freeze-baseline.json` 只列出 `state.yaml`、`cycle.yaml` 和 `log.yaml`。当前冻结合同还明确包含 legacy `PROGRESS.md`，所以即使后续直接使用现有 baseline，覆盖范围仍不完整。

### HIGH-01B: evidence_refs 没有存在性或 digest/semantic 校验

`normalizeAcceptanceInput()` 目前只要求 `evidence_refs` 是数组、通过 secret 检查，然后调用 `normalizeCanonicalValue()`。`buildBootstrapAcceptanceFact()` 将该值纳入 companion 自哈希，但 acceptance 前没有：

- evidence 类型 schema 校验；
- 安全、受限的 repository-relative path 校验；
- regular-file / symlink 检查；
- 文件存在性和 byte digest 校验；
- Snapshot semantic hash 校验；
- evidence 与当前 stage/checkpoint/job 的语义绑定。

独立反证同样使用完整 live `.pipeline` 临时副本，输入为不存在的 Snapshot 和全零 hash：

```text
evidence_exists: false
path: .pipeline/snapshots/cycles/c21/does-not-exist.yaml
semantic_hash: 0000000000000000000000000000000000000000000000000000000000000000
acceptance_status: accepted
rejection_code: null
persisted_evidence: exactly the bogus input
```

这使 `evidence_refs` 退化为未验证的声明。当前测试中将 provisional 字段名对齐到 `validation_head.head_pack_ref` / `current_cursor` 没有弱化既有断言，但测试合同缺少 legacy freeze 和 evidence truthfulness 两类必要负向案例。

## 已通过检查

### Pending gate 与普通 writer 边界

代码审阅和独立临时副本探针确认：

- Runtime、Record、Receipt、Snapshot、Capsule、Pack 和普通 generic transaction 通过共享 transaction gate 阻塞；
- Journal 在 blob externalization、目录创建和 JSONL append 前阻塞；
- Retention 在第一次 `rm` 前阻塞；
- read、Pack selection、fresh restore 和 recovery 不因 pending gate 被阻塞；
- 普通 `commitWorkspaceTransaction()` 直接写 canonical `acceptance.yaml` 返回 `ERR_WORKSPACE_PATH_FORBIDDEN`；
- 9000-byte Journal payload 返回 `ERR_BOOTSTRAP_ACCEPTANCE_PENDING`，blob inventory 未变化；
- 含三个待删除 Pack 的 Retention apply 返回 `ERR_BOOTSTRAP_ACCEPTANCE_PENDING`，Pack inventory 未变化；
- 所有失败探针均未留下 pending transaction 或 acceptance companion。

### Immutable companion、fault recovery 与 rollback precedence

实现审阅及独立临时副本验证确认：

- companion 绑定 Bootstrap job、rollback checkpoint ref、stage hash、manifest digest、mode、accepted time、validation head 和 semantic self-hash；
- sealed rollback checkpoint bytes 与 mtime 在 acceptance 后保持不变；
- 相同 request 重复 acceptance 保持 companion bytes 与 mtime 不变，并返回 `idempotent: true`；
- `after_manifest_activation` 注入故障后，`recoverWorkspaceTransaction()` 返回 `finalized`，companion 可正常读取，普通 accepted lifecycle 得以恢复；
- valid accepted companion 在 baseline 检查之前使 rollback 返回 `ERR_BOOTSTRAP_ROLLBACK_ACCEPTED`；
- companion 解析和自哈希校验失败会 fail closed 为 `ERR_BOOTSTRAP_ACCEPTANCE_INVALID`。

### Live reconciliation 主路径

完整 live `.pipeline` 临时副本上的 reconciliation 成功，证明当前新格式 authority 本身自洽：

```text
Pack chain:
b3fe311f4be23e2c3f54bded9cb08bb32867ee6d6bbf70ea71cefdafaf66b3f3
-> 5a84f34fe97e47143daf77a71ec88ec7d72c0a0d4f29deaf976b550f25a8fa04
-> fb22c3510eaee7b467dbf3e3e6060de7f0dbaef4bc274f0ace7fb4644d54a986
-> c772da37d5ab512e4886adc7f536aab27280e80960c7cb1d89ac5cda1c41f069

current cursor sequence: 18
journal_event_count: 18
restore delta: 0
head Pack: c772da37d5ab512e4886adc7f536aab27280e80960c7cb1d89ac5cda1c41f069
```

该副本 acceptance 后：

- rollback 返回 `ERR_BOOTSTRAP_ROLLBACK_ACCEPTED`；
- ordinary Runtime writer 重新开放；
- rollback checkpoint bytes/mtime 不变；
- Runtime/Continuation、Journal、Capsule 和 head Pack 一致；
- 所有 Pack 构成从 initial Pack 开始的单线 ancestry；
- 没有 restore delta 或 rejected Pack。

现有测试也覆盖 unexpected Record/Receipt/Snapshot rejection。实现中的 inventory、Pack-chain、cursor、Capsule/Continuation 和 restore-head 检查没有在本次修复中被绕过。

### 回归结果

本独立 re-audit 身份运行：

| Suite | Result |
|---|---:|
| Bootstrap acceptance | `16/16 pass` |
| M3 Recovery | `49/49 pass` |
| Existing M5 focused baseline | `64/64 pass` |
| Knowledge post-activation gate | `2/2 pass` |

全部为 `0 fail / 0 skip / 0 cancelled / 0 todo`。主线程已有 full Core `942/942` 旧证据；由于本次已得到可复现 blocker，re-audit 未重复运行 full suite，也不以旧 full evidence 覆盖本次 findings。

## 其他合同核对

- Worker separation 保持：acceptance TEST、IMPLEMENT、首次 final audit 和本次 re-audit 为不同身份。
- Bootstrap curation 仍为 `42 Records / 39 active dedupe groups / 3 inactive history`；本次未修改 Records、indexes 或 curation/audit evidence。
- 当前 source live workspace 仍处于 pending；本次从未对 live 调用 accept。
- 本次没有修改 manifest、Runtime、Continuation、Journal、Capsule、Pack、Record、Receipt、Snapshot、rollback checkpoint 或 legacy `state/cycle/log/PROGRESS`。
- 本次没有删除、reset、revert 或 clean；现有 dirty worktree 原样保留，M8 deletion gate 未触碰。
- 唯一仓库写入是本报告。

## 最小修复合同

1. 定义严格的 acceptance evidence union，而不是任意 canonical value。至少支持：
   - `{ type: "snapshot", path, semantic_hash }`：读取真实 Snapshot，验证 schema/self-hash，并要求与 `stage.checkpoint` 精确一致；
   - `{ type: "file", path, sha256 }` 或专用 `{ type: "legacy_freeze", path, sha256 }`：读取 regular file、拒绝 symlink/越界路径并校验 byte digest。
2. 在 strict 和 reconciliation 首次 acceptance 中都机械验证 legacy freeze。baseline 必须覆盖 `state.yaml`、`cycle.yaml`、`log.yaml` 和 `PROGRESS.md`，逐项校验 path、bytes SHA-256、size 和 mtime；缺失、额外、漂移或不安全路径均返回 `ERR_BOOTSTRAP_ACCEPTANCE_INVALID`，且 companion/transaction 为 zero-write。
3. 将已验证的 evidence digest 和 legacy freeze inventory hash 写入 `validation_head`，并纳入 acceptance self-hash。reconciliation 的两次 head observation 必须都包含这些值，避免只对新格式 head 做 TOCTOU 复核。
4. 对未来 Bootstrap stage，把 pre-activation legacy inventory 直接纳入 sealed rollback checkpoint 或另一个被 checkpoint 明确绑定的 immutable prerequisite。对于当前已封存 checkpoint，必须使用一次性、明确审计的 compatibility binding；不能静默改写现有 checkpoint，也不能接受未锚定的任意 baseline。
5. 新增独立 RED/GREEN 合同：
   - strict 与 reconciliation 分别拒绝 legacy bytes/hash 漂移；
   - 至少覆盖 mtime-only drift 和 `PROGRESS.md` 缺失/漂移；
   - 拒绝 missing evidence、wrong byte digest、wrong Snapshot semantic hash、错误 evidence 类型和越界/symlink path；
   - 成功 acceptance 精确绑定真实 checkpoint Snapshot 与完整 legacy freeze baseline；
   - 所有拒绝均证明 acceptance companion、transaction、Runtime 和 checkpoint zero-write。
6. 修复后由全新 re-audit 身份重跑 acceptance `16+新增案例`、M3 `49`、M5 `64`、Knowledge `2` 和 full Core regression，并再次在完整 live `.pipeline` 临时副本执行 reconciliation。只有新 re-audit `PASS` 后，主线程才能对 live 执行一次受控 acceptance、封存后续 Pack 并完成 M5。

## Completion Report Contract

### 改动摘要

本 re-audit 没有修改实现；新增本报告，确认 HIGH-01 的主要 lifecycle repair 已工作，但识别出 legacy freeze 与 evidence truthfulness 两项仍阻塞验收的缺口。

### 技术思路

审阅最低层 writer gates、acceptance companion 和 migration reconciliation 实现；运行四组独立回归；在完整 live `.pipeline` 临时副本上验证正常 reconciliation、fault recovery、idempotence、rollback/writer reopening，并对 legacy drift 与 bogus evidence 做反证。

### 修改文件 / 模块

- `.pipeline/reviews/C21/M5/final-reaudit.md`（唯一修改）

### 测试设计与验证结果

指定回归全部通过：acceptance `16/16`、M3 `49/49`、M5 `64/64`、Knowledge `2/2`。正常 live-copy reconciliation 命中四 Pack 单线链、cursor `18` 和 restore delta `0`。两个真实性反证均错误地返回 `accepted`，构成本报告的 blocker。

### 预期结果

首次 acceptance 必须同时证明新格式 authority 自洽、legacy authority 与受信冻结基线一致、所有 evidence 真实且 digest/semantic binding 正确；任何一项失败都必须在 companion 或 transaction 写入前 fail closed。

### 遇到的问题

没有工具、环境、依赖或 worker-separation 阻塞。问题来自 acceptance validation scope 本身，而不是测试波动或 fixture 失败。

### 风险与后续

在修复前对 live 执行 acceptance，会生成形式上不可变但证明内容不完整的 accepted fact，并永久关闭正常 rollback 路径。必须保持 live pending、阻止 M6 mutation，完成上述最小修复和新独立 re-audit 后再接受。
