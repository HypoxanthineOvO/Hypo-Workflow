# C21-M4 最终独立复审

## 元数据

- Milestone: `C21-M4`
- 审计时间: `2026-07-12T06:29:37+08:00`
- 输出语言: `zh-CN`
- 时区: `Asia/Shanghai`
- Verdict: `PASS`
- Findings: `0 Critical / 0 Warning / 0 Info`
- Audit worker: `/root/m4_reaudit`
- Mode: 全新独立 final-audit identity；严格只读生产、测试、Skill 与 Workflow state，唯一写入为本报告
- 评分尺度: `1=最好`、`5=最差`；adaptive threshold: `3`

## 结论

C21-M4 通过最终复审。初审的 `1 Critical / 2 Warning` 已全部在其正确的生产所有权边界关闭：Init 对不受支持字段和可投影 Brownfield 元数据先行做不回显门禁；命令 Router 不再信任 symlink `repoRoot`，并以真实根锚点逐级验证 backend；Direct Legacy Inspector 在读取任何可选叶子前先验证 `.pipeline` ancestor。

独立 focused suite 为 `44/44`。额外 `/tmp` 反证覆盖输入 descriptor、Clock/路径顺序、更多 metadata 变体、Router 根锚点、Legacy ancestor、manifest-last 中断恢复以及 M2/M3 派生重建，均未推翻实现。父线程记录的 full `904/904`、M1 `76/76`、M2 `61/61`、M3 `47/47`、lifecycle log `7/7` 与当前代码、测试、evidence 和 Workflow state 一致；本 worker 按授权未重复 full suite。

因此 M4 可以生成 Milestone completion report，进入 Architecture Plan Review，并在确认 M5 prompt 无需或完成必要 patch 后推进到 C21-M5。M8 Deletion Manifest 前仍不得清理旧 Skill、命令或 adapter 资产。

## Findings

没有发现达到 `Critical`、`Warning` 或 `Info` 级别的新问题。以下 closure matrix 不是新 finding，而是对初审问题的累计关闭证明。

## 初审 Closure Matrix

| 初审 finding | 生产关闭点 | 测试与独立反证 | 结果 |
| --- | --- | --- | --- |
| Critical: Brownfield sensitive/hidden metadata 与 unknown-key echo | `core/src/init/index.js:61-63` 在解析 root、Clock 和 transaction 前先规范化请求；`193-230` 以 `Reflect.ownKeys` 和 descriptor 白名单拒绝 unknown/symbol/accessor/non-enumerable 字段且不回显；`404-440`、`443-489`、`506-527`、`547-627` 在 fact/source ref/Record 编译前门禁路径、root/package name 与递归 package keys | Focused 覆盖 3 个可投影 metadata case、2 个 unknown-key case、合法 `password-policy.md`/`reasoning-summary.md` 与未扫描 metadata 不投影；独立探针另验 6 种 request/options descriptor case 和 5 种 path/root/package metadata case，Clock、root coercion、getter 调用均为 `0`，无 `.pipeline` 写入 | `CLOSED` |
| Warning: Router 信任 symlink `repoRoot` | `core/src/commands/index.js:230-286` 要求 root 存在、是 ordinary non-symlink directory，建立 `realpath` anchor，并逐级要求目录/最终文件类型、non-symlink 与 containment；诊断不包含 target path | Focused 覆盖 symlink root、missing backend、child directory/file symlink 与 near-prefix；独立探针确认 symlink root 的 route 为 `unavailable`、`writes: []`、discovery 为 `[]` 且不泄露 target，regular-file root 同样不可用 | `CLOSED` |
| Warning: Direct Legacy Inspector 未验证 `.pipeline` ancestor | `core/src/migration/legacy-inspector.js:15-55` 在任何 leaf loop 前验证 workspace root 和 `.pipeline` 的存在、directory 类型、non-symlink 与真实 containment；missing 与 forbidden 使用不同错误码 | Focused 覆盖 empty/populated external target symlink、leaf symlink、malformed 与 missing optional leaves；独立探针确认 missing 为 `ERR_LEGACY_WORKSPACE_NOT_FOUND`，symlink/non-directory 为 `ERR_LEGACY_EVIDENCE_FORBIDDEN`，普通 legacy 只返回实际存在的 state 且 bytes/目录清单不变 | `CLOSED` |

## 审计方法与范围

