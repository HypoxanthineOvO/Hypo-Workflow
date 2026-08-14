# G22 Final Closure Audit

- Delivery: `g22-vsp-distribution-contract`
- Role: `audit`
- Audit identity: `g22-audit-worker`
- Scope: Hypo-Workflow, Codex-VSP, VSP-Open-Code
- Mode: read-only product closure audit; this report is the only file written
- Verdict: **PASS**

## Conclusion

The seven findings from the initial audit, plus the separately tracked OpenCode installed-release consumption check, are closed in production source and independently validated by the final test worker. G22 now has a truthful and reproducible Hypo-Workflow release, a real portable ZIP installation path, verified installed-release discovery in both hosts, strict recursive Host Status validation, exact nine-command projection, same-transaction Bootstrap fail-closed projection, and no reachable legacy Workflow writer/runner.

No correctness, integrity, authority-duplication, or acceptance blocker remains within the approved G22 scope. The Delivery may proceed to Workflow verification and final manual acceptance. This verdict does not authorize push, tag, publication, installation into a real user environment, or commits in either target repository.

## Previous Findings Closure

### 1. Truthful `source_commit`: closed

- `contracts/host/v1/release-manifest.json:4-7` binds release `13.1.0-beta.2` to `225e45dacd8185b8cba5d934d745031210f0203d`.
- `git rev-parse HEAD` independently returns the same commit (`feat: release manifest-based workflow core`).
- `scripts/build-host-artifacts.mjs:51-58` rejects dirty packaged inputs before building. All packaged source inputs currently match HEAD; only derived release outputs and unrelated `.pipeline` state remain untracked/dirty.

### 2. Real portable ZIP and production installer: closed

- The emitted portable ZIP contains `bundle-manifest.json`, `installed-release.json`, the command manifest, Root, and exactly nine Skill directories.
- `scripts/build-host-artifacts.mjs:85-92,132-151` emits an exact per-file SHA-256/byte inventory.
- `VSP-Open-Code/.../bundle-resolver.ts:25-62` verifies the outer ZIP hash, exact inner inventory, installed descriptor binding, release version/source commit, and command-manifest checksum before activation.
- `bundle-resolver.ts:138-176` stages atomically, keeps one `previous` installation, and restores it if post-activation descriptor/command validation fails.
- `workflow-release.ts:7-24` is a real registered CLI install entry and requires explicit `--yes`; `src/index.ts:39-40,184-185` registers it.

### 3. Codex installed plugin discovery: closed

- `Codex-VSP/.../workflow_slash_routing.rs:137-166` discovers verified Hypo-Workflow versions from `CODEX_HOME/plugins/cache`, with environment roots retained only as explicit overrides.
- `workflow_slash_routing.rs:174-303` validates the installed descriptor, plugin name/version, source-commit form, command-manifest checksum, exact nine-command set, safe paths, and Skill-file presence.
- `chatwidget/command_palette.rs:15-25` uses the Codex-home installed-release resolver in the production palette path.

### 4. OpenCode installed release consumption: closed

- `host-contract.ts:63-135` loads the installed descriptor, verifies its release identity and command-manifest checksum, validates exact Root/nine-command structure, and checks each installed Skill file.
- `host-contract.ts:137-144` defaults production reads to the activated OpenCode data root (`.../opencode/hypo-workflow/current`), not a sibling source checkout.
- `registry.ts:11-23` projects commands from that verified installed release and fails closed to an empty surface when unavailable.

### 5. Strict recursive Host Status validation: closed

- Codex `core/src/host_contract.rs:58-179` recursively rejects sensitive keys, enforces exact keys at every nesting level, checks current/invalidated null relationships, validates kinds, integers, and resume command, and returns invalid without retaining the projection on failure.
- OpenCode `host-contract.ts:148-227` enforces the equivalent recursive exact-shape and sensitive-field policy.
- Both hosts now consume the shared secret-rejected fixture and test a nested unknown `private_runtime` field.

### 6. Reproducible timestamps and checksums: closed

- `scripts/build-host-artifacts.mjs:21,81,93,102,153-168` derives time from the source commit, disables source mtime preservation, normalizes all staged mtimes, fixes `TZ=UTC` and `LC_ALL=C`, and sorts archive inputs.
- Final test evidence records two consecutive identical builds. Independently checked current hashes match the release manifest: Codex ZIP `2bf3a1c...`, portable ZIP `9875c4c...`, command manifest `c9decee...`, and installed descriptor `afa6156...`.

### 7. Stale `/hw:status` regression: closed

- `Codex-VSP/.../chatwidget/command_palette.rs:340-359` now asserts all nine public commands and explicitly rejects `/hw:status`.
- Final test evidence reports the formerly failing targeted unit test as `1/1 passed`; focused TUI routing is `8/8 passed`.

### 8. Bootstrap projection atomicity: closed

- `core/src/workspace-store/transaction.js:174-217` no longer exempts Bootstrap activation write sets. Any `active.yaml` or host-visible Runtime/Continuation authority write receives a fail-closed Host projection in the same transaction unless the transaction already supplies one.
- The source-level path applies to Bootstrap activation because it writes `active.yaml`; the final worker additionally reports Bootstrap activation/fault/rollback `67/67 passed` and maintained Core `486/486 passed`.

## Other Contract Checks

- Public surface is exactly `/hw:guide`, `/hw:init`, `/hw:goal`, `/hw:plan`, `/hw:cycle`, `/hw:maintain`, `/hw:resume`, `/hw:accept`, and `/hw:reject`.
- All three deletion reports remain `outcome: applied` and match their exact manifest hashes and distinct Receipt IDs. The two stale `redskill-package/*.zip` artifacts remain absent.
- Production reachability scans find no Codex imports of the deleted `workflow_context`, `workflow_conversation_capture`, or `workflow_files` modules, and no OpenCode imports of the retired Workflow state/executor/journal stack.
- Final independent test evidence is GREEN: Hypo `486/486` plus scenarios `8/8`; Codex Host `5/5`, routing `4/4`, TUI `8/8`, palette `1/1`, and Cargo check; OpenCode Host/real ZIP `7/7`, related broad `26/26`, and typecheck.
- Dirty worktrees in both target repositories remain intact at their pre-G22 HEADs (`993b5e6...` and `af398ec...`). No target commit, reset, clean, publication, or installation was performed. Hypo's local source commit is not pushed; `origin/main` remains at `0373266...`.

## Residual Risks

- Real remote publication, marketplace installation, user-directory activation, and Codex Hook re-trust have deliberately not run. Each remains a separate explicit side-effect gate after acceptance.
- `implementation.md` still describes the earlier pre-fix source-commit blocker. The final test evidence and this audit supersede that statement; refreshing the implementation summary would improve record clarity but is not a product or acceptance correctness blocker.
- Existing Cargo dead-code warnings and deferred OpenCode prompt/tool/compaction/worker Hook automation remain outside G22 correctness scope.
- Generated release outputs are intentionally outside the source commit and must be published only together with the matching manifest/checksums. Target repository changes remain uncommitted by design and need their own later repository-local commit/release decisions.

## Final Verdict

**PASS.** All initial blockers are closed with source and test evidence. G22 is ready for Delivery verification and one final manual acceptance gate.
