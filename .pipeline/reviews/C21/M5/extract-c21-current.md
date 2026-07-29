# C21-M5 Current C21 Context Extraction Proposal

## Result

- Extractor role: bounded read-only current-C21 extractor
- Verdict: `PROPOSAL_READY`
- Authority effect: none; this document contains proposals only
- Candidate count: `16`
- Current candidates: `15`
- Superseded historical candidates: `1`
- Confidence: all candidates are `high`
- Selection rule: retain only facts whose absence could materially cause a wrong future decision

This proposal preserves the confirmed C21 architecture, the accepted M1-M4 baseline, the M5 cutover invariant, the exact M6-M8 route, manual acceptance and deletion gates, and explicitly deferred work. It does not allocate Record IDs, write indexes, activate a manifest, or mutate Runtime, Snapshot, Record Store, or protected legacy state.

## Allowed Source Inventory

| Source | SHA-256 |
|---|---|
| `.pipeline/cycle.yaml` | `ff3f4ab3df02073182453f03d6f95a84d287e684a1d2714484a8a21b0f6def98` |
| `.pipeline/architecture.md` | `005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f` |
| `.pipeline/prompts/04-reference-repository-bootstrap-and-schema-activation.md` | `7c958157bcc73b59e5716786caec3a9ffefb3ba33af08026251d6c1cfdeb198d` |
| `.pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md` | `4c56d9c91289fa119f763bee29a057cf4ea2af205f8eed2ca4ecf0d13884239c` |
| `.pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md` | `3378b14eb346eba879b0d0db69a3e3306ddd39ca143f37692e7cae3d392299db` |
| `.pipeline/prompts/07-surface-cleanup-deletion-gate-and-release-ready-regression.md` | `e07ca324a409436f6e540709b1fbb88f287e20945762ed50a88f4b254328de6c` |
| `.pipeline/reports/C21-core-cutover-bootstrap-scope.md` | `887400607034b2c01edbac1e85f408f83352d426996b8657ee5f041cd4ed7224` |
| `.pipeline/reports/C21-recovery-journal-compaction-design.md` | `c6c1c111745827db005ce0ddc88b45587a64c205fcfabee024211f42814281ec` |
| `.pipeline/reports/C21-stash-suspend-reconciliation-design.md` | `e68db327b0b432f87292aec63b5211d07309424509336e7c13b4252df75444e4` |
| `.pipeline/reports/C21-unified-architecture-design.md` | `a833151c2e9f4a95e250f2c9af46645ea3b735fea92b1da9bc9c02080a96b196` |
| `.pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md` | `66ef1909b4e7b399e3bd9a813ec46e226bbeeb68960413f79eced1737906b77f` |
| `.pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md` | `49e3b2c2e98a5610b280c3ae08bf83a9197976f4c6fc89857b5495decbb31e39` |
| `.pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md` | `e5c90d68c4ffb237d9091d4d1e8cbf646742c7a48f9063a84b27a67814edbc41` |
| `.pipeline/reports/03-init-workspace-adoption-and-minimal-skill-router.report.md` | `741089e7a5611f81d301e4638cfab2683570073038121e011cc13e99c019200a` |
| `.pipeline/reviews/C21/M1/final-audit.md` | `cd2e934e13cd537c686c53c064e564adcc330522622f5783d2954177cf039fff` |
| `.pipeline/reviews/C21/M2/reaudit.md` | `3274ba2d3823be6b9ab59cf5eda7c5e9badea643deab206c5e336abeaad93830` |
| `.pipeline/reviews/C21/M3/final-audit.md` | `7de84349e0bba5b062dff1f676459e4d10f990237fbfc1b9d57b80bc7ebdc31e` |
| `.pipeline/reviews/C21/M4/final-audit.md` | `70722191ebad4f041a844a757694a904aae1b74c78ff1f5c86478068d40a88e3` |

Inventory count: `18` files. M2 has no `final-audit.md`; the explicitly allowed `reaudit.md` is the final certification source.

## Explicitly Excluded Classes

- Current or archived `state.yaml`, `log.yaml`, `PROGRESS.md`, continuation files, compact views, and runtime event streams.
- Chat, transcript, raw tool output, hidden reasoning, scratchpads, and session-provider artifacts.
- Prompts other than C21 M5-M8; reports and reviews outside the inventory above; intermediate audit, test, implementation, and worker evidence.
- Tests, fixtures, production source, generated adapters, package metadata, Git diffs, and live workspace contents.
- Existing or proposed Record Store files, indexes, manifest, Runtime, Capsules, Packs, Snapshots, Receipts, migration staging, and rollback data.
- Secrets, credential values, private absolute paths, environment values, and unreviewed personal material.

