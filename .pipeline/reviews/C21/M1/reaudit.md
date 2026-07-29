# C21-M1 Revision 3 独立复审报告

## 元数据

- Milestone: `C21-M1`
- Verdict: `NEEDS_CHANGES`
- Audit worker: `/root/m1_reaudit`
- Mode: 严格只读
- Findings: `1 Critical / 0 Warning / 1 Info`
- Threshold: `3`
- Diff score: `4`

## 结论

Revision 3 已实质关闭首轮审计中的全部已知 blocker：

- staged tamper 与 target drift 会 fail closed；
- recovery 以磁盘 hash 而非 marker status 为准；
- old/missing manifest 可在完整 data set 已 staged 时 roll-forward；
- 不同 transaction id 会在 staging 前被拒绝；
- missing root 零写返回 `empty`；
- writer inventory 已扩展为精确 `22/22`；
- global config、registry、TUI、maintenance 与 generic ledger 保持可写。

本轮主动反证仍发现一个新的事务完整性 blocker：互为祖先/后代的两个 write path 会造成已安装父文件、未激活 manifest、且 recovery 无法执行的状态。M1 的核心目标是可恢复多文件事务，因此即使 focused `73/73` 和主线程 full `749/749` 都为 GREEN，也不能通过验收。

## 审计方法

复审读取并交叉核对 M1 prompt、架构、初审报告、Revision 3 implementation/test evidence、公开导出、事务/路径/manifest 模块、22 类 writer、focused tests、state/log/progress 与 scoped diff。

验证只在 `/tmp` 写入，包含：

- 首轮 blocker 重放；
- transaction disk-fact decision table；
- bounded public mutation export 分类；
- global writer exemption smoke；
- prefix-collision 独立反例；
- focused suite、diff、syntax 与 config checks。

复审 worker 未修改仓库文件。

## Blocker 关闭矩阵

| 项目 | 结论 | 关键证据 |
|---|---|---|
| staged 文件 prepare 后被篡改 | 已关闭 | `transaction.js:79,299-326,380-386` |
| manifest 激活前 target drift | 已关闭 | `transaction.js:82-103` |
| marker status 替代磁盘事实 | 已关闭 | `transaction.js:174-212` |
| 不同 transaction id 越过 pending | 已关闭 | `transaction.js:37-43,392-408` |
| missing root 产生 `ENOENT` | 已关闭 | `workspace-format/index.js:52-55` |
| inventory 漏掉公开 project writers | 已关闭 | `workspace-format/index.js:25-48`, 22/22 unique |
| global writer 被错误围栏 | 已关闭 | 独立 global exemption smoke |
| prefix-colliding write set | **新 blocker** | `transaction.js:58-62,81-92,174-178,410-430` |

## Critical Finding

### C21-M1-RA-001：祖先/后代路径导致不可恢复的部分安装

`normalizeWrites()` 只检查完全重复路径，没有验证 write set 是否 prefix-free。以下两个路径分别都通过初始 path guard：

```text
.pipeline/runtime/node
.pipeline/runtime/node/child.txt
```

事务随后：

1. 完成 prepare。
2. 将第一个 staged 文件安装为 `runtime/node`。
3. 校验第二个路径时发现 `runtime/node` 已是文件，返回 `ERR_WORKSPACE_PATH_FORBIDDEN`。
4. manifest 保持未激活，但父文件与 transaction evidence 已留在磁盘。
5. recovery 枚举第二个路径时再次返回相同错误，无法 rollback。
6. 后续 transaction 被 pending gate 阻断。

独立 `/tmp` 复现：

```text
commit:   ERR_WORKSPACE_PATH_FORBIDDEN
recovery: ERR_WORKSPACE_PATH_FORBIDDEN
parent:   "parent-file\n"
manifest: absent
evidence: retained
```

影响：这直接违反 M1 的 recoverable multi-file transaction 核心契约。

修复要求：

- 在任何 staging、mkdir 或目标 mutation 前验证规范化 write set。
- 当前 write entries 都表示文件，因此任意 `b.startsWith(a + "/")` 的路径对必须被拒绝。
- 覆盖父路径在前与子路径在前两种顺序。
- 拒绝后工作区树必须完全不变，不得创建 transaction 目录或 manifest。
- 使用稳定、明确的 transaction input/path-conflict error code；不得依赖安装中途的 filesystem error。

## 事务决策评估

| 场景 | 当前结果 |
|---|---|
| 正常 prefix-free commit | 通过，manifest 最后激活 |
| after prepare 中断 | 通过，rollback |
| prefix-free partial install | 通过，rollback |
| all data staged、manifest absent/old | 通过，roll-forward |
| data + manifest staged | 通过，finalized |
| staged tamper | 通过，conflict 且保留 evidence |
| target drift | 通过，保留外部字节 |
| competing id | 通过，staging 前拒绝 |
| damaged manifest | 通过，fail closed |
| traversal / existing symlink escape | 通过 |
| ancestor/descendant write paths | **失败，部分安装后不可恢复** |

