# C21-M5 post-activation Knowledge gate test evidence

- Worker: `/root/m5_post_activation_test`
- Role: independent test worker
- Recorded at: `2026-07-12T09:14:24+08:00`
- Verdict: `GREEN`

## Failure diagnosis

The F001 gate test combined two different contracts against the live repository:

1. reading the historical Knowledge Ledger Record and its generated indexes;
2. regenerating `.pipeline/knowledge/knowledge.compact.md` through the legacy Knowledge writer.

After M5 activation the repository is correctly classified as `mixed_current_with_legacy_residue`. Historical Knowledge surfaces remain readable, but `renderKnowledgeCompact(".")` must now fail closed with `ERR_LEGACY_WORKSPACE_WRITE_BLOCKED`. The full-regression failure was therefore a stale live-workspace fixture assumption, not a production regression.

Initial focused reproduction:

```text
node --test core/test/knowledge-opencode-gate.test.js
1..2
# pass 1
# fail 1
error.code: ERR_LEGACY_WORKSPACE_WRITE_BLOCKED
failure location: renderKnowledgeCompact(".")
```

## Test correction

`core/test/knowledge-opencode-gate.test.js` now keeps the original F001 semantic coverage while separating read and write boundaries:

- The live repository remains the read-only source for the real C4/M05 F001 Record, its categories, tags, file refs, Decisions index, and Config Notes index.
- A live `renderKnowledgeCompact(".", { records })` attempt is expected to reject with `ERR_LEGACY_WORKSPACE_WRITE_BLOCKED` and identify `legacy.knowledge` plus `mixed_current_with_legacy_residue` in the message.
- The live compact file is sampled before and after the rejected call. Full bytes, size, `mtimeNs`, and `ctimeNs` must remain identical, proving the gate rejects before write mutation.
- Compact generation is exercised in an isolated temporary legacy workspace. The already-read real Records are passed to `renderKnowledgeCompact`, the returned path is checked, the emitted file must exactly equal the returned content, and the generated content must still contain the real F001 Record ID and summary.
- Temporary fixture cleanup is registered with the Node test context.

This preserves the original gate's purpose: real repository evidence is validated, actual compact rendering still runs, and activation's single-writer boundary is now also covered.

## Verification

### Focused test

```text
node --test core/test/knowledge-opencode-gate.test.js
1..2
# pass 2
# fail 0
# skipped 0
# duration_ms 158.413577
```

Both cases passed:

- `F001 gate has a real Knowledge Ledger record and generated context`
- `F001 gate OpenCode smoke validates generated runtime policy surfaces`

### Syntax and hygiene

- `node --check core/test/knowledge-opencode-gate.test.js`: passed.
- `git diff --check -- core/test/knowledge-opencode-gate.test.js`: passed.
- Changed test SHA-256: `a9742e4ad976ba97ac031ebf5baa03ba865245cc93de8dc6c50ef55f1276a51b`.
- Live compact SHA-256 remained `e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177` before and after the test run.

### Legacy freeze check

Current hashes still match `.pipeline/reviews/C21/M5/legacy-freeze-baseline.json` exactly:

| Frozen authority | SHA-256 |
|---|---|
| `.pipeline/state.yaml` | `8b97e6df7a2b78469008b776e65bebd6227eb660e6cba2953422aa38f5cf4d17` |
| `.pipeline/cycle.yaml` | `d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb` |
| `.pipeline/log.yaml` | `14f108a6994130ec59f60e7a94169df80998ee7319dc4b5dd0f6fa2f8a268222` |

## Scope and handoff

- Modified only `core/test/knowledge-opencode-gate.test.js` and this evidence file.
- Did not modify production code, manifest, new Runtime/Journal/Capsule/Pack/Records/Snapshot, any other test, or frozen legacy state/cycle/log/PROGRESS.
- Did not run the implementation worker's private smoke.
- Did not run the repository-wide regression; final full-regression execution remains with the parent workflow so it can validate the combined implementation and test closure once.
- Authority zones changed: **none**. This is a test-fixture correction and evidence record only.
