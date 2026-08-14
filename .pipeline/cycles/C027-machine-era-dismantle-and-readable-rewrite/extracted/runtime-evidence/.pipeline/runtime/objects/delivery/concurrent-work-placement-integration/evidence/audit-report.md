# Concurrent Work Placement Independent Audit

- worker_id: `placement-audit`
- role: `audit`
- status: `final_pass`
- audited_at: `2026-07-29T13:14:34+08:00`
- rechecked_at: `2026-07-29T13:24:36+08:00`
- final_rechecked_at: `2026-07-29T13:29:34+08:00`
- final_amendment_checked_at: `2026-07-29T13:31:26+08:00`
- conclusion: `PASS`。原始 4 个 P1 和 1 个 P2 finding 均已闭环；最终复核为 0 blocking findings。

## Final Verdict

`PASS`，0 blocking findings。

- 空候选 Session：`resolveWorkItemSession` 在没有 active candidate 时返回 `none`，因此 expired-only registry 不会触发 selection gate；Host 回归证明 PreToolUse 仍可执行 Placement 管理操作。
- Integration target：proof 现从 Repository Target Store 解析登记的 `checkout_path` 与 `branch`，严格绑定 `git -C <checkout> rev-parse <registered-ref>` 和 `git -C <checkout> merge-base --is-ancestor <source> <registered-ref>` 两个 bounded argv、exit code、target-head output/digest 与 ancestry output digest。
- Completion gate：`inspectWorkItemCompletion` 会重新读取 Repository Target 并重新校验证据文件；proof 被修改或注册 target 发生不一致时恢复为 outstanding，不能仅靠已存 boolean 放行。
- Negative coverage：internally consistent 但未绑定 registered target 的 proof 会被拒绝；proof 文件在 record 后漂移会让 completion gate 重新阻断。
- Final amendment：`ERR_DELIVERY_INTEGRATION_REQUIRED` 仍使用同一 integration completion gate，仅把已废弃的 `explicit abandon evidence` 从提示文案移除；对应测试断言错误消息不得包含 `abandon`。行为策略未变化，最终 verdict 保持 `PASS`。

## First Recheck Verdict

以下表格保留 `2026-07-29T13:24:36+08:00` 时点的历史状态；其中两项 OPEN 已在上方 Final Verdict 关闭。

| Initial finding | Verdict | Evidence |
| --- | --- | --- |
| P1 隔离判定没有可执行结果 | CLOSED | 不同 snapshot 的 read/execute 现生成 `git_worktree_add`；relocatable resource 现生成 `resource_allocations`，并有 focused assertions。 |
| P1 Session 单选只是提示 | OPEN | 有候选时已 fail closed；但 0 candidates 仍返回 `selection_required`，导致全部 placement 过期/释放后没有可选 Work Item，同时 UserPrompt/PreToolUse 被永久阻断，无法通过 Agent 创建或续租 Placement。 |
| P1 Experiment compact 失败 | CLOSED | selected Experiment 的 PreCompact/PostCompact 明确降级为 `{ continue: true }`，focused test 覆盖两条路径。 |
| P1 Integration gate 可自报绕过 | OPEN | proof 已绑定 identity/generation/digest/argv/exit code，但 ancestry argv 只检查 source 是调用方指定 result 的祖先；没有证明 registered integration target branch/checkout 的实际 HEAD 等于 `target_head/result_commit`。 |
| P2 过期 lease 状态与 fencing | CLOSED | list/Session/Host status 使用 effective expiry；新增 renew，且新 owner 获取冲突资源后旧 owner不能 renew，过期 owner 不能 record integration。 |

### Remaining P1 - 空候选 Session 形成 fail-closed 死锁

`resolveWorkItemSession` 在 registry 存在但 active placements 为空时仍返回 `selection_required`（`core/src/work-placement/index.js:251`），而 UserPrompt、PreToolUse 和 PermissionRequest 对任何 `selection_required` 都阻断（`core/src/codex-hooks/index.js:245`、`:267`、`:288`）。现有 expiry test 明确期望空 candidates 的 `selection_required`，却没有通过 Hook 验证如何恢复。

