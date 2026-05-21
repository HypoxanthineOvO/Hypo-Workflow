# C16-M9 Final Gated Notion Apply And Verification

## Goal

Implement `/hw:maintain apply` real Notion apply path only for approved dry-run bundles, with explicit confirmation, re-read verification, and ledger evidence.

## Technical Solution

Apply consumes only approved dry-run evidence. It rejects stale hashes, unresolved conflicts, missing target page ids, unconfirmed destructive changes, raw secret payloads, and operation drift. Verification re-reads Notion targets before marking queue items complete.

Required inputs:

- `dry_run_id`
- `dry_run_hash`
- `reviewed_apply_plan`
- `explicit_user_confirmation`
- `target_page_ids`

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns apply-gate tests, stale hash rejection, unresolved conflict rejection, redaction rejection, verification tests, and ledger evidence tests.
  - Evidence path: `.pipeline/reviews/C16/M9/test-evidence.md`.
- `implement`
  - Owns `/hw:maintain apply` preflight, approved Notion write path, re-read verification, ledger recording, and final apply docs.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M9/implementation-evidence.md`.
- `audit`
  - Reviews explicit confirmation gate, stale/mutated dry-run rejection, sanitized ledger entries, verification evidence, and worker separation.
  - Evidence path: `.pipeline/reviews/C16/M9/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Add apply preflight checks for dry-run freshness, hash integrity, conflicts, target bindings, and redaction.
2. Enable Notion writes only through approved operation subsets.
3. Re-read target blocks/pages and compare with expected results.
4. Record sanitized apply and verify evidence in maintenance ledger.
5. Refuse publication-channel actions unless a future run-specific integration adds explicit confirmation.

## Research Required

Status: deferred until final gate.

Evidence:

- `.pipeline/deep-plans/DP001-root-project-management-mode/conversion-readiness-checklist.md`

Deferred by user: real Notion apply target set and operation subset are confirmed after M8 review bundle exists.

## Risks And Alternatives

Risks:

- Real Notion writes can damage legacy content if dry-run review is skipped.
- External action confirmation could be confused with ordinary queue approval.

Rejected alternative: keeping v1 dry-run only. User confirmed first version should include final real apply path.

## Validation

Run:

```bash
node --test core/test/notion-apply-gate.test.js core/test/maintenance-ledger.test.js core/test/root-management-dry-run.test.js
python -m pytest tests/test_notion_integration.py tests/test_notion_output_adapter.py tests/test_notion_mixed_mode.py
cd core && npm test
```

Manual smoke: user reviews and approves a concrete dry-run bundle, then a target subset is applied and re-read verification passes.

Pass signal: apply refuses unsafe inputs, accepted operations are verified by re-read, and queue items complete only after verification.

## Audit Focus

- Apply cannot run without explicit confirmation.
- Stale or mutated dry-run bundles are rejected.
- Verification evidence matches sanitized ledger entries.

## Completion Report Requirements

Include apply gate behavior, refused unsafe cases, Notion verification evidence, ledger evidence, validation output, manual smoke result or reason skipped, and residual remote-write risks.
