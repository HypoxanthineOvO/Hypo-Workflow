# Init Spec

Use this reference for `/hw:init`, which bootstraps or refreshes a `.pipeline/` workspace after understanding the project structure.

normal `/hw:init` does not require git. Git is required only for `/hw:init --import-history`.

## Scenario Detection

| Scenario | Detection | Behavior |
|---|---|---|
| Empty project | no `src/` and no major language files such as `.py`, `.ts`, `.js`, `.java`, `.cpp`, `.rs`, `.go` | create `.pipeline/` skeleton, gather project name / preset / stack / test framework, then generate `config.yaml` plus an empty architecture baseline |
| Existing project | source files exist and `.pipeline/` does not | run the four exploration phases, generate architecture, and propose a prefilled `config.yaml` |
| Existing pipeline | `.pipeline/` already exists | check completeness, suggest missing pieces, and optionally refresh architecture with `--rescan` |

## Progressive Exploration

### Phase 1: Environment Sensing

- detect language and framework from files such as `package.json`, `pyproject.toml`, `Cargo.toml`, `CMakeLists.txt`
- detect the test framework such as `pytest`, `jest`, `gtest`, `cargo test`
- detect CI/CD such as `.github/workflows` or `.gitlab-ci.yml`
- detect package managers, dependency manifests, and monorepo markers

### Phase 2: Structure Scan

- build a directory tree summary
- cluster modules by directory
- identify entrypoints such as `main.py`, `index.ts`, `App.tsx`
- locate config files, exported APIs, and shared interfaces

### Phase 3: Deep Reading

- only for larger projects or modules that are unclear after the first two phases
- inspect key interfaces and type definitions
- map data flow from input to processing to output
- inspect imports to understand module dependencies

### Phase 4: Outputs

- generate an architecture baseline
- generate `config.yaml` with project name, language, preset, and test command hints
- ask for automation level in interactive init and store the stable key:
  - 稳妥模式 (`manual`)
  - 自动模式 (`balanced`)
  - 全自动模式 (`full`)
- ask for project-local worker separation mode in interactive init and store it:
  - `off`
  - `recommended`
  - `strict`
- use `balanced` for non-interactive init unless `--automation manual|balanced|full` is supplied
- keep agent platform, default execution mode, subagent provider, dashboard defaults, and plan defaults in `~/.hypo-workflow/config.yaml` unless the project needs an explicit override
- optionally suggest an initial development direction, but do not decompose milestones here

## Architecture Output Modes

- small project: fewer than 20 source files -> write `.pipeline/architecture.md`
- large or multi-module project: 20 or more source files, or clear module boundaries -> write `.pipeline/architecture/`

Single-file mode should include:

- project overview
- tech stack
- directory structure
- module summary
- data flow
- key interfaces

Folder mode should contain:

- `INDEX.md`
- `module-<name>.md`
- `data-flow.md`
- `decisions.md`

Flags:

- `/hw:init --folder` forces folder mode
- `/hw:init --single` forces single-file mode
- `/hw:init --rescan` rescans an existing pipeline and diffs against the current architecture baseline
- `/hw:init --import-history` imports pre-Workflow Git first-parent history into `.pipeline/archives/cycle-0-legacy/`
- `/hw:init --import-history --interactive` previews the split plan and waits for explicit confirmation before writing files
- `/hw:init --automation manual|balanced|full` sets the generated project `automation.level`

## History Import

History Import is a V8.1 extension of init. It does not run unless `--import-history` is present. `/hw:init --import-history` requires git and checks `git rev-parse --is-inside-work-tree` before scanning commits.

### Split Signals

In `history_import.split_method: auto`, choose the first signal that creates at least two milestones:

1. Git tags from `git tag --sort=creatordate`
2. Milestone keywords from `history_import.keyword_patterns`
3. merge commits from `git log --merges --first-parent`
4. time gaps larger than `history_import.time_gap_threshold`

If fewer than five commits are eligible, import all commits as `M0-legacy`.

### Generated Files

```text
.pipeline/archives/cycle-0-legacy/
├── cycle.yaml
├── summary.md
└── M{x}-{name}/report.md
```

Milestone reports use `templates/legacy-report.md`; they must not include TDD step fields.

### Edge Behavior

- non-Git repos stop with `❌ 当前目录不是 git 仓库，请先执行 git init`
- existing `.pipeline/state.yaml` acts as an import cutoff
- `project_root` filters monorepo history
- only the current branch first-parent history is scanned
- reports cap commit tables at 50 entries for very long histories

## Relationship To Other Commands

- `/hw:init` creates the baseline architecture
- `/hw:plan` extends that baseline with milestone intent
- `/hw:plan:review` records changes after each milestone
- `/hw:init --rescan` refreshes the baseline when the repo shape has changed materially
