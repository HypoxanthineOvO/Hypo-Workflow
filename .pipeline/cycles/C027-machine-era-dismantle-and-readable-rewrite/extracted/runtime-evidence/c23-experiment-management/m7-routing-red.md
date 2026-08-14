# C23 M7 Semantic Worker Routing RED Evidence

- Worker ID: `c23-m7-routing-test`
- Role: `test`
- Scope: test-only RED contract
- Recorded at: `2026-07-18T20:13:59+08:00`
- Verdict: `RED_RECALIBRATED_FOR_INDEPENDENT_IMPLEMENTATION`
- Runtime advancement: none

## Conclusion

M7 now has one focused, maintained RED suite for deterministic semantic Worker Routing. The suite freezes a provider-independent routing API, a visible host-produced Task Assessment schema, the five routing classes and precedence, failure counting, host capability modes, restart-safe persistence, Codex handoff, and topology/evidence orthogonality.

The calibrated focused run produced the intended RED result: `13` tests, `2 PASS`, `4 FAIL`, `7 SKIP`. The skipped cases are the pure routing contract behind the standard import probe and will activate as soon as the focused production module exists. Runtime/Continuation fresh-process Resume and topology/evidence orthogonality already pass through current generic authority seams.

The user-approved contract supersedes two incorrect first-draft test assumptions: `reversible=false` is direct `escalation`, not `critical`, and a `weak` oracle is `critical`, not `explore`. The calibrated suite now separates those signals explicitly and gives every mandatory route signal a deterministic reason code.

## Restored Authority Context

- Active Delivery: `delivery/c23-experiment-management`
- Active plan Record: `decision-861cb23500113ed79b04c1b99f29ee2e`
- Plan semantic hash: `861cb23500113ed79b04c1b99f29ee2eb3bbcded9d9f39ba617bbea100bc5217`
- Plan hash: `dc63837d450c3006b9ba106027f1fafdf218e9a13e1c185ae03dd1f952821c0e`
- Recovery Pack: missing/degraded, which is allowed by the Resume contract
- Runtime observed during this recalibration: M5 `verified`, M6 `executing`, M7 `pending`

This test worker did not advance Runtime, Continuation, Milestone state, Receipts, Journal lifecycle evidence, or any protected/legacy authority.

## Frozen API Contract

Expected focused module: `core/src/worker-routing/index.js`, exported again from `core/src/index.js`.

1. `validateTaskAssessment(assessment)` validates only host-produced visible evidence. It does not call a model.
2. `selectWorkerRouting({ role, operation_kind, task_kind, change_size, reversible, risk_flags, distinct_failed_routes, assessment? })` preserves the user-supplied seven-field compatibility surface and adds only an optional validated assessment.
3. `resolveWorkerRoutingHandoff({ mode, host_capability, decision })` applies the `off`, `advisory`, and `required` capability gate without choosing a host implementation.

The routing decision exposes `schema_version`, `policy_version`, `routing_class`, deterministic `reason_codes`, `source`, and `failure_state`. When a host Task Assessment is supplied, the normalized visible assessment may also be included. No provider, model, credential, prompt, or reasoning-effort field is allowed.

`distinct_failed_routes` accepts the original non-negative count and a restart-safe attempt list. A list counts unique `route_id` values only when `status=failed` and `failure_kind=route`. Same-route retries, cancellations, startup failures, and network failures do not count. The escalation threshold is exactly `2`. The config authority uses the user-supplied key `failure_escalation_threshold`; the renamed key `distinct_failed_routes_threshold` is rejected.

## Task Assessment Contract

The exact v1 assessment keys are:

- `schema_version: "1"`
- `complexity: low | medium | high`
- `uncertainty: low | medium | high`
- `oracle_strength: strong | mixed | weak`
- `blast_radius: low | medium | high`
- `reversibility: reversible | guarded | irreversible`
- `risk_flags`: at most 16 bounded safe identifiers
- `summary`: visible, secret-safe text bounded to 1024 UTF-8 bytes

Unknown fields, raw secrets, hidden-reasoning fields, prompt fields, invalid enum values, oversized summaries, and oversized risk lists fail closed. Workflow validates this object and applies deterministic policy; it does not generate the assessment or invoke an AI/model API.

## Deterministic Route Policy

The suite freezes all five classes and exact precedence:

`escalation > critical > explore > standard > mechanical`

- `escalation`: security, migration, `reversible=false`, or two distinct counted route failures. Exact mandatory reason codes are `security`, `migration`, `irreversible`, and `distinct_failed_routes_threshold_reached`.
- `critical`: weak oracle, independent audit, architecture, or recovery conflict. Exact mandatory reason codes are `weak_oracle`, `independent_audit`, `architecture`, and `recovery_conflict`.
- `explore`: high uncertainty with a non-weak oracle, unknown root, or candidate comparison. Exact mandatory reason codes are `high_uncertainty`, `unknown_root`, and `candidate_comparison`.
- `standard`: non-trivial work with no higher-priority signal; reason `nontrivial_change`.
- `mechanical`: trivial reversible work with no higher-priority signal; reason `trivial_reversible_change`.

