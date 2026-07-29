# C23 M7 Semantic Worker Routing Independent Retest

- Worker ID: `c23-m7-routing-test`
- Role: `test`
- Recorded at: `2026-07-18T20:50:07+08:00`
- Verdict: `PASS_READY_FOR_INDEPENDENT_AUDIT`
- Runtime advancement: none

## 结论

M7 focused、相关 maintained integration 与完整 maintained Core regression 全部通过。四个 canonical mechanical `operation_kind` 具有精确 reason code，高优先级 routing 信号不会被 mechanical 覆盖；Worker stop 会复用该 worker start 时冻结的 decision；真实 Delivery lifecycle write 也不会丢失 Runtime/Continuation 中的 routing。

本次 retest 只修改测试、fixture 与本 evidence，没有修改 production、docs、Skills、Runtime/Continuation、legacy authority、plugin/cachebuster、`dist/`、`redskill-package/` 或 VSP-Codex，也没有推进 Delivery。

## Task Assessment

权威只读 Resume 在测试前后均显示：

- Routing: `standard` / `nontrivial_change`
- Complexity: `medium`
- Uncertainty: `low`
- Oracle strength: `strong`
- Blast radius: `low`
- Reversibility: `reversible`
- Risk flags: none
- M7: `executing`
- Next action: `continue_active_milestone`
- Recovery Pack: `missing/degraded`

Runtime 与 Continuation 中的 assessment、routing class、reason、failure state 和 policy version 完全一致。

## 测试变更

1. Fixture 新增四个 canonical mechanical operation：
   - `status -> mechanical / status_query`
   - `format -> mechanical / formatting`
   - `read-only-summary -> mechanical / read_only_summary`
   - `deterministic-test-command -> mechanical / deterministic_test_command`
2. 每个 canonical operation 都以 `change_size=material` 验证 operation 本身足以选择 mechanical，并递归检查 decision 不含 host-owned resolution fields。
3. 每个 canonical operation 分别叠加 security、recovery conflict、high uncertainty，验证 `escalation`、`critical`、`explore` 按优先级胜出且 reason 精确；共 12 个组合。
4. Codex Hook regression 使用同一 `session_id + agent_id`：worker 以 standard decision start，临时 Runtime/Continuation 随后推进到 critical，SubagentStop Journal payload 仍保持 start 时冻结的 standard decision。
5. Delivery regression 在 executing Goal 上写入有效 strict `test/implement/audit` evidence，执行真实 `DeliveryStore.verify()`，再 fresh-process Resume；Runtime-derived delivery 与 Continuation 均保留原 standard decision。

## 验证结果

- `node --test core/test/c23-m7-worker-routing.test.js`: `17/17 PASS`。
- 相关 maintained config/topology/runtime/recovery/Codex/Delivery 组合：`139/139 PASS`。
- `npm test`: maintained inventory `59` files，`634/634 PASS`，无 skip/fail。
- `node --check`：M7 test 与 Worker Routing module 均 PASS。
- Fixture/catalog JSON：PASS。
- Catalog inventory：`59 maintained / 116 quarantined`，M7 entry 为 maintained，覆盖 `C23-M7`。
- Scoped `git diff --check`：PASS。
- Repository transaction descendants：`0`。
- 遗留 `/tmp/hw-c23-m7-*` workspace：`0`。
- Concrete model/provider/credential identifier scan：`0` matches。
- M7 decision/handoff recursive forbidden-field assertions：PASS；纯 policy source 无 network/process model invocation。
- Plugin metadata baseline hashes未变化。

## 问题记录

首次相关组合误包含 catalog 已明确 quarantined 的 `core/test/codex-continuation-preflight.test.js`，结果为 `143 PASS / 1 FAIL`；唯一失败是该 pre-C21 test 读取已移除的 `skills/start/SKILL.md`。确认其 catalog classification 为 `quarantined` 后，按当前 release boundary 重跑 maintained-only 相关组合并得到 `139/139 PASS`。这不是 M7 production failure，也未通过修改或忽略 maintained test 来规避。

## Modified Assets And Hashes

- `core/test/c23-m7-worker-routing.test.js`: `302277939e09260d70d36bf0522b816073899ac97852067126b69e2a11ce679b`
- `core/test/fixtures/c23-m7/worker-routing-cases.json`: `bcb1b0e5fc5f61fa4c37baceed66f3e10f11610430f3e10b2e4cf29c1461f1e5`
- `tests/regression-catalog.json` (validated, unchanged by this retest): `37a9c114a8c5bcc54dcdd389d276e75fadf8e84ab3064127e656de7df2515891`
- Prior RED evidence: `5cebc51c363b088247547420ecf3ee73c07dd03872e5dd375ea0f7536a49f414`

Frozen plugin metadata baselines:

- `.codex-plugin/plugin.json`: `a5874b84d5338e3ee6de4a0ec87874bb0789346ad461017f1dc8e323179080dd`
- `.claude-plugin/plugin.json`: `fe3689d85d7b50fb603b6d5e5e2077dc2a7e28f5a6e490d541214801da505ae8`
- `.claude-plugin/marketplace.json`: `f6074d2a87b5bc6d0df668fc41f6b5745cb735ed7b5300b9d56599014743362f`

## Expected Behavior And Residual Risk

Canonical status/format/summary/test-command work receives a mechanical semantic hint even when the enclosing change is material, unless a higher-priority risk or uncertainty signal applies. A worker's routing is frozen at start and remains stable through stop; Delivery transitions and fresh Resume retain the same decision without changing topology, evidence, acceptance, or user authority.

Residual risks：真实 host capability mapping、VSP-Codex integration、provider/model resolution、plugin reinstall/cachebuster 和 real-project Pilot 不在本 test-only retest 范围。四个 operation aliases 以 exact canonical identifiers 冻结；新增 alias 需要显式 schema 与 regression 扩展。Recovery Pack 当前缺失，因此权威 Resume 处于允许的 degraded 模式；本 suite 验证了 Runtime/Continuation、Journal、Capsule 和现有 compact Hook contract，但不把本地结果提升为外部 host interoperability 证明。
