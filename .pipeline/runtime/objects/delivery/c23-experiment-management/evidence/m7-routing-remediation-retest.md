# C23 M7 Worker Routing Remediation Independent Retest

- Worker ID: `c23-m7-routing-test`
- Role: `test`
- Session: `c23-m7-routing-remediation-retest-r2`
- Recorded at: `2026-07-18T21:43:09+08:00`
- Verdict: `PASS_READY_FOR_INDEPENDENT_AUDIT`
- Runtime advancement: none

## Conclusion

M7 remediation is green on the frozen independent contract. Focused M7 is `20/20 PASS`; the 15-file relevant maintained integration set is `138/138 PASS`; full `npm test` selects `59` maintained files and reports `637/637 PASS`, with zero fail, skip, or todo.

All three P1 remediation findings are closed: the config schema now exposes one strict but partial-override-compatible Worker Routing definition; all semantic identifiers fail closed at 128 UTF-8 bytes without echo; attempt and persisted-route collections enforce 256 and 64 limits with zero-write invalid persistence.

This retest changed only this evidence file. It did not edit production, config, docs, Skills, test, fixture, catalog, plugin metadata, Runtime/Continuation, `dist/`, `redskill-package/`, or VSP-Codex, and it did not advance the Delivery.

## Closed P1 Findings

1. **Config schema compatibility**
   - Exactly one `$defs.worker_routing_policy` exists.
   - Allowed keys are exactly `mode`, `policy_version`, and `failure_escalation_threshold`; `additionalProperties` is `false`.
   - `required` is absent/empty, so raw `{ mode: "required" }` is compatible with Core's default merge.
   - The renamed `distinct_failed_routes_threshold` and an arbitrary unknown key are rejected.
   - Definition and `execution.worker_routing` defaults are `advisory / worker-routing-v1 / 2`; field consts/defaults and the local `$ref` match Core.
2. **UTF-8 identifier bounds**
   - 128-byte ASCII is accepted.
   - 129-byte ASCII and character-short 129-byte multibyte overruns reject without echo.
   - Coverage includes assessment risk flags, attempt/persisted route IDs, role, operation, task, and change identifiers.
3. **Collection and persistence bounds**
   - Attempts accept 256 and reject 257.
   - Persisted distinct route IDs accept 64 and reject 65.
   - The 65-ID Runtime write rejects before mutation, leaves a byte-identical workspace, and creates no transaction residue.

## Test Results

Focused contract:

```text
node --test core/test/c23-m7-worker-routing.test.js
20 tests / 20 PASS / 0 FAIL / 0 SKIP
```

Relevant maintained direct integration:

```text
node --test core/test/codex-hook-process.test.js core/test/codex-hooks-vnext.test.js core/test/delivery-bootstrap-promotion.test.js core/test/c23-m1-recovery-remediation.test.js core/test/c23-m6-codex-hook-compatibility.test.js core/test/delivery-proposal-preflight.test.js core/test/delivery-receipts.test.js core/test/execution-topology.test.js core/test/recovery-faults.test.js core/test/recovery-journal.test.js core/test/recovery-pack.test.js core/test/runtime-store.test.js
110 tests / 110 PASS
```

Maintained cross-layer integration:

```text
node --test core/test/adaptive-plan.test.js core/test/context-capsule.test.js core/test/cycle-lifecycle-vnext.test.js
28 tests / 28 PASS
```

Full maintained release boundary:

```text
npm test
inventory: 59 maintained / 116 quarantined / 59 selected
637 tests / 637 PASS / 0 FAIL / 0 SKIP / 0 TODO
```

## Static And Integrity Validation

- `node --check`: PASS for Worker Routing, config, Runtime, Delivery, Recovery Capsule, Codex Hooks, docs source, Core root, and the focused test.
- `config.schema.yaml` structured YAML parse: PASS.
- Fixture/catalog JSON parse: PASS.
- Structured schema assertions: exact keys, strict unknown-key rejection, absent/empty `required`, partial override acceptance, renamed-key rejection, defaults, consts, and local ref all PASS.
- Catalog: `59 maintained / 116 quarantined`; M7 is maintained and covers `C23-M7`.
- Full tracked `git diff --check`: PASS.
- M7 scoped tracked diff check: PASS.
- Untracked Worker Routing source/test/fixture `git diff --no-index --check`: no whitespace diagnostics.
- Repository `.pipeline/runtime/transactions` descendants: `0`.
- `/tmp/hw-c23-m7-*` workspaces: `0`.
- M7 policy/test/fixture concrete model, provider-instance, and credential-pattern scan: `0` matches.
- Recursive focused assertions also confirm emitted decisions contain no `model`, `provider`, credential, prompt, or reasoning-effort fields, and the policy performs no network/process model invocation.

