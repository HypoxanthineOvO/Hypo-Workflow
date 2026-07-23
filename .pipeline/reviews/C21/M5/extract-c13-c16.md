# C21-M5 Extractor Evidence: C13-C16

## Scope and method

- Extractor scope: archived Cycles C13-C16 only.
- Allowed inputs: each matching archive's `cycle.yaml`, `summary.md`, and `knowledge-summary.md` when present.
- Output policy: proposal-only. This file does not allocate Record IDs, write Record authority, activate a manifest, or change Workflow/runtime state.
- Selection threshold: retain only a requirement, decision, accepted outcome, or failure whose absence could materially cause a wrong future decision.
- `current`: `true` marks evidence that remains directly decision-relevant; `history_needed` marks unresolved or potentially stale history that the Curator must see before deciding whether to retain or supersede it. Neither marker is a fresh platform/runtime verification.
- `reviewed`: the Extractor checked the stated fact, provenance, locator, and digest against the allowed source. It does not mean that the originating Cycle or decision received user acceptance.

## Source inventory

| Cycle | Source | SHA-256 |
|---|---|---|
| C13 | `.pipeline/archives/C13-opencode-ux-enhancement/cycle.yaml` | `a1be3e72f3aac6a8400872644b5ff16e7b455c1925d5817be0552af5150b8269` |
| C13 | `.pipeline/archives/C13-opencode-ux-enhancement/summary.md` | `30c553b93643d19dda609c0b2a6687a93049214fe82794027f8ef80e2277977c` |
| C14 | `.pipeline/archives/C14-prompt-compatibility-audit/cycle.yaml` | `777a663378547e4fd5b7bd71595ded1f2db4df968ef12ec475c371341c63ec1a` |
| C14 | `.pipeline/archives/C14-prompt-compatibility-audit/summary.md` | `11befe836f3e4ad7a2256a775db010259466954cf0a6a8908cdc46c5c7cca505` |
| C15 | `.pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml` | `3557a2f487294bb26d020d41de5468934fcad4560e941ca5d553e508da9dc4fc` |
| C15 | `.pipeline/archives/C15-workflow-interaction-analysis-mode/knowledge-summary.md` | `e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177` |
| C15 | `.pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md` | `a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d` |
| C16 | `.pipeline/archives/C16-root-project-management-mode/cycle.yaml` | `d90f2e1c5ac3aa5cdc6a1340b820329ab8d90017f17aa1ceed2c5c0f7d0d404c` |
| C16 | `.pipeline/archives/C16-root-project-management-mode/knowledge-summary.md` | `e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177` |
| C16 | `.pipeline/archives/C16-root-project-management-mode/summary.md` | `0461a6ae961657c850fb1019fa40f097cfcec9e0eafa1b392e9e655fdb9ffb19` |

No `knowledge-summary.md` exists in the matching C13 or C14 archive.

## Evidence cautions

- C13 and C14 have lifecycle conflicts: each archived `cycle.yaml` says `active`, while its `summary.md` says `completed`. Their candidates are extractor-reviewed, but the conflict remains explicit in `support` and prevents lifecycle acceptance from being inferred.
- C14's summary says there were 24 findings, but the listed severities total 31 (`6 + 11 + 14`). No candidate preserves the contradictory count.
- C16 distinguishes delivery from acceptance: all Milestones are summarized as completed, while the Cycle remains `pending_acceptance`. No C16 feature is proposed as an accepted outcome.
- The C15 and C16 knowledge compacts are byte-identical and mostly point back to C4/C6/C8. Those inherited references are not re-proposed as C15/C16 facts.

## Excluded-source rationale

The extractor did not read architecture snapshots, archived or current `state.yaml`, logs, `PROGRESS.md`, prompts, per-Milestone reports, reviews, audits, chats, transcripts, tool logs, code, tests, current manifests, or Record Store files. These sources were excluded by the bounded assignment and because they could introduce raw/private material, duplicate narratives, implementation detail, or authority outside this extractor's provenance window.

