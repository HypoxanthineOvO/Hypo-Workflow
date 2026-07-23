# C21-M5 独立 Bootstrap 覆盖、隐私与 Schema 审计

- Milestone: C21-M5
- Audit identity: `/root/m5_auditor` / `m5-independent-auditor`
- Role separation: 未参与 test、implement、Extractor 或 Curator
- Verdict: `APPROVED`
- Production audit: `approved`，findings `[]`
- Curation evidence SHA-256: `ffb8af688290635701f81b22d72ecd32a6133532823327bd9fd95b497e70796e`
- Curation semantic hash: `bd4b0ac0932e0b7f3a2951d67cbc23d6f1a0fcfe24d7934d394d61511abdd3c9`
- Audit semantic hash: `2f47824d8f12aad4d245589d2b8582e14a97b51f88f68f191869179882a7f4c8`
- Authority effect: proposal-only；未 staging、未 activation、未删除、未写 legacy authority

## 结论

Revision 1 已关闭首次独立语义审计发现的 Rules source-binding 缺口。最终 42 条候选通过生产 create -> merge -> curate -> audit 链路，形成 39 个唯一 active dedupe group 与 3 条被明确 supersede 的 inactive history。独立复算没有发现遗漏来源、摘要漂移、路径逃逸、symlink、Schema 错误、候选图冲突、秘密值、隐藏推理或 unsupported inference。

C16 仍明确是 delivered-but-not-accepted；Maintain 的三项历史债务仍是待 M7 逐项关闭的 current feedback。通用 Rules authority/command 被 current replacement 明确退役，但用户主动提出的 requirement、preference、feedback、turn/Delivery-scoped constraint 与 grant 继续通过单条 Record 或精确 scoped Receipt 表达。M6 -> M7 -> M8 路由和 M8 fresh deletion Receipt 保持独立，未从本 Cycle 授权推断删除权限。

## Exact Approved Binding

以下 marker 是 deterministic writer 唯一可消费的机器绑定。它包含本 Auditor 从磁盘 Curator package 通过生产 API 重新构建的 exact curation，以及生产 `auditBootstrapProposal` 返回的 exact audit proposal。

