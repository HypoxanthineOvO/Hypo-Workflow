# C23 Revision 1 M2 Audit-Remediated Fresh Independent GREEN Retest

- `worker_id`: `c23-m2-test-luna`
- `role`: `test`
- Milestone: `M2` / Project knowledge, metrics, and concept-to-code mapping
- Retest date: 2026-07-18 (Asia/Shanghai)
- Semantic assessment: complexity `material`; uncertainty `low`; oracle `mixed`; blast radius `authority`; reversibility `reversible`; hazards `runtime_authority`, `stale_knowledge`, `path_escape`, `secret_persistence`, `supersedes_conflict`
- Routing class: `standard`
- Verdict: `GREEN` after audit remediation
- Workflow Runtime/Continuation advancement: none

## Conclusion

The audit-remediated fresh M2 retest is GREEN. Five audit findings discovered after the original 11-case GREEN run are now fixed in production and locked into the independent test-owned contract:

1. Exact replay of an already superseded Record returns that persisted Record with `active:false`; it does not hard-code a new active projection.
2. `list`, `resolve`, and `assessFreshness` all fail closed on missing-target, cross-dedupe, cyclic/corrupt, and multiple-active-leaf supersedes graphs.
3. Nested `chain_of_thought`, `hidden_reasoning`, and `rationale_dump` fields are rejected before Record-body serialization with zero workspace writes.
4. Every `.pipeline/**` path is forbidden as a local `code_ref`, including the current manifest and legacy authority files even when their SHA-256 values are correct.
5. Active-only reads parse and validate every candidate Record, including inactive history, and reject body/dedupe or metadata/body provenance mismatch before filtering the projected result.

The revised M2 suite passes `14/14`, and the shared Record Store, workspace transaction kernel, and prior M1 Experiment contracts remain GREEN. The fresh focused executable total is `67/67`.

## Technical Approach Checked

- `core/src/experiment/knowledge.js` normalizes `principle`, `metric`, `module`, and `optimization` facts and maps each to one existing project-scoped `decision` Record.
- The Record `dedupe_key` binds project ID plus fact key. Existing Record semantics retain deterministic IDs, explicit `supersedes`, and historical Records.
- `recordFact` resolves its return value back through persisted project authority, so an exact deduplicated replay reflects the current supersedes graph rather than assuming `active:true`.
- Every read path validates target existence, same-dedupe edges, acyclicity, and exactly one active leaf before projecting facts or freshness.
- Every candidate Record body is normalized before active filtering and must bind back to project, dedupe key, confidence, supersedes edges, and exact frontmatter provenance.
- The structured Record body preserves source versions, project version reference, semantic aliases, module/principle relationships, and repo-relative code bindings.
- Forbidden hidden-reasoning fields and raw secrets are rejected on the normalized fact boundary before JSON body rendering.
- Local code bindings reject traversal, absolute paths, symlinks, digest drift, and all `.git/**` or `.pipeline/**` private authority paths.
- `list` and `resolve` reconstruct facts from individual Records. `.pipeline/memory/index.yaml` and `INDEX.md` remain derived outputs and are not read as fact authority.
- `assessFreshness` reads only registered code paths and returns actionable `missing` or `digest_mismatch` evidence.

## Audit Finding Closure

### Superseded exact replay

The new test records PSNR v1, records a v2 fact that explicitly supersedes v1, then submits the exact v1 bytes again. The replay returns the original Record ID with `active:false`; the active list still contains only v2, and historical listing still contains exactly two Records. This closes the prior return-projection defect.

### Invalid supersedes graph fail-closed behavior

One adversarial test constructs four persisted graph conditions and invokes all three public read APIs against each:

- `missing_target`: an individually content-valid Record supersedes a nonexistent Record ID.
- `cross_dedupe`: two individually content-valid Records exist, but one fact-key history points to another fact key.
- `multiple_active_leaves`: two independently created, individually content-valid Records share the same project/fact dedupe key with no arbitration edge.
- `cycle`: persisted Record bytes are deliberately corrupted into mutual supersession; the content-derived integrity layer or graph layer must reject before projection.

For every graph, `list`, `resolve`, and `assessFreshness` reject and leave the workspace byte-identical. The `missing_target`, `cross_dedupe`, and `multiple_active_leaves` cases cannot pass merely because a low-level Record hash is malformed; they specifically exercise the graph validator with individually valid Record documents. The cyclic corruption case also verifies end-to-end fail-closed behavior for damaged persisted bytes.

### Hidden reasoning and private authority paths

The boundary matrix now includes nested `chain_of_thought`, `hidden_reasoning`, and `rationale_dump` under `details`. Each rejection is zero-write and its private value is absent from the sanitized error. It also supplies exact current digests for `.pipeline/manifest.yaml` and `.pipeline/state.yaml`; both are rejected by path policy before they can be treated as project code.

### Inactive history semantic and provenance binding

The new active-only read test creates two individually content-valid histories with one inactive Record and one valid active replacement. In the first, the inactive body declares `metric.ssim` while its Record metadata dedupe key declares `metric.psnr`. In the second, the inactive body fact is unchanged but Record frontmatter cites different provenance. Both histories have a valid single-active-leaf supersedes shape, so graph validation cannot substitute for the semantic check. Default active-only `list`, `resolve`, and `assessFreshness` all reject without writing or silently skipping the inactive corruption.

