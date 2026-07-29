# C21-M5 Extractor Proposal: C17-C20

## Scope and method

- Role: read-only legacy Extractor.
- Archive window: C17-C20.
- Selection rule: retain only facts whose absence could materially change a future architecture, delivery, adapter, release, or recovery decision.
- Authority boundary: this file contains proposals only. It does not assign Record IDs, update indexes, activate a manifest, or write any Record Store authority.
- Review meaning: `reviewed=true` means this Extractor checked the cited source and digest for the stated support. Acceptance and activation semantics remain separate in `source_class` and `current`.
- Current meaning: `current=true` means no later allowed C17-C20 source supersedes the fact. `current=history_needed` preserves a historical authority that C21 must explicitly reconcile before activation.
- Eligibility meaning: all retained candidates have `future_decision_risk=material` and use only the six production Bootstrap source-class enums.

## Source inventory

| Cycle | Source | SHA-256 |
|---|---|---|
| C17 | `.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml` | `bc22dc7799198efb7371915bbd323eacd7cc56667f71529547995e0c1ca71cb0` |
| C17 | `.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md` | `8ae34a8eaa0a12f079a5ab76d66c8ec8a8b5f795459666bfd2d9f5b6831c761d` |
| C17 | `.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/knowledge-summary.md` | `e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177` |
| C18 | `.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml` | `679f77b75be9095f5be174c41754ad89bd2196dd80538fe3eddfba671aa3a662` |
| C18 | `.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md` | `6914f34b3d608a1e6c1573b40f7dfb875c30fa5f71bc66067069107fd78339a3` |
| C18 | `.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/knowledge-summary.md` | `e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177` |
| C19 | `.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml` | `1c00713e7b2e0948fb165327d752e9e4153eea5bed42b7f2a57f61b7f237fb7d` |
| C19 | `.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md` | `2aed4c2e87f9c92487a5629685f9e5dd4f66b28047a0453ead877badae9bcfc4` |
| C19 | `.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/knowledge-summary.md` | `e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177` |
| C20 | `.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml` | `c2052da28e5f4c1000a35f1f09f0c937302ac37b68efbcfcf7ac4142cea2a411` |
| C20 | `.pipeline/archives/C20-consultation-first-action-boundary/summary.md` | `504d3c23c8f4b27ddb605111f56420f0d43eb62f8b3963c3aff0e11bf5a2336d` |
| C20 | `.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md` | `e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177` |

The four `knowledge-summary.md` files are byte-identical. Their repeated entries are treated as one latest-observed compact source, not four independent confirmations.

## Excluded sources and rationale

- Excluded all architecture snapshots, archived and current `state.yaml`, `log.yaml`, `PROGRESS.md`, prompts, per-Milestone reports, reviews, chats, transcripts, tool logs, and current production/test files. They are outside the bounded Extractor source contract and would introduce raw narrative, implementation detail, or role leakage.
- Excluded detailed test counts, local dirty-worktree notes, backup branch names, release URLs, and transient authentication/toolchain failures. They describe point-in-time execution evidence rather than durable decision context; the C18 push failure is also superseded by later successful C19/C20 publication outcomes.
- Excluded duplicated milestone narration already represented by a narrower accepted decision or outcome below.
- Excluded any secret-like value, user-home path, credential, raw conversation, and private payload.

## Typed Record Patch candidates

