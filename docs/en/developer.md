# Developer Guide

[中文](../developer.md) | English

Core helpers live under `core/src/` and are shared by the CLI, skills, OpenCode artifacts, and tests. Prefer changing those sources first, then refresh derived docs and adapters through docs/sync.

## Contracts

- `.pipeline/` is the source of truth for state, Cycle, Rules, PROGRESS, logs, prompts, and reports.
- Generated adapters are derived artifacts and must not become authority.
- Protected authority files such as `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` must be written through lifecycle commands or workflow commit helpers.
- Command names, config keys, filenames, and platform-specific terms stay in English; user-facing Chinese docs remain the default localized surface.

## Architecture Overview

### Core Directory Layout

| Directory | Purpose | Write Boundary |
|---|---|---|
| `.pipeline/` | Source of truth: state, cycle, config, rules, prompts, reports, logs, knowledge, audits, patches, PR archives | Lifecycle commands or workflow commit helper |
| `skills/` | 40 local Skill files; each Skill directory contains `SKILL.md`, optional `references/`, `scripts/`, and `assets/` | Skill command execution and sync adapters |
| `references/` | Normative specs: skill-spec, commands-spec, check-spec, release-spec, audit-spec, debug-spec, etc. | Command semantics definitions and Skill authoring guides |
| `core/src/` | JS implementation: config, commands, artifacts, lifecycle, preflight, compact, knowledge, domains modules | Shared by CLI, Skills, tests, and platform adapters |
| `.pipeline/prompts/` | Cycle-generated execution prompt files | `/hw:plan:generate` and `/hw:plan:extend` |
| `.pipeline/knowledge/` | Knowledge Ledger records, indexes, and compact summaries | `/hw:knowledge` command |
| `.pipeline/archives/` | Archived files from completed or closed Cycles | `/hw:cycle close` or before starting a new Cycle |
| `docs/` | User and developer documentation (Chinese primary) | `/hw:docs` command |
| `docs/en/` | English translation docs | `/hw:docs` command and translation sync |
| `docs/platforms/` | Per-platform docs: Claude Code, Codex, OpenCode, Cursor, Copilot, Trae | `/hw:docs` command |
| `tests/` | Python test files and fixtures | Manual or CI execution |

### Data Flow

```
config.yaml ──→ ──┐
references/* ──→ ─┤
skills/*/SKILL.md ─┤─→ core/src/artifacts/*.js ──→ Platform Adapters
state.yaml ──────→ ─┘         │
cycle.yaml ──────→ ─┘         ├──→ .opencode/ (commands, agents, json)
                              ├──→ .claude/ (commands, agents, plugin)
                              └──→ AGENTS.md (root instructions)
```

All generation paths originate from `core/src/artifacts/` and are triggered via `hypo-workflow sync --platform <name>`. Generated adapters are derived artifacts and must not be edited manually.

## Command Registration Flow

Adding a new `/hw:*` command requires registration at three layers:

### 1. Skill File Layer

Create `skills/<kebab-case-name>/SKILL.md` following the format defined in `references/skill-spec.md`. The frontmatter `name` and `description` drive platform auto-activation and context loading.

### 2. Command Spec Layer

**`references/commands-spec.md`**: Add the command name to the recognized commands list and write its command semantics (flags, preconditions, behavior). This is the authoritative command definition across all platforms.

**`references/skill-spec.md`**: Register the new Skill path in the Inventory table and the Canonical user-facing command map, including Codex original name, OpenCode dash-style name, and Claude Code name.

### 3. Platform Adapter Layer

**OpenCode**: `core/src/artifacts/opencode.js` generates command files under `.opencode/commands/` and agent role mapping tables under `.opencode/agents/` based on `references/opencode-command-map.md`. Manual editing of `.opencode/opencode.json` is not required.

**Claude Code**: `core/src/artifacts/claude.js` generates `.claude/commands/`, `.claude/agents/`, and plugin files. Command files must route to the same canonical Skill/reference contracts.

**Codex**: Uses progressive Skill loading from the installed Skill bundle at `$CODEX_HOME/skills/hypo-workflow`.

### 4. Sync Commands

```bash
# Detect external changes only, no writes
hypo-workflow sync --check-only

# Refresh OpenCode adapters
hypo-workflow sync --platform opencode

# Refresh Claude Code adapters
hypo-workflow sync --platform claude-code

# Repair derived artifacts
hypo-workflow sync --repair
```

## Skill Authoring Standards

All Skills must follow the normative contract defined in [`references/skill-spec.md`](../references/skill-spec.md). Key requirements:

### Directory and Naming

