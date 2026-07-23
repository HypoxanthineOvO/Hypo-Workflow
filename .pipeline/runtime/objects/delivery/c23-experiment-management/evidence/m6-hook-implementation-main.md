# C23 M6 Codex Hook Implementation Evidence

- Worker ID: `c23-m6-hook-implementation-main`
- Role: `implement`
- Execution identity: main thread
- Completed at: `2026-07-18T20:06:55+08:00`
- Verdict: `READY_FOR_INDEPENDENT_RETEST_AND_AUDIT`
- Runtime advancement: none

## Task Assessment

- Complexity: `bounded`
- Uncertainty: `low` after wrapper reproduction
- Oracle strength: `strong`
- Blast radius: `shared hook adapter`
- Reversibility: `reversible`
- Hazards: `hook_failure_loop`, `journal_identity`, `schema_overexpansion`
- Semantic route class: `critical`
- Reason codes: `shared_hook_adapter`, `authority_fallback_identity`, `independent_test_red`

## Conclusion And User-Facing Result

Codex Hook payloads may now omit host/version-dependent `turn_id` and `tool_use_id` fields without making the wrapper fail on every event. When the host supplies either field it still must be a secret-safe, safe single-component identifier. Write-capable Hook paths derive deterministic authority-safe fallback IDs from the already validated unique operation ID, so no `undefined` routing metadata reaches Ambient Maintain or Recovery Journal authority.

Hook registration, enablement, trust policy, event-specific output restrictions, and the wrapper protocol remain unchanged.

## Technical Approach

1. `validateCodexHookInput` changed only the two optional identifier checks from unconditional `requireText` to presence-aware validation.
2. `validateOptionalHookIdentifier` runs identifier-local raw-secret detection and `normalizeSafeIdentifier` when a field is present.
3. `evaluateCodexHookEvent` validates operation authority first, then `bindOptionalHookIdentifiers` supplies `turn-<operation_id>` and, for Pre/PostToolUse, `tool-<operation_id>` when missing.
4. Existing evaluation functions and Recovery/Ambient schemas continue receiving required safe identifiers without any schema change.
5. `hooks/hooks.json`, `hooks/codex-hook.mjs`, output validation, Hook enablement, and trust behavior were not modified.

## Modified Module

- `core/src/codex-hooks/index.js`

The independent test identity owns `core/test/c23-m6-codex-hook-compatibility.test.js`, its catalog registration, and `m6-hook-red.md`. This implementation identity did not modify those assets, M7 test assets, Runtime/Continuation, legacy lifecycle files, plugin metadata, cachebuster, or VSP-Codex.

## Validation

- M6 focused: `22/22 PASS` after an initial `3 pass / 19 fail` RED.
- Existing Hook baseline: `7/7 PASS`.
- M1-M6 Experiment + Hook + Record/Receipt/Runtime/transaction high-signal set: `150` top-level / `201/201 PASS`.
- Active-object fallback smoke recorded:
  - `tool.completed`: `turn-c23-m6-post-fallback`, `tool-c23-m6-post-fallback`
  - `turn.agent`: `turn-c23-m6-stop-fallback`
- `node --check core/src/codex-hooks/index.js`: PASS.
- Scoped `git diff --check`: PASS.
- Pending transaction descendants: `0`.

## Freeze SHA-256

- Production candidate `core/src/codex-hooks/index.js`: `72c7b44c54f0c50c7d43beb93e292791a4fa183bf5e627f6223dfbd8872aa63f`
- Independent M6 test: `8945855851c7d8b9698c509c6a6c0cb94259b51f3f61c8d0366367715313fd5b`
- Unchanged `hooks/hooks.json`: `4c31e12a26158e3d67e48ee366d77c86ba8a98553ca0e953e723a7e9210fe2c5`

## Expected Behavior

An optional-ID payload produces one valid JSON wrapper response instead of `Codex Hook failed: Codex Hook turn_id must be non-empty text`. A supplied malformed, traversal-like, or secret-like identifier still fails before evaluation. Every authority-writing event has a unique safe fallback based on its operation ID, while read-only guardrail events can operate without inventing persistent identity.

## Problems And Residual Risk

- The fallback identifies the Hook operation, not a host turn the host did not provide. It is intentionally honest synthetic provenance rather than a guessed real turn relation.
- Direct write-capable API callers still must supply the required unique operation ID; optional Hook fields do not relax transaction authority.
- Hook configuration remains installed-release dependent. This Cycle does not update a cachebuster or reinstall the plugin, so final live verification must occur only after Workflow/VSP contracts are aligned and the user performs the planned unified reinstall.
- M7 test-only RED exists concurrently and is not an M6 regression.

Independent retest and an independent role-separated audit of Hook compatibility plus the original Experiment scope are required before M6 verification.
