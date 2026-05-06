---
name: init
description: Initialize or rescan a Hypo-Workflow project when the user wants architecture-aware setup before planning or execution.
---

# /hypo-workflow:init
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill to bootstrap `.pipeline/` and the architecture baseline. normal `/hw:init` does not require git. V8.1 also lets init import pre-Workflow Git history into a closed Legacy Cycle.

## Preconditions

- the repo is either empty, already contains source code, or already contains a partial pipeline
- Git is optional for ordinary init. It is required only when `--import-history` is present.

## Supported Flags

- `--rescan`: refresh architecture for an existing pipeline.
- `--folder`: force folder-mode architecture output.
- `--single`: force single-file architecture output.
- `--import-history`: scan current Git first-parent history and import it as Cycle 0 Legacy.
- `--interactive`: when used with `--import-history`, show the split plan and wait for explicit confirmation before writing archive files.
- `--automation manual|balanced|full`: non-interactive automation level override for generated project config.

## Execution Flow

1. Read `~/.hypo-workflow/config.yaml` if present so generated project config can inherit defaults without duplicating them.
2. Detect which of the three cases applies:
   - empty project
   - existing project without `.pipeline/`
   - existing pipeline
3. Run the four exploration phases:
   - environment sensing
   - structure scan
   - deep reading when needed
   - output generation
4. Ask for automation level in interactive contexts, then write the stable key to `.pipeline/config.yaml`:
   ```text
   ⚙️ 自动化程度
     [1] 稳妥模式 (`manual`) — 多确认，适合高风险或探索任务
     [2] 自动模式 (`balanced`) — 普通执行自动继续，规划和高风险 Gate 保留确认
     [3] 全自动模式 (`full`) — 尽量自动推进，但规划、破坏性/外部副作用、发布仍需确认
   ```
   In non-interactive contexts, use `balanced` unless `--automation` provides `manual`, `balanced`, or `full`.
5. Generate `.pipeline/config.yaml` with only project-specific values and overrides that differ from global defaults, including `automation.level` when chosen during init.
6. In interactive init, ask for project-local worker separation mode and write it to `execution.worker_separation.mode`:
   - `off`
   - `recommended`
   - `strict`
7. Generate architecture in single-file or folder mode based on project size unless forced.
8. Initialize rules configuration unless the user explicitly skips it:
   - show the preset choice in interactive contexts:
     ```text
     📏 Rules 配置
       [1] recommended — 推荐规则集（默认）
       [2] strict — 严格模式
       [3] minimal — 最小化
       [4] 跳过（后续用 /hw:rules 配置）
     ```
   - create `.pipeline/rules.yaml` with `extends: recommended` by default
   - create `.pipeline/rules/custom/` for future custom rules
   - do not create explicit Cycle metadata during init
9. After creating `.pipeline/` directories and before initializing `state.yaml`, branch into History Import if `--import-history` is present.
10. Use `--rescan` to refresh architecture for an existing pipeline.
11. Set `current.phase=lifecycle_init` when tracking this command through state.

## History Import

`/hw:init --import-history` imports commits that happened before Hypo-Workflow started tracking the project. `/hw:init --import-history` requires git, but it must not change normal init behavior when the flag is absent.

### Template Language

When generating Legacy reports, resolve `output.language` from project > global > defaults.

- `zh-CN` / `zh` -> load `templates/zh/legacy-report.md`
- `en` / `en-US` -> load `templates/en/legacy-report.md`
- missing localized template -> fall back to `templates/legacy-report.md`

PROJECT-SUMMARY generation must use the same language for headings, table headers, status labels, and prose. Internal `state.yaml` and `log.yaml` remain English.

### Preconditions

1. Check the current directory is a Git repository:
   - run `git rev-parse --is-inside-work-tree`
   - if it fails, stop with `❌ 当前目录不是 git 仓库，请先执行 git init`
2. Scan only the current branch with first-parent history:
   - base command: `git log --format="%H|%aI|%s" --first-parent`
   - if `.pipeline/config.yaml` has `project_root`, append `-- <project_root>` for monorepo filtering
3. If `.pipeline/state.yaml` already exists, read the earliest tracked `started` / `started_at` timestamp and import only commits before that cutoff.
4. Resolve output language and timezone before presenting or writing results.
5. Resolve `history_import.*` from project > global > defaults.

### Config Defaults

