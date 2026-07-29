# C21-M5 Curator Evidence

- 角色：全新 proposal-only Curator
- Revision：1；根据独立语义 Auditor 反馈，为 Rules removal/M8 cleanup 结论补充直接来源绑定
- 生成边界：2026-07-12T08:15:40+08:00（legacy source freeze）
- 输入：六组 Extractor proposals、coverage report、M5 Prompt 与 production Bootstrap graph/schema contract
- 权威效果：无；本文件不分配 Record ID、不写 Record Store、不 staging、不 activation
- 结论：CURATION_READY_FOR_INDEPENDENT_AUDIT

## 结论

原始 66 条候选被压缩为 42 条：39 个 dedupe group 各有且仅有一个 current leaf，另保留 3 条明确 inactive history。三条历史分别记录旧 Legacy/local authority、旧 Structured Rules authority 和被取代的 Git-snapshot Stash 草案；它们都通过 candidate-key supersedes 指向证据充分的 current replacement。

这次提炼没有把 C16 的 pending_acceptance 结果提升为已验收架构，也没有把 deferred adapter、Analysis/Audit/Quality 或删除候选宣传成当前 backend。M6 -> M7 -> M8 路由、Goal/Cycle 平级、explicit start、最终人工验收、风险分级 worker separation 和 M8 fresh deletion Receipt 均完整保留。

Curator 最终验证只运行 production createBootstrapProposal、mergeBootstrapProposals、curateBootstrapProposals 和只读 preflight；它不是 audit approval。角色边界澄清前曾有一次未落盘的 audit API dry call，该结果未写入机器包、未作为结论，也未产生任何 authority side effect。Revision 1 仅为 scoped-directives candidate 新增 Command Exposure 与 cutover compatibility 两个直接来源，其他 41 条 candidate 语义与 42/39/3 图结构不变。正式 auditBootstrapProposal 只能由独立 Auditor 执行，并且仍是 staging 前硬门禁。

## 数量变换

| 阶段 | 候选 | current leaves | inactive history | 唯一 locator |
|---|---:|---:|---:|---:|
| Extractor 合集 | 66 | 未裁决 | 4 个 non-current proposal | 57 |
| Curated package | 42 | 39 | 3 | 56 |

最终 Record kind 分布为：25 decision、10 requirement、1 preference、6 feedback。六种 production source class 均在允许枚举内：17 architecture_decision、6 active_requirement、4 cross_cycle_constraint、5 important_feedback_failure、5 accepted_outcome、5 current_cycle_context。

## 逐项裁决

| 原候选 | 最终候选 / 动作 | 理由 |
|---|---|---|
| protected-workflow-state-transition-only + c16-local-authority-and-gated-remote-adapters | history-legacy-local-authority，重键并设为 history；由 c21-current-skill-first-single-authority supersede | 保留旧 authority 模型与 C16 未验收事实，但避免把 legacy root files 或 C16 remote adapter 重新激活为 authority。 |
| analysis-preset-interaction-boundaries + analysis-disproof-is-progress + c15-analysis-recoverable-first-class-lane | curated-analysis-durable-lane-and-boundaries | 三条描述同一 durable Analysis lane 的进入、执行边界和质量语义，合并后不恢复公开命令。 |
| c05-lifecycle-transaction-recovery-contract + c17-c20.runtime.state-prompt-coherence-pitfall | curated-lifecycle-transaction-and-derived-coherence | 用 M1 transaction 与 M3 Pack 作为当前实现依据；保留 state/projection 原子一致性，删除旧 watchdog/lease 作为 authority 的暗示。 |
| acceptance-is-distinct-lifecycle-gate + c05-authorized-execution-auto-continuation + C21 Delivery candidate | 改写 c21-current-delivery-lifecycle-manual-acceptance | 统一为 peer Goal/Cycle、explicit start、start 后常规内部连续执行和一次最终人工验收；不保留 Patch/timeout 旧模型。 |
| c10-command-registry-derived-surface-sync + C21 command candidate | 改写 c21-current-nine-command-surface | registry 是 authority，文档/adapter/test inventory 是投影；公开面仍严格九命令，删除仍等 M8。 |
| c08-default-agent-review-evidence-contract + c10-c11-subagent-governance-and-two-layer-context + C21 worker candidate | 改写 c21-current-risk-based-worker-separation | 将 review evidence、两层 worker context、显式降级与 material-work 分离策略合为一条。 |
| C10 Configure、C11 example abstraction、C12 Deep Plan、C15 P2 route gate、C19 named phases + C21 M6 | 改写 c21-current-m6-goal-cycle-adaptive-plan-route | 历史 Plan 职责被 adaptive depth 吸收；保留弱模型完整阶段与内部 Deep Plan，不恢复 fixed min_rounds 或 phase commands。 |
| c09-c12-high-impact-human-gates + c09-c11-durable-automation-whitelist-boundary | curated-high-impact-gates-and-scoped-automation | durable automation 不得覆盖 destructive/remote/release/user-config 门禁；当前机制归一为 scoped single-use Receipt。 |
| C6 Claude adapter + C9 namespace + C13 OpenCode registration + C20 interface-map/hook semantics | curated-platform-adapter-contracts | 去除重复平台经验，同时明确这些是未来 adapter 合同，必须按当时 host schema 复核，不能声称 C21 已支持。 |
| C14 dynamic/bilingual tests + C15 installed freshness + C15 focused-selector failure | curated-validation-selection-localization-and-installation | 三者共同约束“绿色结果必须证明运行了正确对象且与安装面一致”。 |
| C11 response contract + C15 completion contract | curated-completion-report-substance-in-conversation | 保留用户在任意 Agent/chat 表面可直接理解完整报告的核心要求。 |
| C10 remote PR gap + C16 notification evidence + C19 release state gate | curated-external-effects-and-release-evidence | 统一“本地/dry-run/source completion 不证明远端效果”的证据边界。 |
| c08-structured-rules-habits-authority + c17-c20.rules.structured-authority-legacy | history-structured-rules-authority，inactive；新增 c21-current-scoped-directives-and-grants supersede | 永久退役通用 Rules authority/command，但保留用户主动需求、偏好、反馈、本轮约束和明确 grant；durable fact 进 Record，执行/危险授权进 scoped Receipt。 |
| c16-maintain-architecture-debt-requires-revalidation | 改写为 current feedback 并重键 dedupe | 不声称债务已修复；M7 必须逐项验证 path portability、duplicate helpers 和 workspace boundary，后续以实现/审计 Record 关闭。 |
| c17-c20.architecture.portable-core-boundaries | 压缩正文并加入 C21 authority 来源 | 保留 portability/shared utility/workspace boundary；明确 C17 JSONL ledger 是历史实现，不能覆盖 C21 individual Record authority。 |
| c21-current-skill-first-single-authority | 增加 candidate-key supersedes | 明确替代 history-legacy-local-authority，避免旧 authority 成为无 current leaf 的孤组。 |
| c21-current-stash-git-snapshot-draft + c21-current-stash-suspend-reconciliation | 保留原两节点 supersedes chain | 旧 Git snapshot 必须可追溯但 inactive；当前语义是 Suspend + Blocking Delivery + forward Reconciliation。 |
| auxiliary-surfaces-remain-non-runners | 排除 | 它把旧 TUI、consistency Sync 和早期 SessionStart 策略绑在一起；C21 Skill-first projection 与 M7 bounded Hooks 已保留 non-runner 原则，激活该条会复活被移除/延后的表面。 |

