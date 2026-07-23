# C21-M7 Implementation Evidence

- Role: strict `IMPLEMENT`
- Milestone: `C21-M7`
- Result: `IMPLEMENTED / PRODUCTION_AND_REGRESSION_GREEN`
- Tests/fixtures edited by IMPLEMENT: `none`

## Conclusion

M7 已实现可用的 ambient Maintain、当前 Official Codex 十事件薄适配器、PreCompact/compact recovery、Subagent 证据流、去重文档/Record 提醒，以及 Receipt-backed controlled deletion。默认 Plugin Hook 配置已经从旧 Claude 形态切换为 Codex 形态；Claude 旧配置被原样隔离。插件 schema 已修复并通过本地 validator。

没有执行本仓库清理，没有修改 `/home/heyx/Codex-VSP`，也没有写 legacy `.pipeline/state.yaml`、`cycle.yaml`、`log.yaml`、`PROGRESS.md` 或 legacy knowledge authority。

## Technical Approach

### Ambient Maintain

- `createAmbientMaintainStore({ clock })` 组合 M3 Recovery Journal、`.pipeline/memory/inbox/` proposal 和 M2 Record Store。
- 只有明确的 semantic delta 才写 Journal/Inbox；普通对话噪声零写。
- cheap recorder 只能返回规范化 `proposal_only` Record Patch，不能写 authority。
- main reviewer promotion 校验 staged Inbox 与 Patch 的 canonical hash，再提交 Record，并用独立 transaction 重建派生索引。
- 不创建或抢占 `.pipeline/runtime/active.yaml`。

### Codex Hooks

- 精确暴露 `SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PermissionRequest`、`PostToolUse`、`PreCompact`、`PostCompact`、`SubagentStart`、`SubagentStop`、`Stop`。
- 输入/输出按事件 fail closed；上下文使用官方 `hookSpecificOutput` 嵌套。
- 所有 tool 事件进入 Core，再由 Core 识别直接删除、记录结果和决定是否提醒，避免依赖 `Bash`/`exec_command` 等宿主别名。
- `PreCompact` 从当前 Capsule/Runtime 封存 Pack；`PostCompact` 写 Journal；`SessionStart(source=compact)` 只注入小于 16 KiB 的 bounded restore context。
- Subagent 使用独立 writer stream；Stop 不是唯一持久化点。
- `hooks/codex-hook.mjs` 成功时 stdout 只有一行 JSON，失败时无 stdout、诊断只写 stderr；`PLUGIN_ROOT` 为主路径。

### Controlled Deletion

- Deletion Manifest 绑定规范化 repo-relative path、file/directory tree SHA-256、原生 Git HEAD/tree OID 和 target Git state hash。
- 构建和 standalone Receipt context 都拒绝 escape、symlink、重复、祖先/后代重叠与 authority/evidence protected prefixes。
- 执行顺序为 Receipt reserve -> 全量 drift revalidation -> prepared evidence -> controlled delete -> Receipt consume -> applied evidence。
- missing/wrong owner/expired/content drift/Git drift 在第一项删除前失败；Hook 只提供额外护栏，不是授权边界。

## Modified Modules

- Core: `core/src/maintain/index.js`, `core/src/codex-hooks/index.js`, `core/src/deletion/index.js`, `core/src/permissions/index.js`, `core/src/index.js`
- Compatibility audit: `core/src/claude-resume/index.js`
- Hook package: `hooks/codex-hook.mjs`, `hooks/hooks.json`, `hooks/claude/hooks.json`, `hooks/README.md`
- Plugin/Skill metadata: `.codex-plugin/plugin.json`, `skills/resume/SKILL.md`
- Smoke: `scripts/codex-hook-smoke.mjs`, `scripts/codex-real-hook-smoke.mjs`
- Evidence: `.pipeline/reviews/C21/M7/implementation-evidence.md`, `.pipeline/reviews/C21/M7/real-host-smoke.md`

## Test Design And Results

Published focused M7 plus Recovery Pack:

```text
33 tests / 33 pass / 0 fail / 0 skip
```

Coverage includes meaningful/noise Maintain behavior, proposal-only recorder, ten official fixtures, event-specific outputs, real wrapper subprocess, compact Pack/restore, concurrent Subagent streams, reminder dedupe, protected paths, missing/wrong/expired Receipt, path/Git drift, successful consume and evidence.

Full Core regression after compatibility repair:

```text
1055 tests / 1055 pass / 0 fail / 0 skip
```

Additional validation:

