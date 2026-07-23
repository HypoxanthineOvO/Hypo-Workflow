# C21-M6 独立审计报告

## 裁决

**Verdict: APPROVED**

- 审计对象：M6 Goal / Cycle Delivery Core、adaptive planning、execution topology、九入口路由与 focused Skills
- 审计结论：满足“Codex 本地安装后，在其他 Git 仓库初始化 manifest workspace、真实落盘、跨进程恢复”的最小可用 checkpoint
- 阻断项：`0 Critical / 0 Warning blocker`
- 非阻断后续风险：`4`
- 范围限制：本结论不宣称 M7 Codex Hook / ambient Maintain 已完成，也不宣称 M8 删除与兼容清理已完成

## 用户可见结论

另一个项目不需要复制 Hypo-Workflow Child Skills 到项目目录。安装的 Hypo-Workflow bundle 提供 Skill backend，目标项目只保存自己的 `.pipeline/` 数据。当前链路已经能完成：

```text
Init
-> Goal / Cycle proposal
-> 用户批准
-> 独立显式 start
-> worker evidence 验证
-> 最终人工 accept / reject
-> fresh-process Resume
```

真实仓库外探针确认：

- 完整 Goal 最终为 `accepted`，fresh Node 进程 Resume 返回同一个 Delivery 和 `pack_status: current`。
- 首次使用尚未生成 Recovery Pack 时，Resume 不再失败；它以 Runtime / Continuation 恢复，并返回 `pack_status: missing`、`degraded: true`。
- 已接受的 Goal A 之后可以创建并启动 Goal B；A 的 Runtime 和 Plan Record 保持不变且仍可读取。
- 同 ID 重提案在任何状态都返回 `ERR_DELIVERY_OBJECT_EXISTS`，完整工作区字节树零写。
- Reject 后旧 Plan 不能重新批准；旧 approval Receipt 也在 reserve 前零写拒绝。只有 `recordRevision` 落盘新 Plan 后才可重新批准，并仍停在 `waiting_to_start` 等待独立 start。
- `repoRoot` 与 `skillRoot` 已分离：目标项目、显式安装 bundle、旧 bundle alias 三条路径均正常；缺失 backend 仍 fail closed。

## 技术审阅

### Authority 与事务边界

Delivery 没有建立第二套生命周期权威。Runtime / Continuation 仍是状态权威，Markdown Record 是计划与反馈权威，Receipt 是用户转换授权，Recovery Pack 只提供可恢复上下文。Proposal 通过一笔 M1 transaction 同时创建 Plan Record、Runtime、Continuation 和 reference-only active pointer。

Goal 只包含 Design，不伪造 Milestone。Cycle 使用有依赖顺序的 Milestones，但只有 Cycle 聚合结果进入一次最终人工验收。Approval 只到 `waiting_to_start`；start 必须使用另一张 Receipt。Material engineering 默认要求不同身份的 `test`、`implement`、`audit` 证据，小修复仍可选择 `solo-verified`。

### 首用与恢复

Resume 始终从 active pointer、Runtime 和 Continuation 恢复生命周期。Recovery Pack 当前时提供上下文；Pack 过旧时返回 `stale` 并要求 bounded replay；没有 Pack 时进入明确 degraded 模式。Pack 永远不能覆盖较新的 Runtime 状态。

### 路由与 Skill 根

当前发现面精确为：

```text
/hw:guide
/hw:init
/hw:goal
/hw:plan
/hw:cycle
/hw:maintain
/hw:resume
/hw:accept
/hw:reject
```

显式 `skillRoot` 优先；只有 Root Skill frontmatter 明确为 `name: hypo-workflow` 的旧 `repoRoot` 才作为 bundle alias；普通目标仓库使用安装 bundle 默认值。Internal、deferred、removed 命令不进入发现面，并保持零写诊断。

## 修改范围

本 Milestone 的生产改动集中于：

- `core/src/planning/index.js`
- `core/src/execution-topology/index.js`
- `core/src/delivery/index.js`
- `core/src/commands/index.js`
- `core/src/index.js`
- Root `SKILL.md`
- `skills/goal/` 以及 Guide、Plan、Cycle、Maintain、Resume、Accept、Reject focused Skills

本审计没有修改 production、tests 或 live authority。审计写入仅为本报告；所有动态反例和外部仓库均位于 `/tmp`。

## 测试设计与结果

### 独立 TEST

| 验证集 | 结果 |
|---|---:|
| M6 lifecycle / planning / topology 六套 | `42/42 PASS` |
| Proposal、Reject 与显式 `skillRoot` R2 | `10/10 PASS` |
| Root Skill compatibility router | `12/12 PASS` |
| M1 transaction / legacy fence baseline | `65/65 PASS` |
| Syntax、`git diff --check`、scoped whitespace | PASS |

### 独立仓库外验收

完整正常路径创建了真实外部 Git 项目并落盘：

