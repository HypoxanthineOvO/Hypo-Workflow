---
name: compact
description: Generate compact context views for large Hypo-Workflow runtime files without mutating the originals.
---

# /hypo-workflow:compact
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill when the user invokes `/hw:compact` or `/hypo-workflow:compact`.

Compact files are derived context views. They reduce SessionStart context size while keeping the source files unchanged.

Compact output is recovery and index context. Agents must restart from stable prompt/design artifacts such as `.pipeline/prompts/*.md`, `.pipeline/design-spec.md`, `.pipeline/design-concepts.yaml`, `.pipeline/glossary.md`, and durable Knowledge indexes. Compact summaries are not design authority and must not replace those stable artifacts when making implementation decisions.

## Paths

All compact files are written next to their source files:

- `.pipeline/PROGRESS.compact.md`
- `.pipeline/state.compact.yaml`
- `.pipeline/log.compact.yaml`
- `.pipeline/reports.compact.md`
- `.pipeline/patches.compact.md`
- `.pipeline/knowledge/knowledge.compact.md`

Never delete or rewrite the original files while generating compact views.

## Config

Resolve `compact.*` from project config > global config > defaults:

```yaml
compact:
  auto: true
  end_of_run: true
  refresh_policy: dirty_only
  progress_recent: 15
  state_history_full: 1
  log_recent: 20
  reports_summary_lines: 3
```

If config is missing, use these defaults.

## Command

Supported form:

- `/hw:compact`

## Execution Flow

1. Read `~/.hypo-workflow/config.yaml` if present.
2. Read `.pipeline/config.yaml` if present.
3. Resolve `output.language`, `output.timezone`, and `compact.*`.
4. Scan `.pipeline/` for compressible source files.
5. Generate a `.compact` file only when the source file exists.
6. Report the number of files generated and estimated token savings, for example `已生成 4 个 .compact 文件，预计节省 ~92% context token`.

## Compact Strategies

### `PROGRESS.compact.md`

Source: `.pipeline/PROGRESS.md`

Keep:

- the current Cycle header or current status block when present
- the most recent `compact.progress_recent` progress entries; default `15`
- one summary line per archived Cycle, extracted from `.pipeline/archives/*/summary.md`

Do not include full archived progress files.

### `state.compact.yaml`

Source: `.pipeline/state.yaml`

Keep:

- `pipeline` and `current` sections completely
- `last_heartbeat` when present
- the latest `compact.state_history_full` completed milestones in full; default `1`
- older `history.completed_prompts` entries reduced to `{prompt, status, score_summary}`
- current `milestones` list with names and statuses

`state.compact.yaml` is read-only context and must not be used as the canonical state file for mutations.

### `log.compact.yaml`

Source: `.pipeline/log.yaml`

Keep:

- the latest `compact.log_recent` lifecycle events in full; default `20`
- older events compressed into:

```yaml
older:
  count: <N>
  earliest: "<timestamp>"
  latest: "<timestamp>"
  summary: "<event type counts and notable failures>"
```

### `reports.compact.md`

Source: `.pipeline/reports/`

For each historical report, extract at most `compact.reports_summary_lines` lines; default `3`.

Prefer these facts when present:

- final conclusion or decision
- evaluation scores
- key change summary

Skip the current Milestone report so SessionStart can load it in full when it exists.

### `patches.compact.md`

Source: `.pipeline/patches/P*.md`

Include only closed Patches. For each closed Patch, keep:

- Patch ID
- title
- one-line change summary or commit hash

Open Patch files remain loaded separately in full by SessionStart.

### `knowledge.compact.md`

Source: `.pipeline/knowledge/records/*.yaml` plus generated category indexes.

Keep:

- recent durable decisions
- reusable pitfalls
- important dependencies
- config notes
- redacted secret refs

Full raw knowledge records are not loaded by default. SessionStart loads `.pipeline/knowledge/knowledge.compact.md` and `.pipeline/knowledge/index/*.yaml` only.

## Auto Generation

When `compact.auto: true`:

- regenerate dirty compact views after `/hw:start` or `/hw:resume` finishes successfully, after validation, report, state, log, and progress updates have all passed
- do not compact repeatedly during ordinary step execution; keep full authoritative files available while development and validation are still in progress
- regenerate `.pipeline/knowledge/knowledge.compact.md` when Knowledge Ledger records or indexes changed
- regenerate compact views during `/hw:cycle close` before or immediately after archive summary generation

When `compact.auto: false`, do not generate compact files unless the user explicitly invokes `/hw:compact`.

End-of-run automatic compact is dirty-only: refresh only compact targets whose full authoritative sources are newer or whose compact target is missing. Each refreshed compact target must be regenerated from the full source file or source directory, never from the previous `.compact` output.

`compact.refresh_policy=always` may be used by explicit maintenance commands when a full derived rebuild is desired. The default end-of-run policy is `dirty_only`.

## Git Tracking

Compact files are derived artifacts. `.gitignore` must include `*.compact.*` so they are not tracked.

## Reference Files

- `hooks/session-start.sh` — compact-first context loading
- `skills/status/SKILL.md` — `--full` status behavior
- `skills/log/SKILL.md` — `--full` log behavior
- `skills/report/SKILL.md` — report summary and `--view`
- `references/config-spec.md` — config defaults
- `SKILL.md` — root command routing
