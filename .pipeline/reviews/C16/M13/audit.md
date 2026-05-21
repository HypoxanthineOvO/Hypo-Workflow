# C16-M13 Audit Recheck - Hypo-Claw QQ Notification Adapter

## Verdict

PASS

## Scope

Reviewed only:

- `core/src/workspace/index.js`
- `core/test/hypo-claw-notification.test.js`
- `.pipeline/reviews/C16/M13/test-evidence.md`
- `.pipeline/reviews/C16/M13/implementation-evidence.md`

Only this audit report was modified.

## Recheck Summary

The two previous Critical blockers are closed.

- External-action confirmation gate: closed. `sendProjectStopNotification()` now blocks `mode: "notify"` unless `options.confirmed === true`, returns `status: "blocked"`, keeps `external_contacted:false`, `qq_contacted:false`, `spawned:false`, and does not call the injected runner (`core/src/workspace/index.js:422-436`). Test coverage asserts the unconfirmed path does not spawn (`core/test/hypo-claw-notification.test.js:153-173`).
- Notify segmentation delivery: closed. Confirmed notify now iterates through `segments` and calls the Hypo-Claw CLI once per segment, with stdin containing the segment body and `segment.index/total` metadata (`core/src/workspace/index.js:438-454`). Test coverage verifies long notifications produce multiple CLI calls, ordered segment indexes/totals, and a rejoined payload equal to the original message (`core/test/hypo-claw-notification.test.js:175-208`).

## Blockers

None.

## Warnings

- Non-blocking naming risk: successful `notify` returns `qq_contacted:false` while `external_contacted:true` and `spawned:true` (`core/src/workspace/index.js:457-471`). This is safer than overstating QQ delivery, but downstream consumers need to treat `external_contacted/spawned` as Hypo-Claw CLI attempt evidence and not as end-to-end QQ delivery proof.
- Non-blocking evidence design risk: `notificationStdinPayload()` still returns a `String` object with custom `includes()` and `toJSON()` (`core/src/workspace/index.js:1007-1018`). Tests now parse it with `String(stdin)`, so behavior is verifiable, but a future cleanup could replace this with explicit sanitized evidence fields.

## Passing Checks

- Dry-run and test modes render local evidence and do not spawn Hypo-Claw or contact QQ (`core/src/workspace/index.js:408-419`; `core/test/hypo-claw-notification.test.js:83-113`).
- Unconfirmed notify is blocked before any external action (`core/src/workspace/index.js:422-436`; `core/test/hypo-claw-notification.test.js:153-173`).
- Confirmed notify uses only the configured Hypo-Claw CLI args: `--stdin --notify --thread-id <id> --server <url>` (`core/src/workspace/index.js:404-405`, `core/src/workspace/index.js:946-957`; `core/test/hypo-claw-notification.test.js:115-151`).
- Long confirmed notify sends ordered segment calls and preserves full message reconstruction (`core/src/workspace/index.js:438-454`; `core/test/hypo-claw-notification.test.js:175-208`).
- Formatter preserves `final_assistant_output` verbatim, with no truncation or redaction markers in the tested output (`core/src/workspace/index.js:354-379`; `core/test/hypo-claw-notification.test.js:45-58`).
- Failure path queues retry evidence with full message, segments, CLI args, failure stderr, and original event text; failure result reports `qq_contacted:false` (`core/src/workspace/index.js:474-505`; `core/test/hypo-claw-notification.test.js:210-244`).

## Verification Run

Executed:

```bash
node --test core/test/hypo-claw-notification.test.js core/test/maintenance-ledger.test.js
git diff --check -- core/src/workspace/index.js core/test/hypo-claw-notification.test.js .pipeline/reviews/C16/M13/test-evidence.md .pipeline/reviews/C16/M13/implementation-evidence.md .pipeline/reviews/C16/M13/audit.md
```

Observed result:

- Tests: 10 pass, 0 fail.
- `git diff --check`: pass.

## Recommended Follow-Up Verification

Before completing M13, run the broader adjacent checks:

```bash
node --test core/test/hypo-claw-notification.test.js core/test/project-stop-event.test.js core/test/final-assistant-output.test.js core/test/maintenance-ledger.test.js
cd core && npm test
```

No further blocker is required from this recheck.
