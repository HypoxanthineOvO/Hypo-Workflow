# DR009 同步 Authority / Conflict Matrix

Deep Plan: C16 根目录项目管理模式  
Generated: 2026-05-18T23:15:30+08:00  
Mode: design report based on DR005/DR006 samples and existing Workflow specs.

## Problem

根目录管理模式会同时读取本地 Workflow artifacts、Notion 旧项目笔记、全局 workspace manifest、全局 secrets/rules/knowledge，以及每个项目自己的 README/docs。若没有字段级 authority，Notion 旧页可能覆盖当前本地状态，或本地派生产物可能覆盖用户手写的长期笔记。

## Principle

Synchronization is not file mirroring. It is field-level reconciliation.

Every synced object/field needs:

- `authority`: local, remote, workspace, field-level, derived, legacy, external
- `direction`: local_to_remote, remote_to_local, bidirectional_with_conflict, projection_only, no_sync
- `conflict_policy`: prefer_authority, ask_user, merge_plan, mark_stale, skip
- `evidence_refs`: files/pages used in the decision

## Authority Matrix

| Domain | Authority | Direction | Conflict policy |
|---|---|---|---|
| object id / canonical identity | `~/.hypo-workflow/workspace.yaml` | local config to projections | ask user for new/ambiguous ids |
| project local path | `workspace.yaml` after discovery | local config to projections | ask before rebinding |
| Notion page binding | `workspace.yaml` plus verified Notion page id | local config to adapter | ask before changing existing binding |
| current Workflow status | `.pipeline/state.yaml`, continuation, cycle/log | local to Notion projection | local wins; stale derived files flagged |
| human progress summary | `.pipeline/PROGRESS.md` | local to Notion projection | stale if older/conflicts with state |
| README-like overview | field-level: current local README/summary vs legacy Notion prose | merge plan | ask for conflicts on hand-written prose |
| legacy project notes | existing Notion page / old project artifacts | preserve/link/migrate | never overwrite without merge plan |
| Cycle prompts | local `.pipeline/prompts/**` | local to Notion canonical Cycle page | local wins; Notion index is projection |
| Cycle reports | local `.pipeline/reports/**` | local to Notion canonical Cycle page | local wins; Notion index is projection |
| architecture current | local architecture artifacts | local to Notion Architecture page | local wins for current, legacy linked separately |
| architecture legacy | old Notion child pages and predecessor artifacts | preserve/link | merge plan |
| Knowledge raw records | owning project `.pipeline/knowledge/records` | no default remote full sync | summary/index only unless explicitly requested |
| Knowledge compact/index | generated from project Knowledge | projection to global/index pages | derived/stale checks |
| Global Knowledge authored records | `~/.hypo-workflow/knowledge/records` | projection to Notion | local wins |
| rules | structured rules and `.pipeline/rules.yaml` | projection only | structured records win; Notion not authority |
| raw secrets | `~/.hypo-workflow/secrets.yaml` or private backend | no sync | never project raw value |
| secret refs/capabilities | workspace/global secret refs | projection metadata | local wins; health status can update |
| Notion block layout ids | Notion API | remote structural state | adapter preserves/updates via dry-run |
| maintenance queue | `~/.hypo-workflow/maintenance/queue.yaml` | local operational state | local wins; Notion may display summary |
| maintenance ledger | `~/.hypo-workflow/maintenance/ledger.yaml` | append-only local evidence | local wins; sanitized projection only |

## Conflict States

| State | Meaning | Default action |
|---|---|---|
| `clean` | source and projection match expected hash/ref | no action |
| `missing_local` | remote exists but no local object/artifact | classify as legacy/notion-only or ask |
| `missing_remote` | local object lacks remote binding/page | propose create/bind operation |
| `access_blocked` | expected remote cannot be read by adapter | stop and report access gate |
| `stale_derived` | derived local file conflicts with stronger source | mark stale; do not project stale value |
| `local_changed` | local authority changed since last sync | create local-to-remote diff |
| `remote_changed` | remote projection changed but field is local authority | show overwrite/merge decision |
| `both_changed` | both local and remote changed since last baseline | ask user or generate merge plan |
| `legacy_requires_merge` | remote legacy page must be reorganized | produce merge dry-run |
| `parse_error` | source exists but parser failed | classify as parse error, not missing |
| `sensitive_blocked` | artifact might contain raw secrets | skip raw content; project refs only |

## Operation Flow

1. `scan`: collect local and remote source metadata.
2. `classify`: assign object/adoption class and artifact kinds.
3. `baseline`: compare hashes, timestamps, page ids, and previous ledger state.
4. `diff`: generate field-level changes and conflicts.
5. `dry-run`: render human-readable plan and machine-readable operation list.
6. `confirm`: required for remote writes, rebinding, destructive block replacement, or legacy merge.
7. `apply`: perform smallest safe changes.
8. `verify`: re-read sources and compare expected result.
9. `record`: append sanitized ledger event.

## Direction Defaults

| Artifact type | Default direction |
|---|---|
| current state/progress | local to remote projection |
| prompt/report | local to remote projection |
| current architecture | local to remote projection |
| docs | field-level; local current docs win, remote legacy preserved |
| old Notion hand-written notes | remote legacy preserved, migrate/link by dry-run |
| global rules | local to remote projection |
| global secret refs | local to remote metadata projection |
| raw secrets | no sync |
| queue/ledger | local authority, optional summary projection |

## DR009 Decision

First-version sync must implement field-level authority and conflict states before real Notion apply. Notion is a projection and legacy corpus surface; it is not allowed to become authority for current Workflow state, prompts, reports, rules, raw secrets, or logs.
