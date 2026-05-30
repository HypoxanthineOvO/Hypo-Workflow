# Quality Spec

Use this reference for `/hw:quality`, the evidence-backed code quality scorecard and comparison workflow.

## Purpose

`/hw:quality` answers:

- How good is the current code quality?
- Which quality dimensions are weak?
- Has quality improved or regressed compared with a baseline?
- Which actions should feed `/hw:optimize`, `/hw:patch`, or `/hw:plan`?

It is a first-class command. It does not replace `/hw:audit`; risk, security, data-loss, and acceptance-blocking governance findings must escalate to Audit.

## Modes

| Mode | Use |
|---|---|
| `scorecard` | One-time quality report for a scope. |
| `baseline` | Store a quality baseline for future comparison. |
| `compare` | Compare current quality with a baseline or prior report. |
| `review` | Focused code quality review with action recommendations. |
| `action queue` | Extract and prioritize quality actions. |

## Scoring

Use 1-5 scoring. Every score must cite evidence.

| Score | Meaning |
|---|---|
| 5 | Excellent, simple to change, well tested, well structured, low surprise. |
| 4 | Good, acceptable for delivery, minor improvement opportunities. |
| 3 | Adequate but needs targeted cleanup before major expansion. |
| 2 | Weak, likely to slow development or hide correctness risk. |
| 1 | Poor, blocks responsible optimization or refactor without repair. |

Gate thresholds:

- Overall >= 4 passes the quality gate.
- Core dimensions must each be >= 3.
- Core dimensions are Correctness, Maintainability, and Structure/Organization.
- Any Critical Audit-style risk escalates to `/hw:audit` regardless of score.

## Dimensions

Core dimensions:

- Correctness: behavior clarity, invariants, edge handling, regression protection.
- Maintainability: local reasoning, naming, duplication, coupling, change cost.
- Structure/Organization: module boundaries, source authority, file layout, interface clarity.

Supporting dimensions:

- Test Quality: meaningful tests, failure coverage, fixtures, pseudo-test resistance.
- Complexity: algorithmic and cognitive complexity.
- Observability/Operability: errors, logs, reports, state and recovery clarity.
- Documentation/Onboarding: docs match behavior and help future agents.
- Performance: obvious hot-path issues, avoidable repeated work.

## Persistence

Reports and state:

- `.pipeline/quality/quality-NNN.md`
- `.pipeline/quality/state.yaml`
- `.pipeline/quality/actions.yaml`
- `.pipeline/log.yaml` entry with `type: quality`

Action item schema:

```yaml
id: QACT-001
source_report: .pipeline/quality/quality-001.md
dimension: Maintainability
score: 2
priority: high
route: /hw:optimize | /hw:patch | /hw:plan | manual
summary: concise action
validation: exact command or scenario
status: open | in_progress | done | deferred
```

## Report Template

```markdown
# Quality Report — YYYY-MM-DD

## Intake
- Scope:
- Mode: scorecard / baseline / compare / review / action queue
- Correctness constraints:
- Validation path:

## Scorecard
| Dimension | Score | Evidence | Action |
|---|---:|---|---|
| Correctness | 1-5 | refs | action |
| Maintainability | 1-5 | refs | action |
| Structure/Organization | 1-5 | refs | action |

## Overall
- Score:
- Gate: PASS / FAIL
- Core gate:

## Compare
- Baseline:
- Improved:
- Regressed:

## Action Queue
| Action | Route | Priority | Validation |
|---|---|---|---|

## Escalations
- Audit escalations:
- Optimize candidates:
- Patch candidates:
- Plan candidates:
```

## Boundary With Audit

Quality may fail a quality gate, but it should not silently accept risk. Escalate to `/hw:audit` when a finding involves:

- security exposure
- data loss
- wrong core behavior
- destructive or external side effects
- missing correctness evidence for a high-risk refactor
- worker separation or validation governance breach

## Boundary With Optimize

`/hw:quality` can produce an action queue and baseline. `/hw:optimize` owns the iterative loop that changes code under backup, correctness, budget, and validation constraints.