其余 25 条候选只刷新了冻结 source digest 与 canonical source ordering，事实正文、Record kind、current marker 和 dedupe 语义未改：explore-worktree-isolation-and-dirty-gate、c08-externalizable-domain-pack-boundary、c09-evidence-redaction-before-storage-and-rendering、c11-zh-cn-canonical-skill-headings、c12-archive-status-authority-conflict、c16-delivery-complete-does-not-equal-cycle-accepted、c17-c20.audit.source-id-closure-matrix、c17-c20.debt.unresolved-architecture-quality-followups、c17-c20.commands.audit-quality-optimize-separation、c17-c20.integration-sync.internal-release-gate、c17-c20.action.consultation-first-and-concept-introduction、c17-c20.ownership.source-managed-vs-target-owned、c17-c20.targets.c20-local-adaptation-continuations、c17-c20.docs.platform-neutral-readme、c21-current-recovery-journal-capsule-pack、c21-current-m1-accepted-kernel-baseline、c21-current-m2-accepted-authority-baseline、c21-current-m3-accepted-recovery-baseline、c21-current-m4-accepted-init-router-baseline、c21-current-m5-reference-bootstrap-cutover、c21-current-m7-maintain-codex-hook-route、c21-current-m8-cleanup-deletion-gate-route、c21-current-deferred-roadmap、c21-current-stash-git-snapshot-draft、c21-current-stash-suspend-reconciliation。

## 三项争议裁决

### C16 local authority

c16-local-authority-and-gated-remote-adapters 仅保留为 inactive history。其 dedupe 被统一到 C21 Skill-first/single-authority group，并由当前 C21 candidate 显式 supersede。C16 的 remote systems are adapters 经验仍可追溯，但 C16 pending_acceptance 不产生 current architecture。

### Maintain architecture debt

c16-maintain-architecture-debt-requires-revalidation 被改为 current feedback，而不是宣称 C17 已完全修复。C17 提供 portability/boundary remediation 证据，但没有证明新的 ambient Maintain/Hook 实现已经逐项关闭 path、helper 和 workspace 三类风险；M7 验收必须给出明确 closure evidence。

### Rules replacement

旧 Structured Rules authority 合并为一条 inactive history。当前 replacement 明确区分：用户提供的需求、偏好、反馈和 scope 约束仍被尊重；确认后的 durable facts 进入单条 Record；用户确认、执行授权和危险操作授权进入精确 scoped Receipt。通用 Rules command 与全局 Rules authority 不再是产品合同，但实际删除仍受 M8 Deletion Manifest 和 fresh Receipt 控制。

## 覆盖矩阵

| 必须保留的决策面 | Curated evidence | 结果 |
|---|---|---|
| Skill-first、single authority、projection-only adapters | current architecture + inactive legacy authority edge | 覆盖 |
| Goal/Cycle 平级、explicit start、最终人工验收 | Delivery candidate + M6 route | 覆盖 |
| material work 的 test/implement/audit 分离 | risk-based worker candidate | 覆盖 |
| M1-M4 已验收能力与 residual limits | 四条 accepted baseline | 覆盖 |
| M5 internal Bootstrap、deterministic writer、manifest-last、fresh Resume | M5 cutover candidate | 覆盖 |
| M6 -> M7 -> M8 顺序与边界 | 三条 route candidate | 覆盖且未合并 |
| M8 deletion fresh exact approval、drift invalidation、final acceptance | M8 route + high-impact gate | 覆盖 |
| Recovery Journal/Capsule/Pack、redaction、state/projection coherence | recovery + privacy + lifecycle candidates | 覆盖 |
| 通用 Rules 退役但 scoped directives/grants 保留 | history/current supersedes pair | 覆盖 |
| C16 delivered != accepted | dedicated current feedback | 覆盖 |
| Stash old/new semantics | two-node supersedes chain | 覆盖 |
| Deferred adapters/advanced lanes/roadmap | adapter contract + deferred roadmap | 覆盖且不宣传为 backend |

## Production API 与来源验证

- 两组 curated extraction input 均通过 createBootstrapProposal：26 included / 0 excluded 与 16 included / 0 excluded。
- 原始 66 个 candidate key 均有且仅有一个明确 disposition（保留、合并/改写或排除）；缺失 0，未知来源 key 0。
- mergeBootstrapProposals 得到 42 条；正序与逆序 semantic hash 相同。
- curateBootstrapProposals 成功：39 个 dedupe key，各自恰一个 current leaf；3 条 inactive history 均有明确 replacement。
- Revision 1 当前 hash：durable extraction ec75abb5f24b2982d2f5560286c07c1e72ee83a974353fc9725103342591e35d；current-C21 extraction 9f9776cfe5f7e3d92315383ebeed2a3494d79d651875c483f57aa0c86f3ad25b；merge 784c310330c9621ca75b3facad35febfb4473328ad4c8f269feb85cfa9189251；curation bd4b0ac0932e0b7f3a2951d67cbc23d6f1a0fcfe24d7934d394d61511abdd3c9。
- 124 个 source refs 指向 56 个唯一 repository-relative regular-file locator；全部按冻结后 bytes 重读并重算 SHA-256。
- .pipeline/cycle.yaml 已从旧 proposal digest 刷新为冻结值 sha256:d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb；相关 acceptance/lifecycle_policy 语义未变。
- source refs 与 record_patch.source_refs 一一对应；无 caller Record ID、无 patch-level Record-ID supersedes、无 broken edge、无 cycle。
- create/curate schema normalization 与只读 preflight 未发现 invalid Record Patch marker、path escape、symlink、missing/drift source、常见 raw-secret pattern 或 hidden-context schema field。
- 未读取 raw chat、transcript、scratchpad 或 tool log；未写 Record Store、manifest、Runtime、Snapshot、Receipt、staging 或 activation 文件。

## 风险与下一门禁

1. 当前是 Curator proposal 与 preflight，不是独立审计批准；独立 Auditor 必须从 marker package 重新解析并运行 auditBootstrapProposal。
2. Maintain 三项债务被有意保留为 open current feedback；M7 不能仅凭 C17 摘要将其关闭。
3. Claude/OpenCode 经验是 future adapter contract，实施时仍需用当时官方 host schema 复核。
4. 本文件不授权 staging、activation 或 deletion；deterministic writer 只能在独立审计通过后运行。

