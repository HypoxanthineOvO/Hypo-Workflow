# DR010 Maintenance Queue 语义

Deep Plan: C16 根目录项目管理模式  
Generated: 2026-05-18T23:15:30+08:00  
Mode: design report, informed by `references/feature-queue-spec.md`, log/state specs, and C16 requirements.

## Problem

Cycle 是线性交付流程，Patch 是轻量修复流程；根目录管理需要表达多个对象长期并行维护：项目状态刷新、Notion dry-run、legacy merge、Secret health check、Knowledge aggregation、文章发布状态回写等。它不能伪装成一个普通 Cycle，也不能直接复用 Feature Queue 作为 runner。

## Boundary

Maintenance Queue is:

- a durable queue of maintenance operations;
- not a runner by itself;
- not a replacement for `.pipeline/state.yaml`;
- not a project feature backlog;
- a place to track scan/diff/dry-run/apply/verify/record lifecycle across objects.

Recommended storage:

```yaml
~/.hypo-workflow/
  maintenance/
    queue.yaml
    ledger.yaml
    cache/
    evidence/
      dry-runs/
      apply-results/
      verify-results/
```

## Queue Item Schema

```yaml
items:
  - id: mq-20260518-hypo-info-v2-notion-dry-run
    object_ref: hypo-info-v2
    operation: notion_project_home_dry_run
    target_ref: notion:hypo-projects/hypo-info-v2
    scope:
      artifacts:
        - overview
        - progress
        - architecture
        - prompts_index
        - reports_index
    status: queued
    priority: normal
    side_effect: remote_read_only
    confirmation_required: false
    dependencies: []
    policy_refs:
      - sync-authority-conflict-matrix
    evidence_refs: []
    created_at: "..."
    updated_at: "..."
```

Required fields:

- `id`
- `object_ref`
- `operation`
- `target_ref`
- `scope`
- `status`
- `priority`
- `side_effect`
- `confirmation_required`
- `dependencies`
- `policy_refs`
- `evidence_refs`
- `created_at`
- `updated_at`

## Operation Types

| Operation | Typical side effect | Confirmation |
|---|---|---|
| `project_scan` | local read | no |
| `notion_discover` | remote read | no, if token/scope already configured |
| `artifact_catalog_scan` | local read | no |
| `knowledge_index_refresh` | local reads + local derived write | no/low |
| `secret_health_check` | external provider call | policy-based; audit required |
| `notion_project_home_dry_run` | local/remote read + local evidence write | no |
| `notion_legacy_merge_dry_run` | local/remote read + local evidence write | no |
| `notion_apply` | remote write | yes |
| `workspace_manifest_update` | local global config write | yes if object ids/bindings change |
| `projects_derived_view_refresh` | local derived config write | no after workspace approved |
| `report_projection_refresh` | local/remote read, optional remote write | yes for remote write |
| `hypo_claw_notify` | external API call | policy-based |

## Status Lifecycle

```text
queued
  -> scanning
  -> diff_ready
  -> dry_run_ready
  -> waiting_confirmation
  -> applying
  -> verifying
  -> completed
```

Alternative terminal/intermediate states:

- `blocked`
- `deferred`
- `failed`
- `skipped`
- `cancelled`
- `stale`

## Side-Effect Levels

| Level | Meaning | Default gate |
|---|---|---|
| `local_read` | reads local files only | allowed |
| `remote_read` | reads Notion/provider APIs | allowed when configured and user has requested research/sync |
| `local_derived_write` | writes generated cache/evidence | allowed for current Workflow/global maintenance state |
| `local_authority_write` | changes workspace/secrets/rules authority | ask unless explicit task |
| `remote_write` | writes Notion/external services | dry-run + explicit confirmation |
| `destructive_remote_write` | deletes/replaces remote blocks/pages | explicit confirmation and backup evidence |
| `external_action` | sends notification/pulls tasks/publishes draft | policy-based, audit required |

## Ledger Events

Append-only maintenance ledger events:

```yaml
events:
  - id: ml-20260518-...
    queue_item_id: mq-...
    object_ref: hypo-claw
    event_type: dry_run_created
    status: completed
    timestamp: "..."
    actor: agent
    summary: "Generated Notion Project Home dry-run for Hypo-Claw."
    evidence_refs:
      - ~/.hypo-workflow/maintenance/evidence/dry-runs/...
    redaction:
      raw_secret_seen: false
      raw_secret_recorded: false
```

Ledger must record:

- operation started/completed/failed;
- dry-run evidence path;
- confirmation decision;
- apply result;
- verification result;
- redaction status.

## Failure Policy

| Failure | Default handling |
|---|---|
| local parse error | mark item `blocked` or `diff_ready` with parse warning; do not treat as missing |
| Notion access denied | mark `blocked/access_blocked`; do not guess/create duplicate page |
| stale derived source | mark stale and require source regeneration or authority decision |
| conflict | move to `waiting_confirmation` with merge choices |
| remote write failed | mark `failed`; keep apply evidence and retry plan |
| verification mismatch | mark `failed_verification`; do not mark completed |
| secret missing/invalid | mark dependent operation `blocked`; record sanitized health status |

## Parallelism

Allowed in v1:

- local scans across independent projects;
- remote read-only discovery across independent pages when rate limits allow;
- knowledge index aggregation after scans.

Serialized or gated:

- remote writes;
- destructive block replacement;
- workspace manifest authority changes;
- secret migrations;
- external notifications/publishing calls.

## Relationship To Cycle/Patch

Maintenance Queue can create work that later becomes:

- ordinary Cycle: large implementation/migration;
- Patch: small local fix;
- maintenance apply: sync/update operation that does not modify product code.

Queue items can reference Cycle reports, but Cycle state should not be overwritten by maintenance state.

## DR010 Decision

Maintenance Queue v1 should be a user-level durable operation queue under `~/.hypo-workflow/maintenance/`, with explicit side-effect levels, dry-run first remote writes, verification before completion, and sanitized append-only ledger evidence.
