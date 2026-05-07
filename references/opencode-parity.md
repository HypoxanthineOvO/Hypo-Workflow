# OpenCode V8.4 Parity Matrix

V9 OpenCode support targets V8.4 user-facing parity through native slash commands plus plugin-assisted context, guard, and event behavior. The plugin does not perform business work; the OpenCode Agent still executes the command semantics.

| Capability | OpenCode command | Agent | Parity note |
|---|---|---|---|
| Cycle | `/hw-cycle` | `hw-status` | Supports new/list/view/close through canonical `skills/cycle/SKILL.md`. |
| Patch | `/hw-patch` | `hw-build` | Supports create/list/close through canonical Patch skill. |
| Patch Fix | `/hw-patch-fix` | `hw-build` | Preserves six-step lightweight fix lane and avoids Plan Discover/full TDD. |
| Compact | `/hw-compact` | `hw-compact` | Generates compact files and pairs with OpenCode `session.compacted`. |
| Knowledge | `/hw-knowledge` | `hw-compact` | Inspects Knowledge Ledger compact summaries, indexes, records, and redacted secret references. |
| Showcase | `/hw-showcase` | `hw-build` | Agent generates docs/slides/poster artifacts; plugin supplies context/guard. |
| Release | `/hw-release` | `hw-build` | Requires validate, regression, dirty check, Ask gate, tag, and push controls. |
| Dashboard | `/hw-dashboard` | `hw-status` | Launches existing WebUI dashboard capability. |
| Audit | `/hw-audit` | `hw-review` | Preventive audit through canonical audit skill. |
| Debug | `/hw-debug` | `hw-debug` | Symptom-driven debug through canonical debug skill. |
| Check | `/hw-check` | `hw-status` | Health check through canonical check skill. |
| Reset | `/hw-reset` | `hw-status` | Guarded reset through canonical reset skill. |
| Log | `/hw-log` | `hw-status` | Lifecycle log view through canonical log skill. |
| Report | `/hw-report` | `hw-report` | Report summaries and full report view. |
| Chat | `/hw-chat` | `hw-build` | Lightweight append conversation mode without opening a new Milestone. |
| Status | `/hw-status` | `hw-status` | Current runtime state summary. |
| Guide | `/hw-guide` | `hw-plan` | Interactive project-aware guide using Ask/question. |
| Rules | `/hw-rules` | `hw-status` | Rules listing, severity, custom rules, and packs. |

All 38 user-facing commands remain traceable in `references/opencode-command-map.md`.

Model matrix routing is additive to V8.4 parity. It changes generated OpenCode agent selection for compact/debug/report roles, but it does not make Hypo-Workflow a runner or move model invocation out of OpenCode.
