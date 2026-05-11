# Skill Spec

This document is the canonical contract for Hypo-Workflow Skill assets. It records the current inventory, command-to-skill mapping, authoring format, platform mapping, and known cleanup findings for C2.

## Goals

- Keep Skills discoverable, compact, and executable across Codex, Claude Code, and OpenCode.
- Preserve every existing Skill during C2: no merge or delete, no trigger semantics rewrite, and no implicit command migration.
- Make command-to-Skill traceability reviewable from repository data instead of relying on scattered prose.
- Separate stable workflow instructions in `SKILL.md` from longer references, examples, scripts, and generated artifacts.
- Treat protected runtime files (`.pipeline/state.yaml`, `.pipeline/cycle.yaml`, `.pipeline/rules.yaml`) as mutation-sensitive unless the active workflow step explicitly owns the write.

## Inventory

The repository currently has 39 local Skill files under `skills/*/SKILL.md`:

| Path | Role |
|---|---|
| `skills/accept/SKILL.md` | User-facing Cycle acceptance command |
| `skills/audit/SKILL.md` | User-facing audit command |
| `skills/chat/SKILL.md` | User-facing lightweight append conversation command |
| `skills/check/SKILL.md` | User-facing health-check command |
| `skills/compact/SKILL.md` | User-facing compact view command |
| `skills/cycle/SKILL.md` | User-facing Cycle lifecycle command |
| `skills/debug/SKILL.md` | User-facing debug command |
| `skills/docs/SKILL.md` | User-facing documentation governance command |
| `skills/explore/SKILL.md` | User-facing isolated exploration worktree command |
| `skills/explain/SKILL.md` | User-facing evidence-first explanation command |
| `skills/guide/SKILL.md` | User-facing onboarding command |
| `skills/help/SKILL.md` | User-facing help command |
| `skills/init/SKILL.md` | User-facing project initialization command |
| `skills/knowledge/SKILL.md` | User-facing Knowledge Ledger command |
| `skills/log/SKILL.md` | User-facing lifecycle log command |
| `skills/patch/SKILL.md` | User-facing Patch command shared by `/hw:patch` and `/hw:patch fix` |
| `skills/pr/SKILL.md` | User-facing PR/MR Change Request command |
| `skills/plan-confirm/SKILL.md` | User-facing planning command |
| `skills/plan-decompose/SKILL.md` | User-facing planning command |
| `skills/plan-discover/SKILL.md` | User-facing planning command |
| `skills/plan-extend/SKILL.md` | User-facing planning command |
| `skills/plan-generate/SKILL.md` | User-facing planning command |
| `skills/plan-review/SKILL.md` | User-facing planning review command |
| `skills/plan/SKILL.md` | User-facing planning entrypoint |
| `skills/reject/SKILL.md` | User-facing Cycle rejection command |
| `skills/release/SKILL.md` | User-facing release command |
| `skills/report/SKILL.md` | User-facing report command |
| `skills/reset/SKILL.md` | User-facing reset command |
| `skills/resume/SKILL.md` | User-facing resume command |
| `skills/rules/SKILL.md` | User-facing rules command |
| `skills/setup/SKILL.md` | User-facing global setup command |
| `skills/showcase/SKILL.md` | User-facing showcase command |
| `skills/skip/SKILL.md` | User-facing skip command |
| `skills/start/SKILL.md` | User-facing start command |
| `skills/status/SKILL.md` | User-facing status command |
| `skills/stop/SKILL.md` | User-facing stop command |
| `skills/sync/SKILL.md` | User-facing project sync command |
| `skills/watchdog/SKILL.md` | Internal cron-only watchdog Skill |

Additional inventory notes:

- Root `SKILL.md` is the aggregate Hypo-Workflow router and system reference. It is not counted as a child Skill in the 39 local Skill files.
- The OpenCode command map exposes 40 user-facing commands and 37 user-facing Skill paths because `/hw:accept` and `/hw:achieve` share `skills/accept/SKILL.md`, `/hw:patch` and `/hw:patch fix` share `skills/patch/SKILL.md`, and `/hw:pr` plus `/hw:pr create` share `skills/pr/SKILL.md`.
- `skills/watchdog/SKILL.md` is internal and cron-only. It is intentionally not part of the user-facing command map.
- The installed Codex copy under `$CODEX_HOME/skills/hypo-workflow` should mirror the same root plus child Skill layout after sync or installation.

## Directory and Naming

Canonical local layout:

```text
skills/<kebab-case-command>/SKILL.md
skills/<kebab-case-command>/references/*.md
skills/<kebab-case-command>/scripts/*
skills/<kebab-case-command>/assets/*
references/*.md
templates/*
core/src/*
```

Rules:

- Skill directory names use lowercase kebab-case and should match the command stem without the `/hw:` prefix.
- `SKILL.md` keeps only activation-critical instructions, safety rules, step sequence, output rules, and direct reference links.
- Put long command semantics in `references/`, deterministic helpers in `scripts/`, and reusable payloads in `assets/` or `templates/`.
- Reference paths from `SKILL.md` should be relative to the Skill root when they are bundled with a Skill, or repository-root paths when they intentionally point to shared Hypo-Workflow references.
- Alias commands may share one Skill only when they truly share behavior; document the alias in both `references/commands-spec.md` and the platform command map.
- Internal Skills must be marked explicitly as internal, hidden, or cron-only in their description/body and must not appear as normal user commands.

