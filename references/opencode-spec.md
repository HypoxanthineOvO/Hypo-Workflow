# V9 OpenCode Native Adapter Spec

This document freezes the V9 mapping target before plugin code starts. The goal is to reuse OpenCode native features wherever they already exist, while keeping Hypo-Workflow's workflow semantics portable across OpenCode, Codex, and Claude Code.

V8.4 parity is tracked in [`opencode-parity.md`](./opencode-parity.md).

## Official Source Baseline

| Area | Official docs | V9 interpretation |
|---|---|---|
| Config and schema | https://opencode.ai/docs/config/ and https://opencode.ai/config.json | Root `opencode.json` must stay OpenCode-schema-compatible; HW-private matrix, guard, and auto-continue metadata belongs in `.opencode/hypo-workflow.json`. |
| Plugins and events | https://opencode.ai/docs/plugins/ | Native extension point for file guards, event listeners, context injection, auto-continue, and custom tools. |
| TUI plugins | https://opencode.ai/docs/tui/ | Native TUI extension surface for sidebar/footer/home/session prompt status panels. |
| Slash commands | https://opencode.ai/docs/commands/ | Native command surface for `/hw-*` files. |
| Agents and subagents | https://opencode.ai/docs/agents/ | Native primary agents and subagents replace HW-owned delegation prompts on OpenCode. |
| Tools | https://opencode.ai/docs/tools/ | Native `question` and `todowrite` tools are required for Plan and execution discipline. |
| Permissions | https://opencode.ai/docs/permissions | Native allow/ask/deny permission model backs file guard and setup defaults. |
| Rules/instructions | https://opencode.ai/docs/rules | Native `AGENTS.md` and instruction loading carry persistent agent guidance. |
| MCP | https://opencode.ai/docs/mcp-servers/ | Optional external-tool channel, not required for parity; Context7 can be used for docs lookup when enabled. |
| Models | https://opencode.ai/docs/models/ | Native provider-qualified model IDs, variants, and model option config are used before HW implements any router. |
| CLI | https://opencode.ai/docs/cli/ | `opencode models --refresh`, `opencode run`, and `opencode serve` are the source for smoke-test and setup guidance. |
| Server and SDK | https://opencode.ai/docs/server/ and https://opencode.ai/docs/sdk/ | Programmatic integration should prefer the OpenAPI/SDK surface instead of scraping TUI state. |

See also [`external-docs-index.md`](./external-docs-index.md) for the cross-platform official docs lookup map.

## Capability Classification

