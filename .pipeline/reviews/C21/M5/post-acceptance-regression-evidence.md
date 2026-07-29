# C21-M5 接受后回归证据

## 元数据

- Milestone：`C21-M5`
- 角色：独立 TEST worker
- 模式：live 只读验证，加两次必须为零写入的生命周期调用
- 生成时间：`2026-07-12T11:51:48+08:00`
- Verdict：`PASS`
- 产品 finding：`0 blocker / 0 warning`

## 结论

显式 Bootstrap acceptance 完成后，参考仓库的 live workspace 仍保持一致。Accepted companion 真实有效，并精确绑定 sealed checkpoint、activation plan、manifest、verified evidence、compatibility binding 和四个 legacy 文件的冻结 inventory。接受后的 Recovery head 是 acceptance-time head 的合法直接后代，而不是对已接受事实的越权改写。

使用原授权中的 exact request 再次调用 acceptance，返回 `idempotent: true`。对完整 `.pipeline` 树的 1,247 个条目做调用前后比较，证明文件字节、大小、mode、symlink target、`mtime` 和 `ctime` 均未变化。随后真实调用 rollback，稳定返回 `ERR_BOOTSTRAP_ROLLBACK_ACCEPTED`，完整树比较同样证明零写入。两个调用后都没有 pending transaction。

所有 focused baseline、完整 Core regression、语法检查、diff 检查、导出边界和公共路由扫描均通过。M5 已具备由主线程写入 completion report、Architecture Plan Review 并封存最终 closure Pack 的条件。本 worker 没有关闭 M5、推进 M6 或额外封存 Pack。

## 技术方法

1. 优先通过 production parser/reader 读取 live acceptance、rollback checkpoint、activation plan、compatibility binding、manifest、Snapshot、Runtime、Continuation、Journal、Capsule 和 Recovery Pack。
2. 重新计算 acceptance、checkpoint、plan 和 binding 的根 semantic self-hash；通过 exact idempotent acceptance 调用所经过的 production stage validator 验证 stage hash。
3. 重新计算 manifest、file evidence、verified evidence 和 legacy freeze inventory hash；逐一比较四个冻结 legacy 文件的 SHA-256、字节大小和纳秒级 `mtime`。
4. 同时验证 acceptance-time Recovery head 和当前 selected Pack，并比较 Journal、Capsule、Pack、Continuation 与 restore cursor。
5. 在重复 accept 和 accepted rollback 前对完整 `.pipeline` 树取快照，并要求每次调用后的树完全相等。
6. 先跑 focused baseline，再跑 full suite，避免宽泛的 GREEN 掩盖局部契约失败；最后执行语法、diff、export、route 和测试后 live authority 复核。

## Live Authority 证据

### Acceptance 与 activation 绑定

| 事实 | 验证值 |
|---|---|
| Acceptance semantic hash | `41e80088212960404fecebb2ec9bcd3235856063dbfe3e4f5466b4d71b7c25e8` |
| Rollback checkpoint semantic hash | `2f2258b97c56914ec8609337fbe96e1b5b1b9b1bcc3e685214104ba1792d6a56` |
| Activation plan semantic hash | `03690fb5644611e0246f8dbc3e18e425714d7a100b4f7342f4278f73a1bec4a2` |
| Stage binding | `170be60dd7633f5f6e19313705ef5e29d11ea4cb6f729bcd466a3a0c5632335f` |
| Compatibility binding semantic hash | `802931c8be1e55221235e5f2e821f364e5ddc22449370c189b8a992f05ef8d41` |
| Manifest SHA-256 | `6e367f6b2fc288c3197aaa6ec10d66893897dbd502d6a936c0211fef09a01e1e` |
| Acceptance mode / gate | `reconciliation` / `accepted` |

Acceptance companion 还通过 `readBootstrapAcceptanceCompanion()` 完整读取和校验；`inspectBootstrapAcceptanceGate()` 精确报告一个已接受的 Bootstrap job。

### Verified evidence 与 legacy freeze

