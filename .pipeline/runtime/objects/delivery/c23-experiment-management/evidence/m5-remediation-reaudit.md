# C23 M5 Remediation Independent Reaudit Attestation

- Audit execution identity: `c23_m5_reaudit`
- Role: `audit`
- Artifact materialization: main thread, from the independent auditor's completed result after its report-write step stalled
- Verdict: `PASS`
- Severity: `P0=0 / P1=0 / P2=0`
- Runtime advancement: none

## Conclusion

The independent remediation audit found no remaining M5 blocker. All two P1 and three P2 findings from `m5-audit.md` are closed at the frozen production and test hashes. M5 now provides a deterministic immutable-event union, one bounded materialized project status surface, unambiguous Experiment-scoped Attempt identity, and an explicit real-world pilot boundary.

## Finding Closure

1. Re-signed projection injection is closed. Persisted projections enforce top-level and nested exact keys, reject raw secrets and hidden reasoning across the full tree, and validate outcome counts, headline counts, pending confirmations, source IDs, detail references, retention risks, and table rows against their semantic entries.
2. The final status view is hashed before its byte measurement. Progressive compaction and the aggregate fallback both require a strict `<64 KiB` result; an unrepresentable aggregate fails closed.
3. Attempt identity is bound to `experiment_id + payload.attempt_id`. Missing IDs, divergent `source_attempt_id`, and duplicate local IDs inside one Experiment reject; the same local ID remains valid in different Experiments.
4. Materialized rows retain the newest window with `slice(-limit)`, and a 250-event projection includes the newest action while evicting the oldest from the latest-200 table.
5. The README-linked Chinese and English User Guides expose the current ten-route Codex source surface including `/hw:experiment` without teaching retired Cycle syntax, internal/deferred commands, or removed platform installation surfaces.
6. The Experiment Skill explicitly states that real GitLab remote, SSH/SCP, large-trace, and long-run behavior is not validated. The frozen Host Contract v1 remains at nine routes.

## Independent Validation

- M5 focused: `16` top-level / `32/32 PASS`.
- Frozen maintained M1-M5/shared slice: `57` files / `595/595 PASS`.
- Current inventory contained one concurrently added, out-of-scope M6 test-only RED file. The 58-file run produced `598 pass / 19 fail`; all 19 failures came from that planned M6 RED. Removing only that post-freeze file reproduces the frozen `595/595` M5 baseline.
- Re-sign adversarial matrix: 7 semantic/secret/reasoning/reference variants reject.
- Table invariant matrix: 3 malformed row/limit/count variants reject.
- Attempt matrix: missing ID, mismatched alias, and same-Experiment duplicate reject; cross-Experiment ID reuse passes.
- Projection-only read, latest-200, local Git clone union, logical conflict fail-closed, current guides, pilot wording, and frozen Host Contract checks pass.
- M5 production/test freeze hashes remained unchanged throughout the independent audit.
- Pending transaction descendants: `0`.

## Frozen Evidence Reviewed

- Implementation: `m5-remediation-implementation-main.md`
- Independent test: `m5-remediation-retest.md`
- Original findings: `m5-audit.md`
- Production: `core/src/experiment/status.js` SHA-256 `1d41b8f3bf9c7ee0084ad0ad2da22be1b4053dffa53183f050dbee34d797fddf`
- Test: `core/test/c23-m5-experiment-status.test.js` SHA-256 `2dcf415095018b2f51beeec633d8ca730d49b21b2e4cc1f11a84384a6b261820`
- Experiment Skill: SHA-256 `f8e1e66a02ce143d6936c53a676256fbf508519e72cffa021d45f8950a7068ad`
- Chinese User Guide: SHA-256 `7728a42b84e04ea567403b828c23e2138de4cfd63947b08efba0b839ce775c26`
- English User Guide: SHA-256 `facb4d1c29fad220602370bf9b028e9d5fed26785916426feffb9a8a82d63eae`

## Residual Risk

- The projection hash is an integrity checksum, not an authenticity signature against an actor with unrestricted workspace write access.
- The materialized file can grow with the immutable event count even though every returned view is bounded.
- Real NeRF, AceSim, GPU, paper reproduction, GitLab remote, SSH/SCP, large-trace, and multi-week runs still require a real-project Pilot Goal.
- Scientific reasonableness remains a weak oracle and requires user confirmation.

This attestation records the independent auditor's completed analysis and test result. The main thread only materialized the artifact after the auditor's file-write step stalled; it did not perform or self-certify the audit.