| Capability | Classification | OpenCode mapping | HW responsibility |
|---|---|---|---|
| Slash command invocation | native | `.opencode/commands/*.md` | Generate command files and stable templates. |
| Plan-phase user questions | native | `question` tool / Ask flow | Decide when to ask and enforce gates. |
| Todo and plan tracking | native | `todowrite` tool | Translate milestones and steps into useful todo groups. |
| Primary agents | native | `agent: plan`, `agent: build`, custom `hw-*` agents | Generate agent definitions and model frontmatter from HW profiles. |
| Subagents | native | markdown agents with `mode: subagent` | Map HW test/code/debug/explore/reviewer roles. |
| Permissions | native | `permission` allow/ask/deny config | Use schema-compatible `allow` for local YOLO mode; never persist `bypass` because OpenCode schema rejects it. |
| Rules and instructions | native | `AGENTS.md`, `opencode.json.instructions` | Export HW rules into native instruction sources. |
| Model selection | native | provider/model/variant config | Prefer OpenCode config; HW only supplies profile defaults. |
| MCP servers | native | `mcp` config | Optional setup integration, not required for command parity. |
| Plugin lifecycle | plugin-assisted | `.opencode/plugins/hypo-workflow.ts`, `.opencode/runtime/hypo-workflow-status.js`, `.opencode/tui/hypo-workflow-tui.tsx`, `tui.json` | Keep event/file-guard logic, read-only status loading, and TUI rendering loosely coupled. |
| Command context capture | plugin-assisted | `command.executed`, `tui.command.execute` | Record invoked command, args, and current project state. |
| Auto continue | plugin-assisted | `tool.execute.after`, `session.idle`, `session.status` | Apply HW evaluation rules and continue only under safe policy. |
| File guard | plugin-assisted | `tool.execute.before`, permission config | Protect state/cycle/rules as errors; warn on ordinary `.pipeline` writes. |
| Context compaction | plugin-assisted | `opencode.json.compaction`, `session.compacted`, plugin compaction hooks | Inject compact HW state into compaction summaries. |
| Context loading | plugin-assisted | session events plus generated instructions | Load current prompt/state/report without flooding context. |
| TUI status model | TUI Slot API | `sidebar_content`, `sidebar_footer`, `home_footer` | Build a read-only status model from `.pipeline/` before rendering UI slots. |
| Interactive guide | agent-prompt | `/hw-guide` command template + `question` | Keep intent matching in prompt policy. |
| Plan interview flow | agent-prompt | `/hw-plan*` commands on plan agent | Enforce explicit confirmation and targeted follow-up. |
| Report prose | agent-prompt | generated command prompt and templates | Preserve HW report structure and language policy. |
| Cycle model | HW-specific | files under `.pipeline/` | Own `cycle.yaml`, archives, deferred items, summaries. |
| Patch track | HW-specific | files under `.pipeline/patches/` | Own patch numbering, lifecycle, and fix lane. |
| Pipeline state machine | HW-specific | `.pipeline/state.yaml` | Own milestones, step order, progress, and recovery. |
| PROGRESS/log/report contracts | HW-specific | `.pipeline/PROGRESS.md`, `log.yaml`, reports | Own file formats and compatibility. |
| HW rules severity model | HW-specific | `.pipeline/rules.yaml`, `rules/` | Own off/warn/error semantics; export compatible parts to OpenCode. |

## Canonical Command Mapping