修复要求：0 candidates 应返回不会触发普通 Work Item 单选门禁的状态，或提供只允许 placement create/renew/select 的明确控制通道；增加“最后一个 placement 过期后仍能建立下一项工作”的 Hook 回归。

### Remaining P1 - proof 未证明 registered target 的实际 HEAD

`validateIntegrationProof` 要求 `target_head === result_commit`，但这两个值都来自 proof；唯一 bounded Git argv 是 `git merge-base --is-ancestor <source> <result>`（`core/src/work-placement/index.js:664`）。该命令没有解析 Repository Target 中登记的 branch/checkout，也没有证明 result commit 位于那个 integration target。一个与 target branch 无关、但包含 source 的 commit 仍可形成内部一致且 digest 正确的 proof。

修复要求：proof 必须包含并绑定登记的 target branch/ref，记录并校验 `git rev-parse <target-ref>` 的 bounded argv、exit code 和 output digest/value，再对解析出的真实 target head 执行 ancestry check；增加 internally-consistent-but-wrong-target proof 的拒绝测试。

## Findings

### P1 - 隔离判定没有可执行的隔离结果

`buildAssessment` 会把不同只读 snapshot 判为 `isolated_worktree`，也会把可重定位 mutable cache 判为 `isolated_resources`，但 `host_actions` 只为 source-changing Repository claim 生成 worktree action，资源隔离永远返回空 action，且没有 allocated locator。见 `core/src/work-placement/index.js:384`、`:418`、`:432`。因此 read/execute 的不同 commit 会得到“已获取”的 lease 但没有 worktree descriptor；cache 冲突会得到 `isolated_resources` 但 Host 不知道新路径。现有表驱动测试仅断言 decision，没有断言可执行 action 或 allocation，见 `core/test/concurrent-work-placement-contract.test.js:149`、`:167`、`:208`。

影响：两个 Experiment 可能被 Core 宣告可并发，实际仍落到同一 checkout/cache，正好违背本 Goal 的冲突隔离要求。

修复要求：所有非 `shared` 且非 `blocked` 判定必须返回完整、确定且可验证的 Host allocation/action descriptor；不同 snapshot 的 read/execute 也要生成 worktree action，资源隔离要返回独立 locator，并增加 Host 执行成功/失败状态测试。

### P1 - Session 单选只是提示，不是执行门禁

未绑定 Session 只在 `SessionStart` 收到 `additionalContext`，见 `core/src/codex-hooks/index.js:213`。`UserPromptSubmit` 不解析 selection，`PreToolUse` 也只拦直接删除，见 `core/src/codex-hooks/index.js:245`、`:263`。因此 Agent 可以忽略提示并继续调用工具；后续事件只是因为 `readActiveObjectRef` 返回 `null` 而不记入任何 Work Item，见 `core/src/codex-hooks/index.js:516`。

影响：“新开时必须选择其中一个，不可以混跑”没有被系统强制，未绑定 Session 仍可改文件或启动实验，且这些动作不会归属任何 Work Item。

修复要求：在会产生工作副作用的最早 Hook 上 fail closed；未绑定且有候选时阻断工具执行，直到显式 `bindSession` 成功。增加未绑定 Session 的 PreToolUse/PermissionRequest 回归。

### P1 - Experiment 的 compact Hook 会因缺少 Recovery Capsule 失败

Codex Hook 现在把 selected Experiment 当成 Recovery object。`PreCompact` 无条件读取其 Context Capsule，而 Experiment 创建和 Placement 绑定不会创建 Capsule。实测在临时 Git workspace 中创建 Experiment、绑定 Placement 后执行 `PreCompact`，返回：

```text
ERR_RECOVERY_CAPSULE_NOT_FOUND: Context Capsule was not found
```

调用路径位于 `core/src/codex-hooks/index.js:336` 附近；当前 Host integration 测试只覆盖普通 `SessionStart`，没有覆盖 Experiment 的 PreCompact/PostCompact。

影响：长实验发生上下文压缩时 Hook 失败，无法满足 Experiment/Hook/Resume 兼容要求。

修复要求：为 Experiment 建立兼容 Capsule/Pack，或在 Hook 中显式采用 Experiment 自己的恢复语义并对缺失 Capsule 降级；覆盖 selected Experiment 的 compact round trip。

