# C23 M7 Unrouted Worker Freeze Remediation

- Worker ID: `main`
- Role: `implement`
- Delivery: `c23-experiment-management`
- Milestone: `M7`
- Recorded at: `2026-07-18T22:14:45+08:00`
- Verdict: `REMEDIATED_READY_FOR_FINAL_AUDIT`

## Conclusion

The reaudit P2 is fixed. `SubagentStop` now distinguishes an absent open start from an open start whose routing field was intentionally absent. A matched start freezes both the routing value and its absence; only a completely missing start may fall back to active Runtime/Continuation routing.

## Technical Change

`core/src/codex-hooks/index.js` now returns `null` when `findOpenWorkerStart` finds the matching Worker but that start payload has no `worker_routing`. It validates and returns the frozen decision when the field exists, and calls `readActiveWorkerRouting` only when no open start exists.

No Hook input/output schema, Journal event schema, routing policy, Runtime format, topology, evidence, acceptance, plugin metadata, or VSP-Codex surface changed.

## Test Design And Validation

- P2 RED: `21 total / 20 PASS / 1 FAIL`; the sole failure proved an unrouted open Worker was backfilled from a later critical active route.
- Focused after fix, independent test: `21/21 PASS`.
- Relevant maintained integration, independent test: `138/138 PASS`.
- Full maintained, independent test: `59` files, `638/638 PASS`.
- Full maintained, fresh main-thread run: `59` files, `638/638 PASS`.
- Tri-state contract:
  - Routed open start freezes its original route.
  - Unrouted open start freezes routing omission.
  - Missing start may use active fallback.
- Prior config-schema and 128/256/64 bounded-input P1 regressions remain green.
- Syntax, diff, transaction residue, and plugin metadata checks: PASS.

## Expected Result

Legacy, `off`, or otherwise unrouted Workers cannot be relabeled by a later Worker decision at stop time. Worker Journal and Recovery Capsule projections preserve historical truth while missing-start compatibility remains available.

## Remaining Risks

- One new independent final audit must verify the final frozen snapshot before M7 can be marked verified.
- Host-specific semantic routing resolution and plugin reinstall remain intentionally out of scope.
- Active C23 recovery remains missing-Pack/degraded but authoritative Runtime/Continuation Resume is covered.

## Frozen Hashes

- `core/src/codex-hooks/index.js`: `ec41529bc7849c9ff9ff3f033302419afa99ef7d6101ed96a7403013612dd30f`
- Focused test: `2c6470b4fb63582b8d9aa2129c0b7b2ec1c81e99e065dfc099d042febe3b2375`
- P2 RED evidence: `ece9529816f0cff3ecf287c4e28ce2876f7a2a46a3d581a57a4d856beaedea6d`
- P2 retest evidence: `8feaafc0d844074053074320a3497ea771f53e86ab344e818b27d86e014c6a30`
- Worker Routing module: `133f5a5605916b159fd32fa7be5a65b539175d22498f95b251ece738b623d0bd`
- Config schema: `7874cfbe1d1de2a226d4035490d5228b5dcf1da6f0944af576cc68dfeed85ae8`
- `.codex-plugin/plugin.json`: `a5874b84d5338e3ee6de4a0ec87874bb0789346ad461017f1dc8e323179080dd`