The repository intentionally contains concrete identifiers in its pre-existing general model matrix. Those are not Worker Routing outputs or mappings; the M7 acceptance scan is scoped to the policy and its independent oracle instead of claiming the whole repository has no model configuration.

## Frozen Hashes

Production and schema:

- `config.schema.yaml`: `7874cfbe1d1de2a226d4035490d5228b5dcf1da6f0944af576cc68dfeed85ae8`
- `core/src/worker-routing/index.js`: `133f5a5605916b159fd32fa7be5a65b539175d22498f95b251ece738b623d0bd`
- `core/src/config/index.js`: `be4cbce7f8c8fefbac7cb5cd2351ff0630e43313fd903d171570ded544ed92bf`
- `core/src/runtime/index.js`: `e143251c463a4f7dc77eb63d2007e7cc9d99d6834ef94691f60ec61f3f0766a5`
- `core/src/delivery/index.js`: `5c6096cb5cc7a7fe4efba40cc367b708f1366854550b8bd43abf897da280836f`
- `core/src/recovery/capsule.js`: `d48832c6161225c085584540d5c4bd8e2466e9fe724ad4d77210072b45f1e48d`
- `core/src/codex-hooks/index.js`: `b135e38b4fb1c832adb0c95ceee5d3c74c8db6182c8d6d15b1ebc337b767c146`
- `core/src/docs/index.js`: `95a0f45a44c572211de72c6139ab3267991921296bc7366cddf29c515f7d3561`
- `core/src/index.js`: `830cd0333ff159960cd378ba31d32749a1bdebf6b707b6401619c0b513290c35`

Independent oracle:

- `core/test/c23-m7-worker-routing.test.js`: `78f20b4bca9e91ebf81860a8115ec52a1e36b6f5d38b790f7b12b7789e3e3e8c`
- `core/test/fixtures/c23-m7/worker-routing-cases.json`: `bcb1b0e5fc5f61fa4c37baceed66f3e10f11610430f3e10b2e4cf29c1461f1e5`
- `tests/regression-catalog.json`: `37a9c114a8c5bcc54dcdd389d276e75fadf8e84ab3064127e656de7df2515891`

Frozen plugin metadata, unchanged:

- `.codex-plugin/plugin.json`: `a5874b84d5338e3ee6de4a0ec87874bb0789346ad461017f1dc8e323179080dd`
- `.claude-plugin/plugin.json`: `fe3689d85d7b50fb603b6d5e5e2077dc2a7e28f5a6e490d541214801da505ae8`
- `.claude-plugin/marketplace.json`: `f6074d2a87b5bc6d0df668fc41f6b5745cb735ed7b5300b9d56599014743362f`

## Problems And Quarantined Context

The first syntax-discovery helper trimmed the first status line and produced a false missing-path diagnostic; explicit `node --check` commands for every M7 source/test file all pass. An initially broad concrete-identifier scan found the repository's intentional model matrix, so the final check was correctly scoped to M7 routing policy/test/fixture plus the recursive no-host-field contract.

No quarantined suite was used as acceptance evidence. The catalog still excludes 116 historical tests, including `config.test.js`, `layered-config-integration.test.js`, and the known pre-C21 `codex-continuation-preflight.test.js` failure that references removed `skills/start/SKILL.md`. The complete maintained boundary is green.

## Expected Behavior And Residual Risk

Hosts may supply partial Worker Routing config and receive a deterministic semantic class without Core selecting a concrete model/provider. Invalid identifiers, oversized failure collections, renamed config, and unknown config fail closed without echo or authority writes. Runtime, Continuation, Delivery transitions, Journal, Capsule, Codex start/stop, and fresh Resume preserve the frozen decision.

Concrete VSP-Codex class-to-runtime mapping, provider/model resolution, plugin reinstall/cachebuster, release bundle rebuild, and real-host Pilot remain intentionally out of scope. Recovery Pack for the active Delivery remains missing/degraded, so Runtime and Continuation are authoritative; the maintained suite covers missing-Pack Resume but does not prove external host interoperability.
