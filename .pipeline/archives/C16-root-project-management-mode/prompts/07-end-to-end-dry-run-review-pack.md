# C16-M8 End To End Dry-Run Review Pack

## Goal

Provide `/hw:maintain plan` end-to-end dry-run that generates workspace draft, artifact catalog, Notion merge plan, run plans, queue items, global projections, backups preview, and Chinese review report.

## Technical Solution

Compose M1-M7 into a single dry-run review bundle. The bundle is the only allowed input to later apply and contains hashes, redaction results, conflicts, queue items, run plans, and user-confirmation requirements.

Evidence root:

```text
~/.hypo-workflow/maintenance/evidence/dry-runs/
```

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns end-to-end dry-run fixtures for unchanged, conflict, stale, and secret-containing inputs plus deterministic bundle hash tests.
  - Evidence path: `.pipeline/reviews/C16/M8/test-evidence.md`.
- `implement`
  - Owns `/hw:maintain plan` orchestration, review bundle generation, report rendering, redaction scan integration, and no-write enforcement.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M8/implementation-evidence.md`.
- `audit`
  - Reviews deterministic dry-run hash, no remote writes, action separation, redaction evidence, and worker separation.
  - Evidence path: `.pipeline/reviews/C16/M8/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Wire `/hw:maintain plan` to workspace, scanner, sync template, queue, run planner, consolidation, and projections.
2. Generate stable bundle id/hash and report paths.
3. Render Chinese review report with conflicts, apply candidates, local write candidates, remote write candidates, publication candidates, and redaction scan.
4. Ensure all Notion and publication actions remain dry-run.
5. Add regression fixtures for unchanged, conflict, stale, and secret-containing inputs.

## Research Required

Status: resolved by prior milestones.

Evidence:

- `.plan-state/decompose.yaml`

## Risks And Alternatives

Risks:

- End-to-end report could become too broad to review.
- Apply candidates could be ambiguous without hashes.

Rejected alternative: separate reports per subsystem only. Final apply needs one reviewable evidence bundle.

## Validation

Run:

```bash
node --test core/test/root-management-dry-run.test.js core/test/sync-derived-map.test.js core/test/response-contract.test.js
python -m pytest tests/test_notion_output_adapter.py tests/test_notion_mixed_mode.py
cd core && npm test
```

Pass signal: review bundle is deterministic, contains no raw secrets, includes run plans and queue items, and performs no remote writes.

## Audit Focus

- Deterministic dry-run hash.
- No remote writes.
- Review report clearly separates local, remote, and external actions.

## Completion Report Requirements

Include bundle schema, sample report path, redaction scan evidence, no-write evidence, validation output, and remaining apply-gate assumptions.
