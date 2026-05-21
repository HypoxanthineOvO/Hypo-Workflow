# C16-M12 Test Evidence - Final Assistant Output Capture

## Scope

Added RED test coverage only. No production files were edited.

New test assets:

- `core/test/final-assistant-output.test.js`
- `core/test/fixtures/final-assistant-output/codex-sessions/2026/05/20/rollout-2026-05-20T09-15-00-final-output-fixture.jsonl`
- `core/test/fixtures/final-assistant-output/codex-missing-assistant.jsonl`
- `core/test/fixtures/final-assistant-output/opencode-probe.jsonl`

## Contract Covered

- `parseCodexFinalAssistantOutput` must extract the exact last assistant output from Codex JSONL.
- `captureFinalAssistantOutput` must support explicit `session_path`.
- `captureFinalAssistantOutput` must resolve `session_id` from a dated Codex sessions root.
- Missing assistant output must return `capture_failed` with a reason, no `output`, and no summary/fallback behavior.
- OpenCode probing must remain `unsupported` or `probe_only` unless exact extraction is verified.
- Results must be `local_read` only and must not plan external actions.
- Exact output preservation includes newlines, code fences, bracketed text, token-looking strings, and no redaction/truncation.

## RED Command Results

Command:

```bash
node --test core/test/final-assistant-output.test.js
```

Result: RED as expected.

- Tests: 5
- Pass: 0
- Fail: 5
- Failure reason: expected new APIs to be exported from `../src/index.js`
  - `parseCodexFinalAssistantOutput`
  - `captureFinalAssistantOutput`
  - `probeFinalAssistantOutputSource`

Command:

```bash
node --test core/test/session-source-discovery.test.js
```

Result: PASS.

- Tests: 3
- Pass: 3
- Fail: 0

Command:

```bash
node --test core/test/final-assistant-output.test.js core/test/session-source-discovery.test.js
```

Result: isolated RED as expected.

- Tests: 8
- Pass: 3
- Fail: 5
- Passing tests are the existing session-source-discovery tests.
- Failing tests are only the new final-assistant-output contract tests, all failing on missing API exports.

## Notes For Implementation Worker

The Codex fixture mirrors current session JSONL shape:

- `session_meta` record with `payload.id`
- `response_item` records with `payload.type: "message"`
- assistant text stored in `payload.content[].text` with `type: "output_text"`

The expected final output intentionally contains token-looking strings:

- `sk-codex-fixture-secret`
- `Bearer opencode-raw-token`

These must remain unchanged for this capture path. Reusing redacting consolidation readers will fail the exact preservation contract.
