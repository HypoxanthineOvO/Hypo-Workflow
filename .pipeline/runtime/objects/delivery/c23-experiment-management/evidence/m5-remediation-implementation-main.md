# C23 M5 Remediation Implementation Evidence

- Worker ID: `c23-m5-remediation-implementation-main`
- Role: `implement`
- Execution identity: main thread
- Completed at: `2026-07-18T19:38:47+08:00`
- Verdict: `READY_FOR_INDEPENDENT_RETEST_AND_REAUDIT`
- Runtime advancement: none

## Task Assessment

- Complexity: `substantial`
- Uncertainty: `low` after independent adversarial reproduction
- Oracle strength: `strong` for schema, identity, bounds, and documentation; `weak` for real scientific behavior
- Blast radius: `project status authority`
- Reversibility: `reversible`
- Hazards: `derived_projection_injection`, `attempt_identity_ambiguity`, `status_staleness`
- Semantic route class: `critical`
- Reason codes: `authority_validation`, `independent_audit_remediation`, `bounded_user_view`

The defects were already isolated by an independent audit and frozen RED tests. The implementation remained on the main thread, while the strict test and audit identities were kept separate.

## Conclusion And User-Facing Result

The M5 materialized status surface now fails closed when a projection is re-signed but internally forged, secret-bearing, reasoning-bearing, oversized, or cross-field inconsistent. Attempt identity is authoritative at `experiment_id + payload.attempt_id`; an optional `source_attempt_id` may only repeat that same ID. Materialized tables retain the newest 200 rows, and the README-linked User Guides now describe the current ten-route Codex source surface including `/hw:experiment`.

A normal experiment status answer can still use one bounded projection without rescanning the event or result trees. The change does not turn Workflow into a runner and does not claim real GitLab, SSH/SCP, large-trace, or long-run validation.

## Technical Approach

1. `core/src/experiment/status.js` now validates exact top-level and nested status schemas for headline, outcomes, source, semantic buckets, table rows, and detail references. It rejects unknown fields, raw secrets, hidden reasoning, unsafe paths, malformed identifiers, and unsupported payload shapes.
2. Projection validation recomputes outcome and headline counts, confirmation membership, active event/source bindings, detail-reference coverage, retention-risk semantics, and the deterministic table model from the projection's own semantic facts.
3. Final status views are hashed first and then measured. Progressive compaction and the aggregate fallback must both remain strictly below 64 KiB; an unrepresentable view fails closed.
4. Attempt validation requires `payload.attempt_id`, scopes uniqueness to its Experiment, accepts cross-Experiment local-ID reuse, and rejects divergent source aliases.
5. Ascending deterministic rows now materialize with `slice(-limit)`, preserving the newest window instead of the oldest.
6. `skills/experiment/SKILL.md` explicitly states that real GitLab remote, SSH/SCP, large-trace, and long-run behavior remains unvalidated. The two README-linked User Guides were narrowed to the current Codex source contract and no longer teach internal, deferred, removed, or retired platform surfaces as public commands.

## Modified Modules And Surfaces

- Core: `core/src/experiment/status.js`
- Experiment guidance: `skills/experiment/SKILL.md`
- Current User Guides: `docs/user-guide.md`, `docs/en/user-guide.md`

No test, fixture, command registry, Host Contract v1 artifact, plugin metadata, cachebuster, installation, VSP-Codex repository, Delivery Runtime/Continuation, or legacy lifecycle authority was modified by this implementation identity.

## Test Design And Validation

- Focused remediation: `16` top-level cases, `32/32 PASS`.
- Full maintained Core: `57` selected files, `595/595 PASS`.
- Adversarial variants cover re-signed large/unknown headline fields, forged outcome counts, raw-secret source fields, hidden-reasoning bucket fields, unsafe and object-shaped detail refs, combined substitution, missing Attempt ID, divergent alias, same-Experiment duplicates, and cross-Experiment local-ID reuse.
- A 250-event case verifies newest-200 materialization and a newest-5 bounded query.
- Local Git-like multi-clone union, conflict fail-closed, projection-only read, immutable-event preservation, source route discovery, and frozen nine-route Host Contract assertions remain green.
- `node --check core/src/experiment/status.js`: PASS.
- Experiment Skill validator: PASS.
- Focused `git diff --check`: PASS.
- Pending transaction descendants: `0`.

## Freeze SHA-256

- `core/src/experiment/status.js`: `1d41b8f3bf9c7ee0084ad0ad2da22be1b4053dffa53183f050dbee34d797fddf`
- `skills/experiment/SKILL.md`: `f8e1e66a02ce143d6936c53a676256fbf508519e72cffa021d45f8950a7068ad`
- `docs/user-guide.md`: `7728a42b84e04ea567403b828c23e2138de4cfd63947b08efba0b839ce775c26`
- `docs/en/user-guide.md`: `facb4d1c29fad220602370bf9b028e9d5fed26785916426feffb9a8a82d63eae`
- Independent RED test at implementation run: `2dcf415095018b2f51beeec633d8ca730d49b21b2e4cc1f11a84384a6b261820`

## Expected Behavior

Recomputing a public checksum can no longer make a malformed projection acceptable. A status query either returns a self-consistent, secret-safe, bounded view or fails closed and requires an explicit rebuild from immutable events. The table and semantic buckets agree on recent work, and every visible Attempt has one unambiguous Experiment-scoped identity.

## Problems And Residual Risk

- Exact v1 event/status schemas intentionally reject new top-level payload fields until the schema is extended. Domain-varying values remain supported inside bounded canonical maps such as `parameters`, `metrics`, `axes`, `fixed`, and `scope`.
- A fully self-consistent projection can still be fabricated by an actor with complete workspace write access; `projection_hash` is an integrity checksum, not an authenticity signature. Rebuild from immutable events remains the repair path.
- The derived projection can grow with total immutable events even though every query view is bounded. Very large real projects may later need pagination or a multi-level index.
- Real NeRF, AceSim, GPU servers, paper reproduction, GitLab remotes, SSH/SCP, large traces, and multi-week runs remain outside this fixture-based Milestone and require a real-project Pilot Goal.
- Scientific reasonableness remains a weak oracle and still requires confirmation rather than silent acceptance.

Independent retest and a fresh independent audit are required before M5 can be verified. This evidence does not advance Workflow Runtime or claim audit closure.