### P1 - Integration gate 可由调用方自报布尔值绕过

`recordIntegration` 只检查 fencing token、claim target 和 base commit，然后持久化调用方提供的 evidence，见 `core/src/work-placement/index.js:235`。`normalizeIntegrationEvidence` 只验证 SHA 字符串格式和 `target_contains_source === true`，见 `core/src/work-placement/index.js:544`。测试使用虚构的重复 SHA 和布尔值即可打开 acceptance gate，见 `core/test/concurrent-work-placement-contract.test.js:398`。

影响：并未证明 integration target 实际包含 source commit，Host 可以在没有 merge/rebase/fast-forward 的情况下请求最终验收，违反用户明确的“完成之后必须合并掉”。

修复要求：Integration record 必须绑定 Host 生成且 Core 校验的 file/Snapshot evidence digest，至少包含 repository identity/generation、target head、source commit、祖先关系检查结果和验证命令/输出摘要；abandon 应使用独立、显式用户授权记录，不能与普通 merge assertion 等价。

### P2 - 过期 lease 仍显示为 active，且没有续租或重新 fencing

冲突评估会过滤过期 lease，见 `core/src/work-placement/index.js:653`；但 Session candidates 只检查 placement `status`，见 `core/src/work-placement/index.js:216`，Host status 同样只看 `status`，见 `core/src/host-contract/index.js:304`。API 也没有 renew/reclaim 操作。过期 owner token 仍可调用 release/recordIntegration，而新 owner 已可能拿到同一资源。

影响：长跑实验超过 TTL 后状态投影失真，资源可能被第二个 Work Item 获取，旧 Host 又没有可用的续租/fencing 协议。

修复要求：统一 effective lease state；提供 CAS renew/reclaim 并更新 fencing epoch，Session/Host status 排除或标记 expired；增加过期 owner 与新 owner 并发测试。

## Validation

- Final focused: `node --test core/test/concurrent-work-placement-contract.test.js core/test/concurrent-work-host-integration.test.js` -> `19/19 PASS`。
- Final static: `git diff --check` and `node --check` on Work Placement, Codex Hooks, Host Contract -> PASS。
- Final amendment focused/static: focused `19/19 PASS`; `git diff --check` and `node --check core/src/delivery/index.js` -> PASS。
- Main-Agent corroboration: maintained `686/686 PASS`; temporary clean Host build commit `7a498931c3e9936473aa90878e7efe3cf771c3d1` passed（由主代理提供，本 audit 未重复构建）。
- Main-Agent final corroboration: maintained `686/686 PASS`; temporary clean Host build commit `3f87b88a5f21f4b44d68c2625516667e183a9c3b` passed（由主代理提供，本 audit 未重复构建）。
- Recheck focused: `node --test core/test/concurrent-work-placement-contract.test.js core/test/concurrent-work-host-integration.test.js` -> `18/18 PASS`。
- Recheck static: `git diff --check` and `node --check` on Work Placement, Codex Hooks, Host Contract -> PASS。
- Focused: `node --test core/test/concurrent-work-placement-contract.test.js core/test/concurrent-work-host-integration.test.js` -> `17/17 PASS`。
- Maintained: `npm test` -> `684/684 PASS`。
- Static: `git diff --check` -> PASS。
- Syntax: `node --check` on Repository Target, Work Placement, Codex Hooks, Host Contract -> PASS。
- Reproduction: selected Experiment `PreCompact` -> FAIL with `ERR_RECOVERY_CAPSULE_NOT_FOUND` as expected by finding 3.

## Residual Risk

本次为只读独立审查，未访问 Nod、未运行真实 GPU/port/process/worktree/merge。现有 Cryo fixture 证明 schema 和并发 CAS 路径，但还没有真实 Host 执行 oracle，因此不能把 passing fixture 解释为 Accel-Sim 与 Trace 已能安全并跑。

## Evidence Contract

此文件是 `worker_id=placement-audit`、`role=audit` 的唯一 evidence artifact。父 Agent 应在文件稳定后计算 `sha256`，并以 `{ type: "file", path: ".pipeline/runtime/objects/delivery/concurrent-work-placement-integration/evidence/audit-report.md", digest: "sha256:<digest>" }` 绑定到 Goal verification。
