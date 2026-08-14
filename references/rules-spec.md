# Rules Spec

Use this reference when loading, listing, or enforcing Hypo-Workflow rules.

## Purpose

Rules are the fourth configurable dimension of Hypo-Workflow behavior. They collect:

- hook gates such as Stop Hook and SessionStart context loading
- watchdog and lifecycle preferences
- output style preferences
- natural-language AI behavior constraints

Rules do not replace `config.yaml`. Config keeps structured project settings; rules express severity, hook timing, and behavioral constraints.

## Files

| Layer | Path | Purpose |
|---|---|---|
| Built-in rules | `rules/builtin/*.yaml` | Distributed rule definitions |
| Built-in presets | `rules/presets/*.yaml` | Severity sets for recommended, strict, minimal |
| Template | `rules/template/custom-rule-template.md` | Starting point for custom rules |
| Project config | `.pipeline/rules.yaml` | Extends and severity overrides |
| Project custom | `.pipeline/rules/custom/*.md` | Natural-language custom rules |
| Project structured rules | `.pipeline/rules/structured/project/*.yaml` | Project-scoped structured rule authority |
| Cycle structured rules | `.pipeline/rules/structured/cycle/*.yaml` | Cycle-scoped temporary structured rule authority |
| Global structured rules | `~/.hypo-workflow/rules/structured/*.yaml` | User-level habit and preference authority |
| Project packs | `.pipeline/rules/packs/*` | Imported or exported shareable packs |
| Built-in packs | `rules/packs/*` | Optional distributed rule packs such as `@karpathy/guidelines` |

## Severity

| Severity | Runtime behavior |
|---|---|
| `off` | Disabled; do not load or enforce. |
| `warn` | Emit a warning and continue. |
| `error` | Stop the current action until fixed, disabled, or downgraded. |

## Hook Points

Supported hooks:

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

`always` rules are injected into session context and apply throughout execution.

## Loading Priority

Effective rule state is resolved in this order:

1. `rules/builtin/*.yaml` metadata and default severity.
2. Preset severity from `rules/presets/<extends>.yaml`.
3. Built-in or imported pack defaults from `rules/packs/*` and `.pipeline/rules/packs/*`.
4. Project custom rule files in `.pipeline/rules/custom/`.
5. `.pipeline/rules.yaml rules:` overrides.
6. Command-line `--rule name=severity` overrides when supported.

Structured Rules/Habits authority is an additive C8 layer used for durable user preferences and review evidence. Its scope precedence is:

```text
cycle > project > global > builtin
```

Structured records are the authority for generated habits and instruction views. Markdown habits, `AGENTS.md`, Claude/OpenCode/Codex instructions, and adapter snippets are derived views and must not become the canonical source when a structured record exists.

Missing `.pipeline/rules.yaml` is equivalent to:

```yaml
extends: recommended
rules: {}
```

## Presets

| Preset | Purpose |
|---|---|
| `recommended` | Most projects. Guard and style rules warn; hook rules remind. |
| `strict` | Team or release mode. Guard and workflow rules become hard gates. |
| `minimal` | Compatibility mode. Only hook reminders stay active as warnings. |

## Optional Packs

Optional packs are not enabled by default. Add them through `extends`:

```yaml
extends:
  - recommended
  - @karpathy/guidelines
```

`@karpathy/guidelines` provides:

- `karpathy-think-before-coding`
- `karpathy-simplicity-first`
- `karpathy-surgical-changes`
- `karpathy-goal-driven-execution`

## Built-In Rules

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
| `stop-hook-self-check` | hook | warn | post-step |
| `session-start-context-load` | hook | warn | on-session-start |

## Project Config

`.pipeline/rules.yaml`:

```yaml
extends:
  - recommended
  - github:hypoxanthine/hw-rules-chinese

rules:
  git-clean-check: error
  commit-format: off
  prefer-chinese-comments: warn
```

`extends` may be a string or a list. Built-in presets are resolved first; external packs are copied under `.pipeline/rules/packs/` before use.

## Custom Rule Markdown

```markdown
# prefer-chinese-comments

- **标签**: style
- **严格度**: warn
- **钩子点**: always

## 规则内容

代码注释使用中文。变量名和函数名仍使用英文。
```

The file name without extension is the rule name. Custom rules override built-in rules with the same name.

## Structured Rules/Habits

Structured rules are YAML records intended for machine-readable merging, conflict reporting, generated habits documents, and Agent Review evidence.

```yaml
id: user-frontend-layout-density
scope: project        # builtin | global | project | cycle
label: frontend
severity: warn        # off | warn | error
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
  check_kind: agent_judgment   # agent_judgment | deterministic | command | checklist
  evidence_required: true
```

Rules with the same `id` are merged by scope precedence. The effective summary must include:

- the winning rule id, scope, severity, hooks, and source path;
- overridden rule ids/scopes/source paths;
- conflict entries for review reports;
- active rules that could not be checked automatically.

The effective rules matrix uses this precedence order:

```text
cycle > project > global > builtin
```

Projection output must retain `source_path`, `source`, and `evidence_refs` for the winner and every override. This lets review reports explain both the active rule and the lower-precedence records it superseded.

Project structured records live under `.pipeline/rules/structured/project/*.yaml`; Cycle-local records live under `.pipeline/rules/structured/cycle/*.yaml`. User-level global records may live under `~/.hypo-workflow/rules/structured/*.yaml`, but they are loaded only when that directory is explicitly configured as an external source.

Markdown custom rules remain supported and are normalized into the structured summary with `source.format=markdown`, but they are natural-language compatibility records rather than the preferred authority for newly remembered rules.

## Runtime Enforcement

At a hook point:

1. Load the effective table.
2. Select rules whose severity is not `off` and hooks include the current point.
3. Run structured built-in checks or follow Markdown rule content.
4. Continue for `warn`; stop for `error`.

Always rules:

1. Loaded by SessionStart.
2. Added to `additionalContext`.
3. Followed by the agent for the whole session.

## Helper Script

`scripts/rules-summary.sh [project_root]` prints:

- selected preset
- built-in rule severities
- custom rule severities
- totals
- active always rules

The script is intentionally dependency-free and shallow. It is suitable for hooks and tests, not a substitute for Agent judgment over natural-language custom rules.
