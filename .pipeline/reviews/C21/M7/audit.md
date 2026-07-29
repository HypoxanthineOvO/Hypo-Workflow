# C21-M7 Independent Audit

- Role: fresh independent `AUDIT`
- Verdict: `NEEDS_CHANGES`
- Score: `4/5` (`1` best, `5` worst)
- Production/test/config/Skill/doc edits: `none`
- Audit-owned file: `.pipeline/reviews/C21/M7/audit.md`

## Findings

### Critical 1 - Recovery Journal blobs bypass the protected deletion policy

The canonical path policy protects Recovery Packs but not Recovery blobs. `core/src/deletion/policy.js:9-24` includes `.pipeline/runtime/recovery/packs` and omits `.pipeline/runtime/recovery/blobs`, even though `.pipeline/architecture.md:60`, `:88`, and `:141-145` define blobs as content-addressed Recovery Journal storage. The M5 Architecture Plan Review requires Journal and recovery evidence to remain outside ordinary cleanup candidates.

An independent `/tmp` Git fixture reproduced the bypass:

```text
buildDeletionManifest(.pipeline/runtime/recovery/blobs/<sha256>) => ACCEPTED
buildDeletionReceiptContext(manifest, actor)                 => ACCEPTED
receipt intent                                               => deletion.execute
```

No repository deletion was executed. The fixture was removed after the probe.

Impact: an exact user-approved cleanup list can still be converted into deletion authority for bytes required to replay a valid Journal event. This violates the protected-authority invariant and can make Recovery replay or Pack reconstruction fail after an otherwise valid controlled deletion.

Required repair: protect the complete generic Recovery store, including `recovery/blobs`, through the shared canonical policy used by Manifest build/validation/execution and Receipt context. Add ancestor/exact/descendant negative tests for both entry points. Retention-specific deletion must remain a separate audited path.

### Critical 2 - Ambient Maintain persists a whole raw user prompt as a semantic Record Patch

`core/src/codex-hooks/index.js:416-427` treats one keyword match as sufficient and assigns the complete `UserPromptSubmit.prompt` to `record_patch.body`. `evaluateUserPrompt()` then writes that Patch into both the Recovery Journal and `.pipeline/memory/inbox` (`:213-227`). This is not a bounded semantic delta; it is a raw prompt fragment promoted into durable workflow data.

An independent `/tmp` current-workspace probe submitted one durable sentence followed by 40 transient console-log lines. Results:

```text
prompt bytes                         1898
Inbox Record Patch equals full prompt   true
Journal Record Patch equals full prompt true
last transient trace persisted          true
transcript_path persisted               false
```

Secret scanning and forbidden-key rejection work, but they do not solve non-secret raw transcript persistence. This conflicts with `.pipeline/architecture.md:141-146`, the M7 semantic-delta contract, and the audit requirement that raw transcript material be excluded before writes.

Impact: incidental logs, prose, and other non-authoritative prompt content become Journal/Inbox data, degrade context compaction, and can later be promoted as a Record merely because the prompt contains `must`, `要求`, or another broad keyword.

Required repair: do not use the whole prompt as the Record body. Persist only a bounded, explicitly extracted semantic statement, or send the prompt to a proposal-only recorder and let deterministic main-agent review stage the resulting Patch. Add a test with one durable sentence plus a large transient tail and prove the tail is absent from every write.

### Warning 1 - The exported Codex output validator does not match the current documented schema

The current official Hooks page documents:

- legacy `decision: "block"` for `PreToolUse`;
- `decision: "block"`, `reason`, and `hookSpecificOutput.additionalContext` for `PostToolUse`;
- parsed common `suppressOutput` behavior on the applicable common-output events;
- Bash/`apply_patch` rewrites whose `updatedInput` must contain a string `command`.

`core/src/codex-hooks/index.js:560-607` instead rejects the first three documented shapes and accepts an arbitrary object such as `{ arbitrary: true }` as `PreToolUse.updatedInput`. Independent calls reproduced all four mismatches. The existing fixture only tests a subset of the live page and therefore hides this drift.

Source checked on 2026-07-12: <https://learn.chatgpt.com/docs/hooks>.

Impact: the adapter's own current outputs validate, but the exported validator and compatibility tests cannot truthfully claim exact current Official Codex output restrictions. Future use of documented feedback/context or rewrite paths can fail at the local validator rather than at Codex.

Required repair: update event-specific output validation and fixtures from the live release-behavior page. Make rewrite validation input/tool-aware, or narrow the public API so it cannot claim exact validation without the corresponding Hook input.

### Warning 2 - Reminder targeting depends on a non-standard `changed_paths` convention

`core/src/codex-hooks/index.js:252-279` reads `tool_response.changed_paths`; the Official Codex contract only promises a tool-specific JSON response and does not promise that field. `shouldRemind()` at `:474-477` consequently reminds for every `apply_patch` without known paths, but does not remind for Bash writes without the custom field. Dedupe is a permanent digest of tool name, paths, and command (`:469-471`), so a later materially different execution of the same command/path can also be suppressed.

