---
name: cycle
description: Manage Hypo-Workflow Cycles with independent milestone sequences, state, progress, reports, archives, and summaries.
---

# /hypo-workflow:cycle
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill when the user invokes `/hw:cycle` or `/hypo-workflow:cycle`.

Cycles are project-level delivery containers. Each Cycle owns its own milestone sequence, `.pipeline/state.yaml`, `.pipeline/PROGRESS.md`, `.pipeline/prompts/`, and `.pipeline/reports/`. Milestone numbers restart from `M0` inside every Cycle. Cross-Cycle files stay in place.

## 路径

All paths are relative to `.pipeline/` unless a project-root path is explicitly named:

- active Cycle: `.pipeline/cycle.yaml`
- archives: `.pipeline/archives/C{N}-{slug}/`
- patches: `.pipeline/patches/`
- project summary: project-root `PROJECT-SUMMARY.md`
- persistent files: `.pipeline/architecture.md`, `.pipeline/config.yaml`, `.pipeline/log.yaml`, `.pipeline/patches/`
- persistent knowledge: `.pipeline/knowledge/`

## 指令列表

Supported forms:

- `/hw:cycle new "名称" [--type feature|bugfix|refactor|spike|hotfix] [--context audit,patches,deferred,debug]`
- `/hw:cycle list`
- `/hw:cycle view C{N}` or `/hw:cycle view 0`
- `/hw:cycle close [--reason "..."] [--paused]`
- `/hw:accept`
- `/hw:reject "<feedback>"`

## Cycle 文件

Create `.pipeline/cycle.yaml` with this shape:

```yaml
cycle:
  number: 1
  name: "初始开发"
  type: feature
  status: active
  started: "2026-04-28T12:00:00+08:00"
  preset: tdd
  context_sources: []
  previous_cycle: null
  summary: null
  lessons: null
```

Use an ISO-8601 timestamp with timezone. Resolve timezone from `output.timezone`; default to `Asia/Shanghai`.

## 类型与 Preset 映射

- `feature` -> `tdd`
- `refactor` -> `tdd`
- `bugfix` -> `implement-only`
- `spike` -> `implement-only`
- `hotfix` -> `implement-only`

The user may edit `.pipeline/cycle.yaml` to override `cycle.preset`. Do not overwrite a user override unless the user explicitly asks.

## `/hw:cycle new`

1. Read `.pipeline/config.yaml` and optional `~/.hypo-workflow/config.yaml`.
2. If `.pipeline/cycle.yaml` exists and `cycle.status=active`, first run the archive flow from this skill before creating the new Cycle.
3. Determine the next number by scanning:
   - the existing active `.pipeline/cycle.yaml`
   - `.pipeline/archives/C*/cycle.yaml`
   - archive directory names matching `C{N}-*`
4. If no Cycle files exist, create the first explicit Cycle as `C1`.
5. Slugify the name for archive paths when needed.
6. Resolve `--type`; default to `feature` if omitted.
7. Resolve `--context`; store supported values in `cycle.context_sources`.
8. Create `.pipeline/cycle.yaml`.
9. Reset Cycle-local runtime:
   - reset `.pipeline/state.yaml` from `assets/state-init.yaml`
   - remove files under `.pipeline/prompts/`
   - remove files under `.pipeline/reports/`
   - remove `.pipeline/PROGRESS.md` if it belongs to the prior Cycle
10. Preserve:
   - `.pipeline/architecture.md`
   - `.pipeline/config.yaml`
   - `.pipeline/log.yaml`
   - `.pipeline/patches/`
   - `.pipeline/archives/`
11. Report the new Cycle number, name, type, preset, and context sources.

Compatibility: projects without `.pipeline/cycle.yaml` are treated as an implicit `C1` only for display and migration context. `/hw:init` must not create `.pipeline/cycle.yaml`.

## `/hw:cycle close`

Close the active Cycle and archive its local artifacts.

Cycle 0 Legacy is already closed by definition. If the user asks to close Cycle 0, stop and report that Legacy history cannot be closed again.

Status rules:

- no flag -> `completed`
- `--reason "..."` -> `abandoned` and record the reason as `cycle.lessons`
- `--paused` -> `paused`
- manual acceptance mode -> `pending_acceptance` until `/hw:accept` or `/hw:reject`

Execution:

1. Require `.pipeline/cycle.yaml`. If it is missing, say there is no explicit active Cycle and keep old projects unchanged.
2. Read `.pipeline/state.yaml` if present.
3. Update `cycle.status`, `cycle.summary`, `cycle.lessons`, and finish timestamp.
4. If `compact.auto=true`, regenerate compact views before archiving so the latest active Cycle context is represented.
5. Run the Archive Flow.
6. Update project-root `PROJECT-SUMMARY.md`.
7. If `compact.auto=true`, regenerate compact views again after archiving so persistent files and closed patches have fresh summaries.
8. Leave `.pipeline/` containing only persistent files plus any newly generated summary.

## 归档流程

Create `.pipeline/archives/C{N}-{slug}/` and move or copy files as follows:

