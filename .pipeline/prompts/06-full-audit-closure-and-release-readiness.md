# C17-M6 Full Audit Closure And Release Readiness

## Goal

Prove all Critical, Warning, and Info audit items are closed or explicitly deferred with rationale, and prepare C17 for acceptance.

## Technical Solution

- Run the C17 audit inventory from M0 and compare before/after counts.
- Run root `npm test`, focused changed-module tests, stale import/path/parser/ledger scans, docs checks, and `git diff --check`.
- Generate final C17 audit closure report.
- Update `PROJECT-SUMMARY.md`, `.pipeline/PROGRESS.md`, and final report artifacts.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns final regression command execution and evidence capture for root tests and focused changed-module tests.
  - Evidence path: `.pipeline/reviews/C17/M6/test-evidence.md`.
- `implement`
  - Owns final docs/status/report updates only; no feature implementation unless audit discovers a small required repair assigned by main agent.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C17/M6/implementation-evidence.md`.
- `audit`
  - Owns final audit closure judgement for all audit findings, scan evidence, breaking change documentation, and worker separation.
  - Evidence path: `.pipeline/reviews/C17/M6/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the final completion report.

## Technical Route

1. Collect validation evidence from C17-M0 through C17-M5.
2. Run final regression and scan commands.
3. Generate `.pipeline/reports/C17-audit-closure.report.md` with each original finding mapped to fixed/deferred status.
4. Update project summary and progress.
5. Stop for acceptance or proceed according to cycle lifecycle policy.

## Research Required

Status: none.

## Risks And Alternatives

Risks:

- Broad cleanup may reveal additional stale docs/tests.
- A late audit failure may require returning to the relevant prior Milestone for repair.

No accepted alternative: final closure must use real command evidence, not narrative claims.

## Validation

Run:

```bash
npm test
git diff --check
rg -n '/home/heyx' core/src scripts
rg -n 'workspace/index|from .*/workspace' core/src core/test docs README.md README.en.md
rg -n 'function parseYaml|function parseKnowledgeYaml|export \\* from' core/src
```

Pass signal: audit closure report shows all C17 targeted findings fixed or explicitly justified.

## Audit Focus

- No pseudo-tests.
- Root `npm test` passes.
- No forbidden hardcoded runtime paths.
- No stale workspace imports.
- No split YAML parser.
- No workspace compatibility shim.
- No long-term YAML/JSONL dual writes.
- Breaking changes are documented and intentional.

## Completion Report Requirements

Include audit closure matrix, changed modules, technical reasoning, validation output, expected behavior, residual risks, and any follow-up Cycle candidates.
