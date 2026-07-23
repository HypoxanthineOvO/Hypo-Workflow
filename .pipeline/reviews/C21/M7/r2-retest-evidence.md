# C21-M7 Revision 2 Independent RETEST Evidence

- Role: fresh independent `RETEST`
- Milestone: `C21-M7`
- Verdict: `PASS`
- Production, Hook/config, Plugin, Skill, docs, tests, fixtures, and authority edits: `none`
- RETEST-owned file: `.pipeline/reviews/C21/M7/r2-retest-evidence.md`

## Conclusion

Revision 2 closes the published M7 audit contracts. Recovery data is covered by the shared protected-path policy, Ambient Maintain persists a bounded semantic delta instead of a raw prompt, the output validator accepts the documented Codex shapes while keeping event-specific fields closed, and reminders are target/effect aware. No product defect was reproduced.

All specified focused suites and the complete Core regression passed with zero failures and zero skips. Synthetic Hook execution, Plugin/config/JSON validation, JavaScript syntax, and Git whitespace checks also passed. The installed Official Codex host remains an honest `SKIP`: the available `codex-cli 0.128.0` exposes no verifiable current Hook surface.

## Approach

1. Restored C21 from the manifest-based Runtime and confirmed `M7 / verifying / revision_2_retest`.
2. Ran the Revision 2 audit contracts, existing M7 focused suite, seven-file M7+Recovery suite, Receipt/deletion/adversarial suite, and full Core regression.
3. Validated the synthetic Hook wrapper, ten-event configuration, Plugin manifest/Skills, project config, JSON, all relevant JavaScript syntax, and `git diff --check`.
4. Inspected the production boundary paths for Recovery overlap, semantic extraction, output schemas, tool-aware rewrites, Bash/apply-patch target inference, and effect-aware reminder deduplication.
5. Compared legacy authority hashes with the sealed M5 baseline and compared VSP-Codex status before/after the RETEST.

No real repository deletion occurred. Deletion tests operated only in disposable temporary Git fixtures.

## Files And Modules Inspected

- `core/src/codex-hooks/index.js`
- `core/src/maintain/index.js`
- `core/src/deletion/index.js`, `core/src/deletion/policy.js`
- `core/src/permissions/index.js`
- `hooks/hooks.json`, `hooks/codex-hook.mjs`, `hooks/claude/hooks.json`
- `.codex-plugin/plugin.json`, `skills/resume/SKILL.md`
- M7, Receipt, Recovery tests, and `core/test/fixtures/c21-m7/`
- C21 Runtime/Continuation/Journal and the M5 sealed legacy-freeze baseline

The only file created by this RETEST is this report.

## Test Design And Exact Results

### Revision 2 Audit Findings

```text
node --test core/test/c21-m7-audit-findings.test.js
= 30 tests / 30 pass / 0 fail / 0 skip
```

### Existing M7 Focused

```text
maintain-ambient + codex-hooks-vnext + deletion-gate
+ codex-hook-process + c21-m7-adversarial
= 21 tests / 21 pass / 0 fail / 0 skip
```

### Seven-File M7 + Recovery

```text
maintain-ambient + codex-hooks-vnext + codex-hook-process + deletion-gate
+ recovery-pack + recovery-journal + context-capsule
= 60 tests / 60 pass / 0 fail / 0 skip
```

### Receipt + Deletion + Adversarial

```text
receipt-store + deletion-gate + c21-m7-adversarial
= 33 tests / 33 pass / 0 fail / 0 skip
```

### Full Core Regression

```text
npm test
= 1088 tests / 1088 pass / 0 fail / 0 skip
```

### Hook, Plugin, Config, And Static Checks

```text
Codex Hook synthetic/process smoke: PASS
  - ten input schemas
  - valid wrapper emits exactly one JSON object
  - invalid JSON emits no stdout and exits non-zero
Hook config shape: PASS (ten events, seconds-based timeouts)
Plugin validator: PASS
scripts/validate-config.sh: PASS
Plugin/Hook/fixture JSON parse: PASS (4 files)
JavaScript node --check: PASS (277 files under core/src, core/test, hooks, scripts)
git diff --check: PASS
```

### Installed Official Host

```text
CODEX_HOOK_SMOKE=1 node scripts/codex-real-hook-smoke.mjs
=> SKIP (codex-cli 0.128.0; installed host exposes no verifiable Hook surface)
```