- `3` 个 Receipt
- Goal Runtime 与 Continuation
- Plan Record 与派生索引
- worker evidence 文件
- Recovery Journal、Capsule 与 Pack
- accepted 状态与 fresh-process Resume

额外反例覆盖：无 Pack Resume、accepted-to-new-Delivery rollover、same-ID whole-tree zero-write、Reject 后旧 Plan / Receipt zero-write、default / explicit / legacy root precedence，以及 missing backend fail closed。全部通过。

主线程最后又按实际用户路径独立复验一次：`/hw:goal` route 为 `available`，Maintain Record 真实落盘，无 Pack Resume 返回 `proposed / missing / degraded`，Goal A 完成 `accepted` 后 Goal B 可进入 `executing`，fresh child process Resume 仍返回 Goal B `executing / missing / degraded`。目标仓库最终包含 `22` 个 `.pipeline` 文件。

### Full Core

最终独立全量结果为 `1035/1035 PASS`、`0 fail`、`0 skip`。审计进程耗时 `22965ms`；主线程 closure 复跑同样为 `1035/1035`，耗时 `23159ms`。先前四项 M6 之前的旧文本合同已经改为当前行为合同：Plan / Resume 验证 objective-driven topology 和 worker lifecycle，不再固定恰好三 worker 或旧 preassignment；legacy workflow commit 测试区分旧生命周期 helper 与当前 Delivery 使用的 M1 transaction seam。

两份修订测试先独立窄跑 `16/16 PASS`，随后完整 Core 全量通过。M6 lifecycle、storage、transaction、Receipt、Recovery、Skill routing 和外部仓库路径均为 GREEN。

## 问题与处理

审计先后发现并推动关闭四类首用 blocker：

1. 无 Recovery Pack 时 Resume 抛 `ERR_RECOVERY_PACK_NOT_FOUND`。
2. 目标项目 `repoRoot` 被误当作安装 Skill bundle。
3. 同 ID proposal 可覆盖现有或已接受 Delivery，且完成一个 Delivery 后不能开启第二个。
4. Reject 后未修订的旧 Plan 可以重新批准，旧 approval Receipt 会留下写入痕迹。

最终外部探针第一次运行还遇到一次探针自身时钟错误：start Receipt 的 `issued_at` 比 Delivery Store 的固定 Clock 晚五分钟，系统正确返回 `ERR_RECEIPT_NOT_YET_VALID`。统一 captured Clock 后全链通过；这不是 production 缺陷。

## 非阻断风险

1. **Receipt 跨事务崩溃窗口，高优先级后续。** Receipt reserve、Runtime/Record persistence、Receipt consume 目前是三笔各自可恢复的事务。若恰好在事务之间崩溃，Receipt 可能永久停在 `reserved`。Runtime 仍保持权威且 Resume 不会倒退，但需要后续合并事务或增加 durable transition reconciliation。
2. **Record index 可短暂滞后。** 单个 Markdown Record 仍是事实权威，读取不丢数据；派生 index 在外部正常路径中可能少收录新 Plan Record。应补明确 rebuild / refresh policy。
3. **错误消息可能回显 evidence path。** digest/path 校验失败会输出 caller-supplied repo-relative path。后续应改为脱敏 locator 或索引，并对 worker ID / path 做 secret scan。
4. **Revision 沿用原 topology。** 小修订扩大为 material work 时不会自动重选 worker topology。后续可让 revision 显式接受或重新计算 topology。

## 预期行为与后续边界

当前版本交付的是可用核心：外部项目能够真实写入 `.pipeline/`、从 Runtime / Records / Receipts 恢复、完成 Goal 或 Cycle，并保留人工验收边界。M7 再实现 ambient Maintain 与 Codex Hook 提醒；M8 再处理删除门禁、旧命令物理清理和 release-ready compatibility cleanup。上述后续工作不应阻止用户现在开始在新项目使用 M6。

## Completion Narrative

- **改动摘要**：Goal / Cycle 核心、九入口路由、adaptive planning、worker topology 和跨进程 Resume 已形成可用 checkpoint。
- **技术方案**：复用 M1-M3 authority 与 transaction 层，以 Receipt 绑定用户状态转换，以 Runtime 为生命周期权威，以 Record 保存计划与反馈，以 Pack 保存可重放上下文。
- **修改模块**：planning、execution-topology、delivery、commands、Root/Child Skills 与 root exports。
- **测试设计**：独立 TEST、完整临时 Git 项目、fresh-process 调用、whole-tree zero-write 反例、路由根优先级与 fault probe。
- **验证结果**：所有 M6 focused、外部仓库路径与 Full Core `1035/1035` 全部通过。
- **预期结果**：用户可以在其他新项目立即初始化并持久化 Workflow 数据；中断后从同一权威状态继续。
- **遇到的问题**：四类首用 blocker 已关闭；一次审计探针 Clock 配置错误已更正。
- **风险/后续**：Receipt transition 原子性、派生索引刷新、错误路径脱敏与 revision topology 重选进入后续 hardening；Hooks 和删除清理仍分别属于 M7/M8。
