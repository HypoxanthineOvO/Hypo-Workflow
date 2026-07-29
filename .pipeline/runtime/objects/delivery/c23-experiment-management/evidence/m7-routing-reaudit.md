# C23 M7 Worker Routing Fresh Independent Reaudit

- Worker ID: `c23-m7-routing-reaudit`
- Role: `audit`
- Delivery: `c23-experiment-management`
- Milestone: `M7`
- Snapshot: final remediation snapshot
- Verdict: `FAIL_P2_NEEDS_REMEDIATION`
- Delivery advancement: none

## Findings

### P2: an unrouted Worker stop inherits a later active route

The frozen per-Worker `SubagentStop` contract is incomplete. When the same Worker's open `worker.started` event exists but has no `worker_routing` field, `readWorkerRoutingForEvent` does not freeze that absence. It falls through to the current Runtime/Continuation decision, so the stop event can be relabeled with a route that was staged only after the Worker started.

Independent temporary-workspace reproduction:

1. Write valid Runtime and Continuation without `worker_routing` and activate the Delivery.
2. evaluate `SubagentStart` for one audit Worker; its `worker.started` payload correctly omits `worker_routing`.
3. Advance Runtime and Continuation to a valid `critical` decision for later work.
4. evaluate `SubagentStop` for the original Worker and replay its Journal events.

Exact observed projection:

```json
[
  {"type":"worker.started","has_worker_routing":false,"routing_class":null},
  {"type":"worker.stopped","has_worker_routing":true,"routing_class":"critical"}
]
```

Root cause: `core/src/codex-hooks/index.js:423-428` finds the open `priorStart`, but returns its frozen decision only when `priorStart.payload.worker_routing !== undefined`; an existing start with an omitted route therefore falls back to `readActiveWorkerRouting`.

Expected behavior: finding an open start for that Worker must freeze both presence and absence. If the start omitted routing, the stop must also omit routing. Active Runtime fallback is appropriate only when no matching open start exists. The focused oracle should add the no-route-start/runtime-advance/stop case alongside the existing old-route/new-route case.

Impact: Worker Journal and derived Capsule evidence can state a semantic route the Worker never received, and `off`/omitted routing can be lost after Runtime advances. This does not directly change topology, role evidence, or acceptance, but it violates M7's frozen per-Worker handoff and restart-safe evidence integrity. No P0 or P1 finding was observed.

## Verdict

`FAIL_P2_NEEDS_REMEDIATION`. The two prior P1 findings are closed and all maintained tests are green, but the independently reproduced P2 prevents M7 audit acceptance. This audit does not advance Delivery or certify the snapshot as PASS.

## Closed P1 Findings

### P1 closed: strict, partial-override-compatible config schema

`config.schema.yaml` now publishes exactly one `$defs.worker_routing_policy` with:

- exact keys `mode`, `policy_version`, and `failure_escalation_threshold`;
- `additionalProperties: false`;
- `mode: off | advisory | required`, default `advisory`;
- `policy_version: const/default worker-routing-v1`;
- `failure_escalation_threshold: const/default 2`;
- complete definition-level and `execution.worker_routing` defaults;
- one local `$ref` from `execution.worker_routing`;
- no `required` constraint, so raw `{ mode: "required" }` remains compatible with Core's default merge;
- rejection of the renamed `distinct_failed_routes_threshold` and arbitrary unknown keys.

Focused test 2 independently parses the YAML and exercises the structured raw-override contract. Core normalization independently rejects unknown/renamed keys and unsupported values.

### P1 closed: bounded routing identifiers and collections

The routing-local validator caps every accepted semantic identifier at `128` UTF-8 bytes before `normalizeSafeIdentifier`. The bound covers assessment enums/risk flags, direct role/operation/task/change identifiers, attempt route/status/failure identifiers, handoff mode, persisted class/reasons/source, and persisted route IDs. Rejection messages name only the field/schema and do not echo the rejected value.

Focused tests 10 and 11 reproduce the boundaries:

- 128-byte ASCII accepts; 129-byte ASCII and 129-byte multibyte overruns fail closed without echo.
- failure-attempt arrays accept 256 and reject 257.
- persisted distinct route IDs accept 64 and reject 65.
- invalid 65-ID Runtime persistence leaves the temporary workspace byte-identical and creates no transaction residue.

## Remaining M7 Contract Review

No additional P0/P1/P2 finding was identified in the reviewed snapshot:

- Task Assessment is exact, visible, 1024-byte bounded, enum-constrained, secret-scanned, and rejects unknown prompt/hidden-reasoning fields.
- Five-class precedence is deterministic: `escalation > critical > explore > standard > mechanical`, with mechanical operation mappings and class-bound persisted reason codes.
- Only distinct `status=failed` and `failure_kind=route` IDs count; same-route retry, cancellation, startup failure, and network failure are excluded.
- Persisted decisions validate reason/class binding, source/assessment binding, threshold reason presence, and mandatory assessment/failure minimum class.
- `off`, `advisory`, and `required` return explicit disabled/fallback/blocked semantics without resolving a host implementation.
- Runtime, Continuation, Delivery writes, fresh Resume, Journal, Capsule, and Codex start integration preserve valid decisions; the sole exception is the P2 absence-freeze stop path above.
- Existing routed-start/routed-stop behavior freezes the original Worker's route when Runtime advances to a different route.
- Routing remains orthogonal to topology selection, role evidence, and acceptance readiness.
- root/Goal/Cycle/Plan/Resume Skills and Chinese/English configuration/Codex documentation describe semantic routing, persistence, fallback modes, and host-owned non-goals.
- Core routing decisions contain no concrete model/provider/runtime mapping, credential, prompt, or reasoning-effort selection and invoke no network/process model API.

