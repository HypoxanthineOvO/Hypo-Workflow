# Audit Spec

Use this reference for `/hw:audit`, the preventive code auditing workflow.

## Governance Authority

- `audit` is a hard governance gate, not only a final passive review.
- `audit` may intervene before milestone completion and reject work mid-flight when execution evidence, worker separation, or validation quality is insufficient.
- `audit` may reject a `milestone`, `feature`, or `cycle` depending on the scope of the defect or governance breach.
- only `implement` may propose `blocked`; only `audit` may approve `blocked`.
- blocked approval is deterministic: an implement proposal alone is `blocked_proposed`, not an approved blocked runtime state; the approved state exists only after an `audit` actor approves the proposal.
- `implement` must never approve its own blocked proposal, even if it created the evidence.
- when `audit` rejects work, it must produce or reference a structured rejection artifact with `schema_version`, rejection scope, reasons, required rework, audit findings, blocked request state, original prompt reference, and creation timestamp.
- rejected work with `needs_revision` must route through rework requiring at least `test` and `implement`, with no silent continuation.

Canonical regression examples for these governance cases live in `core/test/fixtures/audit-regression-canonical-examples/` and are exercised by `core/test/audit-regression-canonical-examples.test.js`.

## Audit Memory Authority

- durable `audit memory` is the authority for audit-relevant carry-over across a Cycle.
- cycle-level audit memory stores user requirements, project rules summaries, and Cycle decisions under `.pipeline/audit-memory/<cycle-id>-audit-memory.yaml`.
- milestone-level audit delta stores local Milestone requirements under `.pipeline/audit-memory/<milestone-id>-audit-delta.yaml` and inherits, rather than replaces, the cycle-level audit memory.
- `/hw:plan` consumes scoped audit summaries built from audit memory plus the current audit delta before planning context is handed to planning workers or reviewers.
- `/hw:start` consumes scoped audit summaries built from audit memory plus the current audit delta.
- `/hw:resume` consumes the same scoped audit summaries so user requirements survive handoff after interruption.
- raw free-form conversation may help capture memory, but it is not authority and is not the source of truth.

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
```
