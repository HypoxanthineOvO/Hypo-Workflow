# C21 Architecture — Skill-first Workflow Core

## Status

- Cycle: C21
- Architecture state: confirmed for Generate
- Product implementation state: not started
- Primary platform in this Cycle: Codex
- Source decisions:
  - `.pipeline/reports/C21-unified-architecture-design.md`
  - `.pipeline/reports/C21-core-cutover-bootstrap-scope.md`
  - `.pipeline/reports/C21-recovery-journal-compaction-design.md`

## Product Boundary

Hypo-Workflow is a Skill and protocol layer, not a runner. The host Agent performs planning, implementation, testing, and review. Deterministic Core code owns schema validation, storage transactions, Records, Receipts, recovery artifacts, lifecycle transitions, adapter payloads, and mechanical gates.

The architecture follows four ownership rules:

1. Every fact has one authority.
2. Platform adapters project behavior but never own Workflow state.
3. Local runtime and memory are ignored; accepted/checkpoint snapshots may enter Git.
4. A valid new manifest selects the new writer; a damaged manifest fails closed and never falls back to a legacy writer.

## Object Model

```text
Project
├── Main Delivery [0..1]
│   ├── Goal
│   └── Cycle
│       └── Milestones [1..n]
├── Foreground Activity [0..1]
├── Explore [0..n, later Cycle]
├── Suspension [0..n, later Cycle]
├── Migration Job [0..1, exclusive]
├── Maintain [ambient]
├── Record Store
├── Runtime / Receipts / Recovery
└── Accepted or Checkpoint Snapshots
```

- Goal and Cycle are peer Main Delivery kinds.
- Goal has one Design contract and no user-visible Milestone sequence.
- Cycle contains ordered Milestones and has one final manual acceptance gate.
- Foreground Activity can temporarily host Analysis/Audit/Quality later without replacing the Main Delivery.
- Maintain records meaningful project context without occupying an activity pointer.

## Physical Layout

```text
.pipeline/
├── manifest.yaml
├── runtime/                         # local / ignored
│   ├── active.yaml                  # references only
│   ├── objects/<ref>/runtime.yaml
│   ├── objects/<ref>/continuation.yaml
│   ├── objects/<ref>/events/*.jsonl
│   ├── receipts/<id>.yaml
│   ├── recovery/blobs/<sha256>
│   ├── recovery/packs/<object>/<pack>/
│   └── migrations/<job>/
├── memory/                          # local / ignored
│   ├── records/<scope>/<kind>/<id>.md
│   ├── index.yaml                   # derived
│   ├── INDEX.md                     # derived
│   ├── capsules/<object>.yaml       # derived / rebuildable
│   └── inbox/
└── snapshots/                       # Git-eligible
    ├── project/
    ├── goals/
    └── cycles/
```

`runtime/active.yaml` may only contain object references. Lifecycle state belongs to the referenced object's runtime. Records are individual Markdown files with typed frontmatter; indexes are always derived.

## Core Module Boundaries

```text
core/src/serialization/       canonical YAML, frontmatter, hashes
core/src/workspace-format/    empty/current/legacy/damaged/mixed detection
core/src/workspace-store/     path guards and recoverable transactions
core/src/manifest/            schema selection and activation
core/src/runtime/             active refs and object runtime/continuation
core/src/records/             Record Patch, supersedes, index rebuild
core/src/receipts/            issue, validate, reserve, consume, invalidate
core/src/snapshots/           accepted/checkpoint projections
core/src/recovery/            Journal, blobs, Capsule, Pack, restore planner
core/src/init/                new/brownfield initialization
core/src/migration/           read-only legacy inspector and internal bootstrap
core/src/delivery/            Goal/Cycle/Milestone lifecycle
core/src/planning/            Design and adaptive Plan compilation
core/src/maintain/            ambient Inbox/Record behavior
core/src/codex-hooks/         Codex payload adapter only
core/src/deletion/            Manifest and controlled executor
core/src/permissions/         Receipt-backed permission decisions
```

Existing `lifecycle`, `knowledge`, `log`, `compact`, `chat`, `rules`, and platform generator modules remain legacy-only until the Deletion Manifest classifies them. New code must not extend their authority model.

## Workspace Transaction

```text
stage all files
-> validate proposed workspace
-> write prepared marker
-> record old hashes/backups
-> install staged files
-> activate manifest last
-> issue workflow.commit Receipt
```

Recovery chooses roll-forward or rollback from the prepared marker plus manifest activation. Multi-file sequential rename without a recoverable marker is not accepted as an atomic Workflow commit.

## Records, Receipts, and Snapshots