- 将 M4 prompt 和 C21 architecture 映射为 Init transaction、workspace classification、evidence safety、Legacy zero-write、Registry availability、progressive Skill、platform boundary 七组不变量。
- 静态追踪 request/metadata 到返回值、Record、index、Capsule 和 transaction 的完整数据流，而非只检查错误码或文案。
- 独立运行四个 focused test 文件；安全探针只在自建 `/tmp` workspace 中执行。
- 交叉审阅初审、test evidence、implementation evidence、当前 production/test/Skill 内容、M4 worker lifecycle 和父线程最终 GREEN 记录。
- 审阅 M1 transaction、M2 Runtime/Record、M3 Capsule 的被调用边界；不重新审计已经独立通过的整个 M1-M3 实现。
- 检查 dirty worktree、protected file hash、Root/Init/Guide 尺寸、Core exports、Registry counts、Skill quality、syntax、diff、TODO/FIXME 与高置信度凭据样式。

## 通过的功能与架构边界

### Init 与 Workspace Adoption

- `/hw:init <intent>` 通过 `initializeWorkspace(...)` 编译 intent；无非空 intent 时返回唯一 `init_outcome` Ask，既不使用固定轮次，也不声称已初始化。
- Empty 与 unmanaged brownfield 都通过一次 M1 transaction 写入 Runtime、Continuation、reference-only active pointer、两条 Record、两个派生 index 和 Capsule，manifest 最后激活。
- Current 返回磁盘上已验证的 manifest；mixed 明确报告 legacy residue；damaged current 以 repair/restore guidance fail closed；legacy 只进入 raw inspector。上述非写路径均不回退旧 writer。
- Brownfield 只扫描声明的 root metadata 与 `src/app/lib/test/tests` 有界范围。所有被投影 fact 都有 `basis`、合法 confidence 和真实 repo-relative source ref；inference 不伪装成 confirmed，也不推断无证据技术栈。
- 合法安全/推理文档名称不会被关键词误伤；扫描范围外的 metadata 不进入返回值、Record、index 或 Capsule，Init 也没有扩张为全仓 secret crawler。

### Manifest-last 与派生重建

- 独立 `before_manifest_activation` fault 证明 data 已安装而 manifest 尚不存在；第二次 Init 被 `ERR_WORKSPACE_TRANSACTION_PENDING` 阻断，原 transaction 可 `rolled_forward`，最终 workspace 为 current。
- Init 生成的 `index.yaml`、`INDEX.md` 通过 M2 `rebuildRecordIndexes(...)` 后与原字节一致。
- Init 生成的 empty-Journal Capsule 通过 M3 `rebuildContextCapsule(...)` 后与原字节一致。
- Init 没有生成 Goal/Cycle、Snapshot、Receipt、Journal event、Recovery Pack、legacy config/state/cycle/log/rules 或平台 adapter/global registry 输出；`initial_snapshot` 明确为 `null`。

### Legacy Read-only

- Inspector 只读取存在的 `.pipeline/{state,cycle,config,continuation,log}.yaml`，不调用 default-filled config loader。
- 普通证据带 SHA-256 和 raw parsed document；malformed evidence 只返回 sanitized unreadable code，不制造默认 authority。
- Root、`.pipeline` ancestor 和每个 leaf 都经过 non-symlink/type/containment 检查；所有审计路径零写，外部 sentinel、bytes 和目录清单保持不变。

### Registry、Router 与 Skill

- 当前分层为 `54 canonical / 53 legacy inventory / 2 discoverable`。Goal 存在于 canonical/router，但因无 Child Skill backend 而不进入 legacy physical inventory。
- Discovery 只返回 `/hw:guide` 与 `/hw:init`；public-planned、contextual、internal、deferred 和 removed route 都不会伪装成可执行能力。
- 三种 namespace、trailing arguments 和最长命令优先级保持兼容；unknown/non-available 结果提供明确状态、message 和 `writes: []`。
- Root Skill 为 `105` 行 / `7,183` bytes；Init 为 `75` 行 / `4,048` bytes；Guide 为 `54` 行 / `3,346` bytes。Root 是索引而不是第二份完整手册，Init/Guide 只加载所需语义。
- `checkSkillQuality(...)` 为 `0 issues across 45 Skill files`。旧 Skills 的物理存在属于 M8 前的兼容库存，不会绕过 Registry availability。
- Root/Init/Guide 没有恢复 Setup、Rules、global registry、adapter sync 或 `min_rounds` 写入语义；Root 只保留明确的禁止说明。

### 平台与删除边界

