# C23 M6 Codex Hook Independent Retest

- Worker ID: `c23_m6_hook_test`
- Role: `test` only
- Completed at: `2026-07-18T20:13:21+08:00`
- Verdict: `GREEN`
- Production/docs/Skill/Runtime edits: `none`

## Conclusion

The single-file M6 production freeze passes independent retest. Host-compatible Hook payloads may omit `turn_id` and `tool_use_id`; supplied identifiers remain type-, safe-component-, and secret-like validated. Active-object writes persist safe, distinct fallback identities without `undefined`. Existing event-specific output restrictions, Hook registration, wrapper bytes, plugin manifest, and trust configuration surfaces remain unchanged.

Authoritative read-only Resume reports M5 `verified`, M6 `executing`, M7 `pending`, `next_action: continue_active_milestone`, and Recovery Pack `missing/degraded`. This test identity did not advance Runtime or Continuation.

## Test Design

- Re-ran the independent M6 focused contract for all optional turn/tool omissions, process wrapper behavior, supplied-ID rejection, and unchanged output allowlists.
- Re-ran the two maintained pre-M6 Hook files for official event/config/process/guardrail/recovery behavior.
- Ran an explicit 14-file M1-M6/shared set: C23 M1-M6, existing Hooks, Record, Receipt, Runtime, and workspace transaction tests.
- Explicitly excluded planned RED `core/test/c23-m7-worker-routing.test.js`; no maintained catalog runner was used for the M6 verdict.
- Created a disposable active Delivery, evaluated `PostToolUse` and `Stop` without optional IDs, replayed the persisted Recovery Journal, recursively scanned for `undefined`, checked fallback uniqueness, and checked temporary transaction residue.

## Validation Results

- M6 focused: `22/22 PASS`, exit `0`.
- Existing Hooks: `7/7 PASS`, exit `0`.
- M1-M6/shared: `150` top-level tests, `201/201 PASS`, exit `0`.
- Active-object smoke: PASS.
  - `tool.completed.turn_id = turn-c23-m6-retest-post-a`
  - `tool.completed.payload.tool_use_id = tool-c23-m6-retest-post-a`
  - `turn.agent.turn_id = turn-c23-m6-retest-stop-b`
  - Three IDs are pairwise distinct; `undefined_paths=[]`; transaction descendants `0`.
- `node --check` for production, wrapper, and M6 test: PASS.
- Scoped `git diff --check`: PASS.
- Repository `.pipeline/runtime/transactions/` descendants: `0`.
- Hook-surface diff contains only `core/src/codex-hooks/index.js`; `hooks/hooks.json`, wrapper, and plugin manifest have no diff.

## Freeze SHA-256

- `core/src/codex-hooks/index.js`: `72c7b44c54f0c50c7d43beb93e292791a4fa183bf5e627f6223dfbd8872aa63f`
- M6 test: `8945855851c7d8b9698c509c6a6c0cb94259b51f3f61c8d0366367715313fd5b`
- Regression catalog including concurrent M7 registration: `37a9c114a8c5bcc54dcdd389d276e75fadf8e84ab3064127e656de7df2515891`
- `hooks/hooks.json`: `4c31e12a26158e3d67e48ee366d77c86ba8a98553ca0e953e723a7e9210fe2c5`
- `hooks/codex-hook.mjs`: `8e3b9baa4c34e1aaac1a16794666a98d4837653776b0cc7e1f6a5c7875a92b5d`
- `.codex-plugin/plugin.json`: `a5874b84d5338e3ee6de4a0ec87874bb0789346ad461017f1dc8e323179080dd`

## Expected Result

Codex no longer emits a repeated Hook failure when a compatible host omits optional identifiers. When authority must be written, the already validated unique operation ID yields honest synthetic provenance (`turn-<operation-id>` / `tool-<operation-id>`). Deletion guardrails, permission behavior, output schemas, enablement, and user trust review remain unchanged.

## Problems And Risks

- The first disposable smoke used the wrong fixture object ID and therefore found no event. The directory was cleaned, no repository file changed, and the corrected smoke using exported `OBJECT_REF` passed. This was a test-script error, not a production failure.
- The fallback identifies one Hook operation, not a real host turn that was absent. Consumers must not infer a cross-event host-turn relation from synthetic IDs.
- This retest verifies unchanged trust-related files by hash/diff; it does not mutate or re-authorize host-local live trust state.
- M7 planned RED is concurrent and intentionally excluded. A separate M7 lifecycle must not reinterpret its failures as an M6 regression.
- Independent audit must still review the original Experiment scope and the compatibility boundary before M6 verification.
