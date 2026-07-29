# C21-M7 Revision 2 RED Test Evidence

- Role: independent `TEST`
- Date: 2026-07-12
- Production/config/Hook/Skill/doc changes: none
- Destructive execution: none; deletion cases used disposable temporary Git workspaces and stopped at Manifest/Receipt-context validation
- Official release reference: <https://learn.chatgpt.com/docs/hooks> (fetched 2026-07-12)

## Added contract

`core/test/c21-m7-audit-findings.test.js` covers the four audit repair groups:

1. Ordinary deletion authority rejects the complete Recovery store, including ancestor, exact blob, and descendant paths, at both Manifest and Receipt-context entry points.
2. `UserPromptSubmit` extracts one bounded durable sentence, excludes 40 transient `TRACE` lines from both Inbox and Journal, and leaves non-durable noise at zero Inbox writes.
3. The output validator accepts the current documented legacy/common/feedback shapes, keeps unsupported event fields closed, and validates `PreToolUse.updatedInput` against the actual Bash, `apply_patch`, or MCP input.
4. Standard `PostToolUse` payloads without non-standard `changed_paths` produce path-targeted reminders, suppress unchanged repeats, and allow a reminder after a materially changed effect.

## RED run

Command:

```text
node --test core/test/c21-m7-audit-findings.test.js
```

Result: `13 pass / 17 fail / 30 tests` (`exit 1`). The 17 reported failures contain 14 behavior failures plus 3 failed aggregate parent tests.

Behavior failures map only to current production gaps:

- Recovery protection: Manifest and Receipt context both accept `.pipeline/runtime/recovery/blobs` (`2`).
- Semantic extraction: Inbox and Journal bodies equal the full prompt (`2`; parent aggregation adds `1`).
- Official accepted output shapes: `PreToolUse` legacy block, `PostToolUse` feedback/context, and applicable `suppressOutput:false` shapes are rejected (`5`; parent aggregation adds `1`).
- Input-aware rewrite validation: arbitrary/missing/non-string Bash or `apply_patch` commands are accepted (`3`; parent aggregation adds `1`).
- Reminder behavior: the first reminder names only `apply_patch`, and the same-path changed effect remains permanently deduplicated (`2`).

Passing assertions confirm that non-durable noise stays ignored, forbidden event-specific fields remain rejected, valid Bash/`apply_patch` rewrites remain accepted, and MCP replacement arguments remain accepted.

## Existing M7 regression

Command:

```text
node --test core/test/maintain-ambient.test.js core/test/codex-hooks-vnext.test.js core/test/deletion-gate.test.js core/test/codex-hook-process.test.js core/test/c21-m7-adversarial.test.js
```

Result: `21/21 pass` (`exit 0`). No fixture, setup, or prior M7 behavior regressed.

## Expected GREEN

After the production repair, the new file must report `30/30 pass`, while the existing focused suite remains `21/21 pass`. Recovery retention must continue through its separate audited API; these tests do not authorize ordinary deletion of Recovery data.
