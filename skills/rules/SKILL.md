---
name: rules
description: Manage Hypo-Workflow rule severities, custom natural-language rules, lifecycle hooks, and shareable rule packs.
---

# /hypo-workflow:rules
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill when the user invokes `/hw:rules` or `/hypo-workflow:rules`.

Rules are a standalone Hypo-Workflow dimension alongside skills, commands, hooks, and config. They collect behavior constraints that were previously scattered across `SKILL.md`, hooks, and `config.yaml`.

## Paths

Plugin-distributed rules:

- `rules/builtin/*.yaml`
- `rules/presets/recommended.yaml`
- `rules/presets/strict.yaml`
- `rules/presets/minimal.yaml`
- `rules/template/custom-rule-template.md`

Project-local rules:

- `.pipeline/rules.yaml`
- `.pipeline/rules/custom/*.md`
- `.pipeline/rules/structured/project/*.yaml`
- `.pipeline/rules/structured/cycle/*.yaml`
- `.pipeline/rules/packs/<pack-name>/`

User-level structured habits:

- `~/.hypo-workflow/rules/structured/*.yaml`

Global habits are user-level authority and should be loaded only when explicitly configured or selected by the active rules command. Do not make project behavior depend silently on whatever exists in the operator's home directory.

## Severity Model

Use the ESLint-style severity model:

| Severity | Behavior |
|---|---|
| `off` | Disabled; do not load or enforce. |
| `warn` | Print a warning and continue. |
| `error` | Treat as a hard gate and stop execution until resolved or downgraded. |

The severity decides behavior. Labels are metadata only.

## Structured Rules/Habits Authority

C8 introduces structured Rules/Habits as the preferred authority for durable user preferences and project behavior. Markdown files and adapter instruction text are generated or compatibility views.

Supported scopes, from highest to lowest priority:

1. `cycle`
2. `project`
3. `global`
4. `builtin`

When several records share an `id`, resolve the winner by that scope order and report the overridden scopes/source paths. Do not silently hide conflicts; Agent Review should record which rules were checked and which could not be checked automatically.

Structured rule shape:

```yaml
id: user-frontend-layout-density
scope: project
label: frontend
severity: warn
hooks:
  - always
  - on-evaluate
source:
  captured_from: chat
  author: user
content:
  instruction: "Front-end tool pages should prioritize dense, scannable operational UI."
  rationale: "The project targets repeated workflow operations."
  examples:
    good:
      - "compact tables and toolbars"
    bad:
      - "large marketing-style hero sections"
enforcement:
  check_kind: agent_judgment
  evidence_required: true
```

Use structured records for new "remember this rule" behavior. Keep `.pipeline/rules.yaml` for preset and severity overrides.

## Labels

Supported semantic labels:

- `guard`: pre-execution gates such as `git-clean-check`
- `style`: output and language preferences
- `hook`: hook behavior wrapped as rules
- `workflow`: process preferences such as commit and review policy
- `quality`: repository asset quality checks such as `skill-quality`
- `release`: publication gates such as `readme-freshness`

Custom rules may use these labels or a concise project-specific label.

## Hooks

Supported lifecycle hook points:

- `on-session-start`
- `pre-milestone`
- `post-milestone`
- `pre-step`
- `post-step`
- `pre-commit`
- `pre-release`
- `on-fail`
- `on-evaluate`
- `always`

Rules may bind to multiple hooks. `always` rules are injected into execution context and should be followed for the whole session.

## Commands

Supported forms:

```text
/hw:rules
/hw:rules list
/hw:rules list --active
/hw:rules list --label guard
/hw:rules enable <name>
/hw:rules disable <name>
/hw:rules set <name> <off|warn|error>
/hw:rules create <name>
/hw:rules edit <name>
/hw:rules delete <name>
/hw:rules pack export <name>
/hw:rules pack import <url>
```

## Loading Algorithm

Build the effective rule table in this priority order, low to high:

1. Built-in rule metadata from `rules/builtin/`.
2. Preset severities from `rules/presets/<extends>.yaml`.
3. Custom rules from `.pipeline/rules/custom/`.
4. Structured Rules/Habits from user, project, and Cycle scopes.
5. Overrides from `.pipeline/rules.yaml` under `rules:`.
6. Temporary command overrides from `--rule name=severity` when a command supports them.

When `.pipeline/rules.yaml` is missing, behave as if:

```yaml
extends: recommended
rules: {}
```

Custom rules with the same name as a built-in rule override the built-in content, but normal severity priority still applies.

## `.pipeline/rules.yaml`

Canonical shape:

```yaml
extends: recommended

rules:
  git-clean-check: error
  commit-format: off
  report-language: warn
  my-lint-rule: warn
```

`extends` may be a string or list. Built-in values are `recommended`, `strict`, and `minimal`. Git rule packs may be referenced as `github:owner/repo` or `gitee:owner/repo`.

## Listing Rules

For `/hw:rules` or `/hw:rules list`:

1. Load the effective rule table.
2. Group by label in this order: guard, style, hook, workflow, quality, release, custom.
3. Show name, severity, hooks, and whether the rule is enabled.
4. Apply filters:
   - `--active`: exclude `off`
   - `--label <label>`: include only that label
5. Finish with totals: enabled count, error count, warn count, off count.

When shell execution is available, use `scripts/rules-summary.sh` as the deterministic summary helper, then present the result in the configured output language.

## Enabling, Disabling, And Setting Rules

For `/hw:rules enable <name>`:

1. Ensure `.pipeline/` exists; if not, tell the user to run `/hw:init`.
2. Create `.pipeline/rules.yaml` if missing.
3. Set `rules.<name>: warn`.

