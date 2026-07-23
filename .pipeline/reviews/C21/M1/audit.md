# C21-M1 独立审计报告

## 元数据

- Milestone: `C21-M1`
- Verdict: `NEEDS_CHANGES`
- Audit worker: `/root/m1_audit`
- Worker mode: 严格只读
- Trigger: `review_code`
- Threshold: `3`
- Audit diff score: `4`

## 结论

M1 的模块边界、正常事务顺序、六类格式识别、路径 guard、显式导出和声明内 14 类 fence 接线整体清楚；规定的 focused suite 为 `52/52`，主线程记录的完整回归为 `728/728`。

但反例验证发现四项阻断问题：

1. 成功提交路径可以在数据漂移或 staged 文件被篡改后继续激活 manifest。
2. 恢复逻辑可以在 manifest 已丢失时错误返回 `finalized` 并删除恢复证据。
3. 不同 transaction id 可以越过 pending transaction。
4. 14 类 inventory 漏掉了可公开调用的真实 writer，valid manifest 不能阻止这些入口写入。

因此 M1 尚未建立“唯一可写边界”，不能进入完成状态。`diff_score=4` 超过配置阈值 `3`，验收门槛未通过。

## 范围与方法

审计读取并交叉核对：

- `.pipeline/prompts/00-workspace-format-transaction-kernel-and-legacy-write-fence.md`
- `.pipeline/architecture.md`
- M1 production/test diff
- test 与 implementation evidence
- `.pipeline/state.yaml` 及相关 log/progress
- transaction、format detector、manifest、path guard、legacy writer 与 CLI/Hook 链源码

验证方法包括：

- prompt 指定的五文件 focused suite
- `git diff --check`
- JavaScript 与 Shell 语法检查
- 公开导出和 filesystem mutation 静态扫描
- 仅在 `/tmp` 中运行事务漂移、恢复异常、不同 id 和 writer 旁路反例

审计 worker 没有修改任何工作区文件。

## 阻断 Findings

### B1：成功提交没有执行 hash precondition 和最终一致性检查

证据：

- `core/src/workspace-store/transaction.js:72` 开始直接安装数据。
- `core/src/workspace-store/transaction.js:82` 随后进入 manifest 激活。
- `core/src/workspace-store/transaction.js:270` 的安装函数没有验证 marker 中的 staged hash，也没有验证目标仍匹配 old/staged hash。

最小反例：

1. 在 `before_manifest_activation` fault hook 中将目标改成外部内容但不抛错，transaction 仍返回 `ok: true` 并激活 manifest。
2. 在 `after_prepare` 中改写 `staged/0000` 但不抛错，transaction 成功安装被篡改后的内容。

修复要求：

- 每次安装前验证 staged 文件 hash。
- 安装前验证目标仍匹配记录的 old/staged precondition。
- manifest 激活前重新验证完整 write set。
- 任一不匹配必须保留事务证据并 fail closed。

### B2：`manifest_activated` marker 可以掩盖 manifest 丢失

证据：`core/src/workspace-store/transaction.js:153` 使用 marker status 或 manifest 状态的析取条件进入 finalize；marker 为 `manifest_activated` 时，不要求磁盘 manifest 实际匹配 staged hash。

最小反例：

1. 在 `after_manifest_activation` 中抛错，留下 pending transaction。
2. 删除刚激活的 manifest。
3. 调用 recovery。
4. recovery 返回 `finalized` 并删除事务目录。
5. 数据保持 staged，但 manifest 不存在，格式退化为 `unmanaged_brownfield`。

修复要求：

- finalize 必须同时满足全部数据和 manifest 都匹配 staged hash。
- marker status 只能作为提示，不能替代磁盘事实。
- manifest 为 old/missing 时，应在完整校验后 roll forward，或 fail closed。
- 不得在确认 authority 完整前删除事务证据。

### B3：不同 transaction id 可以越过 pending transaction

证据：`core/src/workspace-store/transaction.js:43` 只检查当前 id 的目录是否存在，没有 workspace 级 pending/lease 检查。

最小反例：

1. `tx-a` 安装数据后在 manifest 激活前中断。
2. 使用不同 id 和不同 manifest 启动 `tx-b`。
3. `tx-b` 成功提交。
4. workspace 同时包含 `tx-a` 的未提交数据和 `tx-b` 的 authority manifest。
5. `tx-a` 随后因 manifest hash drift 无法恢复。

