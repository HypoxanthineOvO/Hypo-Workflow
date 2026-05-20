# C15-M5 Integration Smoke And Release Readiness

## Goal

Prove the new P2 gate, detailed completion reports, interactive Analysis state, shared asset path contract, and generated adapter surfaces work together.

## Technical Solution

Use a thin final integration milestone rather than duplicating full regression in each prior milestone. The final milestone validates cross-command behavior, generated artifacts, and smoke scenarios.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns final focused test matrix and smoke execution evidence.
  - Evidence path: `.pipeline/reviews/C15/M5/test-evidence.md`.
- `implement`
  - Owns any final documentation/artifact synchronization fixes discovered during smoke.
  - Evidence path: `.pipeline/reviews/C15/M5/implementation-evidence.md`.
- `audit`
  - Owns final release-readiness review, generated artifact freshness, and acceptance risk assessment.
  - Evidence path: `.pipeline/reviews/C15/M5/audit.md`.
- Main agent
  - Coordinates final smoke, lifecycle updates, and final C15 report.

## Required Steps

1. Run targeted tests from M1-M4 after prior changes are integrated.
2. Run focused regression scenarios for analysis preset, audit report, debug flow, patch fix flow, and sync artifact generation.
3. Verify generated OpenCode artifacts if command map or skills changed.
4. Verify P2 goal-only fixture is rejected or kept in revision.
5. Verify Analysis continuation fixture preserves ledger path and main question.
6. Verify cycle state-init path smoke finds the shared asset.
7. Produce a final C15 checklist and report using the new detailed completion contract.

## Validation

Run:

```bash
uv run -- node --test core/test/analysis*.test.js core/test/chat*.test.js core/test/response-contract.test.js core/test/skill*.test.js core/test/sync-standardization.test.js core/test/progressive-discover.test.js
uv run python tests/run_regression.py --scenario s24-audit-report --scenario s25-debug-flow --scenario s38-patch-fix-flow --scenario s62-analysis-preset-runtime
git diff --check
```

Smoke expectations:

- P2 route gate rejects goal-only decomposition.
- Analysis continuation keeps the same ledger path and main question.
- `state-init.yaml` is found through the shared asset path.
- OpenCode generated artifacts include `/hw-analysis` when M3 implements it.

## Completion Report Requirements

Final C15 report must include changed contracts, technical reasoning, touched files/modules, test design, validation output, expected user-facing behavior, encountered problems, and residual risks.