- move `.pipeline/PROGRESS.md` -> `archives/C{N}-{slug}/PROGRESS.md`
- move `.pipeline/state.yaml` -> `archives/C{N}-{slug}/state.yaml`
- move `.pipeline/cycle.yaml` -> `archives/C{N}-{slug}/cycle.yaml`
- move `.pipeline/prompts/` -> `archives/C{N}-{slug}/prompts/`
- move `.pipeline/reports/` -> `archives/C{N}-{slug}/reports/`
- copy `.pipeline/architecture.md` -> `archives/C{N}-{slug}/architecture-snapshot.md`
- write `.pipeline/archives/C{N}-{slug}/knowledge-summary.md` from `.pipeline/knowledge/knowledge.compact.md` when present

After moving directories, recreate empty `.pipeline/prompts/` and `.pipeline/reports/` only when a new Cycle is being created immediately. For close-only, leave them absent unless the project tooling requires empty directories.

Do not archive or delete:

- `.pipeline/architecture.md`
- `.pipeline/config.yaml`
- `.pipeline/log.yaml`
- `.pipeline/patches/`
- `.pipeline/knowledge/`
- `.pipeline/archives/`
- project-root `PROJECT-SUMMARY.md`
- `.pipeline/*.compact.*` regenerated by `/hw:compact`

Do not archive, move, or delete `.pipeline/knowledge/`. It is persistent cross-Cycle memory. The archive may contain only a generated `knowledge-summary.md` snapshot.

## Cycle 验收

When acceptance mode is manual, a completed Cycle enters `pending_acceptance` instead of archiving immediately. In `timeout` mode, status surfaces may deterministically show automatic acceptance after `acceptance.timeout_hours`; this is a read/check decision and must not be implemented as a background state mutation.

Authoritative state lives in `.pipeline/cycle.yaml`:

```yaml
cycle:
  status: pending_acceptance
  acceptance:
    mode: manual
    state: pending
    requested_at: "2026-05-03T00:10:00+08:00"
```

`state.yaml` may mirror compact status only:

```yaml
acceptance:
  scope: cycle
  state: pending
  cycle_id: C4
  updated_at: "2026-05-03T00:10:00+08:00"
```

`/hw:accept` marks `cycle.status: completed`, `cycle.acceptance.state: accepted`, updates `state.yaml`, writes a `cycle_accept` log entry, and updates `PROGRESS.md`.

`/hw:reject` reopens the Cycle as `active`, writes structured feedback under `.pipeline/acceptance/`, stores only `feedback_ref` in `state.yaml`, writes a `cycle_reject` log entry, and updates `PROGRESS.md`. Feedback files should include `problem`, `reproduce_steps`, `expected`, `actual`, `context`, `iteration`, and `created_at`.

## 延后事项

When closing, scan `.pipeline/state.yaml` before moving it. For every milestone with `status: in_progress` or `status: pending`, add an entry to `.pipeline/archives/C{N}-{slug}/deferred.yaml`:

```yaml
- milestone: "M3"
  name: "..."
  reason: "cycle closed"
```

Also mark the archived `state.yaml` milestone status as `deferred` and set `deferred_reason: cycle closed` when feasible.

## 归档摘要

Generate `.pipeline/archives/C{N}-{slug}/summary.md`.

The summary must include:

- Cycle number, name, type, status, started, finished, and preset
- one sentence per milestone
- key data when available: tests, score, final decision, warnings
- deferred item count and names
- for abandoned Cycles, `lessons`
- knowledge summary path when `.pipeline/archives/C{N}-{slug}/knowledge-summary.md` exists

Write the summary in `output.language`; default language is English.

## `/hw:cycle list`

List all Cycles from:

- `.pipeline/archives/cycle-0-legacy/cycle.yaml`
- `.pipeline/archives/*/cycle.yaml`
- current `.pipeline/cycle.yaml` when present

Show number, name, type, status, started/finished date, and one-line summary. Include implicit `C1` only when there is no explicit Cycle metadata and the old project has `.pipeline/state.yaml` or prompts.

When `.pipeline/archives/cycle-0-legacy/cycle.yaml` exists, show it first as:

```text
C0 [Legacy] Legacy (pre-Workflow) — closed — <total_commits> commits / <total_milestones> milestones
```

## `/hw:cycle view C{N}`

Find the Cycle in current metadata or archives. Display:

- Cycle metadata
- archive path
- summary excerpt
- deferred items
- report list
- architecture snapshot path when present

If the Cycle is missing, list available Cycle numbers.

For `/hw:cycle view 0` or `/hw:cycle view C0`, read `.pipeline/archives/cycle-0-legacy/cycle.yaml` and display:

- Legacy import method
- total commits and milestone count
- imported milestone list with commit counts and date spans
- summary path
- per-milestone report paths

## 项目摘要

After every close or archive, regenerate project-root `PROJECT-SUMMARY.md` using the rules in `/hypo-workflow:status` and this skill. This file is cross-Cycle project context and should not be moved into Cycle archives.

`PROJECT-SUMMARY.md` must follow `output.language` for:

- title and intro text
- table headers such as Cycle, Milestone, Status, Time, and Highlights
- status labels such as Done, In Progress, Paused, Abandoned, and Deferred
- Open Patches and Deferred Items section names

When `output.language` is missing, default to English for backward compatibility.

## 参考文件

- `references/commands-spec.md` — command parsing and unknown-command behavior
- `references/state-contract.md` — milestone status fields
- `references/progress-spec.md` — PROGRESS relationship
- `references/config-spec.md` — output language and timezone defaults
- `SKILL.md` — full system context
