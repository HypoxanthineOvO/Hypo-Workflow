# Changelog

## v12.0.0 - 2026-05-06

### Features

- Added structured Rules/Habits authority with generated platform instruction views so user preferences can survive context loss and be checked during review.
- Added Agent Review artifacts and multi-round `needs_changes -> repair -> review` iteration records for plan, test, implementation, and release closeout scrutiny.
- Added Domain Pack infrastructure with the built-in RTL reference pack and boundary protocol for future local or external language/domain packages.
- Added Claude Code Codex-plugin support modeling, including explicit-confirmation install boundaries and Codex worker ownership guidance.

### Documentation

- Reworked README around platform-neutral common capabilities instead of per-platform command duplication.
- Restored concrete install and sync instructions in the generated Codex, Claude Code, OpenCode, Cursor, Copilot, and Trae platform guides.
- Recorded the platform installation documentation policy in the Knowledge Ledger and platform capability reference.

### Tests

- Core Node suite: 311/311 passing.
- Scenario regression: 63/63 passing.
- Config validation, Claude plugin validation, docs repair/checks, sync check-only, and `git diff --check` passing.

## v11.1.0 - 2026-05-06

### Features

- Added Codex automation governance with stable `automation.level` values, protected planning/destructive/release gates, and config validation.
- Added Codex continuation and preflight helpers for safe resume targets, protected-file checks, README/docs freshness, generated artifact freshness, evidence checks, and secret-marker blocking.
- Added Cursor, GitHub Copilot, and Trae repository instruction adapters with `sync --platform cursor|copilot|trae`.
- Added non-Git `init-project` bootstrap with `--automation manual|balanced|full`.

### Documentation

- Rewrote README as a Chinese-first Quick Start with six platform entry points and repository import guidance.
- Strengthened Codex Subagent guidance across shared skills and references: Codex/GPT runtime only, prefer Subagents for non-trivial Codex work, and keep implementation separate from testing/review.
- Updated platform guides, generated artifact references, README governance, setup/help guidance, and C7 lifecycle reports.

### Tests

- Core Node suite: 281/281 passing.
- Scenario regression: 63/63 passing.
- C7 focused tests: 52/52 passing.
- Config validation, README freshness, docs checks, generated adapter smoke, derived repair, and `git diff --check` passing.

## v11.0.0 - 2026-05-05

### Features

- Added the Claude Code adapter plugin contract with the `hw` namespace, project-local settings merge, managed hooks, subagent model routing, and a Progress-style status surface.
- Added project-local Claude Code API overrides through `claude_code.api`, including `ANTHROPIC_BASE_URL` / `ANTHROPIC_API_KEY` env rendering for Anthropic-compatible DeepSeek gateways.
- Added Claude hook runtime coverage for SessionStart, UserPromptSubmit, Stop, compact resume, PermissionRequest, tool/batch refresh, and Progress updates.
- Added Claude subagent artifacts and routing metadata for docs, code, test, review, debug, report, and compact roles.
- Added deterministic Claude smoke fixture and live manual smoke guidance covering `/hw:status`, `/hw:resume`, Stop hook behavior, DeepSeek routing, and Mimo role routing.

### Fixes

- Removed legacy `skills/hw-*` Claude alias skills so the `hw` plugin namespace exposes canonical commands such as `/hw:status` instead of duplicate `/hw:hw-status` entries.
- Fixed Claude Code hook schema compliance for warning-only Stop responses and permission decisions.
- Fixed Claude live smoke hook installation by generating project-local `hooks/claude-hook.mjs` during `sync --platform claude-code`.

### Documentation

- Added and restored the Claude Code platform guide with API/env override, hook, agent, status, safety-profile, and manual-smoke details.
- Updated README, command count checks, OpenCode parity wording, Skill inventory tests, and release readiness docs for the 36-command contract.
- Recorded C6 live-smoke lessons in PROGRESS/log evidence, including plugin namespace behavior, project-local API configuration, and status read-only boundaries.

### Tests

- Core Node suite: 256/256 passing.
- Scenario regression: 62/62 passing.
- Claude plugin validation, deterministic Claude smoke fixture, config validation, docs/readme freshness, release narrative checks, sync check-only, and `git diff --check` passing.

## v10.2.0 - 2026-05-04

### Features

- Completed the C5 follow-up redesign across workflow kind policy, lifecycle commit invariants, Guide routing, vertical-slice TDD contracts, Feature DAG board, execution leases, layered sync, log/evidence safety, docs governance, config TUI, metrics, and lifecycle regression coverage.
- Added `/hw:docs` and reorganized documentation into a concise README, user/developer guides, platform guides, and generated references.
- Added stale execution lease takeover, heartbeat recovery, Codex/OpenCode handoff boundaries, derived artifact repair, and read-only progress dashboard data.
- Added config TUI helpers with global/project target separation, staged diffs, schema validation, explicit confirmation, protected-file guards, and sync guidance.
- Added metrics helpers that compute wall-clock duration and record missing token/cost data as `telemetry_unavailable`.