<!-- C21_M5_APPROVED_BINDING_BEGIN -->
```json
{
  "curation": {
    "active_by_dedupe_key": {
      "c16-delivered-but-not-human-accepted": "c16-delivery-complete-does-not-equal-cycle-accepted",
      "hypo-workflow:externalizable-domain-pack-boundary": "c08-externalizable-domain-pack-boundary",
      "localization/zh-cn-canonical-headings": "c11-zh-cn-canonical-skill-headings",
      "migration/c12-archive-status-conflict": "c12-archive-status-authority-conflict",
      "privacy/evidence-redact-before-persist-render": "c09-evidence-redaction-before-storage-and-rendering",
      "project:adapters:capability-map-native-registration-and-hook-semantics": "curated-platform-adapter-contracts",
      "project:analysis:durable-lane-and-execution-boundaries": "curated-analysis-durable-lane-and-boundaries",
      "project:architecture:skill-first-single-authority": "c21-current-skill-first-single-authority",
      "project:authority:user-directives-and-grants": "c21-current-scoped-directives-and-grants",
      "project:c21:m1-accepted-kernel-baseline": "c21-current-m1-accepted-kernel-baseline",
      "project:c21:m2-accepted-authority-baseline": "c21-current-m2-accepted-authority-baseline",
      "project:c21:m3-accepted-recovery-baseline": "c21-current-m3-accepted-recovery-baseline",
      "project:c21:m4-accepted-init-router-baseline": "c21-current-m4-accepted-init-router-baseline",
      "project:c21:m5-reference-bootstrap-cutover-contract": "c21-current-m5-reference-bootstrap-cutover",
      "project:c21:m6-goal-cycle-adaptive-plan-route": "c21-current-m6-goal-cycle-adaptive-plan-route",
      "project:c21:m7-maintain-codex-hook-route": "c21-current-m7-maintain-codex-hook-route",
      "project:c21:m8-cleanup-deletion-gate-route": "c21-current-m8-cleanup-deletion-gate-route",
      "project:commands:c21-nine-command-public-surface": "c21-current-nine-command-surface",
      "project:delivery:peer-kinds-explicit-start-manual-acceptance": "c21-current-delivery-lifecycle-manual-acceptance",
      "project:execution:risk-based-worker-separation": "c21-current-risk-based-worker-separation",
      "project:hypo-workflow:decision:audit-quality-optimize-separation": "c17-c20.commands.audit-quality-optimize-separation",
      "project:hypo-workflow:decision:audit-source-id-closure-matrix": "c17-c20.audit.source-id-closure-matrix",
      "project:hypo-workflow:decision:integration-sync-internal-release-gate": "c17-c20.integration-sync.internal-release-gate",
      "project:hypo-workflow:decision:platform-neutral-readme": "c17-c20.docs.platform-neutral-readme",
      "project:hypo-workflow:decision:portable-core-boundaries": "c17-c20.architecture.portable-core-boundaries",
      "project:hypo-workflow:decision:source-managed-target-owned-boundary": "c17-c20.ownership.source-managed-vs-target-owned",
      "project:hypo-workflow:explore-worktree-isolation-and-dirty-gate": "explore-worktree-isolation-and-dirty-gate",
      "project:hypo-workflow:feedback:c17-unresolved-architecture-quality-followups": "c17-c20.debt.unresolved-architecture-quality-followups",
      "project:hypo-workflow:feedback:c20-target-local-continuations": "c17-c20.targets.c20-local-adaptation-continuations",
      "project:hypo-workflow:requirement:consultation-first-action-boundary": "c17-c20.action.consultation-first-and-concept-introduction",
      "project:lifecycle:transaction-and-derived-coherence": "curated-lifecycle-transaction-and-derived-coherence",
      "project:maintain:path-helper-workspace-revalidation": "c16-maintain-architecture-debt-requires-revalidation",
      "project:recovery:journal-capsule-pack-authority": "c21-current-recovery-journal-capsule-pack",
      "project:roadmap:c21-deferred-scope": "c21-current-deferred-roadmap",
      "project:safety:high-impact-gates-and-scoped-automation": "curated-high-impact-gates-and-scoped-automation",
      "project:stash:implementation-model": "c21-current-stash-suspend-reconciliation",
      "project:ux:completion-report-substance-in-conversation": "curated-completion-report-substance-in-conversation",
      "project:validation:dynamic-selection-localization-installed-freshness": "curated-validation-selection-localization-and-installation",
      "project:validation:external-effects-and-release-evidence": "curated-external-effects-and-release-evidence"
    },
    "authority_role": "proposal",
    "bootstrap_job_ref": {
      "id": "c21-reference-bootstrap",
      "kind": "bootstrap_job"
    },
    "merge_hash": "784c310330c9621ca75b3facad35febfb4473328ad4c8f269feb85cfa9189251",
    "proposal_kind": "bootstrap_curation",
    "records": [
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c08-externalizable-domain-pack-boundary",
        "record_patch": {
          "body": "领域能力通过可外置 Domain Pack boundary protocol 接入，RTL 是参考实现；规划、Review 与测试可以消费 pack，核心工作流不内嵌具体领域规则。",
          "confidence": "high",
          "created_at": "2026-07-12T07:00:47+08:00",
          "dedupe_key": "hypo-workflow:externalizable-domain-pack-boundary",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md",
              "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md#Decisions / C8-PLAN-domain-pack-boundary-and-review-rules-20260506",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md",
              "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Summary and Milestones / M07-M09",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:09:58+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177",
            "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md",
            "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md#Decisions / C8-PLAN-domain-pack-boundary-and-review-rules-20260506",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:d56b1755c6f898a0c4c88edf1be241d72296d36f9f49debf55f47e3340eb7f9a",
            "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md",
            "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Summary and Milestones / M07-M09",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": "observed"
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c09-evidence-redaction-before-storage-and-rendering",
        "record_patch": {
          "body": "Evidence-first 命令必须在两个出口之前完成敏感信息脱敏：既要在 evidence packet 持久化之前脱敏，也要在人类可见内容渲染之前脱敏。",
          "confidence": 0.99,
          "created_at": "2026-07-12T07:07:51+08:00",
          "dedupe_key": "privacy/evidence-redact-before-persist-render",
          "kind": "requirement",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
              "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lessons[0]",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:07:51+08:00"
        },
        "reviewed": true,
        "source_class": "active_requirement",
        "sources": [
          {
            "digest": "sha256:c84dfa32eddb2754e10e656648a0bb185113db10d9053961279c8f7cc63591c4",
            "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
            "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lessons[0]",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C9 records redaction as an accepted lesson for both persisted evidence packets and human-facing output.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c11-zh-cn-canonical-skill-headings",
        "record_patch": {
          "body": "当项目语言策略为 `zh-CN` 时，Skills 与 references 可以使用中文规范标题，Skill 质量检查必须接受这些中文 canonical headings，不能把英文标题写死为唯一合法形式。",
          "confidence": 0.98,
          "created_at": "2026-07-12T07:07:51+08:00",
          "dedupe_key": "localization/zh-cn-canonical-headings",
          "kind": "requirement",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.summary and cycle.lessons[0]",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:07:51+08:00"
        },
        "reviewed": true,
        "source_class": "active_requirement",
        "sources": [
          {
            "digest": "sha256:de025e24bb8312b5c0f0e35cabe43297c4a169812764df83f82639374f304d93",
            "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml",
            "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.summary and cycle.lessons[0]",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C11 accepted Chinese-first Skills/references and records validator compatibility with Chinese canonical headings as a lesson.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c12-archive-status-authority-conflict",
        "record_patch": {
          "body": "C12 归档存在权威冲突：`cycle.yaml` 仍标记 `active` 且缺少完成时间与摘要，而 `summary.md` 标记 `completed`、给出结束时间并声明全部 Milestone 完成；迁移时必须保留并上报冲突，不能无声选择其中一方。",
          "confidence": 0.99,
          "created_at": "2026-07-12T07:07:51+08:00",
          "dedupe_key": "migration/c12-archive-status-conflict",
          "kind": "feedback",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/cycle.yaml",
              "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/cycle.yaml#cycle.status, cycle.finished absence, cycle.summary, and cycle.lessons",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md",
              "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#基本信息 > 状态/结束时间 and 里程碑",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:07:51+08:00"
        },
        "reviewed": true,
        "source_class": "important_feedback_failure",
        "sources": [
          {
            "digest": "sha256:e0aadc6cde082180e77fbb5a70d94a81d955ed9034d6d084827a8a2440fc8406",
            "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/cycle.yaml",
            "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/cycle.yaml#cycle.status, cycle.finished absence, cycle.summary, and cycle.lessons",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:7240d551caad5116ea0e448c1092a7a2d5a3fea26335c6e2b619e698d5ab0a1c",
            "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md",
            "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#基本信息 > 状态/结束时间 and 里程碑",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "The archived C12 cycle metadata says active with no finish/summary, while its archive summary says completed with a finish timestamp and all milestones done.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c16-delivery-complete-does-not-equal-cycle-accepted",
        "record_patch": {
          "body": "C16 was delivered but not finally accepted by the user. Its Milestone outputs may be evidence or migration input, but must not be treated as accepted requirements or current architecture without a new review.",
          "confidence": "high",
          "created_at": "2026-05-21T01:30:00+08:00",
          "dedupe_key": "c16-delivered-but-not-human-accepted",
          "kind": "feedback",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C16-root-project-management-mode/cycle.yaml",
              "ref": "legacy:C16/cycle#cycle.status and cycle.acceptance.state",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
              "ref": "legacy:C16/summary#Key results: pending_acceptance despite completed Milestones",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-05-21T01:30:00+08:00"
        },
        "reviewed": true,
        "source_class": "important_feedback_failure",
        "sources": [
          {
            "digest": "sha256:d90f2e1c5ac3aa5cdc6a1340b820329ab8d90017f17aa1ceed2c5c0f7d0d404c",
            "locator": ".pipeline/archives/C16-root-project-management-mode/cycle.yaml",
            "ref": "legacy:C16/cycle#cycle.status and cycle.acceptance.state",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:0461a6ae961657c850fb1019fa40f097cfcec9e0eafa1b392e9e655fdb9ffb19",
            "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
            "ref": "legacy:C16/summary#Key results: pending_acceptance despite completed Milestones",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "materiality": "A migration that equates completed Milestones with accepted delivery would silently convert an unresolved human gate into an approved architectural baseline.",
          "statement": "C16 records all Milestones completed but keeps the Cycle in pending_acceptance with acceptance.state pending and a prior rejection reference.",
          "status": "corroborated"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c16-maintain-architecture-debt-requires-revalidation",
        "record_patch": {
          "body": "M7 must explicitly verify path portability, duplicated-helper consolidation, and workspace responsibility boundaries before accepting or reusing legacy Maintain components. C17 reports portability and boundary remediation, but the bounded history does not prove that all three C16 concerns remain closed in the new ambient Maintain/Hook design. This Record is an open verification obligation, not a claim that current code is defective; a later implementation/audit Record must supersede it when each check is evidenced.",
          "confidence": "high",
          "created_at": "2026-05-21T01:30:00+08:00",
          "dedupe_key": "project:maintain:path-helper-workspace-revalidation",
          "kind": "feedback",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md",
              "ref": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md#Objective; Requirements; Boundaries; Technical Solution",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md",
              "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md#Milestone 摘要, 关键结果, and 完成说明",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
              "ref": "legacy:C16/summary#Completion notes: risks and follow-up",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "important_feedback_failure",
        "sources": [
          {
            "digest": "sha256:3378b14eb346eba879b0d0db69a3e3306ddd39ca143f37692e7cae3d392299db",
            "locator": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md",
            "ref": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md#Objective; Requirements; Boundaries; Technical Solution",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:8ae34a8eaa0a12f079a5ab76d66c8ec8a8b5f795459666bfd2d9f5b6831c761d",
            "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md",
            "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md#Milestone 摘要, 关键结果, and 完成说明",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:0461a6ae961657c850fb1019fa40f097cfcec9e0eafa1b392e9e655fdb9ffb19",
            "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
            "ref": "legacy:C16/summary#Completion notes: risks and follow-up",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C16 directly identifies path, helper, and workspace-boundary debt; C17 reports partial architectural remediation; the current M7 route is the next implementation boundary where all three require explicit closure evidence.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c17-c20.action.consultation-first-and-concept-introduction",
        "record_patch": {
          "body": "**Consultation-first action boundary.** When the user is discussing background, an idea, a complaint, a question, or a possible solution without clearly requesting direct execution, first present the concrete understanding and recommended direction, then wait for authorization before editing. A clear bounded imperative or an affirmative reply to an already displayed plan authorizes only that shown scope. Explain a new Workflow concept in one sentence on its first use.",
          "confidence": 1,
          "created_at": "2026-07-12T07:08:38+08:00",
          "dedupe_key": "project:hypo-workflow:requirement:consultation-first-action-boundary",
          "kind": "requirement",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml",
              "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.summary and cycle.acceptance",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C20-consultation-first-action-boundary/summary.md",
              "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/summary.md#改动摘要 and Milestones C20-M1 through C20-M2",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:08:38+08:00"
        },
        "reviewed": true,
        "source_class": "active_requirement",
        "sources": [
          {
            "digest": "sha256:c2052da28e5f4c1000a35f1f09f0c937302ac37b68efbcfcf7ac4142cea2a411",
            "locator": ".pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml",
            "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.summary and cycle.acceptance",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:504d3c23c8f4b27ddb605111f56420f0d43eb62f8b3963c3aff0e11bf5a2336d",
            "locator": ".pipeline/archives/C20-consultation-first-action-boundary/summary.md",
            "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/summary.md#改动摘要 and Milestones C20-M1 through C20-M2",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C20 was manually accepted specifically for the consultation-first boundary and the first-use concept explanation behavior.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c17-c20.architecture.portable-core-boundaries",
        "record_patch": {
          "body": "Keep portable layered configuration instead of user-specific paths or seeds, shared utilities instead of duplicated helpers, explicit workspace responsibility boundaries, consistent schema parsing, a repository-root test entry, and an explicit public export surface. The C17 JSONL ledger implementation is historical; after C21, individual Records and their derived indexes are the authority, so portability lessons remain current without reviving the old ledger.",
          "confidence": "high",
          "created_at": "2026-07-11T20:24:08+08:00",
          "dedupe_key": "project:hypo-workflow:decision:portable-core-boundaries",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md",
              "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/C21-unified-architecture-design.md",
              "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml",
              "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml#cycle.summary and cycle.acceptance",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md",
              "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md#Milestone 摘要, 关键结果, and 完成说明",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "accepted_outcome",
        "sources": [
          {
            "digest": "sha256:49e3b2c2e98a5610b280c3ae08bf83a9197976f4c6fc89857b5495decbb31e39",
            "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md",
            "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:a833151c2e9f4a95e250f2c9af46645ea3b735fea92b1da9bc9c02080a96b196",
            "locator": ".pipeline/reports/C21-unified-architecture-design.md",
            "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:bc22dc7799198efb7371915bbd323eacd7cc56667f71529547995e0c1ca71cb0",
            "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml",
            "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml#cycle.summary and cycle.acceptance",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:8ae34a8eaa0a12f079a5ab76d66c8ec8a8b5f795459666bfd2d9f5b6831c761d",
            "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md",
            "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md#Milestone 摘要, 关键结果, and 完成说明",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C17 accepted portable configuration and separated responsibilities; C21 replaces the prior ledger authority with individual Records and derived indexes while retaining those portability boundaries.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c17-c20.audit.source-id-closure-matrix",
        "record_patch": {
          "body": "**Audit-remediation discipline.** Maintain a source-ID closure matrix from finding to evidence, and classify broad-detector residuals separately from release blockers. A residual match is not automatically a failed release gate, but its classification must be explicit and reviewable.",
          "confidence": 0.99,
          "created_at": "2026-07-12T07:08:38+08:00",
          "dedupe_key": "project:hypo-workflow:decision:audit-source-id-closure-matrix",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml",
              "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml#cycle.lessons",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:08:38+08:00"
        },
        "reviewed": true,
        "source_class": "cross_cycle_constraint",
        "sources": [
          {
            "digest": "sha256:bc22dc7799198efb7371915bbd323eacd7cc56667f71529547995e0c1ca71cb0",
            "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml",
            "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/cycle.yaml#cycle.lessons",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C17 records this as the durable lesson for future audit-remediation work, and no later allowed source replaces it.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c17-c20.commands.audit-quality-optimize-separation",
        "record_patch": {
          "body": "**Instruction-quality capability boundary.** Audit performs preventive engineering review, Quality produces an evidence-backed scorecard, and Optimize coordinates an Audit-plus-Quality improvement loop. Preserve the distinct report and gate contracts even if command discoverability or scheduling changes.",
          "confidence": 0.99,
          "created_at": "2026-07-12T07:08:38+08:00",
          "dedupe_key": "project:hypo-workflow:decision:audit-quality-optimize-separation",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml",
              "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml#cycle.summary and cycle.acceptance",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md",
              "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md#Milestone 摘要 and 关键结果",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:08:38+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:679f77b75be9095f5be174c41754ad89bd2196dd80538fe3eddfba671aa3a662",
            "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml",
            "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml#cycle.summary and cycle.acceptance",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:6914f34b3d608a1e6c1573b40f7dfb875c30fa5f71bc66067069107fd78339a3",
            "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md",
            "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md#Milestone 摘要 and 关键结果",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C18 accepted distinct contracts for Audit, Quality, and Optimize rather than treating them as one undifferentiated review command.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c17-c20.debt.unresolved-architecture-quality-followups",
        "record_patch": {
          "body": "**Unresolved, non-blocking follow-ups from C17.** Revalidate `ARCH-05` broader module-boundary refactoring, `QUAL-06` deep-plan file splitting, audit inventory v2, and ledger compaction performance before scheduling new architecture debt work. C17 did not classify these items as release blockers, and their present code status has not been re-audited by this Extractor.",
          "confidence": 0.9,
          "created_at": "2026-07-12T07:08:38+08:00",
          "dedupe_key": "project:hypo-workflow:feedback:c17-unresolved-architecture-quality-followups",
          "kind": "feedback",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md",
              "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md#关键结果 and 风险/后续",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:08:38+08:00"
        },
        "reviewed": true,
        "source_class": "important_feedback_failure",
        "sources": [
          {
            "digest": "sha256:8ae34a8eaa0a12f079a5ab76d66c8ec8a8b5f795459666bfd2d9f5b6831c761d",
            "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md",
            "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md#关键结果 and 风险/后续",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C17 explicitly leaves four non-blocking follow-up candidates; none of the allowed C18-C20 summaries claims that these exact items were closed.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c17-c20.docs.platform-neutral-readme",
        "record_patch": {
          "body": "**Documentation boundary.** Keep the top-level README platform-neutral. Put platform installation, synchronization responsibilities, and plugin-specific behavior in the relevant platform integration surfaces rather than making one platform the project-wide default narrative.",
          "confidence": 0.88,
          "created_at": "2026-07-12T07:08:38+08:00",
          "dedupe_key": "project:hypo-workflow:decision:platform-neutral-readme",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
              "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Decisions: C8-DOC platform installation boundary",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:08:38+08:00"
        },
        "reviewed": true,
        "source_class": "cross_cycle_constraint",
        "sources": [
          {
            "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177",
            "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
            "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Decisions: C8-DOC platform installation boundary",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "The latest allowed Knowledge Compact repeats the earlier documentation policy that the README remains platform-neutral and platform integration details stay at their own boundary.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c17-c20.integration-sync.internal-release-gate",
        "record_patch": {
          "body": "**Integration-sync boundary.** Treat downstream adapter synchronization as an internal development and release gate after source changes, not as a public user command. Target adaptation must be explicitly scoped, validated in the target, and recorded on the target side.",
          "confidence": 0.99,
          "created_at": "2026-07-12T07:08:38+08:00",
          "dedupe_key": "project:hypo-workflow:decision:integration-sync-internal-release-gate",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml",
              "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml#cycle.summary",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md",
              "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md#C18-M4 through C18-M6 and 完成说明",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:08:38+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:679f77b75be9095f5be174c41754ad89bd2196dd80538fe3eddfba671aa3a662",
            "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml",
            "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml#cycle.summary",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:6914f34b3d608a1e6c1573b40f7dfb875c30fa5f71bc66067069107fd78339a3",
            "locator": ".pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md",
            "ref": "legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md#C18-M4 through C18-M6 and 完成说明",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C18 explicitly defines integration sync as a source-change development/release process rather than a user-facing Workflow command.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c17-c20.ownership.source-managed-vs-target-owned",
        "record_patch": {
          "body": "**Source/target ownership boundary.** The Hypo-Workflow source repository may own shared behavior contracts, common guidance, managed source adapters, documentation contracts, tests, and handoff matrices. Per-model prompts, runtime prompt tuning, provider behavior, and target-local reminder wording remain target-owned and require a separately scoped target-local Cycle; source closure must not silently write them.",
          "confidence": 0.99,
          "created_at": "2026-07-12T07:08:38+08:00",
          "dedupe_key": "project:hypo-workflow:decision:source-managed-target-owned-boundary",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml",
              "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.summary and cycle.continuations",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C20-consultation-first-action-boundary/summary.md",
              "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/summary.md#改动摘要, C20-M4, and 风险与后续",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:08:38+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:c2052da28e5f4c1000a35f1f09f0c937302ac37b68efbcfcf7ac4142cea2a411",
            "locator": ".pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml",
            "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.summary and cycle.continuations",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:504d3c23c8f4b27ddb605111f56420f0d43eb62f8b3963c3aff0e11bf5a2336d",
            "locator": ".pipeline/archives/C20-consultation-first-action-boundary/summary.md",
            "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/summary.md#改动摘要, C20-M4, and 风险与后续",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C20 completed source-owned contracts and managed guidance while deliberately leaving target-owned prompt changes to separate target-local Cycles.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c17-c20.targets.c20-local-adaptation-continuations",
        "record_patch": {
          "body": "**Pending target follow-up from C20.** Codex-VSP and VSP-Open-Code were each assigned a target-local continuation to consume the consultation-first source contract and decide their managed guidance versus target-owned prompt changes. C20 did not execute those target writes; verify target-local records before treating either adaptation as complete.",
          "confidence": 0.98,
          "created_at": "2026-07-12T07:08:38+08:00",
          "dedupe_key": "project:hypo-workflow:feedback:c20-target-local-continuations",
          "kind": "feedback",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml",
              "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.continuations",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:08:38+08:00"
        },
        "reviewed": true,
        "source_class": "current_cycle_context",
        "sources": [
          {
            "digest": "sha256:c2052da28e5f4c1000a35f1f09f0c937302ac37b68efbcfcf7ac4142cea2a411",
            "locator": ".pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml",
            "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.continuations",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C20 records two planned target-local continuations and explicitly states that target repositories were not written in that Cycle.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-deferred-roadmap",
        "record_patch": {
          "body": "After C21, prioritize OpenCode adaptation, then Claude Code/other adapters, Workflow Stash/Suspend/Pop, and experiment project management; experiment management is more important than telemetry. Aggregate telemetry and the Docs/PR/Release redesign come later. Dashboard, TUI, and generic Automation Jobs are not currently planned. If one future automation capability is chosen, prefer Codex quota-recovery scheduled follow-up from a saved continuation rather than building a generic scheduler. In C21, deferred Analysis/Audit/Quality/Explore/Docs/PR/Release/Optimize capabilities stay non-discoverable and zero-write; permanent removal candidates wait for M8's approved Manifest.",
          "confidence": "high",
          "created_at": "2026-07-11T20:39:36+08:00",
          "dedupe_key": "project:roadmap:c21-deferred-scope",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/architecture.md",
              "ref": ".pipeline/architecture.md#Deferred Scope",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
              "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#后续 Cycle; 当前版本目标; 兼容策略",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-11T20:39:36+08:00"
        },
        "reviewed": true,
        "source_class": "current_cycle_context",
        "sources": [
          {
            "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f",
            "locator": ".pipeline/architecture.md",
            "ref": ".pipeline/architecture.md#Deferred Scope",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:887400607034b2c01edbac1e85f408f83352d426996b8657ee5f041cd4ed7224",
            "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
            "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#后续 Cycle; 当前版本目标; 兼容策略",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "The confirmed scope defers non-Codex adapters, Stash, experiments, telemetry and advanced command redesign, and does not currently plan Dashboard/TUI/general automation; experiment management precedes telemetry. Material future-decision risk: Without the deferred map, C21 could expand indefinitely, claim unsupported adapters, delete reusable hidden code, or prioritize telemetry over the already chosen experiment-management work.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-delivery-lifecycle-manual-acceptance",
        "record_patch": {
          "body": "Goal and Cycle are peer Main Delivery kinds. A Goal has one Design and no user-visible Milestone sequence; a Cycle has ordered Milestones, internal verification at Milestone boundaries, and one final Cycle-level manual acceptance gate. Maintain is ambient. Approval creates waiting_to_start, and only explicit start intent begins work. After that start, authorized execution may continue across ordinary internal Milestone boundaries without repeated approval, but scope, risk, remote-effect, revision, and acceptance gates remain binding. Direction-changing feedback creates needs_revision and a revised proposal rather than edit authorization. Successful Delivery ends only after a scoped acceptance Receipt.",
          "confidence": "high",
          "created_at": "2026-07-11T20:24:08+08:00",
          "dedupe_key": "project:delivery:peer-kinds-explicit-start-manual-acceptance",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md",
              "ref": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md#L25-L27",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/cycle.yaml",
              "ref": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/cycle.yaml#cycle.lessons",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/cycle.yaml",
              "ref": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/cycle.yaml#cycle.lifecycle_policy.auto_continue",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C7-codex-service-effectiveness-and-workflow-governance/cycle.yaml",
              "ref": ".pipeline/archives/C7-codex-service-effectiveness-and-workflow-governance/cycle.yaml#cycle.lifecycle_policy.auto_continue",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/cycle.yaml",
              "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/cycle.yaml#cycle.lifecycle_policy.auto_continue",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/cycle.yaml",
              "ref": ".pipeline/cycle.yaml#cycle.acceptance; cycle.lifecycle_policy",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/C21-unified-architecture-design.md",
              "ref": ".pipeline/reports/C21-unified-architecture-design.md#对象模型; Delivery 生命周期; 端到端场景",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:b5ce0490a8d08138b311ec07a75b1567e01037242c8fe4dbb30de391d512c4bb",
            "locator": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md",
            "ref": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md#L25-L27",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:0da30ed106fa2dfb24097574a8df84a7a67c15d1e050edb4dc7e83b11394dd28",
            "locator": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/cycle.yaml",
            "ref": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/cycle.yaml#cycle.lessons",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:4e7844028a5bd3ffda2caf6e040bd4c6628291ec2a6409b48621e24af9101c1c",
            "locator": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/cycle.yaml",
            "ref": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/cycle.yaml#cycle.lifecycle_policy.auto_continue",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:e872336a96ce3e1ca008b1b85db5a8cba79f6296ef4d81ffe42c64ec1e26fe57",
            "locator": ".pipeline/archives/C7-codex-service-effectiveness-and-workflow-governance/cycle.yaml",
            "ref": ".pipeline/archives/C7-codex-service-effectiveness-and-workflow-governance/cycle.yaml#cycle.lifecycle_policy.auto_continue",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:2372649ee4d4ce2bd2a992111befbbb741d67874e8dca78cfdf08f02dd4caff7",
            "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/cycle.yaml",
            "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/cycle.yaml#cycle.lifecycle_policy.auto_continue",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb",
            "locator": ".pipeline/cycle.yaml",
            "ref": ".pipeline/cycle.yaml#cycle.acceptance; cycle.lifecycle_policy",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:a833151c2e9f4a95e250f2c9af46645ea3b735fea92b1da9bc9c02080a96b196",
            "locator": ".pipeline/reports/C21-unified-architecture-design.md",
            "ref": ".pipeline/reports/C21-unified-architecture-design.md#对象模型; Delivery 生命周期; 端到端场景",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C4-C8 preserve the distinction between internal completion, continuation, and acceptance; C21 replaces Patch/timeout variants with peer Goal/Cycle Deliveries, explicit start, and one scoped final acceptance.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-m1-accepted-kernel-baseline",
        "record_patch": {
          "body": "C21-M1 is accepted with final audit PASS. It delivered canonical YAML/frontmatter/hashing, six-class zero-write workspace detection, recoverable manifest-last transactions with staged/target hash validation and deterministic recovery, and a central fence covering 22 project mutation families. Final validation was focused 76/76 and full 752/752. Non-blocking limits remain: no cross-process transaction lock, no fsync-backed marker durability, and no generic typed path-ownership guarantee beyond the certified writer inventory.",
          "confidence": "high",
          "created_at": "2026-07-12T00:21:05+08:00",
          "dedupe_key": "project:c21:m1-accepted-kernel-baseline",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md",
              "ref": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md#Completion Narrative; Delivered Architecture; Test Results",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reviews/C21/M1/final-audit.md",
              "ref": ".pipeline/reviews/C21/M1/final-audit.md#Conclusion; Closure Matrix; Residual risk",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T00:21:05+08:00"
        },
        "reviewed": true,
        "source_class": "accepted_outcome",
        "sources": [
          {
            "digest": "sha256:66ef1909b4e7b399e3bd9a813ec46e226bbeeb68960413f79eced1737906b77f",
            "locator": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md",
            "ref": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md#Completion Narrative; Delivered Architecture; Test Results",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:cd2e934e13cd537c686c53c064e564adcc330522622f5783d2954177cf039fff",
            "locator": ".pipeline/reviews/C21/M1/final-audit.md",
            "ref": ".pipeline/reviews/C21/M1/final-audit.md#Conclusion; Closure Matrix; Residual risk",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "M1 delivered canonical serialization, six-class zero-write detection, recoverable manifest-last transactions and a 22-family legacy writer fence; final audit passed after adversarial revisions. Material future-decision risk: Without the accepted M1 baseline, downstream work could create a second mutation primitive, bypass the 22-family fence, or assume unimplemented cross-process durability.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-m2-accepted-authority-baseline",
        "record_patch": {
          "body": "C21-M2 is accepted with fresh re-audit PASS and no findings. It delivered reference-only active pointers; object Runtime and Continuation; one-fact-per-file requirement, preference, decision, and feedback Records with explicit supersedes; derived indexes that fail closed unless each dedupe key has exactly one active leaf; scoped single-use Receipt state machines using host or captured Clock; and portable, content-bound accepted/checkpoint Snapshots. Final validation was focused 61/61, targeted 21/21, and full 813/813. Same-process Receipt reservation is not a cross-process lease, secret detection is a finite corpus, and Snapshot retention remains later work.",
          "confidence": "high",
          "created_at": "2026-07-12T02:42:16+08:00",
          "dedupe_key": "project:c21:m2-accepted-authority-baseline",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md",
              "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reviews/C21/M2/reaudit.md",
              "ref": ".pipeline/reviews/C21/M2/reaudit.md#Conclusion; Closure Matrix; Residual Risks",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T02:42:16+08:00"
        },
        "reviewed": true,
        "source_class": "accepted_outcome",
        "sources": [
          {
            "digest": "sha256:49e3b2c2e98a5610b280c3ae08bf83a9197976f4c6fc89857b5495decbb31e39",
            "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md",
            "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:3274ba2d3823be6b9ab59cf5eda7c5e9badea643deab206c5e336abeaad93830",
            "locator": ".pipeline/reviews/C21/M2/reaudit.md",
            "ref": ".pipeline/reviews/C21/M2/reaudit.md#Conclusion; Closure Matrix; Residual Risks",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "M2 certified object Runtime/Continuation, individual Record authority, derived indexes, scoped single-use Receipts and portable content-bound Snapshots; re-audit closed all seven findings. Material future-decision risk: Without the accepted M2 baseline, later code could duplicate lifecycle facts in active pointers, let indexes arbitrate facts, or use unscoped/replayable approval flags.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-m3-accepted-recovery-baseline",
        "record_patch": {
          "body": "C21-M3 is accepted with final independent audit PASS and no findings. It delivered object/session/writer-partitioned segmented Journal streams with vector cursors, redaction-first content-addressed blobs, derived Capsules with byte-identical incremental/full rebuild, sealed ancestry-linked Recovery Packs, bounded restore with corrupt-head fallback, and drift-bound deterministic retention. Final validation was focused 47/47 and full 860/860. Locks remain process-local, durability inherits filesystem limits, secret recognition is bounded, Capsule hashes are integrity rather than keyed authenticity, and retention has no cross-process lock across final check and removal.",
          "confidence": "high",
          "created_at": "2026-07-12T04:32:18+08:00",
          "dedupe_key": "project:c21:m3-accepted-recovery-baseline",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md",
              "ref": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md#Completion Narrative; Delivered Architecture; Architecture Plan Review",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reviews/C21/M3/final-audit.md",
              "ref": ".pipeline/reviews/C21/M3/final-audit.md#Conclusion; First-Audit Closure Matrix; Residual Risks",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T04:32:18+08:00"
        },
        "reviewed": true,
        "source_class": "accepted_outcome",
        "sources": [
          {
            "digest": "sha256:e5c90d68c4ffb237d9091d4d1e8cbf646742c7a48f9063a84b27a67814edbc41",
            "locator": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md",
            "ref": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md#Completion Narrative; Delivered Architecture; Architecture Plan Review",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:7de84349e0bba5b062dff1f676459e4d10f990237fbfc1b9d57b80bc7ebdc31e",
            "locator": ".pipeline/reviews/C21/M3/final-audit.md",
            "ref": ".pipeline/reviews/C21/M3/final-audit.md#Conclusion; First-Audit Closure Matrix; Residual Risks",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "M3 certified partitioned Journal, redaction-first blobs, derived Capsules, sealed ancestry-linked Packs, bounded restore and deterministic retention; final audit closed six findings. Material future-decision risk: Without the accepted M3 baseline, later Resume or Hook work could recreate transcript authority, corrupt cursor semantics, or weaken Pack and retention integrity.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-m4-accepted-init-router-baseline",
        "record_patch": {
          "body": "C21-M4 is accepted with final independent audit PASS and no findings. It delivered manifest-last Init for empty and unmanaged Brownfield repositories, one no-input outcome Ask, bounded evidence-backed Adoption Briefs, raw read-only Legacy inspection, and availability-aware Root/Init/Guide routing with non-symlink trust anchors. Final validation was focused 44/44 and full 904/904; command layers were 54 canonical, 53 legacy inventory, and 2 currently discoverable, with 0 Skill-quality issues across 45 Skills. Raw Legacy evidence remains proposal input only, filesystem scans and secret detection are bounded, and the 53-entry compatibility inventory must remain hidden behind filtered discovery until M8.",
          "confidence": "high",
          "created_at": "2026-07-12T06:32:43+08:00",
          "dedupe_key": "project:c21:m4-accepted-init-router-baseline",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/reports/03-init-workspace-adoption-and-minimal-skill-router.report.md",
              "ref": ".pipeline/reports/03-init-workspace-adoption-and-minimal-skill-router.report.md#Completion Narrative; Delivered Architecture; Architecture Plan Review",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reviews/C21/M4/final-audit.md",
              "ref": ".pipeline/reviews/C21/M4/final-audit.md#结论; 通过的功能与架构边界; Residual Risks",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T06:32:43+08:00"
        },
        "reviewed": true,
        "source_class": "accepted_outcome",
        "sources": [
          {
            "digest": "sha256:741089e7a5611f81d301e4638cfab2683570073038121e011cc13e99c019200a",
            "locator": ".pipeline/reports/03-init-workspace-adoption-and-minimal-skill-router.report.md",
            "ref": ".pipeline/reports/03-init-workspace-adoption-and-minimal-skill-router.report.md#Completion Narrative; Delivered Architecture; Architecture Plan Review",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:70722191ebad4f041a844a757694a904aae1b74c78ff1f5c86478068d40a88e3",
            "locator": ".pipeline/reviews/C21/M4/final-audit.md",
            "ref": ".pipeline/reviews/C21/M4/final-audit.md#结论; 通过的功能与架构边界; Residual Risks",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "M4 certified manifest-last Init for empty/brownfield, read-only Legacy inspection, bounded Adoption Brief and availability-aware Root/Init/Guide routing; final discovery is only Guide and Init at this stage. Material future-decision risk: Without the accepted M4 baseline, later work could silently migrate legacy workspaces, trust unsafe paths, or confuse the 53-file legacy inventory with current capability discovery.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-m5-reference-bootstrap-cutover",
        "record_patch": {
          "body": "C21-M5 converts only history whose absence could materially change a future decision. It is an internal Bootstrap Job for this repository, not a public migration command. Extractors, Curator, and Auditor produce proposals only; an independent audit checks coverage, inference, schema, sources, and privacy; one deterministic writer owns IDs, dedupe, supersedes compilation, indexes, staging, Capsule, Pack, Snapshot, and activation. Activate the manifest last, freeze all legacy writers, retain a usable rollback checkpoint until the Bootstrap checkpoint is accepted, resume C21 in a fresh process from a valid Pack, prove all post-activation writes use only new zones, and prove legacy state.yaml, cycle.yaml, and log.yaml are unchanged. Do not import raw chat/tool logs/secrets, delete tracked legacy files, dual-write, or migrate arbitrary repositories. Derive only a redacted fixed CI fixture from the reference workspace.",
          "confidence": "high",
          "created_at": "2026-07-11T20:39:36+08:00",
          "dedupe_key": "project:c21:m5-reference-bootstrap-cutover-contract",
          "kind": "requirement",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/prompts/04-reference-repository-bootstrap-and-schema-activation.md",
              "ref": ".pipeline/prompts/04-reference-repository-bootstrap-and-schema-activation.md#Objective; Requirements; Technical Route; Audit Focus",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
              "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#兼容策略; Bootstrap 顺序; 本仓库历史提炼; 激活本仓库",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-11T20:39:36+08:00"
        },
        "reviewed": true,
        "source_class": "active_requirement",
        "sources": [
          {
            "digest": "sha256:7c958157bcc73b59e5716786caec3a9ffefb3ba33af08026251d6c1cfdeb198d",
            "locator": ".pipeline/prompts/04-reference-repository-bootstrap-and-schema-activation.md",
            "ref": ".pipeline/prompts/04-reference-repository-bootstrap-and-schema-activation.md#Objective; Requirements; Technical Route; Audit Focus",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:887400607034b2c01edbac1e85f408f83352d426996b8657ee5f041cd4ed7224",
            "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
            "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#兼容策略; Bootstrap 顺序; 本仓库历史提炼; 激活本仓库",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "M5 is an internal reference-repository Bootstrap Job: bounded proposals, curation and independent audit precede one deterministic writer, staging and manifest-last activation, legacy freeze, rollback checkpoint, and fresh-process Pack restore. Material future-decision risk: Without the M5 invariant, migration workers could write authority, the live repository could dual-write schemas, legacy history could be copied wholesale, or C21 could resume on the wrong next route.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-m6-goal-cycle-adaptive-plan-route",
        "record_patch": {
          "body": "C21-M6 implements Goal and Cycle as peer Delivery kinds, adaptive planning, explicit start, separated execution, verification, Resume, manual Accept/Reject, and the exact nine-command surface. Goal uses one Design. Cycle uses ordered Milestones and one final acceptance. Plan first resolves configuration and inherited-state assumptions that materially affect discovery, abstracts user examples into general requirements, and shows the actual technical route and phase artifacts before a major gate. Depth is evidence-driven: concise Goal Design, standard Discover -> Technical Stack -> Architecture -> Decompose -> Generate for weaker models or complex work, and internal durable Deep Plan research when needed. Remove fixed min_rounds and stop asking when material ambiguity is resolved. Approval creates waiting_to_start; directional feedback creates needs_revision until explicit start. Maintain and Codex Hooks are M7, not M6.",
          "confidence": "high",
          "created_at": "2026-05-16T12:40:46+08:00",
          "dedupe_key": "project:c21:m6-goal-cycle-adaptive-plan-route",
          "kind": "requirement",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/architecture.md",
              "ref": ".pipeline/architecture.md#Delivery Lifecycle; Command Exposure",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml",
              "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.summary",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C10-experience-optimizations/summary.md",
              "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Milestones M0",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.lessons[1]",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M2",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md",
              "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#里程碑 M0-M7 and 关键数据 > 最终决定",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md",
              "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Objective; Requirements; Boundaries; Technical Route",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml",
              "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml#cycle.summary and cycle.lessons",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md",
              "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md#改动摘要 and Milestones C19-M1 through C19-M3",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
              "ref": "legacy:C15/cycle#cycle.lessons: P2 technical route review",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
              "ref": "legacy:C15/summary#Milestones: C15-M1 P2 Technical Route Gate",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "current_cycle_context",
        "sources": [
          {
            "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f",
            "locator": ".pipeline/architecture.md",
            "ref": ".pipeline/architecture.md#Delivery Lifecycle; Command Exposure",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:6bcd75b6ee985ecbc09b6102646c3fe1301ed1a54c25e6b6cb95e653837018a3",
            "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml",
            "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.summary",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:22f1da7307359f10872686a3dca085b5ff2576550269ddb76dc984464e9e24d9",
            "locator": ".pipeline/archives/C10-experience-optimizations/summary.md",
            "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Milestones M0",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:de025e24bb8312b5c0f0e35cabe43297c4a169812764df83f82639374f304d93",
            "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml",
            "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.lessons[1]",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:40ec925c5ff4316ca0eba2532bf24f400a9b8edbff30ffbfe19dd47cf820c62c",
            "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
            "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M2",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:7240d551caad5116ea0e448c1092a7a2d5a3fea26335c6e2b619e698d5ab0a1c",
            "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md",
            "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#里程碑 M0-M7 and 关键数据 > 最终决定",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:4c56d9c91289fa119f763bee29a057cf4ea2af205f8eed2ca4ecf0d13884239c",
            "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md",
            "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Objective; Requirements; Boundaries; Technical Route",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:1c00713e7b2e0948fb165327d752e9e4153eea5bed42b7f2a57f61b7f237fb7d",
            "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml",
            "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml#cycle.summary and cycle.lessons",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:2aed4c2e87f9c92487a5629685f9e5dd4f66b28047a0453ead877badae9bcfc4",
            "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md",
            "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md#改动摘要 and Milestones C19-M1 through C19-M3",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:3557a2f487294bb26d020d41de5468934fcad4560e941ca5d553e508da9dc4fc",
            "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
            "ref": "legacy:C15/cycle#cycle.lessons: P2 technical route review",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d",
            "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
            "ref": "legacy:C15/summary#Milestones: C15-M1 P2 Technical Route Gate",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C10-C19 preserve configuration, abstraction, visible-gate, named-phase, and durable-research lessons; the confirmed M6 route integrates them adaptively instead of retaining fixed overhead or separate public phase commands.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-m7-maintain-codex-hook-route",
        "record_patch": {
          "body": "C21-M7 implements ambient Maintain and the primary Codex adapter. Maintain records meaningful Journal/Inbox/Record deltas without taking a workflow pointer; optional cheap recorder workers return proposals only. Thin adapters cover SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SubagentStart, SubagentStop, and Stop; they inject bounded context, collect evidence, seal/restore Packs, and emit targeted deduplicated documentation/Record reminders. Hooks never infer authority or become the sole deletion boundary. Deletion requires a hashed Manifest, scoped Receipt, controlled executor and drift revalidation. OpenCode/Claude adapters, aggregate telemetry, cleanup execution, generic scheduling, and quota automation are out of M7 scope.",
          "confidence": "high",
          "created_at": "2026-07-11T20:49:59+08:00",
          "dedupe_key": "project:c21:m7-maintain-codex-hook-route",
          "kind": "requirement",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/architecture.md",
              "ref": ".pipeline/architecture.md#Codex Adapter Boundary",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md",
              "ref": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md#Objective; Requirements; Boundaries; Technical Solution",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-11T20:49:59+08:00"
        },
        "reviewed": true,
        "source_class": "current_cycle_context",
        "sources": [
          {
            "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f",
            "locator": ".pipeline/architecture.md",
            "ref": ".pipeline/architecture.md#Codex Adapter Boundary",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:3378b14eb346eba879b0d0db69a3e3306ddd39ca143f37692e7cae3d392299db",
            "locator": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md",
            "ref": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md#Objective; Requirements; Boundaries; Technical Solution",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "M7 is Ambient Maintain plus the Codex Hook adapter, targeted reminders, recorder proposals, compact recovery and controlled deletion; OpenCode/Claude and telemetry remain out of scope. Material future-decision risk: Without the exact M7 boundary, Maintain could become another state machine, Hooks could fabricate authority, deletion could rely on incomplete interception, or unsupported platforms could be claimed.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-m8-cleanup-deletion-gate-route",
        "record_patch": {
          "body": "C21-M8 starts only after M7 by rescanning the live dependency graph and classifying each candidate as delete, retain_internal, or deferred_hidden. It may generate the complete Deletion Manifest but may not delete anything until the full decision context is shown in chat and the user issues a fresh exact deletion.execute Receipt. Any path hash or relevant Git-state drift invalidates the Receipt. The controlled batch must remove registry/generator sources before derived artifacts, prove regeneration cannot revive removed or deferred surfaces, preserve unrelated changes, update the Codex-facing package/docs, run behavior-based Skill evaluations and full regression, and finish with independent audit. C21 itself still closes through manual acceptance after M8; no Deletion Manifest approval can be inferred from general Cycle authorization.",
          "confidence": "high",
          "created_at": "2026-07-11T20:39:36+08:00",
          "dedupe_key": "project:c21:m8-cleanup-deletion-gate-route",
          "kind": "requirement",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/prompts/07-surface-cleanup-deletion-gate-and-release-ready-regression.md",
              "ref": ".pipeline/prompts/07-surface-cleanup-deletion-gate-and-release-ready-regression.md#Objective; Hard Gate; Requirements; Technical Route",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
              "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#仓库清理",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-11T20:39:36+08:00"
        },
        "reviewed": true,
        "source_class": "current_cycle_context",
        "sources": [
          {
            "digest": "sha256:e07ca324a409436f6e540709b1fbb88f287e20945762ed50a88f4b254328de6c",
            "locator": ".pipeline/prompts/07-surface-cleanup-deletion-gate-and-release-ready-regression.md",
            "ref": ".pipeline/prompts/07-surface-cleanup-deletion-gate-and-release-ready-regression.md#Objective; Hard Gate; Requirements; Technical Route",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:887400607034b2c01edbac1e85f408f83352d426996b8657ee5f041cd4ed7224",
            "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
            "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#仓库清理",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "M8 owns post-M7 rescan, candidate classification, complete Deletion Manifest, fresh exact deletion Receipt, controlled batch, regeneration non-revival, evaluations, full regression and final audit; the prompt itself does not authorize deletion. Material future-decision risk: Without this exact gate, stale deletion candidates could be executed, user authorization could be inferred from the Cycle, or generators could revive removed surfaces after cleanup.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-nine-command-surface",
        "record_patch": {
          "body": "The authoritative C21 public/contextual discovery surface contains exactly /hw:guide, /hw:init, /hw:goal, /hw:plan, /hw:cycle, /hw:maintain, /hw:resume, /hw:accept, and /hw:reject. User-visible commands must be registered in the authoritative registry; generated documentation, adapters, and command-inventory tests are projections of that registry. Chat, Explain, Status, Report, Log, Check, Compact, Knowledge, consistency Sync, Debug, explicit start, and Plan phases are natural/internal behavior. Setup, Rules, Stop command, Skip, Reset, Showcase, Patch, Help, Watchdog, and plan-confirm remain M8 removal candidates. Deferred or removal-candidate capabilities must not be advertised as executable backends.",
          "confidence": "high",
          "created_at": "2026-07-11T20:24:08+08:00",
          "dedupe_key": "project:commands:c21-nine-command-public-surface",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/architecture.md",
              "ref": ".pipeline/architecture.md#Command Exposure",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml",
              "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.lessons[0:2]",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md",
              "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Requirements; Audit Focus",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f",
            "locator": ".pipeline/architecture.md",
            "ref": ".pipeline/architecture.md#Command Exposure",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:6bcd75b6ee985ecbc09b6102646c3fe1301ed1a54c25e6b6cb95e653837018a3",
            "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml",
            "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.lessons[0:2]",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:4c56d9c91289fa119f763bee29a057cf4ea2af205f8eed2ca4ecf0d13884239c",
            "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md",
            "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Requirements; Audit Focus",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C10 established registry/projection synchronization; the confirmed C21 architecture narrows discovery to nine commands and defers deletion to M8.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-recovery-journal-capsule-pack",
        "record_patch": {
          "body": "Recovery uses an append-only object Journal of explicit rationale/evidence summaries, a derived and rebuildable Context Capsule, and a validated Recovery Pack with cursor, hashes, continuation, relevant Records, evidence, and bounded recent context. Hidden chain-of-thought, scratchpads, raw transcripts, and secret values never become authority. Transcript input is optional convenience only. If the newest Pack is invalid, restore a valid ancestor and replay the required Journal delta. Detailed recovery data stays local/ignored; future telemetry may aggregate redacted events but cannot change recovery correctness semantics.",
          "confidence": "high",
          "created_at": "2026-07-11T20:49:59+08:00",
          "dedupe_key": "project:recovery:journal-capsule-pack-authority",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/architecture.md",
              "ref": ".pipeline/architecture.md#Recovery Flow",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/C21-recovery-journal-compaction-design.md",
              "ref": ".pipeline/reports/C21-recovery-journal-compaction-design.md#核心判断; Recovery Journal; Incremental Context Capsule; Recovery Pack; 存储与隐私",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-11T20:49:59+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f",
            "locator": ".pipeline/architecture.md",
            "ref": ".pipeline/architecture.md#Recovery Flow",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:c6c1c111745827db005ce0ddc88b45587a64c205fcfabee024211f42814281ec",
            "locator": ".pipeline/reports/C21-recovery-journal-compaction-design.md",
            "ref": ".pipeline/reports/C21-recovery-journal-compaction-design.md#核心判断; Recovery Journal; Incremental Context Capsule; Recovery Pack; 存储与隐私",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "The confirmed recovery design uses explicit Journal summaries, derived Capsules, validated Packs and fallback; it excludes hidden reasoning, treats transcripts as optional convenience, and keeps telemetry as a later aggregation concern. Material future-decision risk: Without the recovery boundary, future compact/resume work could depend on unstable transcripts, persist secrets, or let a derived Capsule overwrite authority.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-risk-based-worker-separation",
        "record_patch": {
          "body": "Use separated test, implementation, and audit identities for material work, preserving review artifacts and retry evidence; never silently downgrade a prompt that requires separation. Worker input separates the host-rule envelope from task-specific checks, and unavailable worker support must produce an explicit governed fallback. Small reversible changes may use solo-verified only when policy selects it. Migration additionally uses read-only Extractors, a proposal-only Curator, an independent Auditor, and one deterministic writer; proposal workers cannot write authoritative Records.",
          "confidence": "high",
          "created_at": "2026-07-11T20:24:08+08:00",
          "dedupe_key": "project:execution:risk-based-worker-separation",
          "kind": "requirement",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/architecture.md",
              "ref": ".pipeline/architecture.md#Worker Separation; Bootstrap Cutover",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml",
              "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.summary",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.lessons[2]",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M4",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md",
              "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Milestones / M04-M06 and Review Evidence",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md",
              "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Requirements; Technical Route item 8",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "cross_cycle_constraint",
        "sources": [
          {
            "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f",
            "locator": ".pipeline/architecture.md",
            "ref": ".pipeline/architecture.md#Worker Separation; Bootstrap Cutover",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:6bcd75b6ee985ecbc09b6102646c3fe1301ed1a54c25e6b6cb95e653837018a3",
            "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml",
            "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.summary",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:de025e24bb8312b5c0f0e35cabe43297c4a169812764df83f82639374f304d93",
            "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml",
            "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.lessons[2]",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:40ec925c5ff4316ca0eba2532bf24f400a9b8edbff30ffbfe19dd47cf820c62c",
            "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
            "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M4",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:d56b1755c6f898a0c4c88edf1be241d72296d36f9f49debf55f47e3340eb7f9a",
            "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md",
            "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Milestones / M04-M06 and Review Evidence",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:4c56d9c91289fa119f763bee29a057cf4ea2af205f8eed2ca4ecf0d13884239c",
            "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md",
            "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Requirements; Technical Route item 8",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C8-C11 established review evidence, worker governance, two-layer context, and degradation rules; C21 makes role separation risk-based and mandatory for material work.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-scoped-directives-and-grants",
        "record_patch": {
          "body": "The generic Rules command and generic Structured Rules authority are retired from the product contract and remain M8 cleanup candidates. User-stated requirements, preferences, feedback, authorization scope, and turn- or Delivery-scoped constraints remain supported at their actual scope: confirmed durable facts become individual Records, while user confirmation, execution grants, and dangerous-operation grants use actor-, scope-, plan-hash-, expiry-, and consumption-bound Receipts. Adapters and Markdown guidance are projections and cannot become competing authority. A scoped constraint or grant must not be silently promoted into a permanent global rule.",
          "confidence": "high",
          "created_at": "2026-07-11T20:24:08+08:00",
          "dedupe_key": "project:authority:user-directives-and-grants",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/architecture.md",
              "ref": ".pipeline/architecture.md#Command Exposure",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md",
              "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
              "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#兼容策略",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/C21-unified-architecture-design.md",
              "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f",
            "locator": ".pipeline/architecture.md",
            "ref": ".pipeline/architecture.md#Command Exposure",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:49e3b2c2e98a5610b280c3ae08bf83a9197976f4c6fc89857b5495decbb31e39",
            "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md",
            "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:887400607034b2c01edbac1e85f408f83352d426996b8657ee5f041cd4ed7224",
            "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
            "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#兼容策略",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:a833151c2e9f4a95e250f2c9af46645ea3b735fea92b1da9bc9c02080a96b196",
            "locator": ".pipeline/reports/C21-unified-architecture-design.md",
            "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
            "type": "legacy_file"
          }
        ],
        "supersedes": [
          "history-structured-rules-authority"
        ],
        "support": {
          "statement": "The confirmed C21 authority design routes Requirements, Preferences, Grants, confirmed authorization scope, and dangerous-operation authorization to Records or scoped Receipts; Command Exposure and cutover compatibility explicitly classify generic Rules as an M8 cleanup candidate.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-skill-first-single-authority",
        "record_patch": {
          "body": "Hypo-Workflow is a Skill-first protocol and control layer, not a runner. The host Agent performs reasoning, implementation, testing, and review; deterministic Core owns schema, transactions, Records, Receipts, recovery, lifecycle transitions, adapter payloads, and mechanical gates. Every fact has one authority. Platform adapters only project behavior. Runtime and memory are local/ignored; accepted or explicit checkpoint Snapshots may enter Git. A valid new manifest selects the new writer, while a damaged manifest fails closed and never falls back to legacy writers.",
          "confidence": "high",
          "created_at": "2026-07-11T20:24:08+08:00",
          "dedupe_key": "project:architecture:skill-first-single-authority",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/architecture.md",
              "ref": ".pipeline/architecture.md#Product Boundary; Physical Layout",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/C21-unified-architecture-design.md",
              "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-11T20:24:08+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f",
            "locator": ".pipeline/architecture.md",
            "ref": ".pipeline/architecture.md#Product Boundary; Physical Layout",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:a833151c2e9f4a95e250f2c9af46645ea3b735fea92b1da9bc9c02080a96b196",
            "locator": ".pipeline/reports/C21-unified-architecture-design.md",
            "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
            "type": "legacy_file"
          }
        ],
        "supersedes": [
          "history-legacy-local-authority"
        ],
        "support": {
          "statement": "The confirmed architecture defines a Skill-first protocol, one authority per fact, deterministic Core ownership of mechanical state, projection-only adapters, local runtime/memory, Git-eligible accepted or checkpoint Snapshots, and fail-closed manifest selection. Material future-decision risk: Without this boundary, a future implementation could turn Hypo-Workflow into a runner, duplicate authority across files, or let platform adapters own state.",
          "status": "confirmed"
        }
      },
      {
        "active": false,
        "current": false,
        "future_decision_risk": "material",
        "key": "c21-current-stash-git-snapshot-draft",
        "record_patch": {
          "body": "Historical, superseded C21 draft: implement Workflow Stash by saving a Git workspace snapshot and restoring it later. This is not current and must not guide implementation.",
          "confidence": "high",
          "created_at": "2026-07-11T20:09:41+08:00",
          "dedupe_key": "project:stash:implementation-model",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md",
              "ref": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md#状态: 取代",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-11T20:09:41+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:e68db327b0b432f87292aec63b5211d07309424509336e7c13b4252df75444e4",
            "locator": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md",
            "ref": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md#状态: 取代",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "The confirmed Stash report explicitly identifies and replaces the early proposal to save and restore a Git workspace snapshot. Material future-decision risk: Omitting the superseded draft would make the active Stash contract's explicit replacement edge impossible to reconstruct and could reintroduce code snapshot semantics.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "c21-current-stash-suspend-reconciliation",
        "record_patch": {
          "body": "The deferred Workflow Stash model is Checkpoint + Suspend + Blocking Delivery + Reconciliation, not git stash or a code snapshot. Push records Workflow contracts, evidence, remaining work, blocker, resume condition, HEAD and dirty paths while leaving the worktree in place and warning about overlap risk. Pop waits for the blocker condition, reads the accepted new baseline, creates a Resume Merge Plan, reconciles old assumptions forward, updates affected Milestones and verification, and preserves history. Adaptive mode auto-resolves only low-ambiguity mappings and asks on semantic conflict; strict mode requires approval for every contract difference. Failed reconciliation remains recoverable rather than pretending restoration succeeded.",
          "confidence": "high",
          "created_at": "2026-07-11T20:09:41+08:00",
          "dedupe_key": "project:stash:implementation-model",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md",
              "ref": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md#已确认的产品模型; push 记录什么; pop 语义; 冲突策略",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-11T20:09:41+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:e68db327b0b432f87292aec63b5211d07309424509336e7c13b4252df75444e4",
            "locator": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md",
            "ref": ".pipeline/reports/C21-stash-suspend-reconciliation-design.md#已确认的产品模型; push 记录什么; pop 语义; 冲突策略",
            "type": "legacy_file"
          }
        ],
        "supersedes": [
          "c21-current-stash-git-snapshot-draft"
        ],
        "support": {
          "statement": "The confirmed deferred design defines Stash as Checkpoint plus Suspension plus Blocking Delivery plus forward Reconciliation, with adaptive/strict conflict policy and no code snapshot. Material future-decision risk: Without this accepted replacement, later Stash implementation could call git stash, overwrite an accepted new baseline, discard conflicts, or pretend state-only suspension protects dirty code.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "curated-analysis-durable-lane-and-boundaries",
        "record_patch": {
          "body": "Analysis remains a durable, recoverable investigation lane rather than disposable chat or a Test Profile. It records the question, evidence, conclusion, and next action without converting investigation into Delivery work. Manual mode denies code edits, hybrid mode proposes and requires confirmation, and auto mode may edit only inside configured boundaries. Disproving a hypothesis is valid progress; quality is judged by evidence, traceability, and any required verification.",
          "confidence": "high",
          "created_at": "2026-05-16T12:40:46+08:00",
          "dedupe_key": "project:analysis:durable-lane-and-execution-boundaries",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md",
              "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L129-L159",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md",
              "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L35-L45;L84-L103",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md",
              "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md#L25-L26",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md",
              "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md#L27-L31",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
              "ref": "legacy:C15/cycle#cycle.summary: /hw:analysis recovery",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
              "ref": "legacy:C15/summary#Milestones: C15-M3 Interactive Analysis State And Command Entry",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:6947315c6ff511b5e30fc4cce444a47ada44afcd42433748ec71fb6e30a52e3c",
            "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md",
            "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L129-L159",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:6947315c6ff511b5e30fc4cce444a47ada44afcd42433748ec71fb6e30a52e3c",
            "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md",
            "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L35-L45;L84-L103",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:44d9dcac0d6c4cf722ad6db3019ffc518a57d24149e1322775e6ace73fe2367a",
            "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md",
            "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md#L25-L26",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:44d9dcac0d6c4cf722ad6db3019ffc518a57d24149e1322775e6ace73fe2367a",
            "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md",
            "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md#L27-L31",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:3557a2f487294bb26d020d41de5468934fcad4560e941ca5d553e508da9dc4fc",
            "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
            "ref": "legacy:C15/cycle#cycle.summary: /hw:analysis recovery",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d",
            "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
            "ref": "legacy:C15/summary#Milestones: C15-M3 Interactive Analysis State And Command Entry",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C3 defined execution boundaries and disproof semantics; C15 made Analysis a recoverable first-class lane. C21 may hide it from discovery without discarding these semantics.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "curated-completion-report-substance-in-conversation",
        "record_patch": {
          "body": "User-visible completion responses state the conclusion, change, approach, affected surfaces, test design, validation result, expected result, problems, residual risks, and next action in the conversation. Artifact paths support the explanation but never substitute for it, so the result remains understandable from another Agent or chat surface.",
          "confidence": "high",
          "created_at": "2026-05-16T12:40:46+08:00",
          "dedupe_key": "project:ux:completion-report-substance-in-conversation",
          "kind": "preference",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M1",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
              "ref": "legacy:C15/summary#Milestones: C15-M2 Detailed Completion Report Contract",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "active_requirement",
        "sources": [
          {
            "digest": "sha256:40ec925c5ff4316ca0eba2532bf24f400a9b8edbff30ffbfe19dd47cf820c62c",
            "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
            "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M1",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d",
            "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
            "ref": "legacy:C15/summary#Milestones: C15-M2 Detailed Completion Report Contract",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C11 established a conclusion/explanation/next-step response, and C15 strengthened it into the detailed in-conversation completion report contract.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "curated-external-effects-and-release-evidence",
        "record_patch": {
          "body": "Do not treat local contracts, dry runs, or source-side completion as proof of a remote effect. Remote PR/MR and notification claims require an appropriate provider acknowledgement without persisting private payloads; target release additionally requires an explicit version/tag choice and inspection of both local and remote state before publication.",
          "confidence": "high",
          "created_at": "2026-05-21T01:30:00+08:00",
          "dedupe_key": "project:validation:external-effects-and-release-evidence",
          "kind": "feedback",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C10-experience-optimizations/summary.md",
              "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Key Data > Warnings",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml",
              "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml#cycle.lessons",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
              "ref": "legacy:C16/summary#Completion notes: QQ delivery evidence failure and correction",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "important_feedback_failure",
        "sources": [
          {
            "digest": "sha256:22f1da7307359f10872686a3dca085b5ff2576550269ddb76dc984464e9e24d9",
            "locator": ".pipeline/archives/C10-experience-optimizations/summary.md",
            "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Key Data > Warnings",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:1c00713e7b2e0948fb165327d752e9e4153eea5bed42b7f2a57f61b7f237fb7d",
            "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml",
            "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml#cycle.lessons",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:0461a6ae961657c850fb1019fa40f097cfcec9e0eafa1b392e9e655fdb9ffb19",
            "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
            "ref": "legacy:C16/summary#Completion notes: QQ delivery evidence failure and correction",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C10 lacked a real remote PR/MR smoke, C16 corrected a notification claim with provider evidence, and C19 requires explicit target release and repository-state gates.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "curated-high-impact-gates-and-scoped-automation",
        "record_patch": {
          "body": "Destructive or external operations, plugin installation, user-level configuration writes, remote PR/MR writes, Release publication, and remote clone/download require explicit, scope-bound human authorization. Local preparation without remote effects may precede the gate. Durable automation preferences cannot silently waive these boundaries; current authorization is represented by exact, single-use, drift-sensitive Receipts rather than a broad whitelist flag.",
          "confidence": "high",
          "created_at": "2026-07-12T02:42:16+08:00",
          "dedupe_key": "project:safety:high-impact-gates-and-scoped-automation",
          "kind": "requirement",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C10-experience-optimizations/summary.md",
              "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Milestones M2",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.summary",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M3",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md",
              "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#关键数据 > 已知限制",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
              "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates and cycle.lessons[1]",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
              "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md",
              "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "active_requirement",
        "sources": [
          {
            "digest": "sha256:22f1da7307359f10872686a3dca085b5ff2576550269ddb76dc984464e9e24d9",
            "locator": ".pipeline/archives/C10-experience-optimizations/summary.md",
            "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Milestones M2",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:de025e24bb8312b5c0f0e35cabe43297c4a169812764df83f82639374f304d93",
            "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml",
            "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.summary",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:40ec925c5ff4316ca0eba2532bf24f400a9b8edbff30ffbfe19dd47cf820c62c",
            "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
            "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M3",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:7240d551caad5116ea0e448c1092a7a2d5a3fea26335c6e2b619e698d5ab0a1c",
            "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md",
            "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#关键数据 > 已知限制",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:c84dfa32eddb2754e10e656648a0bb185113db10d9053961279c8f7cc63591c4",
            "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
            "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates and cycle.lessons[1]",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:c84dfa32eddb2754e10e656648a0bb185113db10d9053961279c8f7cc63591c4",
            "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
            "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:49e3b2c2e98a5610b280c3ae08bf83a9197976f4c6fc89857b5495decbb31e39",
            "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md",
            "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C9-C12 consistently preserve explicit high-impact gates; C11 automation does not waive them, and C21 M2 provides the current scoped Receipt mechanism.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "curated-lifecycle-transaction-and-derived-coherence",
        "record_patch": {
          "body": "Lifecycle mutations use deterministic transaction and invariant checks, and every derived active, prompt, or continuation pointer must be regenerated coherently with the authoritative object update. Resume must reject or repair a mismatched authority/projection pair and use validated Recovery Packs for bounded restoration. Historical lease, watchdog, and platform-handoff details are not promoted as current authority.",
          "confidence": "high",
          "created_at": "2026-07-12T00:21:05+08:00",
          "dedupe_key": "project:lifecycle:transaction-and-derived-coherence",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/summary.md",
              "ref": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/summary.md#Milestone 摘要 / M03, M07, M08",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md",
              "ref": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md#Completion Narrative; Delivered Architecture; Test Results",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md",
              "ref": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md#Completion Narrative; Delivered Architecture; Architecture Plan Review",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
              "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Pitfalls: C4-M05 state/prompt_state drift",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:4ac1e165daea0e092035278b90fb258b450cb37c85df23e5bc2be05d536ef888",
            "locator": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/summary.md",
            "ref": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/summary.md#Milestone 摘要 / M03, M07, M08",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:66ef1909b4e7b399e3bd9a813ec46e226bbeeb68960413f79eced1737906b77f",
            "locator": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md",
            "ref": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md#Completion Narrative; Delivered Architecture; Test Results",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:e5c90d68c4ffb237d9091d4d1e8cbf646742c7a48f9063a84b27a67814edbc41",
            "locator": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md",
            "ref": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md#Completion Narrative; Delivered Architecture; Architecture Plan Review",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177",
            "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
            "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Pitfalls: C4-M05 state/prompt_state drift",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C5 required transactional lifecycle refresh, a prior state/prompt drift demonstrated the failure mode, and C21 M1/M3 provide the current transaction and Pack recovery primitives.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "curated-platform-adapter-contracts",
        "record_patch": {
          "body": "Future non-Codex adapter work starts from a current capability/interface map and validates the exact host schema instead of assuming parity. Claude integrations expose Workflow under /hw:* and must keep native /resume separate from /hw:resume; settings merges preserve backup/conflict evidence and each hook is validated for its event and exit-code contract. OpenCode user-visible commands require its current native registration surface as well as internal dispatch. These are deferred adapter requirements, not a claim that Claude or OpenCode is a current C21 backend.",
          "confidence": "high",
          "created_at": "2026-05-14T23:30:00+08:00",
          "dedupe_key": "project:adapters:capability-map-native-registration-and-hook-semantics",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/knowledge-summary.md",
              "ref": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/knowledge-summary.md#Pitfalls / C6-SYNC-claude-opencode-codex-interface-map-20260505",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/summary.md",
              "ref": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/summary.md#Cycle summary and Milestone 摘要 / M02-M04",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
              "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lessons[2]",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md",
              "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md#Summary and Milestones M09-M10",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
              "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#后续 Cycle; 当前版本目标; 兼容策略",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
              "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Dependencies, Pitfalls, and Decisions: C6-SYNC interface map",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C13-opencode-ux-enhancement/cycle.yaml",
              "ref": "legacy:C13/cycle#cycle.status",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C13-opencode-ux-enhancement/summary.md",
              "ref": "legacy:C13/summary#Knowledge summary: OpenCode command registration",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:f130563b3e11707b085ac6b13ca6c671423a9478062b9e7a13e4fb762df3e662",
            "locator": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/knowledge-summary.md",
            "ref": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/knowledge-summary.md#Pitfalls / C6-SYNC-claude-opencode-codex-interface-map-20260505",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:33084ae677b3150a4ff87e4df5245fa4919e5159da485a53eee4a1e07423fe06",
            "locator": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/summary.md",
            "ref": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/summary.md#Cycle summary and Milestone 摘要 / M02-M04",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:c84dfa32eddb2754e10e656648a0bb185113db10d9053961279c8f7cc63591c4",
            "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
            "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lessons[2]",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:4707185cf23e13e592e4c41460094ea3903ab4d66111a0d72a2c1b61e3b34dbd",
            "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md",
            "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md#Summary and Milestones M09-M10",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:887400607034b2c01edbac1e85f408f83352d426996b8657ee5f041cd4ed7224",
            "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
            "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#后续 Cycle; 当前版本目标; 兼容策略",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177",
            "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
            "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Dependencies, Pitfalls, and Decisions: C6-SYNC interface map",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:a1be3e72f3aac6a8400872644b5ff16e7b455c1925d5817be0552af5150b8269",
            "locator": ".pipeline/archives/C13-opencode-ux-enhancement/cycle.yaml",
            "ref": "legacy:C13/cycle#cycle.status",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:30c553b93643d19dda609c0b2a6687a93049214fe82794027f8ef80e2277977c",
            "locator": ".pipeline/archives/C13-opencode-ux-enhancement/summary.md",
            "ref": "legacy:C13/summary#Knowledge summary: OpenCode command registration",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C6, C9, C13, and C20 preserve concrete Claude/OpenCode integration failures and contracts; the C21 roadmap explicitly defers those adapters, requiring later current-schema verification.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "curated-validation-selection-localization-and-installation",
        "record_patch": {
          "body": "Validation derives expected command inventory from authority, uses language-aware assertions, proves that focused selectors changed the executed scenario set, and checks installed Skill bundles plus shared asset references against the source version. A green source-only or selector-ambiguous run does not establish the intended runtime contract.",
          "confidence": "high",
          "created_at": "2026-05-15T18:00:00+08:00",
          "dedupe_key": "project:validation:dynamic-selection-localization-installed-freshness",
          "kind": "requirement",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C14-prompt-compatibility-audit/cycle.yaml",
              "ref": "legacy:C14/cycle#cycle.status",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C14-prompt-compatibility-audit/summary.md",
              "ref": "legacy:C14/summary#Key data: bilingual i18n regex and dynamic command count tests",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
              "ref": "legacy:C15/cycle#cycle.lessons: focused regression flags",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
              "ref": "legacy:C15/cycle#cycle.lessons: installed Codex skill bundle freshness",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
              "ref": "legacy:C15/summary#Completion notes: regression runner scenario filter defect",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
              "ref": "legacy:C15/summary#Completion notes: shared asset and installed bundle failures",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "cross_cycle_constraint",
        "sources": [
          {
            "digest": "sha256:777a663378547e4fd5b7bd71595ded1f2db4df968ef12ec475c371341c63ec1a",
            "locator": ".pipeline/archives/C14-prompt-compatibility-audit/cycle.yaml",
            "ref": "legacy:C14/cycle#cycle.status",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:11befe836f3e4ad7a2256a775db010259466954cf0a6a8908cdc46c5c7cca505",
            "locator": ".pipeline/archives/C14-prompt-compatibility-audit/summary.md",
            "ref": "legacy:C14/summary#Key data: bilingual i18n regex and dynamic command count tests",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:3557a2f487294bb26d020d41de5468934fcad4560e941ca5d553e508da9dc4fc",
            "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
            "ref": "legacy:C15/cycle#cycle.lessons: focused regression flags",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:3557a2f487294bb26d020d41de5468934fcad4560e941ca5d553e508da9dc4fc",
            "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
            "ref": "legacy:C15/cycle#cycle.lessons: installed Codex skill bundle freshness",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d",
            "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
            "ref": "legacy:C15/summary#Completion notes: regression runner scenario filter defect",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d",
            "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
            "ref": "legacy:C15/summary#Completion notes: shared asset and installed bundle failures",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C14-C15 recorded false-confidence failures from frozen command counts, monolingual matchers, ignored focused selectors, and stale installed Skill bundles.",
          "status": "confirmed"
        }
      },
      {
        "active": true,
        "current": true,
        "future_decision_risk": "material",
        "key": "explore-worktree-isolation-and-dirty-gate",
        "record_patch": {
          "body": "Explore 工作必须使用隔离 worktree、执行 dirty gate，并保持并行探索互不污染；不能直接把探索写入主项目工作树。",
          "confidence": "confirmed",
          "created_at": "2026-07-12T07:00:44+08:00",
          "dedupe_key": "project:hypo-workflow:explore-worktree-isolation-and-dirty-gate",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md",
              "ref": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md#L28-L29",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T07:00:44+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:b5ce0490a8d08138b311ec07a75b1567e01037242c8fe4dbb30de391d512c4bb",
            "locator": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md",
            "ref": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md#L28-L29",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": "observed"
      },
      {
        "active": false,
        "current": "history_needed",
        "future_decision_risk": "material",
        "key": "history-legacy-local-authority",
        "record_patch": {
          "body": "Historical authority model: legacy root Workflow state and local stores were treated as protected or authoritative, while remote systems were gated adapters. The C16 source was delivered but not human-accepted. This history is retained only to show what the C21 Skill-first single-authority architecture replaces.",
          "confidence": "high",
          "created_at": "2026-05-21T01:30:00+08:00",
          "dedupe_key": "project:architecture:skill-first-single-authority",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C2-new-cycle/architecture-snapshot.md",
              "ref": ".pipeline/archives/C2-new-cycle/architecture-snapshot.md#L8-L9",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md",
              "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L8-L9",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C16-root-project-management-mode/cycle.yaml",
              "ref": "legacy:C16/cycle#cycle.status and cycle.acceptance.state",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
              "ref": "legacy:C16/summary#Completion notes: technical approach and authority boundary",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:a0bdf90e6c6b371a76f960531063b5cabdb57bcd81775fdd3b11268908f955f1",
            "locator": ".pipeline/archives/C2-new-cycle/architecture-snapshot.md",
            "ref": ".pipeline/archives/C2-new-cycle/architecture-snapshot.md#L8-L9",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:6947315c6ff511b5e30fc4cce444a47ada44afcd42433748ec71fb6e30a52e3c",
            "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md",
            "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L8-L9",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:d90f2e1c5ac3aa5cdc6a1340b820329ab8d90017f17aa1ceed2c5c0f7d0d404c",
            "locator": ".pipeline/archives/C16-root-project-management-mode/cycle.yaml",
            "ref": "legacy:C16/cycle#cycle.status and cycle.acceptance.state",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:0461a6ae961657c850fb1019fa40f097cfcec9e0eafa1b392e9e655fdb9ffb19",
            "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
            "ref": "legacy:C16/summary#Completion notes: technical approach and authority boundary",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C2-C3 protected legacy root state and C16 proposed local authority with gated remote adapters; C16 remained pending acceptance.",
          "status": "confirmed"
        }
      },
      {
        "active": false,
        "current": "history_needed",
        "future_decision_risk": "material",
        "key": "history-structured-rules-authority",
        "record_patch": {
          "body": "Historical model through C20: generic Structured Rules/Habits were treated as behavior authority and Markdown/platform instructions as derived views. This history is inactive and retained only so the C21 replacement is explicit.",
          "confidence": "high",
          "created_at": "2026-07-12T07:00:47+08:00",
          "dedupe_key": "project:authority:user-directives-and-grants",
          "kind": "decision",
          "scope": {
            "ref": "project:hypo-workflow",
            "type": "project"
          },
          "source_refs": [
            {
              "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md",
              "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md#Decisions / C8-PLAN-domain-pack-boundary-and-review-rules-20260506",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md",
              "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Summary and Milestones / M01-M03",
              "type": "legacy_file"
            },
            {
              "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
              "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Decisions: C8-PLAN structured Rules/Habits authority",
              "type": "legacy_file"
            }
          ],
          "supersedes": [],
          "updated_at": "2026-07-12T08:15:40+08:00"
        },
        "reviewed": true,
        "source_class": "architecture_decision",
        "sources": [
          {
            "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177",
            "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md",
            "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md#Decisions / C8-PLAN-domain-pack-boundary-and-review-rules-20260506",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:d56b1755c6f898a0c4c88edf1be241d72296d36f9f49debf55f47e3340eb7f9a",
            "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md",
            "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Summary and Milestones / M01-M03",
            "type": "legacy_file"
          },
          {
            "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177",
            "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
            "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Decisions: C8-PLAN structured Rules/Habits authority",
            "type": "legacy_file"
          }
        ],
        "supersedes": [],
        "support": {
          "statement": "C8 established Structured Rules/Habits authority and the C20 compact preserves it while warning that C21 must explicitly reconcile it.",
          "status": "confirmed"
        }
      }
    ],
    "schema_version": "1",
    "worker": {
      "id": "m5-curator-c21",
      "role": "curator"
    },
    "semantic_hash": "bd4b0ac0932e0b7f3a2951d67cbc23d6f1a0fcfe24d7934d394d61511abdd3c9"
  },
  "audit": {
    "authority_role": "proposal",
    "bootstrap_job_ref": {
      "id": "c21-reference-bootstrap",
      "kind": "bootstrap_job"
    },
    "curation_hash": "bd4b0ac0932e0b7f3a2951d67cbc23d6f1a0fcfe24d7934d394d61511abdd3c9",
    "findings": [],
    "proposal_kind": "bootstrap_audit",
    "schema_version": "1",
    "status": "approved",
    "worker": {
      "id": "m5-independent-auditor",
      "role": "auditor"
    },
    "semantic_hash": "2f47824d8f12aad4d245589d2b8582e14a97b51f88f68f191869179882a7f4c8"
  }
}
```
<!-- C21_M5_APPROVED_BINDING_END -->

