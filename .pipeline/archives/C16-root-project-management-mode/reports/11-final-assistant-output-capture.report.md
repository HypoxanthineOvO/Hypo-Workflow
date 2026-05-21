# C16-M12 Final Assistant Output Capture Report

## Result

Completed.

## Summary

C16-M12 added the hard-gated final assistant output capture layer for Codex sessions:

- `parseCodexFinalAssistantOutput()`
- `captureFinalAssistantOutput()`
- `probeFinalAssistantOutputSource()`

Codex JSONL session parsing now returns the last assistant output exactly as stored. The implementation preserves blank lines, code fences, bracketed text, and token-looking strings. It does not redact, truncate, or summarize the output.

Missing assistant output returns `capture_failed` without an `output` field. OpenCode remains probe-only / unsupported for exact capture until a verified transcript layout is implemented.

## Files Changed

- `core/src/workspace/index.js`
- `core/test/final-assistant-output.test.js`
- `core/test/fixtures/final-assistant-output/codex-sessions/2026/05/20/rollout-2026-05-20T09-15-00-final-output-fixture.jsonl`
- `core/test/fixtures/final-assistant-output/codex-missing-assistant.jsonl`
- `core/test/fixtures/final-assistant-output/opencode-probe.jsonl`
- `.pipeline/reviews/C16/M12/test-evidence.md`
- `.pipeline/reviews/C16/M12/implementation-evidence.md`
- `.pipeline/reviews/C16/M12/audit.md`

## Worker Evidence

- Test worker: Peirce
  - Evidence: `.pipeline/reviews/C16/M12/test-evidence.md`
  - RED: missing final-output capture exports.
- Implement step: main agent
  - Evidence: `.pipeline/reviews/C16/M12/implementation-evidence.md`
  - GREEN: implemented Codex local-read exact output capture.
- Audit worker: Kant
  - Evidence: `.pipeline/reviews/C16/M12/audit.md`
  - Verdict: PASS.

## Validation

```bash
node --test core/test/final-assistant-output.test.js core/test/session-source-discovery.test.js
```

Result: 8/8 passing.

```bash
cd core && npm test
```

Result: 602/602 passing.

```bash
git diff --check
```

Result: passing.

## Side-Effect Boundary

- Local filesystem read only.
- QQ sends: none.
- Notion writes: none.
- Remote writes: none.
- External actions: none.

## Residual Risks

Codex session JSONL shape may change. Session-id lookup scans JSONL files and returns the first sorted match. OpenCode exact extraction remains intentionally unsupported until a verified transcript source exists.