## Test Commands And Results

Focused M7:

```text
node --test core/test/c23-m7-worker-routing.test.js
20 tests / 20 PASS / 0 FAIL / 0 SKIP / 0 TODO
```

Relevant maintained integration, 15 files covering Codex Hooks, Delivery, Runtime, Recovery, Capsule, Cycle, topology, and evidence:

```text
node --test core/test/codex-hook-process.test.js core/test/codex-hooks-vnext.test.js core/test/delivery-bootstrap-promotion.test.js core/test/c23-m1-recovery-remediation.test.js core/test/c23-m6-codex-hook-compatibility.test.js core/test/delivery-proposal-preflight.test.js core/test/delivery-receipts.test.js core/test/execution-topology.test.js core/test/recovery-faults.test.js core/test/recovery-journal.test.js core/test/recovery-pack.test.js core/test/runtime-store.test.js core/test/adaptive-plan.test.js core/test/context-capsule.test.js core/test/cycle-lifecycle-vnext.test.js
138 tests / 138 PASS / 0 FAIL / 0 SKIP / 0 TODO
```

Full maintained boundary:

```text
npm test
inventory: 59 maintained / 116 quarantined / 59 selected
637 tests / 637 PASS / 0 FAIL / 0 SKIP / 0 TODO
```

The focused run imports all M7 JavaScript modules, parses `config.schema.yaml`, loads the fixture JSON, verifies cataloged behavior, and exercises temporary-workspace cleanup/zero-write assertions. Once the P2 reproduced, the host directed this audit to freeze FAIL evidence immediately; separate post-finding syntax, `git diff --check`, and residue commands were therefore not rerun and are not used to override the FAIL verdict.

## Frozen Hashes And Drift Check

All independently sampled M7 implementation, oracle, catalog, and plugin hashes match the final remediation implementation/retest snapshot:

- `config.schema.yaml`: `7874cfbe1d1de2a226d4035490d5228b5dcf1da6f0944af576cc68dfeed85ae8`
- `core/src/worker-routing/index.js`: `133f5a5605916b159fd32fa7be5a65b539175d22498f95b251ece738b623d0bd`
- `core/src/config/index.js`: `be4cbce7f8c8fefbac7cb5cd2351ff0630e43313fd903d171570ded544ed92bf`
- `core/src/runtime/index.js`: `e143251c463a4f7dc77eb63d2007e7cc9d99d6834ef94691f60ec61f3f0766a5`
- `core/src/delivery/index.js`: `5c6096cb5cc7a7fe4efba40cc367b708f1366854550b8bd43abf897da280836f`
- `core/src/recovery/capsule.js`: `d48832c6161225c085584540d5c4bd8e2466e9fe724ad4d77210072b45f1e48d`
- `core/src/codex-hooks/index.js`: `b135e38b4fb1c832adb0c95ceee5d3c74c8db6182c8d6d15b1ebc337b767c146`
- `core/src/docs/index.js`: `95a0f45a44c572211de72c6139ab3267991921296bc7366cddf29c515f7d3561`
- `core/src/index.js`: `830cd0333ff159960cd378ba31d32749a1bdebf6b707b6401619c0b513290c35`
- `core/test/c23-m7-worker-routing.test.js`: `78f20b4bca9e91ebf81860a8115ec52a1e36b6f5d38b790f7b12b7789e3e3e8c`
- `core/test/fixtures/c23-m7/worker-routing-cases.json`: `bcb1b0e5fc5f61fa4c37baceed66f3e10f11610430f3e10b2e4cf29c1461f1e5`
- `tests/regression-catalog.json`: `37a9c114a8c5bcc54dcdd389d276e75fadf8e84ab3064127e656de7df2515891`
- `.codex-plugin/plugin.json`: `a5874b84d5338e3ee6de4a0ec87874bb0789346ad461017f1dc8e323179080dd`
- `.claude-plugin/plugin.json`: `fe3689d85d7b50fb603b6d5e5e2077dc2a7e28f5a6e490d541214801da505ae8`
- `.claude-plugin/marketplace.json`: `f6074d2a87b5bc6d0df668fc41f6b5745cb735ed7b5300b9d56599014743362f`

Plugin metadata is hash-identical to the frozen baseline. This audit identity did not edit cachebuster, installed plugin state, `dist/`, `redskill-package/`, or VSP-Codex.

## Modified Path And Write Boundary

This audit identity created only:

- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m7-routing-reaudit.md`

It did not modify production, test, config, documentation, Skills, Runtime, Continuation, legacy `.pipeline` authority, plugin metadata/cachebuster, release artifacts, or VSP-Codex. Temporary test/reproduction workspaces were outside the repository and were removed.

## Expected Result After Remediation

After the Hook lookup distinguishes “matching open start with no route” from “no matching open start,” the original Worker must stop with routing still omitted while later Workers may use the newly staged route. The existing routed-start freeze case, both closed P1 boundaries, and all 20 focused contracts must remain green. A fresh independent test and audit identity should then rerun focused, relevant maintained, and full maintained gates before M7 advances.

## Problems And Residual Risks

- The current 20-test oracle is green because it freezes a prior concrete route but does not freeze route absence; the temporary probe exposed that missing case.
- The active C23 Recovery Pack remains missing/degraded. Runtime and Continuation are authoritative; tests cover missing-Pack Resume, but external host interoperability remains unproven.
- Concrete VSP-Codex semantic-class-to-runtime mapping, provider/model resolution, plugin reinstall/cachebuster, release bundle rebuild, and real-host Pilot remain intentionally out of M7 scope.
- No quarantined test was used as acceptance evidence.