修复要求：

- 一个 workspace 同时只允许一个 prepared/installing transaction。
- 新提交前枚举 pending transactions，并要求先恢复或显式解决。
- 测试不同 id、重叠与非重叠 write set、不同 manifest 的组合。

### B4：writer inventory 不完整，公开入口可以绕过 fence

`core/src/workspace-format/index.js:25` 与 `core/test/legacy-write-fence.test.js:32` 使用同一份手工 14 项清单，因此现有测试只能证明清单内 writer 被拒绝，不能证明清单完整。

已复现旁路：

| 入口 | 源码证据 | 结果 |
|---|---|---|
| `writeConfig` | `core/src/index.js:7`, `core/src/config/index.js:778` | valid manifest 下写入 `.pipeline/config.yaml`，workspace 变成 mixed |
| `writeOpenCodeArtifacts` | `core/src/index.js:120`, `core/src/artifacts/opencode.js:113` | 嵌套 rules fence 报错前已经写入 `opencode.json` 和 `.opencode/` |
| `repairDocs` | `core/src/index.js:459`, `core/src/docs/index.js:233` | valid manifest 下成功生成 25 个文档文件 |

源码确认的同类公开 surface 还包括：

- `writeClaudeCodePluginArtifacts`
- `writeClaudeCodeAgentArtifacts`
- `writeThirdPartyAdapterArtifacts`
- `writeCursorSkillBundle`
- `syncSelectedProjectAction`
- `applyConfigTuiEdit`
- `updateReadme`

修复要求：

- 从公开导出与直接 filesystem mutation graph 重新建立 inventory。
- fence 必须位于最外层公开 writer，并在第一次 `mkdir`、`rm`、`writeFile` 或 remote mutation 前执行。
- 被 fenced 的上层 orchestrator 不能替代对公开低层 generator 的保护。
- generic ledger 与 global-only maintenance/config writer 需明确分类，避免把项目 writer 与全局 writer 混为一谈。

## Warning

### W1：不存在的 root 没有 canonical detector 语义

`core/src/workspace-format/index.js:64` 对不存在 root 抛出 `ENOENT`。CLI Init 已通过先创建 root 恢复兼容，但 `detectWorkspaceFormat()` 自身对新项目路径的协议仍未定义完整。

建议明确：不存在 root 是否应零写返回 `empty`；若不采用该语义，应返回结构化 missing classification 并由 Init 显式处理。

### W2：现有测试用同一手工清单证明清单完整

`core/test/legacy-write-fence.test.js:32` 硬编码与生产相同的 14 项，并主要直接调用 central fence。transaction tests 也只覆盖抛错后的 drift recovery，没有覆盖成功路径中的无抛错漂移、staged 篡改、manifest 丢失和不同 id pending。

修订测试必须调用真实公开 writer 并比较写入前后字节/树状态。

## 事务评估

已通过：

- 正常路径确实先安装全部数据，再激活 manifest。
- prepare、部分 install、全部 install、activation 后 fault 的既有测试通过。
- recovery 路径会检查 marker、staged 和 backup hash。
- traversal、absolute escape、reserved transaction path 和现存 symlink escape 被拒绝。
- damaged manifest 阻断新事务。
- M1 没有提前加入 Record、Receipt、Journal、Capsule 或 Recovery Pack 语义。

未通过：

- commit 成功路径不验证 prepared hash。
- manifest activation 前没有最终一致性检查。
- marker status 可以覆盖磁盘 manifest 事实。
- 没有 workspace 级单写约束。

所以“manifest activation last”在操作顺序上成立，但“manifest 激活代表经过验证的完整数据集”并不成立。

## 声明内 Writer 覆盖

以下 14 类的现有接线本身通过：

| Writer | Fence 证据 | 结论 |
|---|---|---|
| lifecycle | `commit.js:13` | 通过 |
| acceptance | `acceptance/index.js:143,203,303` | 通过 |
| continuation | `continuation/index.js:39` | 通过 |
| log | `log/index.js:159` | 通过 |
| compact | `compact/index.js:37` | 通过 |
| sync | `sync/index.js:46,145,221,385` | 声明入口通过 |
| rules | `rules/index.js:322,432` | 通过 |
| knowledge | `knowledge/index.js:318,334,352,363` | 通过 |
| patches | `patches/index.js:15,39,62` | 通过 |
| explore | `explore/index.js:10,122,158,221` | 通过 |
| deep-plan | `deep-plan/index.js:57,133,205,244,460,514,634,767` | 通过 |
| PR | `pr/index.js:88,173,394,437,464,480,502,527` | 通过 |
| CLI init | `cli/bin/hypo-workflow:220` | 项目根创建后、任何 `.pipeline` 写入前拒写 |
| Codex notify/log | `codex-notify.sh:31,54`, `log-append.sh:69` | 通过 |