## Machine-readable Candidate Array

```json
[
  {
    "key": "c21-current-skill-first-single-authority",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "The confirmed architecture defines a Skill-first protocol, one authority per fact, deterministic Core ownership of mechanical state, projection-only adapters, local runtime/memory, Git-eligible accepted or checkpoint Snapshots, and fail-closed manifest selection. Material future-decision risk: Without this boundary, a future implementation could turn Hypo-Workflow into a runner, duplicate authority across files, or let platform adapters own state."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
        "locator": ".pipeline/reports/C21-unified-architecture-design.md",
        "digest": "sha256:a833151c2e9f4a95e250f2c9af46645ea3b735fea92b1da9bc9c02080a96b196"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/architecture.md#Product Boundary; Physical Layout",
        "locator": ".pipeline/architecture.md",
        "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "decision",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
          "locator": ".pipeline/reports/C21-unified-architecture-design.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/architecture.md#Product Boundary; Physical Layout",
          "locator": ".pipeline/architecture.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:architecture:skill-first-single-authority",
      "created_at": "2026-07-11T20:24:08+08:00",
      "updated_at": "2026-07-11T20:24:08+08:00",
      "supersedes": [],
      "body": "Hypo-Workflow is a Skill-first protocol and control layer, not a runner. The host Agent performs reasoning, implementation, testing, and review; deterministic Core owns schema, transactions, Records, Receipts, recovery, lifecycle transitions, adapter payloads, and mechanical gates. Every fact has one authority. Platform adapters only project behavior. Runtime and memory are local/ignored; accepted or explicit checkpoint Snapshots may enter Git. A valid new manifest selects the new writer, while a damaged manifest fails closed and never falls back to legacy writers."
    }
  },
  {
    "key": "c21-current-delivery-lifecycle-manual-acceptance",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "Goal and Cycle are peer Main Deliveries; Goal has one Design, Cycle has ordered Milestones and one final manual acceptance gate, Maintain is ambient, approval and start are distinct, and directional feedback enters needs_revision. Material future-decision risk: Without this contract, Goal could be modeled as a fake Cycle, Milestones could gain duplicate acceptance gates, or feedback could trigger unauthorized edits."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/reports/C21-unified-architecture-design.md#对象模型; Delivery 生命周期; 端到端场景",
        "locator": ".pipeline/reports/C21-unified-architecture-design.md",
        "digest": "sha256:a833151c2e9f4a95e250f2c9af46645ea3b735fea92b1da9bc9c02080a96b196"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/cycle.yaml#cycle.acceptance; cycle.lifecycle_policy",
        "locator": ".pipeline/cycle.yaml",
        "digest": "sha256:ff3f4ab3df02073182453f03d6f95a84d287e684a1d2714484a8a21b0f6def98"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "decision",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/reports/C21-unified-architecture-design.md#对象模型; Delivery 生命周期; 端到端场景",
          "locator": ".pipeline/reports/C21-unified-architecture-design.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/cycle.yaml#cycle.acceptance; cycle.lifecycle_policy",
          "locator": ".pipeline/cycle.yaml"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:delivery:peer-kinds-explicit-start-manual-acceptance",
      "created_at": "2026-07-11T20:24:08+08:00",
      "updated_at": "2026-07-12T03:58:45+08:00",
      "supersedes": [],
      "body": "Goal and Cycle are peer Main Delivery kinds. A Goal has one Design contract and no user-visible Milestone sequence. A Cycle has ordered Milestones, whose normal completion is internal verification, and one final Cycle-level manual acceptance gate. Maintain is ambient and does not occupy an activity pointer. Approval creates waiting_to_start; only explicit start intent begins implementation. Direction-changing feedback creates needs_revision and a revised proposal, not editing authorization. Successful Delivery ends only after a scoped acceptance Receipt."
    }
  },
  {
    "key": "c21-current-nine-command-surface",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "The confirmed C21 public/contextual surface contains exactly nine commands; natural/internal, deferred, and removal-candidate capabilities must not be advertised as current backends. Material future-decision risk: Without the exposure contract, legacy generators could advertise removed or unimplemented capabilities and recreate the command sprawl C21 is intended to remove."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/architecture.md#Command Exposure",
        "locator": ".pipeline/architecture.md",
        "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Requirements; Audit Focus",
        "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md",
        "digest": "sha256:4c56d9c91289fa119f763bee29a057cf4ea2af205f8eed2ca4ecf0d13884239c"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "decision",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/architecture.md#Command Exposure",
          "locator": ".pipeline/architecture.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Requirements; Audit Focus",
          "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:commands:c21-nine-command-public-surface",
      "created_at": "2026-07-11T20:24:08+08:00",
      "updated_at": "2026-07-11T20:24:08+08:00",
      "supersedes": [],
      "body": "C21 public/contextual discovery must contain exactly: /hw:guide, /hw:init, /hw:goal, /hw:plan, /hw:cycle, /hw:maintain, /hw:resume, /hw:accept, and /hw:reject. Chat, Explain, Status, Report, Log, Check, Compact, Knowledge, consistency Sync, Debug, explicit start, and Plan phases are natural/internal behavior. Setup, Rules, Stop command, Skip, Reset, Showcase, Patch, Help, Watchdog, and plan-confirm are removal candidates subject to M8's dependency rescan and deletion gate. Deferred or removal-candidate capabilities must not be presented as current executable backends."
    }
  },
  {
    "key": "c21-current-risk-based-worker-separation",
    "source_class": "cross_cycle_constraint",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "Material work requires role separation; small reversible work may be solo-verified only when policy selects it; migration additionally separates Extractor, Curator, Auditor, and deterministic writer authority. Material future-decision risk: Without this policy, material work could silently collapse test, implementation, and audit into one self-reviewing identity, while trivial changes could be over-orchestrated."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/architecture.md#Worker Separation; Bootstrap Cutover",
        "locator": ".pipeline/architecture.md",
        "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Requirements; Technical Route item 8",
        "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md",
        "digest": "sha256:4c56d9c91289fa119f763bee29a057cf4ea2af205f8eed2ca4ecf0d13884239c"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "requirement",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/architecture.md#Worker Separation; Bootstrap Cutover",
          "locator": ".pipeline/architecture.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Requirements; Technical Route item 8",
          "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:execution:risk-based-worker-separation",
      "created_at": "2026-07-11T20:24:08+08:00",
      "updated_at": "2026-07-11T20:39:36+08:00",
      "supersedes": [],
      "body": "Use separated test, implementation, and audit identities for material work, and never silently downgrade a prompt that requires separation. Small reversible changes may use solo-verified only when the policy explicitly selects it. Migration uses read-only Extractors, a proposal-only Curator, an independent Auditor, and one deterministic writer; proposal workers cannot write authoritative Records."
    }
  },
  {
    "key": "c21-current-recovery-journal-capsule-pack",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "The confirmed recovery design uses explicit Journal summaries, derived Capsules, validated Packs and fallback; it excludes hidden reasoning, treats transcripts as optional convenience, and keeps telemetry as a later aggregation concern. Material future-decision risk: Without the recovery boundary, future compact/resume work could depend on unstable transcripts, persist secrets, or let a derived Capsule overwrite authority."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/reports/C21-recovery-journal-compaction-design.md#核心判断; Recovery Journal; Incremental Context Capsule; Recovery Pack; 存储与隐私",
        "locator": ".pipeline/reports/C21-recovery-journal-compaction-design.md",
        "digest": "sha256:c6c1c111745827db005ce0ddc88b45587a64c205fcfabee024211f42814281ec"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/architecture.md#Recovery Flow",
        "locator": ".pipeline/architecture.md",
        "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "decision",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/reports/C21-recovery-journal-compaction-design.md#核心判断; Recovery Journal; Incremental Context Capsule; Recovery Pack; 存储与隐私",
          "locator": ".pipeline/reports/C21-recovery-journal-compaction-design.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/architecture.md#Recovery Flow",
          "locator": ".pipeline/architecture.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:recovery:journal-capsule-pack-authority",
      "created_at": "2026-07-11T20:49:59+08:00",
      "updated_at": "2026-07-11T20:49:59+08:00",
      "supersedes": [],
      "body": "Recovery uses an append-only object Journal of explicit rationale/evidence summaries, a derived and rebuildable Context Capsule, and a validated Recovery Pack with cursor, hashes, continuation, relevant Records, evidence, and bounded recent context. Hidden chain-of-thought, scratchpads, raw transcripts, and secret values never become authority. Transcript input is optional convenience only. If the newest Pack is invalid, restore a valid ancestor and replay the required Journal delta. Detailed recovery data stays local/ignored; future telemetry may aggregate redacted events but cannot change recovery correctness semantics."
    }
  },
  {
    "key": "c21-current-m1-accepted-kernel-baseline",
    "source_class": "accepted_outcome",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "M1 delivered canonical serialization, six-class zero-write detection, recoverable manifest-last transactions and a 22-family legacy writer fence; final audit passed after adversarial revisions. Material future-decision risk: Without the accepted M1 baseline, downstream work could create a second mutation primitive, bypass the 22-family fence, or assume unimplemented cross-process durability."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md#Completion Narrative; Delivered Architecture; Test Results",
        "locator": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md",
        "digest": "sha256:66ef1909b4e7b399e3bd9a813ec46e226bbeeb68960413f79eced1737906b77f"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/reviews/C21/M1/final-audit.md#Conclusion; Closure Matrix; Residual risk",
        "locator": ".pipeline/reviews/C21/M1/final-audit.md",
        "digest": "sha256:cd2e934e13cd537c686c53c064e564adcc330522622f5783d2954177cf039fff"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "decision",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md#Completion Narrative; Delivered Architecture; Test Results",
          "locator": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/reviews/C21/M1/final-audit.md#Conclusion; Closure Matrix; Residual risk",
          "locator": ".pipeline/reviews/C21/M1/final-audit.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:c21:m1-accepted-kernel-baseline",
      "created_at": "2026-07-12T00:21:05+08:00",
      "updated_at": "2026-07-12T00:21:05+08:00",
      "supersedes": [],
      "body": "C21-M1 is accepted with final audit PASS. It delivered canonical YAML/frontmatter/hashing, six-class zero-write workspace detection, recoverable manifest-last transactions with staged/target hash validation and deterministic recovery, and a central fence covering 22 project mutation families. Final validation was focused 76/76 and full 752/752. Non-blocking limits remain: no cross-process transaction lock, no fsync-backed marker durability, and no generic typed path-ownership guarantee beyond the certified writer inventory."
    }
  },
  {
    "key": "c21-current-m2-accepted-authority-baseline",
    "source_class": "accepted_outcome",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "M2 certified object Runtime/Continuation, individual Record authority, derived indexes, scoped single-use Receipts and portable content-bound Snapshots; re-audit closed all seven findings. Material future-decision risk: Without the accepted M2 baseline, later code could duplicate lifecycle facts in active pointers, let indexes arbitrate facts, or use unscoped/replayable approval flags."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
        "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md",
        "digest": "sha256:49e3b2c2e98a5610b280c3ae08bf83a9197976f4c6fc89857b5495decbb31e39"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/reviews/C21/M2/reaudit.md#Conclusion; Closure Matrix; Residual Risks",
        "locator": ".pipeline/reviews/C21/M2/reaudit.md",
        "digest": "sha256:3274ba2d3823be6b9ab59cf5eda7c5e9badea643deab206c5e336abeaad93830"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "decision",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
          "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/reviews/C21/M2/reaudit.md#Conclusion; Closure Matrix; Residual Risks",
          "locator": ".pipeline/reviews/C21/M2/reaudit.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:c21:m2-accepted-authority-baseline",
      "created_at": "2026-07-12T02:42:16+08:00",
      "updated_at": "2026-07-12T02:42:16+08:00",
      "supersedes": [],
      "body": "C21-M2 is accepted with fresh re-audit PASS and no findings. It delivered reference-only active pointers; object Runtime and Continuation; one-fact-per-file requirement, preference, decision, and feedback Records with explicit supersedes; derived indexes that fail closed unless each dedupe key has exactly one active leaf; scoped single-use Receipt state machines using host or captured Clock; and portable, content-bound accepted/checkpoint Snapshots. Final validation was focused 61/61, targeted 21/21, and full 813/813. Same-process Receipt reservation is not a cross-process lease, secret detection is a finite corpus, and Snapshot retention remains later work."
    }
  },
  {
    "key": "c21-current-m3-accepted-recovery-baseline",
    "source_class": "accepted_outcome",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "M3 certified partitioned Journal, redaction-first blobs, derived Capsules, sealed ancestry-linked Packs, bounded restore and deterministic retention; final audit closed six findings. Material future-decision risk: Without the accepted M3 baseline, later Resume or Hook work could recreate transcript authority, corrupt cursor semantics, or weaken Pack and retention integrity."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md#Completion Narrative; Delivered Architecture; Architecture Plan Review",
        "locator": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md",
        "digest": "sha256:e5c90d68c4ffb237d9091d4d1e8cbf646742c7a48f9063a84b27a67814edbc41"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/reviews/C21/M3/final-audit.md#Conclusion; First-Audit Closure Matrix; Residual Risks",
        "locator": ".pipeline/reviews/C21/M3/final-audit.md",
        "digest": "sha256:7de84349e0bba5b062dff1f676459e4d10f990237fbfc1b9d57b80bc7ebdc31e"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "decision",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md#Completion Narrative; Delivered Architecture; Architecture Plan Review",
          "locator": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/reviews/C21/M3/final-audit.md#Conclusion; First-Audit Closure Matrix; Residual Risks",
          "locator": ".pipeline/reviews/C21/M3/final-audit.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:c21:m3-accepted-recovery-baseline",
      "created_at": "2026-07-12T04:32:18+08:00",
      "updated_at": "2026-07-12T04:32:18+08:00",
      "supersedes": [],
      "body": "C21-M3 is accepted with final independent audit PASS and no findings. It delivered object/session/writer-partitioned segmented Journal streams with vector cursors, redaction-first content-addressed blobs, derived Capsules with byte-identical incremental/full rebuild, sealed ancestry-linked Recovery Packs, bounded restore with corrupt-head fallback, and drift-bound deterministic retention. Final validation was focused 47/47 and full 860/860. Locks remain process-local, durability inherits filesystem limits, secret recognition is bounded, Capsule hashes are integrity rather than keyed authenticity, and retention has no cross-process lock across final check and removal."
    }
  },
  {
    "key": "c21-current-m4-accepted-init-router-baseline",
    "source_class": "accepted_outcome",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "M4 certified manifest-last Init for empty/brownfield, read-only Legacy inspection, bounded Adoption Brief and availability-aware Root/Init/Guide routing; final discovery is only Guide and Init at this stage. Material future-decision risk: Without the accepted M4 baseline, later work could silently migrate legacy workspaces, trust unsafe paths, or confuse the 53-file legacy inventory with current capability discovery."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/reports/03-init-workspace-adoption-and-minimal-skill-router.report.md#Completion Narrative; Delivered Architecture; Architecture Plan Review",
        "locator": ".pipeline/reports/03-init-workspace-adoption-and-minimal-skill-router.report.md",
        "digest": "sha256:741089e7a5611f81d301e4638cfab2683570073038121e011cc13e99c019200a"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/reviews/C21/M4/final-audit.md#结论; 通过的功能与架构边界; Residual Risks",
        "locator": ".pipeline/reviews/C21/M4/final-audit.md",
        "digest": "sha256:70722191ebad4f041a844a757694a904aae1b74c78ff1f5c86478068d40a88e3"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "decision",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/reports/03-init-workspace-adoption-and-minimal-skill-router.report.md#Completion Narrative; Delivered Architecture; Architecture Plan Review",
          "locator": ".pipeline/reports/03-init-workspace-adoption-and-minimal-skill-router.report.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/reviews/C21/M4/final-audit.md#结论; 通过的功能与架构边界; Residual Risks",
          "locator": ".pipeline/reviews/C21/M4/final-audit.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:c21:m4-accepted-init-router-baseline",
      "created_at": "2026-07-12T06:32:43+08:00",
      "updated_at": "2026-07-12T06:32:43+08:00",
      "supersedes": [],
      "body": "C21-M4 is accepted with final independent audit PASS and no findings. It delivered manifest-last Init for empty and unmanaged Brownfield repositories, one no-input outcome Ask, bounded evidence-backed Adoption Briefs, raw read-only Legacy inspection, and availability-aware Root/Init/Guide routing with non-symlink trust anchors. Final validation was focused 44/44 and full 904/904; command layers were 54 canonical, 53 legacy inventory, and 2 currently discoverable, with 0 Skill-quality issues across 45 Skills. Raw Legacy evidence remains proposal input only, filesystem scans and secret detection are bounded, and the 53-entry compatibility inventory must remain hidden behind filtered discovery until M8."
    }
  },
  {
    "key": "c21-current-m5-reference-bootstrap-cutover",
    "source_class": "active_requirement",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "M5 is an internal reference-repository Bootstrap Job: bounded proposals, curation and independent audit precede one deterministic writer, staging and manifest-last activation, legacy freeze, rollback checkpoint, and fresh-process Pack restore. Material future-decision risk: Without the M5 invariant, migration workers could write authority, the live repository could dual-write schemas, legacy history could be copied wholesale, or C21 could resume on the wrong next route."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/prompts/04-reference-repository-bootstrap-and-schema-activation.md#Objective; Requirements; Technical Route; Audit Focus",
        "locator": ".pipeline/prompts/04-reference-repository-bootstrap-and-schema-activation.md",
        "digest": "sha256:7c958157bcc73b59e5716786caec3a9ffefb3ba33af08026251d6c1cfdeb198d"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#兼容策略; Bootstrap 顺序; 本仓库历史提炼; 激活本仓库",
        "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
        "digest": "sha256:887400607034b2c01edbac1e85f408f83352d426996b8657ee5f041cd4ed7224"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "requirement",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/prompts/04-reference-repository-bootstrap-and-schema-activation.md#Objective; Requirements; Technical Route; Audit Focus",
          "locator": ".pipeline/prompts/04-reference-repository-bootstrap-and-schema-activation.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#兼容策略; Bootstrap 顺序; 本仓库历史提炼; 激活本仓库",
          "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:c21:m5-reference-bootstrap-cutover-contract",
      "created_at": "2026-07-11T20:39:36+08:00",
      "updated_at": "2026-07-11T20:39:36+08:00",
      "supersedes": [],
      "body": "C21-M5 converts only history whose absence could materially change a future decision. It is an internal Bootstrap Job for this repository, not a public migration command. Extractors, Curator, and Auditor produce proposals only; an independent audit checks coverage, inference, schema, sources, and privacy; one deterministic writer owns IDs, dedupe, supersedes compilation, indexes, staging, Capsule, Pack, Snapshot, and activation. Activate the manifest last, freeze all legacy writers, retain a usable rollback checkpoint until the Bootstrap checkpoint is accepted, resume C21 in a fresh process from a valid Pack, prove all post-activation writes use only new zones, and prove legacy state.yaml, cycle.yaml, and log.yaml are unchanged. Do not import raw chat/tool logs/secrets, delete tracked legacy files, dual-write, or migrate arbitrary repositories. Derive only a redacted fixed CI fixture from the reference workspace."
    }
  },
  {
    "key": "c21-current-m6-goal-cycle-adaptive-plan-route",
    "source_class": "current_cycle_context",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "M6 is explicitly Goal/Cycle Delivery Core with adaptive Plan, explicit start, Resume, scoped acceptance/rejection and role evidence; Maintain and Hooks are out of scope until M7. Material future-decision risk: Without the exact M6 route, work could jump directly to Maintain/Hooks, omit Goal, remove weaker-model planning phases, retain fixed question quotas, or auto-start after approval or feedback."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Objective; Requirements; Boundaries; Technical Route",
        "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md",
        "digest": "sha256:4c56d9c91289fa119f763bee29a057cf4ea2af205f8eed2ca4ecf0d13884239c"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/architecture.md#Delivery Lifecycle; Command Exposure",
        "locator": ".pipeline/architecture.md",
        "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "requirement",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Objective; Requirements; Boundaries; Technical Route",
          "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/architecture.md#Delivery Lifecycle; Command Exposure",
          "locator": ".pipeline/architecture.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:c21:m6-goal-cycle-adaptive-plan-route",
      "created_at": "2026-07-11T20:24:08+08:00",
      "updated_at": "2026-07-11T20:24:08+08:00",
      "supersedes": [],
      "body": "C21-M6 must implement Goal and Cycle as peer Delivery kinds, adaptive planning, explicit start, separated execution, verification, Resume, manual Accept/Reject and the exact nine-command surface. Goal uses one Design. Cycle uses ordered Milestones and one final acceptance. Plan depth is evidence-driven: concise Goal Design, standard named Discover/Technical Stack/Architecture/Decompose/Generate phases for weaker models or complex work, and internal Deep Plan when durable research is needed. Remove fixed min_rounds; stop asking when material ambiguity is resolved. Approval only creates waiting_to_start, and directional feedback only creates needs_revision until the user explicitly starts the revised work. Maintain and Codex Hooks are not M6 scope."
    }
  },
  {
    "key": "c21-current-m7-maintain-codex-hook-route",
    "source_class": "current_cycle_context",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "M7 is Ambient Maintain plus the Codex Hook adapter, targeted reminders, recorder proposals, compact recovery and controlled deletion; OpenCode/Claude and telemetry remain out of scope. Material future-decision risk: Without the exact M7 boundary, Maintain could become another state machine, Hooks could fabricate authority, deletion could rely on incomplete interception, or unsupported platforms could be claimed."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md#Objective; Requirements; Boundaries; Technical Solution",
        "locator": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md",
        "digest": "sha256:3378b14eb346eba879b0d0db69a3e3306ddd39ca143f37692e7cae3d392299db"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/architecture.md#Codex Adapter Boundary",
        "locator": ".pipeline/architecture.md",
        "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "requirement",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md#Objective; Requirements; Boundaries; Technical Solution",
          "locator": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/architecture.md#Codex Adapter Boundary",
          "locator": ".pipeline/architecture.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:c21:m7-maintain-codex-hook-route",
      "created_at": "2026-07-11T20:49:59+08:00",
      "updated_at": "2026-07-11T20:49:59+08:00",
      "supersedes": [],
      "body": "C21-M7 implements ambient Maintain and the primary Codex adapter. Maintain records meaningful Journal/Inbox/Record deltas without taking a workflow pointer; optional cheap recorder workers return proposals only. Thin adapters cover SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SubagentStart, SubagentStop, and Stop; they inject bounded context, collect evidence, seal/restore Packs, and emit targeted deduplicated documentation/Record reminders. Hooks never infer authority or become the sole deletion boundary. Deletion requires a hashed Manifest, scoped Receipt, controlled executor and drift revalidation. OpenCode/Claude adapters, aggregate telemetry, cleanup execution, generic scheduling, and quota automation are out of M7 scope."
    }
  },
  {
    "key": "c21-current-m8-cleanup-deletion-gate-route",
    "source_class": "current_cycle_context",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "M8 owns post-M7 rescan, candidate classification, complete Deletion Manifest, fresh exact deletion Receipt, controlled batch, regeneration non-revival, evaluations, full regression and final audit; the prompt itself does not authorize deletion. Material future-decision risk: Without this exact gate, stale deletion candidates could be executed, user authorization could be inferred from the Cycle, or generators could revive removed surfaces after cleanup."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/prompts/07-surface-cleanup-deletion-gate-and-release-ready-regression.md#Objective; Hard Gate; Requirements; Technical Route",
        "locator": ".pipeline/prompts/07-surface-cleanup-deletion-gate-and-release-ready-regression.md",
        "digest": "sha256:e07ca324a409436f6e540709b1fbb88f287e20945762ed50a88f4b254328de6c"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#仓库清理",
        "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
        "digest": "sha256:887400607034b2c01edbac1e85f408f83352d426996b8657ee5f041cd4ed7224"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "requirement",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/prompts/07-surface-cleanup-deletion-gate-and-release-ready-regression.md#Objective; Hard Gate; Requirements; Technical Route",
          "locator": ".pipeline/prompts/07-surface-cleanup-deletion-gate-and-release-ready-regression.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#仓库清理",
          "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:c21:m8-cleanup-deletion-gate-route",
      "created_at": "2026-07-11T20:39:36+08:00",
      "updated_at": "2026-07-11T20:39:36+08:00",
      "supersedes": [],
      "body": "C21-M8 starts only after M7 by rescanning the live dependency graph and classifying each candidate as delete, retain_internal, or deferred_hidden. It may generate the complete Deletion Manifest but may not delete anything until the full decision context is shown in chat and the user issues a fresh exact deletion.execute Receipt. Any path hash or relevant Git-state drift invalidates the Receipt. The controlled batch must remove registry/generator sources before derived artifacts, prove regeneration cannot revive removed or deferred surfaces, preserve unrelated changes, update the Codex-facing package/docs, run behavior-based Skill evaluations and full regression, and finish with independent audit. C21 itself still closes through manual acceptance after M8; no Deletion Manifest approval can be inferred from general Cycle authorization."
    }
  },
  {
    "key": "c21-current-deferred-roadmap",
    "source_class": "current_cycle_context",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "The confirmed scope defers non-Codex adapters, Stash, experiments, telemetry and advanced command redesign, and does not currently plan Dashboard/TUI/general automation; experiment management precedes telemetry. Material future-decision risk: Without the deferred map, C21 could expand indefinitely, claim unsupported adapters, delete reusable hidden code, or prioritize telemetry over the already chosen experiment-management work."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#后续 Cycle; 当前版本目标; 兼容策略",
        "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
        "digest": "sha256:887400607034b2c01edbac1e85f408f83352d426996b8657ee5f041cd4ed7224"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/architecture.md#Deferred Scope",
        "locator": ".pipeline/architecture.md",
        "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "decision",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#后续 Cycle; 当前版本目标; 兼容策略",
          "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/architecture.md#Deferred Scope",
          "locator": ".pipeline/architecture.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:roadmap:c21-deferred-scope",
      "created_at": "2026-07-11T20:39:36+08:00",
      "updated_at": "2026-07-11T20:39:36+08:00",
      "supersedes": [],
      "body": "After C21, prioritize OpenCode adaptation, then Claude Code/other adapters, Workflow Stash/Suspend/Pop, and experiment project management; experiment management is more important than telemetry. Aggregate telemetry and the Docs/PR/Release redesign come later. Dashboard, TUI, and generic Automation Jobs are not currently planned. If one future automation capability is chosen, prefer Codex quota-recovery scheduled follow-up from a saved continuation rather than building a generic scheduler. In C21, deferred Analysis/Audit/Quality/Explore/Docs/PR/Release/Optimize capabilities stay non-discoverable and zero-write; permanent removal candidates wait for M8's approved Manifest."
    }
  },
  {
    "key": "c21-current-stash-git-snapshot-draft",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": false,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "The confirmed Stash report explicitly identifies and replaces the early proposal to save and restore a Git workspace snapshot. Material future-decision risk: Omitting the superseded draft would make the active Stash contract's explicit replacement edge impossible to reconstruct and could reintroduce code snapshot semantics."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md#状态: 取代",
        "locator": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md",
        "digest": "sha256:e68db327b0b432f87292aec63b5211d07309424509336e7c13b4252df75444e4"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "decision",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md#状态: 取代",
          "locator": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:stash:implementation-model",
      "created_at": "2026-07-11T20:09:41+08:00",
      "updated_at": "2026-07-11T20:09:41+08:00",
      "supersedes": [],
      "body": "Historical, superseded C21 draft: implement Workflow Stash by saving a Git workspace snapshot and restoring it later. This is not current and must not guide implementation."
    }
  },
  {
    "key": "c21-current-stash-suspend-reconciliation",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "The confirmed deferred design defines Stash as Checkpoint plus Suspension plus Blocking Delivery plus forward Reconciliation, with adaptive/strict conflict policy and no code snapshot. Material future-decision risk: Without this accepted replacement, later Stash implementation could call git stash, overwrite an accepted new baseline, discard conflicts, or pretend state-only suspension protects dirty code."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md#已确认的产品模型; push 记录什么; pop 语义; 冲突策略",
        "locator": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md",
        "digest": "sha256:e68db327b0b432f87292aec63b5211d07309424509336e7c13b4252df75444e4"
      }
    ],
    "supersedes": [
      "c21-current-stash-git-snapshot-draft"
    ],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "decision",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md#已确认的产品模型; push 记录什么; pop 语义; 冲突策略",
          "locator": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md"
        }
      ],
      "confidence": "high",
      "dedupe_key": "project:stash:implementation-model",
      "created_at": "2026-07-11T20:09:41+08:00",
      "updated_at": "2026-07-11T20:09:41+08:00",
      "supersedes": [],
      "body": "The deferred Workflow Stash model is Checkpoint + Suspend + Blocking Delivery + Reconciliation, not git stash or a code snapshot. Push records Workflow contracts, evidence, remaining work, blocker, resume condition, HEAD and dirty paths while leaving the worktree in place and warning about overlap risk. Pop waits for the blocker condition, reads the accepted new baseline, creates a Resume Merge Plan, reconciles old assumptions forward, updates affected Milestones and verification, and preserves history. Adaptive mode auto-resolves only low-ambiguity mappings and asks on semantic conflict; strict mode requires approval for every contract difference. Failed reconciliation remains recoverable rather than pretending restoration succeeded."
    }
  }
]
```

## Coverage Notes

- Approved global design and constraints: candidates 1-5.
- Accepted M1-M4 outcomes: candidates 6-9.
- Current M5 objective and activation invariant: candidate 10.
- Exact next route: M6 candidate 11, M7 candidate 12, M8 candidate 13.
- Manual acceptance and explicit-start boundary: candidate 2, reinforced by candidates 11 and 13.
- Deletion gate: candidate 13; no deletion authorization is created by this proposal.
- Deferred scope: candidate 14; the confirmed Stash design and its explicit supersedes edge are candidates 15-16.

## Scan Result

- Secret/credential-value matches: `0`
- Private absolute-path matches: `0`
- Total sensitive matches: `0`

The scan excludes declared SHA-256 evidence digests from secret classification; they are integrity metadata, not credential material.