## 生产链路

| 阶段 | 独立结果 |
|---|---|
| durable-history extraction | `ec75abb5f24b2982d2f5560286c07c1e72ee83a974353fc9725103342591e35d` |
| current-C21 extraction | `9f9776cfe5f7e3d92315383ebeed2a3494d79d651875c483f57aa0c86f3ad25b` |
| merge | `784c310330c9621ca75b3facad35febfb4473328ad4c8f269feb85cfa9189251` |
| reverse-order merge | 与正序 byte/semantic 等价 |
| curation | `bd4b0ac0932e0b7f3a2951d67cbc23d6f1a0fcfe24d7934d394d61511abdd3c9` |
| production audit | `approved` / `[]` / `2f47824d8f12aad4d245589d2b8582e14a97b51f88f68f191869179882a7f4c8` |

两个 extraction proposal 均为 `authority_role: proposal`，分别是 `26 included / 0 excluded` 与 `16 included / 0 excluded`。merge 为 42 条；Curator 与 Auditor 的 worker role 由生产 API 强制隔离。

## 独立复算

### 来源、路径与摘要

- Outer source refs: `124/124` 可解析且与 `record_patch.source_refs` 在 type/ref/locator/order 上精确对应。
- Unique locators: `56/56`；累计读取 `226007` bytes。
- `56/56` 为仓库内 repo-relative regular file；所有路径组件均非 symlink，无 `..`、绝对路径、containment escape 或 unreadable entry。
- `56/56` 当前 SHA-256 与候选声明一致；同 locator 无冲突 digest。
- 冻结后的 `.pipeline/cycle.yaml` 使用 `d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb`。

