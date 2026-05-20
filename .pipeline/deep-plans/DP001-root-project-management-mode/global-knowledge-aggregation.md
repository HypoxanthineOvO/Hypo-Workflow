# DR007 Global Knowledge 聚合策略

Deep Plan: C16 根目录项目管理模式  
Generated: 2026-05-18T23:15:30+08:00  
Mode: local read-only; based on `references/knowledge-spec.md`, sample project ledgers, and user requirements.

## Problem

用户希望根目录模式不仅知道项目列表，还知道有哪些项目可以联动、共享哪些经验、规则、外部服务和项目知识。现有 Knowledge Ledger 是 project-local：每个项目有自己的 `.pipeline/knowledge/records`、`index` 和 `knowledge.compact.md`。如果全局层直接复制所有 raw records，会带来重复、过期、上下文膨胀和 secret 泄漏风险。

## Existing Local Contract

From `references/knowledge-spec.md`:

- raw records live under `.pipeline/knowledge/records/*.yaml`;
- indexes and `knowledge.compact.md` are generated/derived views;
- `state.yaml` must not store full knowledge records;
- records may contain `secret_refs`, but not raw secret values;
- normal session loading should use compact/index surfaces first and raw records only on explicit request.

## Recommended Model

Global Knowledge should be a two-layer model:

1. **Global authored records**: user-level records for cross-project facts that are not owned by a single repo.
2. **Global derived index**: aggregation of selected per-project compact/index summaries and links back to source records.

Recommended local layout:

```yaml
~/.hypo-workflow/
  knowledge/
    records/              # user-level global records, manually authored or explicitly promoted
    index/                # generated indexes for global records
    knowledge.compact.md  # global compact view
  maintenance/
    knowledge-index.yaml  # derived cross-project index from project ledgers
    knowledge-cache/      # scan cache and evidence
```

The global index is not a raw Knowledge dump. It is a registry of reusable facts and links:

```yaml
global_knowledge_index:
  generated_at: "..."
  sources:
    - object_id: hypo-writer
      path: /home/heyx/Hypo-Writer/.pipeline/knowledge
      compact_hash: "..."
      freshness: current
  entries:
    - id: hypo-writer.wechat-secret-ref
      category: secret_ref
      title: WeChat draft publishing secret reference
      source_object: hypo-writer
      source_ref: .pipeline/knowledge/index/secret-refs.yaml
      summary: "WeChat publishing uses a local secret reference; raw values are not projected."
      related_objects:
        - hypo-info-v2
      sensitivity: secret_ref
      projection: summary_only
```

## Authority Rules

| Knowledge surface | Authority | Sync behavior |
|---|---|---|
| project raw records | owning project `.pipeline/knowledge/records` | do not copy wholesale to global or Notion |
| project indexes | generated from project raw records | can be scanned and summarized |
| project compact | generated project summary | can be included in Global Knowledge Index with source links |
| global raw records | `~/.hypo-workflow/knowledge/records` | authority for cross-project facts |
| global derived index | `~/.hypo-workflow/maintenance/knowledge-index.yaml` | generated, can be stale and regenerated |
| Notion Global Knowledge page | projection | summary/link surface only |

## Categories

Global Knowledge v1 should support these categories:

- `cross_project_decision`: decisions affecting multiple projects.
- `shared_dependency`: common packages, runtime services, or local daemons.
- `shared_api_contract`: reusable API/service contract, e.g. Hypo-Claw integration.
- `publishing_sop`: workflows for WeChat, reports, docs, or external publication.
- `secret_ref`: sanitized references to Global Secret Store capabilities.
- `migration_note`: predecessor/successor migration knowledge.
- `pitfall`: cross-project hazards and known failure modes.
- `style_rule`: writing, docs, UX, prompt, or report conventions.
- `research_reference`: external or internal research references reused across projects.

## Relation To Project Link Graph

Global Knowledge should not infer project relations implicitly and hide them in prose. When a knowledge entry says two projects interact, it should link to explicit graph edges:

- `Hypo-Info-V2 -> Hypo-Writer`: likely `feeds_content_to`.
- `Hypo-Agent -> Hypo-Claw`: `replaced_by`.
- `Hypo-Info -> Hypo-Info-V2`: `replaced_by`.
- `Hypo-Image -> consumer projects`: `provides_skill_to` or `used_by`.

The graph is authority for relations; Knowledge explains the context.

## Notion Projection

The Notion Global Knowledge page should show:

- compact cross-project summaries;
- category indexes;
- related projects/objects;
- source links to Project Home / Knowledge pages;
- sensitivity labels;
- freshness and generated time.

It should not show:

- raw project Knowledge records by default;
- raw secrets or secret file contents;
- full logs or huge raw reports;
- generated cache internals.

## First Implementation Requirements

- Scan project Knowledge compact/index files only.
- Never open known secret files.
- Produce a derived `knowledge-index` report with `source_ref`, `source_hash`, and `freshness`.
- Support explicit promotion of an entry from project Knowledge into global authored Knowledge, preserving provenance.
- Mark stale projects when compact/index is older than state/progress or cannot be parsed.

## DR007 Decision

Global Knowledge v1 should be a lightweight aggregation and promotion layer:

- per-project raw Knowledge remains the authority;
- global authored Knowledge stores only cross-project facts;
- global derived index aggregates compact/index/link metadata;
- Notion receives projection summaries and links, not raw dumps.