The following allowed-source content was also intentionally not proposed:

- versions, timestamps, line counts, command totals, repository rollout counts, and test totals: useful delivery evidence, but not durable decision context;
- C13 TUI color implementation detail and deferred Metrics/collapse work: too narrow or deferred to materially govern the current core redesign;
- C14 documentation sizes and the internally inconsistent finding count;
- C15 dependency/reference entries inherited from earlier Cycles: duplicates rather than C15 decisions;
- C16's individual feature list, Notion layout details, QQ endpoint details, and daily schedule: the Cycle was never accepted, so these cannot be promoted as current requirements;
- secret references: both knowledge compacts explicitly report `n/a`, and no secret value was retained.

## Machine-readable candidate proposals

```json
[
  {
    "key": "c13-opencode-native-command-registration-contract",
    "source_class": "cross_cycle_constraint",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "direct",
      "statement": "The C13 summary records that OpenCode commands must be registered in the native opencode.json command field and cannot rely only on the plugin commandMap; lifecycle sources disagree on whether C13 is active or completed.",
      "materiality": "An OpenCode adapter that exposes commands only through an internal plugin command map can appear implemented while remaining undiscoverable or unavailable to the user."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy:C13/summary#Knowledge summary: OpenCode command registration",
        "locator": ".pipeline/archives/C13-opencode-ux-enhancement/summary.md",
        "digest": "sha256:30c553b93643d19dda609c0b2a6687a93049214fe82794027f8ef80e2277977c"
      },
      {
        "type": "legacy_file",
        "ref": "legacy:C13/cycle#cycle.status",
        "locator": ".pipeline/archives/C13-opencode-ux-enhancement/cycle.yaml",
        "digest": "sha256:a1be3e72f3aac6a8400872644b5ff16e7b455c1925d5817be0552af5150b8269"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {"type": "project", "ref": "project:hypo-workflow"},
      "kind": "requirement",
      "source_refs": [
        {"type": "legacy_file", "ref": "legacy:C13/summary#Knowledge summary: OpenCode command registration", "locator": ".pipeline/archives/C13-opencode-ux-enhancement/summary.md"},
        {"type": "legacy_file", "ref": "legacy:C13/cycle#cycle.status", "locator": ".pipeline/archives/C13-opencode-ux-enhancement/cycle.yaml"}
      ],
      "confidence": "high",
      "dedupe_key": "opencode-native-command-registration-contract",
      "created_at": "2026-05-14T23:30:00+08:00",
      "updated_at": "2026-05-14T23:30:00+08:00",
      "supersedes": [],
      "body": "When an OpenCode command surface is generated, register user-facing commands in the platform-native command configuration as well as any internal dispatch map; validate the exact current schema before applying this historical contract."
    }
  },
  {
    "key": "c14-command-tests-dynamic-and-bilingual",
    "source_class": "cross_cycle_constraint",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "direct",
      "statement": "C14 records replacing hard-coded command counts with dynamic checks and making i18n regular expressions bilingual; lifecycle sources disagree on whether C14 is active or completed.",
      "materiality": "Hard-coded command totals and monolingual text matchers turn intentional routing or localization changes into false failures, or let obsolete expectations masquerade as compatibility checks."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy:C14/summary#Key data: bilingual i18n regex and dynamic command count tests",
        "locator": ".pipeline/archives/C14-prompt-compatibility-audit/summary.md",
        "digest": "sha256:11befe836f3e4ad7a2256a775db010259466954cf0a6a8908cdc46c5c7cca505"
      },
      {
        "type": "legacy_file",
        "ref": "legacy:C14/cycle#cycle.status",
        "locator": ".pipeline/archives/C14-prompt-compatibility-audit/cycle.yaml",
        "digest": "sha256:777a663378547e4fd5b7bd71595ded1f2db4df968ef12ec475c371341c63ec1a"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {"type": "project", "ref": "project:hypo-workflow"},
      "kind": "requirement",
      "source_refs": [
        {"type": "legacy_file", "ref": "legacy:C14/summary#Key data: bilingual i18n regex and dynamic command count tests", "locator": ".pipeline/archives/C14-prompt-compatibility-audit/summary.md"},
        {"type": "legacy_file", "ref": "legacy:C14/cycle#cycle.status", "locator": ".pipeline/archives/C14-prompt-compatibility-audit/cycle.yaml"}
      ],
      "confidence": "high",
      "dedupe_key": "command-tests-dynamic-inventory-and-bilingual-output",
      "created_at": "2026-05-15T18:00:00+08:00",
      "updated_at": "2026-05-15T18:00:00+08:00",
      "supersedes": [],
      "body": "Derive expected command inventory from the authoritative registry and make user-facing matchers language-aware instead of freezing counts or one-language strings."
    }
  },
  {
    "key": "c15-p2-technical-route-review-gate",
    "source_class": "active_requirement",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "corroborated",
      "statement": "C15 completed a dedicated P2 Technical Route Gate and records the durable lesson that P2 must expose the technical route for review.",
      "materiality": "A plan can pass its gate while concealing the technical route, leaving the user unable to evaluate architecture, sequencing, or implementation risk before work starts."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy:C15/cycle#cycle.lessons: P2 technical route review",
        "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
        "digest": "sha256:3557a2f487294bb26d020d41de5468934fcad4560e941ca5d553e508da9dc4fc"
      },
      {
        "type": "legacy_file",
        "ref": "legacy:C15/summary#Milestones: C15-M1 P2 Technical Route Gate",
        "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
        "digest": "sha256:a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {"type": "project", "ref": "project:hypo-workflow"},
      "kind": "requirement",
      "source_refs": [
        {"type": "legacy_file", "ref": "legacy:C15/cycle#cycle.lessons: P2 technical route review", "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml"},
        {"type": "legacy_file", "ref": "legacy:C15/summary#Milestones: C15-M1 P2 Technical Route Gate", "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md"}
      ],
      "confidence": "high",
      "dedupe_key": "plan-gate-exposes-technical-route-before-approval",
      "created_at": "2026-05-16T12:40:46+08:00",
      "updated_at": "2026-05-16T12:40:46+08:00",
      "supersedes": [],
      "body": "Before a material Plan gate, show the proposed technical route and its decision-relevant consequences so the user's approval applies to an inspectable design rather than a label."
    }
  },
  {
    "key": "c15-completion-report-substance-contract",
    "source_class": "active_requirement",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "direct",
      "statement": "C15 completed a Detailed Completion Report Contract and reports that completion responses were made more detailed as a tested interaction contract.",
      "materiality": "If completion is represented only by an artifact path or terse status, users operating through another Agent or chat surface cannot understand, validate, or safely continue the work."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy:C15/summary#Milestones: C15-M2 Detailed Completion Report Contract",
        "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
        "digest": "sha256:a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {"type": "project", "ref": "project:hypo-workflow"},
      "kind": "requirement",
      "source_refs": [
        {"type": "legacy_file", "ref": "legacy:C15/summary#Milestones: C15-M2 Detailed Completion Report Contract", "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md"}
      ],
      "confidence": "high",
      "dedupe_key": "completion-report-substance-in-conversation",
      "created_at": "2026-05-16T12:40:46+08:00",
      "updated_at": "2026-05-16T12:40:46+08:00",
      "supersedes": [],
      "body": "A completion response must explain the change, approach, affected surfaces, validation, result, problems, and residual risks in chat; artifact paths are supporting evidence rather than the report itself."
    }
  },
  {
    "key": "c15-analysis-recoverable-first-class-lane",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "corroborated",
      "statement": "C15 completed Interactive Analysis State And Command Entry and explicitly describes /hw:analysis as a recoverable first-class entry whose main line can be recorded continuously.",
      "materiality": "Treating analysis as disposable chat loses the investigation question, evidence, conclusions, and resume point, causing repeated research or accidental implementation before a decision exists."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy:C15/cycle#cycle.summary: /hw:analysis recovery",
        "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
        "digest": "sha256:3557a2f487294bb26d020d41de5468934fcad4560e941ca5d553e508da9dc4fc"
      },
      {
        "type": "legacy_file",
        "ref": "legacy:C15/summary#Milestones: C15-M3 Interactive Analysis State And Command Entry",
        "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
        "digest": "sha256:a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {"type": "project", "ref": "project:hypo-workflow"},
      "kind": "decision",
      "source_refs": [
        {"type": "legacy_file", "ref": "legacy:C15/cycle#cycle.summary: /hw:analysis recovery", "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml"},
        {"type": "legacy_file", "ref": "legacy:C15/summary#Milestones: C15-M3 Interactive Analysis State And Command Entry", "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md"}
      ],
      "confidence": "high",
      "dedupe_key": "analysis-durable-recoverable-workflow-lane",
      "created_at": "2026-05-16T12:40:46+08:00",
      "updated_at": "2026-05-16T12:40:46+08:00",
      "supersedes": [],
      "body": "Preserve Analysis as a first-class investigation lane with explicit entry and enough durable state to resume the question, evidence, and next action without converting it into delivery work."
    }
  },
  {
    "key": "c15-installed-skill-bundle-freshness-gate",
    "source_class": "cross_cycle_constraint",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "corroborated",
      "statement": "C15 records a shared Skill asset path repair, an installed-bundle synchronization failure, and the lesson that installed Codex Skill bundles need explicit freshness checks.",
      "materiality": "Source tests can pass while an installed Codex Skill bundle remains stale or references missing shared assets, producing behavior that differs from the repository being released."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy:C15/cycle#cycle.lessons: installed Codex skill bundle freshness",
        "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
        "digest": "sha256:3557a2f487294bb26d020d41de5468934fcad4560e941ca5d553e508da9dc4fc"
      },
      {
        "type": "legacy_file",
        "ref": "legacy:C15/summary#Completion notes: shared asset and installed bundle failures",
        "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
        "digest": "sha256:a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {"type": "project", "ref": "project:hypo-workflow"},
      "kind": "requirement",
      "source_refs": [
        {"type": "legacy_file", "ref": "legacy:C15/cycle#cycle.lessons: installed Codex skill bundle freshness", "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml"},
        {"type": "legacy_file", "ref": "legacy:C15/summary#Completion notes: shared asset and installed bundle failures", "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md"}
      ],
      "confidence": "high",
      "dedupe_key": "installed-codex-skill-bundle-freshness-gate",
      "created_at": "2026-05-16T12:40:46+08:00",
      "updated_at": "2026-05-16T12:40:46+08:00",
      "supersedes": [],
      "body": "Integration validation must compare the installed Skill bundle and shared asset references with the source version; source-only tests do not establish runtime freshness."
    }
  },
  {
    "key": "c15-focused-regression-selection-must-be-proven",
    "source_class": "important_feedback_failure",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "corroborated",
      "statement": "C15 reports a regression-runner scenario filtering defect and records the lesson that focused regression flags must be implemented rather than assumed.",
      "materiality": "A focused regression invocation may report green while silently ignoring its scenario selector, so the intended contract was never exercised."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy:C15/cycle#cycle.lessons: focused regression flags",
        "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
        "digest": "sha256:3557a2f487294bb26d020d41de5468934fcad4560e941ca5d553e508da9dc4fc"
      },
      {
        "type": "legacy_file",
        "ref": "legacy:C15/summary#Completion notes: regression runner scenario filter defect",
        "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
        "digest": "sha256:a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {"type": "project", "ref": "project:hypo-workflow"},
      "kind": "feedback",
      "source_refs": [
        {"type": "legacy_file", "ref": "legacy:C15/cycle#cycle.lessons: focused regression flags", "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml"},
        {"type": "legacy_file", "ref": "legacy:C15/summary#Completion notes: regression runner scenario filter defect", "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md"}
      ],
      "confidence": "high",
      "dedupe_key": "focused-regression-selection-must-be-proven",
      "created_at": "2026-05-16T12:40:46+08:00",
      "updated_at": "2026-05-16T12:40:46+08:00",
      "supersedes": [],
      "body": "A focused runner must demonstrate that its selector changed the executed scenario set; a green exit code without selector evidence is insufficient."
    }
  },
  {
    "key": "c16-delivery-complete-does-not-equal-cycle-accepted",
    "source_class": "important_feedback_failure",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "corroborated",
      "statement": "C16 records all Milestones completed but keeps the Cycle in pending_acceptance with acceptance.state pending and a prior rejection reference.",
      "materiality": "A migration that equates completed Milestones with accepted delivery would silently convert an unresolved human gate into an approved architectural baseline."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy:C16/cycle#cycle.status and cycle.acceptance.state",
        "locator": ".pipeline/archives/C16-root-project-management-mode/cycle.yaml",
        "digest": "sha256:d90f2e1c5ac3aa5cdc6a1340b820329ab8d90017f17aa1ceed2c5c0f7d0d404c"
      },
      {
        "type": "legacy_file",
        "ref": "legacy:C16/summary#Key results: pending_acceptance despite completed Milestones",
        "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
        "digest": "sha256:0461a6ae961657c850fb1019fa40f097cfcec9e0eafa1b392e9e655fdb9ffb19"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {"type": "project", "ref": "project:hypo-workflow"},
      "kind": "feedback",
      "source_refs": [
        {"type": "legacy_file", "ref": "legacy:C16/cycle#cycle.status and cycle.acceptance.state", "locator": ".pipeline/archives/C16-root-project-management-mode/cycle.yaml"},
        {"type": "legacy_file", "ref": "legacy:C16/summary#Key results: pending_acceptance despite completed Milestones", "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md"}
      ],
      "confidence": "high",
      "dedupe_key": "c16-delivered-but-not-human-accepted",
      "created_at": "2026-05-21T01:30:00+08:00",
      "updated_at": "2026-05-21T01:30:00+08:00",
      "supersedes": [],
      "body": "C16 was delivered but not finally accepted by the user. Its Milestone outputs may be evidence or migration input, but must not be treated as accepted requirements or current architecture without a new review."
    }
  },
  {
    "key": "c16-local-authority-and-gated-remote-adapters",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": "history_needed",
    "reviewed": true,
    "support": {
      "status": "corroborated",
      "statement": "C16 describes local .pipeline and user-level ~/.hypo-workflow storage as authority and Notion/QQ as gated adapters, but the containing Cycle remains pending acceptance.",
      "materiality": "Reusing C16 without its authority boundary could let Notion, QQ, or another remote integration become an accidental source of truth or perform external side effects without a gate."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy:C16/summary#Completion notes: technical approach and authority boundary",
        "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
        "digest": "sha256:0461a6ae961657c850fb1019fa40f097cfcec9e0eafa1b392e9e655fdb9ffb19"
      },
      {
        "type": "legacy_file",
        "ref": "legacy:C16/cycle#cycle.status and cycle.acceptance.state",
        "locator": ".pipeline/archives/C16-root-project-management-mode/cycle.yaml",
        "digest": "sha256:d90f2e1c5ac3aa5cdc6a1340b820329ab8d90017f17aa1ceed2c5c0f7d0d404c"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {"type": "project", "ref": "project:hypo-workflow"},
      "kind": "decision",
      "source_refs": [
        {"type": "legacy_file", "ref": "legacy:C16/summary#Completion notes: technical approach and authority boundary", "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md"},
        {"type": "legacy_file", "ref": "legacy:C16/cycle#cycle.status and cycle.acceptance.state", "locator": ".pipeline/archives/C16-root-project-management-mode/cycle.yaml"}
      ],
      "confidence": "high",
      "dedupe_key": "historical-c16-local-authority-gated-remote-adapters",
      "created_at": "2026-05-21T01:30:00+08:00",
      "updated_at": "2026-05-21T01:30:00+08:00",
      "supersedes": [],
      "body": "Review and either reaffirm or supersede the historical C16 rule that local Workflow stores are authoritative while remote systems are gated adapters; do not activate it solely from the unaccepted C16 archive."
    }
  },
  {
    "key": "c16-real-delivery-evidence-for-external-notifications",
    "source_class": "important_feedback_failure",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "direct",
      "statement": "C16 reports that QQ notification initially lacked real delivery evidence and was corrected by capturing an official external_message_id, while the Cycle itself remained pending acceptance.",
      "materiality": "A notification adapter can pass local or dry-run checks without delivering anything, creating a false claim that a user-visible external side effect occurred."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy:C16/summary#Completion notes: QQ delivery evidence failure and correction",
        "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
        "digest": "sha256:0461a6ae961657c850fb1019fa40f097cfcec9e0eafa1b392e9e655fdb9ffb19"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {"type": "project", "ref": "project:hypo-workflow"},
      "kind": "feedback",
      "source_refs": [
        {"type": "legacy_file", "ref": "legacy:C16/summary#Completion notes: QQ delivery evidence failure and correction", "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md"}
      ],
      "confidence": "high",
      "dedupe_key": "external-notification-needs-provider-delivery-evidence",
      "created_at": "2026-05-21T01:30:00+08:00",
      "updated_at": "2026-05-21T01:30:00+08:00",
      "supersedes": [],
      "body": "Do not claim external notification success from local execution or a dry run alone; retain a provider-issued delivery identifier or equivalent remote acknowledgement, subject to privacy and secret-handling policy."
    }
  },
  {
    "key": "c16-maintain-architecture-debt-requires-revalidation",
    "source_class": "important_feedback_failure",
    "future_decision_risk": "material",
    "current": "history_needed",
    "reviewed": true,
    "support": {
      "status": "direct",
      "statement": "C16's summary says its audit identified hard-coded paths, duplicated helpers, and workspace overload for C17 follow-up; the allowed sources do not establish whether C17 resolved them.",
      "materiality": "Carrying C16 maintenance code or schema forward without revalidation can preserve hard-coded paths, duplicated utility behavior, and an overloaded workspace boundary."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": "legacy:C16/summary#Completion notes: risks and follow-up",
        "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
        "digest": "sha256:0461a6ae961657c850fb1019fa40f097cfcec9e0eafa1b392e9e655fdb9ffb19"
      }
    ],
    "supersedes": [],
    "record_patch": {
      "scope": {"type": "project", "ref": "project:hypo-workflow"},
      "kind": "feedback",
      "source_refs": [
        {"type": "legacy_file", "ref": "legacy:C16/summary#Completion notes: risks and follow-up", "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md"}
      ],
      "confidence": "medium",
      "dedupe_key": "c16-maintain-boundaries-require-revalidation",
      "created_at": "2026-05-21T01:30:00+08:00",
      "updated_at": "2026-05-21T01:30:00+08:00",
      "supersedes": [],
      "body": "Before reusing C16 maintenance components, verify path portability, consolidate duplicated helpers, and confirm that workspace responsibilities are not overloaded; later-cycle evidence may supersede this feedback."
    }
  }
]
```

## Scan and count

- Proposal count: **11**.
- Caller-assigned Record IDs: **0**.
- Supersedes links: **0**; the allowed evidence does not justify an exact candidate-to-candidate replacement relation.
- Absolute filesystem paths in proposals: **0**. All provenance paths are repository-relative.
- Raw chat/transcript/tool-log content retained: **0**.
- Secret values retained: **0**. No token, password, private key, authorization header, credential URL, or secret payload appears in the proposals.
- Privacy note: the only external-delivery field name retained is the generic identifier name `external_message_id`; no identifier value or recipient information is present.
