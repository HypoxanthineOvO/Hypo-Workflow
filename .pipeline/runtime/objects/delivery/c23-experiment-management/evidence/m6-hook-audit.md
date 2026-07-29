# C23 M6 Codex Hook + Experiment Fresh Independent Audit

- Audit identity: `c23_m6_audit`
- Role: fresh independent `audit` only
- Date: 2026-07-18 (Asia/Shanghai)
- Verdict: `PASS`
- Severity: `P0=0 / P1=0 / P2=1`
- Runtime advancement: none

## Conclusion

M6 meets its current outcome. Official Hook payloads may omit host/version-dependent `turn_id` on all nine applicable events and `tool_use_id` on both tool events. Supplied identifiers still fail closed when malformed, path-like, or secret-like. Every write-capable event receives an operation-derived safe unique fallback before authority evaluation, and no `undefined` reaches persisted authority. The wrapper returns exactly one JSON object with exit 0 for every compatible official event.

Hook output restrictions, registration, wrapper behavior, enablement/trust policy, plugin metadata, and cachebuster remain unchanged. The original C23 M1-M5 Experiment scope also passes fresh static and executable review. M7 remains pending and its concurrent planned RED was explicitly excluded.

## Findings

### P0 / P1: none

No current correctness, authority, compatibility, or security defect was found.

### P2: active-object fallback is not a maintained regression matrix

`core/test/c23-m6-codex-hook-compatibility.test.js` covers omission validation across all applicable events, representative wrapper behavior, supplied-ID rejection, and output restrictions, but does not persist missing-ID fallbacks through an active object for all seven write-capable events. Deleting `bindOptionalHookIdentifiers` could therefore leave the focused M6 suite green while active authority writes fail.

This is non-blocking for current M6 because source inspection and an independent active-object smoke both passed all seven write events, six delivery Journal event types, the ambient prompt path, unique operation IDs, exact `turn-<operation>` / `tool-<operation>` bindings, and a temporary-workspace-wide persisted-`undefined` check. Add that matrix to maintained coverage before release hardening; no test edit was authorized for this audit identity.

## M6 Technical Review

- `validateCodexHookInput` uses presence-aware validation for optional identifiers while retaining exact-key and all other event validators.
- Present identifiers run identifier-local raw-secret detection and safe single-component normalization.
- `evaluateCodexHookEvent` validates operation authority before binding fallbacks. All seven write events require a safe unique operation ID; `SessionStart`, `PreToolUse`, and `PermissionRequest` remain non-writing for this contract.
- Fallbacks are deterministic synthetic provenance, not a guessed host turn: `turn-<operation_id>` and `tool-<operation_id>`.
- `validateCodexHookOutput`, `outputKeysFor`, and event-specific output validation are unchanged.

Independent matrices:

- Optional omission: `9/9` turn-bearing events and `2/2` tool events accepted.
- Supplied invalid IDs: `33/33` rejected (`27` turn + `6` tool; type/path/secret variants).
- Active writes: `7/7` write events passed; `7/7` unique operation IDs; persisted `undefined=0`.
- Wrapper: `10/10` official events returned exit 0 and exactly one JSON object.
- Forbidden output examples and existing event allowlists remained fail closed.

## M1-M5 Independent Scope Review

- M1 authority/history/baselines: generic Runtime writes reject Experiment authority; target-bound one-shot Receipts protect supersede/baseline/review transitions; attempts, reruns, trash/restore, recovery, baseline membership, and history invariants pass.
- M2 knowledge: one-fact-per-Record history, explicit supersession, complete-history graph validation, source/project version provenance, registered-path-only freshness, stale/missing mapping, and private/secret/reasoning rejection pass.
- M3 reproducibility: exact code snapshot, `uv` lock/environment, machine/GPU, external dataset/scene/trace, command/output/resource bindings, one-axis and cross scans, OOM evidence, and logical Experiment/Attempt identity pass. Core creates specs/facts, not a runner.
- M4 long-run protocol: foreground/tmux descriptors, isolated session identity, checkpoint or restart-from-scratch evidence, operational completion, and host-owned execution pass. Suspicious or paper-inconsistent science stays `pending_confirmation` until a target-bound Receipt resolves it.
- M5 status/sync: immutable content-addressed event union, conflict fail-closed, projection-only bounded reads without result/event rescans, semantic validation after projection re-hash, Experiment-scoped Attempt identity, newest-window status, two-clone Git union, retention risks, and pilot boundary pass.
- Real NeRF, AceSim, GPU, GitLab remote, SSH/SCP, large trace, paper reproduction, and multi-week behavior remain explicitly unvalidated until a real-project Pilot Goal.

## Explicit Validation

- Hook focused + existing Hook baseline: `29/29 PASS`.
- Explicit M1-M6 + Record/Receipt/Runtime/transaction slice: `143` top-level / `194/194 PASS`.
- Existing Hook baseline added to that slice: `150` top-level / `201/201 PASS`.
- Syntax and scoped `git diff --check`: PASS.
- Maintained catalog dry-run: valid, `59` selected; not executed because it now includes concurrent planned `core/test/c23-m7-worker-routing.test.js` RED.
- M7 production, test interpretation, and milestone outcome are outside this audit.

## Freeze And State

- `core/src/codex-hooks/index.js`: `72c7b44c54f0c50c7d43beb93e292791a4fa183bf5e627f6223dfbd8872aa63f`
- `core/test/c23-m6-codex-hook-compatibility.test.js`: `8945855851c7d8b9698c509c6a6c0cb94259b51f3f61c8d0366367715313fd5b`
- `hooks/hooks.json`: `4c31e12a26158e3d67e48ee366d77c86ba8a98553ca0e953e723a7e9210fe2c5`
- `hooks/codex-hook.mjs`: `8e3b9baa4c34e1aaac1a16794666a98d4837653776b0cc7e1f6a5c7875a92b5d`
- C23 Runtime: `4d4d9f8e4a5a4df5615eaa344889a547e05c5ef179c121ef20cf8ff245c5f6b8`
- C23 Continuation: `9d1ba2db21ebf8c2876e37ae74739492590e89208b1aa41f56551d5dc063b3a0`
- Runtime remains `M6=executing`, `M7=pending`, Delivery `executing`; Continuation remains `continue_active_milestone`.
- `.pipeline/runtime/transactions/` descendants: `0` before and after validation.

## Change Boundary, Expected Result, And Risk

The only audit change is this report. Production, tests, docs, Skills, config/catalog, Runtime/Continuation, legacy state, Hooks, plugin metadata, and cachebuster were not edited; Delivery was not advanced.

Expected behavior is one successful wrapper response for compatible optional-ID payloads, strict rejection of supplied unsafe IDs, and safe unique synthetic provenance on every authority write. Residual risks are the P2 maintained-coverage gap, synthetic rather than host-native turn provenance, installed-release/live-host verification deferred until the planned unified reinstall, weak-oracle scientific judgment, and the explicit real-project pilot boundary.

No implementation problem occurred. The only execution constraint was concurrent M7 RED isolation, handled with an explicit file list instead of the full maintained set.