| HW command | OpenCode command | Agent | Route |
|---|---|---|---|
| `/hw:start` | `/hw-start` | `hw-build` | Native slash command, plugin-assisted state/context. |
| `/hw:resume` | `/hw-resume` | `hw-build` | Native slash command, plugin-assisted recovery. |
| `/hw:status` | `/hw-status` | `hw-status` | Native slash command, reads compact state. |
| `/hw:skip` | `/hw-skip` | `hw-build` | Native slash command, HW-specific state mutation. |
| `/hw:stop` | `/hw-stop` | `hw-status` | Native slash command, HW-specific state mutation. |
| `/hw:report` | `/hw-report` | `hw-report` | Native slash command, HW-specific report contract. |
| `/hw:chat` | `/hw-chat` | `hw-build` | Native slash command, lightweight append conversation lane. |
| `/hw:analysis` | `/hw-analysis` | `hw-debug` | Native slash command, interactive Analysis investigation lane with compact state summary and external ledger evidence. |
| `/hw:plan` | `/hw-plan` | `hw-plan` | Native slash command, OpenCode question/todowrite required. |
| `/hw:plan:deep` | `/hw-plan-deep` | `hw-plan` | Native slash command, durable Deep Plan discussion package before ordinary Plan. |
| `/hw:plan:discover` | `/hw-plan-discover` | `hw-plan` | Native slash command, Ask-gated discovery. |
| `/hw:plan:decompose` | `/hw-plan-decompose` | `hw-plan` | Native slash command, todowrite mirrors milestone draft. |
| `/hw:plan:generate` | `/hw-plan-generate` | `hw-plan` | Native slash command, core artifact generation. |
| `/hw:plan:confirm` | `/hw-plan-confirm` | `hw-plan` | Native slash command, explicit confirmation gate. |
| `/hw:plan:extend` | `/hw-plan-extend` | `hw-plan` | Native slash command, active Cycle extension. |
| `/hw:plan:review` | `/hw-plan-review` | `hw-review` | Native slash command, architecture drift review. |
| `/hw:cycle` | `/hw-cycle` | `hw-status` | Native slash command group; subcommands remain prompt arguments. |
| `/hw:accept` | `/hw-accept` | `hw-build` | Native slash command, Cycle acceptance gate. |
| `/hw:reject` | `/hw-reject` | `hw-build` | Native slash command, Cycle rejection feedback. |
| `/hw:explore` | `/hw-explore` | `hw-explore` | Native slash command, isolated global worktree exploration. |
| `/hw:sync` | `/hw-sync` | `hw-build` | Native slash command, adapter and derived-context synchronization. |
| `/hw:docs` | `/hw-docs` | `hw-docs` | Native slash command, generated documentation governance. |
| `/hw:patch` | `/hw-patch` | `hw-build` | Native slash command group; file lifecycle stays HW-specific. |
| `/hw:patch fix` | `/hw-patch-fix` | `hw-build` | Native slash command, lightweight Patch repair lane with native `test`, `implement`, and `audit` worker evidence plus lifecycle closure before auto-close. |
| `/hw:pr` | `/hw-pr` | `hw-review` | Native slash command, manual-gated PR/MR Change Request flow. |
| `/hw:pr create` | `/hw-pr-create` | `hw-build` | Native slash command, guided GitHub PR / GitLab MR creation flow. |
| `/hw:explain` | `/hw-explain` | `hw-review` | Native slash command, evidence-first explanation with unknowns. |
| `/hw:compact` | `/hw-compact` | `hw-compact` | Native slash command, compact generator. |
| `/hw:knowledge` | `/hw-knowledge` | `hw-compact` | Native slash command, Knowledge Ledger compact/index inspection. |
| `/hw:guide` | `/hw-guide` | `hw-plan` | Native slash command, question-driven onboarding. |
| `/hw:showcase` | `/hw-showcase` | `hw-build` | Native slash command, showcase preset. |
| `/hw:rules` | `/hw-rules` | `hw-status` | Native slash command, rules file management. |
| `/hw:init` | `/hw-init` | `hw-plan` | Native slash command, project bootstrap/history import. |
| `/hw:check` | `/hw-check` | `hw-status` | Native slash command, health checks. |
| `/hw:audit` | `/hw-audit` | `hw-review` | Native slash command, preventive audit. |
| `/hw:release` | `/hw-release` | `hw-build` | Native slash command, release automation. |
| `/hw:debug` | `/hw-debug` | `hw-debug` | Native slash command, symptom-driven debug. |
| `/hw:help` | `/hw-help` | `hw-status` | Native slash command, generated help. |
| `/hw:reset` | `/hw-reset` | `hw-status` | Native slash command, guarded reset. |
| `/hw:log` | `/hw-log` | `hw-status` | Native slash command, lifecycle log view. |
| `/hw:setup` | `/hw-setup` | `hw-status` | Native slash command, delegates to global setup profile guidance. |

## OpenCode Agent Plan

| Agent | Mode | Default permissions | Purpose |
|---|---|---|---|
| `hw-plan` | primary | read/question/todowrite allowed, edit ask | Plan, history import review, guide, and plan review. |
| `hw-build` | primary | read/edit/bash ask according to profile | Start/resume/release/debug/showcase implementation work. |
| `hw-status` | primary | read allowed, edit deny by default | Status, help, log, check, and rules list. |
| `hw-compact` | primary | read allowed, edit ask | Context compaction and compact summary generation. |
| `hw-test` | subagent | read/bash allowed by permission profile | Test design, execution, and focused validation. |
| `hw-code-a` | subagent | edit/bash ask according to profile | Primary implementation worker for scoped code changes. |
| `hw-code-b` | subagent | edit/bash ask according to profile | Secondary implementation worker for parallel scoped code changes. |
| `hw-report` | primary | read/todowrite allowed | Report synthesis, evidence summaries, and final delivery notes. |
| `hw-review` | subagent | read allowed, edit deny | Audit and architecture/code review. |
| `hw-explore` | subagent | read/search allowed, edit deny | Bounded codebase exploration. |

Plan commands must bind to `hw-plan` by default. If OpenCode exposes nested planning through `todowrite` only, HW treats nested plans as hierarchical todos instead of inventing a second state machine.

