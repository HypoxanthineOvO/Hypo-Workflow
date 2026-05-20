# DR012 第一版验收标准与 Plan 转换清单

Deep Plan: C16 根目录项目管理模式  
Generated: 2026-05-18T23:15:30+08:00  
Mode: readiness report for converting Deep Research into ordinary `/hw:plan`.

## Deep Research Completion State

Completed research reports:

| ID | Report | Status |
|---|---|---|
| DR001 | `global-project-reconciliation.md` | completed |
| DR002 | `project-classification-taxonomy.md` | completed |
| DR003 | `global-workspace-source-of-truth.md` | completed |
| DR004 | `global-secret-store-schema.md` | completed |
| DR005 | `representative-notion-page-deep-read.md` | completed |
| DR006 | `sample-artifact-inventory.md` | completed |
| DR007 | `global-knowledge-aggregation.md` | completed |
| DR008 | `project-link-graph-taxonomy.md` | completed |
| DR009 | `sync-authority-conflict-matrix.md` | completed |
| DR010 | `maintenance-queue-lifecycle.md` | completed |
| DR011 | `global-rules-projection.md` | completed |
| DR012 | `conversion-readiness-checklist.md` | completed |

## Ready To Convert When

The Deep Plan is ready for ordinary `/hw:plan` after user confirms the implementation boundary:

- first implementation is local-schema/dry-run-first;
- no real Notion writes in the first milestone unless a later explicit apply gate is approved;
- raw secrets may be read only when the task matches capability policy, but implementation must not print or write raw values into repo/report/log/Notion;
- `workspace.yaml` is authority and `projects.yaml` remains a derived compatibility view;
- predecessor relations `Hypo-Info -> Hypo-Info-V2` and `Hypo-Agent -> Hypo-Claw` are accepted graph seeds.

## Proposed First Implementation Milestones

### M1 Workspace Authority Schema

Deliver:

- draft `~/.hypo-workflow/workspace.yaml` schema;
- object registry model with project/skill/service/pre-Workflow classes;
- relation graph schema with confirmed predecessor edges;
- migration/dry-run from DR001/DR002 into workspace draft;
- no writes to other projects or Notion.

Validation:

- YAML schema parse tests;
- fixture tests for DR001/DR002 conversion;
- duplicate id/alias detection;
- relation graph validation.

### M2 Artifact Catalog Scanner

Deliver:

- read-only scanner for selected/local projects;
- artifact kind classification;
- freshness/parseability/sensitivity metadata;
- stale derived summary detection;
- secret path skip policy.

Validation:

- fixtures for current, legacy, pre-Workflow, and skill/service objects;
- parse-error vs missing tests;
- secret redaction tests;
- sample report generation.

### M3 Storage Sync Template And Notion Mapping Dry-Run

Deliver:

- generic storage template with page tree, artifact slots, record schema, operation protocol;
- Notion adapter read-only mapping from explicit page ids/refs;
- Project Home merge-plan generator;
- legacy reconciliation dry-run for sample pages.

Validation:

- fixture-based Notion block mapping tests;
- no-network unit tests for projection;
- dry-run output tests;
- no remote write path enabled by default.

### M4 Maintenance Queue And Ledger

Deliver:

- `~/.hypo-workflow/maintenance/queue.yaml` and `ledger.yaml` schema;
- operation lifecycle: scan, diff, dry-run, waiting confirmation, apply, verify, record;
- side-effect levels and gating;
- evidence path convention.

Validation:

- lifecycle transition tests;
- confirmation-required tests for remote writes;
- ledger append/redaction tests;
- failed verification handling tests.

### M5 Global Knowledge / Rules / Secret Ref Projections

Deliver:

- global Knowledge derived index scanner;
- global rules effective matrix scanner;
- secret reference/capability projection model;
- Notion/global workspace projection dry-run surfaces.

Validation:

- no raw record dump by default;
- structured rule precedence tests;
- secret ref redaction tests;
- project-affect matrix tests.

### M6 First End-To-End Dry-Run

Deliver:

- one command/path to generate:
  - workspace draft;
  - artifact catalog;
  - Notion Project Home dry-run for selected samples;
  - maintenance queue items;
  - readiness/verification report.
- no real remote writes.

Validation:

- run on current repo and selected samples;
- generated reports are deterministic enough for review;
- all YAML validates;
- raw secret scan/check confirms no secret values in generated artifacts.

## Acceptance Criteria For V1

Functional:

- can list canonical/current/legacy/pre-Workflow/skill objects;
- can show current project status from local authority and mark stale summaries;
- can represent predecessor/successor edges;
- can generate Project Home merge dry-run for existing Notion pages;
- can create maintenance queue items and ledger evidence;
- can project Global Knowledge/Rules/Secret refs without raw secret leakage.

Safety:

- no Notion writes without dry-run and explicit confirmation;
- no raw secret values in repo, reports, Knowledge, Notion, logs, diffs, or generated summaries;
- secret-bearing files are not opened by artifact scanner unless a task explicitly needs secret use and matches capability policy;
- legacy pages are not overwritten; they are classified, linked, or migrated by merge plan.

Quality:

- real runnable tests cover schema validation, classification, graph validation, conflict matrix, queue lifecycle, redaction, and Notion projection fixtures;
- no pseudo-test acceptance;
- reports are Chinese by default where user-facing;
- timezone is Asia/Shanghai for progress/log surfaces.

## Remaining Discussion Before `/hw:plan`

Only one decision is needed before ordinary planning:

Should the first implementation stop at local dry-run generation, or should it include a final gated Notion apply path after dry-run review?

User decision on 2026-05-19T01:00:13+08:00: include the real apply path in the first-version plan, but place it at the end. The implementation should first generate and review the full schema/dry-run/merge plan, then expose real Notion apply only after final plan approval and explicit apply confirmation.

## DR012 Decision

Deep Research is sufficient to enter ordinary `/hw:plan`. The first-version plan should include real Notion apply as a final gated phase, after schema/scanner/dry-run/queue/ledger work and after the full apply plan is reviewed.