| Fact | Authority | Derived/consumer |
|---|---|---|
| Schema and project identity | `manifest.yaml` | Init, Status, migration |
| Active work references | `runtime/active.yaml` | Resume, Guide, SessionStart |
| Delivery state and next step | object `runtime.yaml` + `continuation.yaml` | Capsule and status views |
| Requirements, preferences, decisions, feedback | individual Records | Design, Snapshot, reports |
| Approval and destructive authorization | scoped Receipt | permission/deletion gates |
| Tool and validation evidence | object events and evidence refs | audit and recovery |
| Cross-clone accepted semantics | Snapshot | Git and fresh-clone reconstruction |

Receipt authorization binds actor, intent, object, scope hash, plan hash, expiry, and consumption. Destructive execution additionally binds a Deletion Manifest hash and current Git/path hashes.

## Recovery Flow

```mermaid
flowchart LR
  H[Agent and Hook events] --> J[Segmented object Journal]
  J --> C[Incremental Context Capsule]
  R[Records and Receipts] --> C
  C --> P[Validated Recovery Pack]
  J --> P
  P --> B[SessionStart bootstrap / Resume]
```

- Journal stores explicit rationale summaries, tool evidence summaries, file/test changes, worker lifecycle, and compact events.
- Large output is stored as a content-addressed blob and referenced by digest.
- Capsule is rebuildable and cannot overwrite Records or object runtime.
- Recovery Pack holds the latest Capsule, continuation, relevant Records, evidence refs, Git/worktree summary, hashes, and vector cursor.
- Failed compact restores the latest valid Pack and replays only the required Journal delta.
- `transcript_path` is optional convenience input, never authority.

## Delivery Lifecycle

```text
proposed
  -- approval Receipt --> waiting_to_start
  -- explicit user start --> executing
  --> blocked / needs_revision / suspended
  --> pending_acceptance
  -- acceptance Receipt --> accepted
```

Direction-changing feedback moves work to `needs_revision` and produces a revised proposal. It does not authorize implementation. Cycle Milestones use `pending`, `executing`, `verified`, `blocked`, `needs_revision`, `superseded`, or `skipped`; they do not create separate user acceptance gates by default.

## Command Exposure

The registry classifies capabilities as `public`, `contextual`, `internal`, `deferred`, or `removed`. Platform discovery may expose only public and currently valid contextual Skills.

Public/contextual C21 surface:

```text
/hw:guide  /hw:init  /hw:goal  /hw:plan  /hw:cycle
/hw:maintain  /hw:resume  /hw:accept  /hw:reject
```

Chat, Explain, Status, Report, Log, Check, Compact, Knowledge, consistency Sync, Debug, explicit start, and Plan phases are natural/internal behavior. Analysis, Audit, Quality, Explore, Docs, PR, Release, Optimize, Stash, and experiments are deferred. Setup, Rules, Stop command, Skip, Reset, Showcase, Patch, Help, Watchdog, and plan-confirm are removal candidates.

## Codex Adapter Boundary

Codex Hooks are thin adapters for `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SubagentStart`, `SubagentStop`, and `Stop`.

Hooks may collect events, inject bounded context, call deterministic gates, and surface reminders. They cannot create Workflow authority by inference. `PreToolUse` is incomplete by official design, `PostToolUse` cannot undo effects, and matching hooks may run concurrently; therefore deletion safety uses an exact Receipt plus controlled executor, with Hooks as an additional guardrail.

C21 uses the plugin's default `hooks/hooks.json` discovery path and isolates the legacy Claude Hook file. OpenCode and Claude adapter redesigns are later Cycles.

## Bootstrap Cutover

```text
M1-M4 new kernel and Init
-> read-only Extractors produce Record Patches
-> Curator deduplicates and links supersedes
-> Auditor checks coverage, inference, and secrets
-> deterministic writer stages data
-> validate Capsule, Pack, Snapshot, and legacy fence
-> activate manifest last
-> resume C21 on new runtime
```

This repository is the only automatic migration exception in C21. General legacy projects are detected and reported but never silently rewritten. CI uses a fixed redacted fixture derived from the reference workspace, not live `.pipeline` data.

## Worker Separation

Material implementation uses separate test, implement, and audit identities. Small reversible work may use `solo-verified`; a prompt that requires separation cannot silently downgrade. Migration adds read-only Extractor and Curator workers, but only the deterministic writer can commit authoritative Records.

## Deferred Scope

- OpenCode, Claude Code, Cursor and other adapter redesigns
- Workflow Stash/Suspend/Pop implementation
- Experiment project management
- Aggregated telemetry and command usage analytics
- Docs/PR/Release redesign
- Dashboard, TUI, and generic Automation Jobs

## Architectural Validation

The final C21 closure must prove:

1. New writes never touch legacy authority files.
2. New/brownfield Init and legacy zero-write detection work in real repositories.
3. Goal and Cycle survive process restart and reach manual acceptance correctly.
4. Journal/Capsule/Pack recovery survives truncation and corrupt-latest-Pack faults.
5. Codex Hooks produce real effects on the installed host and report skipped capability tiers honestly.
6. Deletion requires a separately approved exact Manifest and cannot execute after drift.
7. Only the nine confirmed commands remain discoverable and generators cannot revive removed surfaces.

