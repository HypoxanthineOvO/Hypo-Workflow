# C23 M7 Worker Routing P2 RED

- Worker ID: `c23-m7-routing-test`
- Role: `test`
- Recorded at: `2026-07-18T22:05:07+08:00`
- Verdict: `RED_READY_FOR_P2_REMEDIATION`
- Runtime advancement: none

## Conclusion

The independent P2 regression is frozen with exactly one new failure. Focused M7 reports `21` total, `20 PASS`, `1 FAIL`, `0 SKIP`, exit `1`. All prior M7 contracts remain green.

The failure proves that `SubagentStop` currently backfills the active critical route onto an open Worker whose matching `worker.started` event explicitly omitted `worker_routing`. The absence at start time must be frozen just like a present route.

This worker changed only `core/test/c23-m7-worker-routing.test.js` and this evidence. It did not edit production, config, docs, Skills, fixture, catalog, Runtime/Continuation, plugin metadata, or release artifacts, and it did not advance the Delivery.

## Frozen Regression

The new test uses one temporary current workspace and public Core/Hook APIs:

1. Seed active Runtime/Continuation without `worker_routing`.
2. Start a Worker and confirm its `worker.started` payload omits `worker_routing`.
3. Advance active Runtime/Continuation to the valid critical `ROUTING_DECISION`.
4. Stop a different Worker with no matching start and confirm the documented active critical fallback still works.
5. Stop the original open Worker in the same session and assert both its start and stop payloads omit `worker_routing`.

The existing routed-start test remains green: a standard route present at start stays standard after active Runtime advances to critical. Together, the contract preserves three distinct states:

- matching start with route: reuse the frozen route;
- matching start without route: preserve omission;
- no matching start: active routing fallback remains allowed.

## Focused RED Result

```text
node --test core/test/c23-m7-worker-routing.test.js
21 tests / 20 PASS / 1 FAIL / 0 SKIP / exit 1
```

Sole expected failure:

```text
Codex SubagentStop preserves an unrouted open worker after Runtime gains routing
Object.hasOwn(workerEvents[1].payload, "worker_routing")
actual: true
expected: false
```

The failure occurs only at the final stopped-payload assertion. Before it, the test confirms the started payload omitted routing and the completely missing-start Worker successfully used the active critical fallback.

## Root Cause And Expected Fix

Observed stop resolution conflates “matching open start exists but has no routing field” with “no matching open start exists.” Both currently fall through to active Runtime routing. Remediation must preserve a found-start sentinel independently from the route value: when a matching start exists, copy its route if present and preserve omission if absent; consult active routing only when no matching start exists.

## Validation

- `node --check core/test/c23-m7-worker-routing.test.js`: PASS.
- Test whitespace check: PASS (`git diff --no-index --check` emitted no diagnostics; exit `1` only because the untracked test differs from `/dev/null`).
- Repository transaction descendants: `0`.
- `/tmp/hw-c23-m7-*` workspaces: `0`.
- Maintained/full suites: intentionally not run while freezing RED.

## Frozen Hashes

- `core/test/c23-m7-worker-routing.test.js`: `2c6470b4fb63582b8d9aa2129c0b7b2ec1c81e99e065dfc099d042febe3b2375`
- `core/src/codex-hooks/index.js` (observed, unchanged by this worker): `b135e38b4fb1c832adb0c95ceee5d3c74c8db6182c8d6d15b1ebc337b767c146`
- `core/src/worker-routing/index.js` (observed, unchanged by this worker): `133f5a5605916b159fd32fa7be5a65b539175d22498f95b251ece738b623d0bd`
- `core/test/fixtures/c23-m7/worker-routing-cases.json` (unchanged): `bcb1b0e5fc5f61fa4c37baceed66f3e10f11610430f3e10b2e4cf29c1461f1e5`
- `tests/regression-catalog.json` (unchanged): `37a9c114a8c5bcc54dcdd389d276e75fadf8e84ab3064127e656de7df2515891`

## Residual Risk

The production fix must distinguish the three states without changing Worker identity matching, routed-start freezing, missing-start fallback, Journal ordering, or host-owned mapping boundaries. A green focused rerun and maintained Codex/Recovery integration retest are required after remediation.
