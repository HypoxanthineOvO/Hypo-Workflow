# DR006 样本 Artifact Catalog 盘点

Deep Plan: C16 根目录项目管理模式  
Generated: 2026-05-18T23:15:30+08:00  
Mode: local read-only; no writes to sampled projects; no secret files were opened.

## Scope

本轮盘点代表性本地对象，用来验证 Artifact Catalog 对 current、legacy、pre-Workflow、skill/service 和 long-running maintenance pressure sample 的覆盖能力。

| Object | Local path | Role |
|---|---|---|
| `Hypo-Info-V2` | `/home/heyx/Hypo-Info-V2` | current canonical successor |
| `Hypo-Info` | `/home/heyx/Hypo-Info` | archived predecessor / legacy Workflow project |
| `Hypo-Claw` | `/home/heyx/Hypo-Claw` | current canonical successor |
| `Hypo-Agent` | `/home/heyx/Hypo-Agent` | archived predecessor / legacy Workflow project |
| `Hypo-GPU` | `/home/heyx/Hypo-GPU` | git-only / pre-Workflow project |
| `Hypo-Writer` | `/home/heyx/Hypo-Writer` | long-running writing maintenance pressure sample |
| `hypo-image` skill | `/home/heyx/.codex/skills/hypo-image` | skill/service object |

## Inventory Summary

| Object | `.pipeline` | README / summary | Prompts | Reports | Archives | Knowledge | Current status signal |
|---|---:|---:|---:|---:|---:|---:|---|
| `Hypo-Info-V2` | yes | yes | 6 prompt files | 2 | 2 | 0 | pending acceptance in state/progress |
| `Hypo-Info` | yes | yes | 6 prompt files | 6 | 2 | 12 | legacy running/plan-discover snapshot |
| `Hypo-Claw` | yes | partial | 18 prompt-like files | 1 | 4 | 11 | state continuation points to C6/M6 owner validation |
| `Hypo-Agent` | yes | yes | 9 prompt-like files | not fully counted | 8 | 11 | legacy C9 executing snapshot; YAML parse compatibility issue |
| `Hypo-GPU` | no | README only | none | none | none | none | Notion manual Project Home is the richer status source |
| `Hypo-Writer` | yes | yes | 4 | 15 | 9 | 16 | waiting acceptance / blocked by external content readiness |
| `hypo-image` skill | no project pipeline | skill `SKILL.md` | none | none | none | skill docs only | skill/service config and safety contract |

Counts are approximate artifact counts from file-system discovery and are intended for schema design, not final audit.

## Hypo-Info-V2

Classification: `workflow-managed/current-successor`  
Canonical relation: successor of old `Hypo-Info`.

Observed artifacts:

