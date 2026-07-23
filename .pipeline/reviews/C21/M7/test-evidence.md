# C21-M7 TEST Evidence - RED_READY

- Role: strict TEST
- Milestone: `C21-M7`
- Result: `RED_READY`
- Official schema source: <https://learn.chatgpt.com/docs/hooks>
- Official schema checked: `2026-07-12`

## Conclusion

M7 now has behavior-first RED coverage for ambient Maintain, all ten current Codex Hook events, process stdout/stderr discipline, compact Pack/restore, Subagent evidence streams, reminder deduplication, and Receipt-backed controlled deletion. The focused suite fails only because the M7 production surface, wrapper, and Codex-compatible Hook configuration do not exist yet. Existing M3 Recovery behavior remains green.

## Added Test Assets

- `core/test/maintain-ambient.test.js`
- `core/test/codex-hooks-vnext.test.js`
- `core/test/codex-hook-process.test.js`
- `core/test/deletion-gate.test.js`
- `core/test/fixtures/c21-m7/helpers.js`
- `core/test/fixtures/c21-m7/official-codex-hooks.json`

No production, Hook, plugin, Skill, Runtime, Record, Journal, Capsule, Pack, legacy lifecycle, or prior evidence file was edited by this worker.

## Contract Surface

### Ambient Maintain

- `createAmbientMaintainStore({ clock })`
- `captureSemanticDelta(root, input, { id })`
- `evaluateRecorderProposal(root, input)`
- `promoteRecordPatch(root, proposal, { id })`

A meaningful delta must append through the M3 Recovery Journal, stage an item under `.pipeline/memory/inbox/`, and return a normalized Record Patch without creating `.pipeline/runtime/active.yaml`. It must not create legacy `.pipeline/chat/` or `.pipeline/inbox/`. Recorder evaluation is byte-for-byte zero-write; only deterministic main promotion may commit the Record.

### Codex Hooks

- `CODEX_HOOK_EVENTS`
- `validateCodexHookInput(input)`
- `validateCodexHookOutput(event, output)`
- `evaluateCodexHookEvent(root, input, options)`

The exact event set is `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SubagentStart`, `SubagentStop`, and `Stop`. Fixtures follow the current official common/event-specific fields and output restrictions. `SessionStart`, `PreToolUse`, and `PermissionRequest` are read/gate events and may run without an operation id. Events that persist Journal, Inbox, Pack, or evidence require a unique `{ id }`.

`PreToolUse` must deny obvious direct deletion as an additional guardrail, but the tests do not treat it as the authority boundary. `PreCompact` must seal a valid existing M3 Pack; `PostCompact` records the outcome; `SessionStart(source=compact)` injects bounded restore context without raw transcript/Journal replay. Concurrent Subagent starts/stops must produce distinct writer streams and evidence refs. Identical documentation/Record reminders must not repeat.

### Process Wrapper

`hooks/codex-hook.mjs` is spawned as a real child process against a real temporary manifest/Git workspace. A valid invocation must emit exactly one JSON line on stdout. Invalid JSON must exit non-zero, emit no stdout, and place diagnostics on stderr. `hooks/hooks.json` must use seconds-based command timeouts, register all ten events, and contain no Claude-only `InstructionsLoaded` event.

### Deletion

- `buildDeletionManifest(root, input)`
- `validateDeletionManifest(root, manifest)`
- `buildDeletionReceiptContext(manifest, { actor })`
- `executeDeletionManifest(root, { manifest, receipt_id, actor, tool_use_id }, { id })`

The Manifest binds exact path hashes and Git `HEAD`. `buildDeletionReceiptContext()` must create an exact M2 `deletion.execute` Receipt context bound to the Manifest hash. Execution order is reserve Receipt, revalidate Manifest/path/Git drift, delete through the controlled executor, consume Receipt, then persist an evidence report. Missing Receipt, wrong actor, expiry, path-content drift, or Git drift leaves every target intact.

The negative protected set covers the current Manifest, Runtime, Continuation, M3 Journal, Capsule, Records, Snapshots, Packs, Bootstrap acceptance companion, rollback checkpoint, and compatibility evidence. These paths cannot enter an ordinary Deletion Manifest even when supplied directly by a caller.

## Focused RED

Command:

```bash
node --test \
  core/test/maintain-ambient.test.js \
  core/test/codex-hooks-vnext.test.js \
  core/test/codex-hook-process.test.js \
  core/test/deletion-gate.test.js
```

Result: `18 tests / 0 pass / 18 fail / 0 skip`.

Expected failing contracts:

1. `createAmbientMaintainStore` is not exported.
2. `CODEX_HOOK_EVENTS`, input/output validators, and `evaluateCodexHookEvent` are not exported.
3. `buildDeletionManifest`, `validateDeletionManifest`, `buildDeletionReceiptContext`, and `executeDeletionManifest` are not exported.
4. `hooks/codex-hook.mjs` does not exist.
5. Existing `hooks/hooks.json` exposes only `Stop`, `SessionStart`, and Claude-only `InstructionsLoaded`; it lacks the other eight official Codex events and still uses millisecond-like timeout values.

No failure originated from fixture setup, temporary Git repositories, child-process plumbing, JSON parsing, or Node syntax.

## Recovery Baseline

Command:

```bash
node --test \
  core/test/recovery-journal.test.js \
  core/test/context-capsule.test.js \
  core/test/recovery-pack.test.js
```

Result: `42 tests / 42 pass / 0 fail / 0 skip`.

This preserves the current Journal segmentation/vector cursor, Capsule incremental/full equivalence, Pack sealing/selection/restore, corrupt-Pack fallback, Subagent stream serialization, redaction, and retention baseline.

## Static Validation

- Five JavaScript files pass `node --check`.
- Official fixture JSON parses successfully.
- Scoped trailing-whitespace scan is clean.
- Unrelated dirty-worktree changes were preserved.

## Expected GREEN Result

After implementation, the focused suite must pass using real files, Git state, Receipt transitions, Recovery Pack persistence, and a spawned wrapper. Reducer-only or mocked-dispatcher tests do not satisfy this evidence. Installed-host trust/smoke remains a later validation boundary and must report unsupported or skipped host behavior explicitly rather than calling it a pass.

## Risks And Follow-up

- Official `PreToolUse` interception is incomplete and matching Hooks run concurrently; controlled deletion remains the authority boundary.
- `PostToolUse` cannot undo effects.
- `SubagentStart` accepts `continue: false` for compatibility but it does not prevent start; the adapter must not rely on it.
- Hook definition changes require user trust and a new session before installed-host validation.
- Path portability, duplicate-helper consolidation, and workspace-responsibility boundaries from the open M7 feedback Record still require implementation/audit evidence before acceptance.