| Proof | 验证值 |
|---|---|
| Audit file SHA-256 | `1a4734c1025d4cd3325c51c5da1a1d7c86e744a7adf8ece99d63bf1cf6f1ca4e` |
| Snapshot semantic hash | `0c3866ced3fa71b190b26cd32f14c024a1a1474af0b4462cb8924c65ecfdda03` |
| Verified evidence hash | `e838743654001a57efaf4c32873f478db6c2f60980f69dcd86f1db0417f27c5e` |
| Binding file SHA-256 | `a81c9dc1780f1426e530c03ca02e3a705c9bcbe07af1f0251efc41a3f98c6866` |
| Legacy freeze inventory hash | `8126ed7ec6176bd77f1460abfb1e07b1a0a1139352302f73885bc8a21cf9c008` |

`readSnapshot()` 验证了 checkpoint Snapshot 的 canonical path 和 semantic hash。Compatibility binding 精确指向已接受的 job/checkpoint；其文件 digest 和 semantic self-hash 都与 acceptance 中的 proof source 一致。

| 冻结的 legacy 文件 | SHA-256 | 大小 | `mtime_ns` |
|---|---|---:|---:|
| `.pipeline/cycle.yaml` | `d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb` | 606 | `1783815360286160870` |
| `.pipeline/log.yaml` | `14f108a6994130ec59f60e7a94169df80998ee7319dc4b5dd0f6fa2f8a268222` | 690935 | `1783815360290160654` |
| `.pipeline/PROGRESS.md` | `303e593fae56deb877718a55d7c4acbb080c2506e6da21f9cda2474fb5b7fa4b` | 34562 | `1783815360300160114` |
| `.pipeline/state.yaml` | `8b97e6df7a2b78469008b776e65bebd6227eb660e6cba2953422aa38f5cf4d17` | 39182 | `1783815360088171556` |

四项 exact facts 在生命周期探针前完全匹配，并在完整回归结束后再次匹配。

### Recovery 连续性

Acceptance fact 正确保留为不可变的历史头：

- acceptance-time Pack chain：4 个节点
- acceptance-time head：`c772da37d5ab512e4886adc7f536aab27280e80960c7cb1d89ac5cda1c41f069`
- acceptance-time Journal/cursor：`18 / sequence 18`

当前 live 状态已经通过一个合法 closure 节点继续前进：

- selected Pack：`44719a4468e478d2eb76a04034b75b487dbf6f9dff21fece53e1e2cd7a3bd624`
- direct parent：acceptance-time head `c772da37...f069`
- 当前 Journal/cursor：`19 / sequence 19`
- 当前 Capsule semantic hash：`51f59eada47e8ce61188580e2a48ec10db24451b25b37c909a616d8981c85fe7`
- Journal warning：`0`
- restore Journal delta：`0`
- rejected Pack：`0`
- pending transaction：`0`

两个 Pack 都验证通过。当前 Journal、Capsule、selected Pack、restore base cursor 和 Continuation 在共享边界上完全相等。Runtime 保持在 `M5 / post_acceptance_validation`。

## 生命周期探针

重复调用使用原批准的 exact request 和 operation ID `c21-m5-bootstrap-acceptance-live-r2`。

| 探针 | 结果 |
|---|---|
| 重复 `acceptBootstrapActivation()` | `status: accepted`、`idempotent: true` |
| Acceptance ref | path 和 semantic hash 不变 |
| Acceptance bytes/size/mtime/ctime | 不变 |
| 完整 `.pipeline` 树 | 1,247 个条目完全不变 |
| Repeat 后 pending transaction | 0 |
| Accepted `rollbackBootstrapActivation()` | `ERR_BOOTSTRAP_ROLLBACK_ACCEPTED` |
| Rollback 被拒绝后的完整树 | 完全不变 |
| Rollback 后 pending transaction | 0 |

这同时证明了两个必需语义：acceptance 不可变且幂等；accepted rollback 会在进入任何破坏性 baseline 逻辑或文件系统 mutation 之前被拒绝。

## 测试设计与结果

| 层级 | 命令 | 结果 |
|---|---|---:|
| Acceptance lifecycle | `node --test core/test/bootstrap-acceptance.test.js` | `41/41` |
| M1 transaction/fence baseline | 5 个 focused M1 文件 | `76/76` |
| M3 recovery baseline | 4 个 focused Recovery 文件 | `49/49` |
| M5 bootstrap/single-writer baseline | 5 个 focused M5 文件 | `64/64` |
| Live Knowledge gate | `node --test core/test/knowledge-opencode-gate.test.js` | `2/2` |
| 完整 Core regression | `node --test core/test/*.test.js` | `983/983` |

