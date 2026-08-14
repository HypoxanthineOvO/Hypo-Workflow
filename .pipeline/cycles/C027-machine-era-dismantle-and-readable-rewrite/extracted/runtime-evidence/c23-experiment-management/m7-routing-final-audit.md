# C23 M7 Semantic Worker Routing Final Independent Audit

- Worker ID: `c23-m7-final-audit`
- Role: `audit`
- Delivery: `c23-experiment-management`
- Milestone: `M7`
- Snapshot: final frozen post-P2-remediation snapshot
- Recorded at: `2026-07-18T22:24:11+08:00`
- Verdict: `PASS_READY_FOR_MILESTONE_VERIFICATION`
- Finding counts: `P0=0 / P1=0 / P2=0`
- Delivery advancement: none

## Findings

No P0, P1, or P2 finding remains. The final frozen M7 snapshot passes the complete semantic Worker Routing contract and closes every prior independent-audit finding.

This audit changed only this report. It did not edit production, tests, fixtures, config, docs, Skills, Runtime, Continuation, legacy `.pipeline` authority, plugin metadata/cachebuster, `dist/`, `redskill-package/`, or VSP-Codex, and it did not advance M7 or the Delivery.

## Prior Finding Closure

### P1 closed: strict, partial-override-compatible config authority

- `config.schema.yaml` contains exactly one `$defs.worker_routing_policy`.
- Its exact keys are `mode`, `policy_version`, and `failure_escalation_threshold`; `additionalProperties` is `false`.
- Modes are exactly `off | advisory | required`; defaults are `advisory / worker-routing-v1 / 2`.
- `policy_version` and the threshold are fixed by `const`; the definition and `execution.worker_routing` defaults agree with Core.
- The definition has no required fields, so a raw partial override such as `{ mode: required }` remains compatible with Core's default merge.
- The renamed `distinct_failed_routes_threshold`, arbitrary unknown keys, unsupported modes, policy versions, and thresholds fail closed.

### P1 closed: bounded semantic inputs and zero-write rejection

- Every Worker Routing semantic identifier is bounded to `128` UTF-8 bytes before generic identifier normalization.
- `128`-byte ASCII identifiers are accepted; `129`-byte ASCII and character-short multibyte overruns reject without echo.
- Coverage includes assessment risk flags, role/operation/task/change identifiers, failure attempt route/status/kind values, persisted route IDs, routing class, reasons, source, and handoff mode.
- Failure history accepts at most `256` attempts; persisted distinct failed route IDs accept at most `64` entries.
- `257` attempts and `65` persisted IDs reject. The invalid Runtime persistence case leaves the workspace byte-identical and creates no transaction residue.

### P2 closed: Worker start/stop routing tri-state

- A matching routed `worker.started` event freezes and reuses its original route after active Runtime changes.
- A matching unrouted `worker.started` event freezes routing omission after active Runtime gains a route.
- Only a completely missing matching start may use the active Runtime/Continuation fallback.
- The final Hook implementation distinguishes start presence from its optional routing value, preventing historical Worker relabeling while preserving the documented compatibility fallback.

## Complete M7 Contract Review

### Task Assessment and deterministic policy

- The exact v1 Task Assessment has only `schema_version`, `complexity`, `uncertainty`, `oracle_strength`, `blast_radius`, `reversibility`, `risk_flags`, and `summary`.
- Enums, the 16-item risk bound, the 1024-byte visible summary bound, raw-secret checks, hidden-reasoning rejection, prompt-carrier rejection, unknown-field rejection, and no-echo error behavior are enforced.
- Precedence is deterministic: `escalation > critical > explore > standard > mechanical`.
- Canonical mechanical mappings are `status/status_query`, `format/formatting`, `read-only-summary/read_only_summary`, and `deterministic-test-command/deterministic_test_command`.
- Security, migration, irreversible work, and the two-route threshold escalate. Weak oracle, independent audit, architecture, recovery conflict, high blast radius, and risk flags are critical. Unknown root, candidate comparison, high uncertainty, and investigation are explore.
- Persisted decisions bind reasons to their class, bind source to assessment presence, require the threshold reason when applicable, and reject a class below mandatory persisted assessment/failure signals.

### Failure accounting and capability modes

- Only unique `route_id` values with `status=failed` and `failure_kind=route` count.
- Same-route retries, cancellations, startup failures, and network failures do not increase the count.
- The escalation threshold is exactly `2`.
- `off` returns an enabled start with no routing decision in the handoff; `advisory` records explicit unsupported-host fallback; `required` blocks an unsupported Worker start; supported advisory handoff is explicitly routed.

