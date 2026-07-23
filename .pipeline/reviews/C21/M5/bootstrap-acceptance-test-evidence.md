# C21-M5 Bootstrap Acceptance TEST Evidence

- Worker: `/root/m5_acceptance_test`
- Role: independent `TEST`
- Decision: `GREEN`
- Production edits: none
- Live authority edits: none

## Conclusion

Revision 2 acceptance and the complete Core validation gate are GREEN. All `41/41` acceptance tests pass, including four-file legacy freeze sealing, eight strict/reconciliation drift cases, eleven evidence-union cases, and both successful proof-hash cases. The original 16 lifecycle contracts remain GREEN.

The earlier shared-fixture blocker is closed. The original M5 TEST owner added a fixed, portable `PROGRESS.md` to the reference workspace; M5 focused now passes `64/64` and full Core passes `983/983` with zero skips. No production or live authority was modified by this TEST revision.

## Test Contract

The suite fixes the following minimum behavior:

1. The migration module and Core root export internal `acceptBootstrapActivation`; no public command is introduced.
2. Pending activation remains readable through Runtime, Capsule, Pack selection, and fresh restore.
3. Pending activation blocks Runtime, Journal, Capsule update/rebuild, Pack, Record, and generic transaction writers with exact code `ERR_BOOTSTRAP_ACCEPTANCE_PENDING`; every rejection is zero-write and does not echo input content.
4. Before acceptance, immediate rollback still succeeds while legacy `state.yaml`, `cycle.yaml`, and `log.yaml` retain exact bytes and mtimes.
5. Strict acceptance writes immutable `.pipeline/runtime/migrations/<job>/acceptance.yaml`, binds the job, rollback checkpoint, stage hash, manifest digest, accepted time, current Pack/cursor validation head, and validation evidence, and is idempotent without rewriting the sealed rollback checkpoint.
6. After acceptance, a normal Runtime writer succeeds and rollback returns `ERR_BOOTSTRAP_ROLLBACK_ACCEPTED` before baseline-drift checks.
7. Reconciliation accepts a test-only raw reconstruction of one coherent initial-Pack descendant and rejects a workspace containing unexpected Record, Receipt, and Snapshot authority files without leaking their content.
8. Every new activation seals `.pipeline/state.yaml`, `cycle.yaml`, `log.yaml`, and `PROGRESS.md` into the rollback checkpoint with `path`, `sha256`, `size_bytes`, and `mtime_ns`; strict and reconciliation acceptance both reject bytes, mtime, missing-file, and PROGRESS drift before writes.
9. Acceptance evidence is a strict union: Snapshot evidence must be the real self-validating stage checkpoint, while file evidence must be a repository-relative regular non-symlink whose byte digest matches. Missing, wrong-hash, wrong-semantic, unknown-type, absolute, traversal, and symlink inputs fail closed without content leakage.
10. A successful acceptance validation head binds `verified_evidence_hash` and `legacy_freeze_inventory_hash` into the companion self-hash.

The acceptance call surface expected by the test is:

```js
acceptBootstrapActivation(root, {
  bootstrap_job_ref,
  checkpoint_ref,
  mode: "strict" | "reconciliation",
  evidence_refs,
}, { id })
```

The result carries `status`, `acceptance_ref`, and the normalized `acceptance` object. The companion authority uses `authority_role: bootstrap_acceptance`, `acceptance_state: accepted`, and a semantic hash equal to `acceptance_ref.semantic_hash`.

## Revision 2 GREEN Validation

### Acceptance suite

```bash
node --test core/test/bootstrap-acceptance.test.js
```

Result: `41/41 pass`, `0 fail`, `0 skip`, exit `0`.

Verified behavior:

- rollback checkpoint seals all four legacy files with path, SHA-256, size, and nanosecond mtime;
- strict and reconciliation each reject state bytes drift, cycle mtime-only drift, missing PROGRESS, and changed PROGRESS with metadata-complete zero-write checks;
- Snapshot/file evidence rejects missing, wrong hash/semantic, unknown type, absolute, traversal, and symlink inputs;
- strict and reconciliation success bind `verified_evidence_hash` and `legacy_freeze_inventory_hash`;
- all Revision 1 pending gate, rollback, idempotence, immutable checkpoint, writer reopen, Pack reconciliation, and unexpected-authority cases remain GREEN.

The first GREEN collision exposed only representation assumptions in the TEST: the implementation deterministically sorts inventories/evidence and routes file symlinks through `ERR_RECOVERY_PATH_FORBIDDEN`. The owned test now compares path-keyed sets and accepts that exact zero-write safety code. No field, digest, metadata, or rejection behavior was weakened.

### Focused regression

| Suite | Command scope | Result |
|---|---|---:|
| M1 | workspace format, transaction, legacy fence, YAML compatibility, workflow commit | `76/76 pass` |
| M3 | Journal, faults, Capsule, Pack | `49/49 pass` |
| M5 | migration, activation, single-writer, Record, Pack | `64/64 pass` |
| Knowledge | post-activation OpenCode gate | `2/2 pass` |