Revision 3 已建立正确的 hash/disk-fact decision table，但 write-set 结构验证仍不完整。

## Writer 覆盖与分类

Inventory 当前为精确 `22 entries / 22 unique ids`。原 14 类 lifecycle writer 与新增 8 类 project writer 均在公开入口第一次 mutation 前 fence。

新增入口包括：

- project `writeConfig`；
- OpenCode generator；
- Claude plugin/agent generators；
- third-party/Cursor generators；
- Docs repair；
- README write；
- selected-project sync；
- project-target TUI config。

Bounded public-export scan 未发现新的 manifest workspace 旁路。CLI Init 与 notify/log shell chain 也在第一次项目 mutation 前调用 central fence。

以下按既有 contract 归为 global-only：

- user/global config migration；
- registry CRUD 与 global model pool；
- global TUI；
- maintenance/event/notification stores；
- generic JSONL ledger helpers。

独立 `/tmp` smoke 证明 global TUI config、registry、maintenance ledger 与 generic ledger 仍可写。

## 验证结果

- Focused M1: `73/73`，复审独立重跑。
- Full regression: 主线程记录 `749/749`；按收敛要求未重复执行。
- `git diff --check`: 通过。
- JavaScript/Shell syntax: 通过。
- `scripts/validate-config.sh`: 通过。
- Inventory: `22/22` unique，0 missing。
- Global exemption smoke: 通过。
- Prefix collision falsification: 稳定失败，确认 blocker。
- 显式 exports 与 YAML compatibility: 通过。
- M2 runtime/records/receipts/snapshots/recovery 语义: 未进入 M1。

## 评分

量表为 `1=最好，5=最差`。

| 维度 | 分数 | 理由 |
|---|---:|---|
| `diff_score` | 4 | 核心事务目标仍有可复现的不可恢复状态 |
| `code_quality` | 3 | 结构清晰，缺口集中于 write-set invariant |
| `test_coverage` | 3 | 73 项覆盖较强，但缺少路径集合结构反例 |
| `complexity` | 3 | 复杂度与事务职责基本相称 |
| `architecture_drift` | 4 | “所有合法事务均可恢复”尚不成立 |
| `overall` | 4 | Critical finding 独立阻断 |

## Worker Separation

可见身份彼此独立：

- test: `/root/m1_test`
- implement: `/root/m1_implement`
- initial audit: `/root/m1_audit`
- re-audit: `/root/m1_reaudit`

Agent tree、state 与 evidence 显示角色 scope 没有可见重叠；本次 re-audit 严格只读。共享 worktree 与 worker 自报 evidence 仍不能构成不可抵赖 transcript 证明，但当前证据支持角色分离。

## Dirty Worktree

复审没有修改任何仓库文件，所有 smoke 仅使用 `/tmp`。既有 C21 planning、pipeline、用户修改、M1 production/test 与其他未跟踪内容均保留；没有执行 reset、checkout、clean、删除或无关回退。

## 残余风险

以下不作为本轮新 blocker：

- pending-directory enumeration 与 hash-check-to-rename 的跨进程 TOCTOU；
- legacy fence check 与第一次 mutation 之间的竞态；
- marker 缺少 fsync 与原子替换，损坏时可能需要人工处理；
- generic global path helper 缺少强 ownership type。

这些超出当前确定性单进程 M1 contract，应进入后续 locking/path-ownership 设计。

## Completion Narrative

- **Change Summary**: 只读复审关闭七项既有 blocker，但发现一项新的 Critical transaction blocker；结论为 `NEEDS_CHANGES`。
- **Technical Approach**: 从 prompt/架构契约、公开导出、磁盘事实 decision table 与真实 `/tmp` 反例验证 authority/recovery。
- **Modified Files / Modules**: 审计未修改文件；审阅 workspace store/format、manifest/serialization、22 类 writer、测试与 workflow evidence。
- **Test Design**: 重跑 focused suite，并独立构造 global exemption 与 prefix-collision 反例。
- **Validation Results**: focused 73/73、主线程 full 749/749、静态检查均通过，但 prefix collision 仍产生不可恢复部分安装。
- **Expected Result**: 修复后所有 write set 在 staging 前完成结构验证；不合法组合零写失败，所有已 prepare 的合法事务均可 commit 或确定性恢复。
- **Problems Encountered**: 无权限、工具或 secret-safety 问题；full regression 按收敛要求未重复运行。
- **Risks / Follow-Up**: test worker 增加双顺序 prefix-collision RED；implement worker加入 prefix-free validation；GREEN 后由第三个独立 audit identity 复核。