- synthetic/process Hook smoke: PASS
- plugin validator: PASS
- `scripts/validate-config.sh`: PASS
- changed JavaScript `node --check`: PASS
- Plugin/Hook JSON parsing: PASS
- `git diff --check`: PASS
- Official real-host ten-event smoke: `SKIPPED_UNSUPPORTED_HOST` (`codex-cli 0.128.0`)

## Problems Encountered

1. 首次 full regression 为 `1052/1055`：bare `name: resume` 与 Claude `/resume` 冲突，Hook README 丢失 legacy Knowledge Ledger 边界，Claude audit 仍读取默认 Codex config。修复为 `name: hypo-workflow-resume`、恢复明确 legacy-only 文档，并让 Claude audit 优先读取 `hooks/claude/hooks.json`；相关回归 `7/7`，最终 full `1055/1055`。
2. 本地 plugin validator 不接受 manifest `hooks` 字段，因此采用官方支持的默认 `hooks/hooks.json` discovery，不在 manifest 声明该字段。
3. PATH `codex` 是 VSP，显式 Official binary 又过旧；真实宿主层只能诚实 SKIP。

## Expected Behavior

在支持当前 Hook 契约且已信任 Plugin 的 Official Codex 中，项目可自动记录重要用户约束、在压缩前封存恢复上下文、压缩后继续、保留 Subagent 生命周期证据，并只在相关变化后提醒文档/Record。任何直接删除都会被 Hook 尽力拦截，而真正删除只有 exact Manifest 与 single-use Receipt 通过 Core executor 才能发生。

## Residual Risks

- Journal append 与 Inbox transaction 不是一个原子提交；二者之间崩溃可能留下只有 Journal 的 delta，重试也可能产生重复事件。Journal 仍是可恢复证据，但后续可增加 operation-id reconciliation。
- Record authority commit 与派生 index rebuild 是两个 transaction；中间崩溃可能短暂留下 stale index，可通过确定性 rebuild 修复。
- 多目标文件系统删除不是原子事务；晚期 I/O 故障可能部分删除。第一项删除前已有 `prepared` evidence，失败会尽可能 invalidate Receipt，但不能回滚已经删除的 bytes。
- 删除仍继承 M2 Receipt 的同进程 lock 和 check-to-delete TOCTOU 限制；跨进程攻击/竞态需要后续锁与系统级原语。
- 删除完成后 consume 或 applied-report 写入仍存在崩溃窗口；prepared report 降低“完全无证据”风险，但不等于事务性文件系统。
- Codex `PreToolUse` 拦截不完整，匹配 Hook 可并发，`PostToolUse` 不能撤销副作用；Core controlled executor 必须保持唯一删除路径。
- Hook 配置改动需要宿主 trust 与新 Session；当前机器尚未完成新版 Official Codex real-host 验收。

## Revision 1 Adversarial Closure

- Revision role: strict `IMPLEMENT`
- Trigger: independent TEST found `3` RED tests in `2` blocker classes
- Result: `CLOSED / REGRESSION_GREEN`
- Tests or fixtures edited by IMPLEMENT: `none`

### Change Summary

1. Ambient Maintain 现在会在第一次 Recovery Journal 或 Inbox 写入之前拒绝 `password=...`、`token: ...`、`credential=...` 等 key/value secret-like 文本。修复位于共享的 `assertNoRawSecrets` value policy，因此 Ambient、Record 和使用该 gate 的 Recovery authority 输入不会各自维护不同规则；`[REDACTED]` 与显式 `secret_refs` 仍然允许。
2. Deletion protected-path policy 集中到 `core/src/deletion/policy.js`。同一 canonical helper 同时服务 Manifest build/validate/execute normalization 与 standalone `buildDeletionReceiptContext()`，并对受保护 exact/prefix/bootstrap/compatibility 路径实施闭包：拒绝文件自身、所有祖先和所有后代，即使调用者把 `manifest.yaml`、`active.yaml`、`acceptance.yaml`、`rollback-checkpoint.yaml` 或 compatibility evidence 文件伪装成目录。

### Modified Production Files

- `core/src/runtime/internal.js`
- `core/src/deletion/policy.js`
- `core/src/deletion/index.js`
- `core/src/permissions/index.js`

`core/src/maintain/index.js` 无需新增局部正则；它通过既有 `assertSecretSafe -> assertNoRawSecrets` 路径获得统一修复。

### Validation

```text
Revision 1 adversarial:                 3 / 3 pass
Published M7 + Recovery:               60 / 60 pass
Receipt + deletion + adversarial:      33 / 33 pass
Full Core regression:             1058 / 1058 pass
Codex synthetic/process smoke:                PASS
Changed production syntax:                     PASS
git diff --check:                              PASS
```

