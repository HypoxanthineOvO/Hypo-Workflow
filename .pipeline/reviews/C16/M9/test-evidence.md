# C16-M9 Test Evidence

## Scope

Worker: test

Step: `write_tests`

Added RED test file:

- `core/test/notion-apply-gate.test.js`

Protected files were not edited.

## RED Coverage Added

`core/test/notion-apply-gate.test.js` defines the expected contract for `applyApprovedNotionDryRunBundle`:

- Reject missing `explicit_user_confirmation`, `dry_run_id`, `dry_run_hash`, `reviewed_apply_plan`, and `target_page_ids`.
- Reject stale or mutated dry-run bundle hashes before Notion writes.
- Reject unresolved conflicts, unconfirmed remote/external candidates, publication candidates, and external action operations.
- Reject raw secret fields/values and raw Knowledge `blocks`, `messages`, `raw_records`, or raw operation payloads in bundle/report/operations.
- Apply only approved Notion operation ids and reject operation hash drift.
- Re-read target Notion pages/blocks after apply and keep queue item out of `completed` when verification fails.
- Complete queue item only after verification passes, returning sanitized `apply_result`, `verify_result`, `ledger_event`, and evidence refs.

## Commands

### Required Node RED command

Command:

```bash
node --test core/test/notion-apply-gate.test.js core/test/maintenance-ledger.test.js core/test/root-management-dry-run.test.js
```

Result: RED, exit code 1.

Observed:

- 17 tests total.
- 10 passed.
- 7 failed.
- All 7 failures are the new Notion apply-gate tests.
- Failure point: `expected applyApprovedNotionDryRunBundle to be exported from ../src/index.js`.
- Neighbor tests in `maintenance-ledger.test.js` and `root-management-dry-run.test.js` passed.

Expected RED reason:

- The real Notion apply API is not implemented/exported yet.

### Optional Python command requested

Command requested:

```bash
python -m pytest tests/test_notion_integration.py tests/test_notion_output_adapter.py tests/test_notion_mixed_mode.py
```

Result: not run with `python`; exit code 127.

Observed:

- `zsh:1: command not found: python`

Follow-up check with available interpreter:

```bash
python3 -m pytest tests/test_notion_integration.py tests/test_notion_output_adapter.py tests/test_notion_mixed_mode.py
```

Result: exit code 5.

Observed:

- Python 3.12.3 and pytest 9.0.3 are available through `python3`.
- `collected 0 items`
- `no tests ran`

No dependencies were installed.

### Neighbor Node regression command

Command:

```bash
node --test core/test/notion-project-home-dry-run.test.js core/test/maintenance-run.test.js
```

Result: PASS, exit code 0.

Observed:

- 8 tests total.
- 8 passed.

## Notes For Implement Worker

The tests intentionally expect a new exported function named `applyApprovedNotionDryRunBundle`. The implementation can satisfy the contract either by adding that helper behind `/hw:maintain apply` or by routing the command surface to it, but the tests require:

- No Notion write hook called before all preflight gates pass.
- Hash integrity computed over approved dry-run content, not mutable generated timestamps or paths.
- Operation-level approval checked by id and operation hash.
- Publication and generic external actions rejected for this milestone.
- Verification by re-reading Notion targets before queue completion.
- Sanitized ledger event and evidence refs for both failed and successful verification paths.
