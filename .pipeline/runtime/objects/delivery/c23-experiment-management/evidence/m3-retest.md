# C23 Revision 1 M3 Fresh Independent Retest

- Worker ID: `c23-m3-test-luna`
- Role: `test` only
- Milestone: `M3`
- Task assessment: complexity `material`; uncertainty `low`; oracle strength `strong`; blast radius `authority`; reversibility `reversible`; hazards `runtime_authority`, `identity_collision`, `secret_exposure`, `path_escape`
- Verdict: `GREEN`
- Workflow Runtime/Continuation advancement: none

## Conclusion

The final maintained M3 contract passes `13/13`. A fresh disposable consistency matrix passes `12/12`, covering machine capacity, scan-source conflicts, readable-ID aliasing, and persisted-read integrity. Core compiles canonical reproducible run specifications, expands NeRF and AceSim scans deterministically, and records already-observed outcomes as Experiment Attempts without creating runner authority. The combined M1/M2/M3 plus shared Record/Runtime/transaction regression set passes `93/93` after the final audit remediation.

The GREEN result was not obtained by weakening the RED contract. Both fixtures and the initial test evidence remain byte-identical to their original handoff hashes. The maintained test was extended only with audit-remediation regressions:

- `core/test/fixtures/c23-m3/nerf.json`: `6527a53bb3924de41e23c923219c2424d89875c323d1bb9975f447f4b4866f07`
- `core/test/fixtures/c23-m3/acesim.json`: `599148091163690fe01b048c887fcb05ffcdd3adcdd198148340770a8bc7e9d2`
- initial `m3-test.md`: `db5f2f308f305c5e56e4008df18c667de78444f7cd4cc049bd9a981166670823`
- final `core/test/c23-m3-experiment-runs.test.js`: `120abfe4722a83629d0dc6e6172f2a93d2d169bd9df0f4bc1db3989a15330447`

This retest is bound to the following frozen production bytes. Hashes were captured before and after the final maintained/shared and disposable runs and remained identical:

- `core/src/experiment/runs.js`: `75d07373e9695e08d6856dd358f007019582999ccc0590d47261538959c32c50`
- `core/src/experiment/index.js`: `5fdf8114747c383bb5d71e3515c7fec4c905f7034506ba4229207ae706282fb3`
- `core/src/index.js`: `203e648fc9ed73e61b381608bbe4936ea95c8957a5e9452a4650826e080a9c8f`

## M3 Contract Results

`node core/test/c23-m3-experiment-runs.test.js`: `13/13` PASS.

The fresh run confirms:

- `compileExperimentRunSpec` and `expandExperimentScan` are public, and `ExperimentStore.recordRun` is present.
- Equal run inputs return byte-stable canonical values without mutating callers.
- Code commit/tree/dirty-patch binding, `uv` lock/run-prefix data, machine/GPU/driver/CUDA/host-memory data, external-location metadata, dataset version/subset/scene or trace, and resource limits survive compilation.
- Structured command bindings materialize the exact expected `uv run --frozen ...` argv.
- The environment prefix must be exactly `uv run --frozen`; reordered or extra prefix tokens reject.
- Binding flags must use the canonical `--name` form. Bare `--`, three-dash names, equals-suffixed declarations, whitespace-bearing flags, and base argv that already owns `--flag` or `--flag=value` reject.
- Output paths are exactly rooted at `output.root/run_id` with explicit log, resolved config, and metrics paths.
- Log/config/metrics filenames must be distinct, every completed outcome must cite all three declared outputs, and run-owned path components/full paths reject beyond `240`/`3800` UTF-8 bytes.
- Human-readable run IDs contain semantic scene/trace/parameter values rather than timestamps or opaque random hashes; internal identities remain SHA-256 values.
- Human-readable run IDs reject beyond `240` UTF-8 bytes without truncation or a hidden hash suffix. Negative numeric values retain a `neg-` marker, so `-77` and `77` cannot alias.
- NeRF expands a three-method chair screen and the selected method over all eight scenes. The selected chair run has the same identity in both designs, so prior work is recognizable.
- AceSim expands `3` frequencies over `2` traces (`6` runs), and a `2 x 2` L1/L2 cross scan over `2` traces (`8` runs), in stable case/axis order.
- Host-memory exhaustion remains a complete failed Attempt with `resource_exhausted`, resource, limit, observed peak, output refs, and evidence ref, rather than a bare status word.
- A repeated identity requires an explicit same-Experiment parent with the same stored identity; a different scene produces a distinct first run.
- Conda, unbound snapshots, malformed digests, unsafe paths, missing external bindings, raw secrets, ambiguous scans, ID collisions, tampered identities, and unsafe outcome evidence reject without workspace writes.
- A valid `recordRun` creates no scheduler, job, process, PID, or tmux authority file. Legacy lifecycle files remain byte-identical.

