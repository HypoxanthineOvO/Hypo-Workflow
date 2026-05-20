# DR008 Project Link Graph 关系类型

Deep Plan: C16 根目录项目管理模式  
Generated: 2026-05-18T23:15:30+08:00  
Mode: local/read-only design, using user-confirmed relations and sample inventory.

## Problem

Global Workspace 需要知道“有哪些项目可以联动”，但项目联动不能被埋在 README、Knowledge 或 Notion 正文里。项目注册表回答“有哪些对象”，Project Link Graph 回答“这些对象之间是什么关系”。二者必须避免双 source-of-truth。

## Authority

Recommended authority:

- edge authority lives in `~/.hypo-workflow/workspace.yaml`;
- per-project pages and Notion views project/link edges as derived views;
- auto-discovered edges start as `proposed`;
- user-confirmed edges become `confirmed`;
- archived/deprecated relations remain as history unless explicitly removed.

## Edge Schema

```yaml
edges:
  - id: edge-hypo-info-replaced-by-v2
    from: hypo-info
    to: hypo-info-v2
    type: replaced_by
    status: confirmed
    authority: user
    direction: from_to
    evidence_refs:
      - user-confirmation-2026-05-18
      - .pipeline/deep-plans/DP001-root-project-management-mode/representative-sample-selection.md
    projection:
      project_home: true
      global_graph: true
      notion: summary_link_only
    created_at: "..."
    updated_at: "..."
```

Required fields:

- `id`
- `from`
- `to`
- `type`
- `status`: proposed, confirmed, deprecated, archived
- `authority`: user, local_scan, notion_scan, inferred, imported
- `direction`: from_to, bidirectional
- `evidence_refs`
- `projection`
- `created_at`
- `updated_at`

## Core Relation Types

| Type | Direction | Meaning | Example |
|---|---|---|---|
| `replaced_by` | old -> new | old object is archived/predecessor, new object is canonical | `Hypo-Info -> Hypo-Info-V2`; `Hypo-Agent -> Hypo-Claw` |
| `predecessor_of` | old -> new | inverse vocabulary for display; should derive from `replaced_by` | derived from confirmed edges |
| `successor_of` | new -> old | inverse display edge | derived from confirmed edges |
| `forked_from` | new -> source | project split or fork with shared ancestry | future use |
| `split_into` | old -> new objects | old object split into several successors | future use |
| `merged_into` | old -> target | object folded into another object | future use |
| `depends_on` | consumer -> provider | runtime/build/process dependency | writer depending on info API, if confirmed |
| `feeds_content_to` | source -> consumer | source provides content/data to another project | likely `Hypo-Info-V2 -> Hypo-Writer` |
| `publishes_to` | producer -> channel | project publishes to external channel object | `Hypo-Writer -> WeChat` object |
| `uses_service` | consumer -> service | project uses local/global service or skill | projects using `Hypo-Image` |
| `provides_skill_to` | skill -> consumer | skill/service capability relationship | `Hypo-Image -> user projects` |
| `shares_secret_ref` | bidirectional or group edge | objects use same secret capability | Notion, WeChat, LLM providers |
| `shares_rules` | bidirectional or group edge | objects share rule packs or global rules | docs language/global rule |
| `shares_knowledge` | bidirectional or group edge | objects share knowledge domain or promoted entries | Hypo-Claw/Hypo-Agent migration |
| `syncs_to` | object -> target | object has remote storage projection | project -> Notion page |
| `tracked_by` | object -> maintenance item | object has active maintenance queue items | any object with pending sync |
| `related_to` | bidirectional | weak relation used when stronger type is unknown | temporary only |

## Confirmed Edges From This Cycle

```yaml
- from: hypo-info
  to: hypo-info-v2
  type: replaced_by
  status: confirmed
  authority: user
  handling: archive predecessor; current status from successor

- from: hypo-agent
  to: hypo-claw
  type: replaced_by
  status: confirmed
  authority: user
  handling: archive predecessor; selected docs/knowledge may migrate/link into successor
```

## Likely Proposed Edges

These should start as `proposed` until explicitly confirmed by user or evidence:

| From | To | Type | Evidence |
|---|---|---|---|
| `hypo-info-v2` | `hypo-writer` | `feeds_content_to` | Hypo-Writer C10 waits on Hypo-Info content readiness. |
| `hypo-image` | image-consuming projects | `provides_skill_to` | Skill is globally available and referenced by writing/image workflows. |
| `hypo-claw` | global workspace | `uses_service` or `notifies` | User wants Hypo-Claw API for task completion/report sync. |
| projects | Notion pages | `syncs_to` | DR001/DR005 page bindings. |

## Registry Interaction

The Project Registry should contain object identity and canonical local/remote refs:

```yaml
objects:
  hypo-info-v2:
    type: project
    status: current
    local_path: /home/heyx/Hypo-Info-V2
```

The Link Graph should contain relations:

```yaml
edges:
  - from: hypo-info
    to: hypo-info-v2
    type: replaced_by
```

The registry may cache derived display fields such as `predecessors: [hypo-info]`, but those must be generated from graph edges.

## Projection

Project Home should show:

- predecessor/successor links;
- dependency and content-flow links;
- shared secret/rule/knowledge indicators;
- Notion sync target links;
- pending maintenance queue edges.

Global Workspace should show:

- relation table;
- filtered graph by type;
- orphan objects with no relation;
- proposed edges needing review.

## DR008 Decision

Project Link Graph v1 should use explicit typed edges in `workspace.yaml`, with confirmed user edges for `Hypo-Info -> Hypo-Info-V2` and `Hypo-Agent -> Hypo-Claw`. Registry is object identity authority; graph is relation authority; Knowledge/Notion/Project Home are projection surfaces.