- Directory names use lowercase kebab-case and should match the command stem (stripping the `/hw:` prefix)
- `SKILL.md` only contains activation-critical instructions, safety rules, step sequences, output rules, and direct reference links
- Long semantics go in `references/`, deterministic helpers in `scripts/`, and reusable payloads in `assets/` or `templates/`
- Alias commands may share one Skill (e.g., `/hw:patch` and `/hw:patch fix` share `skills/patch/SKILL.md`)

### Required SKILL.md Format

```markdown
---
name: kebab-case-name
description: One sentence that states what the Skill does and when to use it.
---

# /hypo-workflow:command

## Output Language Rules
## Preconditions
## Execution Flow
## Interactive Behavior
## Safety Rules
## Failure Handling
## Reference Files
```

### Output Language Rules

Every user-facing Skill must include a `## Output Language Rules` section that explains how to resolve user-visible output language from `.pipeline/config.yaml` and global config. Runtime state and log keys remain in English at all times. When platform capabilities support `@include` or similar templating, Skill files SHOULD reference the centralized rule via `<!-- @include: output-language-rule -->` rather than duplicating it inline.

### Safety Rules

Skills that involve protected file writes, destructive operations, release actions, or external publication must include `## Safety Rules` and/or `## Failure Handling` sections.

### Quality Checklist

Before submission, self-check using the Quality Checklist at the end of [`references/skill-spec.md`](../references/skill-spec.md):
- Inventory: Skill path exists, command map points to it
- Naming: directory and frontmatter use lowercase kebab-case
- Trigger: description states what the Skill does and when to use it
- Scope: Skill owns one coherent workflow
- Output: `Output Language Rules` is present
- Safety: protected files and destructive actions are explicitly gated
- References: listed files exist and paths are valid

## Test Authoring and Execution

### Python Tests

```bash
# Run all tests with pytest
pytest tests/

# Run a single test file
pytest tests/test_notion_integration.py

# Run regression suite
python3 tests/run_regression.py
```

### Test Directory Structure

```
tests/
├── test_notion_source_adapter.py    # Notion source adapter tests
├── test_notion_output_adapter.py    # Notion output adapter tests
├── test_notion_mixed_mode.py        # Notion mixed mode tests
├── test_notion_integration.py       # Notion integration tests
├── run_regression.py                # Regression suite entrypoint
├── fixtures/                        # Test fixtures
│   └── notion/                      # Notion API response samples
│       ├── database_query.json
│       ├── blocks_*.json
│       ├── page_children.json
│       └── report.md
├── results/                         # Test result output
└── bin/                             # Test binaries
    └── rg
```

### Node.js Tests

```bash
# If package.json is configured
npm test
```

### Regression Suite

`tests/run_regression.py` runs all S01-S30 test cases. Results are written as JSON to `tests/results/YYYYMMDDTHHmmss-s01-s30.json`.

### CI/CD

Add the following to your CI pipeline:

```bash
pytest tests/
python3 tests/run_regression.py
hypo-workflow sync --check-only
```

## Platform Adapters

Hypo-Workflow maps one canonical command set to multiple platform surfaces.

### Platform Overview

| Platform | Primary Surface | Generated or Installed Assets | Notes |
|---|---|---|---|
| **Codex** | `$CODEX_HOME/skills/hypo-workflow` | root `SKILL.md` and `skills/*/SKILL.md` | Progressive Skill loading from the installed Skill bundle |
| **Claude Code** | `.claude/commands/*`, `.claude/agents/*`, plugin files | Generated via `hypo-workflow sync --platform claude` | Command files route to canonical Skill/reference contracts; Claude native commands and Hypo `/hw:*` are strictly separated |
| **OpenCode** | `.opencode/commands/*`, `.opencode/agents/*`, `.opencode/hypo-workflow.json` | Generated via `hypo-workflow sync --platform opencode` | OpenCode command names use dash-style slash commands and route through agent roles |
| **Cursor / Copilot / Trae** | repository instruction files | Generated via `hypo-workflow sync --platform third-party` | Instruction surface only; no hook, runner, or lifecycle enforcement claims |

### Generation Chain

```
references/skill-spec.md  ──→ core/src/artifacts/opencode.js      ──→ .opencode/
references/commands-spec.md ──→ core/src/artifacts/claude.js       ──→ .claude/
skills/*/SKILL.md           ──→ core/src/artifacts/agent-guidance.js ──→ AGENTS.md
                                core/src/artifacts/third-party.js  ──→ Cursor/Copilot/Trae instruction
```

### Platform Configuration Differences

See [`docs/en/reference/configuration.md`](reference/configuration.md#platform-differences) for detailed platform configuration differences.