## Supplemental Consistency Matrix

The supplemental checks ran only in disposable temporary workspaces and did not modify repository authority. Result: `12/12` PASS.

Compiler and scan checks:

- host-memory limits above the selected machine capacity reject;
- aggregate GPU-memory limits above `gpu.memory_bytes * gpu.count` reject;
- `base_run.parameters` overlapping `fixed_parameters` rejects;
- a derived scan selection whose axis/value does not equal the selected fixed parameter rejects;

Write and persisted-read checks:

- two valid specs whose parameter values slug to the same readable `run_id` but have different identity hashes reject at `recordRun`, leaving the first Attempt unchanged;
- the same readable-ID alias injected through a low-level temporary workspace transaction rejects when the Experiment is read;
- an Attempt-level identity hash that differs from its `run_spec` rejects on read;
- a valid compiled spec belonging to another Experiment rejects when embedded in the current Experiment;
- a valid compiled spec belonging to another project rejects when the containing Experiment has a project binding;
- persisted `status: down` rejects because run outcomes are exactly `completed` or `failed` with structured evidence;
- a persisted output reference outside `run_spec.output.directory` rejects;
- persisted resource-exhaustion evidence whose limit differs from the run specification rejects.

These checks confirm that persisted run Attempts are not treated as trusted historical JSON. Read normalization revalidates the complete compiled spec, containing Experiment/project, outcome status, output containment, failure evidence, machine capacity, readable ID, and identity relationships.

## Combined Validation

Fresh direct runs:

- C23 M1 Experiment/reference fixtures: `6/6`.
- C23 M1 authority/recovery boundaries: `10/10`.
- C23 M1 recovery remediation: `5/5`.
- C23 M2 knowledge and concept-to-code: `14/14`.
- C23 M3 reproducible runs and scans: `13/13`.
- Record Store: `13/13`.
- Runtime Store: `13/13`.
- Workspace transaction: `19/19`.
- Combined total: `93/93` PASS.

Static and catalog validation:

- `node --check` for `core/src/experiment/runs.js`, Experiment Store, Core exports, and the M3 test: PASS.
- M3 fixture JSON and regression catalog parsing: PASS.
- maintained catalog dry-run: `55` selected, including M1, M2, and M3 paths.
- all catalog dry-run: `171` selected.
- full repository `git diff --check`: PASS.
- `.pipeline/runtime/transactions/`: no descendants.

## Technical Interpretation

M3 remains a data and authority feature. The compiler describes how a run should be invoked, the scan expander produces a deterministic bounded set of run specifications, and `recordRun` records evidence after an Agent or user-run process has produced it. No test expects Core to launch a command, keep a daemon alive, probe a remote server, inspect an absolute external-data path, retry a process, or schedule work.

## Modified File

- `core/test/c23-m3-experiment-runs.test.js`
- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m3-retest.md`

No production file, fixture, catalog, Runtime, Continuation, legacy authority file, plugin metadata, version, or cachebuster was modified during audit remediation and final retest.

## Problems Encountered

The first ad-hoc persisted-alias wrapper used a `baseline` first run while asserting equality with an `a b` alias; its setup assertion correctly failed before persisted-read validation. The corrected wrapper used `a+b` and `a b`, which share a slug but not an identity, and the full matrix passed. A later one-case long-ID wrapper initially contained stray diff-prefix characters and failed at JavaScript parse time; the corrected wrapper passed. Both mistakes were confined to disposable command input, touched no repository file, and did not hide a production failure. No flaky maintained result, transaction residue, catalog drift, or unexpected repository write was observed.

## Residual Risks

- Catalog checks were dry-runs; this retest ran the focused `93` tests rather than every maintained or quarantined test.
- Machine-capacity, base/fixed/selection conflict, and persisted corruption checks are fresh disposable tests rather than maintained regressions. Readable-ID length/numeric semantics, canonical command flags, uv prefix, output naming/path limits, and required completed outputs are maintained regressions.
- The tests prove deterministic compilation and persistence boundaries, not that a real external command succeeds or that remote machine metadata remains current.
- Crash recovery is exercised through the shared workspace transaction suite, but `recordRun` does not yet have a dedicated fault-injection matrix at each transaction phase.
- Long-run supervision, interruption/restart policy, tmux isolation, and scientific reasonableness review remain intentionally deferred to M4.