### Schema 与候选图

- Records: `42`；active: `39`；inactive history: `3`；dedupe groups: `39`。
- Record kinds: `25 decision / 10 requirement / 6 feedback / 1 preference`。
- Source classes: `17 architecture_decision / 6 active_requirement / 5 accepted_outcome / 5 current_cycle_context / 5 important_feedback_failure / 4 cross_cycle_constraint`。
- `42/42` 通过 exact candidate keys、Record Patch canonicalization、project scope、material risk、reviewed、timestamp、body、allowed enum 和 caller-ID denial。
- Patch-level `record_patch.supersedes` 在 ID 分配前均为空；三条 outer candidate-key edge 均同 dedupe、无 broken edge、无 cycle。
- Inactive history 恰为 `history-legacy-local-authority`、`history-structured-rules-authority`、`c21-current-stash-git-snapshot-draft`，分别被 current leaf 显式替代。

### 隐私与 unsupported inference

- OpenAI/GitHub/AWS/Slack token、Bearer、JWT、private-key header、credential URL、Unix/Windows private absolute path：全部 `0`。
- Hidden/sensitive metadata key、forbidden source class、raw chat/transcript/tool-log locator：全部 `0`。
- 文本中唯一的 `raw chat` 字样来自 M5 的否定约束 “Do not import raw chat...”，不是被导入的 payload。
- 所有候选 `reviewed=true`、`future_decision_risk=material`，support 通过生产规范化；逐条语义审阅未发现正文超出 cited evidence。
- 反例注入全部被拒绝：missing source -> `BOOTSTRAP_SOURCE_MISSING`；digest drift -> `BOOTSTRAP_SOURCE_DRIFT`；inferred support -> `BOOTSTRAP_UNSUPPORTED_INFERENCE`；raw secret -> `BOOTSTRAP_RECORD_SECRET`；hidden context -> `BOOTSTRAP_RECORD_HIDDEN_CONTEXT`。