对抗 secret 测试同时验证拒绝前 workspace tree 字节级零写。所有 deletion success/failure 验证仍只在临时 Git fixture 中运行；未删除本仓库内容。

### Expected Result

任何进入 Ambient Record/Journal proposal 的 raw key/value secret 都在写前失败。任何与受保护 authority、recovery、acceptance 或 evidence 路径存在祖先/自身/后代关系的删除候选，都无法进入 Deletion Manifest 或 Receipt context，因此也无法到达 Receipt reserve 或 controlled executor。

### Problems And Residual Risks

Revision 1 未遇到新的实现阻塞。原 M7 已记录的非原子 Journal/Inbox、Record/index、multi-target delete、cross-process lock/TOCTOU、consume/report crash window，以及缺少新版 Official Codex real-host 验收等风险保持不变；本修订不扩大其范围，也不把 Hook 提升为删除 authority。

## Revision 2 Audit Closure

- Revision role: strict `IMPLEMENT`
- Trigger: independent TEST exposed `17` reported failures across `4` audit repair groups
- Result: `CLOSED / PRODUCTION_AND_FULL_REGRESSION_GREEN`
- Completed at: `2026-07-12T16:01:59+08:00`
- Tests or fixtures edited by IMPLEMENT: `none`

### Change Summary

1. Ordinary Deletion Manifest 与 Receipt context 现在把整个 `.pipeline/runtime/recovery` 作为 protected prefix；Recovery 根、blobs、packs 及其任意祖先/后代都不能进入普通删除 authority。Recovery retention 仍是唯一独立审计的清理路径。
2. `UserPromptSubmit` 不再把原始 prompt 写入 Ambient Maintain。Hook 只选择干净、具有 durable marker 的行/句，过滤 TRACE/log/console/stack tail，并将 Record body、Inbox/Journal summary 与 dedupe seed 统一绑定到最多 `512` UTF-8 bytes 的语义文本。没有干净持久语义或含 secret-like 文本时保持零 Inbox/Journal 写入；从不读取 `transcript_path`。
3. Codex Hook output validator 覆盖当前文档形态：legacy block、PostToolUse feedback/context、适用事件的 Common `suppressOutput`，同时继续按事件拒绝不支持字段。`PreToolUse.updatedInput` 必须带完整可验证的输入上下文；Bash/apply_patch rewrite 要求 string `command`，MCP 才接受 arguments object。Official input 也要求 Bash/apply_patch 的 `tool_input.command`。
4. PostToolUse reminder 从 apply_patch header、Bash 明确写目标和可选 `changed_paths` 合并最多 `32` 个路径；只有已识别为 write-like 的 Bash 命令才会回退到 bounded dirty paths，普通 `echo` 与 `git status` 不触发。去重 key 加入当前文件 blob effect digest，因此无新效果的重复会静默，同一路径内容再次变化后可重新提醒。

### Modified Production Files

- `core/src/deletion/policy.js`
- `core/src/codex-hooks/index.js`

### Validation

```text
Revision 2 audit findings:             30 / 30 pass
Existing focused M7:                   21 / 21 pass
Published M7 + Recovery:               60 / 60 pass
Receipt + deletion + adversarial:      33 / 33 pass
Full Core regression:             1088 / 1088 pass
Production-only live-doc probes:              PASS
Codex synthetic/process smoke:                PASS
Plugin validator:                             PASS
Config validator:                             PASS
Changed production syntax:                    PASS
git diff --check:                              PASS
Official real-host smoke: SKIP (codex-cli 0.128.0; no verifiable Hook surface)
```

Production-only probes cover Common `suppressOutput` on PreCompact/PostCompact/SubagentStop, missing apply_patch command rejection, targeted Bash redirection reminder, and no reminder for read-only echo/git status. All deletion success/failure validation stayed inside disposable temporary Git workspaces; no repository deletion was executed.

### Expected Result

Ambient Maintain now persists bounded semantic facts instead of raw prompt tails. Hook output/rewrite validation follows the current event/tool contract and fails closed without validated context. Documentation reminders work with standard apply_patch and common Bash writes even when a host omits non-standard `changed_paths`, while effect-aware dedupe avoids repetitive messages. Ordinary deletion cannot reach any Recovery-store content.

### Problems And Residual Risks

No implementation blocker remains in the Revision 2 contract. Bash target inference is intentionally bounded and heuristic; unknown scripts or tools without explicit paths may rely on the write-like dirty-worktree fallback, and read-only commands deliberately do not scan the worktree. Git blob effect hashing tracks content rather than every metadata-only change. Original M7 crash windows, cross-process lock/TOCTOU limits, non-atomic multi-target deletion, and the lack of a current Official Codex real-host remain documented residual risks.