## OpenCode Model Matrix Contract

Hypo-Workflow treats OpenCode model routing as a setup/sync contract, not as a model-calling runner. The structured config surface is:

```yaml
opencode:
  providers:
    anthropic:
      models:
        claude-opus-4.6:
          name: Claude Opus 4.6
    mimo:
      models:
        mimo-v2.5-pro:
          name: MiMo V2.5 Pro
        mimo-v2.5-flash:
          name: MiMo V2.5 Flash
    deepseek:
      models:
        deepseek-v4-pro:
          name: DeepSeek V4 Pro
        deepseek-v4-flash:
          name: DeepSeek V4 Flash
  compaction:
    effective_context_target: 900000
  agents:
    plan:
      model: deepseek-v4-pro
    compact:
      model: deepseek-v4-flash
    test:
      model: deepseek-v4-pro
    code-a:
      model: mimo-v2.5-pro
    code-b:
      model: deepseek-v4-pro
    debug:
      model: deepseek-v4-pro
    report:
      model: deepseek-v4-flash
```

M01 defines the schema, defaults, and metadata contract. M02 renders model routing into generated `.opencode/agents/*.md` frontmatter and renders compaction intent plus the full matrix into `.opencode/hypo-workflow.json`. The project-root `opencode.json` and adapter-local `.opencode/opencode.json` stay limited to OpenCode-compatible configuration fields; Hypo-Workflow-specific values such as `effective_context_target` and `agents` belong in the sidecar metadata.

Rendered agent model roles:

| Matrix role | Generated agent |
|---|---|
| `plan` | `hw-plan` |
| `compact` | `hw-compact` |
| `test` | `hw-test` |
| `code-a` | `hw-build`, `hw-code-a` |
| `code-b` | `hw-code-b` |
| `debug` | `hw-debug` |
| `report` | `hw-report` |

This is still used as a setup/sync surface and not as a model-calling runner. Actual model invocation remains OpenCode's responsibility.

## Event and Guard Strategy

| Event/hook | Usage |
|---|---|
| `command.executed` and `tui.command.execute` | Capture current HW command and arguments for log/context continuity. |
| `tool.execute.before` | Enforce file guard before edits or shell actions. |
| `tool.execute.after` | Update heartbeat and inspect tests/evaluation signals. |
| `session.idle` and `session.status` | Trigger safe auto-continue when enabled. |
| `session.compacted` and compaction hooks | Preserve current Cycle, milestone, prompt, and compact files across compaction. |
| `permission.asked` and `permission.replied` | Record user approvals when they affect HW state. |

## Workflow-Control Policy Runtime

M04 moves OpenCode workflow-control decisions into generated runtime helpers:

- source helper: `core/src/opencode-hooks/index.js`
- generated helper: `.opencode/runtime/hypo-workflow-hooks.js`
- plugin import: `.opencode/plugins/hypo-workflow.ts`

The policy helpers cover:

- `evaluateOpenCodeFileGuard`
- `decideOpenCodePermission`
- `shouldOpenCodeAutoContinue`
- `isOpenCodeStopEquivalent`
- `serializeOpenCodePermissionEvent`

Path policy:

- `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` deny unless an explicit workflow mutation is active
- `.pipeline/knowledge/**` is allowed through controlled Knowledge Ledger helpers
- `~/.hypo-workflow/worktrees/**` is allowed for Explore worktrees
- `~/.hypo-workflow/secrets.yaml` is denied and permission events redact secret-like fields
- ordinary `.pipeline/**` writes warn or ask, depending on hook surface

OpenCode cannot be described as exact Claude Stop Hook parity. Stop-equivalent behavior is modeled as idle/status policy plus warnings and permission decisions.
| `todo.updated` | Mirror OpenCode todos into PROGRESS summaries where useful. |

Default auto-continue is on for OpenCode with `safe` policy: continue after green tests, explicit low-risk report/evaluation, no open error-severity rules, no dirty protected HW files, and no pending Ask/question gate.