<!-- C21_M5_CURATED_PACKAGE_BEGIN -->
```json
{
  "schema_version": "1",
  "bootstrap_job_ref": {
    "kind": "bootstrap_job",
    "id": "c21-reference-bootstrap"
  },
  "curator": {
    "role": "curator",
    "id": "m5-curator-c21"
  },
  "groups": [
    {
      "worker_id": "m5-curated-durable-history",
      "candidates": [
        {
          "key": "history-legacy-local-authority",
          "source_class": "architecture_decision",
          "future_decision_risk": "material",
          "current": "history_needed",
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C2-C3 protected legacy root state and C16 proposed local authority with gated remote adapters; C16 remained pending acceptance."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C2-new-cycle/architecture-snapshot.md#L8-L9",
              "locator": ".pipeline/archives/C2-new-cycle/architecture-snapshot.md",
              "digest": "sha256:a0bdf90e6c6b371a76f960531063b5cabdb57bcd81775fdd3b11268908f955f1"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L8-L9",
              "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md",
              "digest": "sha256:6947315c6ff511b5e30fc4cce444a47ada44afcd42433748ec71fb6e30a52e3c"
            },
            {
              "type": "legacy_file",
              "ref": "legacy:C16/cycle#cycle.status and cycle.acceptance.state",
              "locator": ".pipeline/archives/C16-root-project-management-mode/cycle.yaml",
              "digest": "sha256:d90f2e1c5ac3aa5cdc6a1340b820329ab8d90017f17aa1ceed2c5c0f7d0d404c"
            },
            {
              "type": "legacy_file",
              "ref": "legacy:C16/summary#Completion notes: technical approach and authority boundary",
              "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
              "digest": "sha256:0461a6ae961657c850fb1019fa40f097cfcec9e0eafa1b392e9e655fdb9ffb19"
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
                "ref": ".pipeline/archives/C2-new-cycle/architecture-snapshot.md#L8-L9",
                "locator": ".pipeline/archives/C2-new-cycle/architecture-snapshot.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L8-L9",
                "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C16/cycle#cycle.status and cycle.acceptance.state",
                "locator": ".pipeline/archives/C16-root-project-management-mode/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C16/summary#Completion notes: technical approach and authority boundary",
                "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:architecture:skill-first-single-authority",
            "created_at": "2026-05-21T01:30:00+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "Historical authority model: legacy root Workflow state and local stores were treated as protected or authoritative, while remote systems were gated adapters. The C16 source was delivered but not human-accepted. This history is retained only to show what the C21 Skill-first single-authority architecture replaces."
          }
        },
        {
          "key": "curated-analysis-durable-lane-and-boundaries",
          "source_class": "architecture_decision",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C3 defined execution boundaries and disproof semantics; C15 made Analysis a recoverable first-class lane. C21 may hide it from discovery without discarding these semantics."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L129-L159",
              "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md",
              "digest": "sha256:6947315c6ff511b5e30fc4cce444a47ada44afcd42433748ec71fb6e30a52e3c"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L35-L45;L84-L103",
              "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md",
              "digest": "sha256:6947315c6ff511b5e30fc4cce444a47ada44afcd42433748ec71fb6e30a52e3c"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md#L25-L26",
              "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md",
              "digest": "sha256:44d9dcac0d6c4cf722ad6db3019ffc518a57d24149e1322775e6ace73fe2367a"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md#L27-L31",
              "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md",
              "digest": "sha256:44d9dcac0d6c4cf722ad6db3019ffc518a57d24149e1322775e6ace73fe2367a"
            },
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
            "scope": {
              "type": "project",
              "ref": "project:hypo-workflow"
            },
            "kind": "decision",
            "source_refs": [
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L129-L159",
                "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md#L35-L45;L84-L103",
                "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/architecture-snapshot.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md#L25-L26",
                "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md#L27-L31",
                "locator": ".pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C15/cycle#cycle.summary: /hw:analysis recovery",
                "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C15/summary#Milestones: C15-M3 Interactive Analysis State And Command Entry",
                "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:analysis:durable-lane-and-execution-boundaries",
            "created_at": "2026-05-16T12:40:46+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "Analysis remains a durable, recoverable investigation lane rather than disposable chat or a Test Profile. It records the question, evidence, conclusion, and next action without converting investigation into Delivery work. Manual mode denies code edits, hybrid mode proposes and requires confirmation, and auto mode may edit only inside configured boundaries. Disproving a hypothesis is valid progress; quality is judged by evidence, traceability, and any required verification."
          }
        },
        {
          "key": "curated-lifecycle-transaction-and-derived-coherence",
          "source_class": "architecture_decision",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C5 required transactional lifecycle refresh, a prior state/prompt drift demonstrated the failure mode, and C21 M1/M3 provide the current transaction and Pack recovery primitives."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/summary.md#Milestone 摘要 / M03, M07, M08",
              "locator": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/summary.md",
              "digest": "sha256:4ac1e165daea0e092035278b90fb258b450cb37c85df23e5bc2be05d536ef888"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md#Completion Narrative; Delivered Architecture; Test Results",
              "locator": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md",
              "digest": "sha256:66ef1909b4e7b399e3bd9a813ec46e226bbeeb68960413f79eced1737906b77f"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md#Completion Narrative; Delivered Architecture; Architecture Plan Review",
              "locator": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md",
              "digest": "sha256:e5c90d68c4ffb237d9091d4d1e8cbf646742c7a48f9063a84b27a67814edbc41"
            },
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
            "kind": "decision",
            "source_refs": [
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/summary.md#Milestone 摘要 / M03, M07, M08",
                "locator": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md#Completion Narrative; Delivered Architecture; Test Results",
                "locator": ".pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md#Completion Narrative; Delivered Architecture; Architecture Plan Review",
                "locator": ".pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Pitfalls: C4-M05 state/prompt_state drift",
                "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:lifecycle:transaction-and-derived-coherence",
            "created_at": "2026-07-12T00:21:05+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "Lifecycle mutations use deterministic transaction and invariant checks, and every derived active, prompt, or continuation pointer must be regenerated coherently with the authoritative object update. Resume must reject or repair a mismatched authority/projection pair and use validated Recovery Packs for bounded restoration. Historical lease, watchdog, and platform-handoff details are not promoted as current authority."
          }
        },
        {
          "key": "explore-worktree-isolation-and-dirty-gate",
          "source_class": "architecture_decision",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": "observed",
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md#L28-L29",
              "locator": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md",
              "digest": "sha256:b5ce0490a8d08138b311ec07a75b1567e01037242c8fe4dbb30de391d512c4bb"
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
                "ref": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md#L28-L29",
                "locator": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md"
              }
            ],
            "confidence": "confirmed",
            "dedupe_key": "project:hypo-workflow:explore-worktree-isolation-and-dirty-gate",
            "created_at": "2026-07-12T07:00:44+08:00",
            "updated_at": "2026-07-12T07:00:44+08:00",
            "supersedes": [],
            "body": "Explore 工作必须使用隔离 worktree、执行 dirty gate，并保持并行探索互不污染；不能直接把探索写入主项目工作树。"
          }
        },
        {
          "key": "c08-externalizable-domain-pack-boundary",
          "source_class": "architecture_decision",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": "observed",
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md#Decisions / C8-PLAN-domain-pack-boundary-and-review-rules-20260506",
              "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md",
              "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Summary and Milestones / M07-M09",
              "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md",
              "digest": "sha256:d56b1755c6f898a0c4c88edf1be241d72296d36f9f49debf55f47e3340eb7f9a"
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
                "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md#Decisions / C8-PLAN-domain-pack-boundary-and-review-rules-20260506",
                "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Summary and Milestones / M07-M09",
                "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "hypo-workflow:externalizable-domain-pack-boundary",
            "created_at": "2026-07-12T07:00:47+08:00",
            "updated_at": "2026-07-12T07:09:58+08:00",
            "supersedes": [],
            "body": "领域能力通过可外置 Domain Pack boundary protocol 接入，RTL 是参考实现；规划、Review 与测试可以消费 pack，核心工作流不内嵌具体领域规则。"
          }
        },
        {
          "key": "curated-high-impact-gates-and-scoped-automation",
          "source_class": "active_requirement",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C9-C12 consistently preserve explicit high-impact gates; C11 automation does not waive them, and C21 M2 provides the current scoped Receipt mechanism."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Milestones M2",
              "locator": ".pipeline/archives/C10-experience-optimizations/summary.md",
              "digest": "sha256:22f1da7307359f10872686a3dca085b5ff2576550269ddb76dc984464e9e24d9"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.summary",
              "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml",
              "digest": "sha256:de025e24bb8312b5c0f0e35cabe43297c4a169812764df83f82639374f304d93"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M3",
              "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
              "digest": "sha256:40ec925c5ff4316ca0eba2532bf24f400a9b8edbff30ffbfe19dd47cf820c62c"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#关键数据 > 已知限制",
              "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md",
              "digest": "sha256:7240d551caad5116ea0e448c1092a7a2d5a3fea26335c6e2b619e698d5ab0a1c"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates and cycle.lessons[1]",
              "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
              "digest": "sha256:c84dfa32eddb2754e10e656648a0bb185113db10d9053961279c8f7cc63591c4"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates",
              "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
              "digest": "sha256:c84dfa32eddb2754e10e656648a0bb185113db10d9053961279c8f7cc63591c4"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
              "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md",
              "digest": "sha256:49e3b2c2e98a5610b280c3ae08bf83a9197976f4c6fc89857b5495decbb31e39"
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
                "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Milestones M2",
                "locator": ".pipeline/archives/C10-experience-optimizations/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.summary",
                "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M3",
                "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#关键数据 > 已知限制",
                "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates and cycle.lessons[1]",
                "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates",
                "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
                "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:safety:high-impact-gates-and-scoped-automation",
            "created_at": "2026-07-12T02:42:16+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "Destructive or external operations, plugin installation, user-level configuration writes, remote PR/MR writes, Release publication, and remote clone/download require explicit, scope-bound human authorization. Local preparation without remote effects may precede the gate. Durable automation preferences cannot silently waive these boundaries; current authorization is represented by exact, single-use, drift-sensitive Receipts rather than a broad whitelist flag."
          }
        },
        {
          "key": "c09-evidence-redaction-before-storage-and-rendering",
          "source_class": "active_requirement",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C9 records redaction as an accepted lesson for both persisted evidence packets and human-facing output."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lessons[0]",
              "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
              "digest": "sha256:c84dfa32eddb2754e10e656648a0bb185113db10d9053961279c8f7cc63591c4"
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
                "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lessons[0]",
                "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml"
              }
            ],
            "confidence": 0.99,
            "dedupe_key": "privacy/evidence-redact-before-persist-render",
            "created_at": "2026-07-12T07:07:51+08:00",
            "updated_at": "2026-07-12T07:07:51+08:00",
            "supersedes": [],
            "body": "Evidence-first 命令必须在两个出口之前完成敏感信息脱敏：既要在 evidence packet 持久化之前脱敏，也要在人类可见内容渲染之前脱敏。"
          }
        },
        {
          "key": "curated-platform-adapter-contracts",
          "source_class": "architecture_decision",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C6, C9, C13, and C20 preserve concrete Claude/OpenCode integration failures and contracts; the C21 roadmap explicitly defers those adapters, requiring later current-schema verification."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/knowledge-summary.md#Pitfalls / C6-SYNC-claude-opencode-codex-interface-map-20260505",
              "locator": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/knowledge-summary.md",
              "digest": "sha256:f130563b3e11707b085ac6b13ca6c671423a9478062b9e7a13e4fb762df3e662"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/summary.md#Cycle summary and Milestone 摘要 / M02-M04",
              "locator": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/summary.md",
              "digest": "sha256:33084ae677b3150a4ff87e4df5245fa4919e5159da485a53eee4a1e07423fe06"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lessons[2]",
              "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
              "digest": "sha256:c84dfa32eddb2754e10e656648a0bb185113db10d9053961279c8f7cc63591c4"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md#Summary and Milestones M09-M10",
              "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md",
              "digest": "sha256:4707185cf23e13e592e4c41460094ea3903ab4d66111a0d72a2c1b61e3b34dbd"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#后续 Cycle; 当前版本目标; 兼容策略",
              "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
              "digest": "sha256:887400607034b2c01edbac1e85f408f83352d426996b8657ee5f041cd4ed7224"
            },
            {
              "type": "legacy_file",
              "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Dependencies, Pitfalls, and Decisions: C6-SYNC interface map",
              "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md",
              "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177"
            },
            {
              "type": "legacy_file",
              "ref": "legacy:C13/cycle#cycle.status",
              "locator": ".pipeline/archives/C13-opencode-ux-enhancement/cycle.yaml",
              "digest": "sha256:a1be3e72f3aac6a8400872644b5ff16e7b455c1925d5817be0552af5150b8269"
            },
            {
              "type": "legacy_file",
              "ref": "legacy:C13/summary#Knowledge summary: OpenCode command registration",
              "locator": ".pipeline/archives/C13-opencode-ux-enhancement/summary.md",
              "digest": "sha256:30c553b93643d19dda609c0b2a6687a93049214fe82794027f8ef80e2277977c"
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
                "ref": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/knowledge-summary.md#Pitfalls / C6-SYNC-claude-opencode-codex-interface-map-20260505",
                "locator": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/knowledge-summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/summary.md#Cycle summary and Milestone 摘要 / M02-M04",
                "locator": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lessons[2]",
                "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md#Summary and Milestones M09-M10",
                "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#后续 Cycle; 当前版本目标; 兼容策略",
                "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Dependencies, Pitfalls, and Decisions: C6-SYNC interface map",
                "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C13/cycle#cycle.status",
                "locator": ".pipeline/archives/C13-opencode-ux-enhancement/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C13/summary#Knowledge summary: OpenCode command registration",
                "locator": ".pipeline/archives/C13-opencode-ux-enhancement/summary.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:adapters:capability-map-native-registration-and-hook-semantics",
            "created_at": "2026-05-14T23:30:00+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "Future non-Codex adapter work starts from a current capability/interface map and validates the exact host schema instead of assuming parity. Claude integrations expose Workflow under /hw:* and must keep native /resume separate from /hw:resume; settings merges preserve backup/conflict evidence and each hook is validated for its event and exit-code contract. OpenCode user-visible commands require its current native registration surface as well as internal dispatch. These are deferred adapter requirements, not a claim that Claude or OpenCode is a current C21 backend."
          }
        },
        {
          "key": "curated-validation-selection-localization-and-installation",
          "source_class": "cross_cycle_constraint",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C14-C15 recorded false-confidence failures from frozen command counts, monolingual matchers, ignored focused selectors, and stale installed Skill bundles."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": "legacy:C14/cycle#cycle.status",
              "locator": ".pipeline/archives/C14-prompt-compatibility-audit/cycle.yaml",
              "digest": "sha256:777a663378547e4fd5b7bd71595ded1f2db4df968ef12ec475c371341c63ec1a"
            },
            {
              "type": "legacy_file",
              "ref": "legacy:C14/summary#Key data: bilingual i18n regex and dynamic command count tests",
              "locator": ".pipeline/archives/C14-prompt-compatibility-audit/summary.md",
              "digest": "sha256:11befe836f3e4ad7a2256a775db010259466954cf0a6a8908cdc46c5c7cca505"
            },
            {
              "type": "legacy_file",
              "ref": "legacy:C15/cycle#cycle.lessons: focused regression flags",
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
              "digest": "sha256:3557a2f487294bb26d020d41de5468934fcad4560e941ca5d553e508da9dc4fc"
            },
            {
              "type": "legacy_file",
              "ref": "legacy:C15/cycle#cycle.lessons: installed Codex skill bundle freshness",
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml",
              "digest": "sha256:3557a2f487294bb26d020d41de5468934fcad4560e941ca5d553e508da9dc4fc"
            },
            {
              "type": "legacy_file",
              "ref": "legacy:C15/summary#Completion notes: regression runner scenario filter defect",
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
              "digest": "sha256:a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d"
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
            "scope": {
              "type": "project",
              "ref": "project:hypo-workflow"
            },
            "kind": "requirement",
            "source_refs": [
              {
                "type": "legacy_file",
                "ref": "legacy:C14/cycle#cycle.status",
                "locator": ".pipeline/archives/C14-prompt-compatibility-audit/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C14/summary#Key data: bilingual i18n regex and dynamic command count tests",
                "locator": ".pipeline/archives/C14-prompt-compatibility-audit/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C15/cycle#cycle.lessons: focused regression flags",
                "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C15/cycle#cycle.lessons: installed Codex skill bundle freshness",
                "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C15/summary#Completion notes: regression runner scenario filter defect",
                "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C15/summary#Completion notes: shared asset and installed bundle failures",
                "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:validation:dynamic-selection-localization-installed-freshness",
            "created_at": "2026-05-15T18:00:00+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "Validation derives expected command inventory from authority, uses language-aware assertions, proves that focused selectors changed the executed scenario set, and checks installed Skill bundles plus shared asset references against the source version. A green source-only or selector-ambiguous run does not establish the intended runtime contract."
          }
        },
        {
          "key": "c11-zh-cn-canonical-skill-headings",
          "source_class": "active_requirement",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C11 accepted Chinese-first Skills/references and records validator compatibility with Chinese canonical headings as a lesson."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.summary and cycle.lessons[0]",
              "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml",
              "digest": "sha256:de025e24bb8312b5c0f0e35cabe43297c4a169812764df83f82639374f304d93"
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
                "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.summary and cycle.lessons[0]",
                "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml"
              }
            ],
            "confidence": 0.98,
            "dedupe_key": "localization/zh-cn-canonical-headings",
            "created_at": "2026-07-12T07:07:51+08:00",
            "updated_at": "2026-07-12T07:07:51+08:00",
            "supersedes": [],
            "body": "当项目语言策略为 `zh-CN` 时，Skills 与 references 可以使用中文规范标题，Skill 质量检查必须接受这些中文 canonical headings，不能把英文标题写死为唯一合法形式。"
          }
        },
        {
          "key": "curated-completion-report-substance-in-conversation",
          "source_class": "active_requirement",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C11 established a conclusion/explanation/next-step response, and C15 strengthened it into the detailed in-conversation completion report contract."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M1",
              "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
              "digest": "sha256:40ec925c5ff4316ca0eba2532bf24f400a9b8edbff30ffbfe19dd47cf820c62c"
            },
            {
              "type": "legacy_file",
              "ref": "legacy:C15/summary#Milestones: C15-M2 Detailed Completion Report Contract",
              "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md",
              "digest": "sha256:a65769480770cb2592d5ce2447f06662429c5936c664e5c966610f1c1c44658d"
            }
          ],
          "supersedes": [],
          "record_patch": {
            "scope": {
              "type": "project",
              "ref": "project:hypo-workflow"
            },
            "kind": "preference",
            "source_refs": [
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M1",
                "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C15/summary#Milestones: C15-M2 Detailed Completion Report Contract",
                "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:ux:completion-report-substance-in-conversation",
            "created_at": "2026-05-16T12:40:46+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "User-visible completion responses state the conclusion, change, approach, affected surfaces, test design, validation result, expected result, problems, residual risks, and next action in the conversation. Artifact paths support the explanation but never substitute for it, so the result remains understandable from another Agent or chat surface."
          }
        },
        {
          "key": "c12-archive-status-authority-conflict",
          "source_class": "important_feedback_failure",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "The archived C12 cycle metadata says active with no finish/summary, while its archive summary says completed with a finish timestamp and all milestones done."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/cycle.yaml#cycle.status, cycle.finished absence, cycle.summary, and cycle.lessons",
              "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/cycle.yaml",
              "digest": "sha256:e0aadc6cde082180e77fbb5a70d94a81d955ed9034d6d084827a8a2440fc8406"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#基本信息 > 状态/结束时间 and 里程碑",
              "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md",
              "digest": "sha256:7240d551caad5116ea0e448c1092a7a2d5a3fea26335c6e2b619e698d5ab0a1c"
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
                "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/cycle.yaml#cycle.status, cycle.finished absence, cycle.summary, and cycle.lessons",
                "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#基本信息 > 状态/结束时间 and 里程碑",
                "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md"
              }
            ],
            "confidence": 0.99,
            "dedupe_key": "migration/c12-archive-status-conflict",
            "created_at": "2026-07-12T07:07:51+08:00",
            "updated_at": "2026-07-12T07:07:51+08:00",
            "supersedes": [],
            "body": "C12 归档存在权威冲突：`cycle.yaml` 仍标记 `active` 且缺少完成时间与摘要，而 `summary.md` 标记 `completed`、给出结束时间并声明全部 Milestone 完成；迁移时必须保留并上报冲突，不能无声选择其中一方。"
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
            "scope": {
              "type": "project",
              "ref": "project:hypo-workflow"
            },
            "kind": "feedback",
            "source_refs": [
              {
                "type": "legacy_file",
                "ref": "legacy:C16/cycle#cycle.status and cycle.acceptance.state",
                "locator": ".pipeline/archives/C16-root-project-management-mode/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C16/summary#Key results: pending_acceptance despite completed Milestones",
                "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md"
              }
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
          "key": "curated-external-effects-and-release-evidence",
          "source_class": "important_feedback_failure",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C10 lacked a real remote PR/MR smoke, C16 corrected a notification claim with provider evidence, and C19 requires explicit target release and repository-state gates."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Key Data > Warnings",
              "locator": ".pipeline/archives/C10-experience-optimizations/summary.md",
              "digest": "sha256:22f1da7307359f10872686a3dca085b5ff2576550269ddb76dc984464e9e24d9"
            },
            {
              "type": "legacy_file",
              "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml#cycle.lessons",
              "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml",
              "digest": "sha256:1c00713e7b2e0948fb165327d752e9e4153eea5bed42b7f2a57f61b7f237fb7d"
            },
            {
              "type": "legacy_file",
              "ref": "legacy:C16/summary#Completion notes: QQ delivery evidence failure and correction",
              "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
              "digest": "sha256:0461a6ae961657c850fb1019fa40f097cfcec9e0eafa1b392e9e655fdb9ffb19"
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
                "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Key Data > Warnings",
                "locator": ".pipeline/archives/C10-experience-optimizations/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml#cycle.lessons",
                "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C16/summary#Completion notes: QQ delivery evidence failure and correction",
                "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:validation:external-effects-and-release-evidence",
            "created_at": "2026-05-21T01:30:00+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "Do not treat local contracts, dry runs, or source-side completion as proof of a remote effect. Remote PR/MR and notification claims require an appropriate provider acknowledgement without persisting private payloads; target release additionally requires an explicit version/tag choice and inspection of both local and remote state before publication."
          }
        },
        {
          "key": "c16-maintain-architecture-debt-requires-revalidation",
          "source_class": "important_feedback_failure",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C16 directly identifies path, helper, and workspace-boundary debt; C17 reports partial architectural remediation; the current M7 route is the next implementation boundary where all three require explicit closure evidence."
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
              "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md#Milestone 摘要, 关键结果, and 完成说明",
              "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md",
              "digest": "sha256:8ae34a8eaa0a12f079a5ab76d66c8ec8a8b5f795459666bfd2d9f5b6831c761d"
            },
            {
              "type": "legacy_file",
              "ref": "legacy:C16/summary#Completion notes: risks and follow-up",
              "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md",
              "digest": "sha256:0461a6ae961657c850fb1019fa40f097cfcec9e0eafa1b392e9e655fdb9ffb19"
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
                "ref": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md#Objective; Requirements; Boundaries; Technical Solution",
                "locator": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy-file:.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md#Milestone 摘要, 关键结果, and 完成说明",
                "locator": ".pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C16/summary#Completion notes: risks and follow-up",
                "locator": ".pipeline/archives/C16-root-project-management-mode/summary.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:maintain:path-helper-workspace-revalidation",
            "created_at": "2026-05-21T01:30:00+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "M7 must explicitly verify path portability, duplicated-helper consolidation, and workspace responsibility boundaries before accepting or reusing legacy Maintain components. C17 reports portability and boundary remediation, but the bounded history does not prove that all three C16 concerns remain closed in the new ambient Maintain/Hook design. This Record is an open verification obligation, not a claim that current code is defective; a later implementation/audit Record must supersede it when each check is evidenced."
          }
        },
        {
          "key": "c17-c20.architecture.portable-core-boundaries",
          "source_class": "accepted_outcome",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C17 accepted portable configuration and separated responsibilities; C21 replaces the prior ledger authority with individual Records and derived indexes while retaining those portability boundaries."
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
              "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
              "locator": ".pipeline/reports/C21-unified-architecture-design.md",
              "digest": "sha256:a833151c2e9f4a95e250f2c9af46645ea3b735fea92b1da9bc9c02080a96b196"
            },
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
                "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
                "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
                "locator": ".pipeline/reports/C21-unified-architecture-design.md"
              },
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
            "confidence": "high",
            "dedupe_key": "project:hypo-workflow:decision:portable-core-boundaries",
            "created_at": "2026-07-11T20:24:08+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "Keep portable layered configuration instead of user-specific paths or seeds, shared utilities instead of duplicated helpers, explicit workspace responsibility boundaries, consistent schema parsing, a repository-root test entry, and an explicit public export surface. The C17 JSONL ledger implementation is historical; after C21, individual Records and their derived indexes are the authority, so portability lessons remain current without reviving the old ledger."
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
          "key": "history-structured-rules-authority",
          "source_class": "architecture_decision",
          "future_decision_risk": "material",
          "current": "history_needed",
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "C8 established Structured Rules/Habits authority and the C20 compact preserves it while warning that C21 must explicitly reconcile it."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md#Decisions / C8-PLAN-domain-pack-boundary-and-review-rules-20260506",
              "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md",
              "digest": "sha256:e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Summary and Milestones / M01-M03",
              "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md",
              "digest": "sha256:d56b1755c6f898a0c4c88edf1be241d72296d36f9f49debf55f47e3340eb7f9a"
            },
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
                "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md#Decisions / C8-PLAN-domain-pack-boundary-and-review-rules-20260506",
                "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/knowledge-summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Summary and Milestones / M01-M03",
                "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Decisions: C8-PLAN structured Rules/Habits authority",
                "locator": ".pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:authority:user-directives-and-grants",
            "created_at": "2026-07-12T07:00:47+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "Historical model through C20: generic Structured Rules/Habits were treated as behavior authority and Markdown/platform instructions as derived views. This history is inactive and retained only so the C21 replacement is explicit."
          }
        },
        {
          "key": "c21-current-scoped-directives-and-grants",
          "source_class": "architecture_decision",
          "future_decision_risk": "material",
          "current": true,
          "reviewed": true,
          "support": {
            "status": "confirmed",
            "statement": "The confirmed C21 authority design routes Requirements, Preferences, Grants, confirmed authorization scope, and dangerous-operation authorization to Records or scoped Receipts; Command Exposure and cutover compatibility explicitly classify generic Rules as an M8 cleanup candidate."
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
              "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
              "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md",
              "digest": "sha256:49e3b2c2e98a5610b280c3ae08bf83a9197976f4c6fc89857b5495decbb31e39"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#兼容策略",
              "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md",
              "digest": "sha256:887400607034b2c01edbac1e85f408f83352d426996b8657ee5f041cd4ed7224"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
              "locator": ".pipeline/reports/C21-unified-architecture-design.md",
              "digest": "sha256:a833151c2e9f4a95e250f2c9af46645ea3b735fea92b1da9bc9c02080a96b196"
            }
          ],
          "supersedes": [
            "history-structured-rules-authority"
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
                "ref": ".pipeline/architecture.md#Command Exposure",
                "locator": ".pipeline/architecture.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture",
                "locator": ".pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#兼容策略",
                "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
                "locator": ".pipeline/reports/C21-unified-architecture-design.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:authority:user-directives-and-grants",
            "created_at": "2026-07-11T20:24:08+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "The generic Rules command and generic Structured Rules authority are retired from the product contract and remain M8 cleanup candidates. User-stated requirements, preferences, feedback, authorization scope, and turn- or Delivery-scoped constraints remain supported at their actual scope: confirmed durable facts become individual Records, while user confirmation, execution grants, and dangerous-operation grants use actor-, scope-, plan-hash-, expiry-, and consumption-bound Receipts. Adapters and Markdown guidance are projections and cannot become competing authority. A scoped constraint or grant must not be silently promoted into a permanent global rule."
          }
        }
      ]
    },
    {
      "worker_id": "m5-curated-current-c21",
      "candidates": [
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
              "ref": ".pipeline/architecture.md#Product Boundary; Physical Layout",
              "locator": ".pipeline/architecture.md",
              "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
              "locator": ".pipeline/reports/C21-unified-architecture-design.md",
              "digest": "sha256:a833151c2e9f4a95e250f2c9af46645ea3b735fea92b1da9bc9c02080a96b196"
            }
          ],
          "supersedes": [
            "history-legacy-local-authority"
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
                "ref": ".pipeline/architecture.md#Product Boundary; Physical Layout",
                "locator": ".pipeline/architecture.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配",
                "locator": ".pipeline/reports/C21-unified-architecture-design.md"
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
            "statement": "C4-C8 preserve the distinction between internal completion, continuation, and acceptance; C21 replaces Patch/timeout variants with peer Goal/Cycle Deliveries, explicit start, and one scoped final acceptance."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md#L25-L27",
              "locator": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md",
              "digest": "sha256:b5ce0490a8d08138b311ec07a75b1567e01037242c8fe4dbb30de391d512c4bb"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/cycle.yaml#cycle.lessons",
              "locator": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/cycle.yaml",
              "digest": "sha256:0da30ed106fa2dfb24097574a8df84a7a67c15d1e050edb4dc7e83b11394dd28"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/cycle.yaml#cycle.lifecycle_policy.auto_continue",
              "locator": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/cycle.yaml",
              "digest": "sha256:4e7844028a5bd3ffda2caf6e040bd4c6628291ec2a6409b48621e24af9101c1c"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C7-codex-service-effectiveness-and-workflow-governance/cycle.yaml#cycle.lifecycle_policy.auto_continue",
              "locator": ".pipeline/archives/C7-codex-service-effectiveness-and-workflow-governance/cycle.yaml",
              "digest": "sha256:e872336a96ce3e1ca008b1b85db5a8cba79f6296ef4d81ffe42c64ec1e26fe57"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/cycle.yaml#cycle.lifecycle_policy.auto_continue",
              "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/cycle.yaml",
              "digest": "sha256:2372649ee4d4ce2bd2a992111befbbb741d67874e8dca78cfdf08f02dd4caff7"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/cycle.yaml#cycle.acceptance; cycle.lifecycle_policy",
              "locator": ".pipeline/cycle.yaml",
              "digest": "sha256:d5fdedd7e7d54da5c07687b814492a2d50c06df40fa8e4ff9e908bb4dda472cb"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/reports/C21-unified-architecture-design.md#对象模型; Delivery 生命周期; 端到端场景",
              "locator": ".pipeline/reports/C21-unified-architecture-design.md",
              "digest": "sha256:a833151c2e9f4a95e250f2c9af46645ea3b735fea92b1da9bc9c02080a96b196"
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
                "ref": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md#L25-L27",
                "locator": ".pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/cycle.yaml#cycle.lessons",
                "locator": ".pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/cycle.yaml#cycle.lifecycle_policy.auto_continue",
                "locator": ".pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C7-codex-service-effectiveness-and-workflow-governance/cycle.yaml#cycle.lifecycle_policy.auto_continue",
                "locator": ".pipeline/archives/C7-codex-service-effectiveness-and-workflow-governance/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/cycle.yaml#cycle.lifecycle_policy.auto_continue",
                "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/cycle.yaml#cycle.acceptance; cycle.lifecycle_policy",
                "locator": ".pipeline/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/reports/C21-unified-architecture-design.md#对象模型; Delivery 生命周期; 端到端场景",
                "locator": ".pipeline/reports/C21-unified-architecture-design.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:delivery:peer-kinds-explicit-start-manual-acceptance",
            "created_at": "2026-07-11T20:24:08+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "Goal and Cycle are peer Main Delivery kinds. A Goal has one Design and no user-visible Milestone sequence; a Cycle has ordered Milestones, internal verification at Milestone boundaries, and one final Cycle-level manual acceptance gate. Maintain is ambient. Approval creates waiting_to_start, and only explicit start intent begins work. After that start, authorized execution may continue across ordinary internal Milestone boundaries without repeated approval, but scope, risk, remote-effect, revision, and acceptance gates remain binding. Direction-changing feedback creates needs_revision and a revised proposal rather than edit authorization. Successful Delivery ends only after a scoped acceptance Receipt."
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
            "statement": "C10 established registry/projection synchronization; the confirmed C21 architecture narrows discovery to nine commands and defers deletion to M8."
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
              "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.lessons[0:2]",
              "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml",
              "digest": "sha256:6bcd75b6ee985ecbc09b6102646c3fe1301ed1a54c25e6b6cb95e653837018a3"
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
                "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.lessons[0:2]",
                "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml"
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
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "The authoritative C21 public/contextual discovery surface contains exactly /hw:guide, /hw:init, /hw:goal, /hw:plan, /hw:cycle, /hw:maintain, /hw:resume, /hw:accept, and /hw:reject. User-visible commands must be registered in the authoritative registry; generated documentation, adapters, and command-inventory tests are projections of that registry. Chat, Explain, Status, Report, Log, Check, Compact, Knowledge, consistency Sync, Debug, explicit start, and Plan phases are natural/internal behavior. Setup, Rules, Stop command, Skip, Reset, Showcase, Patch, Help, Watchdog, and plan-confirm remain M8 removal candidates. Deferred or removal-candidate capabilities must not be advertised as executable backends."
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
            "statement": "C8-C11 established review evidence, worker governance, two-layer context, and degradation rules; C21 makes role separation risk-based and mandatory for material work."
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
              "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.summary",
              "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml",
              "digest": "sha256:6bcd75b6ee985ecbc09b6102646c3fe1301ed1a54c25e6b6cb95e653837018a3"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.lessons[2]",
              "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml",
              "digest": "sha256:de025e24bb8312b5c0f0e35cabe43297c4a169812764df83f82639374f304d93"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M4",
              "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
              "digest": "sha256:40ec925c5ff4316ca0eba2532bf24f400a9b8edbff30ffbfe19dd47cf820c62c"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Milestones / M04-M06 and Review Evidence",
              "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md",
              "digest": "sha256:d56b1755c6f898a0c4c88edf1be241d72296d36f9f49debf55f47e3340eb7f9a"
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
                "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.summary",
                "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.lessons[2]",
                "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M4",
                "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Milestones / M04-M06 and Review Evidence",
                "locator": ".pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md"
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
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "Use separated test, implementation, and audit identities for material work, preserving review artifacts and retry evidence; never silently downgrade a prompt that requires separation. Worker input separates the host-rule envelope from task-specific checks, and unavailable worker support must produce an explicit governed fallback. Small reversible changes may use solo-verified only when policy selects it. Migration additionally uses read-only Extractors, a proposal-only Curator, an independent Auditor, and one deterministic writer; proposal workers cannot write authoritative Records."
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
              "ref": ".pipeline/architecture.md#Recovery Flow",
              "locator": ".pipeline/architecture.md",
              "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/reports/C21-recovery-journal-compaction-design.md#核心判断; Recovery Journal; Incremental Context Capsule; Recovery Pack; 存储与隐私",
              "locator": ".pipeline/reports/C21-recovery-journal-compaction-design.md",
              "digest": "sha256:c6c1c111745827db005ce0ddc88b45587a64c205fcfabee024211f42814281ec"
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
                "ref": ".pipeline/architecture.md#Recovery Flow",
                "locator": ".pipeline/architecture.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/reports/C21-recovery-journal-compaction-design.md#核心判断; Recovery Journal; Incremental Context Capsule; Recovery Pack; 存储与隐私",
                "locator": ".pipeline/reports/C21-recovery-journal-compaction-design.md"
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
            "statement": "C10-C19 preserve configuration, abstraction, visible-gate, named-phase, and durable-research lessons; the confirmed M6 route integrates them adaptively instead of retaining fixed overhead or separate public phase commands."
          },
          "sources": [
            {
              "type": "legacy_file",
              "ref": ".pipeline/architecture.md#Delivery Lifecycle; Command Exposure",
              "locator": ".pipeline/architecture.md",
              "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.summary",
              "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml",
              "digest": "sha256:6bcd75b6ee985ecbc09b6102646c3fe1301ed1a54c25e6b6cb95e653837018a3"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Milestones M0",
              "locator": ".pipeline/archives/C10-experience-optimizations/summary.md",
              "digest": "sha256:22f1da7307359f10872686a3dca085b5ff2576550269ddb76dc984464e9e24d9"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.lessons[1]",
              "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml",
              "digest": "sha256:de025e24bb8312b5c0f0e35cabe43297c4a169812764df83f82639374f304d93"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M2",
              "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
              "digest": "sha256:40ec925c5ff4316ca0eba2532bf24f400a9b8edbff30ffbfe19dd47cf820c62c"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#里程碑 M0-M7 and 关键数据 > 最终决定",
              "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md",
              "digest": "sha256:7240d551caad5116ea0e448c1092a7a2d5a3fea26335c6e2b619e698d5ab0a1c"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Objective; Requirements; Boundaries; Technical Route",
              "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md",
              "digest": "sha256:4c56d9c91289fa119f763bee29a057cf4ea2af205f8eed2ca4ecf0d13884239c"
            },
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
            },
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
            "scope": {
              "type": "project",
              "ref": "project:hypo-workflow"
            },
            "kind": "requirement",
            "source_refs": [
              {
                "type": "legacy_file",
                "ref": ".pipeline/architecture.md#Delivery Lifecycle; Command Exposure",
                "locator": ".pipeline/architecture.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.summary",
                "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Milestones M0",
                "locator": ".pipeline/archives/C10-experience-optimizations/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.lessons[1]",
                "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M2",
                "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#里程碑 M0-M7 and 关键数据 > 最终决定",
                "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Objective; Requirements; Boundaries; Technical Route",
                "locator": ".pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml#cycle.summary and cycle.lessons",
                "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": "legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md#改动摘要 and Milestones C19-M1 through C19-M3",
                "locator": ".pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C15/cycle#cycle.lessons: P2 technical route review",
                "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml"
              },
              {
                "type": "legacy_file",
                "ref": "legacy:C15/summary#Milestones: C15-M1 P2 Technical Route Gate",
                "locator": ".pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md"
              }
            ],
            "confidence": "high",
            "dedupe_key": "project:c21:m6-goal-cycle-adaptive-plan-route",
            "created_at": "2026-05-16T12:40:46+08:00",
            "updated_at": "2026-07-12T08:15:40+08:00",
            "supersedes": [],
            "body": "C21-M6 implements Goal and Cycle as peer Delivery kinds, adaptive planning, explicit start, separated execution, verification, Resume, manual Accept/Reject, and the exact nine-command surface. Goal uses one Design. Cycle uses ordered Milestones and one final acceptance. Plan first resolves configuration and inherited-state assumptions that materially affect discovery, abstracts user examples into general requirements, and shows the actual technical route and phase artifacts before a major gate. Depth is evidence-driven: concise Goal Design, standard Discover -> Technical Stack -> Architecture -> Decompose -> Generate for weaker models or complex work, and internal durable Deep Plan research when needed. Remove fixed min_rounds and stop asking when material ambiguity is resolved. Approval creates waiting_to_start; directional feedback creates needs_revision until explicit start. Maintain and Codex Hooks are M7, not M6."
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
              "ref": ".pipeline/architecture.md#Codex Adapter Boundary",
              "locator": ".pipeline/architecture.md",
              "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md#Objective; Requirements; Boundaries; Technical Solution",
              "locator": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md",
              "digest": "sha256:3378b14eb346eba879b0d0db69a3e3306ddd39ca143f37692e7cae3d392299db"
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
                "ref": ".pipeline/architecture.md#Codex Adapter Boundary",
                "locator": ".pipeline/architecture.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md#Objective; Requirements; Boundaries; Technical Solution",
                "locator": ".pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md"
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
              "ref": ".pipeline/architecture.md#Deferred Scope",
              "locator": ".pipeline/architecture.md",
              "digest": "sha256:005481f498b19ee0f9e38ed25c052ef05da32eef81cf6b65207789cb8d84ea9f"
            },
            {
              "type": "legacy_file",
              "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#后续 Cycle; 当前版本目标; 兼容策略",
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
            "kind": "decision",
            "source_refs": [
              {
                "type": "legacy_file",
                "ref": ".pipeline/architecture.md#Deferred Scope",
                "locator": ".pipeline/architecture.md"
              },
              {
                "type": "legacy_file",
                "ref": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md#后续 Cycle; 当前版本目标; 兼容策略",
                "locator": ".pipeline/reports/C21-core-cutover-bootstrap-scope.md"
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
    }
  ],
  "exclusions": [
    {
      "key": "auxiliary-surfaces-remain-non-runners",
      "disposition": "excluded_after_curation",
      "reason": "The candidate couples obsolete TUI and consistency-Sync surfaces with an old SessionStart policy. Current Skill-first projection and the bounded M7 Hook contract preserve the durable non-runner principle without activating removed or deferred interfaces."
    }
  ],
  "summary": {
    "original_candidates": 66,
    "curated_candidates": 42,
    "active_dedupe_keys": 39,
    "inactive_history": [
      "c21-current-stash-git-snapshot-draft",
      "history-legacy-local-authority",
      "history-structured-rules-authority"
    ],
    "source_references": 124,
    "unique_source_locators": 56,
    "frozen_legacy_at": "2026-07-12T08:15:40+08:00"
  },
  "validation": {
    "extraction_proposal_hashes": {
      "m5-curated-durable-history": "ec75abb5f24b2982d2f5560286c07c1e72ee83a974353fc9725103342591e35d",
      "m5-curated-current-c21": "9f9776cfe5f7e3d92315383ebeed2a3494d79d651875c483f57aa0c86f3ad25b"
    },
    "merge_hash": "784c310330c9621ca75b3facad35febfb4473328ad4c8f269feb85cfa9189251",
    "curation_hash": "bd4b0ac0932e0b7f3a2951d67cbc23d6f1a0fcfe24d7934d394d61511abdd3c9",
    "reverse_order_merge_equal": true,
    "curator_preflight": "schema_graph_hash_path_secret_pass_not_audit"
  }
}
```
<!-- C21_M5_CURATED_PACKAGE_END -->
