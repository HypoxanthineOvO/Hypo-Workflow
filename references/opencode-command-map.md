# OpenCode Command Map

## 中文主体说明

本表定义 canonical `/hw:*` 命令到 OpenCode `/hw-*` native slash command 的映射。命令名、agent 名、Skill 路径和路由字段必须保持英文 literal，不得翻译；中文说明只解释用途和边界。

OpenCode uses dash-style native slash commands. Each command remains traceable to a canonical Hypo-Workflow command.

| HW command | OpenCode command | Agent | Skill |
|---|---|---|---|
| `/hw:start` | `/hw-start` | `hw-build` | `skills/start/SKILL.md` |
| `/hw:resume` | `/hw-resume` | `hw-build` | `skills/resume/SKILL.md` |
| `/hw:status` | `/hw-status` | `hw-status` | `skills/status/SKILL.md` |
| `/hw:skip` | `/hw-skip` | `hw-build` | `skills/skip/SKILL.md` |
| `/hw:stop` | `/hw-stop` | `hw-status` | `skills/stop/SKILL.md` |
| `/hw:report` | `/hw-report` | `hw-report` | `skills/report/SKILL.md` |
| `/hw:chat` | `/hw-chat` | `hw-build` | `skills/chat/SKILL.md` |
| `/hw:plan` | `/hw-plan` | `hw-plan` | `skills/plan/SKILL.md` |
| `/hw:plan:discover` | `/hw-plan-discover` | `hw-plan` | `skills/plan-discover/SKILL.md` |
| `/hw:plan:decompose` | `/hw-plan-decompose` | `hw-plan` | `skills/plan-decompose/SKILL.md` |
| `/hw:plan:generate` | `/hw-plan-generate` | `hw-plan` | `skills/plan-generate/SKILL.md` |
| `/hw:plan:confirm` | `/hw-plan-confirm` | `hw-plan` | `skills/plan-confirm/SKILL.md` |
| `/hw:plan:extend` | `/hw-plan-extend` | `hw-plan` | `skills/plan-extend/SKILL.md` |
| `/hw:plan:review` | `/hw-plan-review` | `hw-review` | `skills/plan-review/SKILL.md` |
| `/hw:cycle` | `/hw-cycle` | `hw-status` | `skills/cycle/SKILL.md` |
| `/hw:accept` | `/hw-accept` | `hw-build` | `skills/accept/SKILL.md` |
| `/hw:reject` | `/hw-reject` | `hw-build` | `skills/reject/SKILL.md` |
| `/hw:explore` | `/hw-explore` | `hw-explore` | `skills/explore/SKILL.md` |
| `/hw:sync` | `/hw-sync` | `hw-build` | `skills/sync/SKILL.md` |
| `/hw:docs` | `/hw-docs` | `hw-docs` | `skills/docs/SKILL.md` |
| `/hw:patch` | `/hw-patch` | `hw-build` | `skills/patch/SKILL.md` |
| `/hw:patch fix` | `/hw-patch-fix` | `hw-build` | `skills/patch/SKILL.md` |
| `/hw:pr` | `/hw-pr` | `hw-review` | `skills/pr/SKILL.md` |
| `/hw:pr create` | `/hw-pr-create` | `hw-build` | `skills/pr/SKILL.md` |
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
| `/hw:debug` | `/hw-debug` | `hw-debug` | `skills/debug/SKILL.md` |
| `/hw:help` | `/hw-help` | `hw-status` | `skills/help/SKILL.md` |
| `/hw:reset` | `/hw-reset` | `hw-status` | `skills/reset/SKILL.md` |
| `/hw:log` | `/hw-log` | `hw-status` | `skills/log/SKILL.md` |
| `/hw:setup` | `/hw-setup` | `hw-status` | `skills/setup/SKILL.md` |

Agent policy:

- OpenCode exposes `/hw:patch accept PNNN` and `/hw:patch reject PNNN "feedback"` as argument subcommands of `/hw-patch`; they are not first-class `/hw-patch-accept` or `/hw-patch-reject` commands.
- `/hw-plan*`, `/hw:init`, and `/hw:guide` use `hw-plan` to maximize Ask/question and todowrite discipline.
- Execution and mutation-heavy commands use `hw-build`.
- Compact, debug, and report commands use `hw-compact`, `hw-debug`, and `hw-report` so the OpenCode model matrix can tune those roles independently.
- Audit/review commands use `hw-review`.
- `/hw:pr` uses `hw-review` because PR/MR inspection and review are evidence-first and remote writes are manual-gated.
- `/hw:pr create` uses `hw-build` because the guided flow prepares local commits/branches and only performs remote provider writes after explicit confirmation.
- `/hw:explain` uses `hw-review` because answers must be grounded in local evidence and unknowns.
- Status/help/log/rules/check commands use `hw-status`.