Blocker closure history:

- The first post-implementation run produced `13` failures because the shared fixed fixture lacked `.pipeline/PROGRESS.md`; production correctly returned `ERR_BOOTSTRAP_CHECKPOINT_INVALID` before staging.
- Propagation was `10` Bootstrap activation counts, including the four fault leaves and aggregate parent, plus `3` new-format single-writer tests.
- Fixture Revision 3 added a regular, non-symlink, repository-relative `PROGRESS.md`; the same focused command now passes `64/64` without changing production or weakening the four-file contract.

### Full Core regression

```bash
node --test core/test/*.test.js
```

Result:

```text
tests 983
pass 983
fail 0
skipped 0
cancelled 0
todo 0
exit 0
```

The earlier `970 pass / 13 fail` run is retained as blocker history. After fixture Revision 3, all `983` tests pass and no additional regression class appears.

### Static and boundary checks

- `node --check` over all `248` JavaScript files under `core/src` and `core/test`: pass.
- `git diff --check`: pass.
- Core root and migration both export `acceptBootstrapActivation` as functions.
- Core root and public workspace-store exports do not expose `commitBootstrapAcceptanceTransaction`.
- No `acceptBootstrapActivation` or internal acceptance transaction route appears in `cli`, `hooks`, `scripts`, Skills, OpenCode, or Claude public surfaces.
- The new fixture `PROGRESS.md` is a `217`-byte regular non-symlink file, uses a repository-relative path, and contains no secret-like or absolute-path references.

### Gate status

Acceptance Revision 2, all focused suites, full Core regression, syntax, diff, API boundary, public-surface, and fixture safety checks are certified GREEN by this TEST identity. No test blocker remains for the next fresh audit.

## Revision 2 RED

Command:

```bash
node --test core/test/bootstrap-acceptance.test.js
```

Result:

```text
tests 41
pass 17
fail 24
skipped 0
cancelled 0
todo 0
exit 1
```

Failure classification:

- `1` rollback-checkpoint assertion: `legacy_freeze_inventory` is absent instead of containing the four exact pre-activation file facts.
- `8` strict/reconciliation drift subtests fail because acceptance succeeds after state bytes drift, cycle mtime-only drift, missing PROGRESS, or changed PROGRESS; `1` parent aggregate yields `9` failures.
- `10` evidence subtests fail because missing/wrong Snapshot, unknown type, absolute/traversal path, missing/wrong file, absolute/traversal file, and file symlink are accepted; `1` parent aggregate yields `11` failures.
- The Snapshot symlink case already passes through the existing zero-write `ERR_BOOTSTRAP_PATH_FORBIDDEN` path guard.
- `2` successful-binding subtests fail because strict and reconciliation companions omit both required validation-head hashes; `1` parent aggregate yields `3` failures.

The `17` passing tests are the original `16/16` Revision 1 behavior set plus the already-protected Snapshot symlink case. There are no syntax, import, fixture, environment, timeout, cancellation, or skip failures.

Every negative case snapshots all files and symlinks with byte hash, size, and mtime before the acceptance attempt. Future rejection must leave the companion, transaction inventory, Runtime, checkpoint, and all legacy files metadata-identical.

## Sealed-Checkpoint Compatibility Contract

Future activations are covered mechanically by the new rollback-checkpoint inventory test. The already sealed live rollback checkpoint must not be rewritten to retrofit that field.

For the current repository, implementation and final audit must instead use a one-time immutable compatibility binding that:

- binds the existing rollback checkpoint by exact path and semantic hash;
- lists all four legacy files with repository-relative path, SHA-256, size, and mtime in nanoseconds;
- extends the older three-file baseline with a separately verified `PROGRESS.md` fact;
- is itself self-hashed and explicitly approved/audited before live acceptance;
- is read and verified in both reconciliation head observations;
- contributes the same `legacy_freeze_inventory_hash` written to the acceptance validation head;
- never edits the sealed rollback checkpoint or silently trusts the current live files as their own baseline.

This TEST revision does not create that live binding. The main thread and the next fresh audit must verify it against the real frozen workspace before controlled live acceptance.

## Revision 1 GREEN History

Final command:

```bash
node --test core/test/bootstrap-acceptance.test.js
```

Final result:

```text
tests 16
pass 16
fail 0
skipped 0
cancelled 0
todo 0
exit 0
```

The suite verifies API publication, pending read/restore, seven pending writer gates, immediate rollback, strict acceptance and idempotence, immutable checkpoint bytes/mtime, writer reopening, accepted rollback precedence, coherent reconciliation, and unsafe extra Record/Receipt/Snapshot rejection.

