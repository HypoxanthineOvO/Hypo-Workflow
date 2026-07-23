# C21-M8 Integrated Closure Review

## Review Provenance

本文件是主线程在删除、独立 TEST、回归目录实现和 Skill 成对评测完成后的综合复核。按照用户“普通工作不要再拆 Agent”的最新要求，本轮没有再创建一个命名为 AUDIT 的最终 worker，因此不能把本文件描述为新的独立 Agent audit。

独立性仍来自前序边界：M8 的 surface/deletion RED、pre-delete retest、post-delete TEST、regression contract TEST 与实现角色分离；删除由 exact Receipt 和 controlled executor 约束；主线程只做最终证据交叉检查与收口。

## 结论

结论：`APPROVED FOR CYCLE ACCEPTANCE`。

未发现阻断 C21 人工验收的产品回归或越权删除。当前 Codex surface、Runtime/Records/Recovery authority、删除 exactness、maintained regression、Plugin/Skill packaging 和六条代表性 Skill 工作流均有可执行证据。

## Audit Matrix

| Focus | Evidence | Result |
|---|---|---|
| Exact deletion | Manifest hash、consumed Receipt、execution report、37-path equality | PASS |
| Public discovery | Plugin filesystem discovery 与 Registry projection | exact 9 PASS |
| Regeneration non-revival | legacy public writer contracts and M8 negative tests | PASS |
| Removed/deferred zero-write | Router compatibility diagnostics and tree-hash checks | PASS |
| Current docs | Root, READMEs, command reference, Codex/Hook guides | PASS within C21 current-doc scope |
| Runtime authority | manifest/Records/Receipts/Recovery; legacy writers frozen | PASS |
| Maintained Core | 48 selected files, 479 tests | PASS |
| Maintained scenarios | s70-s77 | 8/8 PASS |
| Historical visibility | 116 Core + 68 scenario entries remain quarantined and runnable | PASS |
| Skill behavior | 6 candidate + 6 frozen-baseline runs | 48/48 vs 48/48 |
| Packaging | Plugin validator, Root+9 quick validation, production Skill quality | PASS |
| Hook adapter | synthetic/process smoke | PASS |
| Official installed host | `/usr/local/bin/codex 0.128.0` | honest SKIP |
| External boundary | `/home/heyx/Codex-VSP` | untouched |

## Findings

### Blocking

无。

### Accepted limitations

1. Official Codex real-host Hook discovery/trust 尚未在兼容十事件宿主上完成；synthetic/schema/process 证据不能替代真实宿主验收。
2. Skill benchmark 每组每案例仅一次运行，并共用当前 Core。它证明 non-regression，不证明统计优势或完整历史实现优势。
3. Quarantine 仍包含 legacy/mixed corpus；它们被透明保留，不属于当前 release GREEN，也不能永久不复查。
4. C21 没有实现 OpenCode/Claude adapter redesign、Stash/Pop、实验项目管理、遥测、Docs/PR/Release、Dashboard/TUI 或 general automation。

## 变更范围判断

本轮大量 working-tree 变化来自 C21 M1-M8 的连续架构替换与新 authority bootstrap。收口没有回退或覆盖用户已有改动，也没有对不在 exact Manifest 中的路径执行删除。Legacy `.pipeline/state.yaml`、`cycle.yaml`、`log.yaml` 与 `PROGRESS.md` 在 M5 activation 后不再作为当前 authority 写入；最终状态写入只使用 Runtime/Continuation、Recovery Journal 和 Capsule。

## 推荐门禁

C21 现在应进入唯一 Cycle 级人工验收。接受后运行 `/hw:accept`；若发现具体问题，使用 `/hw:reject` 提交 problem、复现步骤、expected、actual 与 context。不要为 M8 的单个 Milestone再增加独立人工验收。

