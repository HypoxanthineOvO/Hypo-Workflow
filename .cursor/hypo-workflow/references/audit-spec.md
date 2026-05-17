# Audit Spec

Use this reference for `/hw:audit`, the preventive code auditing workflow.

## Governance Authority

- `audit` is a hard governance gate, not only a final passive review.
- `audit` may intervene before milestone completion and reject work mid-flight when execution evidence, worker separation, or validation quality is insufficient.
- `audit` may reject a `milestone`, `feature`, or `cycle` depending on the scope of the defect or governance breach.
- only `implement` may propose `blocked`; only `audit` may approve `blocked`.
- blocked approval is deterministic: an implement proposal alone is `blocked_proposed`, not an approved blocked runtime state; the approved state exists only after an `audit` actor approves the proposal.
- rejected work with `needs_revision` must route through rework requiring at least `test` and `implement`, with no silent continuation.

## Audit Dimensions

| Dimension | Code | Checks | Severity |
|---|---|---|---|
| Security | SEC | injection, auth, secrets, dependency risk, sensitive data exposure | Critical / Warning |
| Bugs | BUG | null handling, bounds, races, leaks, type mismatches | Critical / Warning |
| Architecture | ARCH | cycles, god modules, layer violations, interface drift, architecture.md delta | Warning / Info |
| Performance | PERF | hot-path O(n²), blocking IO, memory growth, avoidable repeated work | Warning / Info |
| Test Coverage | TEST | missing branches, edge cases, flaky tests, excessive mocks | Warning / Info |
| Code Quality | QUAL | dead code, magic numbers, naming drift, missing docs, duplication | Info |

## Flow

### Step 1: Scope

- audit the whole project by default
- support `--scope <dir>` and `--since <milestone>`
- read the architecture baseline before scanning modules

### Step 2: Scan

- scan all six dimensions by default
- support `--focus <dimension>` for one dimension only
- inspect files and modules in a structured pass

### Step 3: Grade

- `Critical`: must fix, especially security holes and data-loss risk
- `Warning`: should fix, including architecture drift and performance hazards
- `Info`: improvement suggestions such as quality cleanup

### Step 4: Output

- terminal summary with counts and top five findings
- full report at `.pipeline/audits/audit-NNN.md`
- lifecycle entry in `.pipeline/log.yaml` with `type: audit`
- write report prose in `output.language`
- render timestamps in `output.timezone`

## Report Template

```markdown
# Audit Report — YYYY-MM-DD

> Language: {output_language} | Timezone: {output_timezone}

## Summary
- Scope: [full project / dir]
- Files scanned: N
- Findings: X Critical, Y Warning, Z Info

## Critical (must fix)
- [SEC-01] file:line — description — fix suggestion
- [BUG-01] file:line — description — fix suggestion

## Warning (should fix)
- [ARCH-01] description — recommendation
- [PERF-01] file:line — description — recommendation

## Info (nice to have)
- [QUAL-01] description
- [TEST-01] description

## Architecture Delta
- [delta against architecture baseline, if any]

## Completion Narrative
- Change Summary: [audit outcome and finding counts]
- Technical Approach: [scan method, dimensions, and grading]
- Modified Files / Modules: [reviewed files/modules and report path]
- Test Design: [checks, commands, or sampling basis]
- Validation Results: [findings and command results]
- Expected Result: [expected state after remediation]
- Problems Encountered: [constraints or none]
- Risks / Follow-Up: [remaining risks and follow-up actions]
```

Audit completion narratives must follow `references/completion-report-contract.md`.