### Documentation

- Updated README, command references, OpenCode command map, platform docs, Skill inventory, and regression scenarios for 37 user-facing commands.
- Documented OpenCode model matrix status, generated artifacts, docs governance, lifecycle contracts, and release safety boundaries.

### Tests

- Core Node suite: 217/217 passing.
- Scenario regression: 62/62 passing.
- Config validation, docs freshness, OpenCode artifact sync, and `git diff --check` passing.

## v10.1.0 - 2026-05-03

### Features

- Completed C4 Knowledge Ledger, Global TUI, Acceptance Loop, Explore Mode, and `/hw:sync` standardization across 14 milestones.
- Added Knowledge Ledger records, indexes, compact context, SessionStart loading, Stop Hook self-check, and OpenCode workflow-control hooks.
- Added global config/model pool/project registry actions, Ink TUI snapshot, selected project sync, and CLI package metadata.
- Added Cycle and Patch acceptance loops with structured rejection feedback, timeout policy/status display, and accept/reject command surfaces.
- Added Explore Mode contract, isolated global worktrees, dirty-worktree gates, lifecycle status/end/archive, and plan/analysis upgrade contexts.
- Added `/hw:sync` light/standard/deep modes, shared CLI sync logic, SessionStart light external-change detection, TUI sync action, and OpenCode `/hw-sync` artifact.

### Documentation

- Updated README, command map, Skill inventory, OpenCode parity/spec references, CLI docs, and regression scenarios for 36 user-facing commands.
- Closed and archived C4 under `.pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/`.

### Tests

- Core Node suite: 156/156 passing.
- Scenario regression: 62/62 passing.
- Config validation, OpenCode/root/TUI JSON parse, and `git diff --check` passing.

## v10.0.2 - 2026-05-02

### Documentation

- Renamed C2 to `Maintainability, Observability, and Showcase Expansion` across archived Cycle metadata, confirm summary, project summary, and status fixtures.
- Added `references/external-docs-index.md` as the official documentation lookup index for OpenCode Config, Agents, Models, CLI, Server, SDK, MCP, and Context7.
- Updated the C3 architecture baseline with a completed Plan Review and archived C3 runtime context.

### Lifecycle

- Archived C3 runtime artifacts into `.pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/`.
- Updated project summary and lifecycle log to reflect three completed archived Cycles and no active Cycle.

### Tests

- Updated C3 queue, metrics, progress, and design validation to read archived artifacts after Cycle close.
- Core Node suite: 105/105 passing.
- Scenario regression: 62/62 passing.
- Claude plugin validation and config validation passing.

## v10.0.1 - 2026-05-02

### Fixes

- Fixed OpenCode agent frontmatter to render known model IDs in `provider/model` form, including MiMo and DeepSeek custom providers.
- Added OpenCode TUI status visibility for the current agent/model, latest active subagent/model, and configured subagent model matrix.
- Isolated the OpenCode events/file-guard regression scenario from local global profile settings.

### Tests

- Core Node suite: 105/105 passing.
- Scenario regression: 62/62 passing.
- OpenCode sync and `hw-build` smoke tests passing against `/home/heyx/Hypo-Agent`.

## v10.0.0 - 2026-05-02

### Features

- Added V10 Analysis Preset runtime contracts: experiment execution records, evidence ledgers, outcomes, follow-up proposals, analysis templates, and preset-aware evaluation criteria.

### Tests

- Added Node coverage for analysis experiment results, outcome semantics, report/ledger templates, evaluation criteria, planning hints, and C3 no-confirm queue policy.

## v9.1.2 - 2026-05-02

### Documentation

- Added README coverage for Feature Queue long-range planning, including `--batch`, `--insert`, gates, auto-chain, failure policy, metrics, and lifecycle usage.
- Recorded the next-cycle OpenCode multi-agent model matrix candidate as the first draft task for the next Cycle.
- Reworked the C2 technical report Slides into a 51-page command-oriented deck with seven lived-experience path pages, section highlights, command enumeration, and Demo Route.
- Added future work in both the report and Slides on whether Harness can reduce the need for model-engineering intelligence.

### Fixes

- Fixed the Slides cover layout so the title metadata is no longer clipped.
- Removed the draft visual/evidence page and replaced the V9 timeline page with a clearer Codex-to-OpenCode motivation section.
- Enlarged and rerouted the Execution Loop diagram and simplified the OpenCode Adapter figure to avoid overlap.
- Restored the Slides GPT Image 2 / Image Gen visual-system evidence marker required by the showcase refresh contract.