- M4 没有新增 CLI、platform generator、plugin manifest 或 adapter 支持声明。`discoverableCommandMap(...)` 是平台中立投影，不能把 metadata projection 等同于平台适配完成。
- 旧 generator 继续消费 53-entry `commandMap()` 只是兼容边界；它不读取不存在的 Goal backend。新 runtime discovery 与旧 physical inventory 已明确分离。
- 本 Milestone 没有删除旧 Skill、命令、测试或 adapter 资产。任何实际 cleanup 仍由 M8 Deletion Manifest、hash drift 复核和独立批准控制。

## Validation

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| 独立 M4 focused | `44/44` PASS | 4 files，0 fail，0 skip |
| 独立 input/metadata falsification | PASS | 6 个 unknown/descriptor case；5 个 Brownfield path/root/package case；Clock/root/getter 均未在拒绝前触发 |
| 独立 Router falsification | PASS | symlink root、ordinary root、regular-file root；外部 target 不泄露 |
| 独立 Legacy falsification | PASS | missing、empty/populated symlink、non-directory、ordinary missing-leaf control，共 5 类 |
| 独立 transaction/rebuild | PASS | pre-manifest pending gate + roll-forward；两个 Record index 与 Capsule byte-identical |
| Core M4 exports | `4/4` | Init、Legacy Inspector、Router、Discovery |
| Command layers | `54 / 53 / 2` | canonical / legacy inventory / discoverable |
| Skill quality | `0 / 45` | 0 issue across 45 Skill files |
| Root Skill size | `105 / 7,183` | lines / bytes，低于 320 / 18,000 上限 |
| Syntax + diff | PASS | 4 个 production entry `node --check`；`git diff --check` |
| Config + hygiene | PASS | `zh-CN` / `Asia/Shanghai` 可解析；scoped TODO/FIXME 和高置信度 credential scan 无命中 |
| 父线程 full | `904/904` PASS | evidence reviewed；本 worker 未重复 full |
| 父线程 compatibility | M1 `76/76`、M2 `61/61`、M3 `47/47`、log `7/7` | evidence/current state 一致 |

## Scoring

| Dimension | Score | 理由 |
| --- | ---: | --- |
| `diff_score` | 2 | 改动较大但严格落在 M4 声明模块、focused Skills 与兼容 Registry 边界 |
| `code_quality` | 2 | 校验、扫描、编译、transaction 与 route ownership 清楚；错误 envelope 稳定且无输入回显 |
| `test_coverage` | 1 | 真实 filesystem、fault injection、symlink、metadata、zero-write、rebuild 与 full regression 均有证据 |
| `complexity` | 2 | Init scanner 具有必要复杂度，但范围、深度、文件数、类型和派生方向均被限制 |
| `architecture_drift` | 1 | 复用 M1-M3 authority，不扩展 Record kinds，不伪造 Goal/Snapshot，不提前实现 adapter 或 cleanup |
| **overall** | **2** | 低于 threshold `3`；无阻断 finding |

## Worker Separation

- Test identity: `/root/m4_test`，scope 为四个 M4 tests、fixture 与 test evidence；最终 `TEST_REVISION_3_READY`，closed。
- Implement identity: `/root/m4_implement`，scope 为 M4 production/Skill 与 implementation evidence；最终 `IMPLEMENTED_REVISION_4`，closed。
- Initial audit identity: `/root/m4_audit`，只读发现 `1 Critical / 2 Warning`；最终 `NEEDS_CHANGES`，closed。
- Final audit identity: `/root/m4_reaudit`，此前未参与 test/implement/initial audit；只读累计复审，唯一写入本报告。
- Main agent 负责 focused/full orchestration与 protected Workflow lifecycle 更新。四种身份及其文件所有权、时间线和 evidence ref 在 `.pipeline/state.yaml`/`log.yaml` 中一致，没有 silent downgrade。

## Dirty Worktree 与 Protected Files

- 审计开始后、写报告前，排除本报告路径的 `git status --short --untracked-files=all` SHA-256 为 `3de394504e9610d87e536a327615950b9eb575054e3e4ee9c979a10802f887ef`。
- Protected file 写入前 SHA-256：
  - `.pipeline/state.yaml`: `c7854d158982d99af6b85ccbda90aeee968a6cf8df81170e7e21603cb711aef9`
  - `.pipeline/cycle.yaml`: `ff3f4ab3df02073182453f03d6f95a84d287e684a1d2714484a8a21b0f6def98`
  - `.pipeline/log.yaml`: `b118ada5232f219fee74071a042ed30d5fde9a9d78c96a61d5b294f9c8c76036`
  - `.pipeline/PROGRESS.md`: `db424a3fdf7821ced968e4a04459525eb9833fe459f2fcd22f9817ac328852f4`