## 66 -> 42 覆盖

原始 66 个 key 独立对账结果为 `66 accounted / 66 unique / 0 missing / 0 unknown / 0 duplicate disposition`。收敛矩阵：

| 输入簇 | 输入数 | 最终处理 |
|---|---:|---|
| legacy/local authority + current Skill-first | 3 | 1 inactive history + 1 current replacement |
| Analysis boundaries/recovery/disproof | 3 | 1 durable Analysis decision |
| obsolete TUI/Sync/old SessionStart bundle | 1 | 明确排除；non-runner 原则由 current architecture/M7 保留 |
| acceptance + auto-continuation + current Delivery | 3 | 1 explicit-start/manual-acceptance decision |
| lifecycle transaction + state/projection drift | 2 | 1 coherence decision |
| Claude/OpenCode adapter lessons | 4 | 1 deferred adapter contract |
| legacy Structured Rules | 2 | 1 inactive history + 1 new scoped-directives/grants replacement |
| review/subagent/risk topology | 3 | 1 worker-separation requirement |
| high-impact gates + old automation whitelist | 2 | 1 scoped-authorization requirement |
| Configure/examples/Deep Plan/P2/C19 phases/M6 | 6 | 1 adaptive M6 route |
| registry projection + nine-command surface | 2 | 1 command decision |
| remote PR/notification/release evidence | 3 | 1 external-effect feedback |
| response + detailed completion report | 2 | 1 in-conversation report preference |
| dynamic/i18n/focused/install validation | 3 | 1 validation requirement |
| Maintain debt and portable-core authority | 2 | 2 source-backed rewrites |
| unchanged or source-refreshed candidates | 25 | 25 retained |