```json
[
  {
    "key": "c17-c20.architecture.portable-core-boundaries",
    "source_class": "accepted_outcome",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C17 was accepted after replacing hard-coded paths and broad workspace authority with portable configuration, explicit module boundaries, and a durable ledger authority; C18-C20 do not reverse those choices."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml#cycle.summary and cycle.acceptance",
        "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml",
        "digest": "sha256:bc22dc7799198efb7371915bbd323eacd7cc56667f71529547995e0c1ca71cb0"
      },
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md#Milestone 摘要, 关键结果, and 完成说明",
        "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md",
        "digest": "sha256:8ae34a8eaa0a12f079a5ab76d66c8ec8a8b5f795459666bfd2d9f5b6831c761d"
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
          "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml#cycle.summary and cycle.acceptance",
          "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml"
        },
        {
          "type": "legacy_file",
          "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md#Milestone 摘要, 关键结果, and 完成说明",
          "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md"
        }
      ],
      "confidence": 0.99,
      "dedupe_key": "project:hypo-workflow:decision:portable-core-boundaries",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Accepted architecture baseline.** Keep a repository-root test entry, shared utilities, layered configuration instead of user-specific paths or seeds, consistent YAML behavior through `js-yaml`, separated workspace authorities, an append-only JSONL long-term ledger, and an explicit public export surface. Rejoining these responsibilities or reintroducing hard-coded user paths requires an explicit architecture decision."
    }
  },
  {
    "key": "c17-c20.audit.source-id-closure-matrix",
    "source_class": "cross_cycle_constraint",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C17 records this as the durable lesson for future audit-remediation work, and no later allowed source replaces it."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml#cycle.lessons",
        "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml",
        "digest": "sha256:bc22dc7799198efb7371915bbd323eacd7cc56667f71529547995e0c1ca71cb0"
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
          "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml#cycle.lessons",
          "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml"
        }
      ],
      "confidence": 0.99,
      "dedupe_key": "project:hypo-workflow:decision:audit-source-id-closure-matrix",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Audit-remediation discipline.** Maintain a source-ID closure matrix from finding to evidence, and classify broad-detector residuals separately from release blockers. A residual match is not automatically a failed release gate, but its classification must be explicit and reviewable."
    }
  },
  {
    "key": "c17-c20.debt.unresolved-architecture-quality-followups",
    "source_class": "important_feedback_failure",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C17 explicitly leaves four non-blocking follow-up candidates; none of the allowed C18-C20 summaries claims that these exact items were closed."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md#关键结果 and 风险/后续",
        "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md",
        "digest": "sha256:8ae34a8eaa0a12f079a5ab76d66c8ec8a8b5f795459666bfd2d9f5b6831c761d"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "feedback",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md#关键结果 and 风险/后续",
          "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md"
        }
      ],
      "confidence": 0.9,
      "dedupe_key": "project:hypo-workflow:feedback:c17-unresolved-architecture-quality-followups",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Unresolved, non-blocking follow-ups from C17.** Revalidate `ARCH-05` broader module-boundary refactoring, `QUAL-06` deep-plan file splitting, audit inventory v2, and ledger compaction performance before scheduling new architecture debt work. C17 did not classify these items as release blockers, and their present code status has not been re-audited by this Extractor."
    }
  },
  {
    "key": "c17-c20.commands.audit-quality-optimize-separation",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C18 accepted distinct contracts for Audit, Quality, and Optimize rather than treating them as one undifferentiated review command."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml#cycle.summary and cycle.acceptance",
        "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml",
        "digest": "sha256:679f77b75be9095f5be174c41754ad89bd2196dd80538fe3eddfba671aa3a662"
      },
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md#Milestone 摘要 and 关键结果",
        "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md",
        "digest": "sha256:6914f34b3d608a1e6c1573b40f7dfb875c30fa5f71bc66067069107fd78339a3"
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
          "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml#cycle.summary and cycle.acceptance",
          "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml"
        },
        {
          "type": "legacy_file",
          "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md#Milestone 摘要 and 关键结果",
          "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md"
        }
      ],
      "confidence": 0.99,
      "dedupe_key": "project:hypo-workflow:decision:audit-quality-optimize-separation",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Instruction-quality capability boundary.** Audit performs preventive engineering review, Quality produces an evidence-backed scorecard, and Optimize coordinates an Audit-plus-Quality improvement loop. Preserve the distinct report and gate contracts even if command discoverability or scheduling changes."
    }
  },
  {
    "key": "c17-c20.integration-sync.internal-release-gate",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C18 explicitly defines integration sync as a source-change development/release process rather than a user-facing Workflow command."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml#cycle.summary",
        "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml",
        "digest": "sha256:679f77b75be9095f5be174c41754ad89bd2196dd80538fe3eddfba671aa3a662"
      },
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md#C18-M4 through C18-M6 and 完成说明",
        "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md",
        "digest": "sha256:6914f34b3d608a1e6c1573b40f7dfb875c30fa5f71bc66067069107fd78339a3"
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
          "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml#cycle.summary",
          "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml"
        },
        {
          "type": "legacy_file",
          "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md#C18-M4 through C18-M6 and 完成说明",
          "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md"
        }
      ],
      "confidence": 0.99,
      "dedupe_key": "project:hypo-workflow:decision:integration-sync-internal-release-gate",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Integration-sync boundary.** Treat downstream adapter synchronization as an internal development and release gate after source changes, not as a public user command. Target adaptation must be explicitly scoped, validated in the target, and recorded on the target side."
    }
  },
  {
    "key": "c17-c20.plan.named-phases-and-visible-gates",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C19 accepted the named Plan phase sequence and made visible phase artifacts a prerequisite to user confirmation."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml#cycle.summary and cycle.lessons",
        "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml",
        "digest": "sha256:1c00713e7b2e0948fb165327d752e9e4153eea5bed42b7f2a57f61b7f237fb7d"
      },
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md#改动摘要 and Milestones C19-M1 through C19-M3",
        "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md",
        "digest": "sha256:2aed4c2e87f9c92487a5629685f9e5dd4f66b28047a0453ead877badae9bcfc4"
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
          "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml#cycle.summary and cycle.lessons",
          "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml"
        },
        {
          "type": "legacy_file",
          "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md#改动摘要 and Milestones C19-M1 through C19-M3",
          "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md"
        }
      ],
      "confidence": 1,
      "dedupe_key": "project:hypo-workflow:decision:plan-named-phases-visible-gates",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Plan contract.** Use the phase order Discover -> Technical Stack -> Architecture -> Decompose -> Generate. Before a major Ask/Question gate, show the concrete phase artifact, including the relevant summary, decisions, open questions, diagrams, milestone table, decision matrix, or dependency map. `technical-stack` and `architecture` are named phases; a standalone user-facing `plan:confirm` command is not part of the new path."
    }
  },
  {
    "key": "c17-c20.release.explicit-version-tag-and-state-checks",
    "source_class": "cross_cycle_constraint",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C19 records explicit version/tag strategy and local/remote state checks as the release lesson after adapting two target repositories."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml#cycle.lessons",
        "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml",
        "digest": "sha256:1c00713e7b2e0948fb165327d752e9e4153eea5bed42b7f2a57f61b7f237fb7d"
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
          "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml#cycle.lessons",
          "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml"
        }
      ],
      "confidence": 0.99,
      "dedupe_key": "project:hypo-workflow:decision:release-version-tag-state-gates",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Target release gate.** Decide the version and tag strategy explicitly, then inspect both local and remote repository state before pushing or publishing. A source-side completion does not by itself authorize or prove a target release."
    }
  },
  {
    "key": "c17-c20.action.consultation-first-and-concept-introduction",
    "source_class": "active_requirement",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C20 was manually accepted specifically for the consultation-first boundary and the first-use concept explanation behavior."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.summary and cycle.acceptance",
        "locator": ".pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml",
        "digest": "sha256:c2052da28e5f4c1000a35f1f09f0c937302ac37b68efbcfcf7ac4142cea2a411"
      },
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/summary.md#改动摘要 and Milestones C20-M1 through C20-M2",
        "locator": ".pipeline/archives/C20-consultation-first-action-boundary/summary.md",
        "digest": "sha256:504d3c23c8f4b27ddb605111f56420f0d43eb62f8b3963c3aff0e11bf5a2336d"
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
          "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.summary and cycle.acceptance",
          "locator": ".pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml"
        },
        {
          "type": "legacy_file",
          "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/summary.md#改动摘要 and Milestones C20-M1 through C20-M2",
          "locator": ".pipeline/archives/C20-consultation-first-action-boundary/summary.md"
        }
      ],
      "confidence": 1,
      "dedupe_key": "project:hypo-workflow:requirement:consultation-first-action-boundary",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Consultation-first action boundary.** When the user is discussing background, an idea, a complaint, a question, or a possible solution without clearly requesting direct execution, first present the concrete understanding and recommended direction, then wait for authorization before editing. A clear bounded imperative or an affirmative reply to an already displayed plan authorizes only that shown scope. Explain a new Workflow concept in one sentence on its first use."
    }
  },
  {
    "key": "c17-c20.ownership.source-managed-vs-target-owned",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C20 completed source-owned contracts and managed guidance while deliberately leaving target-owned prompt changes to separate target-local Cycles."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.summary and cycle.continuations",
        "locator": ".pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml",
        "digest": "sha256:c2052da28e5f4c1000a35f1f09f0c937302ac37b68efbcfcf7ac4142cea2a411"
      },
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/summary.md#改动摘要, C20-M4, and 风险与后续",
        "locator": ".pipeline/archives/C20-consultation-first-action-boundary/summary.md",
        "digest": "sha256:504d3c23c8f4b27ddb605111f56420f0d43eb62f8b3963c3aff0e11bf5a2336d"
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
          "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.summary and cycle.continuations",
          "locator": ".pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml"
        },
        {
          "type": "legacy_file",
          "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/summary.md#改动摘要, C20-M4, and 风险与后续",
          "locator": ".pipeline/archives/C20-consultation-first-action-boundary/summary.md"
        }
      ],
      "confidence": 0.99,
      "dedupe_key": "project:hypo-workflow:decision:source-managed-target-owned-boundary",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Source/target ownership boundary.** The Hypo-Workflow source repository may own shared behavior contracts, common guidance, managed source adapters, documentation contracts, tests, and handoff matrices. Per-model prompts, runtime prompt tuning, provider behavior, and target-local reminder wording remain target-owned and require a separately scoped target-local Cycle; source closure must not silently write them."
    }
  },
  {
    "key": "c17-c20.targets.c20-local-adaptation-continuations",
    "source_class": "current_cycle_context",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C20 records two planned target-local continuations and explicitly states that target repositories were not written in that Cycle."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.continuations",
        "locator": ".pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml",
        "digest": "sha256:c2052da28e5f4c1000a35f1f09f0c937302ac37b68efbcfcf7ac4142cea2a411"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "feedback",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.continuations",
          "locator": ".pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml"
        }
      ],
      "confidence": 0.98,
      "dedupe_key": "project:hypo-workflow:feedback:c20-target-local-continuations",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Pending target follow-up from C20.** Codex-VSP and VSP-Open-Code were each assigned a target-local continuation to consume the consultation-first source contract and decide their managed guidance versus target-owned prompt changes. C20 did not execute those target writes; verify target-local records before treating either adaptation as complete."
    }
  },
  {
    "key": "c17-c20.docs.platform-neutral-readme",
    "source_class": "cross_cycle_constraint",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "The latest allowed Knowledge Compact repeats the earlier documentation policy that the README remains platform-neutral and platform integration details stay at their own boundary."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Decisions: C8-DOC platform installation boundary",
        "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
        "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177"
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
          "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Decisions: C8-DOC platform installation boundary",
          "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md"
        }
      ],
      "confidence": 0.88,
      "dedupe_key": "project:hypo-workflow:decision:platform-neutral-readme",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Documentation boundary.** Keep the top-level README platform-neutral. Put platform installation, synchronization responsibilities, and plugin-specific behavior in the relevant platform integration surfaces rather than making one platform the project-wide default narrative."
    }
  },
  {
    "key": "c17-c20.rules.structured-authority-legacy",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": "history_needed",
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "The repeated Knowledge Compact says Structured Rules/Habits were authority and Markdown/platform instructions were derived; because C21 is redesigning this system, the old authority must be explicitly superseded rather than silently copied as current."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Decisions: C8-PLAN structured Rules/Habits authority",
        "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
        "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177"
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
          "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Decisions: C8-PLAN structured Rules/Habits authority",
          "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md"
        }
      ],
      "confidence": 0.86,
      "dedupe_key": "project:hypo-workflow:decision:legacy-structured-rules-authority",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Legacy authority requiring explicit reconciliation.** Through C20, Structured Rules/Habits were treated as authority while Markdown habits and platform instructions were derived views. The C21 replacement must explicitly preserve or supersede the underlying constraint-authority semantics; do not activate this legacy rule as-is without Curator review."
    }
  },
  {
    "key": "c17-c20.adapters.interface-map-and-hook-semantics",
    "source_class": "cross_cycle_constraint",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "The repeated Knowledge Compact identifies the cross-platform interface map as adapter-planning input and warns that Claude Code hook output depends on event and exit-code semantics."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Dependencies, Pitfalls, and Decisions: C6-SYNC interface map",
        "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
        "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177"
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
          "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Dependencies, Pitfalls, and Decisions: C6-SYNC interface map",
          "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md"
        }
      ],
      "confidence": 0.9,
      "dedupe_key": "project:hypo-workflow:decision:adapter-interface-map-hook-semantics",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Adapter planning constraint.** Start platform-adapter work from a Claude Code, OpenCode, and Codex capability/interface map rather than assuming feature parity. In particular, Claude Code hook output is event-sensitive and exit-code-sensitive, so each hook must be validated against the exact event contract and termination behavior it uses."
    }
  },
  {
    "key": "c17-c20.runtime.state-prompt-coherence-pitfall",
    "source_class": "important_feedback_failure",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "The repeated Knowledge Compact preserves a concrete failure where authoritative state advanced while prompt_state still described the previous Milestone."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Pitfalls: C4-M05 state/prompt_state drift",
        "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
        "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {
        "type": "project",
        "ref": "project:hypo-workflow"
      },
      "kind": "feedback",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Pitfalls: C4-M05 state/prompt_state drift",
          "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md"
        }
      ],
      "confidence": 0.92,
      "dedupe_key": "project:hypo-workflow:feedback:state-prompt-coherence-drift",
      "created_at": "2026-07-12T07:08:38+08:00",
      "updated_at": "2026-07-12T07:08:38+08:00",
      "supersedes": [],
      "body": "**Runtime coherence failure to prevent.** A prior Workflow advanced the authoritative Milestone state while `prompt_state` still described the previous Milestone. State transitions must update or regenerate all derived prompt/runtime pointers atomically, and resume logic must reject or repair a mismatched state/prompt pair instead of continuing from both."
    }
  }
]
```

## Scan and count

- Proposal count: **14**.
- Record Patch schema: all candidates use project scope `project:hypo-workflow`; allowed kinds only (`requirement`, `decision`, `feedback`); `body` is non-empty Markdown; caller-assigned Record IDs are absent; patch-level `supersedes` is empty for deterministic-writer compilation.
- Candidate supersedes: none justified inside this bounded C17-C20 set. The legacy Structured Rules/Habits authority is marked `current=history_needed` for explicit C21 reconciliation rather than claiming an unsupported candidate-to-candidate replacement.
- Secret scan: **PASS**. No credential/token/private-key pattern is intentionally retained.
- Path scan: **PASS**. All evidence references are repository-relative; no user-home, external target checkout, or machine-specific absolute path is retained.