- `README.md`, `PROJECT-SUMMARY.md`
- `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, `.pipeline/PROGRESS.md`
- `.pipeline/architecture.md`
- `.pipeline/prompts/`, `.pipeline/reports/`, `.pipeline/archives/`
- `.pipeline/config.yaml`, `.pipeline/log.yaml`, `.pipeline/prompt-manifest.yaml`, `.pipeline/rules.yaml`

Current state signals:

- `state.yaml`: pipeline is `pending_acceptance`, prompts completed 6/6, current step `await_acceptance`.
- `PROGRESS.md`: C3 is pending acceptance after M1-M6 completion.
- `PROJECT-SUMMARY.md`: appears stale; it describes C3 as planning while state/progress show completed execution awaiting acceptance.

Catalog implications:

- `state.yaml` and `PROGRESS.md` are stronger current status sources than `PROJECT-SUMMARY.md`.
- Derived summaries need freshness metadata and stale detection.
- Project Home should prefer current execution state from `state.yaml`/`cycle.yaml`/`log.yaml` plus human-readable projection from `PROGRESS.md`.

## Hypo-Info

Classification: `workflow-managed/archived-predecessor`  
Canonical relation: predecessor of `Hypo-Info-V2`.

Observed artifacts:

- README and `PROJECT-SUMMARY.md`
- `.pipeline` with state/progress/architecture/prompts/reports/archives/knowledge/rules
- non-trivial Knowledge Ledger content

Current state signals:

- `state.yaml`: legacy Cycle 2-era state with phase `plan_discover` and prompt `extend-plan-benchmark-refresh-aa-coverage-aliases`.
- `PROGRESS.md`: old C2/v0.5.0 benchmark refresh and source coverage work.

Catalog implications:

- Legacy Workflow artifacts are still valuable Knowledge and architecture history.
- They should be imported or linked as `legacy_predecessor` artifacts, not merged into the active `Hypo-Info-V2` current status.
- Knowledge records from legacy projects need relation-aware projection: useful records can link to current successor but keep original provenance.

## Hypo-Claw

Classification: `workflow-managed/current-successor`  
Canonical relation: successor of `Hypo-Agent`.

Observed artifacts:

- `PROJECT-SUMMARY.md`, `package.json`
- `.pipeline` with state, continuation, feature queue, research, audits, knowledge, rules, archives, prompts, reports
- complex active/continued Cycle evidence

Current state signals:

- `state.yaml` plus continuation data points to C6/M6 owner validation.
- `PROGRESS.md` is still titled around C5 and appears stale relative to continuation/state.
- Knowledge compact references migrated config/secrets concepts from Hypo-Agent; raw secret files were not read.

Catalog implications:

- Active continuation state must be part of Artifact Catalog, not just top-level state.
- `PROGRESS.md` can be stale even in current projects.
- Artifact freshness should be computed per file/source, not per project.
- Secret refs in Knowledge must remain references only.

## Hypo-Agent

Classification: `workflow-managed/archived-predecessor`  
Canonical relation: predecessor of `Hypo-Claw`.

Observed artifacts:

- README, `PROJECT-SUMMARY.md`, `package.json`
- large `.pipeline` with architecture, prompts, archives, knowledge, patches, reports
- legacy secret/config references in docs and summaries; raw secret files were not read

Current state signals:

- State file appears to contain unquoted timestamp objects that trigger Ruby safe YAML parse incompatibility.
- Manual read shows legacy C9 execution state and full-regression/live-acceptance context.

Catalog implications:

- Artifact scanner must separate `parse_error` from `missing`.
- Legacy state format compatibility matters; old Workflow-generated files may not parse with current strict loader.
- Predecessor projects can contain integration docs, audits, and architectural records useful for successors.

## Hypo-GPU

Classification: `git-only/pre-workflow`

Observed artifacts:

- README and Python project metadata.
- No `.pipeline` directory found.
- Notion page is richer than local Workflow state for milestones and process.

Catalog implications:

- Missing Workflow artifacts must be represented explicitly:
  - `state`: unavailable
  - `cycle`: unavailable
  - `prompts`: unavailable
  - `reports`: unavailable
  - `knowledge`: unavailable
- Notion/manual Project Home can be temporary authority for `overview`, `manual_milestones`, and `legacy_docs`.
- First implementation must avoid reporting this as an error; it is a valid adoption state.

## Hypo-Writer

Classification: `workflow-managed/current`, pressure sample for writing/content maintenance.

Observed artifacts:

- README, `PROJECT-SUMMARY.md`, `package.json`
- `.pipeline/state.yaml`, `cycle.yaml`, `PROGRESS.md`, architecture, prompts, reports, archives, knowledge, rules
- many reports and Knowledge records relative to prompt count

Current state signals:

- `state.yaml`: waiting acceptance after WeChat draft creation/status writeback work.
- `PROGRESS.md`: active C10 daily AI news WeChat pipeline; blocked/waiting on Hypo-Info content readiness.
- Knowledge compact contains publishing SOP, visual references, WeChat secret references, and AI trace style.

Catalog implications:

- Long-running content workflows do not look like ordinary code release cycles.
- Maintenance mode must support article/post/publication objects and external dependency states, not only projects.
- Secret refs and external channel states are first-class maintenance artifacts.

## hypo-image Skill

Classification: `skill/service`

Observed artifacts:

- `~/.codex/skills/hypo-image/SKILL.md`
- no project `.pipeline`
- local skill contract names required wrapper/config files and safety constraints

Catalog implications:

- Object Registry should not be Project-only.
- Artifact kinds need `skill_spec`, `service_config_ref`, `capability`, and `health_check`.
- Secret values stay in the private config/Global Secret Store; syncable artifacts only mention refs/capabilities/safety contract.

## Required Artifact Kinds

The first Artifact Catalog schema should support:

| Kind | Examples | Authority | Projection policy |
|---|---|---|---|
| `project_overview` | README, PROJECT-SUMMARY, Notion intro | field-level | summary plus source links |
| `current_state` | `.pipeline/state.yaml`, continuation | local Workflow | Project Home status, no Notion authority |
| `progress` | `.pipeline/PROGRESS.md`, cycle progress | local Workflow with stale check | Project Home progress block and Cycle pages |
| `cycle_archive` | `.pipeline/archives/**` | local Workflow | Cycle subpages or links |
| `prompt` | `.pipeline/prompts/**` | local Workflow | canonical under Cycle; global index links |
| `report` | `.pipeline/reports/**` | local Workflow | canonical under Cycle; global index links |
| `architecture` | `.pipeline/architecture*`, docs, legacy design pages | field-level | Architecture page tree |
| `knowledge` | `.pipeline/knowledge/**` compact/index/records | local ledger | compact/index first; raw records on demand |
| `docs` | docs, Notion docs child pages | field-level | Docs page tree |
| `rule` | `.pipeline/rules.yaml`, structured rules | structured rules authority | Global/project rules projection |
| `secret_ref` | Knowledge refs, config refs, global secret refs | secret store for raw, refs for sync | metadata only, never raw |
| `runtime_log` | `.pipeline/log.yaml` | local Workflow | summarized evidence, not full log sync by default |
| `skill_spec` | Codex `SKILL.md` | local skill file | service/object docs projection |
| `service_config_ref` | private config path refs | local private config / secret store | path/capability only |

## Required Metadata Per Artifact

Each catalog entry needs at least:

- `object_id`
- `artifact_id`
- `kind`
- `path_or_remote_ref`
- `scope`: project, global, legacy, skill, article, service
- `authority`: local, remote, field-level, derived, legacy
- `freshness`: current, stale, unknown, parse_error, missing, not_applicable
- `sensitivity`: public, internal, secret_ref, raw_secret_forbidden
- `projection`: none, summary, full, index, link, child_page, remote_only
- `source_relation`: canonical, predecessor, successor, manual_snapshot, derived_view
- `evidence_refs`

## Freshness And Conflict Lessons

The scanner cannot trust file names alone:

- `PROJECT-SUMMARY.md` can be stale while `state.yaml` is current.
- `PROGRESS.md` can be stale relative to continuation state.
- old `state.yaml` files can be real but parser-incompatible.
- absence of `.pipeline` can be a valid pre-Workflow state.
- Notion pages can be canonical for legacy/manual content but not for current Workflow state.

## DR006 Decisions For Planning

- Artifact Catalog v1 must be read-only and produce a freshness/conflict report before any projection.
- Derived summaries should be regenerated or marked stale; they should not silently override state/log evidence.
- Legacy predecessor artifacts should keep provenance and relation edges.
- `skill/service` and writing/publication objects must be supported by the generic object model, even if v1 Notion apply only covers projects.
- Secret-bearing paths are inventory references only; scanner must never open or copy raw secret values into reports.
