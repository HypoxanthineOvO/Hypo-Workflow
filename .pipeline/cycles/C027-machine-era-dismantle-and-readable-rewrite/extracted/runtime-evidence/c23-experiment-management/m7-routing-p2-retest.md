# C23 M7 Worker Routing P2 Independent Retest

- Worker ID: `c23-m7-routing-test`
- Role: `test`
- Recorded at: `2026-07-18T22:11:43+08:00`
- Verdict: `PASS_READY_FOR_INDEPENDENT_AUDIT`
- Runtime advancement: none

## Conclusion

P2 remediation is green on the frozen independent contract. Focused M7 reports `21/21 PASS`; the 15-file maintained Codex Hook/Recovery/Runtime/Delivery/topology integration set reports `138/138 PASS`; full `npm test` selects `59` maintained files and reports `638/638 PASS`, with zero fail, skip, or todo.

The exact stop-routing tri-state is now preserved:

1. A matching open start with routing freezes and reuses that route after active Runtime changes.
2. A matching open start without routing freezes the omission after active Runtime gains routing.
3. A completely missing matching start may use the current active routing fallback.

This retest wrote only this evidence. It did not edit production, config, docs, Skills, test, fixture, catalog, plugin metadata, Runtime/Continuation, or release artifacts, and it did not advance the Delivery.

## P2 Closure

The focused test starts an unrouted Worker, verifies `worker.started` omits `worker_routing`, advances active Runtime/Continuation to a valid critical decision, proves a different missing-start Worker receives that active fallback, then stops the original Worker and verifies `worker.stopped` still omits routing. The pre-existing routed-start case separately proves a standard route remains standard after the active route advances to critical.

The remediation therefore distinguishes matching-start presence from its optional route value instead of treating an unrouted matching start as if no start existed.

## Test Results

```text
node --test core/test/c23-m7-worker-routing.test.js
21 tests / 21 PASS / 0 FAIL / 0 SKIP
```

```text
node --test <15 catalog-maintained adaptive-plan/context-capsule/cycle-lifecycle/Codex/Delivery/Recovery/Runtime/topology files>
138 tests / 138 PASS / 0 FAIL / 0 SKIP
```

```text
npm test
inventory: 59 maintained / 116 quarantined / 59 selected
638 tests / 638 PASS / 0 FAIL / 0 SKIP / 0 TODO
```

The focused run also keeps all P1 contracts green: strict partial-compatible Worker Routing schema, renamed/unknown config rejection, 128-byte ASCII and multibyte identifier boundaries without echo, 256-attempt and 64-persisted-route limits, and zero-write invalid persistence.

## Static And Integrity Validation

- `node --check`: PASS for Codex Hooks, Worker Routing, config, Runtime, Delivery, Recovery Capsule, Core root, and focused test.
- Full tracked `git diff --check`: PASS.
- M7 scoped tracked diff check: PASS.
- Untracked Worker Routing source/test/fixture checks: PASS with no whitespace diagnostics.
- Repository `.pipeline/runtime/transactions` descendants: `0`.
- `/tmp/hw-c23-m7-*` workspaces: `0`.
- Plugin metadata hashes remain unchanged.
- No quarantined test was used as acceptance evidence.

## Frozen Hashes

- `core/src/codex-hooks/index.js`: `ec41529bc7849c9ff9ff3f033302419afa99ef7d6101ed96a7403013612dd30f`
- `core/src/worker-routing/index.js`: `133f5a5605916b159fd32fa7be5a65b539175d22498f95b251ece738b623d0bd`
- `core/src/config/index.js`: `be4cbce7f8c8fefbac7cb5cd2351ff0630e43313fd903d171570ded544ed92bf`
- `core/src/runtime/index.js`: `e143251c463a4f7dc77eb63d2007e7cc9d99d6834ef94691f60ec61f3f0766a5`
- `core/src/delivery/index.js`: `5c6096cb5cc7a7fe4efba40cc367b708f1366854550b8bd43abf897da280836f`
- `core/src/recovery/capsule.js`: `d48832c6161225c085584540d5c4bd8e2466e9fe724ad4d77210072b45f1e48d`
- `core/src/index.js`: `830cd0333ff159960cd378ba31d32749a1bdebf6b707b6401619c0b513290c35`
- `config.schema.yaml`: `7874cfbe1d1de2a226d4035490d5228b5dcf1da6f0944af576cc68dfeed85ae8`
- `core/test/c23-m7-worker-routing.test.js`: `2c6470b4fb63582b8d9aa2129c0b7b2ec1c81e99e065dfc099d042febe3b2375`
- `core/test/fixtures/c23-m7/worker-routing-cases.json`: `bcb1b0e5fc5f61fa4c37baceed66f3e10f11610430f3e10b2e4cf29c1461f1e5`
- `tests/regression-catalog.json`: `37a9c114a8c5bcc54dcdd389d276e75fadf8e84ab3064127e656de7df2515891`

Plugin metadata:

- `.codex-plugin/plugin.json`: `a5874b84d5338e3ee6de4a0ec87874bb0789346ad461017f1dc8e323179080dd`
- `.claude-plugin/plugin.json`: `fe3689d85d7b50fb603b6d5e5e2077dc2a7e28f5a6e490d541214801da505ae8`
- `.claude-plugin/marketplace.json`: `f6074d2a87b5bc6d0df668fc41f6b5745cb735ed7b5300b9d56599014743362f`

## Expected Behavior And Residual Risk

Worker stop events now retain the routing state that existed at the matching start boundary, including an explicit absence, while the documented active fallback remains available only when no matching start exists. This prevents a later role or Runtime transition from relabeling an already-open Worker.

Concrete host class-to-runtime mapping, provider/model resolution, plugin reinstall/cachebuster, release bundle rebuild, and real-host Pilot remain outside this source retest. Recovery Pack interoperability remains degraded/missing for the active Delivery; Runtime and Continuation remain authoritative, and no external host interoperability claim is made.