## Required SKILL.md Format

Every user-facing Skill should follow this structure:

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

Required content contract:

- Frontmatter `name` is lowercase kebab-case and should match the directory name unless a platform-specific adapter requires a namespaced override.
- Frontmatter `description` must include both the capability and the trigger condition. It should be specific enough for automatic activation and short enough for startup context.
- `## Output Language Rules` states how to resolve `.pipeline/config.yaml` and global config for user-visible language. Runtime state/log keys remain English.
- `## Preconditions` lists required files, state assumptions, and safe fallback behavior.
- `## Execution Flow` uses ordered steps for the normal path.
- `## Interactive Behavior` is required when the Skill may ask questions, require confirmation, or collect natural-language requirements.
- `## Safety Rules` or `## Failure Handling` is required for mutating commands, protected file writes, destructive operations, release actions, and external publication.
- `## Reference Files` lists the exact references the agent may load, with one-level paths where possible.

Recommended quality patterns:

- Keep `SKILL.md` under 500 lines unless the command is an aggregate router.
- Prefer procedures, validation loops, concrete defaults, and examples over broad principles.
- Use progressive disclosure: move long specifications to reference files and tell the agent when to load each one.
- Use scripts for deterministic checks, counting, validation, sync, or generation when shellable logic is safer than prose.
- Avoid repeating repository-wide policy in every Skill unless that policy is directly relevant to safe execution.

## Platform Mapping

Hypo-Workflow maps one canonical command set into three platform surfaces:

| Platform | Primary surface | Generated or installed assets | Notes |
|---|---|---|---|
| Codex | `$CODEX_HOME/skills/hypo-workflow` | root `SKILL.md` and `skills/*/SKILL.md` | Uses progressive Skill loading from the installed Skill bundle. |
| Claude Code | `.claude/commands/*`, `.claude/agents/*`, plugin files | generated adapters from `hypo-workflow sync --platform claude` | Command files should route to the same canonical Skill/reference contracts. |
| OpenCode | `.opencode/commands/*`, `.opencode/agents/*`, `.opencode/hypo-workflow.json` | generated adapters from `hypo-workflow sync --platform opencode` | OpenCode command names use dash-style slash commands and route through agent roles. |

Canonical user-facing command map:

| Canonical command | OpenCode command | Agent | Skill path |
|---|---|---|---|
| `/hw:start` | `/hw-start` | `hw-build` | `skills/start/SKILL.md` |
| `/hw:resume` | `/hw-resume` | `hw-build` | `skills/resume/SKILL.md` |
| `/hw:status` | `/hw-status` | `hw-status` | `skills/status/SKILL.md` |
| `/hw:skip` | `/hw-skip` | `hw-build` | `skills/skip/SKILL.md` |
| `/hw:stop` | `/hw-stop` | `hw-status` | `skills/stop/SKILL.md` |
| `/hw:report` | `/hw-report` | `hw-status` | `skills/report/SKILL.md` |
| `/hw:chat` | `/hw-chat` | `hw-build` | `skills/chat/SKILL.md` |
| `/hw:plan` | `/hw-plan` | `hw-plan` | `skills/plan/SKILL.md` |
| `/hw:plan:discover` | `/hw-plan-discover` | `hw-plan` | `skills/plan-discover/SKILL.md` |
| `/hw:plan:decompose` | `/hw-plan-decompose` | `hw-plan` | `skills/plan-decompose/SKILL.md` |
| `/hw:plan:generate` | `/hw-plan-generate` | `hw-plan` | `skills/plan-generate/SKILL.md` |
| `/hw:plan:confirm` | `/hw-plan-confirm` | `hw-plan` | `skills/plan-confirm/SKILL.md` |
| `/hw:plan:extend` | `/hw-plan-extend` | `hw-plan` | `skills/plan-extend/SKILL.md` |
| `/hw:plan:review` | `/hw-plan-review` | `hw-review` | `skills/plan-review/SKILL.md` |
| `/hw:cycle` | `/hw-cycle` | `hw-status` | `skills/cycle/SKILL.md` |
| `/hw:explore` | `/hw-explore` | `hw-explore` | `skills/explore/SKILL.md` |
| `/hw:sync` | `/hw-sync` | `hw-build` | `skills/sync/SKILL.md` |
| `/hw:docs` | `/hw-docs` | `hw-docs` | `skills/docs/SKILL.md` |
| `/hw:patch` | `/hw-patch` | `hw-build` | `skills/patch/SKILL.md` |
| `/hw:patch fix` | `/hw-patch-fix` | `hw-build` | `skills/patch/SKILL.md` |
| `/hw:pr` | `/hw-pr` | `hw-review` | `skills/pr/SKILL.md` |
| `/hw:explain` | `/hw-explain` | `hw-review` | `skills/explain/SKILL.md` |
| `/hw:compact` | `/hw-compact` | `hw-compact` | `skills/compact/SKILL.md` |
| `/hw:knowledge` | `/hw-knowledge` | `hw-compact` | `skills/knowledge/SKILL.md` |
| `/hw:guide` | `/hw-guide` | `hw-plan` | `skills/guide/SKILL.md` |
| `/hw:showcase` | `/hw-showcase` | `hw-build` | `skills/showcase/SKILL.md` |
| `/hw:rules` | `/hw-rules` | `hw-status` | `skills/rules/SKILL.md` |
| `/hw:init` | `/hw-init` | `hw-plan` | `skills/init/SKILL.md` |
| `/hw:check` | `/hw-check` | `hw-status` | `skills/check/SKILL.md` |
| `/hw:audit` | `/hw-audit` | `hw-review` | `skills/audit/SKILL.md` |
| `/hw:release` | `/hw-release` | `hw-build` | `skills/release/SKILL.md` |
| `/hw:debug` | `/hw-debug` | `hw-build` | `skills/debug/SKILL.md` |
| `/hw:help` | `/hw-help` | `hw-status` | `skills/help/SKILL.md` |
| `/hw:reset` | `/hw-reset` | `hw-status` | `skills/reset/SKILL.md` |
| `/hw:log` | `/hw-log` | `hw-status` | `skills/log/SKILL.md` |
| `/hw:setup` | `/hw-setup` | `hw-status` | `skills/setup/SKILL.md` |