### Persistence, recovery, and authority separation

- Runtime and Continuation validate and preserve the same complete routing decision.
- Real Delivery lifecycle writes preserve it, and fresh-process `createDeliveryStore().resume()` reuses it without reclassification, including missing/degraded Pack behavior.
- Worker Journal events preserve the visible assessment and semantic decision.
- Recovery Capsule preserves both active routing context and per-Worker routing projections; newer Continuation remains authoritative.
- Codex `SubagentStart` displays bounded Task Assessment/class/policy/reasons and journals the persisted decision. `SubagentStop` follows the frozen tri-state above.
- No lifecycle fact is written to legacy `state.yaml`, `cycle.yaml`, `log.yaml`, `PROGRESS.md`, `rules.yaml`, or `knowledge/` by this M7 implementation/audit path.

### Orthogonality and host boundary

- Routing metadata is a sibling surface: topology selection, worker identities, role separation, evidence readiness, acceptance readiness, and user authority are byte/semantically unchanged with routing present or absent.
- Root/Goal/Cycle/Plan/Resume Skills describe host-produced visible assessment, deterministic Core validation, routing modes, persistence, and no-reclassification Resume behavior.
- Chinese and English configuration/Codex documentation describe the same fields, precedence, modes, bounds, persistence, and topology/acceptance separation.
- The routing policy is pure and performs no model/API/network/process invocation.
- Emitted decisions and handoffs contain no concrete model, provider, credential, prompt, or reasoning-effort selection. No class-to-host-runtime mapping is introduced.
- `automation.codex.external_model_routing=false` remains fixed. Plugin metadata/cachebuster, installed release artifacts, `dist/`, `redskill-package/`, and VSP-Codex remain outside and unchanged by M7.

## Fresh Validation

Focused contract:

```text
node --test core/test/c23-m7-worker-routing.test.js
21 tests / 21 PASS / 0 FAIL / 0 SKIP / 0 TODO
```

Relevant maintained integration (15 files across adaptive planning, Capsule, Cycle, Codex Hooks, Delivery, Recovery, Runtime, and topology):

```text
138 tests / 138 PASS / 0 FAIL / 0 SKIP / 0 TODO
```

Full maintained release boundary:

```text
npm test
inventory: 59 maintained / 116 quarantined / 59 selected
638 tests / 638 PASS / 0 FAIL / 0 SKIP / 0 TODO
```

No quarantined test is used as acceptance evidence.

## Static and Integrity Validation

- `node --check`: PASS for Worker Routing, config, Runtime, Delivery, Recovery Capsule, Codex Hooks, docs source, Core root, and the focused test (`9/9`).
- Structured parse: PASS for `config.schema.yaml`, Manifest, Runtime, and Continuation (`4/4` YAML), plus fixture, catalog, and three plugin manifests (`5/5` JSON).
- Full tracked `git diff --check`: PASS.
- Untracked Worker Routing source/test/fixture `git diff --no-index --check`: no whitespace diagnostics.
- Repository `.pipeline/runtime/transactions` descendants: `0`.
- `/tmp/hw-c23-m7-*` workspaces: `0`.
- No plugin, `dist/`, or `redskill-package` file has an M7-time modification; scoped Git diff contains no such path.
- Runtime remains Delivery `executing`, M7 `executing`, `next_action=continue_active_milestone`; the persisted final audit route remains `critical / independent_audit` in both Runtime and Continuation.

## Evidence and Snapshot Hash Verification

The RED/remediation/P2 evidence chain hashes resolve to the exact files referenced by later implementation/retest reports:

- Initial RED: `5cebc51c363b088247547420ecf3ee73c07dd03872e5dd375ea0f7536a49f414`
- Initial retest: `64c75f6b1dfc8c03a431d8db3c2b1ddfc185fad88ec8909a85a8aadc99172a25`
- Initial implementation: `d525e6ebce50ba0c1676b62a6715fe31ebfd8a6600eba9435e5e986472f61009`
- Reaudit/P2 discovery: `6451e2239f357e2af15a14a14cfe9e9e0860bb3e96bad7c9cef326c01573cfc5`
- P1 remediation RED: `8e3f0e50b3ccc5e8f75a4cf6a7daba436bb39d7c7f5f74d285ad3b611c4e1b4b`
- P1 remediation retest: `ff262c8e7f4d40047ddcb3a5ab96cd7249d57793045fd4ad48915966d743ccd7`
- P1 remediation implementation: `c9606a3564a63002ef016db964805efafc1323ef154b3b5b46ab95be58317290`
- P2 RED: `ece9529816f0cff3ecf287c4e28ce2876f7a2a46a3d581a57a4d856beaedea6d`
- P2 retest: `8feaafc0d844074053074320a3497ea771f53e86ab344e818b27d86e014c6a30`
- P2 implementation: `dee77c782572238a890251035c281e076a8091e9b9a3b0a1a4769fbaaa16e17b`