## Fresh Test Results

Fresh direct executions after all four production fixes and test additions:

- C23 M2 Experiment Knowledge: `14/14 PASS`.
  - Original API, fixture, Record authority, NeRF/AceSim semantic resolution, metrics, freshness, history, project isolation, and boundary contracts.
  - New superseded exact-replay projection contract.
  - New four-shape supersedes graph contract across all three read APIs.
  - Expanded forbidden-reasoning and `.pipeline/**` code-reference boundaries.
  - New inactive-history body/dedupe and provenance-binding contract across all three active-only read APIs.
- Shared Record Store: `13/13 PASS`.
- Shared workspace transaction kernel: `19/19 PASS`.
- C23 M1 Experiment focused regression: `6/6 + 10/10 + 5/5 = 21/21 PASS`.
- Fresh focused executable total: `67/67 PASS`.

Static and catalog checks after the remediation test edits:

- `node --check` for `core/src/experiment/knowledge.js`, `core/src/experiment/index.js`, `core/src/index.js`, and `core/test/c23-m2-experiment-knowledge.test.js`: PASS.
- `node tests/run_core_tests.mjs --set maintained --dry-run --json`: PASS; maintained `54`, selected `54`, M2 selected.
- `node tests/run_core_tests.mjs --set all --dry-run --json`: PASS; maintained `54`, quarantined `116`, selected `170`.
- Global `git diff --check`: PASS.
- Test/evidence trailing-whitespace scan: PASS.
- `.pipeline/runtime/transactions/`: no descendants.

The catalog commands were dry-runs. This independent retest did not execute the complete 54-path maintained set or the 170-path all set and does not claim those full sets as its own GREEN evidence.

## Modified Files / Boundaries

This audit-remediation test worker modified only:

- `core/test/c23-m2-experiment-knowledge.test.js`
- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m2-retest.md`

It did not modify production, fixtures, catalog, manifest, Runtime, Continuation, Receipts, legacy authority, hooks, versions, plugin cachebuster, or installed plugin files.

The post-test authority hashes remained:

```text
manifest.yaml       6e367f6b2fc288c3197aaa6ec10d66893897dbd502d6a936c0211fef09a01e1e
runtime/active.yaml 61f2256d4c242ec144a2d76576a9a0e271b7c7bb853198d5fe0e4502b8eddb3e
C23 runtime.yaml    c2171b5a4bfe622b049b8ba29bde016842377d4c44097713f4b2fd6b0a79cb2b
C23 continuation    517f610d2942e722b7b9073b3d189ad1063d64692f6e06d1cc750a0bed98b0cd
legacy state.yaml   8b97e6df7a2b78469008b776e65bebd6227eb660e6cba2953422aa38f5cf4d17
legacy cycle.yaml   d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb
legacy log.yaml     14f108a6994130ec59f60e7a94169df80998ee7319dc4b5dd0f6fa2f8a268222
legacy PROGRESS.md  303e593fae56deb877718a55d7c4acbb080c2506e6da21f9cda2474fb5b7fa4b
```

All behavior tests use temporary current-format workspaces. This worker did not invoke Delivery lifecycle mutation against the repository workspace.

## Expected Behavior

An AI can persist project knowledge once, then answer what a metric means, which module owns a behavior, why an optimization works, and where its code lives without reconstructing context from filenames. Changed or missing registered code remains visible but explicitly stale. Changed facts require explicit supersession, historical replays report their actual inactive state, and ambiguous/corrupt histories never receive implicit arbitration. Private reasoning and Workflow authority files cannot enter project knowledge as code evidence.

## Problems Encountered

The first 11-case GREEN run was not sufficient: independent audit found four authority/security defects after it completed, and a later fresh audit found that active-only reads skipped semantic validation of inactive history. Each earlier conclusion was withdrawn. Production was repaired by the main implementation identity, the test-owned suite was expanded from 11 to 14 top-level cases plus larger boundary/graph matrices, and every requested focused suite was rerun from scratch after the final fix. No failure remained in the latest remediation run.

## Residual Risks / Follow-up

- `recordFact` commits the authoritative Record and rebuilds derived indexes in two successive workspace transactions. An interruption during the second transaction can make the call fail after the fact Record is durable. Readers remain Record-backed and the index is rebuildable, but M2 has no dedicated fault-injection test for that cross-transaction retry path.
- Query resolution is deterministic alias/token matching, not a model or embedding call. Useful semantic reach depends on AI-authored aliases in project knowledge.
- Source-document versions and project version references are preserved provenance; only local `code_refs` receive live byte-freshness checks in M2.
- The cyclic adversarial case uses integrity-invalid persisted bytes because content-addressed Record IDs make a mutually referential valid-hash cycle impractical to construct. Missing-target, cross-dedupe, and multiple-active-leaf cases are individually content-valid and directly exercise graph validation.
- The complete maintained and all catalogs were not independently executed by this worker; a later release gate should run the maintained set after M2-M7 converge.