### 关键语义门禁

- C16: `pending_acceptance` 保留为 current feedback，未被提升成 accepted architecture。
- Maintain: path portability、duplicated helpers、workspace responsibility 仍是 M7 open verification obligation。
- Rules: inactive history 被 `c21-current-scoped-directives-and-grants` supersede；Revision 1 新增 `.pipeline/architecture.md#Command Exposure` 和 `C21-core-cutover-bootstrap-scope.md#兼容策略` 两条直接来源，补齐 removal/M8 cleanup 证据。
- M6: Goal/Cycle peer、adaptive Plan、explicit start；Maintain/Hooks 不提前进入。
- M7: ambient Maintain + primary Codex adapter；OpenCode/Claude、telemetry、cleanup execution、scheduler/quota automation 均不在范围。
- M8: post-M7 rescan、完整 Deletion Manifest、fresh exact `deletion.execute` Receipt、drift invalidation、independent audit，之后仍需 Cycle manual acceptance。
- Stash: Git snapshot 草案 inactive；Suspend + Blocking Delivery + forward Reconciliation 为唯一 active leaf。
- Public/contextual discovery: 精确九命令，deferred/removal candidates 不宣称 backend。

## Findings

最终 findings：`[]`。

Revision 0 曾被本 Auditor 以 source-binding 不完整拒绝：scoped-directives candidate 的 Rules removal/M8 cleanup 结论缺少直接来源。Curator Revision 1 只补充两条精确来源、收窄 support statement 并重新生成全部哈希；本轮从新 marker 全量重跑后关闭该问题。旧 curation `994d...` 和旧 audit 结果均作废，不得用于 staging。