Final frozen implementation/oracle hashes match the P2 implementation and retest attestations:

- `config.schema.yaml`: `7874cfbe1d1de2a226d4035490d5228b5dcf1da6f0944af576cc68dfeed85ae8`
- `core/src/worker-routing/index.js`: `133f5a5605916b159fd32fa7be5a65b539175d22498f95b251ece738b623d0bd`
- `core/src/config/index.js`: `be4cbce7f8c8fefbac7cb5cd2351ff0630e43313fd903d171570ded544ed92bf`
- `core/src/runtime/index.js`: `e143251c463a4f7dc77eb63d2007e7cc9d99d6834ef94691f60ec61f3f0766a5`
- `core/src/delivery/index.js`: `5c6096cb5cc7a7fe4efba40cc367b708f1366854550b8bd43abf897da280836f`
- `core/src/recovery/capsule.js`: `d48832c6161225c085584540d5c4bd8e2466e9fe724ad4d77210072b45f1e48d`
- `core/src/codex-hooks/index.js`: `ec41529bc7849c9ff9ff3f033302419afa99ef7d6101ed96a7403013612dd30f`
- `core/src/docs/index.js`: `95a0f45a44c572211de72c6139ab3267991921296bc7366cddf29c515f7d3561`
- `core/src/index.js`: `830cd0333ff159960cd378ba31d32749a1bdebf6b707b6401619c0b513290c35`
- Focused test: `2c6470b4fb63582b8d9aa2129c0b7b2ec1c81e99e065dfc099d042febe3b2375`
- Fixture: `bcb1b0e5fc5f61fa4c37baceed66f3e10f11610430f3e10b2e4cf29c1461f1e5`
- Catalog: `37a9c114a8c5bcc54dcdd389d276e75fadf8e84ab3064127e656de7df2515891`

Frozen plugin hashes also match every M7 baseline:

- `.codex-plugin/plugin.json`: `a5874b84d5338e3ee6de4a0ec87874bb0789346ad461017f1dc8e323179080dd`
- `.claude-plugin/plugin.json`: `fe3689d85d7b50fb603b6d5e5e2077dc2a7e28f5a6e490d541214801da505ae8`
- `.claude-plugin/marketplace.json`: `f6074d2a87b5bc6d0df668fc41f6b5745cb735ed7b5300b9d56599014743362f`

## Expected Behavior

For every Worker, the host shows one bounded, secret-safe Task Assessment after topology is fixed. Core deterministically emits a semantic class and explicit reasons, while the configured mode decides whether the host routes, records advisory fallback, blocks, or emits no hint. The decision survives Runtime/Continuation, Delivery transitions, Journal, Capsule, compaction, and Resume without changing the Worker's identity, evidence duties, acceptance, or authority. A Worker stop preserves the route state at its matching start, including omission.

## Problems Encountered

No implementation or validation problem occurred in this final audit. The full maintained command output was large but completed successfully; no rerun was needed. The repository intentionally contains pre-existing general model-pool configuration, so the concrete-host scan was correctly limited to the M7 routing policy, oracle, managed guidance, and bilingual routing documentation rather than making an unrelated whole-repository claim.

## Residual Risks and Follow-up

- Concrete semantic-class-to-runtime mapping, provider/model resolution, plugin reinstall/cachebuster, release bundle rebuild, VSP-Codex integration, and real-host Pilot remain intentionally out of scope.
- The active Delivery still has a missing/degraded Recovery Pack. Runtime and Continuation are authoritative, and the maintained suite proves degraded Resume, but this is not external-host interoperability evidence.
- Historical quarantined tests remain outside the current maintained release boundary; none is used to support this verdict.

With no P0/P1/P2 finding and all fresh gates green, the final frozen snapshot is ready for the parent to perform M7 milestone verification. This audit itself does not perform that transition.