`execution.bash.mode=allow_local` is the Hypo-Workflow default for OpenCode bash auto-execution. In local YOLO mode, the plugin permission hook returns `allow` for local commands, external or remote side effects (`git push`, `gh pr`, `curl`, `wget`, remote clone, publish), destructive commands (`rm -rf`, `git reset --hard`, force push), release publication, and system dependency installation. The root `opencode.json` stays native-schema-compatible with `* : allow`, `bash: allow`, `edit: allow`, and `question: allow`. Do not encode this behavior as `permission: bypass`; `bypass` is not an OpenCode permission action.

## TUI Status Model

OpenCode exposes a TUI Slot API through `@opencode-ai/plugin` TUI plugins. The relevant host slots for Hypo-Workflow status are:

- `sidebar_content`
- `sidebar_footer`
- `home_footer`
- `home_bottom`
- `session_prompt_right`

M08 implements the read-only status model first. M09 may render that model into sidebar and footer slots, but the model itself must stay platform-neutral and must not mutate `.pipeline/`.

C5 adds a read-only progress dashboard projection over the same canonical status model. It must expose phase, next action, lease status, Recent Events, derived health, and an active config summary. It is explicitly not a workflow action panel: no start/resume/accept/reject/sync/repair dispatch should be attached to this surface.

Recommended M09 layout:

- server plugin: `.opencode/plugins/hypo-workflow.ts`
- shared status module: `.opencode/runtime/hypo-workflow-status.js`
- TUI plugin: `.opencode/tui/hypo-workflow-tui.tsx`, registered from root `tui.json`
- project-root `opencode.json.plugin` should load the server and TUI plugins, while `.opencode/opencode.json` must not redeclare those plugin paths
- the TUI plugin imports the colocated status module instead of referencing Hypo-Workflow source paths outside the generated adapter
- do not place helper modules under `.opencode/plugins/` unless they export a real plugin entry, because OpenCode auto-discovers local plugin files from that directory

Status model sources:

- `.pipeline/state.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/feature-queue.yaml`
- `.pipeline/metrics.yaml`
- `.pipeline/log.yaml`
- `.pipeline/reports.compact.md`
- `.opencode/hypo-workflow.json` for the configured OpenCode role model matrix
- `.pipeline/patches/` and `.pipeline/patches.compact.md` when present

Required output fields:

- Cycle id/name/status
- pipeline status and heartbeat
- current Feature, Milestone, step, and Feature Queue pointer
- progress completed/total/percent
- `gate: confirm` and failure-policy state
- latest evaluation score
- recent 10 events
- duration, token/cost summary
- current OpenCode agent/model from TUI session state when available
- latest active subagent/model from `subtask` parts when available
- active subagent/model from `subtask` parts must be labeled runtime-only and must not become acceptance worker evidence
- configured primary/subagent role model matrix from `.opencode/hypo-workflow.json`
- lease action/reason and repair hint when present
- derived health status, stale count, error count, and stale artifacts
- active config summary: platform, execution mode, execution preset, plan mode, output language/timezone, and OpenCode profile
- sidebar summary sections
- footer one-line text
- source read status and warnings

Resilience rules:

- the adapter is read-only
- missing optional files produce `missing_optional` source entries, not crashes
- malformed optional files produce warnings and degraded `n/a` fields
- missing token/cost telemetry must stay `n/a`; do not infer cost from model names or public price tables
- if `.pipeline/state.yaml` is missing, return a `missing_pipeline` model suitable for a footer warning

Official baseline:

- `@opencode-ai/plugin/dist/tui.d.ts` defines `TuiHostSlotMap` with `sidebar_content`, `sidebar_footer`, `home_footer`, and related slots.
- The SDK exposes TUI commands/events such as append prompt, execute command, show toast, and publish.
- Current implementation should not assume a separate status-bar API beyond the TUI Slot API.

## Non-Goals for M0

- No plugin code is implemented here.
- No Codex or Claude Code command is removed or renamed.
- MCP is documented as a native optional channel, not a required dependency.
