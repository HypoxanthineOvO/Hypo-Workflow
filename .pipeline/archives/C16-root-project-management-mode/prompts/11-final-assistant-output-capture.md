# C16-M12 Final Assistant Output Capture

## Goal

Capture the exact final assistant output for a project stop notification. This is a hard gate: if the final assistant output cannot be captured, do not send the stop notification.

## Technical Solution

Implement a final assistant output capture layer. Codex JSONL sessions are the reliable v1 path. OpenCode storage may be probed, but OpenCode support must not be claimed unless the exact last assistant message can be extracted.

The captured text must be sent exactly as stored:

- no redaction
- no truncation
- no summary fallback
- segmentation only at the notification adapter layer

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns Codex JSONL fixtures, exact-text preservation tests, missing-output blocking tests, and OpenCode probe negative tests.
  - Evidence path: `.pipeline/reviews/C16/M12/test-evidence.md`.
- `implement`
  - Owns Codex session discovery/parser, capture result model, OpenCode probe boundary, and exports.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M12/implementation-evidence.md`.
- `audit`
  - Reviews exact output preservation, no-redaction/no-truncation behavior, and unsupported-platform honesty.
  - Evidence path: `.pipeline/reviews/C16/M12/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Discover Codex sessions through explicit session path, session id, session index, or dated `~/.codex/sessions` layout.
2. Parse JSONL records structurally by role/content rather than ad hoc text scraping.
3. Return the last assistant output exactly as stored.
4. Return `capture_failed` with reason when output is unavailable.
5. Add OpenCode probe evidence, but keep support disabled unless exact extraction is verified.

## Research Required

Status: resolved for Codex, deferred for OpenCode exact extraction.

Evidence:

- Local Codex sessions exist under `~/.codex/sessions`.
- Local OpenCode storage exists under `~/.local/share/opencode/storage/session_diff`.

Deferred:

- Exact OpenCode message transcript layout may require a later adapter.

## Risks And Alternatives

Risks:

- Session format changes could break extraction.
- Assistant content may include sensitive data; user explicitly requested original unredacted sending.

Rejected alternative: use progress/report summaries when final output is missing. The user rejected fallback behavior.

## Validation

Run:

```bash
node --test core/test/final-assistant-output.test.js core/test/session-source-discovery.test.js
cd core && npm test
```

Pass signal: fixture and local-shape Codex sessions produce exact final assistant text, missing output blocks notification, and OpenCode unsupported/probe states do not masquerade as successful capture.

## Audit Focus

- Exact output preservation.
- No redaction or truncation.
- No fallback that pretends to be complete.

## Completion Report Requirements

Include capture source priority, exact-preservation evidence, failure behavior, OpenCode support status, validation output, and residual format-change risks.
