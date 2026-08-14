# C23 Revision 1 M2 Independent Test Contract

- `worker_id`: `c23-m2-test-luna`
- `role`: `test`
- Milestone: `M2` / Project knowledge, metrics, and concept-to-code mapping
- Test date: 2026-07-18 (Asia/Shanghai)
- Semantic assessment: complexity `material`; uncertainty `medium`; oracle `mixed`; blast radius `authority`; reversibility `reversible`; hazards `runtime_authority`, `stale_knowledge`, `path_escape`, `secret_persistence`
- Routing class: `standard`
- Result: `RED` as expected before production implementation
- Workflow Runtime/Continuation advancement: none

## Conclusion

An independent executable contract now defines the M2 public surface and reference behavior. The contract is intentionally RED because Core does not yet export `createExperimentKnowledgeStore`; the NeRF/AceSim fixtures, their code digests, test syntax, JSON, diff hygiene, and maintained catalog all validate independently.

This RED is suitable for implementation: the only active failure is the missing public API. Behavior tests are skipped until that export exists, so initial implementation will expose specific semantic, persistence, freshness, conflict, and boundary failures rather than repeating one undefined-function error.

## Public API Contract

Core must export:

```js
createExperimentKnowledgeStore({ clock })
```

The returned Store must expose:

```text
recordFact(root, fact, options)
list(root, { project_id, include_superseded? })
resolve(root, { project_id, query })
assessFreshness(root, { project_id })
```

Each fact has the exact input fields exercised by the fixtures:

```text
project_id, fact_type, fact_key, title, aliases, summary, details,
source_refs[{type, ref, version, locator}],
code_refs[{path, sha256, locator}],
version_ref{type, ref}, confidence, supersedes
```

`fact_type` covers `principle`, `metric`, `module`, and `optimization`. Returned facts preserve the structured fact and add at least `record_ref:{kind:"record",id}`, `active`, and `freshness`. `list` returns an active-only array by default and historical Records only with `include_superseded:true`. `resolve` returns `{project_id,matches:[]}`. `assessFreshness` returns `status: fresh|stale` and actionable `stale_refs` carrying fact key, path, semantic locator, reason, expected digest, and actual digest when readable.

Fact authority must remain the existing manifest-format one-fact-per-file Record Store. Any machine or human query index is derived and rebuildable, not a second authority.

## Test Design

The test module contains 11 cases:

1. Public root export plus Store method contract.
2. Fixture integrity: every local code reference is repo-relative, versioned, semantically located, and bound to exact SHA-256 bytes.
3. One typed fact per durable Markdown Record; active project list spans principles, metrics, modules, and optimizations without writing new legacy Knowledge Ledger files.
4. NeRF semantic query maps Chinese “RE 加速 / 采样加速” to `src/render/occupancy.py#symbol:march_active_rays`, although neither path nor symbol contains `sample`.
5. PSNR query returns meaning, direction, unit, comparison limits, source version, and project version.
6. AceSim query locates low-temperature frequency/L1/L2 ownership and explains IPC plus host trace memory semantics.
7. Changed registered code produces digest-mismatch stale evidence; unrelated scratch files are not treated as knowledge; resolution surfaces stale state.
8. Missing registered code produces a missing finding with fact and semantic locator.
9. Changed same-key facts reject without explicit `supersedes`, then preserve both historical Records while selecting only the replacement as active.
10. One workspace containing NeRF and AceSim facts keeps list/query results project-scoped.
11. Traversal, absolute paths, malformed and mismatched digests, symlink code refs, empty locators, incomplete source versions, and raw secrets reject before writes with legacy files unchanged and secret-safe errors.

The NeRF fixture includes project principles, PSNR semantics, Render Engine module ownership, and occupancy-guided sampling acceleration. The AceSim fixture includes trace-driven simulation, IPC and host-memory metrics, QV100/cryogenic profile ownership, and temperature-aware frequency/cache cross-scan knowledge.

## Exact Validation

Executed before production implementation:

- `node --check core/test/c23-m2-experiment-knowledge.test.js`: PASS.
- Both `knowledge.json` fixtures and `tests/regression-catalog.json` parse as JSON: PASS.
- Fixture code-reference SHA-256 verification: PASS for every registered local code reference.
- `node core/test/c23-m2-experiment-knowledge.test.js`: 11 total; 1 PASS; 1 expected FAIL; 9 SKIP.
- Expected failure: Core export `createExperimentKnowledgeStore` is `undefined` rather than `function`.
- `node tests/run_core_tests.mjs --set maintained --dry-run --json`: PASS; maintained count `54`; the M2 test is selected.
- `git diff --check` across the test, fixtures, and catalog: PASS.

## Expected GREEN Result

After production implementation, the same direct test must report `11/11 PASS` with no skips. The Store must answer metric and semantic code questions from persisted Record authority, preserve project/source/version context, detect code-reference drift without treating arbitrary files as knowledge, and require explicit historical supersession. All successful and rejected operations must preserve legacy `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, `.pipeline/log.yaml`, and `.pipeline/knowledge/legacy.md` bytes.

## Modified Files / Modules

- `core/test/c23-m2-experiment-knowledge.test.js`
- `core/test/fixtures/c23-m2/nerf/knowledge.json`
- `core/test/fixtures/c23-m2/nerf/repository/docs/nerf-notes.md`
- `core/test/fixtures/c23-m2/nerf/repository/src/metrics/image_quality.py`
- `core/test/fixtures/c23-m2/nerf/repository/src/render/occupancy.py`
- `core/test/fixtures/c23-m2/acesim/knowledge.json`
- `core/test/fixtures/c23-m2/acesim/repository/docs/acesim-notes.md`
- `core/test/fixtures/c23-m2/acesim/repository/src/config/gpu_profile.py`
- `core/test/fixtures/c23-m2/acesim/repository/src/metrics/simulator_stats.py`
- `tests/regression-catalog.json`
- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m2-test.md`

No production source, Runtime, Continuation, Receipt, manifest, legacy authority, hook, version, plugin cachebuster, or installed plugin was modified by this worker.

## Problems Encountered

No test-authoring blocker occurred. The initial and final RED runs converged on the same single missing-export failure. Fixture digest checks and catalog validation prevented a fixture or registration defect from being mistaken for a production RED.

## Risks / Follow-up

- The nine skipped behavior tests still require a fresh GREEN run after the export exists; fixture validation alone does not prove the Store behavior.
- Query matching is specified by explicit project facts and aliases rather than an embedding or model call. This keeps the Core deterministic, but AI remains responsible for recording useful semantic aliases when it learns a project concept.
- Initial file digest validation, symlink denial, and freshness reads are authority-sensitive. Implementation should reuse the workspace path guard and avoid ad hoc path joining.
- A derived query index may lag after interruption; readers must be able to rebuild it from Records and must never treat it as authority.
