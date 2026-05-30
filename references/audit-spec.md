# Audit Spec

Use this reference for `/hw:audit`, the Intake-first preventive engineering audit workflow.

## Governance Authority

- `/hw:audit` is a hard governance gate, not only a final passive review.
- Use it when the user reports poor experience, prepares refactoring, suspects architecture drift, needs acceptance risk review, or asks for preventive audit.
- `audit` may intervene before milestone completion and reject work mid-flight when execution evidence, worker separation, or validation quality is insufficient.
- `audit` may reject a `milestone`, `feature`, or `cycle` depending on the scope of the defect or governance breach.
- Critical findings block by default. A Critical finding can be deferred only with explicit user acceptance, a recorded risk owner, and a follow-up route.
- only `implement` may propose `blocked`; only `audit` may approve `blocked`.
- blocked approval is deterministic: an implement proposal alone is `blocked_proposed`, not an approved blocked runtime state; the approved state exists only after an `audit` actor approves the proposal.
- rejected work with `needs_revision` must route through rework requiring at least `test` and `implement`, with no silent continuation.

## Intake-First Flow

Audit always starts with Intake. If the user has not provided enough information, ask or infer conservatively and mark assumptions.

Required Intake fields:

| Field | Purpose |
|---|---|
| Trigger | Poor experience, refactor preparation, release gate, architecture concern, security/risk concern, or broad quality concern. |
| User / workflow | Who is affected and which workflow must feel correct. |
| Good-state definition | What "good" means for correctness, usability, maintainability, operability, and future change. |
| Correctness contract | Behaviors that must not regress and the executable validation path. |
| Scope and exclusions | Files, modules, recent milestone, target platform, or explicit non-goals. |
| Risk tolerance | What blocks now versus what can become an Action Queue item. |
| Handoff path | Whether findings should route to `/hw:quality`, `/hw:optimize`, `/hw:patch`, or `/hw:plan`. |

## Applied Methods

Audit uses multiple software-engineering lenses rather than a flat checklist:

- GQM: turn the user's goal into questions and measurable evidence.
- ISO/IEC 25010: evaluate product quality attributes such as functional suitability, reliability, usability, performance efficiency, security, maintainability, compatibility, and portability.
- ATAM-lite: identify architectural tradeoffs, quality-attribute scenarios, sensitivity points, and risk themes.
- SWEBOK: check requirements, design, construction, testing, maintenance, configuration, process, and engineering management concerns.

## Audit Dimensions

The top-level report model is Experience / Engineering / Risk.

| Dimension | Code | Checks | Typical severity |
|---|---|---|---|
| Experience | EXP | broken user flow, confusing interaction, poor feedback, repeated manual work, documentation mismatch | Critical / Warning / Info |
| Engineering | ENG | correctness, maintainability, structure, modularity, readability, tests, observability, operability | Critical / Warning / Info |
| Risk | RISK | security, data loss, migration risk, architecture tradeoff, performance cliff, external side effect, release readiness | Critical / Warning |

Legacy categories such as security, bugs, architecture, performance, tests, and code quality are still valid evidence tags inside findings, but they are not the top-level Audit Dimensions table.

## Finding Schema

Each finding should be evidence-backed:

```yaml
id: AUD-001
severity: Critical | Warning | Info
dimension: Experience | Engineering | Risk
tags: [security, bugs, architecture, performance, tests, code-quality]
location: path:line or module
symptom: what the user or maintainer observes
cause: why it happens or why risk exists
evidence: local files, commands, tests, reports, or traces
impact: user, engineering, or release consequence
recommendation: concrete fix or investigation path
route: fix-now | /hw:quality | /hw:optimize | /hw:patch | /hw:plan | defer
```

## Severity

- `Critical`: blocks acceptance or execution continuation by default. Examples: data loss, security exposure, wrong core behavior, unbounded destructive operation, missing correctness evidence for a high-risk refactor, broken primary workflow.
- `Warning`: should fix or explicitly accept. Examples: architecture drift, weak validation, brittle coupling, performance risk, missing edge coverage, maintainability debt with realistic near-term cost.
- `Info`: improvement suggestion. Examples: naming cleanup, minor duplication, optional docs polish, future ergonomics.

## Action Queue

Non-blocking findings should be converted into an Action Queue instead of being lost in prose.

Action Queue fields:

- `action_id`
- `source_finding`
- `owner_route`: `/hw:quality`, `/hw:optimize`, `/hw:patch`, `/hw:plan`, or `manual`
- `priority`: high / medium / low
- `expected_validation`
- `defer_reason`, when not immediate

Use `/hw:quality` when the issue is quality scoring, baseline, comparison, or review. Use `/hw:optimize` when the user wants an iterative quality-improvement loop under a correctness and validation budget.

## Flow

### Step 1: Intake

- collect trigger, desired good state, correctness contract, scope, validation path, and risk tolerance
- if the audit is for a refactor, identify invariants and acceptable migration boundaries
- if the audit is for poor experience, identify the user workflow and observable friction

### Step 2: Scope

- audit the whole project by default
- support `--scope <dir>` and `--since <milestone>`
- read the architecture baseline before scanning modules

### Step 3: Scan

- scan Experience / Engineering / Risk by default
- tag evidence with security, bugs, architecture, performance, tests, and code-quality where useful
- inspect files and modules in a structured pass
- reject pseudo tests when they do not validate the declared correctness contract

### Step 4: Grade

- grade each finding as Critical, Warning, or Info
- Critical blocks by default
- Warning needs fix, accepted defer, or Action Queue entry
- Info becomes optional Action Queue or rationale

### Step 5: Output

- terminal summary with trigger, scope, verdict, counts, top findings, and gate result
- full report at `.pipeline/audits/audit-NNN.md`
- lifecycle entry in `.pipeline/log.yaml` with `type: audit`
- write report prose in `output.language`
- render timestamps in `output.timezone`

## Report Template

```markdown
# Audit Report — YYYY-MM-DD

> Language: {output_language} | Timezone: {output_timezone}

## Intake
- Trigger:
- User / workflow:
- Good-state definition:
- Correctness contract:
- Scope:
- Risk tolerance:

## Applied Methods
- GQM:
- ISO/IEC 25010:
- ATAM-lite:
- SWEBOK:

## Summary
- Verdict: PASS / PASS_WITH_WARNINGS / BLOCKED
- Findings: X Critical, Y Warning, Z Info
- Gate: blocking / non-blocking / deferred by user

## Experience
- [EXP-01] severity — location — symptom — recommendation

## Engineering
- [ENG-01] severity — location — symptom — recommendation

## Risk
- [RISK-01] severity — location — symptom — recommendation

## Action Queue
| Action | Source | Route | Priority | Validation |
|---|---|---|---|---|

## Architecture Delta
- [delta against architecture baseline, if any]

## Completion Narrative
- Change Summary: [audit outcome and finding counts]
- Technical Approach: [Intake, methods, dimensions, and grading]
- Modified Files / Modules: [reviewed files/modules and report path]
- Test Design: [checks, commands, or sampling basis]
- Validation Results: [findings and command results]
- Expected Result: [expected state after remediation]
- Problems Encountered: [constraints or none]
- Risks / Follow-Up: [remaining risks and follow-up actions]
```

Audit completion narratives must follow `references/completion-report-contract.md`.
