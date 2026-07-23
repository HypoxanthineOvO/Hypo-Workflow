# C23 M3 Reproducible Runs And Parameter Scans Implementation Evidence

- Worker ID: `c23-m3-implementation-main`
- Role: `implement`
- Execution identity: main thread
- Date: 2026-07-18 (Asia/Shanghai)
- Verdict: `GREEN_FOCUSED`
- Workflow Runtime/Continuation advancement: none

## Task Assessment

- Complexity: `material`
- Uncertainty: `medium`
- Oracle strength: `strong`
- Blast radius: `cross_module`
- Reversibility: `reversible`
- Hazards: `scientific_reproducibility`, `run_identity_conflict`, `path_escape`, `secret_exposure`
- Semantic routing class: `critical`
- Reason codes: `reproducibility_contract`, `experiment_authority`, `resource_failure_evidence`

M3 binds scientific run identity to code, environment, machine, data, parameters, command, output, and resource evidence.
It remains a pure protocol and data layer, but incorrect identity or evidence semantics would make later comparisons
untrustworthy, so the authority consequence is critical even with a deterministic fixture oracle.

## Change Summary

The implementation adds two pure Core APIs and one Experiment Store write path:

- `compileExperimentRunSpec(input)` validates and canonicalizes a complete run context, materializes an exact `uv run
  --frozen` argv, creates a readable deterministic `run_id`, derives an internal SHA-256 identity, and assigns a stable
  per-run output directory with explicit log/config/metrics paths.
- `expandExperimentScan(input)` expands cases in caller order and axes in declared Cartesian order. It rejects duplicate
  axes/values/cases, parameter ownership conflicts, duplicate identities, and readable-id collisions.
- `createExperimentStore(...).recordRun(...)` revalidates the compiled identity and records the result as the existing
  Experiment Attempt authority. Repeating an identity requires an explicit earlier parent with the same identity;
  changing dataset scene/trace creates a distinct identity.

The run specification binds:

- Git repository ref, complete commit/tree object ids, and an optional dirty patch artifact digest;
- Python version, exact `uv.lock` digest, and `uv` run prefix (Conda is rejected);
- machine alias, GPU/count/memory, driver, CUDA, host memory, and machine-specific external file locations;
- dataset version/subset/scene or trace and its selected machine location;
- structured argv bindings and environment entries where secret-like variables must use metadata-only `secret_ref`;
- output root and concrete log/config/metrics files;
- host/GPU memory and wall-time limits; and
- sorted scalar parameters used in readable identity.

NeRF fixtures implement a three-method chair screening scan followed by the selected method on all eight NeRF Synthetic
scenes. AceSim fixtures implement a 3-frequency by 2-trace scan and a 2-by-2 L1/L2 cross scan over two traces. A trace
that exceeds host memory is retained as a failed Attempt with the entire run specification and structured
`resource_exhausted/host_memory` evidence.

## Modified Production Files

- `core/src/experiment/runs.js`
- `core/src/experiment/index.js`
- `core/src/index.js`

The implementation identity did not create or edit M3 tests/fixtures/catalog entries, Runtime, Continuation, legacy
authority, Hook configuration, plugin metadata, or cachebusters.

## Test Design And Validation

- `node core/test/c23-m3-experiment-runs.test.js`: `13/13` PASS.
- C23 M1 suites: `21/21` PASS.
- C23 M2 suite: `14/14` PASS.
- Record Store: `13/13`; Runtime Store: `13/13`; workspace transaction: `19/19` PASS.
- Focused plus shared total above: `93/93` PASS.
- maintained/all catalog dry-run: valid, `55/171`, M3 included.
- `node --check` for run compiler, Experiment Store, and root export: PASS.
- `git diff --check`: PASS.

The M3 contract covers canonical compilation, argv/output materialization, NeRF screening and full expansion, AceSim
single/cross scans, OOM evidence, same-identity reruns, distinct scenes, uv/snapshot/path/secret/data bindings, scan
ambiguity/collisions, tampered compiled identity, zero-write rejection, legacy isolation, and the no-runner boundary.

## Expected Result

The AI can generate a reviewable run matrix before execution, tell the user exactly which scene/trace and parameters a
run represents from its directory name, reproduce the same command on the recorded machine context, distinguish reruns
from different datasets, and retain resource failures without losing the attempted configuration. Core never starts a
process or claims that an operational run occurred merely because a specification exists.

## Problems Encountered

The approved RED contract exposed only the missing public APIs. The first production implementation passed all `13/13`
M3 tests and the focused shared regression set; no remediation was needed before independent retest/audit.

Before closing independent audit, the main implementation also tightened three same-contract invariants: resource limits
cannot exceed recorded machine capacity; base/fixed/axis/selection scan ownership cannot contradict itself; and one
readable `run_id` cannot alias two different internal identities in either new writes or persisted history. The original
M3 contract remains `13/13` GREEN after these changes.

Independent audit then demonstrated that an unbounded readable parameter could produce a run-id path component longer
than common filesystems permit. The compiler now fails closed above 240 UTF-8 bytes and asks for shorter readable
aliases; it does not silently truncate the identity or append an opaque hash.

Audit also reproduced misleading prefix arrangements where `--frozen` appeared after an argument separator or command
token. M3 v1 now accepts exactly `uv run --frozen`; it does not claim to parse arbitrary uv option layouts.

The compiler also rejects a binding flag already present in the base argv, including `--flag=value`, so the materialized
command cannot carry two contradictory values for one dataset or parameter binding.

Binding flags now use one canonical long-option grammar and base argv cannot terminate option parsing before generated
bindings. Output filenames are distinct, and a completed run must retain the declared log, resolved config, and metrics
paths.

The portable path gate now applies to every run-owned relative path and generated output, not only `run_id`: each
component is bounded to 240 UTF-8 bytes and the complete relative path to 3800 bytes.

Readable numeric slugs retain semantics: negative values use an explicit `neg-` prefix and decimals use `p`, so a
single negative temperature/frequency run cannot be mislabeled as positive.

## Residual Risks / Follow-up

- Git object ids, lockfile digests, and machine metadata are caller-supplied bindings. M3 validates their shape and
  internal consistency but does not invoke Git, read external machine paths, or attest remote bytes.
- A readable `run_id` intentionally contains no opaque hash. If different reproducibility contexts would map to the same
  readable directory within one scan, expansion fails and requires a clearer prefix/design rather than silently adding
  a random suffix.
- A same-identity rerun retains the same logical output directory. The Agent must follow the project's output retention
  policy; M4/M5 will record interruption/status history, but Workflow does not delete or schedule results.
- `resource_exhausted` currently has a strict host-memory evidence contract because that is the accepted AceSim pilot
  need. Other operational failure taxonomies can be added from real pilot evidence.
