# Implementation Report: Concurrent Work Placement Integration

role: `implement`

worker_id: `main-agent`

## 结论

同一个 Project authority root 现在可以同时维护多个 Delivery 与 Experiment Work Item。`active.delivery` 只作为未建立 Placement registry 的 legacy fallback；每个 Session 必须显式选择一个 Work Item，不能静默混用全局 foreground。

Cryo-Computing 形态由一个 Project root 与多个独立 Repository Target 表达：`Accel-Sim` 和 `llm-trace` 保持各自 Git identity、locator 与 primary integration target。Accel-Sim 子项目开发和 Trace Experiment 可以并发 acquire；源码变更使用 worktree，GPU/cache/port/output 在启动前通过原子 claim 判定。

## 技术方案

- `Repository Target registry`：stable repository identity 与可变 locator 分离；registration 和 locator update 使用 generation/CAS。
- `Work Placement registry`：统一 Delivery/Experiment Work Item、Session binding、Repository/resource claims、四类 placement、lease、fencing 与 integration record。
- `assessAndAcquire`：读 registry、评估冲突、CAS commit；跨进程竞争失败后重新读取并重新评估，blocked contender 不写 registry。不同 snapshot 返回 worktree action，资源隔离返回唯一 locator。
- `Core/Host boundary`：Core 不执行 Git、worktree、进程、GPU 或 merge，只返回 bounded `argv[]` Host descriptor。
- `Integration gate`：source-changing Delivery 在 registered target 的 merge/rebase/fast-forward evidence 与 digest-verified Git proof 完成前不能请求最终 acceptance；proof 必须绑定 registry 中的 checkout path、branch ref、target HEAD 与 ancestry，并在 completion gate 重新校验。
- `Codex Hook / Host status`：SessionStart 优先解析 Placement binding；有 registry 时不回退 legacy foreground，未绑定 Session 的 Prompt/Tool/Permission fail closed。Host status 同时投影 available Work Items、当前 Session selection 和 expired lease。

## 修改模块

- `core/src/repository-targets/index.js`
- `core/src/work-placement/index.js`
- `core/src/delivery/index.js`
- `core/src/codex-hooks/index.js`
- `core/src/host-contract/index.js`
- `core/src/index.js`
- `contracts/host/v1/host-status.schema.json`
- `core/test/concurrent-work-placement-contract.test.js`
- `core/test/concurrent-work-host-integration.test.js`
- `core/test/fixtures/concurrent-work-placement/`
- `tests/regression-catalog.json`
- `skills/{guide,resume,experiment}/SKILL.md`
- `README.md`, `README.en.md`, `docs/user-guide.md`, `docs/en/user-guide.md`
- `docs/reference/work-placement.md`, `docs/reference/vspi-integration.md`, `docs/en/reference/vspi-integration.md`

## 测试设计与验证

- Failure-first contract：最初 `9 tests: 1 fail / 8 skip`，缺失 Root APIs；实现后展开 Repository、Placement、Cryo、Session、fresh-process fencing、integration 与 legacy 行为。
- Final focused integration：`19 tests / 0 fail`，覆盖 Placement、Host status、Codex Hooks、过期 registry 管理通路与 registered-ref integration proof。
- Maintained full suite：`npm test` => `686 tests / 0 fail`。
- Static：`git diff --check`、五个关键 JavaScript 模块的 `node --check`、Host schema 与 regression catalog JSON parse 均通过。
- Host build：当前 dirty worktree 中直接运行按设计被 release cleanliness gate 拒绝。将本轮 Core/Skill/Host schema 变更复制到一次性本地 clone、临时 commit 后执行 `npm run build:host` 成功，生成并校验 codex-plugin 与 portable ZIP（最终 verification commit `3f87b88a5f21f4b44d68c2625516667e183a9c3b`）。验证目录：`/tmp/hw-host-build-ZQclcu`。
- Independent audit：同一 audit worker 完成原始审计、修订复核与最终增量确认，结论 `PASS / 0 blocking findings`；独立 focused `19/19`、diff 与语法检查均通过。

## 预期结果

- 两个 Cycle、Cycle + Experiment 或多个 Experiment 可同时存在并占用兼容资源。
- 新 Session 在多候选时得到 `selection_required`，不会继承 `active.delivery`。
- 固定同一 snapshot 的 read/execute 可共享；different snapshot/source-changing 使用 worktree；relocatable mutable resource 使用资源隔离；固定 exclusive 冲突 blocked。
- 未归属 dirty checkout blocked；过期 lease 退出 Session/Host active projection。旧 owner 可以在资源未被接管时 fencing renew，但不能在冲突新 owner 出现后复活或记录 integration。
- 源码工作保留永久主 checkout，并在最终完成前回到 integration target。

## 遇到的问题

- 首次 focused 运行暴露 Session stored binding 误把 `work_item_ref`/`selected_at` 传给二字段规范器；修复后矩阵转绿。
- 初次独立审计发现 isolation descriptor、Session fail-closed、Experiment compaction、integration proof 和 lease expiry 五类问题；均已修订并增加对应回归。第一次复核关闭其中三项，并要求继续修复 expired-only registry 管理死锁与 integration proof 未绑定注册 ref 两项；同一 auditor 最终确认全部关闭。
- 最终检查发现验收门错误文案仍提到已废弃的 abandon 路径；实现本来没有该绕行能力，现已移除残留文案并增加回归断言，保持“源码工作必须合并”的严格契约。
- 新测试最初未登记 regression catalog；已归类为 maintained。
- 当前仓直接 build 被 source-commit cleanliness gate 拒绝；未绕过或提交用户工作树，改用临时干净 clone 验证。
- `/tmp` 验证目录的自动删除被项目 PreToolUse deletion guard 阻断，因此保留目录并显式记录，未绕过护栏。

## 风险与后续

- Core 校验结构化 integration proof 的 identity/generation/commits/command/outcome/file digest；真实 Git contains/merge 操作仍由 Host 执行。
- 过期 lease 的 registry 历史条目继续保留；后续可增加显式 compaction/retention，不影响 fencing 与 active projection。
- 当前仓未提交，因此正式 release bundle 不应更新；提交后需在干净 source commit 上重新执行 `npm run build:host`。
- 未修改 Nod 或 Cryo-Computing；本轮只使用 filesystem fixture 验证已观察到的目录拓扑。