```yaml
history_import:
  split_method: auto
  time_gap_threshold: 24h
  max_milestones: 20
  keyword_patterns:
    - 'feat\(M(\d+)\):'
    - 'M(\d+)-'
    - 'milestone-(\d+)'
```

### Split Signals

In `split_method: auto`, try these signals in order and choose the first that creates at least 2 milestones:

1. Tag: `git tag --sort=creatordate --format='%(refname:short)|%(creatordate:iso-strict)'`
2. Keyword: commit message matches configured `keyword_patterns`
3. Merge: `git log --merges --first-parent`
4. Time gap: adjacent commits are separated by more than `history_import.time_gap_threshold`

If a specific `split_method` is configured, use only that method and fall back to `M0-legacy` when it cannot split.

### Split Rules

- If fewer than 5 commits are eligible, do not split; import all as `M0-legacy`.
- Tag milestones are named like `M0-v1.0`.
- Keyword milestones are named from the number and short message slug, for example `M0-scaffold`.
- Merge milestones are named like `M0-pr-1`.
- Time-gap milestones start with `M0-initial`, then use concise date or message slugs.
- Cap the import at `history_import.max_milestones` and never exceed 20 milestones by default.
- When the cap is exceeded, merge the rest into `Mxx-remaining`.
- For histories longer than 1000 commits, process normally but each report lists only the first 50 commits, followed by `... and N other commits`.

### Interactive Mode

When `--interactive` is present:

1. Complete the scan and split in memory.
2. Show a summary:

   ```text
   History Import split plan

   Detected 142 commits and split them by [tag] into 5 milestones:

     M0-scaffold   (12 commits, 2025-01-15 ~ 2025-01-20)
     M1-core-crud  (35 commits, 2025-01-21 ~ 2025-02-15)

   Confirm, or ask to merge, split, rename, or switch signal.
   ```

3. Stop and wait for user confirmation.
4. If the user asks to merge, split, rename, or switch signal, revise the plan, show it again, and wait again.
5. Do not generate files until the user explicitly confirms.

Without `--interactive`, generate files immediately after the split plan is computed.

### Generated Files

Create `.pipeline/archives/cycle-0-legacy/` with:

```text
.pipeline/archives/cycle-0-legacy/
├── cycle.yaml
├── summary.md
└── M{x}-{name}/
    └── report.md
```

`cycle.yaml` shape:

```yaml
name: "Legacy (pre-Workflow)"
id: 0
status: closed
started: "<earliest commit time in output.timezone>"
finished: "<init execution time in output.timezone>"
import_source: git
import_method: <tag | keyword | merge | time_gap>
total_commits: <total commit count>
total_milestones: <milestone count>
milestones:
  - name: <milestone name>
    commits: <commit count>
    started: "<first commit time>"
    finished: "<last commit time>"
```

`summary.md` must include:

- project overview from earliest to latest eligible commit
- selected split method and why it was chosen
- one-sentence summary for each milestone
- global top 20 changed-file heat ranking

Each milestone report must use `templates/legacy-report.md` and include:

- milestone name, time span, commit count, changed-file stats, added/deleted line totals
- 3-5 main changes inferred from commit messages and diff stats
- commit table: Hash | Time | Message, with times converted to `output.timezone`
- top 15 changed files by line churn

Legacy reports must not include TDD fields such as `write_tests`, `run_red`, or `review_code`.

### Current Cycle After Import

After writing Cycle 0 Legacy, create or preserve `.pipeline/cycle.yaml` as active Cycle 1:

```yaml
cycle:
  number: 1
  name: "Current"
  type: feature
  status: active
  previous_cycle: 0
```

Do not overwrite an existing active Cycle unless the user explicitly asks.

### Edge Cases

- Non-Git repo: stop with `❌ 当前目录不是 git 仓库，请先执行 git init`.
- Existing `.pipeline/state.yaml`: import only commits before the earliest tracked pipeline start.
- Empty repo or fewer than 5 commits: import as `M0-legacy`.
- Monorepo: if `project_root` is configured, filter `git log` to that path.
- Multiple branches: use only current branch first-parent history.
- More than 1000 commits: report commit tables are capped at 50 entries per milestone.

## Reference Files

- `references/init-spec.md` — init behavior and architecture strategy
- `references/commands-spec.md`
- `references/config-spec.md`
- `references/rules-spec.md`
- `rules/presets/recommended.yaml`
- `templates/legacy-report.md`
- `SKILL.md`
