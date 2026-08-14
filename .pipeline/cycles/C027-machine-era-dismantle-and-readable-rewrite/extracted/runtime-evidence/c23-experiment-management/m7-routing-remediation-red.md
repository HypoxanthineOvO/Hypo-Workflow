# C23 M7 Worker Routing Remediation RED

- Worker ID: `c23-m7-routing-test`
- Role: `test`
- Recorded at: `2026-07-18T21:31:34+08:00`
- Verdict: `CORRECTED_RED_READY_FOR_SCHEMA_REMEDIATION`
- Runtime advancement: none

## Conclusion

The corrected M7 remediation RED is frozen at exactly one schema-compatibility finding. The focused suite reports `20` total, `19 PASS`, `1 FAIL`, `0 SKIP`, exit `1`. The remaining failure is intentional: raw project config must accept a partial `execution.worker_routing: { mode: required }` override, but the current schema requires all three defaulted fields.

All Worker Routing implementation bounds added by the prior remediation are green. This includes the 128-byte UTF-8 identifier matrix, 256-attempt and 64-persisted-ID collection limits, no-echo rejection, byte-identical invalid-persistence behavior, and zero transaction residue.

This test identity changed only the focused test and this evidence. It did not edit production, docs, Skills, `config.schema.yaml`, fixture, catalog, Runtime/Continuation, plugin metadata/cachebuster, `dist/`, `redskill-package/`, or VSP-Codex. It did not advance the Delivery and did not run maintained or full regression while intentionally RED.

## Corrected Schema Contract

The earlier RED incorrectly required `mode`, `policy_version`, and `failure_escalation_threshold` to all be present in each raw config override. Existing config governance merges partial project input with `DEFAULT_GLOBAL_CONFIG` before normalization, and the adjacent `worker_separation_policy` also permits partial raw overrides.

The corrected contract now freezes all of the following:

1. `config.schema.yaml` contains exactly one Worker Routing policy in `$defs`.
2. The policy is an object with exactly `mode`, `policy_version`, and `failure_escalation_threshold`, with `additionalProperties: false`.
3. `required` is absent or empty so raw partial overrides remain valid.
4. Raw `{ mode: "required" }` is schema-compatible.
5. Raw objects containing `distinct_failed_routes_threshold` or any unknown key are schema-incompatible.
6. `mode` is exactly `off | advisory | required`, default `advisory`.
7. `policy_version` const/default is `worker-routing-v1`.
8. `failure_escalation_threshold` const/default is `2`.
9. The definition-level default and `execution.worker_routing` default are the complete Core-compatible object.
10. `execution.worker_routing` uses a local `$ref` to the sole Worker Routing definition.

## Focused RED Result

Command:

```text
node --test core/test/c23-m7-worker-routing.test.js
```

Result: `20 total / 19 PASS / 1 FAIL / 0 SKIP`, exit `1`.

Expected sole failure:

```text
config.schema declares one strict Worker Routing policy and rejects the renamed threshold key
raw project config must allow a partial Worker Routing override
false !== true
```

The current `$defs.worker_routing_policy.required` lists all three properties, so the structured schema-compatibility probe correctly rejects the partial raw object. Removing that `required` constraint should make the corrected focused contract green without weakening exact keys, defaults, consts, local refs, or unknown-key rejection.

## Remediated Findings Now Green

1. Every semantic identifier accepts 128-byte ASCII and rejects 129-byte ASCII or multibyte overruns without echo, including risk flags, attempt route IDs, persisted route IDs, role, operation, task, and change fields.
2. Failure attempts accept 256 and reject 257.
3. Persisted route IDs accept 64 and reject 65.
4. Invalid 65-ID persistence leaves the temporary workspace byte-identical with no transaction residue.
5. Existing routing classification, persistence, Resume, Capsule, Codex Hook, topology, forbidden-field, and pure-policy tests remain green.

## Validation

- `node --check core/test/c23-m7-worker-routing.test.js`: PASS.
- Fixture/catalog JSON parse: PASS.
- Catalog inventory: `59 maintained / 116 quarantined`; M7 remains maintained and covers `C23-M7`.
- Test-file whitespace check: PASS (`git diff --no-index --check` emitted no diagnostics; exit `1` only because the untracked file differs from `/dev/null`).
- Repository transaction descendants: `0`.
- Focused suite temporary workspace cleanup: no M7 residue observed.
- Maintained/full regression: intentionally not run at this RED gate.

## Problem Encountered And Correction

The first remediation RED correctly exposed missing schema and bounds behavior, but its schema assertion overfit the merged Core default object by requiring all fields in raw project YAML. Compatibility review showed that this would reject an established partial-override pattern. The test-only contract was corrected before final remediation acceptance; production/config was not changed by this worker.

## Test Assets And Hashes

- `core/test/c23-m7-worker-routing.test.js`: `78f20b4bca9e91ebf81860a8115ec52a1e36b6f5d38b790f7b12b7789e3e3e8c`
- `core/test/fixtures/c23-m7/worker-routing-cases.json` (validated, unchanged): `bcb1b0e5fc5f61fa4c37baceed66f3e10f11610430f3e10b2e4cf29c1461f1e5`
- `tests/regression-catalog.json` (validated, unchanged): `37a9c114a8c5bcc54dcdd389d276e75fadf8e84ab3064127e656de7df2515891`

## Expected Result And Residual Risk

After the schema removes the incompatible `required` list, the focused suite should report `20/20 PASS`. A fresh independent retest must then run the relevant maintained integration set and full `npm test`, plus syntax, parsing, diff, residue, forbidden mapping, plugin metadata, and boundary checks.

The schema remains a raw-config contract rather than proof that every external JSON Schema consumer applies defaults. Recovery Pack interoperability and concrete host/provider mapping remain outside this test-only RED.