The first post-implementation run was `13 pass / 3 fail`: two assertions expected provisional `validation_head.pack_ref` fields and the third failure was their parent aggregate. A fixed-fixture API probe showed complete equivalent bindings under `head_pack_ref`, `initial_pack_ref`, `pack_chain`, and `current_cursor`. Only the two owned assertions were corrected; production was not changed.

Final requested regression matrix:

| Suite | Result |
|---|---:|
| Bootstrap acceptance | `16/16 pass` |
| M1 workspace format + transaction | `30/30 pass` |
| M3 Recovery | `49/49 pass` |
| Existing M5 focused baseline | `64/64 pass` |
| Knowledge post-activation gate | `2/2 pass` |

All five commands exited `0` with no failures, skips, cancellations, or TODOs.

## Initial RED History

Command:

```bash
node --test core/test/bootstrap-acceptance.test.js
```

Result:

```text
tests 14
pass 2
fail 9
skipped 3
cancelled 0
todo 0
exit 1
```

Failure classification:

- `1` API publication assertion: the migration module and Core root both lack `acceptBootstrapActivation`.
- `7` writer subtests: Runtime, Journal, Capsule update, Capsule rebuild, Recovery Pack, Record, and generic transaction all wrote successfully instead of returning `ERR_BOOTSTRAP_ACCEPTANCE_PENDING`.
- `1` parent test failure is the Node test runner's aggregate result for those seven failed writer subtests.
- Strict accept, accepted rollback, and reconciliation groups are explicitly skipped until the missing API exists, preventing cascaded `undefined is not a function` noise.

Passing behavior in the same RED run:

- Pending Runtime/Capsule/Pack readers and fresh restore are read-only.
- Immediate pending rollback succeeds and preserves legacy authority bytes and mtimes.

There were no syntax, import, fixture, timeout, or environment failures.

## Reconciliation Fixture Probe

The test-only historical fixture path was exercised independently before handing off implementation:

- Clone an activated fixed fixture into an isolated scratch directory.
- Remove only the scratch migration marker so existing public writers can construct historical state.
- Write a changed Runtime/Continuation, one valid Journal event, the matching Capsule, and one sealed descendant Pack.
- Raw-copy only those allowed historical descendant surfaces back into the pending fixture.
- Restore through the real public reader, without mocks.

The probe confirmed that the new Pack's `previous_pack_ref` equals the initial Pack, restore selects the descendant Pack, and the restored `next_action` comes from the descendant Continuation.

## Baseline Validation

### M1 transaction and workspace format

```bash
node --test core/test/workspace-format.test.js core/test/workspace-transaction.test.js
```

Result: `30/30 pass`, `0 fail`, `0 skip`.

### M3 recovery

```bash
node --test \
  core/test/recovery-journal.test.js \
  core/test/recovery-faults.test.js \
  core/test/context-capsule.test.js \
  core/test/recovery-pack.test.js
```

Result: `49/49 pass`, `0 fail`, `0 skip`.

### Existing M5 focused baseline

```bash
node --test \
  core/test/bootstrap-migration.test.js \
  core/test/bootstrap-activation.test.js \
  core/test/new-format-single-writer.test.js \
  core/test/record-store.test.js \
  core/test/recovery-pack.test.js
```

Result: `64/64 pass`, `0 fail`, `0 skip`.

### Knowledge post-activation gate

```bash
node --test core/test/knowledge-opencode-gate.test.js
```

Result: `2/2 pass`, `0 fail`, `0 skip`.

## Modified Files

- `core/test/bootstrap-acceptance.test.js` - new behavior-first acceptance and pending-gate suite.
- `.pipeline/reviews/C21/M5/bootstrap-acceptance-test-evidence.md` - this evidence and implementation handoff.

No fixture helper, production module, existing evidence, live manifest, Runtime, Journal, Capsule, Pack, Record, Snapshot, or legacy authority file was modified.

## Verified Implementation Contract

- The ordinary pending gate is shared by transaction-backed writers; Journal/direct writes also fail before persistence.
- A normal public `commitWorkspaceTransaction` cannot bypass pending acceptance.
- Read/restore operations remain available while pending.
- A valid accepted companion causes rollback to return `ERR_BOOTSTRAP_ROLLBACK_ACCEPTED` before rollback-baseline checks.
- Reconciliation validates the historical descendant head and rejects unexpected Record, Receipt, or Snapshot authority without content leakage.
- Acceptance does not edit the sealed rollback checkpoint in place; repeating the same request returns the same immutable companion without workspace writes.

## Deferred Test Depth

Per the parent worker's scope reduction, this first RED does not add the larger per-field tamper matrix, disconnected valid-Pack matrix, or every individual cursor-corruption case. Those are appropriate for the post-GREEN independent audit or a narrowly requested follow-up. The core suite already fixes publication, the pending write boundary, immutable acceptance, rollback precedence, writer reopening, one valid reconciliation, and one unsafe reconciliation rejection.