## Milestone C21-M1 / Prompt 00-workspace-format-transaction-kernel-and-legacy-write-fence

### ADDED

- Canonical serialization and manifest modules.
- Six-class, zero-write workspace format detection, including missing-root `empty` semantics.
- Recoverable manifest-last transaction kernel with prefix-free write-set preflight, staged/target hash validation, disk-fact recovery, and pending-transaction exclusion.
- Central legacy writer inventory and fence covering 22 project mutation families.

### CHANGED

- Legacy project writers now fail closed before their first mutation in current, mixed-current, and damaged-current workspaces.
- Project config, generated platform artifacts, Docs, README, selected-project sync, project TUI, CLI Init, and notify/log process boundaries are explicitly classified.
- Global config/TUI/registry/maintenance contracts remain outside the project writer fence.

### REASON

- Initial GREEN covered the declared 14-family inventory but independent audits reproduced transaction drift, false finalize, cross-id pending, omitted public writers, and prefix-colliding write-set failures.
- Three adversarial audit identities and two audit-driven TDD revisions were required before final certification.

### IMPACT

- Downstream prompts affected: M2-M8 may rely on manifest-last transaction and the 22-family legacy fence as the only M1 write boundary.
- M2 must not assume cross-process locking, fsync-backed marker durability, or generic helper path ownership; these remain residual risks.
- Recommended prompt updates: none. Existing M2-M8 requirements remain compatible and can run unchanged.

## Milestone C21-M2 / Prompt 01-runtime-records-receipts-and-snapshots

### ADDED

- Reference-only active pointer plus object-local Runtime and Continuation stores for Delivery, Activity, and Bootstrap Job.
- One-fact-per-file Markdown Record authority with deterministic writer IDs, explicit supersedes edges, and rebuildable machine/human indexes.
- Structured, scoped, single-use Receipt state machine with a captured-Clock store factory and explicit public lifecycle views.
- Deterministic accepted/checkpoint Snapshot projection with portable locator and content-derived path enforcement.
- Twenty explicit root exports across Runtime, Records, Receipts, and Snapshots.

### CHANGED

- Canonical mapping normalization now preserves safe enumerable own data properties through descriptor writes, including prototype-sensitive names, without changing the mapping prototype.
- Record index rebuild requires exactly one active leaf per dedupe key and never arbitrates authority by recency or ID.
- Runtime/Continuation opposing authority checks are recursive rather than top-level only.
- Receipt validate/reserve/consume use host or captured Clock ownership and reject per-call time overrides before reads or writes.
- Snapshot validation rejects clone-local locator forms and verifies both Record-derived and content-addressed Snapshot paths.

### REASON

- Initial implementation reached `49/49` focused and `801/801` full regression, but an independent adversarial audit reproduced four authority/fail-closed gaps and three warnings.
- The milestone returned to TDD, added merge/canonicalization/Clock/portability/path/ownership contracts, and required two further production revisions before final GREEN.
- A fresh independent audit verified all seven findings closed with `61/61` focused and `21/21` targeted assertions.

### IMPACT

- M3 may use object references, individual Records, Receipt public views, and M1 transaction APIs as certified boundaries; it must not create a second authority inside Capsule or Pack.
- Any deterministic M3 test time must use an injected Clock/store boundary rather than per-operation timestamps for authorization decisions.
- Recovery Pack projections must reuse Snapshot portability rules and preserve content-derived path identity.
- Same-process Receipt reservation is not a cross-process lease; M3 concurrency must partition Journal writers by session/writer rather than infer a stronger lock.
- Standalone terminal Receipt timestamps remain a documented restrictive/admin residual risk; production workflows should prefer the captured-Clock store envelope.
- Recommended prompt updates: none. M3-M8 remain compatible with the confirmed architecture.

## Milestone C21-M3 / Prompt 02-recovery-journal-capsule-and-pack-engine

### ADDED

- Object/session/writer-partitioned segmented Recovery Journal with stable vector cursors and explicit rationale/evidence summaries.
- Redaction-first content-addressed text blobs with same-process digest publication serialization and verified on-demand reads.
- Derived-only Context Capsule with deterministic full rebuild and byte-identical incremental update.
- Sealed Recovery Pack with Capsule/Continuation/reference/evidence/worktree/cursor binding, previous-Pack ancestry, bounded restore, corrupt-head fallback, and deterministic retention.
- Fourteen explicit Recovery exports in the module and Core root surface.

### CHANGED

