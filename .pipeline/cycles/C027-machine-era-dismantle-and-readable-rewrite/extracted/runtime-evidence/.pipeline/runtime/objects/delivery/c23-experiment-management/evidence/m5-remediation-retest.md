# C23 Revision 1 M5 Remediation Independent Retest

- Worker ID: `c23_m5_test`
- Role: `test` only
- Milestone: `M5`
- Completed at: `2026-07-18T19:48:49+08:00`
- Verdict: `GREEN`
- Production/docs/test freeze drift: `none`
- Workflow Runtime/Continuation advancement: `none`

## Conclusion

The M5 remediation independently passes its focused adversarial contract and the
complete maintained Core set. Re-signed malformed projections, secret- or
hidden-reasoning-bearing projections, ambiguous Attempt identities, stale-row
retention, and obsolete public-guide routes are covered by maintained tests.
Ordinary status remains a bounded read of one materialized projection; this
test identity did not turn Hypo-Workflow into an experiment runner.

## Test Design

- The focused M5 suite exercises seven canonical re-sign variants, final view
  size enforcement, missing/mismatched/duplicate Attempt IDs, safe reuse of a
  local Attempt ID across Experiments, newest-200 materialization, newest
  bounded actions, projection-only status, local three-clone Git union and
  conflict rejection, current ten-route source discovery, and the frozen
  nine-route Host Contract v1.
- The maintained Core run covers M1-M5 together with shared Record, Receipt,
  Runtime, recovery, workspace transaction, command-router, and documentation
  contracts.
- Syntax, JSON, Skill, whitespace, transaction-residue, and frozen-artifact
  checks provide independent non-behavioral closure.

## Validation Results

- Focused M5: `16` top-level tests, `32/32 PASS`.
- Full maintained Core: `57` selected files, `423` top-level tests,
  `595/595 PASS`.
- `node --check` for all five Experiment production modules and all C23 M1-M5
  test modules: PASS.
- C23 fixtures, regression catalog, plugin metadata, and Host Contract/release
  JSON: `19/19` files parsed.
- Experiment Skill validator: `Skill is valid!`.
- Full repository `git diff --check`: PASS.
- `.pipeline/runtime/transactions/` entries: `0`.
- Focused source-surface assertion: source exposes ten routes including
  `/hw:experiment`; frozen Host Contract v1 remains at nine routes.
- This test identity made no production, documentation, Skill, fixture,
  catalog, plugin metadata, Host Contract, cachebuster, Runtime, Continuation,
  or legacy-authority changes.

## Freeze SHA-256

- `core/src/experiment/status.js`: `1d41b8f3bf9c7ee0084ad0ad2da22be1b4053dffa53183f050dbee34d797fddf`
- `core/src/index.js`: `1fb3617aea7896555e3ae7533a6192d99aa073b93c1826b887238280ceb0e1b0`
- `core/src/commands/index.js`: `03a30a0f9ce7f545396090cb44fd4924e38d73d9a6ae3e42098bb381025fb9a6`
- `SKILL.md`: `62777c795edcc3bdb40127ca7d458c83d697660e3183889cec7f2a0ccdbffdd4`
- `skills/experiment/SKILL.md`: `f8e1e66a02ce143d6936c53a676256fbf508519e72cffa021d45f8950a7068ad`
- `skills/experiment/agents/openai.yaml`: `c0d92b3ff6a2486cbcab09f938a967d75f502cc6e4a00b1062154d1c5d65a71c`
- `docs/user-guide.md`: `7728a42b84e04ea567403b828c23e2138de4cfd63947b08efba0b839ce775c26`
- `docs/en/user-guide.md`: `facb4d1c29fad220602370bf9b028e9d5fed26785916426feffb9a8a82d63eae`
- `core/test/c23-m5-experiment-status.test.js`: `2dcf415095018b2f51beeec633d8ca730d49b21b2e4cc1f11a84384a6b261820`
- `core/test/fixtures/c23-m5/status-events.json`: `2125254ea5f5e835fcbd3b10446a29fdeaf56203b8f3806b0fca25a78a69021a`
- `tests/regression-catalog.json`: `2eea95a1d4e2e1a82e5da81da2160892121f50c1f54909f07bea3975ab89a0bc`

All values match the main-thread remediation freeze supplied to this test
identity.

## Expected Result

A normal "current experiment status" request either returns a compact,
self-consistent, secret-safe projection or fails closed and requires an
explicit rebuild from immutable events. Attempt identity is scoped by
Experiment, visible tables retain recent work, and user-facing guides expose
the current source routes without changing installed release metadata.

## Problems Encountered

- The host has no `python` alias. The same checked-in validator passed under
  the available `python3` interpreter; no dependency installation was needed.
- A disposable route-count helper assumed a nonexistent JSON registry path and
  was discarded. The maintained source/Host Contract route assertion passed
  and is the authoritative check.

## Residual Risk And Follow-up

This fixture-based retest does not claim real NeRF, AceSim, GPU server,
GitLab remote, SSH/SCP, large-trace, paper-reproduction, or multi-week-run
validation. Scientific reasonableness remains a weak oracle and requires
explicit AI analysis plus user confirmation. A fresh audit identity must still
review the remediation before M5 can be marked verified.