- 报告写入后复核结果：上述 status hash 与四个 protected hashes 保持一致。
- 所有可写反证均在自建 `/tmp` 目录；没有 reset、checkout、clean、revert、依赖安装、网络、remote、service restart 或 repository cleanup。既有 dirty changes 未被修改或清理。

## Residual Risks

1. M1 pristine rollback 仍可能保留空 `.pipeline/runtime/transactions/` ancestor directory；authority/data files 已恢复。这是已认证的 filesystem residual，不是 M4 新 writer。
2. 一个真正不存在的项目 root 需要在 inner `.pipeline` transaction 外创建；无 input 和无效 input 不创建 root，有效 write intent 才创建。
3. Brownfield evidence 是有限、浅层、可解释的 adoption scan，不是 Architecture discovery 或通用 secret scanner。未扫描 metadata 的安全保证是不投影，而不是全仓拒绝。
4. Secret/hidden label 检查使用有限声明语料；它保证已声明样式在所有可投影 metadata surface 一致生效，不声称识别任意秘密或同义表达。
5. `lstat`/`realpath`/read 之间仍有一般 filesystem TOCTOU；当前契约正确建立 non-symlink root/ancestor 与 containment，但不提供跨进程文件锁或硬件级不可变性。
6. Manifest 激活前中断态由 pending transaction marker 而非 workspace-class 名称表达；Host 应先恢复 pending transaction。独立探针证明并行 Init 被阻断且 roll-forward 正确。
7. Legacy Inspector 有意返回本地 raw parsed evidence；后续 migration/curation 不得把 raw document 整体写入新 Record 或用户可见日志，必须继续经过 secret/hidden-context gate。
8. 旧 53-entry generator inventory 会保留到 M8 cleanup；新 runtime 必须继续只消费 availability-filtered discovery，不能重新把 legacy inventory 当作 capability map。

## Completion Narrative

- **改动摘要:** 本 final audit 没有修改生产代码、测试、fixtures、Skills、package/config 或 Workflow state；唯一新增 `.pipeline/reviews/C21/M4/final-audit.md`。Verdict 为 `PASS`，无 findings。
- **技术思路:** 先把 prompt/architecture 转换为 authority 与安全不变量，再逐条追踪初审 finding 的输入、文件系统、返回与派生数据流；最后用独立 focused 和 `/tmp` 反证尝试推翻 closure。
- **审阅模块:** `core/src/init/`、`core/src/migration/{legacy-inspector,index}.js`、`core/src/commands/index.js`、`core/src/index.js`、M1 transaction/M2 Records/M3 Capsule 接口、Root/Init/Guide Skills、四个 M4 tests、fixtures、三份 M4 evidence 和 Workflow worker state。
- **测试设计:** 真实临时目录覆盖 workspace classes、metadata gate、own-property descriptors、Clock/路径顺序、symlink roots/ancestors、zero-write、manifest-last fault/pending recovery、Record/Capsule byte rebuild 和 command discovery；仓库回归使用父线程 full/M1-M3/log 证据交叉核对。
- **验证结果:** 独立 focused `44/44` 与全部额外反证通过；父线程 full `904/904`、M1 `76/76`、M2 `61/61`、M3 `47/47`、log `7/7`；4 exports、`54/53/2`、Skill quality、syntax/diff/config/hygiene 全部通过。
- **预期结果:** 用户可以安全初始化 empty/brownfield 仓库、只读识别 legacy/current/damaged/mixed 状态，并只看到真正可执行的 Guide/Init route；中断事务可恢复，派生 index/Capsule 可确定性重建。
- **遇到的问题:** 一个自建探针曾错误预期 pre-manifest 临时态会被分类为 `legacy`；当前 detector 实际返回 `unmanaged_brownfield`，而 M1 pending marker 才是恢复 authority。修正探针后，第二次 Init 被 pending gate 阻断且原事务成功 roll-forward，确认这是探针预期错误而非产品缺陷。
- **风险/后续:** 保留上述 transaction directory、missing-root、bounded scan、finite corpus、TOCTOU、raw legacy evidence 和 legacy inventory 风险。下一步由主线程生成 M4 completion report、执行 Architecture Plan Review、确认 M5 prompt，并继续禁止 M8 前 destructive cleanup。
