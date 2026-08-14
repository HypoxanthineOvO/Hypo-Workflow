# C23 Revision 1 M3 Independent Test Contract

- Worker ID: `c23-m3-test-luna`
- Role: `test` only
- Milestone: `M3`
- Task assessment: complexity `material`; uncertainty `medium`; oracle strength `strong`; blast radius `authority`; reversibility `reversible`; hazards `runtime_authority`, `identity_collision`, `secret_exposure`, `path_escape`
- Initial verdict: `RED` by design
- Workflow Runtime/Continuation advancement: none

## Conclusion

The independent M3 contract is executable and fails for the intended reason: Core does not yet publish `compileExperimentRunSpec`, `expandExperimentScan`, or `ExperimentStore.recordRun`. Fixture structure, syntax, JSON, catalog membership, and whitespace checks pass. The contract treats Workflow as a structured authority layer, not a process runner: it compiles reproducible run data, expands scans deterministically, and records already-observed Attempt outcomes without starting commands, schedulers, background processes, or tmux sessions.

## Public Contract

### `compileExperimentRunSpec(input)`

The input binds one run to:

- a repository reference, exact Git commit and tree, plus an optional dirty-patch artifact and SHA-256;
- a `uv` environment with Python version, lockfile path and digest, and `uv run --frozen` prefix;
- one machine ID with GPU, driver, CUDA, host memory, and machine-specific external-location metadata;
- one versioned dataset subset and scene or trace, bound by `external_location_id`;
- structured command argv, argument bindings, safe environment literals or secret references;
- an explicit output root and log/config/metrics filenames;
- host/GPU memory and wall-time limits;
- scalar experiment parameters.

The result is a canonical clone with a human-readable deterministic `run_id`, an internal 64-hex `identity_hash`, materialized argv, and output paths rooted at `output.root/run_id`. Equal inputs must serialize identically without mutating callers. Dataset scene/trace and parameter changes must change identity. Absolute machine external paths are metadata only and must never be probed by Core.

### `expandExperimentScan(input)`

The input carries a named scan, purpose, base run, fixed parameters, ordered axes, ordered cases, and optional derivation/selection metadata. Expansion order is case input order followed by a stable Cartesian product in declared axis order. The result preserves the design, returns `run_count`, and contains compiled run specs. Duplicate axes or values, fixed/axis/case conflicts, duplicate cases, empty axes, and readable-ID collisions reject rather than silently overwriting or appending opaque hashes.

### `ExperimentStore.recordRun(root, request, options)`

The request contains `experiment_id`, a compiled `run_spec`, one structured outcome, and an optional `rerun_of_attempt_id`. The Store records an existing Experiment Attempt and retains the complete run spec, readable ID, identity hash, output refs, metrics, and structured resource failure evidence. A repeated identity requires an explicit parent from the same Experiment whose stored `run_spec.identity_hash` matches. A different scene or trace is a distinct run and does not require a rerun parent.

## Test Design

The maintained test file defines 13 behavior surfaces:

1. Public API export and `recordRun` method presence.
2. Fixture completeness for snapshots, uv, machines, external data, commands, outputs, limits, and scans.
3. Canonical run compilation without external-path probing.
4. Structured argv and readable output layout materialization.
5. NeRF chair three-method screening and selected-method expansion over all eight NeRF Synthetic scenes.
6. AceSim 1000/2000/3000 MHz single-axis expansion over two trace cases.
7. AceSim two-by-two L1/L2 cross scan over two trace cases.
8. Deterministic structured host-memory exhaustion evidence in an Attempt.
9. Same-identity rerun parent enforcement and different-scene identity separation.
10. Compiler rejection of Conda, malformed snapshot/environment bindings, raw secrets, missing external refs, and unsafe paths.
11. Scan rejection of ambiguity, overlap, duplicate values/cases, empty axes, and readable-ID collisions.
12. `recordRun` revalidation and zero-write rejection for tampered identity or unsafe evidence.
13. Positive recording without scheduler/process/tmux/job authority creation, plus legacy-file byte preservation.

The NeRF fixture deliberately makes the selected chair run in the full scan identity-equal to its screening run, so the authority can recognize already-completed work instead of inventing a duplicate. The AceSim fixture records host-memory exhaustion as `reason_code: resource_exhausted`, `resource: host_memory`, limit, observed peak, and an evidence reference rather than a bare `failed`/`down` label.

## Initial RED Validation

Command:

```text
node core/test/c23-m3-experiment-runs.test.js
```

Result:

- total: `13`
- passed: `1` fixture-invariant test
- failed: `1` API publication gate
- skipped: `11` implementation-dependent contract tests
- failure: `typeof CORE.compileExperimentRunSpec` was `undefined`, expected `function`

This is the intended initial RED. The gated tests prevent a missing export from producing duplicate secondary exceptions while retaining the full executable contract for the implementation turn.

Additional validation:

- `node --check core/test/c23-m3-experiment-runs.test.js`: PASS.
- Both M3 fixture JSON files and `tests/regression-catalog.json` parse: PASS.
- `node tests/run_core_tests.mjs --set maintained --dry-run --json`: PASS; `55` maintained paths selected and the M3 test is included.
- `git diff --check` over the M3 test, fixtures, and catalog: PASS.

## Modified Files

- `core/test/c23-m3-experiment-runs.test.js`
- `core/test/fixtures/c23-m3/nerf.json`
- `core/test/fixtures/c23-m3/acesim.json`
- `tests/regression-catalog.json`
- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m3-test.md`

No production module, existing M1/M2 test, Runtime, Continuation, legacy authority file, plugin metadata, version, or cachebuster was modified by this worker.

## Expected Result After Implementation

All 13 tests pass. NeRF yields a stable three-run screen and eight-scene selected-method expansion. AceSim yields six frequency runs and eight cache cross-scan runs. Every run remains bound to code/environment/machine/dataset/command/output/limits, resource exhaustion is inspectable without rescanning result folders, retries are explicit, and record operations remain zero-write on invalid input.

## Problems Encountered

No fixture, syntax, catalog, or workspace problem was encountered. The sole initial failure is the expected missing production API.

## Residual Risks

- Readable IDs can collide after slug normalization; the contract requires fail-closed collision detection rather than hidden hash suffixes.
- `identity_hash` is authority metadata and must be recomputed or revalidated by `recordRun`, not trusted from callers.
- Machine-specific absolute external locations are recorded metadata. This M3 contract does not authorize filesystem probing, SCP, process launch, or remote execution.
- Supervision, interruption/restart semantics, and scientific reasonableness review remain M4 responsibilities and are intentionally absent here.