## 运行命令与结果

- `node --input-type=module -e <production create/merge/curate/audit probe>`: approved，0 findings。
- `node --input-type=module -e <path/digest/schema/graph/privacy/semantic/disposition probe>`: all checks pass。
- `node --input-type=module -e <five-case audit falsification matrix>`: 5/5 rejected with expected codes。
- `sha256sum .pipeline/reviews/C21/M5/curation-evidence.md`: `ffb8af688290635701f81b22d72ecd32a6133532823327bd9fd95b497e70796e`。
- `git status --short --untracked-files=all`、protected bytes/mtime/hash 与 authority-zone absence checks：用于写前/写后 zero-write 对照。

## Zero-write 与边界证明

- 审计前，`.pipeline/manifest.yaml`、`.pipeline/runtime/`、`.pipeline/memory/`、`.pipeline/snapshots/` 全部不存在。
- 审计没有调用 `stageBootstrapWorkspace`、`activateBootstrapWorkspace`、legacy lifecycle writer、Record writer、Snapshot writer 或任何删除 API。
- 写前 protected SHA-256：state `8b97e6df...cf4d17`；cycle `d5fdedd7...472cb`；log `14f108a6...268222`；PROGRESS `303e593f...fa4b`。
- 写前 scoped production/test/extractor/curation 28-file digest：`495f727bcd86fde992218c37e63828c3545074f113dd65add9b3fa3e9352459d`。
- 写前排除本报告的 `git status --short` digest：`036404336e891fd703a84316b201b7072124ed0a0acdac32ad72a8b6341d5215`。

