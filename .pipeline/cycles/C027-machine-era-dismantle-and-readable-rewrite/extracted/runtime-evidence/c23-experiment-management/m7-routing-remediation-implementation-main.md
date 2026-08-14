# C23 M7 Worker Routing Remediation Implementation Evidence

- Worker ID: `main`
- Role: `implement`
- Delivery: `c23-experiment-management`
- Milestone: `M7`
- Recorded at: `2026-07-18T21:47:12+08:00`
- Verdict: `REMEDIATED_READY_FOR_FRESH_REAUDIT`

## Conclusion

The two independent-audit P1 findings are remediated, and the corrected config compatibility contract is green. `config.schema.yaml` now declares the same strict Worker Routing keys, values, defaults, and unknown-key rejection as Core while still allowing a partial project override such as `{ mode: required }`. Every routing semantic identifier is bounded to 128 UTF-8 bytes; failure-attempt inputs are bounded to 256 entries; persisted distinct route IDs are bounded to 64.

Focused, relevant maintained, and full maintained regressions pass on the final snapshot. No Delivery state was advanced by implementation or test identities. Plugin metadata, cachebuster, installed plugins, VSP-Codex, `dist/`, and `redskill-package/` were not changed.

## Findings And Fixes

### P1: Config authority rejected the documented field

The root config schema used `additionalProperties: false` for `execution` but did not declare `worker_routing`. Core and docs therefore accepted a field that authority-schema validation would reject.

Fix:

- Added one strict `worker_routing_policy` definition.
- Allowed exactly `mode`, `policy_version`, and `failure_escalation_threshold`.
- Restricted values to `off|advisory|required`, `worker-routing-v1`, and `2`.
- Added object and execution defaults plus `execution.worker_routing` reference.
- Kept the raw override schema partial: no `required` array, matching Core's default-merge behavior.
- Kept renamed or unknown keys rejected by `additionalProperties: false`.

The first remediation schema/test draft incorrectly required all three raw fields. The test identity challenged that assumption, corrected the oracle to preserve partial overrides, reproduced one focused RED failure, and the implementation removed the incompatible `required` list.

### P1: Semantic identifiers and failure history were not byte-bounded

The prior array schemas limited item counts but reused an unbounded safe-identifier helper. A very large risk flag or route ID could expand Runtime, Continuation, Journal, and Capsule data.

Fix:

- Added a routing-local 128-byte UTF-8 identifier validator.
- Applied it to assessment enums/risk flags, role, operation/task/change kinds, handoff mode, persisted class/source/reasons, failure route IDs, statuses, and failure kinds.
- Limited one failure-attempt input array to 256 entries.
- Limited persisted distinct failed route IDs to 64.
- Kept boundary values valid and rejected ASCII or multibyte overruns without echo.

## Modified Modules

- `core/src/worker-routing/index.js`: identifier byte bound, attempt/distinct-ID collection bounds, and bounded normalization across every routing semantic identifier.
- `config.schema.yaml`: strict but partial-override-compatible Worker Routing authority schema and execution default.
- `core/src/docs/index.js`: config schema as a documentation source plus the new numeric limits.
- `docs/reference/configuration.md` and `docs/en/reference/configuration.md`: user-visible 128/256/64 limits and fail-closed behavior.
- `core/test/c23-m7-worker-routing.test.js`: independent schema compatibility, byte-boundary, multibyte, attempt-count, distinct-ID, no-echo, and no-residue regression contract.
- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m7-routing-remediation-red.md`: corrected RED evidence.
- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m7-routing-remediation-retest.md`: independent GREEN evidence.

## Test Design And Results

- Corrected RED: `20 total / 19 PASS / 1 FAIL`; sole failure was the incompatible raw-schema `required` list.
- Final focused M7, independent test: `20/20 PASS`.
- Relevant maintained integration, independent test: `138/138 PASS` across 15 maintained files.
- Full maintained Core, independent test: `59` files, `637/637 PASS`, no fail or skip.
- Full maintained Core, fresh main-thread run: `59` files, `637/637 PASS`, no fail or skip.
- Syntax checks, schema/fixture/catalog YAML/JSON parsing, scoped/full diff checks: PASS.
- Transaction descendants and M7 temporary workspace residue: `0`.
- Plugin metadata hashes remain unchanged.

## Expected Behavior

Users may configure only the Worker Routing fields they need; defaults fill the rest, while unknown or renamed keys fail. AI-generated Task Assessments remain concise and visible. Oversized semantic identifiers or failure histories fail before authority persistence, but valid 128-byte identifiers, 256 attempts, and 64 distinct route IDs remain accepted. Routing classification, Resume, Hook, Capsule, topology, evidence, and acceptance behavior are otherwise unchanged.

## Problems Encountered

- The first audit identity reported the two P1 findings but stalled twice before producing an evidence file. Its turn was closed without certifying evidence and is not used for acceptance.
- The first schema remediation over-constrained raw project overrides. The independent test identity corrected its own oracle rather than preserving a false GREEN.
- Cataloged quarantined pre-C21 tests remain outside the maintained gate; neither remediation nor evidence reclassified or edited them.

## Remaining Risks And Follow-Up

- A new independent audit identity must verify the final snapshot and explicitly close both P1 findings.
- VSP-Codex still must implement the separate semantic-class-to-runtime mapping contract.
- No cachebuster update, plugin reinstall, release artifact rebuild, or new real-host session is part of C23 M7.
- The active C23 Recovery Pack remains missing/degraded; Runtime/Continuation are authoritative and missing-Pack Resume remains covered.

## Frozen Hashes

- `core/src/worker-routing/index.js`: `133f5a5605916b159fd32fa7be5a65b539175d22498f95b251ece738b623d0bd`
- `config.schema.yaml`: `7874cfbe1d1de2a226d4035490d5228b5dcf1da6f0944af576cc68dfeed85ae8`
- `core/src/docs/index.js`: `95a0f45a44c572211de72c6139ab3267991921296bc7366cddf29c515f7d3561`
- Focused test: `78f20b4bca9e91ebf81860a8115ec52a1e36b6f5d38b790f7b12b7789e3e3e8c`
- Fixture: `bcb1b0e5fc5f61fa4c37baceed66f3e10f11610430f3e10b2e4cf29c1461f1e5`
- Catalog: `37a9c114a8c5bcc54dcdd389d276e75fadf8e84ab3064127e656de7df2515891`
- Corrected RED evidence: `8e3f0e50b3ccc5e8f75a4cf6a7daba436bb39d7c7f5f74d285ad3b611c4e1b4b`
- Remediation retest evidence: `ff262c8e7f4d40047ddcb3a5ab96cd7249d57793045fd4ad48915966d743ccd7`
- `.codex-plugin/plugin.json`: `a5874b84d5338e3ee6de4a0ec87874bb0789346ad461017f1dc8e323179080dd`
