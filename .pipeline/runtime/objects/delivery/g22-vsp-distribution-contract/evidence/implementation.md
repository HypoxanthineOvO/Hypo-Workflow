# G22 Implementation Evidence

- Role: `implement`
- Worker identity: `g22-implement-root`
- Scope: Hypo-Workflow Host Contract v1 and distribution artifacts; VSP-Codex and VSP-Open-Code thin-host convergence; controlled legacy deletion
- Status: implementation complete, source commit and release artifacts bound; pending final audit and acceptance gate

## Conclusion

G22 now has one source-owned Host Contract v1 and two thin host consumers. Hypo-Workflow owns lifecycle semantics, workspace writes, Receipts, Records, projection generation, and release manifests. VSP-Codex and VSP-Open-Code retain host-native Ask, Plan/SubPlan, Subagent, TUI, and installation UX while no longer owning Workflow lifecycle state or legacy writers.

## Technical approach

1. Added versioned release, command, projection schemas and shared fixtures under `contracts/host/v1`.
2. Added strict Core parsing and projection refresh/invalidation, with sensitive and unknown fields rejected and transaction-visible state changes invalidating stale projections.
3. Added deterministic Codex plugin and portable bundle generation with SHA-256 manifests.
4. Converted VSP-Codex routing and TUI discovery to the shared command manifest and read-only projection; removed old state writers, conversation capture, and compaction fallback.
5. Converted VSP-Open-Code CLI, Dashboard, status line, and reminders to the shared contract; added checksum-verifying atomic bundle activation with rollback retention; removed the old runner/writer stack.
6. Executed three exact hashed deletion manifests through Core with fresh single-use Receipts; deletion reports remain in Hypo-Workflow authority.

## Modified modules

- Hypo-Workflow: `contracts/host/v1`, `core/src/host-contract`, transaction kernel integration, Codex Hooks, deletion executor, artifact builder, Root plus nine public Skills, maintained tests and scenarios.
- VSP-Codex: `core/src/host_contract.rs`, `workflow_routing.rs`, compaction/session reachability, TUI command routing, focused tests.
- VSP-Open-Code: `workflow/host-contract.ts`, `workflow/bundle-resolver.ts`, registry/CLI, Dashboard/status/reminder consumers, focused tests.

## Test design and validation

- Contract tests bind current, invalidated, legacy, malformed, sensitive-field, checksum-tamper, routing, and rollback behavior.
- Reachability tests and source scans prove deleted legacy writers/runners are absent from production paths.
- Hypo-Workflow maintained Core: `486/486` passed.
- Hypo-Workflow maintained scenarios: `8/8` passed.
- Codex Host Contract: `5/5` passed; Workflow routing: `4/4`; TUI routing: `8/8`; palette regression: `1/1`; `cargo check -p codex-core -p codex-tui` passed.
- OpenCode Host Contract and real emitted ZIP installation: `7/7`; related broad tests: `26/26`; `bun typecheck` passed.
- `cargo fmt --all -- --check` and all three `git diff --check` checks passed.
- Two consecutive builds produced identical release checksums. The manifest binds source commit `225e45dacd8185b8cba5d934d745031210f0203d`; the Codex plugin ZIP, portable ZIP, and installed descriptor hashes are `2bf3a1c77e6c87561d0800656f8fec7d48ed2013221eebf1e8542ff9459d53dd`, `9875c4c8438ea8f6a5040fa547a6973c4b59754335ba129267547bb02f47744b`, and `afa61568595e78d8c5075e500aefe8bc2d62d41b48c71e3364c66d04e1bb8112`.

## Expected behavior

- Hosts discover exactly `/hw:guide`, `/hw:init`, `/hw:goal`, `/hw:plan`, `/hw:cycle`, `/hw:maintain`, `/hw:resume`, `/hw:accept`, and `/hw:reject` from the release command manifest.
- Current workspaces expose a bounded read-only projection; invalidated, damaged, incompatible, and legacy workspaces fail closed or route adoption to `/hw:init` without legacy writes.
- A portable bundle is verified completely before atomic activation; a rejected update preserves the active and previous installations.
- Generic host Ask, Plan, Subagent, and TUI capabilities remain available without becoming Workflow authority.

## Problems encountered

- Projection invalidation initially modified Bootstrap activation checkpoints and caused the maintained suite to fall to `465/486`. Bootstrap activation write sets are now excluded from automatic projection invalidation; the focused Bootstrap suite and subsequent full `486/486` run pass.
- Parallel Cargo jobs contended on the shared build lock but completed successfully.
- Removed obsolete fallback constants/helpers from Codex compaction tests after retiring the production fallback.
- The first independent audit correctly blocked G22 on release provenance, installed-release consumption, recursive schema validation, reproducibility, a stale Codex test, and Bootstrap projection atomicity. Those findings drove the final repair round and the release artifacts were rebuilt from the committed source.

## Risks and follow-up

- Hypo-Workflow source commit `225e45dacd8185b8cba5d934d745031210f0203d` was pushed to the configured `github/main` after explicit user authorization. The generated manifests and `dist/` remain intentionally outside that source commit. No tag, release publication, plugin installation, or target environment update was authorized or performed.
- Codex-VSP and VSP-Open-Code changes remain uncommitted and preserve their pre-existing dirty worktrees; they require separate target-local review and commit decisions.
- OpenCode advanced prompt/tool/compaction/worker Hook automation remains intentionally deferred.
- Target-owned model prompts, provider wording, and runtime tuning remain untouched and require later target-local work.
