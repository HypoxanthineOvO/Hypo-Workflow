# Test Design: Concurrent Work Placement Integration

## 结论

首个 failure-first 契约已经建立。当前 production 缺少统一 Work Item、Repository Target registry 和 Work Placement 三个 Root Core 入口，因此 focused suite 稳定处于 RED；行为测试在入口齐备前跳过，避免无意义的级联 `TypeError`。

本测试设计把 Cycle/Goal/Plan 统一映射到 `{ kind: "delivery", id }`，把 Experiment 映射到 `{ kind: "experiment", id }`。Workstream Activity 不是顶层 Work Item，不能被 Placement 单独选择。

## 最小 Public Contract

Core root 必须导出：

- `normalizeWorkItemRef(ref)`：只接受 Delivery 和 Experiment authority refs。
- `createRepositoryTargetStore(options)`：返回 `register`、`read`、`list`、`updateLocator`。
- `createWorkPlacementStore(options)`：返回 `assess`、`assessAndAcquire`、`read`、`list`、`release`、`bindSession`、`resolveSession`、`recordIntegration`、`assertCompletionAllowed`。

`assess` 是只读判定；`assessAndAcquire` 必须把冲突判定与 lease 持久化放在同一个 crash-safe/CAS 事务中。Placement 决策值固定为：

- `shared`
- `isolated_worktree`
- `isolated_resources`
- `blocked`

Host side effect 只通过 bounded descriptor 返回。Descriptor 使用 `argv: string[]`，不得包含任意 shell `command` 字符串；Core 不创建 worktree、不运行 Git、不分配 GPU，也不执行 merge。

## 测试矩阵

| Surface | 关键断言 |
| --- | --- |
| Work Item ref | Delivery/Experiment 可规范化；Activity 拒绝 |
| Repository registry | stable identity、唯一 primary integration target、locator generation/CAS、traversal zero-write rejection |
| Placement assessment | pinned read/read 共享；不同 snapshot 和 build/write 使用 worktree；relocatable mutable cache 使用 resource isolation；固定 output/GPU 重叠阻断 |
| Cryo fixture | Accel-Sim 子项目 Cycle 与 Trace Experiment 同时 acquire；分别隔离 Accel-Sim 与 llm-trace source-changing lane；外部 Attempt/GPU claims 不冲突 |
| Session selection | 一个 Session 只选择一个 Work Item；多候选未绑定 Session 返回 `selection_required`；同一 Work Item 可显式绑定协作者 |
| Atomic lease | 两个 fresh Node processes 争用同一 exclusive GPU 时恰好一个成功；stale fencing token 不能释放 winner |
| Integration gate | source-changing Delivery 在 merge evidence 前不能 `requestAcceptance`；target mismatch zero-write；证据完成后才进入 `pending_acceptance` |
| Legacy compatibility | 没有 Repository Target registry 的旧 workspace 仍可读写既有 Delivery/Experiment authority |

所有 Placement 用例先创建真实 Delivery 或 Experiment authority；测试不允许实现通过接受 orphan `work_item_ref` 来取巧。

## Cryo-Computing Fixture

filesystem-only fixture 模拟一个 Project authority root 下的两个独立 Git Repository Targets：

- `Accel-Sim`：永久 primary checkout 为 `Accel-Sim/main`。
- `llm-trace`：永久 primary checkout 为 `llm-trace/main`。
- Accel 子项目 lane：对 `Accel-Sim` 申请 `build`，独占 `gpu-0` 与独立输出目录。
- Trace lane：以固定 commit `execute` Accel-Sim tracer，对 `llm-trace` 申请 `write`，独占 `gpu-1` 与唯一 Attempt root。

Fixture 不访问 Nod、SSH、真实 GPU 或 `/data`；这些路径只作为结构化 claim locator。

## RED 结果

命令：

```text
node --test core/test/concurrent-work-placement-contract.test.js
```

结果：

```text
tests 9
pass 0
fail 1
skipped 8
```

唯一失败：`normalizeWorkItemRef must be exported from the Core root`。这是预期的首个 production gap。三个 Root API 出现后，8 个行为测试会自动启用；其中 table-driven assessment 还会展开 6 个子用例。

静态验证：

```text
node --check core/test/concurrent-work-placement-contract.test.js
node --check core/test/fixtures/concurrent-work-placement/acquire-child.mjs
fixture JSON parse: pass
git diff --check: pass
```

相邻回归：

```text
node --test core/test/vspi-workstream-contract.test.js core/test/c23-m1-experiment.test.js
18 pass / 0 fail
```

## 风险与后续

- 本首闭环通过 Placement store 验证 Session selection；Codex Hook 的 SessionStart/Recovery routing 和新版 Host status projection 应在 production contract 接入后补充独立 surface tests。
- Fresh-process 测试要求 Workspace transaction 对同一 claim set 做 CAS/fencing；只在单进程内加 mutex 无法通过。
- Integration evidence 当前锁定结构化 Host attestations，不要求 Core 运行 Git。Production 仍须验证 repository identity、integration target 和 claim snapshot 一致性。
- Legacy compatibility 表示旧 authority 无需 registry 仍可工作，不表示 source-changing Placement 可以绕过显式 Repository Target 注册。

## Evidence Refs

role: `test`

- `core/test/concurrent-work-placement-contract.test.js`：Root API、矩阵、并发、Session、integration 与 legacy RED contract。
- `core/test/fixtures/concurrent-work-placement/cryo-computing.json`：Cryo-Computing filesystem-only 双 lane fixture。
- `core/test/fixtures/concurrent-work-placement/acquire-child.mjs`：fresh-process exclusive claim contender。
- `command:node --test core/test/concurrent-work-placement-contract.test.js`：RED，`1 fail / 8 skip`。
- `command:node --check ...`：两个 JavaScript 文件语法通过。
- `command:node --test core/test/vspi-workstream-contract.test.js core/test/c23-m1-experiment.test.js`：相邻回归 `18 pass / 0 fail`。
- `command:git diff --check -- core/test/concurrent-work-placement-contract.test.js core/test/fixtures/concurrent-work-placement`：通过。