### 写后反向验证

- Approved marker：`1 begin / 1 end`，内部为严格 fenced JSON，顶层只包含 `curation` 与 `audit`。
- `normalizeCurationProposal` 与 `normalizeAuditProposal` 均通过；marker 中 curation/audit hash 精确绑定。
- 从 marker 重新运行 `verifyCurationSources` 与 `auditBootstrapProposal`，结果与嵌入 audit byte/structure 等价：`approved / []`。
- 排除本报告后的 Git status digest 写前/写后均为 `036404336e891fd703a84316b201b7072124ed0a0acdac32ad72a8b6341d5215`。
- Scoped production/test/extractor/curation 28-file digest 写前/写后均为 `495f727bcd86fde992218c37e63828c3545074f113dd65add9b3fa3e9352459d`。
- `state.yaml`、`cycle.yaml`、`log.yaml`、`PROGRESS.md` 的 bytes、mtime_ns 与 SHA-256 写前/写后完全一致。
- `.pipeline/manifest.yaml`、`.pipeline/runtime/`、`.pipeline/memory/`、`.pipeline/snapshots/` 写后仍全部不存在。
- 唯一新增文件是本 `audit.md`；`git diff --check -- audit.md` 通过。

## 裁决与下一门禁

`APPROVED` 只批准这份 exact curation 进入 deterministic writer 的 staging 输入，不授权 activation、deletion 或任何 legacy mutation。Deterministic writer 必须重新 normalize marker JSON、重新验证 56 个 source digests，并要求 audit.curation_hash 与 curation.semantic_hash 精确相等。任何后续 source/package drift 都使本批准失效。

后续仍须依次完成 staging validation、manifest-last activation、rollback checkpoint、fresh-process M5 -> M6 Pack restore、legacy bytes+mtime 不变证明和 post-activation full regression；这些步骤不属于本审计已执行事项。
