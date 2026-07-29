# C21-M7 Independent TEST Evidence

- Role: fresh independent `TEST`
- Milestone: `C21-M7`
- Verdict: `NEEDS_CHANGES`
- Blocking RED contracts: `3`

## Conclusion

M7 的公开测试、Recovery 回归、插件/配置检查和全量 Core 回归均为 GREEN，但独立对抗测试复现了两类真实生产缺陷：Ambient Maintain 会接受并持久化 `password=...` 形式的 key/value secret；Deletion 保护策略会放过受保护 authority 文件的后代路径，并允许为 crafted manifest 构造 Receipt context。因此 M7 当前不能进入独立审计或完成状态。

## Approach

1. 从新格式 Runtime/Continuation 恢复 `C21/M7/verifying/independent_test`，未读取或写回 legacy state 作为 authority。
2. 独立运行已发布 M7、Recovery、process、plugin、config、syntax、JSON 和全量回归，不采信 IMPLEMENT 报告计数。
3. 对 Ambient、Hook 权限边界、工具名变体、Deletion path/Receipt/drift/reuse/report 行为执行临时仓库对抗检查。
4. 只新增 TEST-owned RED 合同；未修改生产、Hook/config、Plugin、Skill、文档或 Workflow authority。

## Exact Validation Results

### Published M7 and Recovery

```text
maintain-ambient + codex-hooks-vnext + codex-hook-process + deletion-gate
+ recovery-pack + recovery-journal + context-capsule
= 60 tests / 60 pass / 0 fail / 0 skip
```

### Static and Distribution

- `node scripts/codex-hook-smoke.mjs`: PASS, ten schemas plus valid/invalid wrapper paths.
- Plugin validator: PASS for `/home/heyx/Hypo-Workflow`.
- `scripts/validate-config.sh`: PASS.
- Plugin/Hook/fixture JSON parse: PASS, 3 files.
- Changed M7 JavaScript syntax: PASS, 7 files.
- `git diff --check`: PASS.

### Full Regression

```text
npm test
= 1055 tests / 1055 pass / 0 fail / 0 skip
```

This run preceded the new adversarial RED file. The three intentional RED contracts below now correctly keep the suite non-GREEN until production is repaired.

### Installed Host

```text
PATH codex: vsp-codex 0.145.0-vsp.9.2
/usr/local/bin/codex: codex-cli 0.128.0
CODEX_HOOK_SMOKE=1 node scripts/codex-real-hook-smoke.mjs
=> SKIP: installed Official host exposes no verifiable Hook surface
```

No ten-event real-host PASS is claimed.

## Blocking Defects

### 1. Ambient key/value secret is not zero-write

`captureSemanticDelta()` accepts a durable Record body containing:

```text
password=super-secret-value-123456789
```

The call returns `staged` and creates Journal/Inbox artifacts instead of rejecting before the first write. Hidden-reasoning and raw-transcript fields did reject with zero writes; the gap is specifically that the authority secret scanner does not recognize the key/value form already understood by Recovery redaction.

Expected: secret detection must run before Journal append and Inbox transaction, and use a policy consistent with the shared redactor/Record secret-ref contract.

### 2. Protected authority descendants enter deletion authority

Both `buildDeletionManifest()` and `buildDeletionReceiptContext()` accept paths such as:

```text
.pipeline/runtime/active.yaml/child.txt
.pipeline/runtime/migrations/job/acceptance.yaml/child.txt
```

The standalone Receipt-context path also accepted a correctly re-hashed crafted manifest bound to `.pipeline/manifest.yaml/child.txt`. Exact protected paths and ordinary protected prefixes are rejected, but exact-file and bootstrap-file policies are not closed over descendants.

Expected: every protected exact/acceptance/rollback path must protect both itself and all descendants in the builder, manifest validator, executor, and standalone Receipt-context normalization. The two modules should share one canonical path-policy helper to prevent drift.

## Adversarial Coverage That Passed

- Record promotion refreshes machine index and active dedupe mapping.
- UserPrompt wrapper persists without an explicit test clock.
- `exec_command`, `shell`, and `Bash` deletion commands are denied; tool-event Hook groups are matcher-free, so current naming variants are not omitted.
- Unsupported Hook input/output and authority-shaped fields fail closed.
- Evaluated Hooks do not issue allow, Receipt, Workflow transition, or acceptance authority.
- Traversal, absolute paths, symlinks, ancestor overlap, protected ancestors, crafted traversal, and crafted overlap reject.
- Directory drift invalidates the Receipt before deletion.
- Receipt reuse rejects after one successful consume.
- Successful execution leaves an `applied` report; a forced post-prepare deletion failure leaves a `prepared` report, target bytes, and an invalidated Receipt.

All destructive behavior above ran only in temporary fixture Git repositories.

## Files

Inspected production and integration surfaces:

- `core/src/maintain/index.js`
- `core/src/codex-hooks/index.js`
- `core/src/deletion/index.js`
- `core/src/permissions/index.js`
- `hooks/codex-hook.mjs`, `hooks/hooks.json`
- `.codex-plugin/plugin.json`
- M7 tests, fixtures, scripts, Runtime events, and implementation evidence

TEST-owned modification:

- `core/test/c21-m7-adversarial.test.js`
- `.pipeline/reviews/C21/M7/independent-test-evidence.md`

The four original M7 tests and two fixtures were created before the IMPLEMENT module timestamps and show no IMPLEMENT-side rewrite. Legacy `.pipeline/state.yaml`, `cycle.yaml`, `log.yaml`, and `PROGRESS.md` retained their pre-M7 `08:16` mtimes while M7 work occurred around `14:40-15:07`. M7 scope/events and modified-module evidence contain no `/home/heyx/Codex-VSP` write; no VSP work was performed by this TEST identity.

## Problems and Risks

- Official Codex installed-host validation remains unavailable, so Plugin discovery/trust and live ten-event delivery are residual release risks, not a fabricated PASS.
- The existing deletion design still documents cross-process locking/TOCTOU, multi-target partial deletion, consume-after-delete, and applied-report crash windows. Those are residual architectural risks after the two blockers are repaired.
- Ambient Journal and Inbox are separate commits, and Record commit/index rebuild are separate commits; crash reconciliation remains follow-up work.

## Required Follow-up

IMPLEMENT must repair the two policies without weakening existing fail-closed behavior, make all three tests in `core/test/c21-m7-adversarial.test.js` GREEN, rerun the focused 60-test suite and full regression, then hand the result to a fresh independent TEST/reaudit identity. M7 should not advance to audit or M8 before that closure.
