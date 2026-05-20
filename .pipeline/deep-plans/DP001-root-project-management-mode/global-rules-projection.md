# DR011 全局规则研究与投影

Deep Plan: C16 根目录项目管理模式  
Generated: 2026-05-18T23:15:30+08:00  
Mode: local read-only; based on `references/rules-spec.md`, current global config, and project rules.

## Problem

用户希望根目录模式维护全局规则，让 Workflow 知道全局习惯、项目覆盖关系和跨项目一致性要求。规则是执行边界，不应由 Notion 页面正文反向修改；Notion 只能展示规则状态、冲突和影响范围。

## Existing Contract

From `references/rules-spec.md`:

- structured rules are authority;
- Markdown habits and platform adapters are derived views;
- precedence: `cycle > project > global > builtin`;
- global structured rules live under `~/.hypo-workflow/rules/structured/*.yaml` when configured;
- `.pipeline/rules.yaml` controls project rule extensions/overrides.

Current observed global/project state:

- global config: `~/.hypo-workflow/config.yaml` uses `zh-CN`, `Asia/Shanghai`, Knowledge enabled, redaction enabled.
- global structured rule observed: `docs-chinese-language`, scope `global`, severity `error`, requiring README/docs/CHANGELOG/PROJECT-SUMMARY to be Chinese.
- current project `.pipeline/rules.yaml` extends recommended and includes project/builtin rules such as report language/timezone/command namespace.

## Authority Model

| Surface | Authority | Projection |
|---|---|---|
| global structured rules | `~/.hypo-workflow/rules/structured/*.yaml` | Global Rules page |
| project rules | project `.pipeline/rules.yaml` and project structured records | Project Home / Global Rules matrix |
| cycle rules | active `.pipeline/cycle.yaml` / structured cycle records | Project Home current cycle status |
| built-in rules | Workflow package references | derived display |
| platform adapters | generated AGENTS/CLAUDE/OpenCode files | derived display only |
| Notion rules page | projection | not authority |

## Projection Fields

Global Rules projection should include:

- rule id;
- title;
- scope: builtin, global, project, cycle;
- severity: error, warn, info;
- category: style, workflow, guard, safety, docs, sync, secret;
- hooks/lifecycle triggers;
- instruction summary;
- source path;
- affected objects/projects;
- override/conflict status;
- last scanned timestamp.

Example:

```yaml
rules_projection:
  - id: docs-chinese-language
    scope: global
    severity: error
    category: docs
    source_ref: ~/.hypo-workflow/rules/structured/docs-chinese-language.yaml
    affected_projects:
      - hypo-workflow
      - hypo-info-v2
    projection: summary_only
    authority: global_structured_rule
```

## Effective Rules Matrix

The global layer should be able to answer:

- Which global rules apply to this project?
- Which project rules override global/builtin defaults?
- Which cycle rules temporarily override project/global rules?
- Which generated adapter files are stale relative to structured rules?
- Which projects are missing required rule sync?

Suggested matrix:

| Project | Global rules | Project rules | Cycle overrides | Adapter freshness | Conflicts |
|---|---:|---:|---:|---|---|
| `Hypo-Workflow` | yes | yes | if active | check generated adapter | report |
| `Hypo-Info-V2` | yes | yes | active C3 | check | report |
| `Hypo-GPU` | no `.pipeline` | none | none | not applicable | pre-Workflow |

## Interaction With Maintenance Queue

Rules operations:

- `rules_scan`: local read of global/project/cycle rules.
- `rules_effective_matrix`: derived report.
- `rules_projection_dry_run`: Notion projection plan.
- `rules_sync_apply`: remote write or adapter regeneration, confirmation-dependent depending side effect.

Rules changes themselves should be made through `/hw:rules` or explicit maintenance authority changes, not by editing Notion.

## Secret/Policy Boundary

Rules may mention secret policies, but must not contain raw secret values. Secret health and capability status comes from Global Secret Store projection, not from rules files.

## DR011 Decision

Global Rules v1 should provide a read-only effective rules registry and Notion projection. Structured rules remain authority. The root management mode can scan and display global/project/cycle rule interactions and stale adapters, but Notion does not become a rules editing source.