This RETEST does not claim a current Official Codex real-host PASS.

## Boundary Verification

- Recovery protection: the shared `.pipeline/runtime/recovery` prefix policy uses bidirectional overlap checks, so ancestor, exact root, exact `blobs`, and descendants fail through both Manifest normalization and independently crafted Receipt-context normalization. The R2 suite exercises both entry points.
- Semantic persistence: `UserPromptSubmit` passes only the extracted `semantic_delta` and its bounded body as the summary; the raw prompt is not passed to Inbox/Journal persistence. The durable-plus-transient-tail contract passes for Inbox and Journal, no-durable input is zero-Inbox, and the production extractor bounds the joined durable statements to 512 UTF-8 bytes.
- Output schema: `suppressOutput` is admitted for `SessionStart`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStop`, and `Stop`; legacy block shapes and input-bound Bash/apply-patch/MCP rewrites are closed by event/tool-aware validation.
- Reminder targeting: apply-patch paths come from patch headers. Bash target inference covers redirection and common writers (`touch`, `mkdir`, `tee`, `cp`, `mv`, `install`, `truncate`, in-place `sed`/`perl`, and `dd`). Plain `echo` and `git status` are not classified as mutating. Reminder keys include the worktree effect digest, so unchanged repeats deduplicate and changed content can remind again.

The parent task requested immediate closure before an additional ad-hoc temporary-workspace probe could be run. The runtime evidence above therefore consists of the dedicated 30/30 production-contract suite plus independent production-source inspection; Bash target variants and whole-persisted-object prompt scanning should remain explicit probes in the next fresh AUDIT. This is an evidence limitation, not a reproduced implementation defect.

## Ownership And Freeze Verification

The C21 Journal records Revision 2 TEST completion before IMPLEMENT start. The new R2 test file was last modified at `15:49:18 +0800`; the relevant production repairs were modified at `15:56:21` and `16:00:45 +0800`. Existing M7 fixtures retain their earlier `14:40` timestamps. This supports the required TEST/IMPLEMENT separation; IMPLEMENT did not rewrite the Revision 2 contract or fixtures.

The four legacy lifecycle files exactly match the sealed M5 acceptance baseline:

```text
.pipeline/state.yaml    8b97e6df7a2b78469008b776e65bebd6227eb660e6cba2953422aa38f5cf4d17
.pipeline/cycle.yaml    d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb
.pipeline/log.yaml      14f108a6994130ec59f60e7a94169df80998ee7319dc4b5dd0f6fa2f8a268222
.pipeline/PROGRESS.md   303e593fae56deb877718a55d7c4acbb080c2506e6da21f9cda2474fb5b7fa4b
```

The `/home/heyx/Codex-VSP` porcelain status was byte-for-byte identical before and after RETEST. No VSP-Codex file was written by this identity.

## Expected Behavior

Ambient Maintain records only bounded durable project facts; transient prompt tails do not become workflow memory. Ordinary deletion authority cannot cover Recovery data. Codex outputs remain exact to the documented event contract. Write-capable tool reminders identify relevant targets, suppress unchanged repeats, and return after a new material effect. Hooks remain supplementary guardrails and do not replace Receipt-backed destructive authority.

## Problems Encountered

The installed Official Codex binary is too old to verify the current ten-event Hook contract, so real-host validation is unavailable. Full TAP output was large, but the completed footer was captured with exact totals. At the parent task's immediate-close boundary, no additional ad-hoc runtime probe was started.

## Residual Risks And Follow-Up

- Current Official Codex Plugin discovery, project trust, and ten-event delivery still require a compatible installed host and fresh interactive session.
- Bash target extraction is intentionally bounded and heuristic; uncommon shell writers may depend on the dirty-worktree fallback.
- Multi-target deletion remains non-atomic, and Receipt/deletion locks do not close every cross-process TOCTOU or crash window.
- Recovery Journal, Inbox, Record/index, and Hook writers retain the previously documented multi-commit/process-local concurrency limits.
- The next independent AUDIT should execute the deferred Bash target/read-only and whole-persisted-object prompt probes before closing M7.

Within the completed Revision 2 contract and regression boundary, M7 is ready for fresh independent AUDIT.