Impact: synthetic fixtures show dedupe, but real-host behavior can be noisy for patches and silent for other writes. This does not satisfy a robust targeted-reminder claim until a compatible host is exercised.

Required repair: derive changed paths from documented tool inputs/results or a bounded before/after worktree observation, and bind dedupe to the relevant effect/turn rather than only command text.

### Info 1 - Public README/Router/Maintain text remains intentionally pre-M8 and is not release truth

`README.md` still advertises the legacy 53-command, six-platform product; `SKILL.md:59` and `skills/maintain/SKILL.md:12` still say ambient Hooks are deferred. M8 explicitly owns the nine-command cleanup and Codex-facing documentation rewrite, so this is not an additional M7 blocker. M7 must not be presented as release-ready before M8 closes these contradictions.

## What Passed

- Exact ten-event configuration exists for `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SubagentStart`, `SubagentStop`, and `Stop`.
- `hooks/hooks.json` uses seconds-based timeouts, default plugin discovery, `PLUGIN_ROOT`, matcher-free tool groups, and no unsupported manifest `hooks` field.
- The wrapper uses a fresh operation UUID, emits one JSON line on successful tested paths, and keeps failure diagnostics on stderr.
- `SessionStart(source=compact)` injects bounded Pack-derived context; PreCompact seals a Pack; PostCompact records the outcome.
- Subagent start/stop events use distinct writer streams and preserve bounded evidence locators.
- Hooks do not issue Receipts, acceptance, workflow transitions, or allow authority. Direct deletion interception is correctly described as an incomplete guardrail.
- Manifest and Receipt context share the same path normalizer for traversal, symlink, overlap, protected exact/prefix, Bootstrap acceptance/rollback, and compatibility paths, apart from the Recovery blob omission above.
- The controlled executor order is reserve -> revalidate -> prepared report -> delete -> consume -> applied report. Missing, wrong-owner, expired, drifted, and reused Receipt cases are covered.
- Plugin metadata uses `repository`, required interface fields are present, Resume has a non-empty non-conflicting name, and legacy Claude Hook configuration is isolated without claiming new Claude support.
- Real Official Codex host evidence is honestly `SKIP`, not `PASS`: PATH points to VSP and `/usr/local/bin/codex` is too old to verify the current ten-event surface.
- TEST, IMPLEMENT, RETEST, and AUDIT identities are separated. The new Runtime/Continuation is authoritative; the four legacy lifecycle files remain frozen according to the sealed M5 baseline evidence.

## Validation Evidence

I did not rerun the full suite. I relied on the fresh independent RETEST's integrity evidence for:

```text
published M7 + Recovery             60/60 pass
Receipt + deletion + adversarial    33/33 pass
full Core regression             1058/1058 pass
synthetic/process Hook smoke            PASS
plugin/config/static checks             PASS
Official installed host                SKIP
```

Independent audit probes, all in disposable `/tmp` workspaces:

```text
raw-prompt semantic extraction          reproduced defect
documented output-schema matrix         reproduced defect
Recovery blob Manifest/Receipt context  reproduced defect
actual deletion                         not executed
```

The passing suite remains useful, but it does not cover the three reproduced blocker contracts.

## Residual Risk Classification

- `Warning`: multi-target deletion is non-atomic; a late I/O failure can leave a partially deleted set.
- `Warning`: process-local Receipt/deletion locks do not close cross-process TOCTOU between final validation and `rm`.
- `Warning`: a crash after deletion but before Receipt consume/applied-report commit leaves prepared evidence without a transactionally complete terminal state.
- `Warning`: Recovery Journal append and Ambient Inbox write are separate commits; Record commit and index rebuild are also separate commits.
- `Warning`: concurrent Hook wrapper processes can target the same main Journal stream while M3 locking remains process-local.
- `Info`: Hook definition changes require trust review and a fresh session; live plugin discovery and ten-event delivery remain unverified on a compatible Official host.

These risks are honestly described in existing evidence and are not the reason for `NEEDS_CHANGES`; the three reproduced contract violations above are.

## Expected Result After Repair

Ambient automation writes only reviewed semantic deltas, current Official Codex payload/output shapes validate exactly, Recovery blobs cannot enter generic deletion authority, and reminders behave usefully on documented real-host payloads. After focused repair tests and a fresh independent retest, M7 can return to audit; M8 may then perform the separately approved cleanup and release-documentation work.

## Problems Encountered

The Codex manual helper could not verify its fetched response because the proxy omitted the expected content hash header. The audit therefore fetched the exact official Hooks page through the OpenAI Docs MCP source and used that release-behavior page for schema comparison. No production or repository state was changed during this fallback.