- Incremental Journal replay now distinguishes three cursor boundaries: post-cursor events in the same segment, required cursor-segment tail followed by rotation, and a sealed cursor segment whose next segment begins at `anchor.sequence + 1` and may be skipped without parsing old payload bytes.
- Equal-Clock Pack generation is ordered by verified `previous_pack_ref` ancestry rather than lexical content digest.
- Retention execution now binds normalized request, complete candidate inventory, recursive directory digests, exact delete/retain sets, and canonical plan hash before any removal.
- Routing identifiers receive a bounded secret-like detector before Clock access, path derivation, hashing, blob publication, or Journal append.

### REASON

- The initial declared suite reached `29/29` and full regression `842/842`, but independent audit reproduced six gaps in shared-blob concurrency, equal-time generation, routing metadata, retention integrity, true incremental replay, and append cursor shape.
- Audit-driven tests expanded the focused boundary to 47 cases. Five production revisions were required to close all findings without regressing ordinary same-segment updates or the intentionally unreadable sealed-segment path.
- Fresh independent audit verified all six findings closed with focused `47/47`, additional `/tmp` falsification probes, and `0 blocking / 0 warning`.

### IMPACT

- Downstream prompts affected: M4-M8 may rely on the certified M1-M3 APIs and authority direction without changing their existing technical routes.
- M4 Init may build the initial Runtime/Records/Capsule/Pack through deterministic APIs, but must not infer transcript authority or create platform Hook behavior.
- M5 bootstrap may seal and restore C21 using Pack ancestry and vector cursors; read-only Extractors still produce Record Patches only and must not write Journal authority from raw chat.
- M7 Codex Hooks must remain thin adapters, preserve transcript as convenience-only input, and report process-local locking, filesystem durability, and finite secret-corpus boundaries honestly.
- M8 must keep Recovery retention separate from the separately approved Deletion Manifest/Receipt executor.
- Recommended prompt updates: none. Existing M4-M8 prompts already express these boundaries, so no prompt patch queue was created.

## Milestone C21-M4 / Prompt 03-init-workspace-adoption-and-minimal-skill-router

### ADDED

- Manifest-last `initializeWorkspace(...)` for empty and unmanaged Brownfield repositories, including a single no-input outcome Ask and bounded Adoption Brief evidence.
- Raw read-only `inspectLegacyWorkspace(...)` with root, `.pipeline` ancestor, leaf type, symlink, containment, hash, malformed-evidence, and missing-optional-leaf handling.
- Availability-aware `resolveCommandRoute(...)` and `discoverableCommandMap(...)`, exposed with Init and Legacy Inspector as four explicit M4 Core APIs.
- Focused Root/Init/Guide Skills that use progressive disclosure instead of duplicating the complete command manual.

### CHANGED

- Command capability now has three explicit views: 54 canonical Registry entries, 53 legacy physical-inventory entries, and 2 currently discoverable routes (`/hw:guide`, `/hw:init`). Planned Goal remains canonical but is not advertised or read through a missing backend.
- Init validates exact own fields and all projected Brownfield path/root/package metadata before root coercion, Clock access, path derivation, Record compilation, or transaction preparation; untrusted keys and values are never echoed.
- Skill backend availability now anchors on a real ordinary non-symlink repository root and verifies every child component and final file for type, containment, and symlink use.
- Root `SKILL.md` is now 105 lines / 7,183 bytes; unavailable legacy Skills remain physical compatibility evidence until M8 but cannot bypass Registry availability.

### REASON

- The legacy Init/Setup/global-registry path could not create or safely inspect the new workspace format and encouraged platform registration inside a Skill-first product.
- Initial implementation reached focused `25/25` and full `885/885`, but independent audit reproduced one sensitive-metadata authority leak and two filesystem trust-anchor gaps.
- Audit-driven tests expanded M4 to 44 cases. Production Revision 4 and a bounded fixture correction closed all findings; fresh final audit passed with `0 Critical / 0 Warning / 0 Info`.

### IMPACT

- M5 may rely on M4 workspace classification, raw Legacy Inspector, M1 manifest-last transaction, M2 Record/index/Snapshot boundaries, and M3 Capsule/Pack APIs.
- Legacy raw parsed documents are evidence input only. M5 Extractors and Curator must emit proposals; only the deterministic writer may commit filtered Records after independent coverage/privacy audit.
- Any pending M1 transaction must be recovered before M5 activation. After manifest activation, legacy writers remain frozen and C21 resumes from new Runtime/Continuation/Pack without dual writes.
- M6 may consume canonical Registry metadata when implementing Goal/Cycle, but runtime discovery must remain backend-verified. M8 alone owns deletion of the 53-entry compatibility inventory and legacy assets.
- Recommended prompt updates: none. Existing M5-M8 prompts already encode proposal-only extraction, secret/raw-transcript exclusion, manifest-last activation, fresh-process Resume, writer freeze, and independent deletion approval. No prompt patch queue was created.
