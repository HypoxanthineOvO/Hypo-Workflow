# Implementation evidence

Role: `implement`

## Change summary

- Workspace mutation now uses a short cross-process writer lease with bounded owner metadata, heartbeat poison state, automatic pending transaction recovery, stale takeover, and fencing immediately before target rename.
- Delivery authority permits multiple non-terminal objects. `active.delivery` is only a legacy foreground pointer; explicit object-ref resume is independent.
- Workstreams reuse `activity` Runtime objects and add Session binding, routing signals, evidence, Continuation, generation CAS, path/Git scope protection, close/release, and resume.
- dependency-ready Milestones support Workstream claim/release and concurrent CAS verification without lost updates. Same-ID concurrent Delivery creation uses create-only preconditions.
- The VSPi Host Contract keeps Plan authority in Hypo-Workflow, model resolution in VSPi, manual pin priority, capability filters, and context retrieval disabled by default with Pi native compaction fallback.
- Source and bilingual docs plus a target-local `0.2.0` handoff explicitly supersede VSPi's pending M6/M8 LocalPlanBackend direction without writing the target repository.

## Modified modules

- `core/src/workspace-store/transaction.js`
- `core/src/delivery/index.js`
- `core/src/workstreams/index.js`
- `core/src/host-contract/vspi.js`
- Core exports and focused regression tests
- `README.md`, `README.en.md`, bilingual VSPi reference docs, and `.pipeline/integrations/` handoff artifacts

## Build

`npm run build:host` passed from source commit `efef329bf2ab5234c3a261f9e6396dfa8e8c5cf6`.

- Codex plugin SHA-256: `9beb79123e21056ba22e0ea3f27ff71246c6d08cb679a0e02de936c81f48b60a`
- Portable bundle SHA-256: `f1b95f163fd3253a3ce4ed7ca6d5bc0c0cd344d793a2c7525c64ca3f750e618f`

No dependency, daemon, process manager, push, release, or target-repository write was introduced.