For `/hw:rules disable <name>`:

1. Ensure `.pipeline/rules.yaml` exists.
2. Set `rules.<name>: off`.

For `/hw:rules set <name> <severity>`:

1. Validate severity is one of `off`, `warn`, `error`.
2. Set `rules.<name>` to that severity.
3. Preserve unrelated rules and `extends`.

Use structured YAML edits where possible. Do not rewrite unrelated project config.

## Creating Custom Rules

For `/hw:rules create <name>`:

1. Validate the name matches `^[a-z0-9][a-z0-9-]*$`.
2. Ask interactively for:
   - label: `guard`, `style`, `hook`, or `workflow`
   - severity: `off`, `warn`, or `error`
   - hook point: one or more supported hooks
   - natural-language rule body
3. Create `.pipeline/rules/custom/<name>.md`.
4. Add or update `.pipeline/rules.yaml` with `rules.<name>: <severity>`.
5. Show the created file path.

Generated Markdown format:

```markdown
# my-test-rule

- **标签**: workflow
- **严格度**: warn
- **钩子点**: pre-commit

## 规则内容

每次 commit 前检查是否有超过 3 个 TODO 注释。如果有，提醒我处理。
```

Do not auto-create a custom rule without the user's natural-language content.

## Creating Structured Rules

For new remembered preferences, prefer structured YAML over Markdown custom rules. Use this path selection:

- `scope=cycle` -> `.pipeline/rules/structured/cycle/<id>.yaml`
- `scope=project` -> `.pipeline/rules/structured/project/<id>.yaml`
- `scope=global` -> `~/.hypo-workflow/rules/structured/<id>.yaml`

Ordinary inferred candidates should be presented for confirmation at the end of the current discussion or checkpoint. Do not interrupt the user's main task just because a possible rule was detected. Explicit force-write wording may write immediately, but must still use the selected scope and log the action.

## Editing And Deleting Custom Rules

For `/hw:rules edit <name>`:

1. Locate `.pipeline/rules/custom/<name>.md` or pack/custom YAML with the same name.
2. If shell editor access is not appropriate, print the file path and explain the editable fields.
3. Do not edit built-in rules in `rules/builtin/`; tell the user to override severity or create a custom rule instead.

For `/hw:rules delete <name>`:

1. Delete only project-local custom rule files.
2. Remove or set off the `.pipeline/rules.yaml` override.
3. Never delete built-in distributed rules.

## Rule Packs

Rule pack format:

```text
hw-rules-example/
├── pack.yaml
├── rules/
│   └── prefer-chinese-comments.md
└── README.md
```

`pack.yaml`:

```yaml
name: hw-rules-example
author: example
version: 1.0.0
description: Example rule pack
rules:
  prefer-chinese-comments: warn
```

For `/hw:rules pack export <name>`:

1. Create `.pipeline/rules/packs/<name>/`.
2. Copy active custom rules into `<pack>/rules/`.
3. Generate `pack.yaml` from current effective severities.
4. Generate a short README with import instructions.

For `/hw:rules pack import <url>`:

1. Accept `github:owner/repo`, `gitee:owner/repo`, or a direct Git URL.
2. Clone or copy into `.pipeline/rules/packs/<pack-name>/`.
3. Add the pack reference to `.pipeline/rules.yaml extends`.
4. Report imported rules and effective severities.

Network access may be unavailable; if import cannot run, provide the exact Git command and target path.

## Runtime Enforcement

At each lifecycle hook point:

1. Select effective rules whose severity is not `off` and whose hooks include the current point.
2. Execute built-in `check` logic or read custom Markdown rule body.
3. For `warn`, print a warning and continue.
4. For `error`, stop execution and explain:
   - rule name
   - failed condition
   - how to fix, disable, or downgrade it

`always` rules are injected during SessionStart and should be obeyed continuously. `hooks/session-start.sh` uses `scripts/rules-summary.sh` to include active always rules in `additionalContext`.

## Built-In Rules

The distributed built-ins are:

| Rule | Label | Default | Hooks |
|---|---|---|---|
| `git-clean-check` | guard | warn | pre-milestone |
| `config-valid` | guard | warn | pre-milestone |
| `cycle-closed` | guard | warn | pre-milestone |
| `conflict-check` | guard | warn | on-session-start |
| `report-language` | style | warn | always |
| `progress-timezone` | style | warn | always |
| `progress-verbosity` | style | off | always |
| `commit-format` | workflow | off | pre-commit |
| `auto-continue-threshold` | workflow | warn | on-evaluate |
| `review-strictness` | workflow | warn | on-evaluate |
| `readme-freshness` | release | warn | pre-commit, pre-release |
| `skill-quality` | quality | warn | pre-milestone, pre-release |
| `knowledge-ledger-self-check` | hook | warn | post-step, post-milestone |
| `stop-hook-self-check` | hook | error | post-step |
| `session-start-context-load` | hook | error | on-session-start |

## `/hw:init` Integration

During project initialization, offer a rules preset:

```text
📏 Rules 配置
  [1] recommended — 推荐规则集（默认）
  [2] strict — 严格模式
  [3] minimal — 最小化
  [4] 跳过（后续用 /hw:rules 配置）
```

When selected, write `.pipeline/rules.yaml`. Skipping leaves old behavior compatible, which is equivalent to recommended defaults at runtime.

## Reference Files

- `rules/builtin/`
- `rules/presets/`
- `rules/template/custom-rule-template.md`
- `scripts/rules-summary.sh`
- `references/rules-spec.md`
- `references/commands-spec.md`
- `references/config-spec.md`
- `SKILL.md`
