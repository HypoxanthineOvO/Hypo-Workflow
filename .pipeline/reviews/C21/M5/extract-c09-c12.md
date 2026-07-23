# C21-M5 Legacy Extractor Proposal: C9-C12

## Scope and method

- Extractor role: read-only historical proposal worker.
- Cycles covered: C9, C10, C11, and C12.
- Allowed source classes: archived `cycle.yaml`, `summary.md`, and `knowledge-summary.md` only.
- Selection rule: retain only facts whose absence could materially cause a wrong future product, architecture, safety, planning, validation, or migration decision.
- Output boundary: proposals only. No Record IDs were allocated, no Record Store or index was written, and no activation/runtime/protected Workflow state was changed.

## Source inventory

| Cycle | Source | SHA-256 | Use |
|---|---|---|---|
| C9 | `.pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml` | `c84dfa32eddb2754e10e656648a0bb185113db10d9053961279c8f7cc63591c4` | Gate policy and accepted lessons |
| C9 | `.pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md` | `4707185cf23e13e592e4c41460094ea3903ab4d66111a0d72a2c1b61e3b34dbd` | Accepted capability and validation summary |
| C9 | `.pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/knowledge-summary.md` | `e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177` | Inspected; no C9-specific candidate facts |
| C10 | `.pipeline/archives/C10-experience-optimizations/cycle.yaml` | `6bcd75b6ee985ecbc09b6102646c3fe1301ed1a54c25e6b6cb95e653837018a3` | Accepted outcome and lessons |
| C10 | `.pipeline/archives/C10-experience-optimizations/summary.md` | `22f1da7307359f10872686a3dca085b5ff2576550269ddb76dc984464e9e24d9` | Capability and validation-gap summary |
| C10 | `.pipeline/archives/C10-experience-optimizations/knowledge-summary.md` | `e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177` | Inspected; duplicate compact snapshot with no C10-specific candidate facts |
| C11 | `.pipeline/archives/C11-workflow-experience-issues/cycle.yaml` | `de025e24bb8312b5c0f0e35cabe43297c4a169812764df83f82639374f304d93` | Accepted outcome and lessons |
| C11 | `.pipeline/archives/C11-workflow-experience-issues/summary.md` | `40ec925c5ff4316ca0eba2532bf24f400a9b8edbff30ffbfe19dd47cf820c62c` | Capability and validation summary |
| C11 | `.pipeline/archives/C11-workflow-experience-issues/knowledge-summary.md` | `e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177` | Inspected; duplicate compact snapshot with no C11-specific candidate facts |
| C12 | `.pipeline/archives/C12-workflow-deep-plan-discussion/cycle.yaml` | `e0aadc6cde082180e77fbb5a70d94a81d955ed9034d6d084827a8a2440fc8406` | Archived metadata and status conflict evidence |
| C12 | `.pipeline/archives/C12-workflow-deep-plan-discussion/summary.md` | `7240d551caad5116ea0e448c1092a7a2d5a3fea26335c6e2b619e698d5ab0a1c` | Accepted Deep Plan architecture and completion evidence |
| C12 | `.pipeline/archives/C12-workflow-deep-plan-discussion/knowledge-summary.md` | `e6572a26d26b1f057541b54d3fbe100999ab8326b5871c82d82e09aea0959177` | Inspected; duplicate compact snapshot with no C12-specific candidate facts |

The four `knowledge-summary.md` files are byte-identical and point to earlier C4/C6/C8 records. They were inventoried but not re-proposed, because doing so would duplicate earlier knowledge rather than extract C9-C12 decisions.

## Excluded-source rationale

- `architecture-snapshot.md` was excluded because it is outside the assigned source allowlist and can contain a broad, duplicated design snapshot rather than a Cycle-level accepted fact.
- Archived or current `state.yaml`, `cycle.yaml` outside C9-C12, `log.yaml`, and `PROGRESS.md` were excluded because they are transient execution/state surfaces and were explicitly outside this extractor's authority.
- Prompts, per-Milestone reports/reviews, chats, transcripts, and tool logs were excluded because they are granular execution evidence, may contain raw/private material, and would exceed the requested decision-oriented extraction boundary.
- Current `.pipeline/` records, manifests, runtime files, snapshots, and indexes were excluded to prevent later state from being mixed into legacy source lineage.
- Release URLs, local installation paths, commit identifiers, routine test counts, and milestone-by-milestone narration were not promoted when they did not change a future decision.

## Candidate Record Patch proposals

