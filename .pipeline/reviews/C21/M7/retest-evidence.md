# C21-M7 Revision 1 Independent RETEST Evidence

- Role: fresh independent `RETEST`
- Milestone: `C21-M7`
- Verdict: `PASS`
- Production, Hook/config, Plugin, Skill, docs, tests, fixtures, and Workflow authority edits: `none`

## Conclusion

Revision 1 closes all three previously published RED contracts. Raw key/value secrets now fail before the first Ambient Maintain Journal or Inbox write, while `[REDACTED]`, valid `secret_refs`, and ordinary prose such as `token budget` or `password policy` remain usable. The canonical deletion policy rejects the ancestor, exact path, and descendant of every required authority, recovery, Bootstrap, compatibility, and deletion-evidence surface through both the Manifest builder and standalone Receipt-context entry.

The published M7 and Recovery suite, Receipt/deletion coverage, synthetic Hook process, Plugin/config/static checks, and full Core regression are GREEN. No Revision 1 defect was reproduced. The installed host cannot verify the current Official Codex ten-event Hook surface, so real-host status remains an explicit capability-honest `SKIP`, not a PASS.

## Approach

1. Ran the three independent adversarial contracts alone.
2. Ran the published seven-file M7+Recovery set independently.
3. Ran the exact Receipt Store + Deletion + Adversarial focused set, then exercised positive and negative Revision 1 boundaries from an inline probe without editing tests.
4. Ran the Hook synthetic/process smoke, Plugin validator, config validator, JSON parsing, JavaScript syntax, and Git whitespace checks.
5. Ran the complete repository `npm test` entry.
6. Compared M7 test/fixture timestamps and hashes against Revision 1 production timestamps, and compared the four legacy lifecycle hashes against the sealed M5 freeze baseline.

All destructive behavior occurred only inside temporary Git fixtures. `/home/heyx/Codex-VSP` was not read or modified by this RETEST identity.

## Files

Primary production and integration surfaces inspected:

- `core/src/runtime/internal.js`
- `core/src/maintain/index.js`
- `core/src/deletion/policy.js`
- `core/src/deletion/index.js`
- `core/src/permissions/index.js`
- `core/src/codex-hooks/index.js`
- `hooks/codex-hook.mjs`, `hooks/hooks.json`, `hooks/claude/hooks.json`
- `.codex-plugin/plugin.json`, `skills/resume/SKILL.md`
- M7, Receipt, and Recovery tests and `core/test/fixtures/c21-m7/`

The only file created by RETEST is this evidence report.

## Test Design And Exact Results

### Revision 1 Adversarial

```text
node --test core/test/c21-m7-adversarial.test.js
= 3 tests / 3 pass / 0 fail / 0 skip
```

### Published M7 + Recovery

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

An additional Delivery Receipt superset also passed: `42/42`, with no failures or skips.

### Revision 1 Boundary Probe

- Raw `password=super-secret-value-123456789`: rejected before Journal/Inbox with a byte-for-byte identical workspace tree.
- `password=[REDACTED]` plus `[{ provider: "env", ref: "OPENAI_API_KEY" }]`: staged successfully and preserved the normalized `secret_refs`.
- `Keep the token budget bounded and document the password policy.`: staged successfully without a false positive.
- Protected-path matrix: `11` required surface classes x `ancestor/exact/descendant` = `33` candidates.
- Both `buildDeletionManifest()` and `buildDeletionReceiptContext()` rejected every candidate: `66/66` assertions passed.

The matrix covered Manifest, active pointer, Runtime, Record, Capsule, Pack, Bootstrap acceptance, Bootstrap rollback, compatibility evidence, legacy-freeze compatibility evidence, and deletion evidence report paths.

### Hook, Plugin, Config, And Static Checks

```text
Codex synthetic/process smoke: PASS
  - 10 event schemas
  - valid wrapper path emits one JSON object
  - invalid JSON emits no stdout and exits non-zero
Plugin validator: PASS
scripts/validate-config.sh: PASS
Relevant JavaScript node --check: PASS (10 files)
Plugin/Hook/fixture JSON parse: PASS (4 files)
git diff --check: PASS
```

### Full Regression

```text
npm test
= 1058 tests / 1058 pass / 0 fail / 0 skip
```

### Installed Host

```text
CODEX_HOOK_SMOKE=1 node scripts/codex-real-hook-smoke.mjs
=> SKIP (codex-cli 0.128.0; installed host exposes no verifiable Hook surface)
```

This evidence does not claim a current Official Codex ten-event installed-host PASS.

## Ownership And Freeze Verification

The five M7 test files and two fixtures have mtimes from `14:40` through `15:18`; Revision 1 production files were modified at `15:23`. Their observed SHA-256 hashes were recorded during RETEST, and no test or fixture bytes changed during any RETEST command. This is consistent with the independent TEST ownership record and confirms IMPLEMENT did not rewrite the Revision 1 contracts or fixtures.

The four legacy lifecycle files exactly match `.pipeline/reviews/C21/M5/legacy-freeze-acceptance-baseline.json`:

```text
.pipeline/state.yaml    8b97e6df7a2b78469008b776e65bebd6227eb660e6cba2953422aa38f5cf4d17
.pipeline/cycle.yaml    d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb
.pipeline/log.yaml      14f108a6994130ec59f60e7a94169df80998ee7319dc4b5dd0f6fa2f8a268222
.pipeline/PROGRESS.md   303e593fae56deb877718a55d7c4acbb080c2506e6da21f9cda2474fb5b7fa4b
```

Their `08:16` mtimes also remain unchanged.

## Expected Behavior

Ambient Maintain may persist semantic project memory only after shared secret scanning succeeds. Redacted placeholders and metadata-only secret references remain valid, but assigned raw secret-like values are zero-write failures. Deletion candidates that overlap protected Workflow paths in either direction cannot enter a Manifest or receive a Receipt context; successful ordinary deletion still requires exact Manifest binding, a fresh single-use Receipt, drift revalidation, and controlled execution evidence.

## Problems And Residual Risks

No blocking problem was found during RETEST. Residual risks remain:

- Current Official Codex Plugin discovery, project trust, and live ten-event delivery are unverified on an installed compatible host.
- Multi-target filesystem deletion is not atomic; a late I/O failure can leave a partial deletion after `prepared` evidence.
- Receipt locking and check-to-delete validation do not eliminate cross-process races or all TOCTOU windows.
- Journal/Inbox and Record/index persistence are separate commits and still rely on later reconciliation after a crash.

These risks were already documented by M7 and were not expanded by Revision 1. They do not invalidate the verified blocker closure.
