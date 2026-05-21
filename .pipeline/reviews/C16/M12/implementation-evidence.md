# C16-M12 Implementation Evidence

## Scope

- Added `parseCodexFinalAssistantOutput()` in `core/src/workspace/index.js`.
- Added `captureFinalAssistantOutput()` in `core/src/workspace/index.js`.
- Added `probeFinalAssistantOutputSource()` in `core/src/workspace/index.js`.
- Export path uses the existing `core/src/index.js` workspace re-export.

## Behavior

- Codex JSONL parsing reads only local files.
- Assistant output is extracted from `response_item.payload.type=message`, `payload.role=assistant`, and `payload.content[].type=output_text`.
- The last assistant output is returned exactly as stored.
- Missing assistant output returns `capture_failed` and no `output`.
- OpenCode remains `probe_only` / unsupported for exact capture in this milestone.

## Validation

```bash
node --test core/test/final-assistant-output.test.js core/test/session-source-discovery.test.js
```

Result: pass, 8/8.

```bash
git diff --check -- core/src/workspace/index.js .pipeline/reviews/C16/M12/implementation-evidence.md
```

Result: pass, no output.