```json
[
  {
    "key": "c09-c12-high-impact-human-gates",
    "source_class": "active_requirement",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C9 made high-risk and external effects explicit confirmation gates; C10 retained manual remote-write confirmation; C12 retained confirmation for remote clone/download."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates and cycle.lessons[1]",
        "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml",
        "digest": "sha256:c84dfa32eddb2754e10e656648a0bb185113db10d9053961279c8f7cc63591c4"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Milestones M2",
        "locator": ".pipeline/archives/C10-experience-optimizations/summary.md",
        "digest": "sha256:22f1da7307359f10872686a3dca085b5ff2576550269ddb76dc984464e9e24d9"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#关键数据 > 已知限制",
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
      "kind": "requirement",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates and cycle.lessons[1]",
          "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Milestones M2",
          "locator": ".pipeline/archives/C10-experience-optimizations/summary.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#关键数据 > 已知限制",
          "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md"
        }
      ],
      "confidence": 0.99,
      "dedupe_key": "safety/high-impact-human-gates",
      "created_at": "2026-07-12T07:07:51+08:00",
      "updated_at": "2026-07-12T07:07:51+08:00",
      "supersedes": [],
      "body": "高风险或外部副作用必须保留显式人工门禁：破坏性或外部操作、插件安装、用户级配置写入、远程 PR/MR 写入、Release 发布以及远程仓库克隆或下载均需确认；PR/MR 本地归档等无远端副作用的准备工作可在门禁前完成。"
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
    "key": "c09-claude-command-namespace-safety",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C9 explicitly fixed the Claude native /resume collision and recorded namespace separation as a lasting lesson."
    },
    "sources": [
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
          "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lessons[2]",
          "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md#Summary and Milestones M09-M10",
          "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/summary.md"
        }
      ],
      "confidence": 0.99,
      "dedupe_key": "adapter/claude-command-namespace-safety",
      "created_at": "2026-07-12T07:07:51+08:00",
      "updated_at": "2026-07-12T07:07:51+08:00",
      "supersedes": [],
      "body": "Claude 原生命令名不得被裸露的 Hypo Skill 名称遮蔽；Hypo-Workflow 命令使用 `/hw:*` 命名空间，尤其必须保持 Claude 原生 `/resume` 与 Hypo `/hw:resume` 分离。"
    }
  },
  {
    "key": "c10-plan-configure-before-discover",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C10 identifies P0 Configure-before-Discover and state inheritance as a completed planning contract."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Milestones M0",
        "locator": ".pipeline/archives/C10-experience-optimizations/summary.md",
        "digest": "sha256:22f1da7307359f10872686a3dca085b5ff2576550269ddb76dc984464e9e24d9"
      },
      {
        "type": "legacy_file",
        "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.summary",
        "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml",
        "digest": "sha256:6bcd75b6ee985ecbc09b6102646c3fe1301ed1a54c25e6b6cb95e653837018a3"
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
          "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Milestones M0",
          "locator": ".pipeline/archives/C10-experience-optimizations/summary.md"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.summary",
          "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml"
        }
      ],
      "confidence": 0.94,
      "dedupe_key": "plan/configure-before-discover",
      "created_at": "2026-07-12T07:07:51+08:00",
      "updated_at": "2026-07-12T07:07:51+08:00",
      "supersedes": [],
      "body": "既有 Plan 合同在 Discover 之前设置 P0 Configure 阶段，用于先确定配置和状态继承假设，再进入需求发现；后续重构该顺序时必须显式判断是否保留或替代这项职责。"
    }
  },
  {
    "key": "c10-c11-subagent-governance-and-two-layer-context",
    "source_class": "cross_cycle_constraint",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C10 accepted authorization, isolation, and degraded-mode governance; C11 refined prompt injection into host-envelope and task-check layers."
    },
    "sources": [
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
        }
      ],
      "confidence": 0.98,
      "dedupe_key": "subagent/governance-two-layer-context",
      "created_at": "2026-07-12T07:07:51+08:00",
      "updated_at": "2026-07-12T07:07:51+08:00",
      "supersedes": [],
      "body": "Subagent 机制需要保留授权、角色隔离和不可用时的降级治理；注入给 worker 的上下文应分为宿主规则 envelope 与任务专属检查层，避免把平台约束和具体任务检查混为一层。"
    }
  },
  {
    "key": "c10-command-registry-derived-surface-sync",
    "source_class": "cross_cycle_constraint",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C10 records two coupled lessons: user-facing subcommands need registry visibility, and generated docs/regression counts must move with registry changes."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.lessons[0:2]",
        "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml",
        "digest": "sha256:6bcd75b6ee985ecbc09b6102646c3fe1301ed1a54c25e6b6cb95e653837018a3"
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
          "ref": ".pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.lessons[0:2]",
          "locator": ".pipeline/archives/C10-experience-optimizations/cycle.yaml"
        }
      ],
      "confidence": 0.99,
      "dedupe_key": "commands/registry-docs-regression-sync",
      "created_at": "2026-07-12T07:07:51+08:00",
      "updated_at": "2026-07-12T07:07:51+08:00",
      "supersedes": [],
      "body": "当子命令被定义为用户可见工作流时，即使与其他入口共享同一个 Skill 实现，也必须在 command registry 中显式可发现；registry 变化需同步更新生成文档和命令数量回归场景。"
    }
  },
  {
    "key": "c10-remote-pr-validation-gap",
    "source_class": "important_feedback_failure",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C10 passed focused and full local validation but explicitly states that a real remote PR/MR smoke was not run."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/archives/C10-experience-optimizations/summary.md#Key Data > Warnings",
        "locator": ".pipeline/archives/C10-experience-optimizations/summary.md",
        "digest": "sha256:22f1da7307359f10872686a3dca085b5ff2576550269ddb76dc984464e9e24d9"
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
        }
      ],
      "confidence": 0.99,
      "dedupe_key": "validation/remote-pr-smoke-not-run-c10",
      "created_at": "2026-07-12T07:07:51+08:00",
      "updated_at": "2026-07-12T07:07:51+08:00",
      "supersedes": [],
      "body": "C10 对 GitHub/GitLab PR/MR 远端适配器的验收没有执行真实远端 smoke；后续验证或发布结论不得把本地合同测试等同于真实远端操作已验证。"
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
    "key": "c11-plan-examples-require-abstraction",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C11 records generalizing examples before decomposition as an accepted planning lesson."
    },
    "sources": [
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
          "ref": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.lessons[1]",
          "locator": ".pipeline/archives/C11-workflow-experience-issues/cycle.yaml"
        },
        {
          "type": "legacy_file",
          "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M2",
          "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md"
        }
      ],
      "confidence": 0.99,
      "dedupe_key": "plan/examples-to-generalized-requirements",
      "created_at": "2026-07-12T07:07:51+08:00",
      "updated_at": "2026-07-12T07:07:51+08:00",
      "supersedes": [],
      "body": "Plan 中的用户示例是需求证据而不是最终范围；进入 Milestone decomposition 之前，应先把示例抽象成一般化需求并完成确认。"
    }
  },
  {
    "key": "c11-user-visible-response-contract",
    "source_class": "active_requirement",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C11 M1 established a human-readable conclusion/explanation/next-step response contract."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M1",
        "locator": ".pipeline/archives/C11-workflow-experience-issues/summary.md",
        "digest": "sha256:40ec925c5ff4316ca0eba2532bf24f400a9b8edbff30ffbfe19dd47cf820c62c"
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
        }
      ],
      "confidence": 0.98,
      "dedupe_key": "ux/response-conclusion-explanation-next-step",
      "created_at": "2026-07-12T07:07:51+08:00",
      "updated_at": "2026-07-12T07:07:51+08:00",
      "supersedes": [],
      "body": "用户可见的 Workflow 回应采用人类可读的“结论、解释、下一步”结构，使用户不依赖内部文件或执行日志也能理解结果和后续动作。"
    }
  },
  {
    "key": "c09-c11-durable-automation-whitelist-boundary",
    "source_class": "cross_cycle_constraint",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C11 accepted a durable automation authorization whitelist, while C9 defines explicit high-impact gates that coexist with automation."
    },
    "sources": [
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
        "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates",
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
      "kind": "decision",
      "source_refs": [
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
          "ref": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates",
          "locator": ".pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml"
        }
      ],
      "confidence": 0.95,
      "dedupe_key": "automation/durable-whitelist-with-gates",
      "created_at": "2026-07-12T07:07:51+08:00",
      "updated_at": "2026-07-12T07:07:51+08:00",
      "supersedes": [],
      "body": "长期自动化授权白名单是已接受的能力，但白名单必须与显式高影响门禁共同解释，不能被当作静默取消破坏性、远端写入、Release 发布或用户级配置确认的依据。"
    }
  },
  {
    "key": "c12-deep-plan-durable-discussion-package",
    "source_class": "architecture_decision",
    "future_decision_risk": "material",
    "current": true,
    "reviewed": true,
    "support": {
      "status": "confirmed",
      "statement": "C12 completed Deep Plan as a first-class durable discussion lifecycle with research, modeling, readiness, conversion, and ordinary-Plan handoff rather than execution semantics."
    },
    "sources": [
      {
        "type": "legacy_file",
        "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#里程碑 M0-M7 and 关键数据 > 最终决定",
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
      "kind": "decision",
      "source_refs": [
        {
          "type": "legacy_file",
          "ref": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#里程碑 M0-M7 and 关键数据 > 最终决定",
          "locator": ".pipeline/archives/C12-workflow-deep-plan-discussion/summary.md"
        }
      ],
      "confidence": 0.99,
      "dedupe_key": "plan/deep-plan-durable-discussion-package",
      "created_at": "2026-07-12T07:07:51+08:00",
      "updated_at": "2026-07-12T07:07:51+08:00",
      "supersedes": [],
      "body": "Deep Plan 被设计为一级的持久 Discussion Package 生命周期而不是执行器：它保存第一性原理提问、只读研究证据、Requirement Tracks、Architecture Map、Drill 与 Readiness/Convert 门禁，成熟后再把 Feature Queue 交给普通 Plan。"
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
  }
]
```

## Scan and count

- Exact proposal count: **13**.
- Caller-assigned Record IDs: **0**.
- Outer candidate `supersedes` links: **0**; no within-batch candidate was proven to supersede another.
- Record Patch `supersedes` values remain empty for Curator/deterministic-writer compilation into Record IDs.
- Secret scan: no credential values, private keys, bearer tokens, API keys, passwords, or secret references were copied into proposals.
- Path scan: all proposal provenance paths are repository-relative and limited to the twelve inventoried allowlisted files; no absolute home path or external local path appears in the proposal JSON.