Traceability rules:

- `core/src/commands/index.js` is the generated/checked source for canonical command metadata.
- `references/opencode-command-map.md` is the human-readable OpenCode mapping.
- Platform adapters must not invent command names, agent routes, or Skill paths that are absent from the canonical map.
- Internal `watchdog` behavior is documented in `skills/watchdog/SKILL.md`, `skills/start/SKILL.md`, and `skills/resume/SKILL.md`, but it remains cron-only.

## Quality Checklist

Use this checklist when editing or reviewing any Skill:

- Inventory: the Skill path exists, the command map points to it, and the platform adapters agree.
- Naming: directory and frontmatter use lowercase kebab-case without spaces or underscores.
- Trigger: `description` says what the Skill does and when to use it.
- Scope: the Skill owns one coherent workflow and does not duplicate unrelated command behavior.
- Output: `Output Language Rules` are present for user-visible commands.
- Safety: protected files and destructive actions are explicitly gated.
- Flow: `Preconditions`, `Execution Flow`, and relevant failure behavior are concrete.
- References: `Reference Files` lists existing files, and long material is not embedded unnecessarily.
- Validation: the Skill has at least one test, linter, sync check, or manual verification note when changed.
- Platform: Codex, Claude Code, and OpenCode generated artifacts remain aligned after sync.

## Current Audit Findings

Current status after M04:

- `skills/showcase/SKILL.md` now uses the canonical `## Output Language Rules` heading.
- Stale `/hw:review` V7 compatibility wording has been replaced in root `SKILL.md`, `references/plan-review-spec.md`, and `references/commands-spec.md`. The current canonical command is `/hw:plan:review`; `/hw:review` is only a legacy compatibility alias.
- `skill-quality` exists as a built-in rule/checking surface for frontmatter, output-language heading, reference paths, command-map traceability, and internal Skill exceptions.
- `skills/watchdog/SKILL.md` is a valid internal exception: it is cron-only, should not be user-invocable, and should not be counted among the 37 user-facing Skill paths.
- Some long command semantics remain in Skill bodies instead of shared references. This should be improved incrementally without changing trigger behavior.
- C2 explicitly allows cleanup, formatting, and documentation improvements, but no merge or delete of existing Skills.

## External References

Observed external patterns that inform this spec:

- Agent Skills specification: `https://agentskills.io/specification`
  - Skill is a folder with `SKILL.md`; optional `scripts/`, `references/`, and `assets/`; metadata is loaded before full instructions; references support progressive disclosure.
- Agent Skills best practices: `https://agentskills.io/skill-creation/best-practices`
  - Good Skills are grounded in real project expertise, use concise procedures, avoid excessive generic detail, and refine through execution.
- Anthropic skill-development / Claude Code Skills docs: `https://code.claude.com/docs/en/slash-commands`
  - Skills and slash commands can share invocation semantics; descriptions drive activation; frontmatter fields support invocation and permissions.
- Oh My OpenAgent: `https://github.com/code-yeongyu/oh-my-openagent`
  - Useful pattern: agent roles plus scoped Skills, MCP/tools, and permissions rather than one overloaded prompt.
- SuperSkills / agentskill.sh: `https://agentskill.sh/how-to-create-a-skill`
  - Useful pattern: strict folder naming, frontmatter trigger quality, concise steps, optional scripts/references, and publish-time checklist.
- SkillsLLM: `https://skillsllm.com/`
  - Marketplace/retrieval perspective: Skill metadata must be searchable and specific enough for discovery.
- SkillsBench: `https://github.com/benchflow-ai/skillsbench`
  - Evaluation perspective: Skills should be testable with task checks and agent behavior evaluation, not only readable by humans.