### Tests

- Scenario regression: 60/60 passing.
- Showcase refresh target: 3/3 passing.
- PDF builds: `make report` and `make slides` passing.

## v9.1.1 - 2026-05-01

### Documentation

- Added the canonical `docs/showcase/c2-report/` source package for the expanded technical book report and Beamer slides.
- Added GPT Image generated visual assets for the cover, tool-evolution narrative, and file-first architecture.
- Added the `vendor/Hypoxanthine-LaTeX` submodule and LaTeX build packaging for report/slides compilation.

### Tests

- Added report refresh coverage for canonical source placement, submodule metadata, narrative anchors, and GPT Image 2 slide evidence.
- Verified report and slides PDF builds from the new source directory.

## v9.1.0 - 2026-05-01

### Features

- 新增 README 自动维护与 release freshness 检查，将动态文档更新纳入发布门禁。
- 新增 Skill 质量规范、结构检查和 `skill-quality` 规则，覆盖 Codex、Claude Code 与 OpenCode 的技能面一致性。
- 新增 Feature Queue、Batch Plan、queue insert、auto-chain、JIT decomposition 和 metrics fallback。
- 新增 `/hw:chat` 轻量会话轨道、恢复上下文、日志记录和 Patch 升级提示。
- 新增 Progressive Discover、可选 Karpathy rule pack，以及 webapp、agent-service、research 三类 Test Profile。
- 新增 OpenCode 只读状态模型、sidebar/footer TUI plugin 和独立 runtime helper。

### Improvements

- OpenCode 命令映射扩展到 31 个用户命令，并补齐 `/hw-chat` adapter。
- 更新 release 规范，加入 README Update 和 readme-freshness 发布步骤。
- 更新规则、进度、配置、日志、评估和命令规范以匹配 C2 的非 Report 能力。

### Tests

- Node core suite: 73/73 passing.
- Scenario regression: 60/60 passing.

## v9.0.0 - 2026-04-30

### Features

- Added the OpenCode Native Adapter baseline with capability mapping, platform matrix, command map, parity docs, and architecture references.
- Added `core/` deterministic helpers for config/profile/platform/commands/rules and OpenCode artifact generation.
- Added `cli/bin/hypo-workflow` as a setup-only global CLI for setup, doctor, profile, sync, install, and init-project.
- Added OpenCode project scaffold generation for `opencode.json`, `AGENTS.md`, `.opencode/commands/`, `.opencode/agents/`, `.opencode/plugins/hypo-workflow.ts`, and `.opencode/package.json`.
- Added OpenCode agents, Ask/question guidance, todowrite plan discipline, and the `plan-tool-required` built-in rule.
- Added OpenCode plugin event policy scaffold for command context, safe auto-continue, compact context restore, file guard, todo sync, and permission logging.

### Improvements

- Documented full V8.4 parity expectations for OpenCode without making OpenCode runtime a CI dependency.
- Updated command templates so all 30 user commands are traceable from `/hw:*` to OpenCode `/hw-*`.
- Preserved Codex and Claude Code behavior while adding OpenCode-specific generated artifacts.

### Tests

- Added V9 scenarios `s51` through `s59`, covering capability matrix, core helpers, CLI setup, plugin scaffold, command map, agents/Ask/todowrite, events/file guard, V8.4 parity, and V9 regression bundle.
- Regression suite expanded to `59/59`.

## v8.4.0 - 2026-04-30

### Features

- 新增 `/hw:rules`，用于列出规则、调整严格度、创建自定义 Markdown 规则，并导入/导出规则包。
- 新增 `rules/builtin/`，内置 12 条规则，覆盖 guard、style、hook 和 workflow 四类语义标签。
- 新增 `rules/presets/`，提供 `recommended`、`strict`、`minimal` 三套规则集。
- 新增 `.pipeline/rules.yaml` 和 `.pipeline/rules/custom/`，作为项目侧规则配置和自然语言规则入口。
- 新增 `scripts/rules-summary.sh`，供 hook 和测试稳定汇总有效规则、启用数量和 always 规则。

### Improvements

- SessionStart Hook 现在注入 Rules Context，让 active `always` 规则在会话恢复时持续生效。
- `/hw:init` 和 `/hw:setup` 文档加入 Rules 初始化和默认规则集说明。
- `config.schema.yaml` 支持 `rules.extends` 和 `rules.rules`，保持旧项目向后兼容。
- README、命令规范、配置规范和 Showcase 自举物料更新到 V8.4，用户指令数更新为 30。

### Tests

- 新增 `s50-rules-system` 回归场景，覆盖规则资产、命令注册、helper 输出和 SessionStart 注入。
- 回归测试扩展为 `50/50`。
