# C20-M2 Diff Ownership Note

Timestamp: 2026-06-30T20:32:16+08:00

## Conclusion

The C20-M2 audit warning is accepted as a non-blocking dirty-worktree attribution caveat. C20-M2 owns the C20 focused test/evidence and the shared guidance renderer implementation; several adjacent tracked diffs are pre-existing or parallel source-state changes and are not claimed as C20-M2 worker edits.

## Owned By C20-M2

- `core/test/c20-consultation-boundary.test.js`
- `.pipeline/reviews/C20/M2/test-evidence.md`
- `core/src/artifacts/agent-guidance.js`
- `core/src/artifacts/opencode.js`
- `core/src/artifacts/claude.js`
- `.pipeline/reviews/C20/M2/implementation-evidence.md`
- `.pipeline/reviews/C20/M2/audit.md`

## Adjacent Dirty Context Not Claimed By C20-M2 Workers

- `core/test/commands-rules-artifacts.test.js`
- `core/test/c18-instruction-quality-contract.test.js`
- `plugins/opencode/templates/AGENTS.md`

These files are visible in the current worktree diff and are covered by the focused regression command, but they were already part of the broader dirty source state before the M2 test/implement worker scopes were assigned. They are not evidence of worker-scope violation for C20-M2.

## Acceptance Handling

- Keep the audit warning attached to M2.
- Do not revert adjacent dirty files.
- Do not attribute adjacent dirty files to the M2 workers.
- Continue to M3 because the M2 functional validation passes and the warning is about attribution cleanliness, not behavior correctness.

## Validation

Focused M2 validation remains:

```bash
node --test core/test/c20-consultation-boundary.test.js core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
```

Observed result: 23/23 passing after implementation.
