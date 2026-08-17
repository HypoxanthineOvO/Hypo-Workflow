# Work Placement 与 Repository Target

本页说明 Hypo-Workflow 如何决定"一份工作在哪个仓库、用什么资源执行"，面向需要并行运行多个 Delivery 或 Experiment 的用户和 Agent。

Work Item 是可由一个 Session 选择的顶层工作身份：Goal、Plan 与兼容 Cycle 都使用 `{ kind: "delivery", id }`，Experiment 使用 `{ kind: "experiment", id }`。

Workstream 是 Delivery 内的 Worker activity，不是另一个顶层 Work Item。

一个 `.pipeline/` Project authority root（项目权威根目录）可以同时管理多个独立 Git Repository Target（仓库目标）。Repository Target 的 stable identity（稳定身份）与当前 locator（当前路径）分开；primary integration target 表示永远保留、鼓励汇总所有源码改动的主 checkout，alternate target 为后续多主目录兼容预留。独立仓库不要求 Git submodule，也不要求把嵌套仓库合成一个仓库。

## 启动前判定

Host 在启动 Work Item 前声明 Repository 和资源占用，Core 用同一 registry snapshot 原子完成评估和 lease 获取：

| 决策 | 含义 |
| --- | --- |
| `shared` | 固定到兼容 commit 的 `read`/`execute`，且 GPU、端口、cache、输出互不冲突 |
| `isolated_worktree` | snapshot 不同，或任一 lane 会 `build`、`write`、`checkout` 源码 |
| `isolated_resources` | mutable cache 等资源可以重定位到独立位置 |
| `blocked` | 独占 GPU/端口或固定输出目录冲突，当前声明无法安全并发 |

lease（资源租约）带 fencing token（防护令牌，用于拒绝过期持有者的写入）。并发进程基于 registry hash 做 CAS（compare-and-swap，比较并交换）；失败者必须重新读取并重新评估，不能用进程内 mutex 假装原子。

长任务必须在 TTL 前后用当前 fencing token `renew`；过期 lease 会从 Session/Host active projection 中移除。若其他 Work Item 已取得冲突资源，旧 owner 不能重新续租或记录 integration evidence。

## Session 与 Host 边界

需要权威路由或资源 claim 时，一个 Session 只绑定一个 Work Item；同一 Work Item 可以显式绑定多个协作 Session。

存在多个候选而 Session 未绑定时，SessionStart 返回 `selection_required` 作为上下文提醒，不会退回 legacy `active.delivery`，但普通提示、工具、诊断和 Experiment 普通文件记录继续可用。只有 workspace 尚未建立 Work Placement 时才保留旧 pointer fallback。

Core 不执行系统副作用。`isolated_worktree` 只产生无 shell 字符串的 bounded `argv[]` descriptor，`isolated_resources` 产生唯一 locator 分配；实际 `git worktree add`、进程启动、GPU/端口分配和 merge 由 Host 完成。

对源码有改动的 Delivery 只有在 digest-verified proof 证明 integration target 包含 source commit 后，才能进入最终人工验收。

## Cryo-Computing 映射

`Cryo-Computing` 保持一个 Project authority root，同时把 `Accel-Sim` 与 `llm-trace` 登记为两个 Repository Target。

Accel-Sim 子项目开发对 `Accel-Sim` 使用独立 worktree；Trace Experiment 可以固定 commit 执行 Accel-Sim tracer，并在需要修改 `llm-trace` 时使用另一个 worktree。二者分别声明 GPU 和 `/data` Attempt 输出目录，因此只在真实资源或路径重叠时阻断。