问题不是这些入口未接线，而是“它们已经构成全部 writer surface”的前提不成立。

## Worker Separation

三个身份独立：

- test: `/root/m1_test`
- implement: `/root/m1_implement`
- audit: `/root/m1_audit`

可见 diff 与声明范围一致：test worker 只改三个 M1 测试与 test evidence；implement worker 修改 M1 production surface 与 implementation evidence；audit worker 保持只读。

限制：共享 worktree 与 worker 自报 evidence 不能形成不可抵赖的 transcript 证明，但当前可见证据支持角色分离。

## Dirty Worktree

M1-owned 变化集中于新 kernel 模块、三个 M1 测试、声明 writer 的小范围 fence 接线、CLI/notify/log 链及 config/root export 兼容改动。C21 planning、pipeline、archive/audit、adapter metadata、`PROJECT-SUMMARY.md`、`redskill-package/` 等现有脏变化仍保留。

审计没有执行 reset、cleanup、无关回退或大范围重写。由于缺少不可变的 pre-M1 worktree snapshot，归属判断依赖 state scope 与 focused diff，而非加密证明。

## 验证结果

- Prompt focused suite: `52/52` 通过
- 主线程完整回归: `728/728` 通过
- `git diff --check`: 通过
- JavaScript/Shell syntax: 通过
- 声明内 14 类 fence: 通过
- Inventory 完备性: 失败
- Transaction falsification: 失败，四类反例稳定复现
- Missing-root detector: 失败，返回 `ENOENT`

## 评分

量表方向：`1=最好，5=最差`。

| 维度 | 分数 | 理由 |
|---|---:|---|
| `diff_score` | 4 | transaction 与 writer fence 两个核心目标存在严重偏离 |
| `code_quality` | 4 | 模块清楚，但 authority/integrity invariant 可被实际反例突破 |
| `test_coverage` | 3 | 主路径充分，关键成功路径反例与真实 writer 入口未覆盖 |
| `complexity` | 3 | 复杂度与事务问题规模基本匹配 |
| `architecture_drift` | 4 | “唯一 authority + legacy fail-closed”核心约束尚未成立 |
| `overall` | 4 | 按 TDD 默认权重计算并四舍五入 |

阈值为 `3`；当前 acceptance threshold 未通过。

## Completion Narrative

- **Change Summary**: 独立审计确认 M1 基础实现与现有回归均为 GREEN，但复现四类 authority/integrity blocker，结论为 `NEEDS_CHANGES`。
- **Technical Approach**: 结合源码/测试/worker evidence 审查、公开 writer 静态扫描，以及 `/tmp` 真实文件系统反例验证。
- **Modified Files / Modules**: 审计 worker 未修改文件；主协调者仅将返回结果持久化到本报告。
- **Test Design**: 对 commit 成功路径漂移、staged 篡改、manifest 丢失、不同 transaction id 和公开 writer 旁路进行对抗性验证。
- **Validation Results**: focused `52/52`、full `728/728` 仍通过，但四类新增反例失败，证明现有测试不足以满足 M1 目标。
- **Expected Result**: 修订后任何 hash/manifest/pending transaction 漂移都 fail closed，且所有项目级公开 writer 在第一次 mutation 前统一拒写。
- **Problems Encountered**: writer surface 较大，generic/global/test-only writer 尚未全部分类；按主协调者要求停止无限穷举并保留 residual risk。
- **Risks / Follow-Up**: marker 原子性、filesystem TOCTOU、manifest identity replacement 与剩余 writer 分类需要在修订审计继续核对。

## 下一步

1. test worker 将上述反例固化为真实文件系统 RED 测试。
2. implement worker 修复 transaction invariant 与完整 writer fence，不读取测试源。
3. 重新运行 focused/full GREEN。
4. 使用新的独立 audit identity 复审，而不是让本 worker认证修复。