The explicit precedence case keeps its `critical` candidate reversible and combines `candidate_comparison + authority_change`; this proves `critical > explore` without accidentally invoking the direct irreversible escalation rule.

## Integration Contract

- Config defaults to `execution.worker_routing.mode=advisory`, `policy_version=worker-routing-v1`, and `failure_escalation_threshold=2`; it accepts only `off`, `advisory`, or `required` and rejects the renamed threshold key.
- Advisory mode permits an explicit fallback when host semantic-routing capability is absent. Required mode blocks Worker start. Off mode disables routing without blocking the role-based workflow.
- Runtime and Continuation preserve the complete decision through a fresh Node process and `createDeliveryStore().resume()`.
- `worker.started` Journal payloads preserve the decision and visible assessment.
- Recovery Capsule context preserves both the active routing decision and the worker projection routing decision.
- Codex `SubagentStart` reads the restart-safe decision, records it in the worker Journal event, and displays bounded Task Assessment/routing guidance.
- Routing remains a sibling metadata surface. `selectExecutionTopology` and `assessExecutionEvidence` return identical role/evidence readiness with routing metadata present or absent.

## Calibrated RED Validation

Command:

```text
node --test core/test/c23-m7-worker-routing.test.js
```

Result: exit `1`; `13` total, `2 PASS`, `4 FAIL`, `7 SKIP`.

Expected failures:

1. `ERR_MODULE_NOT_FOUND`: `core/src/worker-routing/index.js` and its Core root exports do not exist.
2. `DEFAULT_GLOBAL_CONFIG.execution.worker_routing` is absent.
3. Recovery Capsule drops `worker_routing` from its derived context/worker projection.
4. Codex `SubagentStart` emits only generic evidence guidance and does not display or journal the active routing decision.

Existing behavior that passed:

- Runtime and Continuation round-trip the complete routing decision through a fresh-process Delivery Resume.
- Topology, role evidence, and acceptance readiness are unchanged when routing and Task Assessment metadata are present as sibling fields.

Additional validation:

- Test syntax: PASS (`node --check`).
- Fixture JSON parse: PASS.
- Regression catalog JSON parse: PASS.
- Regression inventory dry-run: PASS; M7 is maintained (`59` maintained entries at this observation).
- Scoped `git diff --check`: PASS.

## Expected Production Modules

- `core/src/worker-routing/index.js`: assessment validation, classification, failure normalization, and capability handoff.
- `core/src/index.js`: focused public exports.
- `core/src/config/index.js`: default/normalization/validation for routing mode and policy metadata.
- `core/src/recovery/capsule.js`: restart-safe active and per-worker routing projection.
- `core/src/codex-hooks/index.js`: bounded SubagentStart guidance and worker Journal propagation.

Current generic Runtime/Continuation and Delivery Resume code already satisfy the frozen persistence case. Production should not create a second lifecycle authority or couple routing to `execution-topology` acceptance.

## Modified Test Surfaces And Hashes

- `core/test/c23-m7-worker-routing.test.js`: `afc34f42b80460fc4961c6129a8770225146e744c9a9fad8b943ec8bf08d33e1`
- `core/test/fixtures/c23-m7/worker-routing-cases.json`: `f8b56dc060e0c29e4600350408e009e9b0f662c8d1bd8080684475d69e44f394`
- `tests/regression-catalog.json`: `37a9c114a8c5bcc54dcdd389d276e75fadf8e84ab3064127e656de7df2515891`

No production, documentation, Skill, config, Runtime, Continuation, legacy lifecycle, Hook configuration, installed plugin, cachebuster, release artifact, VSP-Codex, `dist/`, or `redskill-package/` file was modified by this test identity.

Frozen plugin metadata baselines observed after RED creation:

- `.codex-plugin/plugin.json`: `a5874b84d5338e3ee6de4a0ec87874bb0789346ad461017f1dc8e323179080dd`
- `.claude-plugin/plugin.json`: `fe3689d85d7b50fb603b6d5e5e2077dc2a7e28f5a6e490d541214801da505ae8`
- `.claude-plugin/marketplace.json`: `f6074d2a87b5bc6d0df668fc41f6b5745cb735ed7b5300b9d56599014743362f`

## Expected Result And Residual Risk

After implementation, the focused suite should report `13/13 PASS` without changing topology roles, evidence requirements, acceptance authority, plugin metadata, or host-specific selection. The seven currently skipped pure-policy cases will then validate the complete class matrix, calibrated signal oracle, precedence, exclusions, assessment bounds, capability modes, and absence of host resolution fields.

The test intentionally defines semantic classes and host capability behavior, not a concrete host mapping. Real VSP-Codex integration, provider/model resolution, cachebuster update, plugin reinstall, and release artifact rebuild remain outside M7 and require a later jointly reviewed contract.