所有 suite 都报告 `0 fail / 0 cancelled / 0 skipped / 0 todo`。Focused 合计为 `232/232`；full suite 独立覆盖了仓库的完整测试面。

Acceptance suite 特别覆盖了 pending reader/writer gate、pending immediate rollback、immutable acceptance、accepted rollback precedence、reconciliation、四个 legacy freeze 文件、strict evidence validation、compatibility proof binding，以及 drift/path/symlink 负向反例。

## 静态与暴露面检查

- `core/src` 和 `core/test` 下 `248/248` 个 JavaScript 文件通过 `node --check`。
- `git diff --check` 通过。
- `acceptBootstrapActivation` 从 migration module 和 Core root 暴露。
- `commitBootstrapAcceptanceTransaction` 没有从 Core root 或 workspace-store public barrel 暴露。
- Canonical command map 不包含 Bootstrap 或 migration 命令。
- 在 `cli`、`hooks`、`scripts`、`skills`、`.opencode` 和 `.claude` 中扫描 exact API/internal transaction 及 `/hw:bootstrap|migrate` route，结果为零命中。
- 所有测试完成后再次读取 live workspace，确认 acceptance hash、legacy freeze、selected Pack、Journal event count、零 warning、零 restore delta、零 rejected Pack 和零 pending transaction 均未变化。

## 修改文件与模块

本 worker 没有修改 production code、test、Runtime、Journal、Capsule、Pack、Record、Snapshot、acceptance、checkpoint、binding 或 legacy compatibility 文件。仅新增本证据：

- `.pipeline/reviews/C21/M5/post-acceptance-regression-evidence.md`

## 预期结果

M5 可以在不重开 Bootstrap 实现工作的前提下关闭。主线程应消费本 PASS evidence，生成 M5 completion report 和 Architecture Plan Review，然后写入已授权的 closure event/state，并在开始 M6 前封存一个最终 Recovery Pack。Accepted companion 和冻结的 legacy mirror 必须继续保持不可变。

## 遇到的问题

第一版 live probe 错误地假设 `plan.stage.semantic_hash` 是对“删除 `semantic_hash` 后的完整 rendered stage object”求哈希。Production 实际对受控 semantic projection 求哈希。该 probe 在调用 acceptance 或 rollback 之前就被这条 harness assertion 中止，因此没有造成 workspace 写入，也不是产品失败。修正后的 probe 保留四个根 self-hash 直接检查，并通过 exact idempotent acceptance 调用执行 production stage validator。

没有遗留 product test、integrity check、permission boundary、dependency 或 tool failure。

## 风险与后续

- 本 evidence 在 Pack `44719...d624` 之后生成；按照 worker contract，本 worker 不再为它封存新 Pack。主线程必须把它纳入最终 M5 closure Pack。
- Legacy `state.yaml` mirror 仍显示冻结的 cutover 前 step。这是有意保留的 compatibility data；当前 authority 是 manifest-based Runtime，禁止 dual write。
- 之前记录的 cross-process lease/TOCTOU 和 fsync durability 限制不属于本次接受后回归。没有新证据表明这些风险恶化。
- 在 M5 completion report、Architecture Plan Review、Runtime/Journal/Capsule update 和 final Pack sealing 完成前，不应开始 M6 实现。

## Completion Narrative

- **改动摘要**：独立验证 live accepted Bootstrap 状态和全部接受后回归；Verdict 为 `PASS`，无产品 finding。
- **技术方法**：结合 canonical hash/digest、production reader、whole-tree zero-write snapshot、真实生命周期调用、focused baseline、full regression 和 static/public-surface scan。
- **修改文件/模块**：仅本 evidence report；没有修改产品或 authority module。
- **测试设计**：先验证窄范围 acceptance、transaction、recovery、Bootstrap 和 Knowledge contract，再验证完整 Core suite 和测试后 live 状态。
- **验证结果**：live integrity PASS；focused `232/232`；full `983/983`；syntax `248/248`；无 fail/skip；无越权 route 或 write。
- **预期结果**：主线程记录并封存 closure 后可以关闭 M5 并进入 M6。
- **遇到的问题**：一个关于 stage hashing 的只读 harness 假设在任何生命周期调用前得到修正。
- **风险/后续**：final closure artifact 与 Pack 仍由主线程完成；legacy mirror 保持冻结；既有 durability 风险继续延后。
